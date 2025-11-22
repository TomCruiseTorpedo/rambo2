// scripts/test_t661_fill_labeled.js
// Better test script with field labels and boxes for clarity

import { readFile, writeFile } from "fs/promises";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

const mappingPath = "/Users/jj/rambo2/supabase/field_mappings/t661_mapping.json";
const templatePath = "/Users/jj/rambo2/supabase/templates/t661-20e.pdf";
const outputPath = "/Users/jj/rambo2/test_output_t661_labeled.pdf";

// Shorter, clearer test data
const testData = {
    company_name: "TEST COMPANY",
    business_number: "123456789",
    tax_year: "2024",
    project_id: "001",
    project_title: "Test Project Title",
    project_summary: "Short test description here.",
    scientific_advancement: "Test advancement text.",
    base_knowledge: "Test knowledge base.",
    uncertainties: "Test uncertainties.",
    work_description: "Test work performed."
};

(async () => {
    try {
        const mapping = JSON.parse(await readFile(mappingPath, "utf-8"));
        const pdfBytes = await readFile(templatePath);
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

        console.log(`Adding LABELED test overlays...\n`);

        // Process each field
        for (const [sectionName, fields] of Object.entries(mapping.fields)) {
            for (const [fieldName, fieldConfig] of Object.entries(fields)) {
                const llmKey = fieldConfig.llm_source || fieldName;
                const value = testData[llmKey];

                if (!value) continue;

                const page = pdfDoc.getPage(fieldConfig.page);

                // Draw a BLUE rectangle showing the field boundary
                const boxWidth = fieldConfig.maxWidth || 200;
                const boxHeight = fieldConfig.multiline ? (fieldConfig.maxHeight || 50) : 15;

                page.drawRectangle({
                    x: fieldConfig.x - 2,
                    y: fieldConfig.y - 2,
                    width: boxWidth,
                    height: boxHeight,
                    borderColor: rgb(0, 0, 1), // Blue border
                    borderWidth: 1,
                });

                // Draw FIELD LABEL above the box (in GREEN)
                page.drawText(`[${fieldName}]`, {
                    x: fieldConfig.x,
                    y: fieldConfig.y + boxHeight + 5,
                    size: 8,
                    font: fontBold,
                    color: rgb(0, 0.7, 0), // Dark green
                });

                // Draw actual test value (in BLACK)
                const displayText = String(value).substring(0, 40); // Keep it short
                page.drawText(displayText, {
                    x: fieldConfig.x,
                    y: fieldConfig.y,
                    size: fieldConfig.fontSize,
                    font: font,
                    color: rgb(0, 0, 0), // Black for readability
                });

                console.log(`✓ Page ${fieldConfig.page + 1}: [${fieldName}] at (${fieldConfig.x}, ${fieldConfig.y})`);
            }
        }

        const filledBytes = await pdfDoc.save();
        await writeFile(outputPath, filledBytes);

        console.log(`\n✅ LABELED test PDF created: ${outputPath}`);
        console.log("\n📋 What to look for:");
        console.log("- GREEN text = field name labels");
        console.log("- BLUE boxes = field boundaries");
        console.log("- BLACK text = sample values");
        console.log("\nCompare with your original screenshots to see if boxes align with actual fields!");
    } catch (e) {
        console.error("Error:", e);
        process.exit(1);
    }
})();
