import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import Product, Inventory
from app.schemas import ProductResponse, ProductListResponse

router = APIRouter(prefix="/api/products", tags=["products"])


@router.get("", response_model=ProductListResponse)
async def list_products(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
) -> ProductListResponse:
    """List all products with their inventory status."""
    result = await db.execute(
        select(Product)
        .options(selectinload(Product.inventory))
        .offset(skip)
        .limit(limit)
        .order_by(Product.name)
    )
    products = result.scalars().all()

    count_result = await db.execute(select(Product))
    total = len(count_result.scalars().all())

    return ProductListResponse(
        products=[
            ProductResponse(
                id=p.id,
                name=p.name,
                description=p.description,
                price=p.price,
                created_at=p.created_at,
                available_qty=p.inventory.available_qty if p.inventory else 0,
                reserved_qty=p.inventory.reserved_qty if p.inventory else 0,
            )
            for p in products
        ],
        total=total,
    )


@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(
    product_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> ProductResponse:
    """Get a single product by ID with inventory status."""
    result = await db.execute(
        select(Product)
        .options(selectinload(Product.inventory))
        .where(Product.id == product_id)
    )
    product = result.scalar_one_or_none()

    if product is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product {product_id} not found",
        )

    return ProductResponse(
        id=product.id,
        name=product.name,
        description=product.description,
        price=product.price,
        created_at=product.created_at,
        available_qty=product.inventory.available_qty if product.inventory else 0,
        reserved_qty=product.inventory.reserved_qty if product.inventory else 0,
    )
