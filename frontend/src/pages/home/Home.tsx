import { Link } from "react-router-dom";
import "../../styles/home.css";

export default function Home() {
  return (
    <div className="home-container">
      {/* Header */}
      <div className="home-header">
        <h1 className="home-title">ShelfNet</h1>
        <p className="home-subtitle">AI-powered Cold Chain Monitoring & Shelf-Life Intelligence</p>
      </div>

      {/* Features */}
      <div className="features-grid">
        <div className="feature-card">
          <div className="feature-icon">📊</div>
          <h3>Real-Time Monitoring</h3>
          <p>Track temperature, humidity, and environmental conditions 24/7</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">🤖</div>
          <h3>AI Predictions</h3>
          <p>LSTM-based predictions for accurate shelf-life estimation</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">🚨</div>
          <h3>Smart Alerts</h3>
          <p>Intelligent alert system for critical conditions</p>
        </div>
      </div>

      {/* Role Info */}
      <div className="roles-section">
        <h2>User Roles & Access</h2>
        <div className="roles-grid">
          <div className="role-card admin">
            <h4>👑 Admin</h4>
            <ul>
              <li>Manage all warehouses</li>
              <li>User management</li>
              <li>System monitoring</li>
              <li>Alert management</li>
            </ul>
            <p className="role-credentials">
              <strong>Demo:</strong> admin@test.com / Admin@123
            </p>
          </div>
          <div className="role-card manager">
            <h4>📦 Manager</h4>
            <ul>
              <li>Warehouse operations</li>
              <li>Batch monitoring</li>
              <li>Sensor management</li>
              <li>Alert handling</li>
            </ul>
          </div>
          <div className="role-card sales">
            <h4>💰 Sales</h4>
            <ul>
              <li>Sellability analysis</li>
              <li>Price recommendations</li>
              <li>Batch prioritization</li>
              <li>Revenue optimization</li>
            </ul>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="home-actions">
        <Link to="/login">
          <button className="primary">Login</button>
        </Link>
        <Link to="/register">
          <button className="secondary">Request Access</button>
        </Link>
      </div>

      {/* Footer */}
      <footer className="home-footer">
        <p>Use demo credentials above to test as Admin • Built with React + FastAPI</p>
      </footer>
    </div>
  );
}
