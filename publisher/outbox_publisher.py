"""
Outbox Publisher Service.

Polls the outbox table for unpublished events and publishes them to Kafka.
Runs as a separate service to ensure reliable event delivery.
"""
import asyncio
import json
import os
from datetime import datetime

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from aiokafka import AIOKafkaProducer
import structlog

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
KAFKA_BOOTSTRAP_SERVERS = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
KAFKA_TOPIC = "order-events"
POLL_INTERVAL = 1.0
BATCH_SIZE = 100


engine = create_async_engine(DATABASE_URL)
session_maker = async_sessionmaker(engine, class_=AsyncSession)


async def get_unpublished_events(db: AsyncSession, limit: int = BATCH_SIZE) -> list:
    """Fetch unpublished events from the outbox."""
    from app.models import OutboxEvent
    
    result = await db.execute(
        select(OutboxEvent)
        .where(OutboxEvent.published == False)
        .order_by(OutboxEvent.created_at)
        .limit(limit)
    )
    return result.scalars().all()


async def mark_as_published(db: AsyncSession, event_ids: list) -> None:
    """Mark events as published."""
    from app.models import OutboxEvent
    
    await db.execute(
        update(OutboxEvent)
        .where(OutboxEvent.id.in_(event_ids))
        .values(published=True)
    )
    await db.commit()


async def publish_to_kafka(producer: AIOKafkaProducer, events: list) -> list:
    """Publish events to Kafka and return successfully published event IDs."""
    published_ids = []
    
    for event in events:
        try:
            message = {
                "event_id": str(event.id),
                "event_type": event.event_type,
                "payload": event.payload,
                "created_at": event.created_at.isoformat(),
            }
            
            await producer.send_and_wait(
                KAFKA_TOPIC,
                value=json.dumps(message).encode("utf-8"),
                key=str(event.id).encode("utf-8"),
            )
            
            published_ids.append(event.id)
            logger.info(
                "Event published to Kafka",
                event_id=str(event.id),
                event_type=event.event_type,
            )
            
        except Exception as e:
            logger.error(
                "Failed to publish event",
                event_id=str(event.id),
                error=str(e),
            )
    
    return published_ids


async def run_publisher():
    """Main publisher loop."""
    logger.info("Starting outbox publisher", kafka=KAFKA_BOOTSTRAP_SERVERS)
    
    producer = AIOKafkaProducer(
        bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
        value_serializer=lambda v: v,
    )
    
    try:
        await producer.start()
        logger.info("Kafka producer connected")
        
        while True:
            try:
                async with session_maker() as db:
                    events = await get_unpublished_events(db)
                    
                    if events:
                        published_ids = await publish_to_kafka(producer, events)
                        
                        if published_ids:
                            await mark_as_published(db, published_ids)
                            logger.info(
                                "Batch published",
                                count=len(published_ids),
                            )
                
                await asyncio.sleep(POLL_INTERVAL)
                
            except Exception as e:
                logger.error("Publisher error", error=str(e))
                await asyncio.sleep(5.0)
                
    finally:
        await producer.stop()


if __name__ == "__main__":
    asyncio.run(run_publisher())
