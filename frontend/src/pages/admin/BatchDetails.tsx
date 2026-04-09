import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { batchAPI, sensorAPI } from "../../api/api";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

export default function BatchDetails() {
  const { batchId } = useParams<{ batchId: string }>();
  const [batch, setBatch] = useState<any>(null);
  const [readings, setReadings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (batchId) {
      fetchBatchDetails();
    }
  }, [batchId]);

  const fetchBatchDetails = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token") || "";

      // Fetch batch details
      const batchRes = await batchAPI.getBatchDetails(batchId || "", token);
      setBatch(batchRes.data);

      // Fetch sensor readings (simplified - would need backend support)
      const sensorRes = await sensorAPI.getAll(token);
      const batchReadings = sensorRes.data.filter((s: any) => s.batch_id === batchId).slice(0, 10);
      setReadings(batchReadings);

      setError("");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to load batch details");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">Loading batch details...</div>;
  if (!batch) return <div className="error-message">Batch not found</div>;

  const shelfLifeColor = batch.predicted_remaining_shelf_life_days > 5 ? "green" : batch.predicted_remaining_shelf_life_days > 2 ? "orange" : "red";

  return (
    <div className="batch-details-container">
      <h1>Batch Details: {batch.batch_id}</h1>
      {error && <div className="error-message">{error}</div>}

      {/* Batch Info Section */}
      <div className="info-grid">
        <InfoCard label="Fruit Type" value={batch.fruit} />
        <InfoCard label="Warehouse" value={batch.warehouse_id} />
        <InfoCard label="Quantity (kg)" value={batch.quantity_kg} />
        <InfoCard label="Status" value={<span className={`status ${batch.status.toLowerCase()}`}>{batch.status}</span>} />
        <InfoCard label="Arrival Date" value={new Date(batch.arrival_date).toLocaleDateString()} />
        <InfoCard label="Expected Shelf Life (days)" value={batch.expected_shelf_life_days} />
        <InfoCard
          label="Predicted Remaining (days)"
          value={<span className={`shelf-life ${shelfLifeColor}`}>{batch.predicted_remaining_shelf_life_days || "N/A"}</span>}
        />
        <InfoCard label="Confidence Score" value={(batch.prediction_confidence * 100).toFixed(1) + "%" || "N/A"} />
      </div>

      {/* Sensor Readings Chart */}
      {readings.length > 0 && (
        <div className="chart-container">
          <h2>Temperature Trend</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={readings}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="timestamp" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="temperature" stroke="#8884d8" name="Temperature (°C)" />
              <Line type="monotone" dataKey="humidity" stroke="#82ca9d" name="Humidity (%)" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Sensor Readings Table */}
      {readings.length > 0 && (
        <div className="table-container">
          <h2>Recent Sensor Readings</h2>
          <table className="data-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Temperature (°C)</th>
                <th>Humidity (%)</th>
                <th>Ethylene</th>
                <th>CO₂</th>
                <th>O₂</th>
              </tr>
            </thead>
            <tbody>
              {readings.map((reading: any, idx) => (
                <tr key={idx}>
                  <td>{new Date(reading.timestamp).toLocaleString()}</td>
                  <td>{reading.temperature}</td>
                  <td>{reading.humidity}</td>
                  <td>{reading.ethylene}</td>
                  <td>{reading.co2}</td>
                  <td>{reading.o2}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Actions */}
      <div className="actions-container">
        {batch.status === "ACTIVE" && (
          <button className="btn btn-danger" onClick={() => alert("Close batch functionality")}>
            Close Batch
          </button>
        )}
        <button className="btn btn-secondary" onClick={() => window.history.back()}>
          Back
        </button>
      </div>
    </div>
  );
}

function InfoCard({ label, value }: any) {
  return (
    <div className="info-card">
      <label>{label}</label>
      <div className="value">{value}</div>
    </div>
  );
}
