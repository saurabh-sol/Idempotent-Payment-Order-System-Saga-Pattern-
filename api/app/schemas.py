import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional, List

from pydantic import BaseModel, Field, ConfigDict


class ProductBase(BaseModel):
    name: str
    description: Optional[str] = None
    price: Decimal = Field(gt=0, decimal_places=2)


class ProductCreate(ProductBase):
    initial_stock: int = Field(ge=0, default=0)


class ProductResponse(ProductBase):
    id: uuid.UUID
    created_at: datetime
    available_qty: int
    reserved_qty: int

    model_config = ConfigDict(from_attributes=True)


class ProductListResponse(BaseModel):
    products: List[ProductResponse]
    total: int


class InventoryResponse(BaseModel):
    product_id: uuid.UUID
    available_qty: int
    reserved_qty: int

    model_config = ConfigDict(from_attributes=True)


class OrderItemCreate(BaseModel):
    product_id: uuid.UUID
    quantity: int = Field(gt=0)


class OrderCreate(BaseModel):
    user_id: uuid.UUID
    items: List[OrderItemCreate] = Field(min_length=1)


class OrderItemResponse(BaseModel):
    id: uuid.UUID
    product_id: uuid.UUID
    quantity: int
    unit_price: Decimal

    model_config = ConfigDict(from_attributes=True)


class PaymentResponse(BaseModel):
    id: uuid.UUID
    status: str
    gateway_txn_id: Optional[str]
    amount: Decimal
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SagaStepResponse(BaseModel):
    id: uuid.UUID
    step_name: str
    status: str
    error_message: Optional[str]
    created_at: datetime
    completed_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)


class OrderResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    status: str
    total_amount: Decimal
    created_at: datetime
    items: List[OrderItemResponse]
    payment: Optional[PaymentResponse] = None

    model_config = ConfigDict(from_attributes=True)


class OrderTimelineResponse(BaseModel):
    order_id: uuid.UUID
    status: str
    steps: List[SagaStepResponse]


class IdempotencyConflictResponse(BaseModel):
    detail: str
    existing_response: Optional[dict] = None


class HealthResponse(BaseModel):
    status: str
    service: str


class ErrorResponse(BaseModel):
    detail: str
