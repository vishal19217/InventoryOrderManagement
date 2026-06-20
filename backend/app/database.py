"""Database setup: SQLAlchemy engine, session factory and Base.

The connection URL is read from the DATABASE_URL environment variable so the
same code runs against Postgres (Docker / production) and falls back to a local
SQLite file for quick, zero-config development.
"""
import os

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Example Postgres URL (used by docker-compose and most free hosts):
#   postgresql+psycopg2://user:password@host:5432/inventory
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./inventory.db")

# check_same_thread is a SQLite-only argument; skip it for Postgres.
connect_args = (
    {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
)

# takes an URL string that says what kind of database and where it is.
engine = create_engine(DATABASE_URL, connect_args=connect_args, pool_pre_ping=True)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """FastAPI dependency that yields a DB session and always closes it."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
