#!/usr/bin/env python3
"""
Test prediction pipeline and get diagnostic info
"""
import requests
import json
import time

BASE_URL = "http://127.0.0.1:8000"

def get_token():
    """Get admin token"""
    resp = requests.post(f"{BASE_URL}/auth/login", json={
        "email": "admin@test.com",
        "password": "Admin@123"
    })
    if resp.status_code == 200:
        return resp.json()["access_token"]
    return None

def main():
    print("🔍 ShelfNet Prediction Pipeline Diagnostic\n")
    print("=" * 70)
    
    token = get_token()
    if not token:
        print("❌ Failed to authenticate")
        return
    
    print("✅ Authenticated as admin\n")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Get prediction pipeline health
    print("📊 Checking Prediction Pipeline Health...")
    resp = requests.get(
        f"{BASE_URL}/api/v1/diagnostics/health/prediction-pipeline",
        headers=headers
    )
    
    if resp.status_code != 200:
        print(f"❌ Error: {resp.text}")
        return
    
    data = resp.json()
    
    # Print ML Model Status
    print(f"\n🤖 ML Model Status:")
    print(f"   {data['ml_model']}")
    print(f"   Features: {', '.join(data['sequence_requirements']['features'])}")
    print(f"   Sequence Length Required: {data['sequence_requirements']['sequence_length_required']}")
    
    # Print Database Status
    db = data['database']
    print(f"\n📦 Database Status:")
    print(f"   Active Batches: {db['active_batches']}")
    print(f"   Active Sensors: {db['active_sensors']}")
    print(f"   Total Sensor Readings: {db['total_sensor_readings']}")
    print(f"   Batches with Predictions: {db['batches_with_predictions']}/{db['active_batches']}")
    
    # Print Batch Details
    print(f"\n🔄 Batch Readiness Status:")
    print("-" * 70)
    
    batches = data['batch_readiness']
    if not batches:
        print("   No batches found")
    else:
        for batch in batches:
            status_icon = "✅" if batch['has_prediction'] else ("⚠️" if batch['can_predict'] else "⏳")
            readings_status = f"{batch['readings_count']}/{batch['required_for_prediction']}"
            prediction_str = f"{batch['prediction_value']}d" if batch['has_prediction'] else "N/A"
            
            print(f"\n   {status_icon} {batch['batch_id']} ({batch['fruit']})")
            print(f"      Readings: {readings_status}")
            print(f"      Prediction: {prediction_str}")
            print(f"      Ready: {'Yes' if batch['can_predict'] else 'No'}")
            print(f"      Sensor: {'Assigned' if batch['sensor_assigned'] else 'Not Assigned'}")
    
    # Overall Recommendation
    print(f"\n💡 Recommendation:")
    print(f"   {data['recommendation']}")
    
    print("\n" + "=" * 70)
    print("\n📋 Available Actions:")
    print("   - POST /api/v1/diagnostics/trigger-predictions (admin)")
    print("   - POST /api/v1/diagnostics/generate-initial-readings/{batch_id} (admin)")
    print("   - GET /api/v1/diagnostics/batch/{batch_id}/prediction-status")

if __name__ == "__main__":
    main()
