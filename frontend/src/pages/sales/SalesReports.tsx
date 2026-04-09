import { useState, useEffect } from "react";
import { dashboardAPI } from "../../api/api";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";
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

export default function SalesReports() {
  const [kpis, setKpis] = useState<KPI | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reportPeriod, setReportPeriod] = useState<"week" | "month" | "all">("week");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token") || "";

      // Fetch KPIs
      const kpiRes = await dashboardAPI.salesKPIs(token);
      setKpis(kpiRes.data);

      // Fetch batches
      const batchRes = await dashboardAPI.salesBatches(token);
      setBatches(batchRes.data || []);

      setError("");
    } catch (err) {
      const error = err as { response?: { data?: { detail: string } }};
      setError(error.response?.data?.detail || "Failed to load reports");
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="sales-loading">Loading Reports...</div>;
  }

  // Calculate report metrics
  const totalBatches = batches.length;
  const totalQuantity = batches.reduce((sum, b) => sum + b.quantity_kg, 0);
  const averageShelfLife = batches.length > 0
    ? batches.reduce((sum, b) => sum + b.remaining_shelf_life_days, 0) / batches.length
    : 0;

  // Revenue estimates (placeholder calculations)
  const standardPricingRevenue = (kpis?.sellable_batches || 0) * 5000; // $5000 per batch
  const promotionalRevenue = (kpis?.sell_soon_batches || 0) * 4250; // 15% discount
  const clearanceRevenue = (kpis?.not_sellable_batches || 0) * 3000; // 40% discount
  const totalPotentialRevenue = standardPricingRevenue + promotionalRevenue + clearanceRevenue;

  // Fruit distribution data
  interface FruitData {
    name: string;
    quantity: number;
    batches: number;
    avgShelfLife: number;
    revenue: number;
  }
  
  const fruitStats = Object.entries(
    batches.reduce((acc: Record<string, Omit<FruitData, 'avgShelfLife'> & {avgShelfLife: number}>, batch) => {
      if (!acc[batch.fruit]) {
        acc[batch.fruit] = {
          name: batch.fruit,
          quantity: 0,
          batches: 0,
          avgShelfLife: 0,
          revenue: 0
        };
      }
      acc[batch.fruit].quantity += batch.quantity_kg;
      acc[batch.fruit].batches += 1;
      acc[batch.fruit].avgShelfLife += batch.remaining_shelf_life_days;
      
      // Estimate revenue based on category
      if (batch.sales_category === "SELL_NOW") {
        acc[batch.fruit].revenue += 5000;
      } else if (batch.sales_category === "SELL_SOON") {
        acc[batch.fruit].revenue += 4250;
      } else {
        acc[batch.fruit].revenue += 3000;
      }
      return acc;
    }, {})
  ).map(([, data]) => ({
    ...data,
    avgShelfLife: (data.avgShelfLife / data.batches).toFixed(1)
  }));

  // Category distribution
  const categoryData = [
    { name: "Ready to Sell", value: kpis?.sellable_batches || 0, color: "#10b981" },
    { name: "Sell Soon", value: kpis?.sell_soon_batches || 0, color: "#f59e0b" },
    { name: "Do Not Sell", value: kpis?.not_sellable_batches || 0, color: "#ef4444" }
  ];

  // Revenue breakdown
  const revenueData = [
    { name: "Standard Pricing", value: standardPricingRevenue, color: "#10b981" },
    { name: "Promotional", value: promotionalRevenue, color: "#f59e0b" },
    { name: "Clearance", value: clearanceRevenue, color: "#ef4444" }
  ];

  // Shelf life distribution (for line chart simulation)
  const shelfLifeDistribution = [
    { days: "0-2", count: batches.filter(b => b.remaining_shelf_life_days <= 2).length },
    { days: "2-5", count: batches.filter(b => b.remaining_shelf_life_days > 2 && b.remaining_shelf_life_days <= 5).length },
    { days: "5-10", count: batches.filter(b => b.remaining_shelf_life_days > 5 && b.remaining_shelf_life_days <= 10).length },
    { days: "10-20", count: batches.filter(b => b.remaining_shelf_life_days > 10 && b.remaining_shelf_life_days <= 20).length },
    { days: "20+", count: batches.filter(b => b.remaining_shelf_life_days > 20).length }
  ];

  return (
    <div className="sales-reports-page">
      <div className="page-header">
        <div>
          <h1>Sales Reports & Analytics</h1>
          <p className="subtitle">Inventory metrics, revenue projections, and fruit performance</p>
        </div>
        <div className="header-actions">
          <select
            value={reportPeriod}
            onChange={(e) => setReportPeriod(e.target.value as "week" | "month" | "all")}
            className="period-selector"
          >
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
            <option value="all">All Time</option>
          </select>
          <button className="refresh-btn" onClick={fetchData}>
            ⟳ Refresh
          </button>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {/* Key Metrics */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-label">Total Batches</div>
          <div className="metric-value">{totalBatches}</div>
          <div className="metric-detail">in warehouse</div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Total Inventory</div>
          <div className="metric-value">{totalQuantity.toFixed(0)}</div>
          <div className="metric-detail">kg</div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Avg Shelf Life</div>
          <div className="metric-value">{averageShelfLife.toFixed(1)}</div>
          <div className="metric-detail">days</div>
        </div>

        <div className="metric-card revenue">
          <div className="metric-label">Revenue Potential</div>
          <div className="metric-value">${(totalPotentialRevenue / 1000).toFixed(0)}K</div>
          <div className="metric-detail">estimated</div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="charts-section">
        {/* Category Distribution */}
        <div className="chart-card">
          <h3>📊 Batch Distribution by Category</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue Breakdown */}
        <div className="chart-card">
          <h3>💰 Revenue Breakdown by Pricing Tier</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value) => `$${value}`} />
              <Bar dataKey="value" fill="#8b5cf6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Shelf Life Distribution */}
        <div className="chart-card">
          <h3>⏰ Shelf Life Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={shelfLifeDistribution}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="days" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Fruit Performance Table */}
      <div className="performance-section">
        <h3>🍎 Fruit Performance Summary</h3>
        <div className="fruit-table-container">
          <table className="fruit-performance-table">
            <thead>
              <tr>
                <th>Fruit Type</th>
                <th>Quantity (kg)</th>
                <th>Batches</th>
                <th>Avg Shelf Life</th>
                <th>Est. Revenue</th>
                <th>% of Total</th>
              </tr>
            </thead>
            <tbody>
              {fruitStats.length === 0 ? (
                <tr>
                  <td colSpan={6} className="empty">No fruit data available</td>
                </tr>
              ) : (
                fruitStats.map((fruit) => (
                  <tr key={fruit.name}>
                    <td className="fruit-name"><strong>{fruit.name}</strong></td>
                    <td className="quantity">{fruit.quantity.toFixed(1)}</td>
                    <td className="batches">{fruit.batches}</td>
                    <td className="shelf-life">{fruit.avgShelfLife} days</td>
                    <td className="revenue">${(fruit.revenue / 1000).toFixed(1)}K</td>
                    <td className="percentage">
                      {((fruit.quantity / totalQuantity) * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recommendations */}
      <div className="recommendations-section">
        <h3>💡 Recommendations</h3>
        <div className="recommendations-grid">
          <div className="recommendation-item">
            <div className="icon">🎯</div>
            <div className="content">
              <h4>Focus on {fruitStats.length > 0 ? fruitStats[0].name : 'inventory'}</h4>
              <p>
                {fruitStats.length > 0
                  ? `${fruitStats[0].name} represents the largest portion of your inventory. Consider marketing campaigns focused on this fruit.`
                  : "Create focused marketing campaigns based on your top-performing fruits."}
              </p>
            </div>
          </div>

          <div className="recommendation-item">
            <div className="icon">⚠️</div>
            <div className="content">
              <h4>Urgent Action Needed</h4>
              <p>
                {batches.filter(b => b.remaining_shelf_life_days <= 2).length} batch(es) expire in 2 days or less.
                Consider clearance pricing or donations.
              </p>
            </div>
          </div>

          <div className="recommendation-item">
            <div className="icon">📈</div>
            <div className="content">
              <h4>Revenue Optimization</h4>
              <p>
                Implement dynamic pricing strategies. Your current mix generates approximately ${(totalPotentialRevenue / 1000).toFixed(0)}K in potential revenue.
              </p>
            </div>
          </div>

          <div className="recommendation-item">
            <div className="icon">📊</div>
            <div className="content">
              <h4>Monitor Promotions</h4>
              <p>
                {kpis?.sell_soon_batches || 0} batch(es) need promotional pricing.
                Set up alerts for items approaching expiration.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="summary-stats">
        <div className="stat-group">
          <h4>Category Summary</h4>
          <div className="stat-item sell-now">
            <span className="label">Ready to Sell</span>
            <span className="value">{kpis?.sellable_batches} batches</span>
          </div>
          <div className="stat-item sell-soon">
            <span className="label">Sell Soon</span>
            <span className="value">{kpis?.sell_soon_batches} batches</span>
          </div>
          <div className="stat-item do-not-sell">
            <span className="label">Do Not Sell</span>
            <span className="value">{kpis?.not_sellable_batches} batches</span>
          </div>
        </div>

        <div className="stat-group">
          <h4>Revenue Estimate</h4>
          <div className="stat-row">
            <span>Standard Pricing:</span>
            <span className="value">${(standardPricingRevenue / 1000).toFixed(1)}K</span>
          </div>
          <div className="stat-row">
            <span>Promotional:</span>
            <span className="value">${(promotionalRevenue / 1000).toFixed(1)}K</span>
          </div>
          <div className="stat-row">
            <span>Clearance:</span>
            <span className="value">${(clearanceRevenue / 1000).toFixed(1)}K</span>
          </div>
          <div className="stat-row total">
            <span>Total Potential:</span>
            <span className="value">${(totalPotentialRevenue / 1000).toFixed(1)}K</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="page-footer">
        <p>Report generated for period: {reportPeriod} | Last updated: {new Date().toLocaleString()}</p>
      </div>
    </div>
  );
}
