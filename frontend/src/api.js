// Centralized API client. All requests go through `request()` so error
// handling and JSON parsing live in one place.
//
// In dev, VITE_API_URL is empty and calls hit "/api/..." which Vite proxies
// to the backend. In production, set VITE_API_URL to the backend's base URL
// (e.g. https://my-api.onrender.com) at build time.
const RAW_BASE = import.meta.env.VITE_API_URL ?? "";
// Use the /api proxy prefix only when no explicit backend URL is configured.
const BASE = RAW_BASE ? RAW_BASE.replace(/\/$/, "") : "/api";

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (res.status === 204) return null;

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    // FastAPI puts the message in `detail`; validation errors are arrays.
    let message = `Request failed (${res.status})`;
    if (data?.detail) {
      message = Array.isArray(data.detail)
        ? data.detail.map((d) => d.msg).join(", ")
        : data.detail;
    }
    throw new Error(message);
  }
  return data;
}

export const api = {
  // Dashboard
  getDashboard: () => request("/dashboard"),

  // Products
  getProducts: () => request("/products"),
  createProduct: (body) =>
    request("/products", { method: "POST", body: JSON.stringify(body) }),
  updateProduct: (id, body) =>
    request(`/products/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteProduct: (id) => request(`/products/${id}`, { method: "DELETE" }),

  // Customers
  getCustomers: () => request("/customers"),
  createCustomer: (body) =>
    request("/customers", { method: "POST", body: JSON.stringify(body) }),
  deleteCustomer: (id) => request(`/customers/${id}`, { method: "DELETE" }),

  // Orders
  getOrders: () => request("/orders"),
  getOrder: (id) => request(`/orders/${id}`),
  createOrder: (body) =>
    request("/orders", { method: "POST", body: JSON.stringify(body) }),
  deleteOrder: (id) => request(`/orders/${id}`, { method: "DELETE" }),
};
