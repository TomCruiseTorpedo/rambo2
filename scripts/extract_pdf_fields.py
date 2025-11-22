#!/usr/bin/env python3
"""Extract form field names from a PDF using PyPDF2."""

import sys
import json
try:
    from PyPDF2 import PdfReader
except ImportError:
    print("Error: PyPDF2 not installed. Run: pip install PyPDF2", file=sys.stderr)
    sys.exit(1)

if len(sys.argv) < 2:
    print("Usage: python3 extract_pdf_fields.py <pdf_path>", file=sys.stderr)
    sys.exit(1)

pdf_path = sys.argv[1]

try:
    reader = PdfReader(pdf_path)
    
    # Try to get form fields
    if reader.get_form_text_fields():
        fields = reader.get_form_text_fields()
        field_list = [{"name": name, "value": value or ""} for name, value in fields.items()]
        print(json.dumps(field_list, indent=2))
    elif hasattr(reader, 'get_fields') and reader.get_fields():
        # Alternative API
        fields = reader.get_fields()
        field_list = [{"name": name, "type": str(field.get('/FT', 'unknown'))} 
                     for name, field in fields.items()]
        print(json.dumps(field_list, indent=2))
    else:
        print("[]")  # No fields found
        
except Exception as e:
    print(f"Error: {e}", file=sys.stderr)
    sys.exit(1)
