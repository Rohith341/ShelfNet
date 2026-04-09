import { useState, useEffect } from "react";
import { alertAPI } from "../../api/api";
import "../../styles/manager-dashboard.css";

interface Alert {
  alert_id: string;
  batch_id: string;
  alert_type: string;
  message: string;
  created_at: string;
  resolved: boolean;
  warehouse_id: string;
}

interface AlertFilters {
  type: string;
  status: string;
  sortBy: string;
}

export default function ManagerAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [filteredAlerts, setFilteredAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [warehouseId, setWarehouseId] = useState("");

  const [filters, setFilters] = useState<AlertFilters>({
    type: "ALL",
    status: "ACTIVE",
    sortBy: "newest"
  });

  const user = localStorage.getItem("user")
    ? JSON.parse(localStorage.getItem("user") || "{}")
    : {};

  useEffect(() => {
    if (user?.warehouse_id) {
      setWarehouseId(user.warehouse_id);
      fetchAlerts(user.warehouse_id);
    }
  }, [user?.warehouse_id]);

  useEffect(() => {
    const applyFiltersAndSort = () => {
      let filtered = [...alerts];

      // Apply type filter
      if (filters.type !== "ALL") {
        filtered = filtered.filter(a => a.alert_type === filters.type);
      }

      // Apply status filter
      if (filters.status === "ACTIVE") {
        filtered = filtered.filter(a => !a.resolved);
      } else if (filters.status === "RESOLVED") {
        filtered = filtered.filter(a => a.resolved);
      }

      // Apply sorting
      switch (filters.sortBy) {
        case "newest":
          filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          break;
        case "oldest":
          filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
          break;
        case "critical-first":
          filtered.sort((a, b) => {
            const priority: Record<string, number> = { CRITICAL: 0, WARNING: 1, INFO: 2 };
            return (priority[a.alert_type] || 3) - (priority[b.alert_type] || 3);
          });
          break;
        default:
          break;
      }

      setFilteredAlerts(filtered);
    };
    
    applyFiltersAndSort();
  }, [alerts, filters]);

  const fetchAlerts = async (whId: string) => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token") || "";

      const response = await alertAPI.getByWarehouse(whId, token);
      setAlerts(response.data || []);
      setError("");
    } catch (err) {
      const error = err as { response?: { data?: { detail: string } }};
      setError(error.response?.data?.detail || "Failed to load alerts");
      console.error("Error fetching alerts:", err);
    } finally {
      setLoading(false);
    }
  };

  // Removed: applyFiltersAndSort function moved into useEffect above

  const handleResolveAlert = async (alertId: string) => {
    try {
      const token = localStorage.getItem("token") || "";
      await alertAPI.resolve(alertId, token);
      
      setAlerts(alerts.map(a =>
        a.alert_id === alertId ? { ...a, resolved: true } : a
      ));
    } catch (err) {
      console.error("Failed to resolve alert:", err);
    }
  };

  const alertTypeCounts = {
    CRITICAL: alerts.filter(a => a.alert_type === "CRITICAL" && !a.resolved).length,
    WARNING: alerts.filter(a => a.alert_type === "WARNING" && !a.resolved).length,
    INFO: alerts.filter(a => a.alert_type === "INFO" && !a.resolved).length
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case "CRITICAL":
        return "🚨";
      case "WARNING":
        return "⚠️";
      case "INFO":
        return "ℹ️";
      default:
        return "📌";
    }
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case "CRITICAL":
        return "critical";
      case "WARNING":
        return "warning";
      case "INFO":
        return "info";
      default:
        return "default";
    }
  };

  if (loading) {
    return <div className="manager-loading">Loading Alerts...</div>;
  }

  return (
    <div className="manager-alerts-page">
      <div className="page-header">
        <div>
          <h1>Alert Management</h1>
          <p className="subtitle">Monitor and manage warehouse alerts</p>
        </div>
        <button className="refresh-btn" onClick={() => fetchAlerts(warehouseId)}>
          ⟳ Refresh
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {/* Alert Counts */}
      <div className="alert-counts">
        <div className="count-item critical">
          <span className="icon">🚨</span>
          <div className="count-content">
            <span className="label">Critical</span>
            <span className="value">{alertTypeCounts.CRITICAL}</span>
          </div>
        </div>
        <div className="count-item warning">
          <span className="icon">⚠️</span>
          <div className="count-content">
            <span className="label">Warning</span>
            <span className="value">{alertTypeCounts.WARNING}</span>
          </div>
        </div>
        <div className="count-item info">
          <span className="icon">ℹ️</span>
          <div className="count-content">
            <span className="label">Info</span>
            <span className="value">{alertTypeCounts.INFO}</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="filter-group">
          <label>Type:</label>
          <select
            value={filters.type}
            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
          >
            <option value="ALL">All Types</option>
            <option value="CRITICAL">Critical</option>
            <option value="WARNING">Warning</option>
            <option value="INFO">Info</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Status:</label>
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          >
            <option value="ACTIVE">Active</option>
            <option value="RESOLVED">Resolved</option>
            <option value="ALL">All</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Sort By:</label>
          <select
            value={filters.sortBy}
            onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="critical-first">Critical First</option>
          </select>
        </div>
      </div>

      {/* Alerts List */}
      <div className="alerts-list">
        {filteredAlerts.length === 0 ? (
          <div className="no-alerts">
            <p>✓ No alerts to display</p>
          </div>
        ) : (
          filteredAlerts.map(alert => (
            <div
              key={alert.alert_id}
              className={`alert-item alert-${getAlertColor(alert.alert_type)} ${alert.resolved ? 'resolved' : ''}`}
            >
              <div className="alert-header">
                <div className="alert-icon">{getAlertIcon(alert.alert_type)}</div>
                <div className="alert-main">
                  <div className="alert-title">
                    <h3>{alert.alert_type}</h3>
                    <span className="batch-ref">Batch: {alert.batch_id}</span>
                  </div>
                  <p className="alert-message">{alert.message}</p>
                  <div className="alert-meta">
                    <span className="timestamp">
                      {new Date(alert.created_at).toLocaleString()}
                    </span>
                    {alert.resolved && <span className="resolved-badge">✓ Resolved</span>}
                  </div>
                </div>
              </div>

              {!alert.resolved && (
                <button
                  className="resolve-btn"
                  onClick={() => handleResolveAlert(alert.alert_id)}
                >
                  Resolve
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Summary */}
      <div className="page-footer">
        <p>
          Showing {filteredAlerts.length} of {alerts.length} alerts
          {filters.type !== "ALL" && ` (${filters.type})`}
          {filters.status !== "ALL" && ` - ${filters.status}`}
        </p>
      </div>
    </div>
  );
}
