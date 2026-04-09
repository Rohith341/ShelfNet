import { useState, useEffect } from "react";
import api from "../../api/axios";
import "../styles/admin-pages.css";

interface User {
  user_id: string;
  email: string;
  name: string;
  role: string;
  warehouse_id?: string;
  created_at: string;
  status: string;
}

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [filterRole, setFilterRole] = useState("");
  const [formData, setFormData] = useState({ 
    email: "", 
    name: "", 
    role: "MANAGER",
    warehouse_id: ""
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get("/users");
      setUsers(res.data);
      setError("");
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/users", formData);
      setFormData({ email: "", name: "", role: "MANAGER", warehouse_id: "" });
      setShowForm(false);
      fetchUsers();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || "Failed to create user");
    }
  };

  const filteredUsers = filterRole
    ? users.filter(u => u.role === filterRole)
    : users;

  const roleStats = {
    ADMIN: users.filter(u => u.role === "ADMIN").length,
    MANAGER: users.filter(u => u.role === "MANAGER").length,
    SALES: users.filter(u => u.role === "SALES").length,
  };

  if (loading && users.length === 0) {
    return <div className="loading">Loading users...</div>;
  }

  const getRoleBadgeColor = (role: string) => {
    return role === "ADMIN" ? "danger" : role === "MANAGER" ? "warning" : "success";
  };

  return (
    <div className="admin-page">
      <div className="page-header">
        <div>
          <h1>User Management</h1>
          <p className="subtitle">Manage system users and permissions</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? "✕ Cancel" : "+ Add User"}
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {/* Create Form */}
      {showForm && (
        <div className="form-card">
          <h3>Add New User</h3>
          <form onSubmit={handleCreateUser}>
            <div className="form-row">
              <div className="form-group">
                <label>Email</label>
                <input 
                  type="email" 
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="user@example.com"
                  required
                />
              </div>

              <div className="form-group">
                <label>Name</label>
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Full name"
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                >
                  <option value="ADMIN">Admin</option>
                  <option value="MANAGER">Manager</option>
                  <option value="SALES">Sales</option>
                </select>
              </div>

              {formData.role !== "ADMIN" && (
                <div className="form-group">
                  <label>Warehouse ID</label>
                  <input 
                    type="text" 
                    value={formData.warehouse_id}
                    onChange={(e) => setFormData({...formData, warehouse_id: e.target.value})}
                    placeholder="Optional"
                  />
                </div>
              )}
            </div>

            <button type="submit" className="btn-submit">Create User</button>
          </form>
        </div>
      )}

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <p className="stat-label">Total Users</p>
          <p className="stat-value">{users.length}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Admins</p>
          <p className="stat-value">{roleStats.ADMIN}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Managers</p>
          <p className="stat-value">{roleStats.MANAGER}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Sales Staff</p>
          <p className="stat-value">{roleStats.SALES}</p>
        </div>
      </div>

      {/* Filter */}
      <div className="filter-bar">
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
        >
          <option value="">All Roles</option>
          <option value="ADMIN">Admin</option>
          <option value="MANAGER">Manager</option>
          <option value="SALES">Sales</option>
        </select>
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Warehouse</th>
              <th>Created</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map(user => (
              <tr key={user.user_id}>
                <td className="name">{user.name}</td>
                <td>{user.email}</td>
                <td>
                  <span className={`badge-${getRoleBadgeColor(user.role)}`}>
                    {user.role}
                  </span>
                </td>
                <td>{user.warehouse_id || "-"}</td>
                <td>{new Date(user.created_at).toLocaleDateString()}</td>
                <td>
                  <span className="status-online">● Active</span>
                </td>
                <td>
                  <button className="action-link">Edit</button>
                  <button className="action-link">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
