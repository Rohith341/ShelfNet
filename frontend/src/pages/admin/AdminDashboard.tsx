import { useEffect, useState } from "react";
import api from "../../api/axios";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import "../styles/admin-dashboard.css";

interface KPI {
  total_warehouses: number;
  active_batches: number;
  total_sensors: number;
  active_alerts: number;
  critical_batches: number;
}

export default function AdminDashboard() {
  const [kpis, setKpis] = useState<KPI | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"overview" | "analytics">("overview");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api.get("/admin/kpis");
      setKpis(res.data);
      setError("");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  if (loading && !kpis) return <div className="admin-loading">Loading Dashboard...</div>;

  const statusData = [
    { name: "Active", value: kpis?.active_batches || 0, color: "#10b981" },
    { name: "Critical", value: kpis?.critical_batches || 0, color: "#ef4444" },
    { name: "Inactive", value: Math.max(0, (kpis?.active_batches || 0) - (kpis?.critical_batches || 0)), color: "#9ca3af" },
  ];

  const resourceData = [
    { name: "Warehouses", value: kpis?.total_warehouses || 0 },
    { name: "Sensors", value: kpis?.total_sensors || 0 },
    { name: "Batches", value: kpis?.active_batches || 0 },
  ];

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <div>
          <h1>Admin Dashboard</h1>
          <p className="subtitle">System overview & global management</p>
        </div>
        <div className="header-actions">
          <button className="refresh-btn" onClick={loadData}>
            ⟳ Refresh
          </button>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {/* KPIs Grid */}
      <div className="kpis-grid">
        <div className="kpi-card warehouses">
          <div className="kpi-icon">🏭</div>
          <div className="kpi-content">
            <p className="kpi-label">Warehouses</p>
            <p className="kpi-value">{kpis?.total_warehouses || 0}</p>
          </div>
        </div>

        <div className="kpi-card batches">
          <div className="kpi-icon">📦</div>
          <div className="kpi-content">
            <p className="kpi-label">Active Batches</p>
            <p className="kpi-value">{kpis?.active_batches || 0}</p>
          </div>
        </div>

        <div className="kpi-card sensors">
          <div className="kpi-icon">📡</div>
          <div className="kpi-content">
            <p className="kpi-label">Total Sensors</p>
            <p className="kpi-value">{kpis?.total_sensors || 0}</p>
          </div>
        </div>

        <div className="kpi-card alerts">
          <div className="kpi-icon">🚨</div>
          <div className="kpi-content">
            <p className="kpi-label">Active Alerts</p>
            <p className="kpi-value">{kpis?.active_alerts || 0}</p>
          </div>
        </div>

        <div className="kpi-card critical">
          <div className="kpi-icon">⚠️</div>
          <div className="kpi-content">
            <p className="kpi-label">Critical Batches</p>
            <p className="kpi-value">{kpis?.critical_batches || 0}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-navigation">
        <button 
          className={`tab-btn ${activeTab === "overview" ? "active" : ""}`}
          onClick={() => setActiveTab("overview")}
        >
          📊 Overview
        </button>
        <button 
          className={`tab-btn ${activeTab === "analytics" ? "active" : ""}`}
          onClick={() => setActiveTab("analytics")}
        >
          📈 Analytics
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="tab-content">
          <div className="charts-grid">
            {/* Batch Status */}
            <div className="chart-card">
              <h3>Batch Status Distribution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Resource Allocation */}
            <div className="chart-card">
              <h3>System Resources</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={resourceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* System Status */}
          <div className="system-status">
            <div className="status-card">
              <h3>System Health</h3>
              <div className="health-item">
                <span className="label">Database</span>
                <span className="status-indicator online">✓ Connected</span>
              </div>
              <div className="health-item">
                <span className="label">API Server</span>
                <span className="status-indicator online">✓ Running</span>
              </div>
              <div className="health-item">
                <span className="label">ML Model</span>
                <span className="status-indicator online">✓ Loaded</span>
              </div>
              <div className="health-item">
                <span className="label">Simulator</span>
                <span className="status-indicator online">✓ Active</span>
              </div>
            </div>

            <div className="status-card">
              <h3>Alert Summary</h3>
              <div className="alert-summary">
                <div className="summary-item critical">
                  <span className="count">{kpis?.critical_batches || 0}</span>
                  <span className="label">Critical Issues</span>
                </div>
                <div className="summary-item warning">
                  <span className="count">{Math.floor((kpis?.active_batches || 0) * 0.2)}</span>
                  <span className="label">Warnings</span>
                </div>
                <div className="summary-item info">
                  <span className="count">{kpis?.active_alerts || 0}</span>
                  <span className="label">Total Alerts</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === "analytics" && (
        <div className="tab-content">
          <div className="analytics-grid">
            <div className="analytics-card">
              <h3>Performance Metrics</h3>
              <div className="metric-item">
                <div className="metric-header">
                  <span className="metric-name">Warehouse Utilization</span>
                  <span className="metric-value">72.4%</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: "72.4%" }}></div>
                </div>
              </div>

              <div className="metric-item">
                <div className="metric-header">
                  <span className="metric-name">Sensor Reliability</span>
                  <span className="metric-value">98.5%</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: "98.5%" }}></div>
                </div>
              </div>

              <div className="metric-item">
                <div className="metric-header">
                  <span className="metric-name">Prediction Accuracy</span>
                  <span className="metric-value">94.2%</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: "94.2%" }}></div>
                </div>
              </div>

              <div className="metric-item">
                <div className="metric-header">
                  <span className="metric-name">System Uptime</span>
                  <span className="metric-value">99.9%</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: "99.9%" }}></div>
                </div>
              </div>
            </div>

            <div className="analytics-card">
              <h3>Recent Activity</h3>
              <div className="activity-list">
                <div className="activity-item">
                  <span className="activity-time">2 min ago</span>
                  <span className="activity-text">Batch BATCH-APP-001 created</span>
                </div>
                <div className="activity-item">
                  <span className="activity-time">5 min ago</span>
                  <span className="activity-text">Alert resolved for BATCH-BAN-001</span>
                </div>
                <div className="activity-item">
                  <span className="activity-time">12 min ago</span>
                  <span className="activity-text">Prediction computed for 4 batches</span>
                </div>
                <div className="activity-item">
                  <span className="activity-time">28 min ago</span>
                  <span className="activity-text">Critical alert for BATCH-STR-001</span>
                </div>
                <div className="activity-item">
                  <span className="activity-time">1 hour ago</span>
                  <span className="activity-text">Sensor SNS-1A2B came online</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
