"""FastAPI application entrypoint."""
import os

from fastapi import APIRouter, Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from . import crud, models, schemas
from .database import Base, engine, get_db
from .routers import customers, orders, products

# Create tables on startup. For a larger project you'd use Alembic migrations,
# but create_all keeps this assessment self-contained.
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Inventory & Order Management API",
    description="Manage products, customers, orders and inventory.",
    version="1.0.0",
)

# Allow the React frontend to call the API. CORS_ORIGINS is a comma-separated
# list; "*" (the default) is convenient for local dev and demos.
origins = os.getenv("CORS_ORIGINS", "*").split(",")

#2 including the middleware to all frontend to call the backend APIs
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in origins],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

#3 including the routers
app.include_router(products.router)
app.include_router(customers.router)
app.include_router(orders.router)

dashboard = APIRouter(tags=["dashboard"])


@dashboard.get("/dashboard", response_model=schemas.DashboardSummary)
def dashboard_summary(db: Session = Depends(get_db)):
    return crud.get_dashboard_summary(db)


@dashboard.get("/health", tags=["health"])
def health_check():
    return {"status": "ok"}


app.include_router(dashboard)
