// scripts/validate_field_mappings.js
// Script to validate T661 field coordinate mappings and identify potential issues

import { readFile, writeFile } from "fs/promises";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const MAPPING_PATH = "./supabase/field_mappings/t661_critical_fields.json";
const TEMPLATE_PATH = "./supabase/templates/t661-20e.pdf";

/**
 * Validates field mapping coordinates and dimensions
 */
function validateFieldMapping(fieldName, fieldDef) {
    const errors = [];
    const warnings = [];
    
    // Check required properties
    const requiredProps = ['coordinates', 'dimensions', 'font_size', 'line_height', 'max_words', 'max_lines', 'page'];
    for (const prop of requiredProps) {
        if (!fieldDef[prop]) {
            errors.push(`Missing required property: ${prop}`);
        }
    }
    
    if (fieldDef.coordinates) {
        const { x0, y0, x1, y1 } = fieldDef.coordinates;
        
        // Validate coordinate types
        if (typeof x0 !== 'number' || typeof y0 !== 'number' || 
            typeof x1 !== 'number' || typeof y1 !== 'number') {
            errors.push("Coordinates must be numbers");
        }
        
        // Validate coordinate bounds (PDF coordinate system: origin at bottom-left)
        if (x0 >= x1) {
            errors.push(`Invalid X coordinates: x0 (${x0}) must be less than x1 (${x1})`);
        }
        
        if (y0 <= y1) {
            errors.push(`Invalid Y coordinates: y0 (${y0}) must be greater than y1 (${y1}) in PDF coordinate system`);
        }
        
        // Check if coordinates are within standard page bounds (Letter size: 612x792 points)
        if (x0 < 0 || x1 > 612) {
            warnings.push(`X coordinates may be outside page bounds: x0=${x0}, x1=${x1} (page width=612)`);
        }
        
        if (y1 < 0 || y0 > 792) {
            warnings.push(`Y coordinates may be outside page bounds: y0=${y0}, y1=${y1} (page height=792)`);
        }
        
        // Validate dimensions match coordinates
        if (fieldDef.dimensions) {
            const expectedWidth = x1 - x0;
            const expectedHeight = y0 - y1;
            
            if (Math.abs(fieldDef.dimensions.width - expectedWidth) > 0.1) {
                errors.push(`Width mismatch: dimensions.width=${fieldDef.dimensions.width}, calculated=${expectedWidth}`);
            }
            
            if (Math.abs(fieldDef.dimensions.height - expectedHeight) > 0.1) {
                errors.push(`Height mismatch: dimensions.height=${fieldDef.dimensions.height}, calculated=${expectedHeight}`);
            }
        }
    }
    
    // Validate font and layout properties
    if (fieldDef.font_size) {
        if (fieldDef.font_size < 6 || fieldDef.font_size > 20) {
            warnings.push(`Unusual font size: ${fieldDef.font_size} (typical range: 6-20)`);
        }
    }
    
    if (fieldDef.line_height && fieldDef.font_size) {
        if (fieldDef.line_height < fieldDef.font_size) {
            warnings.push(`Line height (${fieldDef.line_height}) is less than font size (${fieldDef.font_size})`);
        }
        
        if (fieldDef.line_height > fieldDef.font_size * 2) {
            warnings.push(`Line height (${fieldDef.line_height}) is unusually large compared to font size (${fieldDef.font_size})`);
        }
    }
    
    // Validate capacity constraints
    if (fieldDef.dimensions && fieldDef.line_height) {
        const maxPossibleLines = Math.floor(fieldDef.dimensions.height / fieldDef.line_height);
        if (fieldDef.max_lines > maxPossibleLines) {
            warnings.push(`max_lines (${fieldDef.max_lines}) exceeds physical capacity (${maxPossibleLines} lines)`);
        }
    }
    
    // Validate page index
    if (typeof fieldDef.page === 'number' && fieldDef.page < 0) {
        errors.push(`Invalid page index: ${fieldDef.page} (must be >= 0)`);
    }
    
    return { errors, warnings };
}

/**
 * Estimates text capacity for a field
 */
function estimateTextCapacity(fieldDef) {
    if (!fieldDef.dimensions || !fieldDef.font_size) {
        return null;
    }
    
    // Rough estimates based on typical character widths
    const avgCharWidth = fieldDef.font_size * 0.6; // Approximate for Helvetica
    const usableWidth = fieldDef.dimensions.width - 10; // Account for padding
    const charsPerLine = Math.floor(usableWidth / avgCharWidth);
    const maxLines = fieldDef.max_lines || Math.floor(fieldDef.dimensions.height / fieldDef.line_height);
    const totalChars = charsPerLine * maxLines;
    const estimatedWords = Math.floor(totalChars / 5); // Average word length ~5 chars
    
    return {
        charsPerLine,
        maxLines,
        totalChars,
        estimatedWords,
        configuredMaxWords: fieldDef.max_words
    };
}

/**
 * Creates a visual test PDF with field boundaries and test text
 */
async function createVisualTestPDF(mapping, templatePath, outputPath) {
    try {
        const pdfBytes = await readFile(templatePath);
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        
        const fieldKeys = ['line_242_uncertainties', 'line_244_work_performed', 'line_246_advancements'];
        
        for (const key of fieldKeys) {
            const fieldDef = mapping[key];
            if (!fieldDef) continue;
            
            const page = pdfDoc.getPage(fieldDef.page);
            const { x0, y0, x1, y1 } = fieldDef.coordinates;
            
            // Draw field boundary rectangle
            page.drawRectangle({
                x: x0,
                y: y1,
                width: fieldDef.dimensions.width,
                height: fieldDef.dimensions.height,
                borderColor: rgb(1, 0, 0), // Red border
                borderWidth: 1,
                color: rgb(1, 1, 0), // Yellow fill with transparency
                opacity: 0.1
            });
            
            // Draw field label
            page.drawText(`${fieldDef.cra_line}: ${fieldDef.title}`, {
                x: x0 + 5,
                y: y0 + 5,
                size: 8,
                font: boldFont,
                color: rgb(1, 0, 0)
            });
            
            // Draw coordinate info
            page.drawText(`(${x0}, ${y1}) to (${x1}, ${y0})`, {
                x: x0 + 5,
                y: y0 + 15,
                size: 6,
                font: font,
                color: rgb(0, 0, 1)
            });
            
            // Draw sample text to test positioning
            const sampleText = `Sample text for ${key}. This text tests the positioning and wrapping behavior within the defined field boundaries.`;
            const words = sampleText.split(' ');
            const lines = [];
            let currentLine = '';
            
            for (const word of words) {
                const testLine = currentLine ? `${currentLine} ${word}` : word;
                const width = font.widthOfTextAtSize(testLine, fieldDef.font_size);
                
                if (width > fieldDef.dimensions.width - 10 && currentLine) {
                    lines.push(currentLine);
                    currentLine = word;
                } else {
                    currentLine = testLine;
                }
            }
            if (currentLine) lines.push(currentLine);
            
            // Render sample text
            let y = y1 - fieldDef.line_height + (fieldDef.text_padding_top || 0);
            for (let i = 0; i < Math.min(lines.length, 3); i++) {
                page.drawText(lines[i], {
                    x: x0 + 5,
                    y: y,
                    size: fieldDef.font_size,
                    font: font,
                    color: rgb(0, 0, 0)
                });
                y -= fieldDef.line_height;
            }
        }
        
        const filledBytes = await pdfDoc.save();
        await writeFile(outputPath, filledBytes);
        return true;
    } catch (error) {
        console.error("Error creating visual test PDF:", error);
        return false;
    }
}

/**
 * Main validation function
 */
async function validateMappings() {
    console.log("🔍 Validating T661 Field Mappings");
    console.log("=".repeat(50));
    
    try {
        // Load mapping file
        const mappingText = await readFile(MAPPING_PATH, 'utf-8');
        const mapping = JSON.parse(mappingText);
        
        console.log(`📄 Loaded mapping: ${mapping.metadata?.description || 'No description'}`);
        console.log(`🔧 Extraction method: ${mapping.metadata?.extraction_method || 'Unknown'}`);
        
        const fieldKeys = ['line_242_uncertainties', 'line_244_work_performed', 'line_246_advancements'];
        let totalErrors = 0;
        let totalWarnings = 0;
        
        for (const key of fieldKeys) {
            console.log(`\n📋 Validating ${key}:`);
            
            const fieldDef = mapping[key];
            if (!fieldDef) {
                console.log(`  ❌ Field definition missing`);
                totalErrors++;
                continue;
            }
            
            const validation = validateFieldMapping(key, fieldDef);
            const capacity = estimateTextCapacity(fieldDef);
            
            // Display field info
            console.log(`  📏 Coordinates: (${fieldDef.coordinates?.x0}, ${fieldDef.coordinates?.y1}) → (${fieldDef.coordinates?.x1}, ${fieldDef.coordinates?.y0})`);
            console.log(`  📐 Dimensions: ${fieldDef.dimensions?.width} × ${fieldDef.dimensions?.height} pts`);
            console.log(`  🔤 Font: ${fieldDef.font_size}pt, Line height: ${fieldDef.line_height}pt`);
            console.log(`  📊 Limits: ${fieldDef.max_words} words, ${fieldDef.max_lines} lines`);
            
            if (capacity) {
                console.log(`  💾 Estimated capacity: ~${capacity.estimatedWords} words (${capacity.charsPerLine} chars/line × ${capacity.maxLines} lines)`);
                if (capacity.estimatedWords < capacity.configuredMaxWords) {
                    console.log(`  ⚠️  Physical capacity (${capacity.estimatedWords}) < configured limit (${capacity.configuredMaxWords})`);
                }
            }
            
            // Display validation results
            if (validation.errors.length > 0) {
                console.log(`  ❌ Errors (${validation.errors.length}):`);
                validation.errors.forEach(error => console.log(`    - ${error}`));
                totalErrors += validation.errors.length;
            }
            
            if (validation.warnings.length > 0) {
                console.log(`  ⚠️  Warnings (${validation.warnings.length}):`);
                validation.warnings.forEach(warning => console.log(`    - ${warning}`));
                totalWarnings += validation.warnings.length;
            }
            
            if (validation.errors.length === 0 && validation.warnings.length === 0) {
                console.log(`  ✅ Validation passed`);
            }
        }
        
        console.log("\n" + "=".repeat(50));
        console.log("📊 Validation Summary");
        console.log("=".repeat(50));
        console.log(`✅ Fields validated: ${fieldKeys.length}`);
        console.log(`❌ Total errors: ${totalErrors}`);
        console.log(`⚠️  Total warnings: ${totalWarnings}`);
        
        if (totalErrors === 0) {
            console.log("\n🎉 All field mappings are valid!");
        } else {
            console.log("\n🚨 Field mappings have errors that need to be fixed.");
        }
        
        // Create visual test PDF
        console.log("\n🎨 Creating visual test PDF...");
        const visualTestPath = "./test_field_boundaries.pdf";
        const visualSuccess = await createVisualTestPDF(mapping, TEMPLATE_PATH, visualTestPath);
        
        if (visualSuccess) {
            console.log(`✅ Visual test PDF created: ${visualTestPath}`);
            console.log("📋 Review the PDF to verify field positioning:");
            console.log("  - Red rectangles show field boundaries");
            console.log("  - Sample text shows positioning and wrapping");
            console.log("  - Coordinate labels help verify accuracy");
        }
        
        return {
            totalErrors,
            totalWarnings,
            isValid: totalErrors === 0
        };
        
    } catch (error) {
        console.error("💥 Validation failed:", error.message);
        return {
            totalErrors: 1,
            totalWarnings: 0,
            isValid: false,
            error: error.message
        };
    }
}

// Run validation if called directly
if (import.meta.main) {
    validateMappings().catch(console.error);
}

export { validateMappings, validateFieldMapping, estimateTextCapacity };