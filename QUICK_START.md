# ShelfNet - Quick Start Guide

## 🚀 Getting Started

### Prerequisites
- Python 3.9+
- Node.js 18+ (or 20+ for optimal Vite support)
- MongoDB (local or Atlas)
- npm/yarn

### 1. Clone & Setup Backend

```bash
cd ShelfNet/backend

# Create virtual environment
python -m venv .venv
source .venv/Scripts/activate  # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start MongoDB (if running locally)
mongod

# Run backend
python -m uvicorn main:app --reload
```

**Backend runs at:** `http://localhost:8000`
**API Docs:** `http://localhost:8000/docs`

---

### 2. Setup Frontend

```bash
cd ShelfNet/frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

**Frontend runs at:** `http://localhost:5173`

---

## 🔐 Test Credentials

### Admin Account
- **Email:** `admin@test.com`
- **Password:** `Admin@123`
- **Role:** ADMIN
- **Access:** All dashboards, user management, warehouse management

### Sample Test Data
The system comes with pre-configured test data in the MongoDB database.

---

## 📊 Dashboard Features

### Admin Dashboard (`/admin`)
- **KPIs:** Total warehouses, active batches, sensors, alerts
- **Warehouse Summary:** Active batches & alerts per warehouse
- **Alert Analytics:** Alert distribution by type
- **Fruit Overview:** Batch statistics by fruit type

### Manager Dashboard (`/manager`)
- **KPIs:** Active batches, expiring soon, critical alerts, online sensors
- **Batch Status Chart:** Visual representation of batch status
- **Recent Batches Table:** List of active batches with shelf life
- **Active Alerts:** Real-time alert display

### Sales Dashboard (`/sales`)
- **Sellability KPIs:** Sellable, sell-soon, not-sellable batches
- **Batch Distribution:** Pie chart of batch status
- **Recommendations:** Smart recommendations for each batch
- **Priority Actions:** List of batches needing attention

---

## 🔧 Key Endpoints

### Authentication
```
POST /auth/login
POST /users (register)
POST /auth/set-password
```

### Warehouses
```
POST /warehouses (create)
GET /warehouses (list)
```

### Batches
```
POST /batches (create)
GET /batches (list)
POST /batches/{batch_id}/close (close)
```

### Sensors
```
POST /sensors (register)
GET /sensors (list)
POST /sensors/ingest (ingest readings)
```

### Predictions
```
GET /predict/{batch_id} (get prediction)
```

### Alerts
```
GET /alerts (get all)
GET /alerts/active (get unresolved)
POST /alerts/acknowledge/{alert_id}
POST /alerts/resolve/{alert_id}
```

### Dashboards
```
GET /admin/kpis
GET /manager/{warehouse_id}/kpis
GET /sales/kpis
```

---

## 📁 Project Structure

```
ShelfNet/
├── backend/
│   ├── main.py               # FastAPI app entry point
│   ├── database.py           # MongoDB setup
│   ├── requirements.txt      # Python dependencies
│   ├── models/               # Pydantic models
│   ├── routes/               # API endpoints
│   ├── services/             # Business logic
│   ├── ml/                   # LSTM model & dataset
│   └── utils/                # Helpers & security
├── frontend/
│   ├── src/
│   │   ├── App.tsx          # Main routing
│   │   ├── pages/           # Page components
│   │   ├── components/      # Reusable components
│   │   ├── api/             # API utilities
│   │   └── styles/          # CSS files
│   ├── package.json
│   └── tsconfig.json
└── Documentation files
```

---

## 🛠️ Common Tasks

### Add a New Feature

1. **Create API endpoint in backend**
   ```python
   # In routes/new_feature_routes.py
   @router.get("/feature")
   def get_feature(user=Depends(get_current_user)):
       return {"data": "..."}
   ```

2. **Register route in main.py**
   ```python
   app.include_router(new_feature_router, prefix="/features")
   ```

3. **Add API call in frontend**
   ```typescript
   // In api/api.ts
   export const featureAPI = {
     get: (token: string) =>
       axios.get(`${API_BASE_URL}/features`, {
         headers: { Authorization: `Bearer ${token}` },
       }),
   };
   ```

4. **Create frontend component**
   ```typescript
   // In pages/Feature.tsx
   import { featureAPI } from "../api/api";
   // Use the API call
   ```

5. **Add route in App.tsx**
   ```typescript
   <Route path="/feature" element={<Feature />} />
   ```

---

## 🐛 Troubleshooting

### Backend Connection Error
- Check MongoDB is running: `mongod`
- Verify connection string in `database.py`
- Check port 8000 is not in use

### Frontend Not Loading
- Ensure backend is running on `http://localhost:8000`
- Check Node.js version: `node --version`
- Clear npm cache: `npm cache clean --force`

### CORS Error
- Backend CORS is configured for `http://localhost:5173`
- For production, update CORS origins in `main.py`

### Database Not Found
- MongoDB collections are created automatically on first use
- For manual setup, seed with test data from console

---

## 📚 API Documentation

Full interactive API documentation available at:
**`http://localhost:8000/docs`** (Swagger UI)
**`http://localhost:8000/redoc`** (ReDoc)

---

## 🚢 Deployment

### Backend (Docker)
```dockerfile
# Dockerfile
FROM python:3.11
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0"]
```

### Frontend (Vercel/Netlify)
```bash
npm run build
# Deploy dist/ folder
```

---

## 📞 Support

- **API Issues:** Check `/docs` for endpoint details
- **Frontend Issues:** Check browser console for errors
- **Database Issues:** Verify MongoDB connection & structure

---

## 📊 Next Steps

1. ✅ Deploy backend to Cloud (AWS/Azure/GCP)
2. ✅ Deploy frontend to Vercel/Netlify
3. ✅ Setup MongoDB Atlas (cloud database)
4. ✅ Configure email notifications
5. ✅ Setup monitoring & logging
6. ✅ Add WebSocket for real-time updates
7. ✅ Performance optimization & caching

---

**Happy coding! 🚀**

Last Updated: March 23, 2026
Project Status: 75% Complete
