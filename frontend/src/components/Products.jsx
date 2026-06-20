import { useEffect, useState } from "react";
import { api } from "../api.js";
import { useToast } from "./Toast.jsx";

const EMPTY = { name: "", sku: "", price: "", quantity: "" };

export default function Products() {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const load = () =>
    api
      .getProducts()
      .then(setProducts)
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const resetForm = () => {
    setForm(EMPTY);
    setEditingId(null);
  };

  const validate = () => {
    if (!form.name.trim()) return "Product name is required.";
    if (!form.sku.trim()) return "SKU is required.";
    if (form.price === "" || Number(form.price) < 0) return "Price must be 0 or more.";
    if (form.quantity === "" || Number(form.quantity) < 0)
      return "Quantity must be 0 or more.";
    return null;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const error = validate();
    if (error) return toast.error(error);

    const body = {
      name: form.name.trim(),
      sku: form.sku.trim(),
      price: Number(form.price),
      quantity: Number(form.quantity),
    };

    try {
      if (editingId) {
        await api.updateProduct(editingId, body);
        toast.success("Product updated.");
      } else {
        await api.createProduct(body);
        toast.success("Product created.");
      }
      resetForm();
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const onEdit = (p) => {
    setEditingId(p.id);
    setForm({ name: p.name, sku: p.sku, price: p.price, quantity: p.quantity });
  };

  const onDelete = async (id) => {
    if (!window.confirm("Delete this product?")) return;
    try {
      await api.deleteProduct(id);
      toast.success("Product deleted.");
      if (editingId === id) resetForm();
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div>
      <h1>Products</h1>

      <div className="card">
        <h2>{editingId ? "Edit Product" : "Add Product"}</h2>
        <form className="form-grid" onSubmit={onSubmit}>
          <label>
            Name
            <input name="name" value={form.name} onChange={onChange} placeholder="Widget" />
          </label>
          <label>
            SKU
            <input name="sku" value={form.sku} onChange={onChange} placeholder="WID-001" />
          </label>
          <label>
            Price
            <input
              name="price"
              type="number"
              min="0"
              step="0.01"
              value={form.price}
              onChange={onChange}
              placeholder="9.99"
            />
          </label>
          <label>
            Quantity
            <input
              name="quantity"
              type="number"
              min="0"
              value={form.quantity}
              onChange={onChange}
              placeholder="100"
            />
          </label>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary">
              {editingId ? "Update" : "Add"}
            </button>
            {editingId && (
              <button type="button" className="btn" onClick={resetForm}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="card">
        <h2>Product List</h2>
        {loading ? (
          <p className="muted">Loading…</p>
        ) : products.length === 0 ? (
          <p className="muted">No products yet.</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>SKU</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td>{p.sku}</td>
                    <td>${p.price.toFixed(2)}</td>
                    <td>
                      <span className={`badge ${p.quantity <= 10 ? "badge-warning" : "badge-ok"}`}>
                        {p.quantity}
                      </span>
                    </td>
                    <td className="row-actions">
                      <button className="btn btn-sm" onClick={() => onEdit(p)}>
                        Edit
                      </button>
                      <button className="btn btn-sm btn-danger" onClick={() => onDelete(p.id)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
