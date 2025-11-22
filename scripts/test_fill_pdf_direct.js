
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

const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/fill-pdf-t661`;

async function testFillPdf() {
    console.log("Testing fill-pdf-t661 directly...");
    console.log(`Calling ${FUNCTION_URL}...`);

    const fieldData = {
        "line_242_uncertainties": "Test Uncertainty Content",
        "line_244_work_performed": "Test Work Performed Content",
        "line_246_advancements": "Test Advancement Content"
    };

    try {
        const response = await fetch(FUNCTION_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify({ fieldData })
        });

        if (!response.ok) {
            console.error(`Error: ${response.status} ${response.statusText}`);
            const text = await response.text();
            console.error(text);
            return;
        }

        const data = await response.json();
        console.log("Response received!");
        console.log(JSON.stringify(data, null, 2));

    } catch (error) {
        console.error("Test failed:", error);
    }
}

testFillPdf();
