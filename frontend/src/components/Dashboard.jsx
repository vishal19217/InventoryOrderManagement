import { useEffect, useState } from "react";
import { api } from "../api.js";
import { useToast } from "./Toast.jsx";

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    api
      .getDashboard()
      .then(setSummary)
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, [toast]);

  if (loading) return <p className="muted">Loading dashboard…</p>;
  if (!summary) return <p className="muted">No data available.</p>;

  const cards = [
    { label: "Total Products", value: summary.total_products, icon: "📦" },
    { label: "Total Customers", value: summary.total_customers, icon: "👥" },
    { label: "Total Orders", value: summary.total_orders, icon: "🧾" },
    { label: "Low Stock Items", value: summary.low_stock_products.length, icon: "⚠️" },
  ];

  return (
    <div>
      <h1>Dashboard</h1>
      <div className="cards">
        {cards.map((c) => (
          <div className="card stat-card" key={c.label}>
            <div className="stat-icon">{c.icon}</div>
            <div>
              <div className="stat-value">{c.value}</div>
              <div className="stat-label">{c.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <h2>Low Stock Products (≤ 10)</h2>
        {summary.low_stock_products.length === 0 ? (
          <p className="muted">All products are well stocked. 🎉</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>SKU</th>
                <th>Price</th>
                <th>Quantity</th>
              </tr>
            </thead>
            <tbody>
              {summary.low_stock_products.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{p.sku}</td>
                  <td>${p.price.toFixed(2)}</td>
                  <td>
                    <span className="badge badge-warning">{p.quantity}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
