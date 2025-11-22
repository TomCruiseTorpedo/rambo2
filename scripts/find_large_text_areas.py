#!/usr/bin/env python3
"""
Find the largest text fields in T661 that match Lines 242, 244, 246 descriptions.
These are multi-line narrative boxes (50-100 lines each).
"""

import json
from pathlib import Path

smart_map_path = Path("/Users/jj/rambo2/supabase/field_mappings/t661_smart_map.json")

with open(smart_map_path) as f:
    data = json.load(f)

print("="*60)
print("FINDING LARGE TEXT AREAS FOR LINES 242, 244, 246")
print("="*60)
print("\nSearching for text_field entries with height > 40pts")
print("(These are likely the multi-line narrative boxes)")
print("-"*60)

candidates = []

for page_key, fields in data.items():
    page_num = int(page_key.split("_")[1])
    
    # Focus on pages 2-4 where these narrative sections typically appear
    if page_num not in [2, 3, 4]:
        continue
    
    for field in fields:
        if field["type"] == "text_field":
            height = field["dimensions"]["height"]
            width = field["dimensions"]["width"]
            
            # Large text areas are typically > 40pts high and > 200pts wide
            if height > 40 and width > 200:
                candidates.append({
                    "page": page_num,
                    "id": field["id"],
                    "label": field["predicted_label"],
                    "height": height,
                    "width": width,
                    "coords": field["coordinates"]
                })

# Sort by page then height (largest first)
candidates.sort(key=lambda x: (x["page"], -x["height"]))

print(f"\nFound {len(candidates)} large text areas on pages 2-4:\n")

for i, c in enumerate(candidates, 1):
    print(f"{i}. Page {c['page']}: {c['width']:.0f}×{c['height']:.0f}pts")
    print(f"   ID: {c['id']}")
    print(f"   Label: '{c['label']}'")
    print(f"   Position: ({c['coords']['x0']:.0f}, {c['coords']['y0']:.0f})")
    print()

print("="*60)
print("\n💡 Mapping Recommendation:")
print("The 3 largest boxes on pages 2-4 are likely:")
print("  Line 242 (uncertainties) - First large box on page 2/3")
print("  Line 244 (work performed) - Largest box (100 lines)")
print("  Line 246 (advancements) - Another large box on page 2/3")
print("="*60)
