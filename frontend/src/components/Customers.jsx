import { useEffect, useState } from "react";
import { api } from "../api.js";
import { useToast } from "./Toast.jsx";

const EMPTY = { full_name: "", email: "", phone: "" };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const load = () =>
    api
      .getCustomers()
      .then(setCustomers)
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const validate = () => {
    if (!form.full_name.trim()) return "Full name is required.";
    if (!EMAIL_RE.test(form.email)) return "A valid email is required.";
    if (!form.phone.trim()) return "Phone number is required.";
    return null;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const error = validate();
    if (error) return toast.error(error);

    try {
      await api.createCustomer({
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
      });
      toast.success("Customer created.");
      setForm(EMPTY);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const onDelete = async (id) => {
    if (!window.confirm("Delete this customer?")) return;
    try {
      await api.deleteCustomer(id);
      toast.success("Customer deleted.");
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div>
      <h1>Customers</h1>

      <div className="card">
        <h2>Add Customer</h2>
        <form className="form-grid" onSubmit={onSubmit}>
          <label>
            Full Name
            <input
              name="full_name"
              value={form.full_name}
              onChange={onChange}
              placeholder="Jane Doe"
            />
          </label>
          <label>
            Email
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={onChange}
              placeholder="jane@example.com"
            />
          </label>
          <label>
            Phone
            <input
              name="phone"
              value={form.phone}
              onChange={onChange}
              placeholder="+1 555 0100"
            />
          </label>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary">
              Add
            </button>
          </div>
        </form>
      </div>

      <div className="card">
        <h2>Customer List</h2>
        {loading ? (
          <p className="muted">Loading…</p>
        ) : customers.length === 0 ? (
          <p className="muted">No customers yet.</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id}>
                    <td>{c.full_name}</td>
                    <td>{c.email}</td>
                    <td>{c.phone}</td>
                    <td className="row-actions">
                      <button className="btn btn-sm btn-danger" onClick={() => onDelete(c.id)}>
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
