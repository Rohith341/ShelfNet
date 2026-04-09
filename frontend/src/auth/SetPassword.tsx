import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { setPassword } from "../api/auth.api";
import "../styles/auth.css";

export default function SetPassword() {
  const navigate = useNavigate();
  const location = useLocation();

  const email = location.state?.email;
  const [password, setPasswordInput] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!email) {
    return (
      <div className="auth-form">
        <div className="auth-card">
          <h2>Error</h2>
          <p className="auth-subtitle">
            Invalid password setup request. Please login first.
          </p>
          <div className="auth-footer">
            <a href="/login">Back to Login</a>
          </div>
        </div>
      </div>
    );
  }

  const validate = () => {
    if (!password) {
      setError("Password is required");
      return false;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return false;
    }
    if (!/[A-Z]/.test(password)) {
      setError("Password must contain at least one uppercase letter");
      return false;
    }
    if (!/[0-9]/.test(password)) {
      setError("Password must contain at least one number");
      return false;
    }
    if (!/[!@#$%^&*]/.test(password)) {
      setError("Password must contain at least one special character (!@#$%^&*)");
      return false;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return false;
    }
    return true;
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;

    setLoading(true);
    setError("");

    try {
      await setPassword(email, password);
      alert("Password set successfully. Please login.");
      navigate("/login");
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || "Failed to set password";
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-form">
      <div className="auth-card">
        <h2>Set Your Password</h2>
        <p className="auth-subtitle">
          Complete account setup for ShelfNet
        </p>

        {error && <div className="error-message show">{error}</div>}

        <form onSubmit={handleSetPassword}>
          <div style={{ marginBottom: "14px" }}>
            <input
              type="email"
              value={email}
              disabled
              placeholder="Email"
              style={{ background: "#f3f4f6", cursor: "not-allowed" }}
            />
          </div>

          <input
            type="password"
            placeholder="New Password (min 8 chars, 1 uppercase, 1 number, 1 special char)"
            value={password}
            onChange={(e) => {
              setPasswordInput(e.target.value);
              setError("");
            }}
            disabled={loading}
            required
            title="Password must contain uppercase, number, and special character"
          />

          <input
            type="password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              setError("");
            }}
            disabled={loading}
            required
          />

          <button 
            type="submit"
            disabled={loading}
          >
            {loading ? "Setting Password..." : "Set Password"}
          </button>
        </form>

        <div className="auth-footer">
          <a href="/login">← Back to Login</a>
        </div>
      </div>
    </div>
  );
}
