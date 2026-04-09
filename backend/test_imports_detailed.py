#!/usr/bin/env python
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.chdir(os.path.dirname(os.path.abspath(__file__)))

print("Python path:", sys.path[:3])
print("Current dir:", os.getcwd())

try:
    print("\n1. Testing services import...")
    import services
    print("   ✓ services imported")
    
    print("\n2. Testing services.prediction_service import...")
    from services import prediction_service
    print("   ✓ services.prediction_service imported")
    
    print("\n3. Testing predict_for_batch import...")
    from services.prediction_service import predict_for_batch
    print("   ✓ predict_for_batch imported")
    
    print("\n✅ All imports successful!")
    
except Exception as e:
    print(f"\n✗ Error: {e}")
    import traceback
    traceback.print_exc()
