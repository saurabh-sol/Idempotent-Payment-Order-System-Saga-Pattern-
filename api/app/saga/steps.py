"""
Saga steps: forward actions and their compensating counterparts.

Each step follows the pattern:
- Forward action: performs the operation
- Compensate action: undoes the operation

Steps:
1. reserve_inventory / release_inventory
2. charge_payment / refund_payment  
3. confirm_order / cancel_order
"""
import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional, Protocol

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from sqlalchemy.orm import selectinload

from app.models import Order, OrderItem, Inventory, Payment, PaymentStatus, OrderStatus
from app.config import get_settings

settings = get_settings()


class PaymentGateway(Protocol):
    """Protocol for payment gateway adapters."""
    
    async def create_payment_intent(
        self,
        amount: Decimal,
        currency: str,
        idempotency_key: str,
    ) -> dict:
        ...
    
    async def refund_payment(
        self,
        payment_intent_id: str,
        idempotency_key: str,
    ) -> dict:
        ...


class MockPaymentGateway:
    """Mock payment gateway for testing."""
    
    async def create_payment_intent(
        self,
        amount: Decimal,
        currency: str,
        idempotency_key: str,
    ) -> dict:
        return {
            "id": f"pi_mock_{uuid.uuid4().hex[:16]}",
            "status": "succeeded",
            "amount": int(amount * 100),
            "currency": currency,
        }
    
    async def refund_payment(
        self,
        payment_intent_id: str,
        idempotency_key: str,
    ) -> dict:
        return {
            "id": f"re_mock_{uuid.uuid4().hex[:16]}",
            "status": "succeeded",
            "payment_intent": payment_intent_id,
        }


async def reserve_inventory(
    order_id: uuid.UUID,
    db: AsyncSession,
) -> None:
    """
    Reserve inventory for all items in an order.
    Uses SELECT ... FOR UPDATE to prevent race conditions.
    """
    from app.chaos import maybe_fail
    maybe_fail("reserve_inventory")
    
    result = await db.execute(
        select(Order)
        .options(selectinload(Order.items))
        .where(Order.id == order_id)
    )
    order = result.scalar_one()
    
    for item in order.items:
        inv_result = await db.execute(
            select(Inventory)
            .where(Inventory.product_id == item.product_id)
            .with_for_update()
        )
        inventory = inv_result.scalar_one_or_none()
        
        if inventory is None:
            raise ValueError(f"No inventory record for product {item.product_id}")
        
        if inventory.available_qty < item.quantity:
            raise ValueError(
                f"Insufficient stock for product {item.product_id}: "
                f"requested {item.quantity}, available {inventory.available_qty}"
            )
        
        inventory.available_qty -= item.quantity
        inventory.reserved_qty += item.quantity
    
    await db.flush()


async def release_inventory(
    order_id: uuid.UUID,
    db: AsyncSession,
) -> None:
    """
    Release reserved inventory back to available stock.
    Compensating action for reserve_inventory.
    """
    result = await db.execute(
        select(Order)
        .options(selectinload(Order.items))
        .where(Order.id == order_id)
    )
    order = result.scalar_one()
    
    for item in order.items:
        inv_result = await db.execute(
            select(Inventory)
            .where(Inventory.product_id == item.product_id)
            .with_for_update()
        )
        inventory = inv_result.scalar_one_or_none()
        
        if inventory:
            inventory.available_qty += item.quantity
            inventory.reserved_qty = max(0, inventory.reserved_qty - item.quantity)
    
    await db.flush()


async def charge_payment(
    order_id: uuid.UUID,
    db: AsyncSession,
    payment_gateway: PaymentGateway,
    idempotency_key: str,
) -> str:
    """
    Charge payment via the payment gateway.
    Returns the gateway transaction ID.
    """
    from app.chaos import maybe_fail
    maybe_fail("charge_payment")
    
    result = await db.execute(
        select(Order).where(Order.id == order_id)
    )
    order = result.scalar_one()
    
    gateway_response = await payment_gateway.create_payment_intent(
        amount=order.total_amount,
        currency="usd",
        idempotency_key=f"{idempotency_key}_charge",
    )
    
    if gateway_response.get("status") != "succeeded":
        raise ValueError(f"Payment failed: {gateway_response}")
    
    payment = Payment(
        order_id=order_id,
        status=PaymentStatus.SUCCEEDED.value,
        gateway_txn_id=gateway_response["id"],
        amount=order.total_amount,
    )
    db.add(payment)
    await db.flush()
    
    return gateway_response["id"]


async def refund_payment(
    order_id: uuid.UUID,
    db: AsyncSession,
    payment_gateway: PaymentGateway,
    idempotency_key: str,
) -> None:
    """
    Refund a payment via the payment gateway.
    Compensating action for charge_payment.
    """
    result = await db.execute(
        select(Payment).where(Payment.order_id == order_id)
    )
    payment = result.scalar_one_or_none()
    
    if payment is None or payment.gateway_txn_id is None:
        return
    
    if payment.status == PaymentStatus.REFUNDED.value:
        return
    
    await payment_gateway.refund_payment(
        payment_intent_id=payment.gateway_txn_id,
        idempotency_key=f"{idempotency_key}_refund",
    )
    
    payment.status = PaymentStatus.REFUNDED.value
    await db.flush()


async def confirm_order(
    order_id: uuid.UUID,
    db: AsyncSession,
) -> None:
    """
    Confirm the order after successful payment.
    Moves reserved inventory to sold (removes from reserved).
    """
    from app.chaos import maybe_fail
    maybe_fail("confirm_order")
    
    result = await db.execute(
        select(Order)
        .options(selectinload(Order.items))
        .where(Order.id == order_id)
    )
    order = result.scalar_one()
    
    for item in order.items:
        inv_result = await db.execute(
            select(Inventory)
            .where(Inventory.product_id == item.product_id)
            .with_for_update()
        )
        inventory = inv_result.scalar_one_or_none()
        
        if inventory:
            inventory.reserved_qty = max(0, inventory.reserved_qty - item.quantity)
    
    order.status = OrderStatus.CONFIRMED.value
    await db.flush()


async def cancel_order(
    order_id: uuid.UUID,
    db: AsyncSession,
) -> None:
    """
    Cancel the order.
    Compensating action for confirm_order.
    """
    result = await db.execute(
        select(Order).where(Order.id == order_id)
    )
    order = result.scalar_one()
    order.status = OrderStatus.CANCELLED.value
    await db.flush()
