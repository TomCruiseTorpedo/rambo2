// scripts/extract_fields.js
// Node script that uses pdfjs-dist to list form fields (AcroForm & XFA) from the T661 PDF.

import pdfjsLib from "pdfjs-dist/legacy/build/pdf.js"; // default import for Node
pdfjsLib.disableWorker = true; // no worker needed for annotation extractions

import { readFile } from "fs/promises";

const filePath = process.argv[2];
if (!filePath) {
    console.error("Usage: node scripts/extract_fields.js <pdf_path>");
    process.exit(1);
}

(async () => {
    try {
        const data = new Uint8Array(await readFile(filePath));
        const loadingTask = pdfjsLib.getDocument({ data, password: "" }); // empty password if none
        const pdfDoc = await loadingTask.promise;
        const numPages = pdfDoc.numPages;
        const fields = [];
        for (let i = 1; i <= numPages; i++) {
            const page = await pdfDoc.getPage(i);
            const annots = await page.getAnnotations();
            for (const annot of annots) {
                if (annot.subtype === "Widget" && annot.fieldName) {
                    fields.push({
                        name: annot.fieldName,
                        type: annot.fieldType || "unknown",
                        page: i,
                        rect: annot.rect,
                    });
                }
            }
        }
        console.log(JSON.stringify(fields, null, 2));
    } catch (e) {
        console.error("Error extracting fields:", e);
        process.exit(1);
    }
})();
