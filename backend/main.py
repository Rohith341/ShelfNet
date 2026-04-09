from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from routes.user_routes import router as user_router
from routes.warehouse_routes import router as warehouse_router
from routes.batch_routes import router as batch_router
from routes.sensor_routes import router as sensor_router
from routes.ingestion_routes import router as ingestion_router
from routes.prediction_routes import router as prediction_router
from routes.alert_routes import router as alert_router
from routes.manager_dashboard_routes import router as manager_router
from routes.admin_dashboard_routes import router as admin_router
from routes.sales_dashboard_routes import router as sales_router
from routes.auth_routes import router as auth_router
from routes.diagnostic_routes import router as diagnostic_router
from database import users_collection
from utils.security import hash_password
from simulator.sensor_simulator import start_real_time_simulation, stop_real_time_simulation
import uuid
import threading

# Initialize admin user on startup
def init_admin_user():
    """Initialize database with admin user if not exists"""
    admin = users_collection.find_one({"email": "admin@test.com"})
    
    if not admin:
        admin_user = {
            "user_id": str(uuid.uuid4()),
            "email": "admin@test.com",
            "password_hash": hash_password("Admin@123"),
            "role": "ADMIN",
            "status": "ACTIVE",
            "password_set": True,
            "warehouse_id": None
        }
        users_collection.insert_one(admin_user)
        print("✓ Admin user created: admin@test.com / Admin@123")
    else:
        print("✓ Admin user already exists")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("🚀 Starting ShelfNet Backend...")
    init_admin_user()

    # Start real-time sensor simulation
    print("🏭 Starting real-time sensor simulator...")
    simulator_thread = threading.Thread(
        target=start_real_time_simulation,
        args=(30,),  # 30-minute intervals
        daemon=True
    )
    simulator_thread.start()

    yield
    # Shutdown
    print("🛑 Shutting down ShelfNet Backend...")
    stop_real_time_simulation()
    print("✅ Shutdown complete")

app = FastAPI(title="ShelfNet Backend", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(user_router, prefix="/users")
app.include_router(warehouse_router, prefix="/warehouses")
app.include_router(batch_router, prefix="/batches")
app.include_router(sensor_router, prefix="/sensors")
app.include_router(ingestion_router, prefix="/sensors")
app.include_router(prediction_router, prefix="/predict")
app.include_router(alert_router, prefix="/alerts")
app.include_router(manager_router)
app.include_router(admin_router)
app.include_router(sales_router)
app.include_router(auth_router)
app.include_router(diagnostic_router, prefix="/api/v1/diagnostics", tags=["diagnostics"])

# Health check endpoint
@app.get("/health")
def health():
    return {"status": "ok", "service": "ShelfNet Backend"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
