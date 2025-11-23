// Production End-to-End Test
// Tests the full pipeline: Frontend → Supabase → 3-Tier AI → PDF Generation

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const envPath = path.resolve(__dirname, '../env');
const env = {};
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach(line => {
        const [key, ...value] = line.split('=');
        if (key && value) {
            env[key.trim()] = value.join('=').trim().replace(/^["']|["']$/g, '');
        }
    });
}

const SUPABASE_URL = "https://nvuxsdwpqrtglgxwrbqa.supabase.co";
const SUPABASE_ANON_KEY = env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_ANON_KEY) {
    console.error("❌ Missing SUPABASE_ANON_KEY in env file");
    process.exit(1);
}

const testInput = `
We developed a novel computer vision algorithm for real-time defect detection in semiconductor manufacturing.

CHALLENGE:
Existing CNN models (ResNet50) achieved 99% accuracy but were too slow (200ms latency) for production lines.
Lightweight models (MobileNet) were fast (40ms) but missed critical micro-defects (<0.1mm), leading to 8% false negatives.
The technological uncertainty was whether a hybrid architecture could achieve <100ms latency while maintaining >99% accuracy.

SYSTEMATIC INVESTIGATION:
1. We formulated the hypothesis: "A windowed attention mechanism with cross-scale feature fusion will resolve the latency-accuracy trade-off."
2. We curated a labeled dataset: 10,000 images with annotated micro-defects.
3. We benchmarked 5 architectures on NVIDIA Jetson Nano (target edge device):
   - ResNet50: 200ms, 99.1% mAP
   - MobileNetV3: 40ms, 92% mAP (80% of <0.1mm defects missed)
   - ViT-Base: 400ms, 99.5% mAP
   - Swin-Tiny: 180ms, 98.8% mAP
   - Our Hybrid-Attn: 110ms → optimized to 92ms, 99.2% mAP
4. We analyzed failure cases: MobileNet's aggressive downsampling lost high-frequency details.
5. We iteratively pruned attention heads (12→8→6) to reduce latency from 110ms to 92ms.
6. We validated on 2,000-image holdout set: 99.2% accuracy, <1% false negatives on micro-defects.

TECHNOLOGICAL ADVANCEMENT:
We advanced the understanding of efficient attention mechanisms for edge vision:
- Proved global attention is unnecessary for micro-defect detection; local windowed attention is 4x faster.
- Demonstrated cross-scale feature fusion preserves small object details despite aggressive downsampling.
- Showed a hybrid architecture can surpass the Pareto frontier of existing models for this constraint set.
This enables high-speed, high-accuracy inspection on low-cost hardware, previously thought to require cloud-grade GPUs.
`;

console.log("🧪 Starting Production End-to-End Test");
console.log("=".repeat(60));

async function testPipeline() {
    try {
        console.log("\n📤 Sending request to process-sred...");
        console.log(`URL: ${SUPABASE_URL}/functions/v1/process-sred`);

        const startTime = Date.now();

        const response = await fetch(`${SUPABASE_URL}/functions/v1/process-sred`, {
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

        const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

        if (!response.ok) {
            console.error(`\n❌ Error: ${response.status} ${response.statusText}`);
            const text = await response.text();
            console.error(text);
            return;
        }

        const data = await response.json();

        console.log(`\n✅ Response received in ${elapsed}s\n`);
        console.log("=".repeat(60));

        // Check for narrative
        if (data.result) {
            console.log("\n📝 NARRATIVE GENERATED:");
            console.log("-".repeat(60));
            const preview = data.result.substring(0, 300);
            console.log(preview + "...\n");
            console.log(`Full length: ${data.result.length} characters`);
        } else {
            console.log("\n⚠️  No narrative in response");
        }

        // Check for reasoning
        if (data.reasoning) {
            console.log("\n🧠 REASONING PROCESS CAPTURED:");
            console.log("-".repeat(60));
            const reasoningPreview = data.reasoning.substring(0, 200);
            console.log(reasoningPreview + "...\n");
            console.log(`Full length: ${data.reasoning.length} characters`);
        } else {
            console.log("\n⚠️  No reasoning in response (expected for non-DeepSeek models)");
        }

        // Check for PDF
        if (data.pdfUrl) {
            console.log("\n📄 PDF GENERATED:");
            console.log("-".repeat(60));
            console.log(`URL: ${data.pdfUrl}\n`);

            // Download PDF
            console.log("📥 Downloading PDF...");
            const pdfResp = await fetch(data.pdfUrl);
            const pdfBuffer = await pdfResp.arrayBuffer();

            const outputPath = path.resolve(__dirname, '../production_test_output.pdf');
            fs.writeFileSync(outputPath, Buffer.from(pdfBuffer));
            console.log(`✅ PDF saved to: ${outputPath}`);
            console.log(`   Size: ${(pdfBuffer.byteLength / 1024).toFixed(2)} KB`);
        } else {
            console.log("\n❌ No PDF URL in response");
        }

        console.log("\n" + "=".repeat(60));
        console.log("🎉 TEST COMPLETED SUCCESSFULLY");
        console.log("=".repeat(60));

    } catch (error) {
        console.error("\n❌ Test failed:", error.message);
        console.error(error.stack);
    }
}

testPipeline();
