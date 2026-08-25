"""Payment gateway factory — Stripe test mode or mock fallback."""

from app.config import get_settings
from app.saga.steps import MockPaymentGateway, PaymentGateway
from app.stripe_client import StripePaymentGateway


def get_payment_gateway() -> PaymentGateway:
    """
    Return Stripe gateway when enabled + secret key configured.
    Falls back to mock for local/tests without STRIPE_ENABLED=true.
    """
    settings = get_settings()
    if (
        settings.stripe_enabled
        and settings.stripe_secret_key
        and settings.stripe_secret_key.startswith("sk_")
    ):
        return StripePaymentGateway()
    return MockPaymentGateway()
