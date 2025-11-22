// scripts/test_t661_fill.js
// Node script to test T661 field positions by overlaying colored text on the actual PDF

import { readFile, writeFile } from "fs/promises";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

const mappingPath = "/Users/jj/rambo2/supabase/field_mappings/t661_mapping.json";
const templatePath = "/Users/jj/rambo2/supabase/templates/t661-20e.pdf";
const outputPath = "/Users/jj/rambo2/test_output_t661.pdf";

// Sample test data
const testData = {
    company_name: "ACME RESEARCH CORP",
    business_number: "123456789RC0001",
    tax_year: "2024-12-31",
    project_id: "P001",
    project_title: "AI-Powered Quality Control System",
    project_summary: "This project develops a novel computer vision system using deep learning for real-time defect detection in manufacturing.",
    scientific_advancement: "We pursue technological advancement in automated defect detection using novel neural network architectures that can achieve higher accuracy with less training data.",
    base_knowledge: "Existing computer vision systems lack accuracy for micro-defects below 0.1mm. Current ML models require 10,000+ labeled samples per defect type.",
    uncertainties: "Whether our proposed hybrid CNN-Transformer architecture can achieve 99% accuracy with only 500 training samples per defect type remains scientifically uncertain.",
    work_description: "We conducted systematic experiments: 1) Novel architecture design combining CNNs with attention mechanisms, 2) Advanced data augmentation techniques, 3) Transfer learning from pre-trained models."
};

(async () => {
    try {
        // Load mapping and PDF
        const mapping = JSON.parse(await readFile(mappingPath, "utf-8"));
        const pdfBytes = await readFile(templatePath);
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

        console.log(`PDF has ${pdfDoc.getPageCount()} pages`);
        console.log("Adding test text overlays (in RED for visibility)...\n");

        // Overlay text on pages
        for (const [sectionName, fields] of Object.entries(mapping.fields)) {
            for (const [fieldName, fieldConfig] of Object.entries(fields)) {
                const llmKey = fieldConfig.llm_source || fieldName;
                const value = testData[llmKey];

                if (!value) continue;

                const page = pdfDoc.getPage(fieldConfig.page);
                const textValue = String(value);

                if (fieldConfig.multiline && fieldConfig.maxWidth) {
                    // Handle multi-line text
                    const words = textValue.split(" ");
                    const lines = [];
                    let currentLine = "";

                    for (const word of words) {
                        const testLine = currentLine ? `${currentLine} ${word}` : word;
                        const width = font.widthOfTextAtSize(testLine, fieldConfig.fontSize);

                        if (width > fieldConfig.maxWidth && currentLine) {
                            lines.push(currentLine);
                            currentLine = word;
                        } else {
                            currentLine = testLine;
                        }
                    }
                    if (currentLine) lines.push(currentLine);

                    const maxLines = fieldConfig.maxHeight
                        ? Math.floor(fieldConfig.maxHeight / (fieldConfig.fontSize * 1.2))
                        : lines.length;

                    for (let i = 0; i < Math.min(lines.length, maxLines); i++) {
                        page.drawText(lines[i], {
                            x: fieldConfig.x,
                            y: fieldConfig.y - i * fieldConfig.fontSize * 1.2,
                            size: fieldConfig.fontSize,
                            font: font,
                            color: rgb(1, 0, 0), // RED for testing visibility
                        });
                    }

                    console.log(
                        `✓ Page ${fieldConfig.page + 1}: ${fieldName} (multiline, ${lines.length} lines) at (${fieldConfig.x}, ${fieldConfig.y})`
                    );
                } else {
                    // Single-line text
                    const displayText = textValue.substring(0, 60);
                    page.drawText(displayText, {
                        x: fieldConfig.x,
                        y: fieldConfig.y,
                        size: fieldConfig.fontSize,
                        font: font,
                        color: rgb(1, 0, 0), // RED for testing visibility
                    });

                    console.log(
                        `✓ Page ${fieldConfig.page + 1}: ${fieldName} at (${fieldConfig.x}, ${fieldConfig.y})`
                    );
                }
            }
        }

        // Save
        const filledBytes = await pdfDoc.save();
        await writeFile(outputPath, filledBytes);

        console.log(`\n✅ Test PDF created: ${outputPath}`);
        console.log("\n📋 Next steps:");
        console.log("1. Open test_output_t661.pdf");
        console.log("2. Compare with your screenshots");
        console.log("3. For each RED text field, tell me:");
        console.log("   - 'field_name: move up/down X points'");
        console.log("   - 'field_name: move left/right X points'");
        console.log("   - 'field_name: looks good'");
    } catch (e) {
        console.error("Error:", e);
        process.exit(1);
    }
})();
