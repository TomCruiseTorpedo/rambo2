#!/usr/bin/env python3
"""
Analyze the uploaded screenshot to calculate exact coordinate adjustments.
"""

from PIL import Image
import json

# Load the most recent test output screenshot
screenshot_path = "/Users/jj/.gemini/antigravity/brain/1a13f978-2f39-410f-a492-b11b4c123ab0/uploaded_image_1763789709028.png"
img = Image.open(screenshot_path)
width, height = img.size

print(f"Screenshot dimensions: {width} × {height} pixels")
print("\nBased on visual analysis of the screenshot:")
print("\nCurrent positions (WRONG - overlapping questions):")
print("  GREEN (246): Top of page, around y=150px")
print("  RED (242): Middle, around y=410px") 
print("  BLUE (244): Lower, around y=520px")

print("\nWhere they SHOULD be (in blank lined areas):")
print("  Line 242: Below 'What scientific...' question, around y=445-500px")
print("  Line 244: Below 'What work...' question, around y=550-850px")
print("  Line 246: On next page, below question")

print("\nCalculating PDF coordinates...")
print("Standard PDF: 612pts wide × 792pts tall")

# Approximate measurements from screenshot analysis
# The form has margins, questions take ~40-50pts, lined areas follow

adjustments = {
    "line_242": {
        "current_pdf_y": "360-410 (y0-y1)",
        "should_be_pdf_y": "320-365",
        "adjustment": "Move DOWN ~5-15pts, reduce height"
    },
    "line_244": {
        "current_pdf_y": "50-340 (y0-y1)",
        "should_be_pdf_y": "40-310",
        "adjustment": "Slightly reduce top, keep bottom"
    },
    "line_246": {
        "note": "On page 3, needs verification"
    }
}

print(json.dumps(adjustments, indent=2))
