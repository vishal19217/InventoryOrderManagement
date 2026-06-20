"""Pydantic schemas for request validation and response serialization."""
from datetime import datetime
from typing import List

from pydantic import BaseModel, EmailStr, Field


# --------------------------------------------------------------------------- #
# Products
# --------------------------------------------------------------------------- #
class ProductBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    sku: str = Field(..., min_length=1, max_length=100)
    price: float = Field(..., ge=0)
    quantity: int = Field(..., ge=0)  # BR2: quantity cannot be negative


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    """All fields optional so callers can do partial updates."""

    name: str | None = Field(default=None, min_length=1, max_length=200)
    sku: str | None = Field(default=None, min_length=1, max_length=100)
    price: float | None = Field(default=None, ge=0)
    quantity: int | None = Field(default=None, ge=0)


class ProductOut(ProductBase):
    id: int

    model_config = {"from_attributes": True}


# --------------------------------------------------------------------------- #
# Customers
# --------------------------------------------------------------------------- #
class CustomerBase(BaseModel):
    full_name: str = Field(..., min_length=1, max_length=200)
    email: EmailStr
    phone: str = Field(..., min_length=3, max_length=40)


class CustomerCreate(CustomerBase):
    pass


class CustomerOut(CustomerBase):
    id: int

    model_config = {"from_attributes": True}


# --------------------------------------------------------------------------- #
# Orders
# --------------------------------------------------------------------------- #
class OrderItemCreate(BaseModel):
    product_id: int
    quantity: int = Field(..., gt=0)


class OrderCreate(BaseModel):
    customer_id: int
    items: List[OrderItemCreate] = Field(..., min_length=1)


class OrderItemOut(BaseModel):
    id: int
    product_id: int
    quantity: int
    unit_price: float
    subtotal: float

    model_config = {"from_attributes": True}


class OrderOut(BaseModel):
    id: int
    customer_id: int
    total_amount: float
    status: str
    created_at: datetime
    items: List[OrderItemOut]

    model_config = {"from_attributes": True}


# --------------------------------------------------------------------------- #
# Dashboard
# --------------------------------------------------------------------------- #
class DashboardSummary(BaseModel):
    total_products: int
    total_customers: int
    total_orders: int
    low_stock_products: List[ProductOut]
