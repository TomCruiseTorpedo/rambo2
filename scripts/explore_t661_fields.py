#!/usr/bin/env python3
"""
Explore the extracted T661 fields to identify which ones to map to LLM output.
"""

import json
from pathlib import Path

smart_map_path = Path("/Users/jj/rambo2/supabase/field_mappings/t661_smart_map.json")

with open(smart_map_path) as f:
    data = json.load(f)

print("="*60)
print("T661 FIELD EXPLORER")
print("="*60)

for page_key, fields in data.items():
    page_num = page_key.split("_")[1]
    print(f"\n📄 PAGE {page_num} ({len(fields)} fields)")
    print("-"*60)
    
    # Show labeled fields (not "Unknown_Field")
    labeled = [f for f in fields if f["predicted_label"] != "Unknown_Field"]
    
    if labeled:
        print(f"  ✓ {len(labeled)} labeled fields:")
        for field in labeled[:10]:  # Show first 10
            print(f"    • {field['predicted_label']:30s} (ID: {field['id']}, Type: {field['type']})")
        if len(labeled) > 10:
            print(f"    ... and {len(labeled) - 10} more")
    else:
        print(f"  ⚠️  No labeled fields found (all Unknown_Field)")
    
    # Show field type distribution
    text_fields = len([f for f in fields if f["type"] == "text_field"])
    checkboxes = len([f for f in fields if f["type"] == "checkbox"])
    print(f"\n  Distribution: {text_fields} text fields, {checkboxes} checkboxes")

print("\n" + "="*60)
print("\n💡 Suggested next step:")
print("Review the labeled fields above and identify which ones should receive")
print("LLM-generated content (e.g., project title, description, etc.)")
print("="*60)
