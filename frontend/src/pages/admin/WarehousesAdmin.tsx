import { useState, useEffect } from "react";
import api from "../../api/axios";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import "../styles/admin-pages.css";

interface Warehouse {
  warehouse_id: string;
  name: string;
  location: string;
  capacity_kg: number;
  active_batches: number;
  total_sensors: number;
  active_sensors: number;
}

export default function AdminWarehouses() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: "", location: "", capacity_kg: 0 });
  const [filterLocation, setFilterLocation] = useState("");

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const fetchWarehouses = async () => {
    try {
      setLoading(true);
      const res = await api.get("/warehouses");
      setWarehouses(res.data);
      setError("");
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || "Failed to load warehouses");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/warehouses", formData);
      setFormData({ name: "", location: "", capacity_kg: 0 });
      setShowForm(false);
      fetchWarehouses();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || "Failed to create warehouse");
    }
  };

  const filteredWarehouses = filterLocation 
    ? warehouses.filter(w => w.location.toLowerCase().includes(filterLocation.toLowerCase()))
    : warehouses;

  const capacityData = warehouses.map(w => ({
    name: w.name,
    used: w.active_batches * 100, // Assuming 100kg per batch
    capacity: w.capacity_kg
  }));

  if (loading && warehouses.length === 0) {
    return <div className="loading">Loading warehouses...</div>;
  }

  return (
    <div className="admin-page">
      <div className="page-header">
        <div>
          <h1>Warehouses</h1>
          <p className="subtitle">Manage your warehouse network</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? "✕ Cancel" : "+ Add Warehouse"}
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {/* Create Form */}
      {showForm && (
        <div className="form-card">
          <h3>Create New Warehouse</h3>
          <form onSubmit={handleCreateWarehouse}>
            <div className="form-group">
              <label>Name</label>
              <input 
                type="text" 
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Warehouse name"
                required
              />
            </div>

            <div className="form-group">
              <label>Location</label>
              <input 
                type="text" 
                value={formData.location}
                onChange={(e) => setFormData({...formData, location: e.target.value})}
                placeholder="Location"
                required
              />
            </div>

            <div className="form-group">
              <label>Capacity (kg)</label>
              <input 
                type="number" 
                value={formData.capacity_kg}
                onChange={(e) => setFormData({...formData, capacity_kg: Number(e.target.value)})}
                placeholder="Capacity in kg"
                required
              />
            </div>

            <button type="submit" className="btn-submit">Create Warehouse</button>
          </form>
        </div>
      )}

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <p className="stat-label">Total Warehouses</p>
          <p className="stat-value">{warehouses.length}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Total Capacity</p>
          <p className="stat-value">{warehouses.reduce((sum, w) => sum + w.capacity_kg, 0).toLocaleString()} kg</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Active Batches</p>
          <p className="stat-value">{warehouses.reduce((sum, w) => sum + w.active_batches, 0)}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Total Sensors</p>
          <p className="stat-value">{warehouses.reduce((sum, w) => sum + w.total_sensors, 0)}</p>
        </div>
      </div>

      {/* Chart */}
      <div className="chart-container">
        <h3>Capacity Utilization</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={capacityData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="used" fill="#3b82f6" />
            <Bar dataKey="capacity" fill="#e5e7eb" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Filter */}
      <div className="filter-bar">
        <input 
          type="text"
          placeholder="Filter by location..."
          value={filterLocation}
          onChange={(e) => setFilterLocation(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Location</th>
              <th>Capacity (kg)</th>
              <th>Active Batches</th>
              <th>Sensors</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredWarehouses.map(wh => (
              <tr key={wh.warehouse_id}>
                <td className="name">{wh.name}</td>
                <td>{wh.location}</td>
                <td>{wh.capacity_kg.toLocaleString()}</td>
                <td><span className="badge-info">{wh.active_batches}</span></td>
                <td>
                  <span className="badge-success">{wh.active_sensors}/{wh.total_sensors}</span>
                </td>
                <td>
                  <span className="status-online">● Online</span>
                </td>
                <td>
                  <button className="action-link">View</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
