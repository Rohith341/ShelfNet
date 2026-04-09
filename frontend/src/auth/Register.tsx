import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import "../styles/auth.css";

export default function Register() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "MANAGER",
    warehouse_id: "",
    password: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const validate = () => {
    if (!form.name.trim()) {
      setError("Full name is required");
      return false;
    }
    if (!form.email.trim()) {
      setError("Email is required");
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(form.email)) {
      setError("Invalid email format");
      return false;
    }
    if (!form.password) {
      setError("Password is required");
      return false;
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters");
      return false;
    }
    if (!/[A-Z]/.test(form.password)) {
      setError("Password must contain at least one uppercase letter");
      return false;
    }
    if (!/[0-9]/.test(form.password)) {
      setError("Password must contain at least one number");
      return false;
    }
    if (!/[!@#$%^&*]/.test(form.password)) {
      setError("Password must contain at least one special character (!@#$%^&*)");
      return false;
    }
    if (form.role !== "MANAGER" && form.role !== "SALES") {
      setError("Please select a valid role");
      return false;
    }
    if ((form.role === "MANAGER" || form.role === "SALES") && !form.warehouse_id.trim()) {
      setError("Warehouse ID is required for this role");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;

    setLoading(true);
    setError("");

    try {
      const response = await api.post("/users", {
        name: form.name,
        email: form.email,
        role: form.role,
        warehouse_id: form.warehouse_id,
        password: form.password
      });

      alert(response.data.message || "Registration submitted successfully. Await admin approval.");
      setForm({ name: "", email: "", role: "MANAGER", warehouse_id: "", password: "" });
      
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || "Registration failed. Please try again.";
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-form">
      <div className="auth-card">
        <h2>Request Access</h2>
        <p className="auth-subtitle">
          Fill the form below to request account access
        </p>

        {error && <div className="error-message show">{error}</div>}

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            name="name"
            placeholder="Full Name"
            value={form.name}
            onChange={handleChange}
            disabled={loading}
            required
          />

          <input
            type="email"
            name="email"
            placeholder="Email Address"
            value={form.email}
            onChange={handleChange}
            disabled={loading}
            required
          />

          <input
            type="password"
            name="password"
            placeholder="Password (min 8 chars, 1 uppercase, 1 number, 1 special char)"
            value={form.password}
            onChange={handleChange}
            disabled={loading}
            required
            title="Password must contain uppercase, number, and special character"
          />

          <select 
            name="role" 
            value={form.role}
            onChange={handleChange}
            disabled={loading}
            required
          >
            <option value="" disabled>Select Role</option>
            <option value="MANAGER">Manager</option>
            <option value="SALES">Sales</option>
          </select>

          <input
            type="text"
            name="warehouse_id"
            placeholder="Warehouse ID (required)"
            value={form.warehouse_id}
            onChange={handleChange}
            disabled={loading}
            required
          />

          <button 
            type="submit" 
            disabled={loading}
          >
            {loading ? "Submitting..." : "Submit Request"}
          </button>
        </form>

        <div className="auth-footer">
          <span>Already have access?</span>
          <a href="/login">Login here</a>
        </div>
      </div>
    </div>
  );
}
