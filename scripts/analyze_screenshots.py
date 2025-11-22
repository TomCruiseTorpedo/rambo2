#!/usr/bin/env python3
"""
Analyze T661 screenshots and manual PDF to create field mapping.
Uses OCR on screenshots to identify field labels and approximate positions.
"""

import sys
import json
from pathlib import Path

try:
    from PIL import Image
    import pytesseract
except ImportError:
    print("Error: Required packages not installed.", file=sys.stderr)
    print("Run: pip3 install pillow pytesseract", file=sys.stderr)
    sys.exit(1)

screenshots_dir = Path("/Users/jj/rambo2/supabase/templates/Screenshots of fillable T661")
screenshots = sorted(screenshots_dir.glob("*.png"))

if not screenshots:
    print("Error: No screenshots found", file=sys.stderr)
    sys.exit(1)

print(f"Found {len(screenshots)} screenshots")
print("\\nAnalyzing page 1...")

# Analyze first page only for now
img = Image.open(screenshots[0])
text = pytesseract.image_to_string(img)
print("\\nExtracted text from Page 1:")
print("=" * 60)
print(text[:1000])  # First 1000 chars
print("=" * 60)
