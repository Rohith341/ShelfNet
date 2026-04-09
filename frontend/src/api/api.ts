import axios from "axios";

const API_BASE_URL = "http://localhost:8000";

// Auth API Calls
export const authAPI = {
  login: (email: string, password: string) =>
    axios.post(`${API_BASE_URL}/auth/login`, { email, password }),

  register: (data: Record<string, unknown>) =>
    axios.post(`${API_BASE_URL}/users`, data),

  setPassword: (email: string, password: string) =>
    axios.post(`${API_BASE_URL}/auth/set-password`, { email, password }),
};

// Warehouse API Calls
export const warehouseAPI = {
  create: (data: Record<string, unknown>, token: string) =>
    axios.post(`${API_BASE_URL}/warehouses`, data, {
      headers: { Authorization: `Bearer ${token}` },
    }),

  getAll: (token: string) =>
    axios.get(`${API_BASE_URL}/warehouses`, {
      headers: { Authorization: `Bearer ${token}` },
    }),

  getDetails: (warehouseId: string, token: string) =>
    axios.get(`${API_BASE_URL}/warehouses/${warehouseId}`, {
      headers: { Authorization: `Bearer ${token}` },
    }),
};

// Batch API Calls
export const batchAPI = {
  create: (data: Record<string, unknown>, token: string) =>
    axios.post(`${API_BASE_URL}/batches`, data, {
      headers: { Authorization: `Bearer ${token}` },
    }),

  getAll: (token: string, warehouseId?: string) =>
    axios.get(`${API_BASE_URL}/batches`, {
      headers: { Authorization: `Bearer ${token}` },
      params: warehouseId ? { warehouse_id: warehouseId } : undefined,
    }),

  getBatchDetails: (batchId: string, token: string) =>
    axios.get(`${API_BASE_URL}/batches/${batchId}`, {
      headers: { Authorization: `Bearer ${token}` },
    }),

  closeBatch: (batchId: string, token: string) =>
    axios.post(
      `${API_BASE_URL}/batches/${batchId}/close`,
      {},
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    ),
};

// Sensor API Calls
export const sensorAPI = {
  register: (data: Record<string, unknown>, token: string) =>
    axios.post(`${API_BASE_URL}/sensors`, data, {
      headers: { Authorization: `Bearer ${token}` },
    }),

  getAll: (token: string) =>
    axios.get(`${API_BASE_URL}/sensors`, {
      headers: { Authorization: `Bearer ${token}` },
    }),

  ingestReading: (data: Record<string, unknown>, token: string) =>
    axios.post(`${API_BASE_URL}/sensors/ingest`, data, {
      headers: { Authorization: `Bearer ${token}` },
    }),
};

// Prediction API Calls
export const predictionAPI = {
  predict: (batchId: string, token: string) =>
    axios.get(`${API_BASE_URL}/predict/${batchId}`, {
      headers: { Authorization: `Bearer ${token}` },
    }),
};

// Alert API Calls
export const alertAPI = {
  getAll: (token: string) =>
    axios.get(`${API_BASE_URL}/alerts`, {
      headers: { Authorization: `Bearer ${token}` },
    }),

  getByWarehouse: (warehouseId: string, token: string) =>
    axios.get(`${API_BASE_URL}/alerts/warehouse/${warehouseId}`, {
      headers: { Authorization: `Bearer ${token}` },
    }),

  getByBatch: (batchId: string, token: string) =>
    axios.get(`${API_BASE_URL}/alerts/batch/${batchId}`, {
      headers: { Authorization: `Bearer ${token}` },
    }),

  getActive: (token: string) =>
    axios.get(`${API_BASE_URL}/alerts/active`, {
      headers: { Authorization: `Bearer ${token}` },
    }),

  acknowledge: (alertId: string, token: string) =>
    axios.post(
      `${API_BASE_URL}/alerts/acknowledge/${alertId}`,
      {},
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    ),

  resolve: (alertId: string, token: string) =>
    axios.post(
      `${API_BASE_URL}/alerts/resolve/${alertId}`,
      {},
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    ),
};

// Dashboard API Calls
export const dashboardAPI = {
  adminKPIs: (token: string) =>
    axios.get(`${API_BASE_URL}/admin/kpis`, {
      headers: { Authorization: `Bearer ${token}` },
    }),

  adminWarehouseSummary: (token: string) =>
    axios.get(`${API_BASE_URL}/admin/warehouses/summary`, {
      headers: { Authorization: `Bearer ${token}` },
    }),

  adminAlertAnalytics: (token: string) =>
    axios.get(`${API_BASE_URL}/admin/alerts/analytics`, {
      headers: { Authorization: `Bearer ${token}` },
    }),

  adminFruitOverview: (token: string) =>
    axios.get(`${API_BASE_URL}/admin/fruits/overview`, {
      headers: { Authorization: `Bearer ${token}` },
    }),

  managerKPIs: (warehouseId: string, token: string) =>
    axios.get(`${API_BASE_URL}/manager/${warehouseId}/kpis`, {
      headers: { Authorization: `Bearer ${token}` },
    }),

  salesKPIs: (token: string) =>
    axios.get(`${API_BASE_URL}/sales/kpis`, {
      headers: { Authorization: `Bearer ${token}` },
    }),

  salesBatches: (token: string) =>
    axios.get(`${API_BASE_URL}/sales/batches`, {
      headers: { Authorization: `Bearer ${token}` },
    }),
};

// User API Calls
export const userAPI = {
  create: (data: Record<string, unknown>) =>
    axios.post(`${API_BASE_URL}/users`, data),

  getAll: (token: string) =>
    axios.get(`${API_BASE_URL}/users`, {
      headers: { Authorization: `Bearer ${token}` },
    }),
};

export default {
  authAPI,
  warehouseAPI,
  batchAPI,
  sensorAPI,
  predictionAPI,
  alertAPI,
  dashboardAPI,
  userAPI,
};
