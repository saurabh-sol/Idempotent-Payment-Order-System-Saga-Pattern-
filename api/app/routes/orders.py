import uuid
import json
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import Order, OrderItem, Product, Inventory, SagaStep
from app.schemas import (
    OrderCreate,
    OrderResponse,
    OrderItemResponse,
    OrderTimelineResponse,
    SagaStepResponse,
    PaymentResponse,
)
from app.idempotency import (
    get_idempotency_key_header,
    validate_idempotency_request,
    complete_idempotency_key,
)
from app.redis_client import get_redis
from app.payment_gateway import get_payment_gateway
from app.rate_limit import enforce_rate_limit
from app.duplicate_guard import (
    check_for_duplicate_order,
    record_order_fingerprint,
)
from app.outbox import publish_order_created
from app.config import get_settings
from app.saga import SagaOrchestrator

router = APIRouter(prefix="/api/orders", tags=["orders"])


async def build_order_response(order: Order) -> dict:
    """Build a serializable order response dict."""
    return {
        "id": str(order.id),
        "user_id": str(order.user_id),
        "status": order.status,
        "total_amount": str(order.total_amount),
        "created_at": order.created_at.isoformat(),
        "items": [
            {
                "id": str(item.id),
                "product_id": str(item.product_id),
                "quantity": item.quantity,
                "unit_price": str(item.unit_price),
            }
            for item in order.items
        ],
        "payment": {
            "id": str(order.payment.id),
            "status": order.payment.status,
            "gateway_txn_id": order.payment.gateway_txn_id,
            "amount": str(order.payment.amount),
            "created_at": order.payment.created_at.isoformat(),
        } if order.payment else None,
    }


@router.post("", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
async def create_order(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> Response:
    """
    Create a new order with idempotency support and saga orchestration.
    
    Requires Idempotency-Key header. Same key + same body = same response.
    
    Saga steps:
    1. reserve_inventory - Reserve stock
    2. charge_payment - Charge via Stripe
    3. confirm_order - Finalize order
    
    On failure, compensating actions run in reverse order.
    """
    idempotency_key = get_idempotency_key_header(request)
    body = await request.body()
    
    cached = await validate_idempotency_request(idempotency_key, body, db)
    if cached:
        return Response(
            content=json.dumps(cached["response"]),
            status_code=cached["status_code"],
            media_type="application/json",
        )
    
    order_data = OrderCreate(**json.loads(body))
    settings = get_settings()

    await enforce_rate_limit(str(order_data.user_id))

    if settings.duplicate_guard_enabled:
        for item in order_data.items:
            is_duplicate, existing_order_id = await check_for_duplicate_order(
                str(order_data.user_id),
                str(item.product_id),
                item.quantity,
                db,
            )
            if is_duplicate and existing_order_id:
                existing = await db.execute(
                    select(Order)
                    .options(selectinload(Order.items), selectinload(Order.payment))
                    .where(Order.id == uuid.UUID(existing_order_id))
                )
                existing_order = existing.scalar_one_or_none()
                if existing_order:
                    duplicate_response = await build_order_response(existing_order)
                    return Response(
                        content=json.dumps({
                            **duplicate_response,
                            "duplicate": True,
                            "message": "Duplicate order intent detected within guard window",
                        }),
                        status_code=status.HTTP_409_CONFLICT,
                        media_type="application/json",
                    )

    total_amount = 0
    order_items = []
    
    for item in order_data.items:
        result = await db.execute(
            select(Product)
            .options(selectinload(Product.inventory))
            .where(Product.id == item.product_id)
        )
        product = result.scalar_one_or_none()
        
        if product is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product {item.product_id} not found",
            )
        
        order_items.append({
            "product": product,
            "quantity": item.quantity,
        })
        total_amount += product.price * item.quantity
    
    order = Order(
        user_id=order_data.user_id,
        total_amount=total_amount,
        status="pending",
    )
    db.add(order)
    await db.flush()
    
    for item_data in order_items:
        order_item = OrderItem(
            order_id=order.id,
            product_id=item_data["product"].id,
            quantity=item_data["quantity"],
            unit_price=item_data["product"].price,
        )
        db.add(order_item)

    items_payload = [
        {
            "product_id": str(item_data["product"].id),
            "quantity": item_data["quantity"],
            "unit_price": str(item_data["product"].price),
        }
        for item_data in order_items
    ]
    await publish_order_created(
        db,
        order.id,
        order.user_id,
        float(total_amount),
        items_payload,
    )
    await db.commit()
    
    saga = SagaOrchestrator(db, payment_gateway=get_payment_gateway())
    success = await saga.execute(order.id, idempotency_key)
    
    result = await db.execute(
        select(Order)
        .options(selectinload(Order.items), selectinload(Order.payment))
        .where(Order.id == order.id)
    )
    order = result.scalar_one()
    
    response_data = await build_order_response(order)
    response_status = 201 if success else 422

    if success and settings.duplicate_guard_enabled:
        for item in order.items:
            await record_order_fingerprint(
                str(order.user_id),
                str(item.product_id),
                item.quantity,
                str(order.id),
            )

    redis_client = await get_redis()
    await complete_idempotency_key(
        idempotency_key,
        response_data,
        response_status,
        db,
        redis_client,
    )
    
    return Response(
        content=json.dumps(response_data),
        status_code=response_status,
        media_type="application/json",
    )


@router.get("/{order_id}", response_model=OrderResponse)
async def get_order(
    order_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> OrderResponse:
    """Get an order by ID."""
    result = await db.execute(
        select(Order)
        .options(selectinload(Order.items), selectinload(Order.payment))
        .where(Order.id == order_id)
    )
    order = result.scalar_one_or_none()
    
    if order is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Order {order_id} not found",
        )
    
    return OrderResponse(
        id=order.id,
        user_id=order.user_id,
        status=order.status,
        total_amount=order.total_amount,
        created_at=order.created_at,
        items=[
            OrderItemResponse(
                id=item.id,
                product_id=item.product_id,
                quantity=item.quantity,
                unit_price=item.unit_price,
            )
            for item in order.items
        ],
        payment=PaymentResponse(
            id=order.payment.id,
            status=order.payment.status,
            gateway_txn_id=order.payment.gateway_txn_id,
            amount=order.payment.amount,
            created_at=order.payment.created_at,
        ) if order.payment else None,
    )


@router.get("/{order_id}/timeline", response_model=OrderTimelineResponse)
async def get_order_timeline(
    order_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> OrderTimelineResponse:
    """Get the saga step timeline for an order."""
    result = await db.execute(
        select(Order)
        .options(selectinload(Order.saga_steps))
        .where(Order.id == order_id)
    )
    order = result.scalar_one_or_none()
    
    if order is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Order {order_id} not found",
        )
    
    return OrderTimelineResponse(
        order_id=order.id,
        status=order.status,
        steps=[
            SagaStepResponse(
                id=step.id,
                step_name=step.step_name,
                status=step.status,
                error_message=step.error_message,
                created_at=step.created_at,
                completed_at=step.completed_at,
            )
            for step in sorted(order.saga_steps, key=lambda s: s.created_at)
        ],
    )
