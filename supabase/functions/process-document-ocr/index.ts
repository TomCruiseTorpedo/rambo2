import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface OCRRequest {
    imageData: string; // base64 encoded image
    imageType: string; // mime type
    fileName: string;
}

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { imageData, imageType, fileName }: OCRRequest = await req.json()

        // Azure Document Intelligence credentials
        const azureEndpoint = Deno.env.get('AZURE_DOC_INTEL_ENDPOINT')
        const azureKey = Deno.env.get('AZURE_DOC_INTEL_KEY')

        if (!azureEndpoint || !azureKey) {
            throw new Error('Azure Document Intelligence credentials not configured')
        }

        console.log(`Processing OCR for ${fileName}`)

        // Convert base64 to binary
        const binaryData = Uint8Array.from(atob(imageData), c => c.charCodeAt(0))

        // Call Azure Document Intelligence Layout API
        const analyzeUrl = `${azureEndpoint}/formrecognizer/documentModels/prebuilt-layout:analyze?api-version=2023-07-31`

        const analyzeResponse = await fetch(analyzeUrl, {
            method: 'POST',
            headers: {
                'Content-Type': imageType,
                'Ocp-Apim-Subscription-Key': azureKey,
            },
            body: binaryData,
        })

        if (!analyzeResponse.ok) {
            const errorText = await analyzeResponse.text()
            throw new Error(`Azure API error: ${analyzeResponse.status} - ${errorText}`)
        }

        // Get the operation location from response headers
        const operationLocation = analyzeResponse.headers.get('operation-location')
        if (!operationLocation) {
            throw new Error('No operation location returned from Azure')
        }

        console.log(`Azure operation started, polling for results...`)

        // Poll for results
        let resultResponse
        let attempts = 0
        const maxAttempts = 30 // 30 seconds max wait

        while (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 1000)) // Wait 1 second

            resultResponse = await fetch(operationLocation, {
                headers: {
                    'Ocp-Apim-Subscription-Key': azureKey,
                },
            })

            const result = await resultResponse.json()

            if (result.status === 'succeeded') {
                console.log(`OCR completed for ${fileName}`)

                // Convert Azure JSON to Markdown
                const markdown = convertAzureResponseToMarkdown(result.analyzeResult)

                return new Response(
                    JSON.stringify({
                        success: true,
                        markdown,
                        rawResult: result.analyzeResult, // Include raw for debugging
                    }),
                    {
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                        status: 200,
                    },
                )
            } else if (result.status === 'failed') {
                throw new Error(`OCR failed: ${result.error?.message || 'Unknown error'}`)
            }

            attempts++
        }

        throw new Error('OCR timeout - operation took too long')

    } catch (error) {
        console.error('OCR processing error:', error)
        return new Response(
            JSON.stringify({
                success: false,
                error: error.message,
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500,
            },
        )
    }
})

/**
 * Convert Azure Document Intelligence JSON response to clean Markdown
 * Preserves table structure and text hierarchy
 */
function convertAzureResponseToMarkdown(analyzeResult: any): string {
    const lines: string[] = []

    // Extract paragraphs (text content)
    if (analyzeResult.paragraphs) {
        lines.push('## Extracted Text\n')
        for (const para of analyzeResult.paragraphs) {
            lines.push(para.content)
            lines.push('') // Blank line between paragraphs
        }
    }

    // Extract tables in Markdown format
    if (analyzeResult.tables) {
        lines.push('\n## Tables\n')
        for (let tableIndex = 0; tableIndex < analyzeResult.tables.length; tableIndex++) {
            const table = analyzeResult.tables[tableIndex]
            lines.push(`### Table ${tableIndex + 1}\n`)

            // Build markdown table
            const markdown = buildMarkdownTable(table)
            lines.push(markdown)
            lines.push('') // Blank line after table
        }
    }

    return lines.join('\n')
}

/**
 * Build a Markdown table from Azure table structure
 */
function buildMarkdownTable(table: any): string {
    const rowCount = table.rowCount
    const colCount = table.columnCount

    // Initialize grid
    const grid: string[][] = Array(rowCount).fill(null).map(() => Array(colCount).fill(''))

    // Fill grid with cell content
    for (const cell of table.cells) {
        const rowIndex = cell.rowIndex
        const colIndex = cell.columnIndex
        grid[rowIndex][colIndex] = cell.content || ''
    }

    // Build markdown rows
    const markdownRows: string[] = []

    for (let row = 0; row < rowCount; row++) {
        const rowContent = grid[row].map(cell => cell.trim()).join(' | ')
        markdownRows.push(`| ${rowContent} |`)

        // Add separator after first row (header)
        if (row === 0) {
            const separator = grid[row].map(() => '---').join(' | ')
            markdownRows.push(`| ${separator} |`)
        }
    }

    return markdownRows.join('\n')
}
