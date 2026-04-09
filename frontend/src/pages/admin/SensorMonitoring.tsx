import { useEffect, useState } from "react";
import { sensorAPI } from "../../api/api";

export default function SensorMonitoring() {
  const [sensors, setSensors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");

  useEffect(() => {
    fetchSensors();
    const interval = setInterval(fetchSensors, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchSensors = async () => {
    try {
      const token = localStorage.getItem("token") || "";
      const res = await sensorAPI.getAll(token);
      setSensors(res.data);
      setError("");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to load sensors");
    } finally {
      setLoading(false);
    }
  };

  const filteredSensors = sensors.filter((s) =>
    filter === "" || s.warehouse_id.toLowerCase().includes(filter.toLowerCase()) || s.sensor_id.toLowerCase().includes(filter.toLowerCase())
  );

  if (loading) return <div className="loading">Loading sensors...</div>;

  return (
    <div className="sensor-monitoring-container">
      <h1>Sensor Monitoring</h1>
      {error && <div className="error-message">{error}</div>}

      <div className="sensor-header">
        <div className="stat-item">
          <span className="stat-label">Total Sensors</span>
          <span className="stat-value">{sensors.length}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Active</span>
          <span className="stat-value active">{sensors.filter((s) => s.status === "ACTIVE").length}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Inactive</span>
          <span className="stat-value inactive">{sensors.filter((s) => s.status !== "ACTIVE").length}</span>
        </div>

        <input
          type="text"
          placeholder="Search by Warehouse or Sensor ID..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="search-input"
        />
      </div>

      {filteredSensors.length === 0 ? (
        <p className="no-data">No sensors found matching your filter.</p>
      ) : (
        <div className="sensor-grid">
          {filteredSensors.map((sensor) => (
            <div key={sensor.sensor_id} className={`sensor-card sensor-${sensor.status.toLowerCase()}`}>
              <div className="sensor-header-info">
                <h3>{sensor.sensor_id}</h3>
                <span className={`status-badge ${sensor.status.toLowerCase()}`}>{sensor.status}</span>
              </div>

              <div className="sensor-details">
                <div className="detail-row">
                  <label>Warehouse:</label>
                  <span>{sensor.warehouse_id}</span>
                </div>
                <div className="detail-row">
                  <label>Location:</label>
                  <span>{sensor.location || "N/A"}</span>
                </div>
                {sensor.current_batch_id && (
                  <div className="detail-row">
                    <label>Current Batch:</label>
                    <span>{sensor.current_batch_id}</span>
                  </div>
                )}
                <div className="detail-row">
                  <label>Installed:</label>
                  <span>{new Date(sensor.installed_at).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="sensor-actions">
                <button className="btn-small btn-info">View Readings</button>
                {sensor.status === "ACTIVE" && (
                  <button className="btn-small btn-warning">Deactivate</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="refresh-info">
        <small>⟳ Auto-refreshing every 5 seconds</small>
      </div>
    </div>
  );
}
