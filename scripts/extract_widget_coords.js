// scripts/extract_widget_coords.js
// Node script that uses pdfjs-dist to list all widget annotation rectangles (even without field names)

import pdfjsLib from "pdfjs-dist/legacy/build/pdf.js"; // default import for Node
pdfjsLib.disableWorker = true; // no worker needed for extraction
import { readFile } from "fs/promises";

const filePath = process.argv[2];
if (!filePath) {
    console.error("Usage: node scripts/extract_widget_coords.js <pdf_path>");
    process.exit(1);
}

(async () => {
    try {
        const data = new Uint8Array(await readFile(filePath));
        const loadingTask = pdfjsLib.getDocument({ data, password: "" });
        const pdfDoc = await loadingTask.promise;
        const numPages = pdfDoc.numPages;
        const widgets = [];
        for (let i = 1; i <= numPages; i++) {
            const page = await pdfDoc.getPage(i);
            const annots = await page.getAnnotations();
            for (const annot of annots) {
                if (annot.subtype === "Widget") {
                    widgets.push({
                        page: i,
                        rect: annot.rect,
                        fieldName: annot.fieldName || null,
                        fieldType: annot.fieldType || null,
                    });
                }
            }
        }
        console.log(JSON.stringify(widgets, null, 2));
    } catch (e) {
        console.error("Error extracting widget coordinates:", e);
        process.exit(1);
    }
})();
