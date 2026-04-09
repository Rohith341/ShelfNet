import { useState, useEffect } from "react";
import AddBatchModal from "./AddBatchModal";
import "../../styles/manager-dashboard.css";

interface Batch {
  batch_id: string;
  fruit: string;
  quantity_kg: number;
  predicted_remaining_shelf_life_days?: number;
  active_alerts?: number;
  risk_level?: string;
  arrival_date: string;
  warehouse_id: string;
  status: string;
  quantity?: number; // For backward compatibility
}

interface BatchFilters {
  riskLevel: string;
  fruit: string;
  sortBy: string;
}

export default function ManagerBatches() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [filteredBatches, setFilteredBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [showAddBatchModal, setShowAddBatchModal] = useState(false);
  
  const [filters, setFilters] = useState<BatchFilters>({
    riskLevel: "ALL",
    fruit: "ALL",
    sortBy: "shelf-life-asc"
  });

  const user = localStorage.getItem("user")
    ? JSON.parse(localStorage.getItem("user") || "{}")
    : {};

  useEffect(() => {
    if (user?.warehouse_id) {
      setWarehouseId(user.warehouse_id);
      fetchBatches(user.warehouse_id);
    }
  }, [user?.warehouse_id]);

  // Auto-refresh batches every 5 seconds to show live predictions
  useEffect(() => {
    if (!warehouseId) return;
    
    const interval = setInterval(() => {
      fetchBatches(warehouseId);
    }, 5000);

    return () => clearInterval(interval);
  }, [warehouseId]);

  useEffect(() => {
    const applyFiltersAndSort = () => {
      let filtered = [...batches];

      // Apply risk level filter
      if (filters.riskLevel !== "ALL") {
        filtered = filtered.filter(b => b.risk_level === filters.riskLevel);
      }

      // Apply fruit filter
      if (filters.fruit !== "ALL") {
        filtered = filtered.filter(b => b.fruit === filters.fruit);
      }

      // Apply sorting
      switch (filters.sortBy) {
        case "shelf-life-asc":
          filtered.sort((a, b) => (a.predicted_remaining_shelf_life_days || 0) - (b.predicted_remaining_shelf_life_days || 0));
          break;
        case "shelf-life-desc":
          filtered.sort((a, b) => (b.predicted_remaining_shelf_life_days || 0) - (a.predicted_remaining_shelf_life_days || 0));
          break;
        case "quantity-asc":
          filtered.sort((a, b) => (a.quantity_kg || 0) - (b.quantity_kg || 0));
          break;
        case "quantity-desc":
          filtered.sort((a, b) => (b.quantity_kg || 0) - (a.quantity_kg || 0));
          break;
        default:
          break;
      }

      setFilteredBatches(filtered);
    };
    
    applyFiltersAndSort();
  }, [batches, filters]);

  const fetchBatches = async (whId: string) => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token") || "";

      const response = await fetch(
        `http://localhost:8000/manager/${whId}/batches`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      
      if (!response.ok) throw new Error("Failed to fetch batches");
      const data = await response.json();
      setBatches(data);
      setError("");
    } catch (err) {
      const error = err as Error;
      setError(error.message || "Failed to load batches");
      console.error("Error fetching batches:", err);
    } finally {
      setLoading(false);
    }
  };

  const refreshPrediction = async (batch_id: string) => {
    try {
      const token = localStorage.getItem("token") || "";
      
      const response = await fetch(
        `http://localhost:8000/manager/${warehouseId}/batches/${batch_id}/refresh-prediction`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      
      if (!response.ok) {
        throw new Error("Failed to refresh prediction");
      }
      
      const data = await response.json();
      
      // Update the batch in state
      setBatches(batches.map(b => 
        b.batch_id === batch_id 
          ? { ...b, ...data.batch, predicted_remaining_shelf_life_days: data.prediction }
          : b
      ));
    } catch (err) {
      console.error("Error refreshing prediction:", err);
    }
  };

  const uniqueFruits = Array.from(new Set(batches.map(b => b.fruit)));
  const riskLevels = ["CRITICAL", "WARNING", "SAFE"];

  if (loading) {
    return <div className="manager-loading">Loading Batches...</div>;
  }

  return (
    <div className="manager-batches-page">
      <div className="page-header">
        <div>
          <h1>Batch Management</h1>
          <p className="subtitle">Monitor and manage all warehouse batches</p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button className="btn-add-batch" onClick={() => setShowAddBatchModal(true)}>
            ➕ Add Batch
          </button>
          <button className="refresh-btn" onClick={() => fetchBatches(warehouseId)}>
            ⟳ Refresh
          </button>
        </div>
      </div>

      <AddBatchModal 
        isOpen={showAddBatchModal}
        warehouseId={warehouseId}
        onClose={() => setShowAddBatchModal(false)}
        onSuccess={() => {
          setShowAddBatchModal(false);
          fetchBatches(warehouseId);
        }}
      />

      {error && <div className="error-banner">{error}</div>}

      {/* Filters */}
      <div className="filters-section">
        <div className="filter-group">
          <label>Risk Level:</label>
          <select
            value={filters.riskLevel}
            onChange={(e) => setFilters({ ...filters, riskLevel: e.target.value })}
          >
            <option value="ALL">All Levels</option>
            {riskLevels.map(level => (
              <option key={level} value={level}>{level}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Fruit Type:</label>
          <select
            value={filters.fruit}
            onChange={(e) => setFilters({ ...filters, fruit: e.target.value })}
          >
            <option value="ALL">All Fruits</option>
            {uniqueFruits.map(fruit => (
              <option key={fruit} value={fruit}>{fruit}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Sort By:</label>
          <select
            value={filters.sortBy}
            onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
          >
            <option value="shelf-life-asc">Shelf Life (Soon First)</option>
            <option value="shelf-life-desc">Shelf Life (Fresh First)</option>
            <option value="quantity-asc">Quantity (Low First)</option>
            <option value="quantity-desc">Quantity (High First)</option>
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="batch-stats">
        <div className="stat-item">
          <span className="stat-label">Total Batches</span>
          <span className="stat-value">{filteredBatches.length}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Critical</span>
          <span className="stat-value critical">
            {filteredBatches.filter(b => b.risk_level === "CRITICAL").length}
          </span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Warning</span>
          <span className="stat-value warning">
            {filteredBatches.filter(b => b.risk_level === "WARNING").length}
          </span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Safe</span>
          <span className="stat-value safe">
            {filteredBatches.filter(b => b.risk_level === "SAFE").length}
          </span>
        </div>
      </div>

      {/* Batches Table */}
      <div className="batches-table-container">
        <table className="batches-table">
          <thead>
            <tr>
              <th>Batch ID</th>
              <th>Fruit Type</th>
              <th>Quantity (kg)</th>
              <th>Shelf Life (days)</th>
              <th>Status</th>
              <th>Active Alerts</th>
              <th>Arrival Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredBatches.length === 0 ? (
              <tr className="empty-row">
                <td colSpan={8}>No batches found matching the filters</td>
              </tr>
            ) : (
              filteredBatches.map(batch => (
                <tr key={batch.batch_id} className={`risk-${batch.risk_level?.toLowerCase()}`}>
                  <td className="batch-id">
                    <strong>{batch.batch_id}</strong>
                  </td>
                  <td>{batch.fruit}</td>
                  <td className="quantity">{batch.quantity_kg || batch.quantity || 0}</td>
                  <td className="shelf-life">
                    {(() => {
                      const value = batch.predicted_remaining_shelf_life_days;
                      const isUrgent = value !== undefined && value !== null && value < 3;
                      let display = "Calculating...";

                      if (value !== undefined && value !== null) {
                        display = value > 900 ? "N/A" : value.toFixed(1);
                      }

                      return (
                        <span className={`shelf-life-value ${isUrgent ? 'urgent' : ''}`}>
                          {display}
                        </span>
                      );
                    })()}
                  </td>
                  <td>
                    <span className={`badge-${batch.risk_level?.toLowerCase() || 'pending'}`}>
                      {batch.risk_level || "PENDING"}
                    </span>
                  </td>
                  <td>
                    <span className={`alert-count ${(batch.active_alerts || 0) > 0 ? 'has-alerts' : ''}`}>
                      {batch.active_alerts || 0} {(batch.active_alerts || 0) === 1 ? 'alert' : 'alerts'}
                    </span>
                  </td>
                  <td>
                    {new Date(batch.arrival_date).toLocaleDateString()}
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button 
                        className="action-btn refresh-btn" 
                        title="Refresh Prediction"
                        onClick={() => refreshPrediction(batch.batch_id)}
                      >
                        🔄
                      </button>
                      <button className="action-btn view-btn" title="View Details">
                        👁️
                      </button>
                      <button className="action-btn monitor-btn" title="Monitor">
                        📊
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="page-footer">
        <p>
          Showing {filteredBatches.length} of {batches.length} batches
          {filters.riskLevel !== "ALL" && ` (${filters.riskLevel})`}
          {filters.fruit !== "ALL" && ` in ${filters.fruit}`}
        </p>
      </div>
    </div>
  );
}
