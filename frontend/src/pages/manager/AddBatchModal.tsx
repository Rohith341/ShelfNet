import { useState } from "react";
import { dashboardAPI } from "../../api/api";
import "../../styles/manager-dashboard.css";

interface AddBatchModalProps {
  isOpen: boolean;
  warehouseId: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface BatchFormData {
  fruit: string;
  quantity_kg: number;
  expected_shelf_life_days: number;
  warehouse_id: string;
}

const FRUIT_OPTIONS = [
  "Apple",
  "Banana",
  "Strawberry",
  "Pear",
  "Grapes",
  "Cherry",
  "Mango",
  "Orange"
];

export default function AddBatchModal({ isOpen, warehouseId, onClose, onSuccess }: AddBatchModalProps) {
  const [formData, setFormData] = useState<BatchFormData>({
    fruit: "Apple",
    quantity_kg: 100,
    expected_shelf_life_days: 7,
    warehouse_id: warehouseId
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === "quantity_kg" || name === "expected_shelf_life_days" 
        ? parseInt(value) 
        : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("token") || "";
      
      // Call backend API to create batch
      const response = await fetch("http://localhost:8000/batches", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          fruit: formData.fruit,
          quantity_kg: formData.quantity_kg,
          arrival_date: new Date().toISOString(),
          expected_shelf_life_days: formData.expected_shelf_life_days,
          warehouse_id: warehouseId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to create batch");
      }

      const batchData = await response.json();

      setSuccess(true);
      setFormData({
        fruit: "Apple",
        quantity_kg: 100,
        expected_shelf_life_days: 7,
        warehouse_id: warehouseId
      });

      // Show success message for 3 seconds then close
      setTimeout(() => {
        setSuccess(false);
        onSuccess();
        onClose();
      }, 3000);
    } catch (err) {
      const error = err as Error;
      setError(error.message || "Failed to create batch");
      console.error("Error creating batch:", err);
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>➕ Add New Batch</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {success && (
          <div className="success-banner">
            ✅ Batch created successfully! LSTM prediction ready to view.
          </div>
        )}

        {error && (
          <div className="error-banner">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="batch-form">
          <div className="form-group">
            <label htmlFor="fruit">Fruit Type *</label>
            <select
              id="fruit"
              name="fruit"
              value={formData.fruit}
              onChange={handleInputChange}
              required
            >
              {FRUIT_OPTIONS.map(fruit => (
                <option key={fruit} value={fruit}>{fruit}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="quantity_kg">Quantity (kg) *</label>
            <input
              id="quantity_kg"
              type="number"
              name="quantity_kg"
              value={formData.quantity_kg}
              onChange={handleInputChange}
              min="1"
              max="10000"
              required
              placeholder="Enter quantity in kg"
            />
          </div>

          <div className="form-group">
            <label htmlFor="expected_shelf_life_days">Expected Shelf Life (days) *</label>
            <input
              id="expected_shelf_life_days"
              type="number"
              name="expected_shelf_life_days"
              value={formData.expected_shelf_life_days}
              onChange={handleInputChange}
              min="1"
              max="365"
              required
              placeholder="Enter expected shelf life in days"
            />
          </div>

          <div className="form-info">
            <p>
              💡 <strong>How it works:</strong>
            </p>
            <ul>
              <li>✅ Simulated sensor readings are auto-generated for your batch</li>
              <li>✅ Real-time sensor data (temperature, humidity, ethylene, CO₂, O₂) captured</li>
              <li>✅ LSTM neural network predicts actual shelf life immediately</li>
              <li>✅ Alerts generated if spoilage is detected early</li>
            </ul>
          </div>

          <div className="form-actions">
            <button type="button" className="btn-cancel" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? "Creating..." : "Create Batch"}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          background: white;
          border-radius: 12px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
          max-width: 500px;
          width: 90%;
          max-height: 90vh;
          overflow-y: auto;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          border-bottom: 2px solid #e5e7eb;
        }

        .modal-header h2 {
          margin: 0;
          font-size: 20px;
          color: #1f2937;
        }

        .modal-close {
          background: none;
          border: none;
          font-size: 24px;
          color: #6b7280;
          cursor: pointer;
          padding: 0;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          transition: background 0.2s;
        }

        .modal-close:hover {
          background: #f3f4f6;
          color: #1f2937;
        }

        .success-banner {
          background: #dcfce7;
          color: #166534;
          padding: 12px 16px;
          margin: 15px;
          border-radius: 6px;
          border-left: 4px solid #16a34a;
          font-weight: 500;
        }

        .error-banner {
          background: #fee2e2;
          color: #991b1b;
          padding: 12px 16px;
          margin: 15px;
          border-radius: 6px;
          border-left: 4px solid #dc2626;
          font-weight: 500;
        }

        .batch-form {
          padding: 20px;
        }

        .form-group {
          margin-bottom: 18px;
        }

        .form-group label {
          display: block;
          font-weight: 600;
          color: #374151;
          margin-bottom: 6px;
          font-size: 14px;
        }

        .form-group input,
        .form-group select {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 14px;
          font-family: inherit;
          transition: border-color 0.2s;
          box-sizing: border-box;
        }

        .form-group input:focus,
        .form-group select:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .form-group input::placeholder {
          color: #9ca3af;
        }

        .form-info {
          background: #f0f9ff;
          border-left: 4px solid #3b82f6;
          padding: 15px;
          border-radius: 6px;
          margin-bottom: 20px;
        }

        .form-info p {
          margin: 0 0 10px 0;
          font-weight: 600;
          color: #1e40af;
          font-size: 14px;
        }

        .form-info ul {
          margin: 0;
          padding-left: 20px;
        }

        .form-info li {
          color: #1e40af;
          font-size: 13px;
          margin-bottom: 6px;
          line-height: 1.5;
        }

        .form-actions {
          display: flex;
          gap: 10px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
        }

        .btn-cancel,
        .btn-submit {
          flex: 1;
          padding: 10px 16px;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-cancel {
          background: #e5e7eb;
          color: #374151;
        }

        .btn-cancel:hover:not(:disabled) {
          background: #d1d5db;
        }

        .btn-submit {
          background: #3b82f6;
          color: white;
        }

        .btn-submit:hover:not(:disabled) {
          background: #2563eb;
        }

        .btn-cancel:disabled,
        .btn-submit:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        @media (max-width: 600px) {
          .modal-content {
            width: 95%;
            max-height: 95vh;
          }

          .form-actions {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
}
