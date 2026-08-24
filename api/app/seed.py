import uuid
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models import Product, Inventory


SEED_PRODUCTS = [
    {
        "id": uuid.UUID("11111111-1111-1111-1111-111111111111"),
        "name": "Developer Toolkit Pro",
        "description": "Complete development environment with all essential tools and plugins.",
        "price": Decimal("49.99"),
        "stock": 100,
    },
    {
        "id": uuid.UUID("22222222-2222-2222-2222-222222222222"),
        "name": "API Gateway License",
        "description": "Enterprise-grade API gateway with rate limiting and analytics.",
        "price": Decimal("199.99"),
        "stock": 50,
    },
    {
        "id": uuid.UUID("33333333-3333-3333-3333-333333333333"),
        "name": "Cloud Storage 1TB",
        "description": "Secure cloud storage with end-to-end encryption.",
        "price": Decimal("9.99"),
        "stock": 1000,
    },
    {
        "id": uuid.UUID("44444444-4444-4444-4444-444444444444"),
        "name": "Last Unit Item",
        "description": "Limited edition item for race condition testing. Only 1 in stock!",
        "price": Decimal("29.99"),
        "stock": 1,
    },
    {
        "id": uuid.UUID("55555555-5555-5555-5555-555555555555"),
        "name": "Premium Support Package",
        "description": "24/7 priority support with dedicated account manager.",
        "price": Decimal("499.99"),
        "stock": 25,
    },
]


async def seed_products(db: AsyncSession) -> None:
    """Seed the database with initial products if they don't exist."""
    for product_data in SEED_PRODUCTS:
        existing = await db.execute(
            select(Product).where(Product.id == product_data["id"])
        )
        if existing.scalar_one_or_none() is None:
            product = Product(
                id=product_data["id"],
                name=product_data["name"],
                description=product_data["description"],
                price=product_data["price"],
            )
            db.add(product)
            await db.flush()

            inventory = Inventory(
                product_id=product.id,
                available_qty=product_data["stock"],
                reserved_qty=0,
            )
            db.add(inventory)

    await db.commit()
