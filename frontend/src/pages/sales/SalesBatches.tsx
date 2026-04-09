import { useState, useEffect } from "react";
import { dashboardAPI } from "../../api/api";
import "../../styles/sales-dashboard.css";

interface Batch {
  batch_id: string;
  fruit: string;
  quantity_kg: number;
  remaining_shelf_life_days: number;
  sales_category: string;
  warehouse_id: string;
}

interface SalesFilters {
  category: string;
  fruit: string;
  sortBy: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  SELL_NOW: "#10b981",
  SELL_SOON: "#f59e0b",
  DO_NOT_SELL: "#ef4444"
};

export default function SalesBatches() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [filteredBatches, setFilteredBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [filters, setFilters] = useState<SalesFilters>({
    category: "ALL",
    fruit: "ALL",
    sortBy: "priority"
  });

  useEffect(() => {
    fetchBatches();
  }, []);

  useEffect(() => {
    const applyFiltersAndSort = () => {
      let filtered = [...batches];

      // Apply category filter
      if (filters.category !== "ALL") {
        filtered = filtered.filter(b => b.sales_category === filters.category);
      }

      // Apply fruit filter
      if (filters.fruit !== "ALL") {
        filtered = filtered.filter(b => b.fruit === filters.fruit);
      }

      // Apply sorting
      switch (filters.sortBy) {
        case "priority":
          // Priority: expiring soon > low quantity > fruit type
          filtered.sort((a, b) => {
            const categoryOrder: Record<string, number> = {
              SELL_NOW: 0,
              SELL_SOON: 1,
              DO_NOT_SELL: 2
            };
            const catDiff = categoryOrder[a.sales_category] - categoryOrder[b.sales_category];
            if (catDiff !== 0) return catDiff;
            
            return a.remaining_shelf_life_days - b.remaining_shelf_life_days;
          });
          break;
        case "shelf-life-asc":
          filtered.sort((a, b) => a.remaining_shelf_life_days - b.remaining_shelf_life_days);
          break;
        case "shelf-life-desc":
          filtered.sort((a, b) => b.remaining_shelf_life_days - a.remaining_shelf_life_days);
          break;
        case "quantity-asc":
          filtered.sort((a, b) => a.quantity_kg - b.quantity_kg);
          break;
        case "quantity-desc":
          filtered.sort((a, b) => b.quantity_kg - a.quantity_kg);
          break;
        case "fruit":
          filtered.sort((a, b) => a.fruit.localeCompare(b.fruit));
          break;
        default:
          break;
      }

      setFilteredBatches(filtered);
    };
    
    applyFiltersAndSort();
  }, [batches, filters]);

  const fetchBatches = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token") || "";

      const response = await dashboardAPI.salesBatches(token);
      setBatches(response.data || []);
      setError("");
    } catch (err) {
      const error = err as { response?: { data?: { detail: string } }};
      setError(error.response?.data?.detail || "Failed to load batches");
      console.error("Error fetching batches:", err);
    } finally {
      setLoading(false);
    }
  };

  // Removed: applyFiltersAndSort function moved into useEffect above

  const uniqueFruits = Array.from(new Set(batches.map(b => b.fruit)));
  
  const categoryCounts = {
    SELL_NOW: batches.filter(b => b.sales_category === "SELL_NOW").length,
    SELL_SOON: batches.filter(b => b.sales_category === "SELL_SOON").length,
    DO_NOT_SELL: batches.filter(b => b.sales_category === "DO_NOT_SELL").length
  };

  const totalQuantity = filteredBatches.reduce((sum, b) => sum + b.quantity_kg, 0);

  if (loading) {
    return <div className="sales-loading">Loading Inventory...</div>;
  }

  return (
    <div className="sales-batches-page">
      <div className="page-header">
        <div>
          <h1>Sales Inventory</h1>
          <p className="subtitle">Manage inventory and optimize sales</p>
        </div>
        <button className="refresh-btn" onClick={fetchBatches}>
          ⟳ Refresh
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {/* Category Summary */}
      <div className="category-summary">
        <div className="category-card sell-now">
          <div className="category-icon">✅</div>
          <div className="category-content">
            <h3>Ready to Sell</h3>
            <div className="count">{categoryCounts.SELL_NOW}</div>
            <p className="description">High quality batches</p>
          </div>
        </div>

        <div className="category-card sell-soon">
          <div className="category-icon">⏰</div>
          <div className="category-content">
            <h3>Sell Soon</h3>
            <div className="count">{categoryCounts.SELL_SOON}</div>
            <p className="description">Requires promotion (2-5 days)</p>
          </div>
        </div>

        <div className="category-card do-not-sell">
          <div className="category-icon">❌</div>
          <div className="category-content">
            <h3>Do Not Sell</h3>
            <div className="count">{categoryCounts.DO_NOT_SELL}</div>
            <p className="description">Near expiration (≤2 days)</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="filter-group">
          <label>Category:</label>
          <select
            value={filters.category}
            onChange={(e) => setFilters({ ...filters, category: e.target.value })}
          >
            <option value="ALL">All Categories</option>
            <option value="SELL_NOW">Ready to Sell</option>
            <option value="SELL_SOON">Sell Soon</option>
            <option value="DO_NOT_SELL">Do Not Sell</option>
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
            <option value="priority">Priority (Expiring First)</option>
            <option value="shelf-life-asc">Shelf Life (Ascending)</option>
            <option value="shelf-life-desc">Shelf Life (Descending)</option>
            <option value="quantity-asc">Quantity (Low First)</option>
            <option value="quantity-desc">Quantity (High First)</option>
            <option value="fruit">Fruit Type (A-Z)</option>
          </select>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="inventory-table-container">
        <div className="table-header">
          <h3>Inventory Listing ({filteredBatches.length} items)</h3>
          <div className="table-summary">
            <span className="summary-item">
              <strong>Total Quantity:</strong> {totalQuantity.toFixed(0)} kg
            </span>
            <span className="summary-item">
              <strong>Avg Shelf Life:</strong>
              {batches.length > 0
                ? (filteredBatches.reduce((sum, b) => sum + b.remaining_shelf_life_days, 0) / filteredBatches.length).toFixed(1)
                : "0"}{" "}
              days
            </span>
          </div>
        </div>

        <table className="inventory-table">
          <thead>
            <tr>
              <th>Batch ID</th>
              <th>Fruit Type</th>
              <th>Quantity (kg)</th>
              <th>Shelf Life (days)</th>
              <th>Category</th>
              <th>Price Tier</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredBatches.length === 0 ? (
              <tr className="empty-row">
                <td colSpan={7}>No items match the selected filters</td>
              </tr>
            ) : (
              filteredBatches.map(batch => {
                const urgency = batch.remaining_shelf_life_days <= 5 ? "urgent" : "";
                return (
                  <tr
                    key={batch.batch_id}
                    className={`category-${batch.sales_category?.toLowerCase()} ${urgency}`}
                    style={{
                      borderLeftColor: CATEGORY_COLORS[batch.sales_category]
                    }}
                  >
                    <td className="batch-id">
                      <strong>{batch.batch_id}</strong>
                    </td>
                    <td className="fruit">{batch.fruit}</td>
                    <td className="quantity">{batch.quantity_kg.toFixed(1)}</td>
                    <td className="shelf-life">
                      <span className={`shelf-life-value ${urgency ? 'urgent' : ''}`}>
                        {batch.remaining_shelf_life_days.toFixed(1)}d
                      </span>
                    </td>
                    <td>
                      <span className={`category-badge ${batch.sales_category?.toLowerCase()}`}>
                        {batch.sales_category === "SELL_NOW" && "✅ Sell Now"}
                        {batch.sales_category === "SELL_SOON" && "⏰ Sell Soon"}
                        {batch.sales_category === "DO_NOT_SELL" && "❌ Do Not Sell"}
                      </span>
                    </td>
                    <td className="price-tier">
                      {batch.sales_category === "SELL_NOW" && (
                        <span className="tier standard">Standard</span>
                      )}
                      {batch.sales_category === "SELL_SOON" && (
                        <span className="tier promotional">Promotional -15%</span>
                      )}
                      {batch.sales_category === "DO_NOT_SELL" && (
                        <span className="tier clearance">Clearance -40%</span>
                      )}
                    </td>
                    <td className="actions">
                      <button
                        className={`action-btn ${batch.sales_category?.toLowerCase()}`}
                        title="View Details"
                      >
                        📋
                      </button>
                      <button
                        className="action-btn info-btn"
                        title="See History"
                      >
                        📊
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="page-footer">
        <p>
          Showing {filteredBatches.length} of {batches.length} items
          {filters.category !== "ALL" && ` (${filters.category})`}
          {filters.fruit !== "ALL" && ` from ${filters.fruit}`}
        </p>
      </div>
    </div>
  );
}
