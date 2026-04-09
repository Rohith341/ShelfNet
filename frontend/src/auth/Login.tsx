import { useState } from "react";
import { loginUser } from "../api/auth.api";
import { saveAuth } from "../utils/auth";
import { useNavigate } from "react-router-dom";
import "../styles/auth.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const validate = () => {
    if (!email.trim()) {
      setError("Email is required");
      return false;
    }
    if (!password) {
      setError("Password is required");
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError("Invalid email format");
      return false;
    }
    return true;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setLoading(true);
    setError("");

    try {
      const res = await loginUser(email, password);
      saveAuth(res.data.access_token, res.data.user);

      const role = res.data.user.role;
      if (role === "ADMIN") navigate("/admin");
      else if (role === "MANAGER") navigate("/manager");
      else if (role === "SALES") navigate("/sales");
      else navigate("/");
    } catch (err: any) {
      const detail =
        err.response?.data?.detail || "Login failed. Please try again.";

      if (detail.includes("Invalid credentials")) {
        setError("Invalid email or password");
      } else if (detail.includes("not active")) {
        setError("Your account is not active. Please contact admin.");
      } else {
        setError(detail);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-form">
      <div className="auth-card">
        <h2>Welcome to ShelfNet</h2>
        <p className="auth-subtitle">
          Smart monitoring for perishable goods
        </p>

        {error && <div className="error-message show">{error}</div>}

        <form onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError("");
            }}
            disabled={loading}
            required
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError("");
            }}
            disabled={loading}
            required
          />

          <button type="submit" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <div className="auth-footer">
          <span>New user?</span>
          <a href="/register">Request access</a>
        </div>
      </div>

      {/* Demo Credentials Info */}
      <div
        className="demo-info"
        style={{
          marginTop: "30px",
          padding: "15px",
          background: "rgba(255,255,255,0.1)",
          borderRadius: "8px",
          fontSize: "13px",
          textAlign: "center",
          color: "#fff",
          maxWidth: "400px"
        }}
      >
        <strong>Demo Credentials:</strong>
        <br />
        Email:{" "}
        <code
          style={{
            background: "rgba(0,0,0,0.3)",
            padding: "2px 6px",
            borderRadius: "3px"
          }}
        >
          admin@test.com
        </code>
        <br />
        Password:{" "}
        <code
          style={{
            background: "rgba(0,0,0,0.3)",
            padding: "2px 6px",
            borderRadius: "3px"
          }}
        >
          Admin@123
        </code>
      </div>
    </div>
  );
}