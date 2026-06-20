import { useEffect, useMemo, useState } from "react";
import { api } from "../api.js";
import { useToast } from "./Toast.jsx";

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [customerId, setCustomerId] = useState("");
  const [lines, setLines] = useState([{ product_id: "", quantity: 1 }]);
  const [detail, setDetail] = useState(null); // order being viewed

  const toast = useToast();

  const load = () =>
    Promise.all([api.getOrders(), api.getProducts(), api.getCustomers()])
      .then(([o, p, c]) => {
        setOrders(o);
        setProducts(p);
        setCustomers(c);
      })
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const productById = useMemo(
    () => Object.fromEntries(products.map((p) => [String(p.id), p])),
    [products]
  );

  // Live preview of the total (the backend remains the source of truth).
  const estimatedTotal = useMemo(() => {
    return lines.reduce((sum, l) => {
      const p = productById[String(l.product_id)];
      if (!p) return sum;
      return sum + p.price * Number(l.quantity || 0);
    }, 0);
  }, [lines, productById]);

  const updateLine = (i, field, value) => {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, [field]: value } : l)));
  };

  const addLine = () => setLines((prev) => [...prev, { product_id: "", quantity: 1 }]);
  const removeLine = (i) => setLines((prev) => prev.filter((_, idx) => idx !== i));

  const resetForm = () => {
    setCustomerId("");
    setLines([{ product_id: "", quantity: 1 }]);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!customerId) return toast.error("Please select a customer.");

    const items = lines
      .filter((l) => l.product_id)
      .map((l) => ({ product_id: Number(l.product_id), quantity: Number(l.quantity) }));

    if (items.length === 0) return toast.error("Add at least one product.");
    if (items.some((i) => i.quantity <= 0))
      return toast.error("Quantities must be greater than 0.");

    try {
      await api.createOrder({ customer_id: Number(customerId), items });
      toast.success("Order created.");
      resetForm();
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const onDelete = async (id) => {
    if (!window.confirm("Cancel this order? Stock will be restored.")) return;
    try {
      await api.deleteOrder(id);
      toast.success("Order cancelled.");
      if (detail?.id === id) setDetail(null);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const viewDetail = async (id) => {
    try {
      setDetail(await api.getOrder(id));
    } catch (err) {
      toast.error(err.message);
    }
  };

  const customerName = (id) =>
    customers.find((c) => c.id === id)?.full_name ?? `#${id}`;

  return (
    <div>
      <h1>Orders</h1>

      <div className="card">
        <h2>Create Order</h2>
        <form onSubmit={onSubmit}>
          <label className="block-label">
            Customer
            <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              <option value="">— Select customer —</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.full_name} ({c.email})
                </option>
              ))}
            </select>
          </label>

          <div className="lines">
            {lines.map((line, i) => {
              const p = productById[String(line.product_id)];
              return (
                <div className="line-row" key={i}>
                  <select
                    value={line.product_id}
                    onChange={(e) => updateLine(i, "product_id", e.target.value)}
                  >
                    <option value="">— Select product —</option>
                    {products.map((prod) => (
                      <option key={prod.id} value={prod.id}>
                        {prod.name} (${prod.price.toFixed(2)}, stock {prod.quantity})
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="1"
                    value={line.quantity}
                    onChange={(e) => updateLine(i, "quantity", e.target.value)}
                  />
                  <span className="line-subtotal">
                    {p ? `$${(p.price * Number(line.quantity || 0)).toFixed(2)}` : "—"}
                  </span>
                  {lines.length > 1 && (
                    <button type="button" className="btn btn-sm btn-danger" onClick={() => removeLine(i)}>
                      ✕
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <button type="button" className="btn btn-sm" onClick={addLine}>
            + Add product
          </button>

          <div className="order-footer">
            <strong>Estimated total: ${estimatedTotal.toFixed(2)}</strong>
            <button type="submit" className="btn btn-primary">
              Place Order
            </button>
          </div>
        </form>
      </div>

      <div className="card">
        <h2>Order List</h2>
        {loading ? (
          <p className="muted">Loading…</p>
        ) : orders.length === 0 ? (
          <p className="muted">No orders yet.</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td>#{o.id}</td>
                    <td>{customerName(o.customer_id)}</td>
                    <td>{o.items.length}</td>
                    <td>${o.total_amount.toFixed(2)}</td>
                    <td>
                      <span className="badge badge-ok">{o.status}</span>
                    </td>
                    <td>{new Date(o.created_at).toLocaleDateString()}</td>
                    <td className="row-actions">
                      <button className="btn btn-sm" onClick={() => viewDetail(o.id)}>
                        View
                      </button>
                      <button className="btn btn-sm btn-danger" onClick={() => onDelete(o.id)}>
                        Cancel
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {detail && (
        <div className="modal-overlay" onClick={() => setDetail(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Order #{detail.id}</h2>
              <button className="btn btn-sm" onClick={() => setDetail(null)}>
                ✕
              </button>
            </div>
            <p>
              <strong>Customer:</strong> {customerName(detail.customer_id)}
            </p>
            <p>
              <strong>Status:</strong> {detail.status} &nbsp;|&nbsp;{" "}
              <strong>Date:</strong> {new Date(detail.created_at).toLocaleString()}
            </p>
            <table className="table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Qty</th>
                  <th>Unit Price</th>
                  <th>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {detail.items.map((it) => (
                  <tr key={it.id}>
                    <td>{productById[String(it.product_id)]?.name ?? `#${it.product_id}`}</td>
                    <td>{it.quantity}</td>
                    <td>${it.unit_price.toFixed(2)}</td>
                    <td>${it.subtotal.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="order-total">Total: ${detail.total_amount.toFixed(2)}</p>
          </div>
        </div>
      )}
    </div>
  );
}
