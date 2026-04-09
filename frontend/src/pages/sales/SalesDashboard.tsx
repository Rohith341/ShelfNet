import { useState, useEffect } from "react";
import { dashboardAPI } from "../../api/api";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import "../../styles/sales-dashboard.css";

interface KPI {
  sellable_batches: number;
  sell_soon_batches: number;
  not_sellable_batches: number;
}

interface Batch {
  batch_id: string;
  fruit: string;
  quantity_kg: number;
  remaining_shelf_life_days: number;
  sales_category: string;
  warehouse_id: string;
}

export default function SalesDashboard() {
  const [kpis, setKpis] = useState<KPI | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [filteredBatches, setFilteredBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"overview" | "inventory" | "recommendations">("overview");
  const [filterCategory, setFilterCategory] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<"shelf-life" | "quantity">("shelf-life");

  const COLORS = {
    SELL_NOW: "#10b981",
    SELL_SOON: "#f59e0b",
    DO_NOT_SELL: "#ef4444"
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const applyFiltersAndSort = () => {
      let filtered = [...batches];

      // Apply category filter
      if (filterCategory !== "ALL") {
        filtered = filtered.filter(b => b.sales_category === filterCategory);
      }

      // Apply sorting
      if (sortBy === "shelf-life") {
        filtered.sort((a, b) => a.remaining_shelf_life_days - b.remaining_shelf_life_days);
      } else if (sortBy === "quantity") {
        filtered.sort((a, b) => b.quantity_kg - a.quantity_kg);
      }

      setFilteredBatches(filtered);
    };
    
    applyFiltersAndSort();
  }, [batches, filterCategory, sortBy]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token") || "";

      // Fetch KPIs
      const kpiRes = await dashboardAPI.salesKPIs(token);
      setKpis(kpiRes.data);

      // Fetch batches
      const batchRes = await dashboardAPI.salesBatches(token);
      setBatches(batchRes.data);

      setError("");
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || "Failed to load dashboard");
      console.error("Sales dashboard error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Removed: applyFiltersAndSort function moved into useEffect above

  if (loading && !kpis) {
    return <div className="sales-loading">Loading Sales Dashboard...</div>;
  }

  const chartData = [
    { name: "Sell Now", value: kpis?.sellable_batches || 0, color: COLORS.SELL_NOW },
    { name: "Sell Soon", value: kpis?.sell_soon_batches || 0, color: COLORS.SELL_SOON },
    { name: "Do Not Sell", value: kpis?.not_sellable_batches || 0, color: COLORS.DO_NOT_SELL },
  ];

  const fruitDistribution = Object.entries(
    batches.reduce((acc: Record<string, number>, batch) => {
      acc[batch.fruit] = (acc[batch.fruit] || 0) + batch.quantity_kg;
      return acc;
    }, {})
  ).map(([fruit, quantity]) => ({
    name: fruit,
    quantity: quantity
  }));

  const totalQuantity = fruitDistribution.reduce((sum, item) => sum + (item.quantity as number), 0);
  const totalRevenuePotential = (kpis?.sellable_batches || 0) * 5000; // Assume $5000 per batch

  return (
    <div className="sales-dashboard">
      <div className="sales-header">
        <div>
          <h1>Sales Dashboard</h1>
          <p className="subtitle">Optimize inventory & maximize profitability</p>
        </div>
        <div className="header-actions">
          <button className="refresh-btn" onClick={() => fetchData()}>
            ⟳ Refresh
          </button>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {/* KPIs Section */}
      <div className="kpis-grid">
        <div className="kpi-card sell-now">
          <div className="kpi-icon">✅</div>
          <div className="kpi-content">
            <p className="kpi-label">Ready to Sell</p>
            <p className="kpi-value">{kpis?.sellable_batches || 0}</p>
            <p className="kpi-detail">High quality</p>
          </div>
        </div>

        <div className="kpi-card sell-soon">
          <div className="kpi-icon">⏰</div>
          <div className="kpi-content">
            <p className="kpi-label">Sell Soon</p>
            <p className="kpi-value">{kpis?.sell_soon_batches || 0}</p>
            <p className="kpi-detail">2-5 days remaining</p>
          </div>
        </div>

        <div className="kpi-card do-not-sell">
          <div className="kpi-icon">❌</div>
          <div className="kpi-content">
            <p className="kpi-label">Do Not Sell</p>
            <p className="kpi-value">{kpis?.not_sellable_batches || 0}</p>
            <p className="kpi-detail">≤2 days</p>
          </div>
        </div>

        <div className="kpi-card revenue">
          <div className="kpi-icon">💰</div>
          <div className="kpi-content">
            <p className="kpi-label">Revenue Potential</p>
            <p className="kpi-value">${(totalRevenuePotential / 1000).toFixed(0)}K</p>
            <p className="kpi-detail">Estimated</p>
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
          className={`tab-btn ${activeTab === "inventory" ? "active" : ""}`}
          onClick={() => setActiveTab("inventory")}
        >
          📦 Inventory
        </button>
        <button 
          className={`tab-btn ${activeTab === "recommendations" ? "active" : ""}`}
          onClick={() => setActiveTab("recommendations")}
        >
          💡 Recommendations
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="tab-content">
          <div className="charts-grid">
            {/* Batch Status Distribution */}
            <div className="chart-card">
              <h3>Batch Status</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Fruit Distribution */}
            <div className="chart-card">
              <h3>Inventory by Fruit</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={fruitDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="quantity" fill="#8b5cf6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="quick-stats">
            <div className="stat-box">
              <h4>Inventory Summary</h4>
              <div className="stat-content">
                <div className="stat-item">
                  <span className="label">Total Quantity</span>
                  <span className="value">{totalQuantity.toFixed(0)} kg</span>
                </div>
                <div className="stat-item">
                  <span className="label">Average Shelf Life</span>
                  <span className="value">
                    {batches.length > 0 
                      ? (batches.reduce((sum, b) => sum + b.remaining_shelf_life_days, 0) / batches.length).toFixed(1)
                      : "0"}
                    {" days"}
                  </span>
                </div>
              </div>
            </div>

            <div className="stat-box">
              <h4>Sales Priority</h4>
              <div className="stat-content">
                <div className="stat-item priority">
                  <span className="badge sell-soon">!</span>
                  <span>{batches.filter(b => b.remaining_shelf_life_days <= 5 && b.remaining_shelf_life_days > 2).length} items need promotion</span>
                </div>
                <div className="stat-item priority">
                  <span className="badge do-not-sell">✕</span>
                  <span>{batches.filter(b => b.remaining_shelf_life_days <= 2).length} items near expiration</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Inventory Tab */}
      {activeTab === "inventory" && (
        <div className="tab-content">
          <div className="table-controls">
            <div className="filter-group">
              <label>Filter by Status:</label>
              <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
                <option value="ALL">All</option>
                <option value="SELL_NOW">Ready to Sell</option>
                <option value="SELL_SOON">Sell Soon</option>
                <option value="DO_NOT_SELL">Do Not Sell</option>
              </select>
            </div>
            <div className="filter-group">
              <label>Sort by:</label>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value as "shelf-life" | "quantity")}>
                <option value="shelf-life">Shelf Life (Days)</option>
                <option value="quantity">Quantity (kg)</option>
              </select>
            </div>
          </div>

          <div className="inventory-table-container">
            <table className="inventory-table">
              <thead>
                <tr>
                  <th>Batch ID</th>
                  <th>Fruit</th>
                  <th>Quantity (kg)</th>
                  <th>Shelf Life (days)</th>
                  <th>Category</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredBatches.length === 0 ? (
                  <tr className="empty-row">
                    <td colSpan={6}>No items found</td>
                  </tr>
                ) : (
                  filteredBatches.map(batch => (
                    <tr key={batch.batch_id} className={`category-${batch.sales_category?.toLowerCase()}`}>
                      <td className="batch-id">{batch.batch_id}</td>
                      <td className="fruit">{batch.fruit}</td>
                      <td className="quantity">{batch.quantity_kg}</td>
                      <td className="shelf-life">
                        <span className={`shelf-life-value ${batch.remaining_shelf_life_days <= 5 ? 'urgent' : ''}`}>
                          {batch.remaining_shelf_life_days.toFixed(1)}
                        </span>
                      </td>
                      <td>
                        <span className={`category-badge ${batch.sales_category?.toLowerCase()}`}>
                          {batch.sales_category === "SELL_NOW" && "✅ Sell Now"}
                          {batch.sales_category === "SELL_SOON" && "⏰ Sell Soon"}
                          {batch.sales_category === "DO_NOT_SELL" && "❌ Do Not Sell"}
                        </span>
                      </td>
                      <td>
                        <button className="action-btn">Details</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="table-summary">
            <p>Showing {filteredBatches.length} of {batches.length} items</p>
          </div>
        </div>
      )}

      {/* Recommendations Tab */}
      {activeTab === "recommendations" && (
        <div className="tab-content">
          <div className="recommendations-container">
            {batches.length === 0 ? (
              <div className="no-recommendations">
                <p>No batches available</p>
              </div>
            ) : (
              <>
                {/* Priority Actions */}
                <div className="recommendations-section">
                  <h3>🎯 Priority Actions</h3>
                  {batches.filter(b => b.remaining_shelf_life_days <= 2).length > 0 && (
                    <div className="recommendation-card urgent">
                      <div className="recommendation-icon">⚠️</div>
                      <div className="recommendation-content">
                        <h4>Immediate Action Required</h4>
                        <p>
                          {batches.filter(b => b.remaining_shelf_life_days <= 2).length} batch(es) 
                          will expire in 2 days or less
                        </p>
                        <div className="affected-batches">
                          {batches
                            .filter(b => b.remaining_shelf_life_days <= 2)
                            .slice(0, 3)
                            .map(b => (
                              <span key={b.batch_id} className="batch-tag">{b.batch_id}</span>
                            ))}
                        </div>
                      </div>
                      <button className="action-btn urgent">Take Action</button>
                    </div>
                  )}

                  {batches.filter(b => b.remaining_shelf_life_days > 2 && b.remaining_shelf_life_days <= 5).length > 0 && (
                    <div className="recommendation-card warning">
                      <div className="recommendation-icon">📣</div>
                      <div className="recommendation-content">
                        <h4>Schedule Promotions</h4>
                        <p>
                          {batches.filter(b => b.remaining_shelf_life_days > 2 && b.remaining_shelf_life_days <= 5).length} batch(es) 
                          need promotional pricing
                        </p>
                        <div className="affected-batches">
                          {batches
                            .filter(b => b.remaining_shelf_life_days > 2 && b.remaining_shelf_life_days <= 5)
                            .slice(0, 3)
                            .map(b => (
                              <span key={b.batch_id} className="batch-tag">{b.batch_id}</span>
                            ))}
                        </div>
                      </div>
                      <button className="action-btn warning">Set Promotions</button>
                    </div>
                  )}
                </div>

                {/* Best Actions */}
                <div className="recommendations-section">
                  <h3>✅ Optimize Sales</h3>
                  <div className="recommendation-card success">
                    <div className="recommendation-icon">💡</div>
                    <div className="recommendation-content">
                      <h4>Top Selling Opportunities</h4>
                      <p>
                        {batches.filter(b => b.remaining_shelf_life_days > 5).length} premium quality batches
                        ready for standard pricing
                      </p>
                      <div className="affected-batches">
                        {batches
                          .filter(b => b.remaining_shelf_life_days > 5)
                          .sort((a, b) => b.quantity_kg - a.quantity_kg)
                          .slice(0, 3)
                          .map(b => (
                            <span key={b.batch_id} className="batch-tag">{b.batch_id}</span>
                          ))}
                      </div>
                    </div>
                    <button className="action-btn success">View All</button>
                  </div>
                </div>

                {/* Fruit-specific Recommendations */}
                <div className="recommendations-section">
                  <h3>🍎 Fruit-specific Insights</h3>
                  <div className="insights-grid">
                    {Object.entries(
                      batches.reduce((acc: Record<string, { count: number; avgShelfLife: number; totalQty: number }>, batch) => {
                        if (!acc[batch.fruit]) {
                          acc[batch.fruit] = { count: 0, avgShelfLife: 0, totalQty: 0 };
                        }
                        acc[batch.fruit].count += 1;
                        acc[batch.fruit].avgShelfLife += batch.remaining_shelf_life_days;
                        acc[batch.fruit].totalQty += batch.quantity_kg;
                        return acc;
                      }, {})
                    ).map(([fruit, data]) => (
                      <div key={fruit} className="insight-card">
                        <h4>{fruit}</h4>
                        <div className="insight-stats">
                          <div className="stat">
                            <span className="label">Total Qty</span>
                            <span className="value">{data.totalQty.toFixed(0)} kg</span>
                          </div>
                          <div className="stat">
                            <span className="label">Avg Shelf Life</span>
                            <span className="value">{(data.avgShelfLife / data.count).toFixed(1)} days</span>
                          </div>
                          <div className="stat">
                            <span className="label">Batches</span>
                            <span className="value">{data.count}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
