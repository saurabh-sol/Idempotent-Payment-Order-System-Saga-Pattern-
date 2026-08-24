"""
Stripe webhook handler.

Handles asynchronous payment events from Stripe:
- payment_intent.succeeded
- payment_intent.payment_failed
- charge.refunded
"""
import uuid
from fastapi import APIRouter, Request, HTTPException, status, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models import Payment, PaymentStatus, Order, OrderStatus
from app.stripe_client import verify_webhook_signature
import structlog

logger = structlog.get_logger()

router = APIRouter(prefix="/webhooks", tags=["webhooks"])


@router.post("/stripe")
async def stripe_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Handle Stripe webhook events.
    
    Verifies webhook signature and processes payment events.
    Handles late-arriving webhooks gracefully (no-op if already processed).
    """
    payload = await request.body()
    sig_header = request.headers.get("Stripe-Signature")
    
    if not sig_header:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing Stripe-Signature header",
        )
    
    try:
        event = verify_webhook_signature(payload, sig_header)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    
    event_type = event["type"]
    data = event["data"]["object"]
    
    logger.info(
        "Received Stripe webhook",
        event_type=event_type,
        event_id=event["id"],
    )
    
    if event_type == "payment_intent.succeeded":
        await handle_payment_succeeded(data, db)
    elif event_type == "payment_intent.payment_failed":
        await handle_payment_failed(data, db)
    elif event_type == "charge.refunded":
        await handle_charge_refunded(data, db)
    else:
        logger.info("Unhandled webhook event type", event_type=event_type)
    
    return {"status": "ok"}


async def handle_payment_succeeded(data: dict, db: AsyncSession) -> None:
    """
    Handle payment_intent.succeeded event.
    
    This is a late-arriving confirmation. If the saga already marked
    the payment as succeeded, this is a no-op.
    """
    payment_intent_id = data["id"]
    
    result = await db.execute(
        select(Payment).where(Payment.gateway_txn_id == payment_intent_id)
    )
    payment = result.scalar_one_or_none()
    
    if payment is None:
        logger.warning(
            "Payment not found for webhook",
            payment_intent_id=payment_intent_id,
        )
        return
    
    if payment.status == PaymentStatus.SUCCEEDED.value:
        logger.info(
            "Payment already succeeded, webhook is late confirmation",
            payment_id=str(payment.id),
        )
        return
    
    if payment.status == PaymentStatus.REFUNDED.value:
        logger.warning(
            "Payment was already refunded (saga compensated), ignoring late success webhook",
            payment_id=str(payment.id),
        )
        return
    
    payment.status = PaymentStatus.SUCCEEDED.value
    await db.commit()
    
    logger.info(
        "Payment status updated from webhook",
        payment_id=str(payment.id),
        status=PaymentStatus.SUCCEEDED.value,
    )


async def handle_payment_failed(data: dict, db: AsyncSession) -> None:
    """
    Handle payment_intent.payment_failed event.
    
    If the saga hasn't already handled the failure, update the payment status.
    """
    payment_intent_id = data["id"]
    
    result = await db.execute(
        select(Payment).where(Payment.gateway_txn_id == payment_intent_id)
    )
    payment = result.scalar_one_or_none()
    
    if payment is None:
        logger.warning(
            "Payment not found for failed webhook",
            payment_intent_id=payment_intent_id,
        )
        return
    
    if payment.status in [PaymentStatus.FAILED.value, PaymentStatus.REFUNDED.value]:
        logger.info(
            "Payment already failed/refunded, ignoring webhook",
            payment_id=str(payment.id),
        )
        return
    
    payment.status = PaymentStatus.FAILED.value
    await db.commit()
    
    logger.info(
        "Payment marked as failed from webhook",
        payment_id=str(payment.id),
    )


async def handle_charge_refunded(data: dict, db: AsyncSession) -> None:
    """
    Handle charge.refunded event.
    
    Updates payment status if not already refunded.
    """
    payment_intent_id = data.get("payment_intent")
    
    if not payment_intent_id:
        logger.warning("Refund webhook missing payment_intent")
        return
    
    result = await db.execute(
        select(Payment).where(Payment.gateway_txn_id == payment_intent_id)
    )
    payment = result.scalar_one_or_none()
    
    if payment is None:
        logger.warning(
            "Payment not found for refund webhook",
            payment_intent_id=payment_intent_id,
        )
        return
    
    if payment.status == PaymentStatus.REFUNDED.value:
        logger.info(
            "Payment already refunded, webhook is confirmation",
            payment_id=str(payment.id),
        )
        return
    
    payment.status = PaymentStatus.REFUNDED.value
    await db.commit()
    
    logger.info(
        "Payment marked as refunded from webhook",
        payment_id=str(payment.id),
    )
