// scripts/test_critical_fields.js
// Test script to verify lines 242, 244, 246 coordinates on page 2

import { readFile, writeFile } from "fs/promises";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

const mappingPath = "/Users/jj/rambo2/supabase/field_mappings/t661_critical_fields.json";
const templatePath = "/Users/jj/rambo2/supabase/templates/t661-20e.pdf";
const outputPath = "/Users/jj/rambo2/test_critical_fields.pdf";

// Sample LLM-generated narratives
const testData = {
    line_242: "Our project faced significant technological uncertainty in developing a real-time defect detection system capable of identifying micro-defects below 0.1mm using computer vision. Existing solutions required 10,000+ labeled samples per defect type and achieved only 85% accuracy. We were uncertain whether a hybrid CNN-Transformer architecture could achieve 99% accuracy with only 500 training samples per defect type while maintaining real-time processing speeds (<100ms per frame).",

    line_244: "We conducted systematic investigation through three phases:\n\nPhase 1 - Architecture Design (Months 1-3): We hypothesized that combining convolutional layers for feature extraction with transformer attention mechanisms would improve accuracy. We designed 5 candidate architectures and tested them on synthetic data. Results showed the hybrid approach achieved 92% accuracy vs 85% for CNN-only.\n\nPhase 2 - Data Efficiency (Months 4-6): We developed novel data augmentation techniques including physics-based synthetic defect generation and adversarial training. Testing showed we could achieve target accuracy with 600 samples (not quite 500 but close).\n\nPhase 3 - Speed Optimization (Months 7-9): We implemented model quantization and parallel processing. Achieved 95ms inference time, meeting our real-time requirement.",

    line_246: "We achieved advancement in ML-based defect detection: demonstrated that hybrid CNN-Transformer architectures can match human-level accuracy (99%) with 94% fewer training samples than traditional approaches. We also discovered that physics-based synthetic data generation is more effective than standard augmentation for rare defect types. This scientific knowledge advances the field by showing transformers can be effectively applied to manufacturing vision tasks, not just NLP."
};

(async () => {
    try {
        const mapping = JSON.parse(await readFile(mappingPath, "utf-8"));
        const pdfBytes = await readFile(templatePath);
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

        const page = pdfDoc.getPage(1); // Page 2 (0-indexed)

        console.log("Adding test narratives to page 2...\n");

        // Draw each field with colored boxes and labels
        const fields = [
            { key: "line_242_uncertainties", data: testData.line_242, color: rgb(1, 0, 0) },
            { key: "line_244_work_performed", data: testData.line_244, color: rgb(0, 0, 1) },
            { key: "line_246_advancements", data: testData.line_246, color: rgb(0, 0.7, 0) }
        ];

        for (const { key, data, color } of fields) {
            const field = mapping[key];

            // Draw colored border rectangle
            page.drawRectangle({
                x: field.coordinates.x0,
                y: field.coordinates.y0,
                width: field.dimensions.width,
                height: field.dimensions.height,
                borderColor: color,
                borderWidth: 2
            });

            // Draw field label
            page.drawText(`[${field.cra_line}] ${field.title}`, {
                x: field.coordinates.x0,
                y: field.coordinates.y1 + 5,
                size: 8,
                font: font,
                color: color
            });

            // Wrap and draw text (handle newlines)
            const paragraphs = data.split("\n");
            const lines = [];

            for (const para of paragraphs) {
                if (!para.trim()) {
                    lines.push(""); // Preserve blank lines
                    continue;
                }

                const words = para.split(" ");
                let currentLine = "";

                for (const word of words) {
                    const testLine = currentLine ? `${currentLine} ${word}` : word;
                    const width = font.widthOfTextAtSize(testLine, field.font_size);

                    if (width > field.dimensions.width - 10 && currentLine) {
                        lines.push(currentLine);
                        currentLine = word;
                    } else {
                        currentLine = testLine;
                    }
                }
                if (currentLine) lines.push(currentLine);
            }

            // Draw text lines
            let y = field.coordinates.y1 - field.line_height;
            for (const line of lines.slice(0, field.max_lines)) {
                page.drawText(line, {
                    x: field.coordinates.x0 + 5,
                    y: y,
                    size: field.font_size,
                    font: font,
                    color: rgb(0, 0, 0)
                });
                y -= field.line_height;
            }

            console.log(`✓ ${field.cra_line}: ${field.title}`);
            console.log(`  Rendered ${lines.length} lines (limit: ${field.max_lines})`);
            console.log(`  Word count: ${data.split(" ").length} (limit: ${field.max_words})\n`);
        }

        const filledBytes = await pdfDoc.save();
        await writeFile(outputPath, filledBytes);

        console.log(`✅ Test PDF created: ${outputPath}`);
        console.log("\n📋 Review the output:");
        console.log("- RED box = Line 242 (uncertainties)");
        console.log("- BLUE box = Line 244 (work performed)");
        console.log("- GREEN box = Line 246 (advancements)");
        console.log("\nCompare with page 2 of your fillable T661 screenshot!");

    } catch (e) {
        console.error("Error:", e);
        process.exit(1);
    }
})();
