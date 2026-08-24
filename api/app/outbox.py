"""
Transactional Outbox pattern implementation.

Events are written to the outbox table in the same transaction as the saga step.
A separate publisher service polls the outbox and publishes to Kafka.
"""
import uuid
from datetime import datetime
from typing import Optional
from enum import Enum

from sqlalchemy.ext.asyncio import AsyncSession

from app.models import OutboxEvent
import structlog

logger = structlog.get_logger()


class EventType(str, Enum):
    ORDER_CREATED = "OrderCreated"
    INVENTORY_RESERVED = "InventoryReserved"
    INVENTORY_RELEASED = "InventoryReleased"
    PAYMENT_CREATED = "PaymentCreated"
    PAYMENT_SUCCEEDED = "PaymentSucceeded"
    PAYMENT_FAILED = "PaymentFailed"
    REFUND_STARTED = "RefundStarted"
    REFUND_COMPLETED = "RefundCompleted"
    ORDER_CONFIRMED = "OrderConfirmed"
    ORDER_CANCELLED = "OrderCancelled"
    SAGA_COMPENSATING = "SagaCompensating"
    SAGA_COMPLETED = "SagaCompleted"


async def publish_event(
    db: AsyncSession,
    event_type: EventType,
    payload: dict,
) -> uuid.UUID:
    """
    Write an event to the outbox table.
    
    This should be called within the same transaction as the business operation
    to ensure atomicity (transactional outbox pattern).
    """
    event = OutboxEvent(
        event_type=event_type.value,
        payload=payload,
        published=False,
    )
    db.add(event)
    await db.flush()
    
    logger.info(
        "Event written to outbox",
        event_id=str(event.id),
        event_type=event_type.value,
    )
    
    return event.id


async def publish_order_created(
    db: AsyncSession,
    order_id: uuid.UUID,
    user_id: uuid.UUID,
    total_amount: float,
    items: list,
) -> uuid.UUID:
    """Publish an OrderCreated event."""
    return await publish_event(
        db,
        EventType.ORDER_CREATED,
        {
            "order_id": str(order_id),
            "user_id": str(user_id),
            "total_amount": total_amount,
            "items": items,
            "timestamp": datetime.utcnow().isoformat(),
        },
    )


async def publish_payment_event(
    db: AsyncSession,
    event_type: EventType,
    order_id: uuid.UUID,
    user_id: uuid.UUID,
    amount: float,
    gateway_txn_id: Optional[str] = None,
) -> uuid.UUID:
    """Publish a payment-related event."""
    return await publish_event(
        db,
        event_type,
        {
            "order_id": str(order_id),
            "user_id": str(user_id),
            "amount": amount,
            "gateway_txn_id": gateway_txn_id,
            "timestamp": datetime.utcnow().isoformat(),
        },
    )


async def publish_saga_event(
    db: AsyncSession,
    event_type: EventType,
    order_id: uuid.UUID,
    user_id: uuid.UUID,
    step_name: Optional[str] = None,
    error_message: Optional[str] = None,
) -> uuid.UUID:
    """Publish a saga lifecycle event."""
    return await publish_event(
        db,
        event_type,
        {
            "order_id": str(order_id),
            "user_id": str(user_id),
            "step_name": step_name,
            "error_message": error_message,
            "timestamp": datetime.utcnow().isoformat(),
        },
    )
