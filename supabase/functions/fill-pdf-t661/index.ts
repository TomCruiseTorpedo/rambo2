// supabase/functions/fill-pdf-t661/index.ts
// Edge Function to fill T661 PDF using coordinate-based mapping
// Enhanced with improved error handling, validation, and field mapping accuracy

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { PDFDocument, StandardFonts, rgb } from "npm:pdf-lib@1.17.1";
import { 
    getEnhancedSupabaseClient, 
    sanitizeFieldData, 
    validatePDFFieldData,
    DatabaseError 
} from "../shared/database-utils.ts";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Enhanced Supabase client with retry logic and caching
const enhancedSupabase = getEnhancedSupabaseClient();

/**
 * Validates field data against mapping constraints
 */
function validateFieldData(fieldData: FieldData, mapping: CriticalFieldsMapping): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const fieldKeys = ["line_242_uncertainties", "line_244_work_performed", "line_246_advancements"] as const;

    for (const key of fieldKeys) {
        const content = fieldData[key];
        const fieldDef = mapping[key];

        if (!content || !fieldDef) continue;

        // Validate content is not just whitespace
        if (content.trim().length === 0) {
            warnings.push(`Field ${key} contains only whitespace`);
            continue;
        }

        // Count words
        const wordCount = content.trim().split(/\s+/).length;
        if (wordCount > fieldDef.max_words) {
            errors.push(`Field ${key} exceeds maximum word limit: ${wordCount} > ${fieldDef.max_words}`);
        }

        // Validate field definition completeness
        if (!fieldDef.coordinates || !fieldDef.dimensions) {
            errors.push(`Field ${key} has incomplete mapping definition`);
        }

        // Validate coordinate bounds
        if (fieldDef.coordinates) {
            const { x0, y0, x1, y1 } = fieldDef.coordinates;
            if (x0 >= x1 || y0 <= y1) {
                errors.push(`Field ${key} has invalid coordinate bounds`);
            }
            if (x0 < 0 || y0 < 0 || x1 > 612 || y0 > 792) {
                warnings.push(`Field ${key} coordinates may be outside standard page bounds`);
            }
        }
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings
    };
}

/**
 * Processes text content and calculates metrics for field fitting
 */
function processTextForField(content: string, fieldDef: CriticalField, font: any): TextMetrics {
    if (!content || content.trim().length === 0) {
        return {
            lines: [],
            totalLines: 0,
            exceedsMaxLines: false,
            exceedsMaxWords: false,
            wordCount: 0
        };
    }

    const trimmedContent = content.trim();
    const wordCount = trimmedContent.split(/\s+/).length;
    const maxWidth = fieldDef.dimensions.width - 10; // 10pt buffer for margins
    const fontSize = fieldDef.font_size;

    // Split into paragraphs and process line wrapping
    const paragraphs = trimmedContent.split(/\n+/);
    const lines: string[] = [];

    for (const para of paragraphs) {
        if (!para.trim()) {
            lines.push(""); // Preserve blank lines between paragraphs
            continue;
        }

        const words = para.split(/\s+/);
        let currentLine = "";

        for (const word of words) {
            const testLine = currentLine ? `${currentLine} ${word}` : word;
            const width = font.widthOfTextAtSize(testLine, fontSize);

            if (width > maxWidth && currentLine) {
                lines.push(currentLine);
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        }
        
        if (currentLine) {
            lines.push(currentLine);
        }
    }

    return {
        lines,
        totalLines: lines.length,
        exceedsMaxLines: lines.length > fieldDef.max_lines,
        exceedsMaxWords: wordCount > fieldDef.max_words,
        wordCount
    };
}

/**
 * Safely renders text to PDF with error handling
 */
function renderTextToField(
    page: any, 
    textMetrics: TextMetrics, 
    fieldDef: CriticalField, 
    font: any
): { success: boolean; linesRendered: number; errors: string[] } {
    const errors: string[] = [];
    let linesRendered = 0;

    try {
        const padding = fieldDef.text_padding_top || 0;
        const fontSize = fieldDef.font_size;
        const lineHeight = fieldDef.line_height;
        
        // Calculate starting Y position
        let y = fieldDef.coordinates.y1 - lineHeight + padding;
        
        // Validate starting position is within field bounds
        if (y > fieldDef.coordinates.y0) {
            errors.push(`Starting Y position ${y} exceeds field top boundary ${fieldDef.coordinates.y0}`);
            y = fieldDef.coordinates.y0 - lineHeight;
        }

        const maxLinesToRender = Math.min(textMetrics.lines.length, fieldDef.max_lines);
        
        for (let i = 0; i < maxLinesToRender; i++) {
            const line = textMetrics.lines[i];
            
            // Check if we're still within field bounds
            if (y < fieldDef.coordinates.y1) {
                errors.push(`Line ${i + 1} would render below field boundary, stopping at line ${i}`);
                break;
            }

            try {
                page.drawText(line, {
                    x: fieldDef.coordinates.x0 + 5, // 5pt left padding
                    y: y,
                    size: fontSize,
                    font: font,
                    color: rgb(0, 0, 0),
                });
                
                linesRendered++;
                y -= lineHeight;
            } catch (renderError) {
                errors.push(`Failed to render line ${i + 1}: ${renderError.message}`);
                break;
            }
        }

        return { success: errors.length === 0, linesRendered, errors };
    } catch (error) {
        return { 
            success: false, 
            linesRendered, 
            errors: [`Field rendering failed: ${error.message}`] 
        };
    }
}

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

interface ValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
}

interface TextMetrics {
    lines: string[];
    totalLines: number;
    exceedsMaxLines: boolean;
    exceedsMaxWords: boolean;
    wordCount: number;
}

serve(async (req) => {
    // Handle CORS
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    const startTime = Date.now();
    let mapping: CriticalFieldsMapping;
    let validationResult: ValidationResult;
    const processingLog: string[] = [];

    try {
        // Parse and validate request
        let requestBody;
        try {
            requestBody = await req.json();
        } catch (parseError) {
            throw new Error(`Invalid JSON in request body: ${parseError.message}`);
        }

        let { fieldData } = requestBody as { fieldData: FieldData };
        
        if (!fieldData || typeof fieldData !== 'object') {
            throw new Error("Missing or invalid fieldData in request");
        }

        // Sanitize field data to prevent injection and normalize content
        fieldData = sanitizeFieldData(fieldData) as FieldData;
        processingLog.push(`Request received with ${Object.keys(fieldData).length} fields`);

        // Enhanced validation using utility function
        const validation = validatePDFFieldData(fieldData);
        if (!validation.isValid) {
            console.error("Enhanced field validation failed:", validation.errors);
            return new Response(
                JSON.stringify({
                    success: false,
                    error: "Field validation failed",
                    details: validation.errors,
                    warnings: validation.warnings
                }),
                {
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                    status: 400,
                }
            );
        }

        if (validation.warnings.length > 0) {
            processingLog.push(`Validation warnings: ${validation.warnings.join(", ")}`);
        }

        // Load the critical fields mapping using enhanced client with retry and caching
        try {
            mapping = await enhancedSupabase.getFieldMapping("t661_critical_fields", true);
            processingLog.push("Field mapping loaded successfully with enhanced client");
        } catch (error) {
            console.error("Error loading field mapping:", error);
            if (error instanceof Error && 'retryable' in error && error.retryable) {
                throw new Error(`Failed to download field mapping (retryable): ${error.message}`);
            } else {
                throw new Error(`Failed to download field mapping: ${error instanceof Error ? error.message : String(error)}`);
            }
        }

        // Validate field data against mapping
        validationResult = validateFieldData(fieldData, mapping);
        
        if (!validationResult.isValid) {
            console.error("Field validation failed:", validationResult.errors);
            return new Response(
                JSON.stringify({
                    success: false,
                    error: "Field validation failed",
                    details: validationResult.errors,
                    warnings: validationResult.warnings
                }),
                {
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                    status: 400,
                }
            );
        }

        if (validationResult.warnings.length > 0) {
            processingLog.push(`Validation warnings: ${validationResult.warnings.join(", ")}`);
        }

        // Download template PDF using enhanced client with retry logic
        let pdfDoc: any;
        try {
            const pdfBytes = await enhancedSupabase.downloadFile("templates", "t661-20e.pdf");
            pdfDoc = await PDFDocument.load(pdfBytes);
            processingLog.push(`PDF template loaded with enhanced client: ${pdfDoc.getPageCount()} pages`);
        } catch (error) {
            console.error("Error downloading PDF template:", error);
            throw new Error(`Failed to download PDF template: ${error instanceof Error ? error.message : String(error)}`);
        }

        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

        // Process each field
        const fieldKeys = [
            "line_242_uncertainties",
            "line_244_work_performed", 
            "line_246_advancements"
        ] as const;

        const renderingResults: { [key: string]: any } = {};

        for (const key of fieldKeys) {
            const fieldDef = mapping[key];
            const textContent = fieldData[key];

            if (!textContent || !fieldDef) {
                processingLog.push(`Skipping ${key}: ${!textContent ? 'no content' : 'no field definition'}`);
                continue;
            }

            try {
                // Validate page index
                if (fieldDef.page < 0 || fieldDef.page >= pdfDoc.getPageCount()) {
                    throw new Error(`Invalid page index ${fieldDef.page} for field ${key}`);
                }

                const page = pdfDoc.getPage(fieldDef.page);
                
                // Process text and get metrics
                const textMetrics = processTextForField(textContent, fieldDef, font);
                
                // Log text processing results
                processingLog.push(
                    `${key}: ${textMetrics.wordCount} words, ${textMetrics.totalLines} lines` +
                    (textMetrics.exceedsMaxWords ? ` (EXCEEDS ${fieldDef.max_words} word limit)` : '') +
                    (textMetrics.exceedsMaxLines ? ` (EXCEEDS ${fieldDef.max_lines} line limit)` : '')
                );

                // Render text to field
                const renderResult = renderTextToField(page, textMetrics, fieldDef, font);
                
                renderingResults[key] = {
                    success: renderResult.success,
                    linesRendered: renderResult.linesRendered,
                    totalLines: textMetrics.totalLines,
                    wordCount: textMetrics.wordCount,
                    exceedsLimits: textMetrics.exceedsMaxWords || textMetrics.exceedsMaxLines,
                    errors: renderResult.errors
                };

                if (!renderResult.success) {
                    processingLog.push(`${key} rendering issues: ${renderResult.errors.join(", ")}`);
                } else {
                    processingLog.push(`${key}: rendered ${renderResult.linesRendered}/${textMetrics.totalLines} lines`);
                }

            } catch (fieldError) {
                const errorMsg = `Failed to process field ${key}: ${fieldError.message}`;
                console.error(errorMsg);
                processingLog.push(errorMsg);
                
                renderingResults[key] = {
                    success: false,
                    error: fieldError.message
                };
            }
        }

        // Save filled PDF
        let filledPdfBytes: Uint8Array;
        try {
            filledPdfBytes = await pdfDoc.save();
            processingLog.push("PDF generation completed");
        } catch (saveError) {
            throw new Error(`Failed to save PDF: ${saveError.message}`);
        }

        const fileName = `t661-filled-${crypto.randomUUID()}.pdf`;

        // Upload to Supabase Storage using enhanced client with retry logic
        let publicUrl: string;
        try {
            publicUrl = await enhancedSupabase.uploadFile(
                "templates", 
                `filled/${fileName}`, 
                filledPdfBytes,
                {
                    contentType: "application/pdf",
                    upsert: true,
                    cacheControl: "3600"
                }
            );
            processingLog.push("PDF uploaded successfully with enhanced client");
        } catch (error) {
            console.error("Error uploading PDF:", error);
            throw new Error(`Failed to upload filled PDF: ${error instanceof Error ? error.message : String(error)}`);
        }

        const processingTime = Date.now() - startTime;
        processingLog.push(`Total processing time: ${processingTime}ms`);

        // Log processing details
        console.log("PDF Generation Summary:", {
            fileName,
            processingTime,
            fieldsProcessed: Object.keys(renderingResults).length,
            warnings: validationResult.warnings,
            renderingResults
        });

        // Get database health metrics for monitoring
        const dbHealth = enhancedSupabase.getHealthSummary();
        
        return new Response(
            JSON.stringify({
                success: true,
                pdfUrl: publicUrl,
                fileName: fileName,
                processingTime,
                fieldResults: renderingResults,
                warnings: validationResult.warnings,
                processingLog: processingLog,
                dbMetrics: {
                    operations: dbHealth.totalOperations,
                    successRate: dbHealth.successRate,
                    avgDuration: dbHealth.averageDuration,
                    cacheHitRate: dbHealth.cacheHitRate
                }
            }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            }
        );

    } catch (error) {
        const processingTime = Date.now() - startTime;
        const errorDetails = {
            message: error instanceof Error ? error.message : String(error),
            processingTime,
            processingLog,
            timestamp: new Date().toISOString()
        };

        console.error("PDF Generation Error:", errorDetails);

        return new Response(
            JSON.stringify({
                success: false,
                error: errorDetails.message,
                details: errorDetails,
                processingLog: processingLog
            }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 500,
            }
        );
    }
});
