#!/usr/bin/env python3
"""
Extract T661 form field coordinates using proxy mapping.
User-provided implementation with smart label detection.
"""

import pdfplumber
import json
import uuid
from pathlib import Path

def map_pdf_fields_with_labels(pdf_path, output_json):
    form_data = {}
    
    # Tweakable settings for "What looks like a form field?"
    MIN_WIDTH = 8       # Minimum width of a box to be considered a field
    MIN_HEIGHT = 8      # Minimum height
    MAX_HEIGHT = 50     # Max height (avoids capturing page borders)
    LABEL_SEARCH_DIST = 200 # How far left to look for a label (in points)

    with pdfplumber.open(pdf_path) as pdf:
        print(f"Processing {len(pdf.pages)} pages...")
        
        for i, page in enumerate(pdf.pages):
            page_num = i + 1
            page_key = f"page_{page_num}"
            form_data[page_key] = []
            
            words = page.extract_words()
            rects = page.rects # graphical rectangles
            
            print(f"  Page {page_num}: Found {len(rects)} graphical elements.")

            for rect in rects:
                # 1. Filter Geometry
                w = rect['width']
                h = rect['height']
                
                if not (MIN_WIDTH < w and MIN_HEIGHT < h < MAX_HEIGHT):
                    continue # Skip visual noise or page borders
                
                # 2. Identify Type
                # Checkboxes are usually roughly square and small
                field_type = "checkbox" if (w < 20 and h < 20) else "text_field"
                
                # 3. Spatial Label Search (The Upgrade)
                # We look for text that is to the left of the box, roughly on the same Y-axis
                box_y_center = rect['top'] + (h / 2)
                box_x_left = rect['x0']
                
                best_label = "Unknown_Field"
                shortest_dist = LABEL_SEARCH_DIST
                
                for word in words:
                    # Check if word is roughly on the same line (within 10pts vertically)
                    word_y_center = word['top'] + (word['height'] / 2)
                    if abs(word_y_center - box_y_center) < 10:
                        # Check if word is to the left
                        dist = box_x_left - word['x1']
                        if 0 < dist < shortest_dist:
                            best_label = word['text']
                            shortest_dist = dist
                            
                # 4. Compile Data
                field_entry = {
                    "id": str(uuid.uuid4())[:8],
                    "predicted_label": best_label, # e.g. "Name", "SIN", "Date"
                    "type": field_type,
                    "page": page_num,
                    "coordinates": {
                        "x0": round(rect['x0'], 2), # Left
                        "y0": round(rect['top'], 2), # Top
                        "x1": round(rect['x1'], 2), # Right
                        "y1": round(rect['bottom'], 2) # Bottom
                    },
                    "dimensions": {
                        "width": round(w, 2),
                        "height": round(h, 2)
                    }
                }
                form_data[page_key].append(field_entry)

    # Save to JSON
    with open(output_json, 'w') as f:
        json.dump(form_data, f, indent=2)
    
    total_fields = sum(len(v) for v in form_data.values())
    print(f"\n✅ Analysis Complete. Mapped {total_fields} fields across {len(form_data)} pages.")
    print(f"📄 Output saved to: {output_json}")
    return total_fields

# EXECUTION
# We run this on the STATIC file to generate coordinates for the XFA file
pdf_path = '/Users/jj/rambo2/supabase/templates/t661-20e.pdf'
output_json = '/Users/jj/rambo2/supabase/field_mappings/t661_smart_map.json'

print("="*60)
print("T661 FIELD COORDINATE EXTRACTION (Proxy Mapping)")
print("="*60)
print(f"Source PDF: {pdf_path}")
print(f"Output JSON: {output_json}\n")

map_pdf_fields_with_labels(pdf_path, output_json)

print("="*60)
