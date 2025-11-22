// supabase/functions/fill-pdf-t661/index.ts
// Edge Function to fill T661 PDF using coordinate-based mapping
// Updated to use precise coordinates for critical narrative fields (242, 244, 246)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { PDFDocument, StandardFonts, rgb } from "npm:pdf-lib@1.17.1";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.4";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Supabase client
const supabase = createClient(
    Deno.env.get("SUPABASE_URL") || "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
);

interface CriticalField {
    cra_line: string;
    title: string;
    full_label: string;
    max_words: number;
    max_lines: number;
    page: number;
    coordinates: {
        x0: number;
        y0: number;
        x1: number;
        y1: number;
    };
    dimensions: {
        width: number;
        height: number;
    };
    font_size: number;
    line_height: number;
    text_padding_top?: number;
}

interface CriticalFieldsMapping {
    metadata: any;
    line_242_uncertainties: CriticalField;
    line_244_work_performed: CriticalField;
    line_246_advancements: CriticalField;
    usage_notes: any;
}

interface FieldData {
    line_242_uncertainties?: string;
    line_244_work_performed?: string;
    line_246_advancements?: string;
    [key: string]: string | undefined;
}

serve(async (req) => {
    // Handle CORS
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const { fieldData } = await req.json() as { fieldData: FieldData };

        // Load the critical fields mapping from Supabase Storage
        const { data: mappingData, error: mappingError } = await supabase.storage
            .from("field_mappings")
            .download("t661_critical_fields.json");

        let mapping: CriticalFieldsMapping;

        if (mappingError) {
            console.error("Error downloading mapping:", mappingError);
            throw new Error(`Failed to download field mapping: ${mappingError.message}`);
        } else {
            const text = await mappingData.text();
            mapping = JSON.parse(text);
        }

        // Download template PDF from Supabase Storage
        const { data: pdfData, error: downloadError } = await supabase.storage
            .from("templates")
            .download("t661-20e.pdf");

        if (downloadError) throw new Error(`Failed to download template: ${downloadError.message}`);

        const pdfBytes = new Uint8Array(await pdfData!.arrayBuffer());
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

        // Map of our keys to the mapping keys
        const fieldKeys = [
            "line_242_uncertainties",
            "line_244_work_performed",
            "line_246_advancements"
        ] as const;

        for (const key of fieldKeys) {
            const fieldDef = mapping[key];
            const textContent = fieldData[key];

            if (!textContent || !fieldDef) continue;

            // Get the correct page (mapping uses 1-based index relative to form start, which is Page 2 of PDF)
            const page = pdfDoc.getPage(fieldDef.page);

            const padding = fieldDef.text_padding_top || 0;
            const fontSize = fieldDef.font_size;
            const lineHeight = fieldDef.line_height;
            const maxWidth = fieldDef.dimensions.width;
            const maxLines = fieldDef.max_lines;

            // Wrap text
            const paragraphs = textContent.split("\n");
            const lines: string[] = [];

            for (const para of paragraphs) {
                if (!para.trim()) {
                    lines.push(""); // Preserve blank lines
                    continue;
                }

                const words = para.split(" ");
                let currentLine = "";

                for (const word of words) {
                    const testLine = currentLine ? `${currentLine} ${word}` : word;
                    const width = font.widthOfTextAtSize(testLine, fontSize);

                    if (width > maxWidth - 10 && currentLine) { // -10 buffer
                        lines.push(currentLine);
                        currentLine = word;
                    } else {
                        currentLine = testLine;
                    }
                }
                if (currentLine) lines.push(currentLine);
            }

            // Draw text lines
            // Start Y is y1 (top) - line_height + padding
            let y = fieldDef.coordinates.y1 - lineHeight + padding;

            for (let i = 0; i < Math.min(lines.length, maxLines); i++) {
                page.drawText(lines[i], {
                    x: fieldDef.coordinates.x0 + 5, // +5 padding left
                    y: y,
                    size: fontSize,
                    font: font,
                    color: rgb(0, 0, 0),
                });
                y -= lineHeight;
            }
        }

        // Save filled PDF
        const filledPdfBytes = await pdfDoc.save();
        const fileName = `t661-filled-${crypto.randomUUID()}.pdf`;

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
            .from("templates")
            .upload(`filled/${fileName}`, filledPdfBytes, {
                contentType: "application/pdf",
                upsert: true,
            });

        if (uploadError) throw new Error(`Failed to upload filled PDF: ${uploadError.message}`);

        // Get public URL
        const { data: urlData } = supabase.storage
            .from("templates")
            .getPublicUrl(`filled/${fileName}`);

        return new Response(
            JSON.stringify({
                success: true,
                pdfUrl: urlData.publicUrl,
                fileName: fileName,
            }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            }
        );
    } catch (error) {
        console.error("Error filling PDF:", error);
        return new Response(
            JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : String(error),
            }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 500,
            }
        );
    }
});
