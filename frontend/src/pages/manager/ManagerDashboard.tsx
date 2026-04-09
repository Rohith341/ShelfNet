import { useState, useEffect } from "react";
import { dashboardAPI, alertAPI } from "../../api/api";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import "../../styles/manager-dashboard.css";

interface KPI {
  active_batches: number;
  critical_alerts: number;
  expiring_batches: number;
  sensors_online: number;
  sensors_total: number;
}

interface Batch {
  batch_id: string;
  fruit: string;
  quantity: number;
  predicted_remaining_shelf_life_days: number;
  active_alerts: number;
  risk_level: string;
  arrival_date: string;
}

interface Alert {
  alert_id: string;
  batch_id: string;
  alert_type: string;
  message: string;
  created_at: string;
}

export default function ManagerDashboard() {
  const [kpis, setKpis] = useState<KPI | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [activeTab, setActiveTab] = useState<"overview" | "batches" | "alerts">("overview");
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds

  const user = localStorage.getItem("user") 
    ? JSON.parse(localStorage.getItem("user") || "{}") 
    : {};

  useEffect(() => {
    if (user?.warehouse_id) {
      setWarehouseId(user.warehouse_id);
      fetchData(user.warehouse_id);
    }
  }, [user?.warehouse_id]);

  useEffect(() => {
    if (!warehouseId) return;

    const interval = setInterval(() => {
      fetchData(warehouseId);
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [warehouseId, refreshInterval]);

  const fetchData = async (whId: string) => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token") || "";

      // Fetch KPIs
      const kpiRes = await dashboardAPI.managerKPIs(whId, token);
      setKpis(kpiRes.data);

      // Fetch alerts for this warehouse
      const alertRes = await alertAPI.getByWarehouse(whId, token);
      setAlerts(alertRes.data.slice(0, 10)); // Get latest 10 alerts

      // Fetch batches for this warehouse
      const batchRes = await fetch(
        `http://localhost:8000/manager/${whId}/batches`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const batchData = await batchRes.json();
      setBatches(batchData);

      setError("");
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || "Failed to load dashboard");
      console.error("Dashboard error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !kpis) {
    return <div className="manager-loading">Loading Dashboard...</div>;
  }

  const riskLevelData = [
    { name: "Critical", value: batches.filter(b => b.risk_level === "CRITICAL").length, color: "#ef4444" },
    { name: "Warning", value: batches.filter(b => b.risk_level === "WARNING").length, color: "#f59e0b" },
    { name: "Safe", value: batches.filter(b => b.risk_level === "SAFE").length, color: "#10b981" },
  ];

  const shelfLifeData = batches
    .sort((a, b) => a.predicted_remaining_shelf_life_days - b.predicted_remaining_shelf_life_days)
    .map(b => ({
      name: b.batch_id,
      days: b.predicted_remaining_shelf_life_days,
      fruit: b.fruit
    }));

  return (
    <div className="manager-dashboard">
      <div className="manager-header">
        <div>
          <h1>Warehouse Dashboard</h1>
          <p className="subtitle">Manage batches, monitor sensors & alerts</p>
        </div>
        <div className="header-actions">
          <button 
            className="refresh-btn"
            onClick={() => fetchData(warehouseId)}
          >
            ⟳ Refresh
          </button>
          <select 
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(Number(e.target.value))}
            className="refresh-select"
          >
            <option value={10000}>Every 10s</option>
            <option value={30000}>Every 30s</option>
            <option value={60000}>Every 1m</option>
            <option value={0}>Manual</option>
          </select>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {/* KPIs Section */}
      <div className="kpis-grid">
        <div className="kpi-card active-batches">
          <div className="kpi-icon">📦</div>
          <div className="kpi-content">
            <p className="kpi-label">Active Batches</p>
            <p className="kpi-value">{kpis?.active_batches || 0}</p>
          </div>
        </div>

        <div className="kpi-card expiring-batches">
          <div className="kpi-icon">⏰</div>
          <div className="kpi-content">
            <p className="kpi-label">Expiring Soon</p>
            <p className="kpi-value">{kpis?.expiring_batches || 0}</p>
          </div>
        </div>

        <div className="kpi-card critical-alerts">
          <div className="kpi-icon">🚨</div>
          <div className="kpi-content">
            <p className="kpi-label">Critical Alerts</p>
            <p className="kpi-value">{kpis?.critical_alerts || 0}</p>
          </div>
        </div>

        <div className="kpi-card sensors-status">
          <div className="kpi-icon">📡</div>
          <div className="kpi-content">
            <p className="kpi-label">Sensors Online</p>
            <p className="kpi-value">
              {kpis?.sensors_online || 0}/{kpis?.sensors_total || 0}
            </p>
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
          className={`tab-btn ${activeTab === "batches" ? "active" : ""}`}
          onClick={() => setActiveTab("batches")}
        >
          📦 Batches
        </button>
        <button 
          className={`tab-btn ${activeTab === "alerts" ? "active" : ""}`}
          onClick={() => setActiveTab("alerts")}
        >
          🚨 Alerts
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="tab-content">
          <div className="charts-grid">
            {/* Risk Level Distribution */}
            <div className="chart-card">
              <h3>Risk Level Distribution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={riskLevelData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {riskLevelData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Shelf Life by Batch */}
            <div className="chart-card">
              <h3>Remaining Shelf Life</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={shelfLifeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="days" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="quick-stats">
            <div className="stat-box">
              <h4>Sensor Status</h4>
              <div className="stat-content">
                <div className="stat-item online">
                  <span className="dot"></span>
                  <span>{kpis?.sensors_online} Online</span>
                </div>
                <div className="stat-item offline">
                  <span className="dot"></span>
                  <span>{(kpis?.sensors_total || 0) - (kpis?.sensors_online || 0)} Offline</span>
                </div>
              </div>
            </div>

            <div className="stat-box">
              <h4>Batch Status</h4>
              <div className="stat-content">
                <div className="stat-item">
                  <span className="badge safe">✓</span>
                  <span>{batchesCount("SAFE")} Safe</span>
                </div>
                <div className="stat-item">
                  <span className="badge warning">⚠</span>
                  <span>{batchesCount("WARNING")} Warning</span>
                </div>
                <div className="stat-item">
                  <span className="badge critical">✕</span>
                  <span>{batchesCount("CRITICAL")} Critical</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Batches Tab */}
      {activeTab === "batches" && (
        <div className="tab-content">
          <div className="batches-table-container">
            <table className="batches-table">
              <thead>
                <tr>
                  <th>Batch ID</th>
                  <th>Fruit</th>
                  <th>Qty (kg)</th>
                  <th>Shelf Life (days)</th>
                  <th>Status</th>
                  <th>Alerts</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {batches.length === 0 ? (
                  <tr className="empty-row">
                    <td colSpan={7}>No active batches</td>
                  </tr>
                ) : (
                  batches.map(batch => (
                    <tr key={batch.batch_id} className={`risk-${batch.risk_level?.toLowerCase()}`}>
                      <td className="batch-id">{batch.batch_id}</td>
                      <td>{batch.fruit}</td>
                      <td>{batch.quantity}</td>
                      <td className="shelf-life">
                        {batch.predicted_remaining_shelf_life_days?.toFixed(1) || "-"}
                      </td>
                      <td>
                        <span className={`badge-${batch.risk_level?.toLowerCase()}`}>
                          {batch.risk_level}
                        </span>
                      </td>
                      <td>
                        <span className={`alert-count ${batch.active_alerts > 0 ? 'has-alerts' : ''}`}>
                          {batch.active_alerts}
                        </span>
                      </td>
                      <td>
                        <button className="action-btn">View</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Alerts Tab */}
      {activeTab === "alerts" && (
        <div className="tab-content">
          <div className="alerts-container">
            {alerts.length === 0 ? (
              <div className="no-alerts">
                <p>✓ No active alerts</p>
              </div>
            ) : (
              alerts.map(alert => (
                <div key={alert.alert_id} className={`alert-item alert-${alert.alert_type?.toLowerCase()}`}>
                  <div className="alert-icon">
                    {alert.alert_type === "CRITICAL" && "🚨"}
                    {alert.alert_type === "WARNING" && "⚠️"}
                    {alert.alert_type === "INFO" && "ℹ️"}
                  </div>
                  <div className="alert-content">
                    <div className="alert-header">
                      <h4>{alert.alert_type} - {alert.batch_id}</h4>
                      <span className="alert-time">{new Date(alert.created_at).toLocaleString()}</span>
                    </div>
                    <p className="alert-message">{alert.message}</p>
                  </div>
                  <button className="dismiss-btn">Dismiss</button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );

  function batchesCount(riskLevel: string) {
    return batches.filter(b => b.risk_level === riskLevel).length;
  }
}
