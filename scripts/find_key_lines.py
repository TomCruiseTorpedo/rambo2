#!/usr/bin/env python3
"""
Find specific T661 line numbers (242, 244, 246) in the extracted field data.
"""

import json
from pathlib import Path

smart_map_path = Path("/Users/jj/rambo2/supabase/field_mappings/t661_smart_map.json")

with open(smart_map_path) as f:
    data = json.load(f)

target_lines = ["242", "244", "246"]

print("="*60)
print("FINDING KEY T661 LINE NUMBERS: 242, 244, 246")
print("="*60)

for page_key, fields in data.items():
    for field in fields:
        label = field["predicted_label"]
        if any(line_num in label for line_num in target_lines):
            print(f"\n✓ Found: Line {label}")
            print(f"  Page: {field['page']}")
            print(f"  ID: {field['id']}")
            print(f"  Type: {field['type']}")
            print(f"  Coordinates: {field['coordinates']}")
            print(f"  Dimensions: {field['dimensions']['width']}x{field['dimensions']['height']} pts")

print("\n" + "="*60)
