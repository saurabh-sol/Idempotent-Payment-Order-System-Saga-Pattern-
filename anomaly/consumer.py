"""
Anomaly Detection Consumer.

Consumes events from Kafka and detects anomalous patterns:
- High request rate per user
- High failure rate per user
- Burst of distinct products
- Spike in PaymentFailed events

This is a READ-ONLY consumer that only FLAGS anomalies and triggers
rate limiting. It never directly blocks or approves transactions.
"""
import asyncio
import json
import os
from datetime import datetime, timedelta
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Dict, List, Optional
import statistics

from aiokafka import AIOKafkaConsumer
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
import structlog
import redis.asyncio as redis

structlog.configure(
    processors=[
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer()
    ],
)
logger = structlog.get_logger()

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://saga:sagapass@localhost:5432/saga_db"
)
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
KAFKA_BOOTSTRAP_SERVERS = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
KAFKA_TOPIC = "order-events"

RATE_LIMIT_THRESHOLD = 10
FAILURE_RATE_THRESHOLD = 0.5
PRODUCT_BURST_THRESHOLD = 5
WINDOW_SECONDS = 60


@dataclass
class UserMetrics:
    """Rolling window metrics for a user."""
    events: List[dict] = field(default_factory=list)
    payment_attempts: int = 0
    payment_failures: int = 0
    distinct_products: set = field(default_factory=set)
    last_event_time: Optional[datetime] = None


class AnomalyDetector:
    """Detects anomalous patterns from event stream."""
    
    def __init__(self):
        self.user_metrics: Dict[str, UserMetrics] = defaultdict(UserMetrics)
        self.global_baselines: Dict[str, float] = {}
        self.flags: List[dict] = []
    
    def _clean_old_events(self, user_id: str) -> None:
        """Remove events outside the rolling window."""
        cutoff = datetime.utcnow() - timedelta(seconds=WINDOW_SECONDS)
        metrics = self.user_metrics[user_id]
        
        metrics.events = [
            e for e in metrics.events
            if datetime.fromisoformat(e["timestamp"]) > cutoff
        ]
    
    def process_event(self, event: dict) -> Optional[dict]:
        """
        Process an event and check for anomalies.
        
        Returns an anomaly flag dict if detected, None otherwise.
        """
        event_type = event.get("event_type")
        payload = event.get("payload", {})
        user_id = payload.get("user_id")
        
        if not user_id:
            return None
        
        self._clean_old_events(user_id)
        
        metrics = self.user_metrics[user_id]
        metrics.events.append({
            "event_type": event_type,
            "timestamp": payload.get("timestamp", datetime.utcnow().isoformat()),
            "payload": payload,
        })
        metrics.last_event_time = datetime.utcnow()
        
        if event_type in ["PaymentCreated", "PaymentSucceeded", "PaymentFailed"]:
            metrics.payment_attempts += 1
            if event_type == "PaymentFailed":
                metrics.payment_failures += 1
        
        if "product_id" in payload:
            metrics.distinct_products.add(payload["product_id"])
        
        return self._check_anomalies(user_id, metrics, event_type)
    
    def _check_anomalies(
        self,
        user_id: str,
        metrics: UserMetrics,
        latest_event_type: str,
    ) -> Optional[dict]:
        """Check for various anomaly patterns."""
        request_count = len(metrics.events)
        if request_count > RATE_LIMIT_THRESHOLD:
            return self._create_flag(
                user_id,
                "high_request_rate",
                f"User has {request_count} requests in {WINDOW_SECONDS}s window",
                "rate_limited",
            )
        
        if metrics.payment_attempts >= 3:
            failure_rate = metrics.payment_failures / metrics.payment_attempts
            if failure_rate > FAILURE_RATE_THRESHOLD:
                return self._create_flag(
                    user_id,
                    "high_failure_rate",
                    f"Payment failure rate {failure_rate:.1%} ({metrics.payment_failures}/{metrics.payment_attempts})",
                    "step_up_required",
                )
        
        if len(metrics.distinct_products) > PRODUCT_BURST_THRESHOLD:
            return self._create_flag(
                user_id,
                "product_burst",
                f"User accessed {len(metrics.distinct_products)} distinct products in {WINDOW_SECONDS}s",
                "rate_limited",
            )
        
        if len(metrics.events) >= 3:
            intervals = []
            sorted_events = sorted(metrics.events, key=lambda e: e["timestamp"])
            for i in range(1, len(sorted_events)):
                t1 = datetime.fromisoformat(sorted_events[i-1]["timestamp"])
                t2 = datetime.fromisoformat(sorted_events[i]["timestamp"])
                intervals.append((t2 - t1).total_seconds())
            
            if intervals and max(intervals) < 0.5:
                return self._create_flag(
                    user_id,
                    "rapid_fire",
                    f"Requests arriving faster than 500ms apart",
                    "rate_limited",
                )
        
        return None
    
    def _create_flag(
        self,
        user_id: str,
        reason: str,
        description: str,
        action: str,
    ) -> dict:
        """Create and record an anomaly flag."""
        flag = {
            "user_id": user_id,
            "reason": reason,
            "description": description,
            "action_taken": action,
            "created_at": datetime.utcnow().isoformat(),
        }
        self.flags.append(flag)
        logger.warning("Anomaly detected", **flag)
        return flag


async def apply_rate_limit(redis_client: redis.Redis, user_id: str) -> None:
    """Apply rate limiting for a flagged user."""
    key = f"anomaly_rate_limit:{user_id}"
    await redis_client.setex(key, 300, "1")
    logger.info("Rate limit applied", user_id=user_id, duration=300)


async def save_flag_to_db(session_maker, flag: dict) -> None:
    """Save an anomaly flag to the database."""
    from app.models import AnomalyFlag
    import uuid
    
    async with session_maker() as db:
        anomaly = AnomalyFlag(
            id=uuid.uuid4(),
            user_id=uuid.UUID(flag["user_id"]),
            reason=flag["reason"],
            action_taken=flag["action_taken"],
        )
        db.add(anomaly)
        await db.commit()


async def run_consumer():
    """Main consumer loop."""
    logger.info("Starting anomaly detection consumer", kafka=KAFKA_BOOTSTRAP_SERVERS)
    
    detector = AnomalyDetector()
    redis_client = redis.from_url(REDIS_URL, decode_responses=True)
    
    engine = create_async_engine(DATABASE_URL)
    session_maker = async_sessionmaker(engine, class_=AsyncSession)
    
    consumer = AIOKafkaConsumer(
        KAFKA_TOPIC,
        bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
        value_deserializer=lambda v: json.loads(v.decode("utf-8")),
        group_id="anomaly-detector",
        auto_offset_reset="earliest",
    )
    
    try:
        await consumer.start()
        logger.info("Kafka consumer started")
        
        async for message in consumer:
            try:
                event = message.value
                flag = detector.process_event(event)
                
                if flag:
                    await apply_rate_limit(redis_client, flag["user_id"])
                    await save_flag_to_db(session_maker, flag)
                    
            except Exception as e:
                logger.error("Error processing event", error=str(e))
                
    finally:
        await consumer.stop()
        await redis_client.close()


if __name__ == "__main__":
    asyncio.run(run_consumer())
