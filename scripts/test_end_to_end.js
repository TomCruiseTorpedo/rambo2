
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple .env parser
function loadEnv() {
    try {
        const envPath = path.resolve(__dirname, '../env');
        if (fs.existsSync(envPath)) {
            console.log("Loading environment from:", envPath);
            const envFile = fs.readFileSync(envPath, 'utf8');
            const env = {};
            envFile.split('\n').forEach(line => {
                const [key, ...valueParts] = line.split('=');
                if (key && valueParts.length > 0) {
                    let value = valueParts.join('=').trim();
                    // Remove surrounding quotes if present
                    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                        value = value.slice(1, -1);
                    }
                    env[key.trim()] = value;
                }
            });
            return env;
        } else {
            console.warn("No 'env' file found at:", envPath);
            return {};
        }
    } catch (e) {
        console.error("Could not load .env file", e);
        return {};
    }
}

const env = loadEnv();
const SUPABASE_URL = "https://nvuxsdwpqrtglgxwrbqa.supabase.co";
const SUPABASE_ANON_KEY = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_ANON_KEY) {
    console.error("Missing SUPABASE_ANON_KEY");
    process.exit(1);
}

const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/process-sred`;

async function testEndToEnd() {
    console.log("Starting end-to-end test...");
    console.log(`Calling ${FUNCTION_URL}...`);

    const testInput = `
    We developed a new algorithm for real-time defect detection in manufacturing.
    The problem was that existing CNN models were too slow (200ms latency) and missed micro-defects (<0.1mm).
    We hypothesized that a hybrid CNN-Transformer architecture with a novel attention mechanism would achieve <100ms latency and 99% accuracy.
    We systematically tested 5 architectures on a dataset of 10,000 images.
    We found that Model C achieved 92ms latency and 99.2% accuracy.
    This advances the field by proving transformers can be efficient enough for high-speed manufacturing vision.
    `;

    try {
        const response = await fetch(FUNCTION_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify({
                text: testInput,
                processMode: "combined"
            })
        });

        if (!response.ok) {
            console.error(`Error: ${response.status} ${response.statusText}`);
            const text = await response.text();
            console.error(text);
            return;
        }

        const data = await response.json();
        console.log("Response received!");

        if (data.result) {
            console.log("Narrative generated (first 100 chars):", data.result.substring(0, 100) + "...");
        }

        if (data.reasoning) {
            console.log("Reasoning captured (first 100 chars):", data.reasoning.substring(0, 100) + "...");
        }

        if (data.pdfUrl) {
            console.log("✅ PDF URL received:", data.pdfUrl);

            // Download the PDF
            console.log("Downloading PDF...");
            const pdfResp = await fetch(data.pdfUrl);
            const pdfBuffer = await pdfResp.arrayBuffer();

            const outputPath = path.resolve(__dirname, '../final_output.pdf');
            fs.writeFileSync(outputPath, Buffer.from(pdfBuffer));
            console.log(`✅ PDF saved to ${outputPath}`);
        } else {
            console.error("❌ No PDF URL in response");
            console.log("Full response:", JSON.stringify(data, null, 2));
        }

    } catch (error) {
        console.error("Test failed:", error);
    }
}

testEndToEnd();
