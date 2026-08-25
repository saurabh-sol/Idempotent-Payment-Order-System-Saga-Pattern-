"""
Stripe payment gateway integration.

Uses Stripe's PaymentIntent API for charges and Refunds API for refunds.
Supports idempotency keys and exponential backoff for retries.
"""
import asyncio
from decimal import Decimal
from typing import Optional
import stripe

from app.config import get_settings
import structlog

StripeError = stripe.StripeError
RateLimitError = stripe.RateLimitError
APIConnectionError = stripe.APIConnectionError

logger = structlog.get_logger()
settings = get_settings()

stripe.api_key = settings.stripe_secret_key

MAX_RETRIES = 3
BASE_DELAY = 1.0


class StripePaymentGateway:
    """Real Stripe payment gateway implementation."""
    
    def __init__(self):
        self.api_key = settings.stripe_secret_key
    
    async def create_payment_intent(
        self,
        amount: Decimal,
        currency: str,
        idempotency_key: str,
        metadata: Optional[dict] = None,
    ) -> dict:
        """
        Create and confirm a PaymentIntent.
        
        Uses Stripe's idempotency key support for safe retries.
        Implements exponential backoff for transient errors.
        """
        amount_cents = int(amount * 100)
        
        for attempt in range(MAX_RETRIES):
            try:
                payment_intent = await asyncio.to_thread(
                    stripe.PaymentIntent.create,
                    amount=amount_cents,
                    currency=currency,
                    payment_method_data={
                        "type": "card",
                        "card": {"token": settings.stripe_test_card_token},
                    },
                    confirm=True,
                    automatic_payment_methods={
                        "enabled": True,
                        "allow_redirects": "never",
                    },
                    idempotency_key=idempotency_key,
                    metadata=metadata or {},
                )
                
                logger.info(
                    "PaymentIntent created",
                    payment_intent_id=payment_intent.id,
                    status=payment_intent.status,
                    amount=amount_cents,
                )
                
                return {
                    "id": payment_intent.id,
                    "status": payment_intent.status,
                    "amount": payment_intent.amount,
                    "currency": payment_intent.currency,
                }
                
            except (RateLimitError, APIConnectionError) as e:
                if attempt < MAX_RETRIES - 1:
                    delay = BASE_DELAY * (2 ** attempt)
                    logger.warning(
                        "Stripe API error, retrying",
                        attempt=attempt + 1,
                        delay=delay,
                        error=str(e),
                    )
                    await asyncio.sleep(delay)
                else:
                    logger.error(
                        "Stripe API error after max retries",
                        error=str(e),
                    )
                    raise
                    
            except StripeError as e:
                logger.error(
                    "Stripe payment failed",
                    error=str(e),
                    error_code=e.code if hasattr(e, 'code') else None,
                )
                raise ValueError(f"Payment failed: {e.user_message if hasattr(e, 'user_message') else str(e)}")

    async def create_checkout_payment_intent(
        self,
        amount: Decimal,
        currency: str,
        idempotency_key: str,
        metadata: Optional[dict] = None,
    ) -> dict:
        """Create an unconfirmed PaymentIntent for Stripe Elements checkout."""
        amount_cents = int(amount * 100)

        payment_intent = await asyncio.to_thread(
            stripe.PaymentIntent.create,
            amount=amount_cents,
            currency=currency,
            automatic_payment_methods={"enabled": True},
            idempotency_key=idempotency_key,
            metadata=metadata or {},
        )

        logger.info(
            "Checkout PaymentIntent created",
            payment_intent_id=payment_intent.id,
            status=payment_intent.status,
        )

        return {
            "id": payment_intent.id,
            "client_secret": payment_intent.client_secret,
            "status": payment_intent.status,
            "amount": payment_intent.amount,
            "currency": payment_intent.currency,
        }

    async def verify_payment_intent(
        self,
        payment_intent_id: str,
        expected_amount: Decimal,
        currency: str = "usd",
    ) -> dict:
        """Verify a client-confirmed PaymentIntent matches the order."""
        payment_intent = await asyncio.to_thread(
            stripe.PaymentIntent.retrieve,
            payment_intent_id,
        )

        expected_cents = int(expected_amount * 100)
        if payment_intent.amount != expected_cents:
            raise ValueError(
                f"Payment amount mismatch: expected {expected_cents}, got {payment_intent.amount}"
            )
        if payment_intent.currency != currency:
            raise ValueError("Payment currency mismatch")

        if payment_intent.status != "succeeded":
            raise ValueError(f"Payment not completed: {payment_intent.status}")

        return {
            "id": payment_intent.id,
            "status": payment_intent.status,
            "amount": payment_intent.amount,
            "currency": payment_intent.currency,
        }
    
    async def refund_payment(
        self,
        payment_intent_id: str,
        idempotency_key: str,
        amount: Optional[int] = None,
    ) -> dict:
        """
        Refund a PaymentIntent.
        
        If amount is None, refunds the full amount.
        """
        for attempt in range(MAX_RETRIES):
            try:
                refund_params = {
                    "payment_intent": payment_intent_id,
                    "idempotency_key": idempotency_key,
                }
                if amount is not None:
                    refund_params["amount"] = amount
                
                refund = await asyncio.to_thread(
                    stripe.Refund.create,
                    **refund_params,
                )
                
                logger.info(
                    "Refund created",
                    refund_id=refund.id,
                    payment_intent_id=payment_intent_id,
                    status=refund.status,
                )
                
                return {
                    "id": refund.id,
                    "status": refund.status,
                    "payment_intent": payment_intent_id,
                    "amount": refund.amount,
                }
                
            except (RateLimitError, APIConnectionError) as e:
                if attempt < MAX_RETRIES - 1:
                    delay = BASE_DELAY * (2 ** attempt)
                    logger.warning(
                        "Stripe API error on refund, retrying",
                        attempt=attempt + 1,
                        delay=delay,
                        error=str(e),
                    )
                    await asyncio.sleep(delay)
                else:
                    logger.error(
                        "Stripe refund failed after max retries",
                        error=str(e),
                    )
                    raise
                    
            except StripeError as e:
                logger.error(
                    "Stripe refund failed",
                    payment_intent_id=payment_intent_id,
                    error=str(e),
                )
                raise ValueError(f"Refund failed: {e.user_message if hasattr(e, 'user_message') else str(e)}")


def verify_webhook_signature(payload: bytes, sig_header: str) -> dict:
    """
    Verify a Stripe webhook signature and return the event.
    
    Raises ValueError if signature is invalid.
    """
    try:
        event = stripe.Webhook.construct_event(
            payload,
            sig_header,
            settings.stripe_webhook_secret,
        )
        return event
    except stripe.SignatureVerificationError as e:
        logger.error("Invalid webhook signature", error=str(e))
        raise ValueError("Invalid webhook signature")
