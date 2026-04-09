import sys
import os
sys.path.insert(0, r'R:\Major_NO\temp1\ShelfNet\backend')
os.chdir(r'R:\Major_NO\temp1\ShelfNet\backend')

try:
    print("Trying to import prediction_service...")
    from services import prediction_service
    print("✓ prediction_service imported successfully")
except ImportError as e:
    print(f"✗ Import error: {e}")
    import traceback
    traceback.print_exc()
