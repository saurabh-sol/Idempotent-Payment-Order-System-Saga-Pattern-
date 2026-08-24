"""
Duplicate Order Guard.

Detects when the same user tries to order the same product within a time window,
even with different idempotency keys. This catches the AI-agent failure mode
where the agent "forgets" it already placed an order and tries again.

This is a SECOND layer of defense, beyond idempotency keys.
"""
import hashlib
from datetime import datetime, timedelta
from typing import Optional, Tuple
import json

import redis.asyncio as redis
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.models import Order, OrderItem, OrderStatus
from app.redis_client import get_redis
import structlog

logger = structlog.get_logger()

DUPLICATE_WINDOW_SECONDS = 60
REDIS_KEY_PREFIX = "dup_guard:"


def _compute_order_fingerprint(user_id: str, product_id: str, quantity: int) -> str:
    """Compute a fingerprint for the order intent."""
    data = f"{user_id}:{product_id}:{quantity}"
    return hashlib.sha256(data.encode()).hexdigest()[:32]


async def check_duplicate_order_redis(
    user_id: str,
    product_id: str,
    quantity: int,
) -> Optional[str]:
    """
    Check Redis for a recent order with the same fingerprint.
    
    Returns the existing order ID if found, None otherwise.
    """
    redis_client = await get_redis()
    fingerprint = _compute_order_fingerprint(user_id, product_id, quantity)
    key = f"{REDIS_KEY_PREFIX}{fingerprint}"
    
    existing = await redis_client.get(key)
    if existing:
        data = json.loads(existing)
        logger.warning(
            "Duplicate order detected in Redis",
            user_id=user_id,
            product_id=product_id,
            existing_order_id=data["order_id"],
        )
        return data["order_id"]
    
    return None


async def record_order_fingerprint(
    user_id: str,
    product_id: str,
    quantity: int,
    order_id: str,
) -> None:
    """Record an order fingerprint in Redis with TTL."""
    redis_client = await get_redis()
    fingerprint = _compute_order_fingerprint(user_id, product_id, quantity)
    key = f"{REDIS_KEY_PREFIX}{fingerprint}"
    
    data = {
        "order_id": order_id,
        "user_id": user_id,
        "product_id": product_id,
        "quantity": quantity,
        "created_at": datetime.utcnow().isoformat(),
    }
    
    await redis_client.setex(key, DUPLICATE_WINDOW_SECONDS, json.dumps(data))


async def check_duplicate_order_postgres(
    user_id: str,
    product_id: str,
    quantity: int,
    db: AsyncSession,
) -> Optional[str]:
    """
    Check Postgres for a recent order with the same intent.
    
    Fallback for when Redis doesn't have the record.
    """
    cutoff = datetime.utcnow() - timedelta(seconds=DUPLICATE_WINDOW_SECONDS)
    
    result = await db.execute(
        select(Order)
        .join(OrderItem)
        .where(
            and_(
                Order.user_id == user_id,
                OrderItem.product_id == product_id,
                OrderItem.quantity == quantity,
                Order.created_at >= cutoff,
                Order.status.in_([
                    OrderStatus.PENDING.value,
                    OrderStatus.CONFIRMED.value,
                ]),
            )
        )
        .order_by(Order.created_at.desc())
        .limit(1)
    )
    
    order = result.scalar_one_or_none()
    
    if order:
        logger.warning(
            "Duplicate order detected in Postgres",
            user_id=str(user_id),
            product_id=str(product_id),
            existing_order_id=str(order.id),
        )
        return str(order.id)
    
    return None


async def check_for_duplicate_order(
    user_id: str,
    product_id: str,
    quantity: int,
    db: AsyncSession,
) -> Tuple[bool, Optional[str]]:
    """
    Check if this appears to be a duplicate order.
    
    Returns:
        (is_duplicate, existing_order_id)
    """
    existing = await check_duplicate_order_redis(user_id, product_id, quantity)
    if existing:
        return True, existing
    
    existing = await check_duplicate_order_postgres(user_id, product_id, quantity, db)
    if existing:
        return True, existing
    
    return False, None
