import { useEffect, useState } from "react";
import api from "../../api/axios";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import "../styles/admin-alerts.css";

interface Alert {
  alert_id: string;
  batch_id: string;
  warehouse_id: string;
  alert_type: string;
  message: string;
  occurrences: number;
  created_at: string;
  last_seen_at: string;
  resolved: boolean;
}

export default function AdminAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ACTIVE");
  const [searchBatch, setSearchBatch] = useState("");

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    try {
      setLoading(true);
      const res = await api.get("/alerts");
      setAlerts(res.data);
      setError("");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to load alerts");
    } finally {
      setLoading(false);
    }
  };

  const filteredAlerts = alerts.filter((a) => {
    if (typeFilter !== "ALL" && a.alert_type !== typeFilter) return false;
    if (statusFilter === "ACTIVE" && a.resolved) return false;
    if (statusFilter === "RESOLVED" && !a.resolved) return false;
    if (searchBatch && !a.batch_id.includes(searchBatch)) return false;
    return true;
  });

  const alertStats = {
    CRITICAL: alerts.filter(a => a.alert_type === "CRITICAL" && !a.resolved).length,
    WARNING: alerts.filter(a => a.alert_type === "WARNING" && !a.resolved).length,
    INFO: alerts.filter(a => a.alert_type === "INFO" && !a.resolved).length,
    total: alerts.length,
    active: alerts.filter(a => !a.resolved).length,
    resolved: alerts.filter(a => a.resolved).length,
  };

  const alertTypeData = [
    { name: "Critical", value: alertStats.CRITICAL, color: "#ef4444" },
    { name: "Warning", value: alertStats.WARNING, color: "#f59e0b" },
    { name: "Info", value: alertStats.INFO, color: "#3b82f6" },
  ];

  const alertStatusData = [
    { name: "Active", value: alertStats.active },
    { name: "Resolved", value: alertStats.resolved },
  ];

  if (loading && alerts.length === 0) {
    return <div className="loading">Loading alerts...</div>;
  }

  const handleResolveAlert = async (alertId: string) => {
    try {
      await api.post(`/alerts/resolve/${alertId}`, {});
      loadAlerts();
    } catch (err) {
      console.error("Failed to resolve alert", err);
    }
  };

  const getAlertIcon = (type: string) => {
    switch(type) {
      case "CRITICAL": return "🚨";
      case "WARNING": return "⚠️";
      default: return "ℹ️";
    }
  };

  return (
    <div className="admin-page">
      <div className="page-header">
        <div>
          <h1>Alert Management</h1>
          <p className="subtitle">Real-time monitoring across all warehouses</p>
        </div>
        <button className="btn-primary" onClick={loadAlerts}>
          ⟳ Refresh
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card critical">
          <p className="stat-label">Critical</p>
          <p className="stat-value">{alertStats.CRITICAL}</p>
        </div>
        <div className="stat-card warning">
          <p className="stat-label">Warnings</p>
          <p className="stat-value">{alertStats.WARNING}</p>
        </div>
        <div className="stat-card info">
          <p className="stat-label">Info</p>
          <p className="stat-value">{alertStats.INFO}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Active Alerts</p>
          <p className="stat-value">{alertStats.active}</p>
        </div>
      </div>

      {/* Charts */}
      <div className="charts-grid">
        <div className="chart-card">
          <h3>Alert Types Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={alertTypeData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={80}
                dataKey="value"
              >
                {alertTypeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3>Alert Status</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={alertStatusData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="ALL">All Types</option>
          <option value="CRITICAL">Critical</option>
          <option value="WARNING">Warning</option>
          <option value="INFO">Info</option>
        </select>

        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="ACTIVE">Active Only</option>
          <option value="RESOLVED">Resolved Only</option>
          <option value="ALL">All Status</option>
        </select>

        <input 
          type="text"
          placeholder="Search batch ID..."
          value={searchBatch}
          onChange={(e) => setSearchBatch(e.target.value)}
        />
      </div>

      {/* Alerts List */}
      <div className="alerts-container">
        {filteredAlerts.length === 0 ? (
          <div className="no-alerts">
            <p>✓ No alerts found</p>
          </div>
        ) : (
          <div className="alerts-list">
            {filteredAlerts.map(alert => (
              <div key={alert.alert_id} className={`alert-card alert-${alert.alert_type?.toLowerCase()}`}>
                <div className="alert-card-header">
                  <div className="alert-info">
                    <span className="alert-icon">{getAlertIcon(alert.alert_type)}</span>
                    <div className="alert-details">
                      <h4>{alert.alert_type}</h4>
                      <p className="batch-id">{alert.batch_id}</p>
                    </div>
                  </div>
                  <div className="alert-meta">
                    <span className="warehouse-tag">{alert.warehouse_id}</span>
                    <span className={`status-badge ${alert.resolved ? 'resolved' : 'active'}`}>
                      {alert.resolved ? "Resolved" : "Active"}
                    </span>
                  </div>
                </div>

                <p className="alert-message">{alert.message}</p>

                <div className="alert-footer">
                  <div className="alert-stats">
                    <span>Occurrences: <strong>{alert.occurrences}</strong></span>
                    <span>Last Seen: <strong>{new Date(alert.last_seen_at).toLocaleString()}</strong></span>
                  </div>
                  {!alert.resolved && (
                    <button 
                      className="btn-resolve"
                      onClick={() => handleResolveAlert(alert.alert_id)}
                    >
                      Resolve
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="alerts-summary">
        <p>Showing {filteredAlerts.length} of {alerts.length} alerts</p>
      </div>
    </div>
  );
}
