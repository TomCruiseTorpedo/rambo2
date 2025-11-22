#!/usr/bin/env python3
"""
Extract form field coordinates with intelligent text-to-box association.
User-provided solution that works on static PDF with text coordinate extraction.
"""

import PyPDF2
import re
import json

def generate_form_map(pdf_path, output_json_path):
    full_data = {}
    
    print(f"Processing {pdf_path}...")
    with open(pdf_path, 'rb') as f:
        reader = PyPDF2.PdfReader(f)
        
        for i, page in enumerate(reader.pages):
            page_num = i + 1
            page_key = f"page_{page_num}"
            page_items = []
            
            # --- Step 1: Extract Text with Coordinates ---
            text_elements = []
            def visitor_body(text, cm, tm, font_dict, font_size):
                if text and text.strip():
                    # tm[4] = x, tm[5] = y
                    text_elements.append({'text': text.strip(), 'x': tm[4], 'y': tm[5]})
            
            try:
                # Iterate over all text on the page to create "Label Anchors"
                page.extract_text(visitor_text=visitor_body)
            except Exception:
                pass 
            
            # --- Step 2: Extract Visual Boxes (Raw Content Stream) ---
            rects = []
            contents = page.get_contents()
            # Handle single content stream or array of streams
            content_list = contents if isinstance(contents, list) else [contents] if contents else []
                
            for content_obj in content_list:
                try:
                    data = content_obj.get_data()
                    # Regex to find 're' operators (rectangles) in the PDF code: x y w h re
                    matches = re.findall(br'(-?\d+\.?\d*) (-?\d+\.?\d*) (-?\d+\.?\d*) (-?\d+\.?\d*) re', data)
                    for m in matches:
                        x, y, w, h = float(m[0]), float(m[1]), float(m[2]), float(m[3])
                        # Normalize negative dimensions
                        if w < 0: x += w; w = -w
                        if h < 0: y += h; h = -h
                        rects.append({'x': x, 'y': y, 'w': w, 'h': h})
                except Exception:
                    continue

            # --- Step 3: Smart Association (Map Text to Boxes) ---
            for rect in rects:
                w, h = rect['w'], rect['h']
                # Filter out tiny noise or huge page borders
                if w < 8 or h < 8 or (w > 500 and h > 700): continue
                
                field_type = "checkbox" if (w < 20 and h < 20) else "text_field"
                
                # Find the nearest text label
                best_label = "Unknown_Field"
                min_dist = 300
                rect_mid_y = rect['y'] + h/2
                
                for txt in text_elements:
                    # 1. Check if text is roughly on the same horizontal line (Y-axis aligned)
                    if abs(txt['y'] - rect_mid_y) < 20:
                        # 2. Check if text is to the left of the box
                        dist = rect['x'] - txt['x']
                        if -50 < dist < min_dist: # Allow -50 overlap for tight forms
                            min_dist = dist
                            best_label = txt['text']
                
                # Fallback: Check for label directly ABOVE the box (common in forms)
                if best_label == "Unknown_Field":
                    min_dist_y = 100
                    for txt in text_elements:
                        # Check if text horizontal range overlaps the box
                        if (txt['x'] < rect['x'] + w) and (txt['x'] + 50 > rect['x']):
                            dist_y = txt['y'] - (rect['y'] + h) # Distance above box
                            if 0 < dist_y < min_dist_y:
                                min_dist_y = dist_y
                                best_label = txt['text']

                page_items.append({
                    "label": best_label,
                    "type": field_type,
                    "bbox": [round(rect['x'], 1), round(rect['y'], 1), round(rect['x'] + w, 1), round(rect['y'] + h, 1)],
                    "width": round(w, 1),
                    "height": round(h, 1)
                })
            
            if page_items:
                full_data[page_key] = page_items

    # Save mapping to JSON
    with open(output_json_path, 'w') as f:
        json.dump(full_data, f, indent=2)
    print(f"Success! Map saved to {output_json_path}")

# Run this on your STATIC file
generate_form_map('/Users/jj/rambo2/supabase/templates/t661-20e.pdf', '/Users/jj/rambo2/supabase/field_mappings/t661_full_map.json')
