// scripts/list_fields_pdf_lib.js
// Node script that uses pdf-lib to list AcroForm fields (including XFA if present) from a PDF.

import { PDFDocument } from "pdf-lib";
import { readFile } from "fs/promises";

const filePath = process.argv[2];
if (!filePath) {
    console.error("Usage: node scripts/list_fields_pdf_lib.js <pdf_path>");
    process.exit(1);
}

(async () => {
    try {
        const data = await readFile(filePath);
        const pdfDoc = await PDFDocument.load(data, { ignoreEncryption: true });
        const form = pdfDoc.getForm();
        const fields = form.getFields();
        const fieldInfos = fields.map((f) => {
            const type = f.constructor.name; // e.g., PDFTextField, PDFCheckBox
            const name = f.getName();
            return { name, type };
        });
        console.log(JSON.stringify(fieldInfos, null, 2));
    } catch (e) {
        console.error("Error extracting fields:", e);
        process.exit(1);
    }
})();
