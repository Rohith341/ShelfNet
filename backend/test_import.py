#!/usr/bin/env python
"""Check if manager dashboard routes can be imported"""
import sys
sys.path.insert(0, '/root/Major_NO/temp1/ShelfNet/backend')

try:
    from routes import manager_dashboard_routes
    print("✓ manager_dashboard_routes imported successfully")
    print(f"✓ get_active_batches function exists: {hasattr(manager_dashboard_routes, 'get_active_batches')}")
except Exception as e:
    print(f"✗ Import error: {e}")
    import traceback
    traceback.print_exc()
