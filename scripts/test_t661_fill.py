#!/usr/bin/env python3
"""
Simple test script to fill T661 with sample data and generate a test PDF.
This allows visual verification of field positions without deploying to Supabase.
"""

import json
from pathlib import Path

try:
    from PyPDF2 import PdfReader, PdfWriter
    from reportlab.pdfgen import canvas
    from reportlab.lib.pagesizes import letter
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    import io
except ImportError:
    print("Error: Required packages not installed")
    print("Run: pip3 install PyPDF2 reportlab")
    exit(1)

# Load field mapping
mapping_path = Path("/Users/jj/rambo2/supabase/field_mappings/t661_mapping.json")
with open(mapping_path) as f:
    mapping = json.load(f)

# Sample test data
test_data = {
    "company_name": "Acme Research Corp",
    "business_number": "123456789RC0001",
    "tax_year": "2024-12-31",
    "project_id": "P001",
    "project_title": "Development of Advanced AI-Powered Quality Control System",
    "project_summary": "This project aims to develop a novel computer vision system that uses deep learning to detect manufacturing defects in real-time.",
    "scientific_advancement": "We are pursuing technological advancement in automated defect detection using novel neural network architectures.",
    "base_knowledge": "Existing computer vision systems lack accuracy for micro-defects. Current ML models require extensive labeled data.",
    "uncertainties": "Whether our proposed architecture can achieve 99% accuracy with limited training data remains unclear.",
    "work_description": "We conducted systematic experiments including: 1) Architecture design, 2) Data augmentation techniques, 3) Transfer learning approaches."
}


# Load template PDF
template_path = Path("/Users/jj/rambo2/supabase/templates/t661-20e.pdf")

# Create output PDF with text overlays
output_path = Path("/Users/jj/rambo2/test_output_t661.pdf")
can = canvas.Canvas(str(output_path), pagesize=letter)

# We'll just draw on page 1 and 2 for initial testing
reader = PdfReader(template_path)
total_pages = len(reader.pages)

print(f"Template PDF has {total_pages} pages")
print("Drawing test data on pages 1-2...")

# For each page, draw the template as background then add text
for page_num in range(min(2, total_pages)):  # Just test first 2 pages
    # Start a new page
    if page_num > 0:
        can.showPage()
    
    # Draw fields for this page
    for section_name, fields in mapping["fields"].items():
        for field_name, field_config in fields.items():
            if field_config["page"] == page_num:
                llm_key = field_config.get("llm_source", field_name)
                value = test_data.get(llm_key, "")
                
                if value:
                    can.setFont("Helvetica", field_config["fontSize"])
                    # Truncate long text for testing
                    text = str(value)[:80] if not field_config.get("multiline") else str(value)[:200]
                    can.drawString(field_config["x"], field_config["y"], text)
                    print(f"  Page {page_num + 1}: {field_name} at ({field_config['x']}, {field_config['y']})")

can.save()


print(f"✅ Test PDF created: {output_path}")
print("Open this PDF and compare with your screenshots to see if fields are in the right positions.")
print("\nThen tell me adjustments like:")
print("  - 'company_name is too high, move down 20 points'")
print("  - 'project_title is too far left, move right 30 points'")
