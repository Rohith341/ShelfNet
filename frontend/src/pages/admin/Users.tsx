import { useEffect, useState } from "react";
import {
  getAllUsers,
  approveUser,
  disableUser,
} from "../../api/users.api";
import "../../styles/users.css";

type User = {
  user_id: string;
  name: string;
  email: string;
  role: string;
  warehouse_id?: string;
  status: string;
};

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadUsers = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getAllUsers();
      setUsers(res.data);
    } catch (err: any) {
      console.error("Failed to load users:", err);
      setError(err.response?.data?.detail || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const pendingUsers = users.filter((u) => u.status === "PENDING");
  const otherUsers = users.filter((u) => u.status !== "PENDING");

  const handleApprove = async (user: User) => {
    const ok = window.confirm(
      `Approve access for ${user.name} (${user.role})?\n\nAfter approval, the user will be able to login immediately with their registered password.`
    );
    if (!ok) return;

    try {
      await approveUser(user.user_id);
      alert(`✅ User ${user.name} has been approved!\n\nThey can now login with their email and password.`);
      loadUsers();
    } catch (err: any) {
      alert("Failed to approve user: " + (err.response?.data?.detail || "Unknown error"));
    }
  };

  const handleDisable = async (user: User) => {
    const ok = window.confirm(
      `Disable ${user.name}? They will lose access immediately.`
    );
    if (!ok) return;

    await disableUser(user.user_id);
    loadUsers();
  };

  if (loading) return <p className="loading">Loading users...</p>;
  if (error) return <p className="error-message">{error}</p>;

  return (
    <div className="users-page">
      <h2>User Management</h2>

      {/* 🔔 Pending Users */}
      {pendingUsers.length > 0 && (
        <>
          <h3 className="section-title">Pending Approvals</h3>
          <UsersTable
            users={pendingUsers}
            onApprove={handleApprove}
            onDisable={handleDisable}
          />
        </>
      )}

      {/* 👥 All Other Users */}
      <h3 className="section-title">All Users</h3>
      <UsersTable
        users={otherUsers}
        onApprove={handleApprove}
        onDisable={handleDisable}
      />
    </div>
  );
}

function UsersTable({
  users,
  onApprove,
  onDisable,
}: {
  users: User[];
  onApprove: (u: User) => void;
  onDisable: (u: User) => void;
}) {
  return (
    <table className="users-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Email</th>
          <th>Role</th>
          <th>Warehouse</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>

      <tbody>
        {users.map((u) => (
          <tr key={u.user_id} className={u.status.toLowerCase()}>
            <td>{u.name}</td>
            <td>{u.email}</td>
            <td>{u.role}</td>
            <td>{u.warehouse_id || "—"}</td>
            <td>
              <span className={`status ${u.status}`}>
                {u.status}
              </span>
            </td>
            <td className="actions">
              {u.status === "PENDING" && (
                <button
                  className="approve"
                  onClick={() => onApprove(u)}
                >
                  Approve
                </button>
              )}

              {u.role !== "ADMIN" && u.status === "ACTIVE" && (
                <button
                  className="disable"
                  onClick={() => onDisable(u)}
                >
                  Disable
                </button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
