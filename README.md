# Inventory & Order Management System

A production-ready, fully containerized full-stack application for managing
products, customers, orders, and inventory.

| Layer    | Technology                          |
| -------- | ----------------------------------- |
| Frontend | React (JavaScript) + Vite, nginx    |
| Backend  | Python, FastAPI, SQLAlchemy         |
| Database | PostgreSQL                          |
| DevOps   | Docker, Docker Compose              |

---

## Features

- **Products** — create, list, view, update, delete (unique SKU enforced).
- **Customers** — create, list, view, delete (unique email enforced).
- **Orders** — create multi-item orders, list, view details, cancel.
- **Inventory rules** enforced by the backend:
  - Product quantity can never be negative.
  - Orders are rejected when stock is insufficient.
  - Placing an order automatically reduces stock; cancelling restores it.
  - Order totals are always calculated server-side.
- **Dashboard** — totals for products, customers, orders, plus low-stock alerts.
- Responsive UI, form validation, and clear success/error toasts.

---

## Quick start (Docker Compose)

The only prerequisite is Docker Desktop.

```bash
# 1. (optional) copy the env file and tweak credentials
cp .env.example .env

# 2. build and start everything
docker compose up --build
```

Then open:

| Service          | URL                              |
| ---------------- | -------------------------------- |
| Frontend (app)   | http://localhost:3000            |
| Backend API      | http://localhost:8000            |
| API docs (Swagger) | http://localhost:8000/docs     |

Stop with `Ctrl+C`, and remove containers/volumes with `docker compose down -v`.

---

## Project structure

```
inventory-order-system/
├── docker-compose.yml          # orchestrates db + backend + frontend
├── .env.example
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app/
│       ├── main.py             # FastAPI app + dashboard/health routes
│       ├── database.py         # engine/session (DATABASE_URL env)
│       ├── models.py           # SQLAlchemy ORM models
│       ├── schemas.py          # Pydantic request/response models
│       ├── crud.py             # DB operations + business logic
│       └── routers/            # products, customers, orders endpoints
└── frontend/
    ├── Dockerfile              # multi-stage: Vite build -> nginx
    ├── nginx.conf              # serves SPA, proxies /api -> backend
    └── src/
        ├── api.js              # central API client
        ├── App.jsx             # routing + layout
        └── components/         # Dashboard, Products, Customers, Orders, Toast
```

---

## API reference

Base URL: `http://localhost:8000`

### Products
| Method | Path             | Description            |
| ------ | ---------------- | ---------------------- |
| POST   | `/products`      | Create a product       |
| GET    | `/products`      | List all products      |
| GET    | `/products/{id}` | Get one product        |
| PUT    | `/products/{id}` | Update a product       |
| DELETE | `/products/{id}` | Delete a product       |

### Customers
| Method | Path              | Description          |
| ------ | ----------------- | -------------------- |
| POST   | `/customers`      | Create a customer    |
| GET    | `/customers`      | List all customers   |
| GET    | `/customers/{id}` | Get one customer     |
| DELETE | `/customers/{id}` | Delete a customer    |

### Orders
| Method | Path           | Description                       |
| ------ | -------------- | --------------------------------- |
| POST   | `/orders`      | Create an order (reduces stock)   |
| GET    | `/orders`      | List all orders                   |
| GET    | `/orders/{id}` | Get order details                 |
| DELETE | `/orders/{id}` | Cancel an order (restores stock)  |

### Other
- `GET /dashboard` — summary counts + low-stock products.
- `GET /health` — health check.

### Example requests

```bash
# Create a product
curl -X POST http://localhost:8000/products \
  -H "Content-Type: application/json" \
  -d '{"name":"Widget","sku":"WID-001","price":9.99,"quantity":100}'

# Create a customer
curl -X POST http://localhost:8000/customers \
  -H "Content-Type: application/json" \
  -d '{"full_name":"Jane Doe","email":"jane@example.com","phone":"+15550100"}'

# Create an order (total is computed by the backend)
curl -X POST http://localhost:8000/orders \
  -H "Content-Type: application/json" \
  -d '{"customer_id":1,"items":[{"product_id":1,"quantity":2}]}'
```

---

## Local development (without Docker)

**Backend**
```bash
cd backend
python -m venv .venv && . .venv/Scripts/activate   # Windows PowerShell: .venv\Scripts\Activate.ps1
pip install -r requirements.txt
# Uses a local SQLite file when DATABASE_URL is not set:
uvicorn app.main:app --reload
```

**Frontend**
```bash
cd frontend
npm install
npm run dev        # http://localhost:5173, proxies /api -> localhost:8000
```

---

## Deploying to free hosting

The app is split into three deployable pieces. A common free setup:

### 1. Database — [Neon](https://neon.tech) or [Supabase](https://supabase.com)
Create a free PostgreSQL instance and copy its connection string. Convert it to
the SQLAlchemy/psycopg2 form:
`postgresql+psycopg2://USER:PASSWORD@HOST/DBNAME`

### 2. Backend — [Render](https://render.com) (free web service)
- New → **Web Service** → connect this repo → root directory `backend`.
- Render auto-detects the `Dockerfile`.
- Environment variables:
  - `DATABASE_URL` = your Neon/Supabase string (psycopg2 form).
  - `CORS_ORIGINS` = your frontend URL (e.g. `https://your-app.netlify.app`).
- Render provides `$PORT`; the Dockerfile already honors it.

### 3. Frontend — [Netlify](https://netlify.com) or [Vercel](https://vercel.com)
- Base directory `frontend`, build command `npm run build`, publish `dist`.
- Set build env var `VITE_API_URL` = your Render backend URL
  (e.g. `https://your-api.onrender.com`). The app then calls the backend
  directly instead of the `/api` proxy.

> Alternatively, [Railway](https://railway.app) can deploy the whole
> `docker-compose.yml` (db + backend + frontend) from this repo in one project.

---

## Business rules summary

| Rule                                          | Where enforced                         |
| --------------------------------------------- | -------------------------------------- |
| SKU unique                                    | `crud.create/update_product` + DB index |
| Customer email unique                         | `crud.create_customer` + DB index      |
| Quantity never negative                       | Pydantic + DB CheckConstraint           |
| No order beyond available stock               | `crud.create_order`                     |
| Order reduces stock / cancel restores it      | `crud.create_order` / `delete_order`    |
| Total computed by backend                     | `crud.create_order`                     |
| Proper HTTP status codes & validation         | FastAPI + Pydantic across all routes    |
```
