"""Database operations and core business logic.

Keeping the logic here (rather than in the routers) keeps the HTTP layer thin
and makes the business rules easy to read in one place.
"""
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from . import models, schemas


# --------------------------------------------------------------------------- #
# Products
# --------------------------------------------------------------------------- #
def create_product(db: Session, payload: schemas.ProductCreate) -> models.Product:
    # BR1: SKU must be unique.
    if db.query(models.Product).filter(models.Product.sku == payload.sku).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A product with SKU '{payload.sku}' already exists.",
        )
    product = models.Product(**payload.model_dump())
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


def get_products(db: Session) -> list[models.Product]:
    return db.query(models.Product).order_by(models.Product.id).all()


def get_product(db: Session, product_id: int) -> models.Product:
    product = db.get(models.Product, product_id)
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product {product_id} not found.",
        )
    return product


def update_product(
    db: Session, product_id: int, payload: schemas.ProductUpdate
) -> models.Product:
    product = get_product(db, product_id)
    data = payload.model_dump(exclude_unset=True)

    # BR1: keep SKU unique when it's being changed.
    new_sku = data.get("sku")
    if new_sku and new_sku != product.sku:
        clash = (
            db.query(models.Product)
            .filter(models.Product.sku == new_sku)
            .first()
        )
        if clash:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"A product with SKU '{new_sku}' already exists.",
            )

    for field, value in data.items():
        setattr(product, field, value)
    db.commit()
    db.refresh(product)
    return product


def delete_product(db: Session, product_id: int) -> None:
    product = get_product(db, product_id)
    db.delete(product)
    db.commit()


# --------------------------------------------------------------------------- #
# Customers
# --------------------------------------------------------------------------- #
def create_customer(db: Session, payload: schemas.CustomerCreate) -> models.Customer:
    # BR3: email must be unique.
    if db.query(models.Customer).filter(models.Customer.email == payload.email).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A customer with email '{payload.email}' already exists.",
        )
    customer = models.Customer(**payload.model_dump())
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer


def get_customers(db: Session) -> list[models.Customer]:
    return db.query(models.Customer).order_by(models.Customer.id).all()


def get_customer(db: Session, customer_id: int) -> models.Customer:
    customer = db.get(models.Customer, customer_id)
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Customer {customer_id} not found.",
        )
    return customer


def delete_customer(db: Session, customer_id: int) -> None:
    customer = get_customer(db, customer_id)
    db.delete(customer)
    db.commit()


# --------------------------------------------------------------------------- #
# Orders
# --------------------------------------------------------------------------- #
def create_order(db: Session, payload: schemas.OrderCreate) -> models.Order:
    # Validate the customer exists.
    get_customer(db, payload.customer_id)

    # Merge duplicate product lines so stock checks are accurate.
    requested: dict[int, int] = {}
    for item in payload.items:
        requested[item.product_id] = requested.get(item.product_id, 0) + item.quantity

    order = models.Order(customer_id=payload.customer_id, total_amount=0.0)
    total = 0.0

    for product_id, qty in requested.items():
        product = get_product(db, product_id)

        # BR4: cannot order more than what's in stock.
        if qty > product.quantity:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    f"Insufficient stock for '{product.name}' "
                    f"(requested {qty}, available {product.quantity})."
                ),
            )

        subtotal = round(product.price * qty, 2)
        total += subtotal

        order.items.append(
            models.OrderItem(
                product_id=product.id,
                quantity=qty,
                unit_price=product.price,
                subtotal=subtotal,
            )
        )

        # BR5: creating an order reduces stock.
        product.quantity -= qty

    # BR6: total computed by the backend, never trusted from the client.
    order.total_amount = round(total, 2)

    db.add(order)
    db.commit()
    db.refresh(order)
    return order


def get_orders(db: Session) -> list[models.Order]:
    return db.query(models.Order).order_by(models.Order.id.desc()).all()


def get_order(db: Session, order_id: int) -> models.Order:
    order = db.get(models.Order, order_id)
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Order {order_id} not found.",
        )
    return order


def delete_order(db: Session, order_id: int) -> None:
    """Cancel an order and restock its products."""
    order = get_order(db, order_id)
    for item in order.items:
        product = db.get(models.Product, item.product_id)
        if product:  # restore stock if the product still exists
            product.quantity += item.quantity
    db.delete(order)
    db.commit()


# --------------------------------------------------------------------------- #
# Dashboard
# --------------------------------------------------------------------------- #
def get_dashboard_summary(db: Session, low_stock_threshold: int = 10):
    low_stock = (
        db.query(models.Product)
        .filter(models.Product.quantity <= low_stock_threshold)
        .order_by(models.Product.quantity)
        .all()
    )
    return {
        "total_products": db.query(models.Product).count(),
        "total_customers": db.query(models.Customer).count(),
        "total_orders": db.query(models.Order).count(),
        "low_stock_products": low_stock,
    }
