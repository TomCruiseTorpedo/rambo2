import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { openRouterHeaders } from "../shared/openrouter-headers.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

interface OCRRequest {
  imageData: string;
  imageType: string;
  fileName: string;
}

function isRateLimited(status: number, body: string): boolean {
  if (status === 429) return true;
  try {
    const j = JSON.parse(body);
    const msg = (j.error?.message || j.message || "").toLowerCase();
    return msg.includes("rate") && msg.includes("limit");
  } catch {
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { imageData, imageType, fileName }: OCRRequest = await req.json();

    const apiKey = Deno.env.get("OPENROUTER_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "OPENROUTER_API_KEY not configured",
          code: "config",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const visionModel =
      Deno.env.get("OPENROUTER_VISION_MODEL") || "baidu/qianfan-ocr-fast:free";

    const ocrInstruction =
      "Transcribe all visible text from this document. Preserve reading order, headings, and bullet lists. " +
      "Represent tables as markdown tables when possible. Output only the extracted text/markdown, no preamble.";

    let userContent: Array<Record<string, unknown>>;

    if (imageType === "application/pdf") {
      const dataUrl = `data:application/pdf;base64,${imageData}`;
      userContent = [
        { type: "text", text: ocrInstruction },
        {
          type: "file",
          file: {
            filename: fileName || "document.pdf",
            file_data: dataUrl,
          },
        },
      ];
    } else if (imageType.startsWith("image/")) {
      const mime = imageType || "image/jpeg";
      const dataUrl = `data:${mime};base64,${imageData}`;
      userContent = [
        { type: "text", text: ocrInstruction },
        {
          type: "image_url",
          image_url: { url: dataUrl },
        },
      ];
    } else {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Unsupported type for OCR: ${imageType}`,
          code: "unsupported",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log(`OpenRouter OCR: ${fileName} (${imageType}) model=${visionModel}`);

    const orRes = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: openRouterHeaders(apiKey, "Rambo2-SRED-OCR/1.0"),
      body: JSON.stringify({
        model: visionModel,
        messages: [
          {
            role: "user",
            content: userContent,
          },
        ],
        temperature: 0.1,
        max_tokens: 4096,
      }),
    });

    const rawText = await orRes.text();
    if (!orRes.ok) {
      const code = isRateLimited(orRes.status, rawText) ? "rate_limit" : "provider_error";
      console.error(`OpenRouter OCR error ${orRes.status}:`, rawText.slice(0, 500));
      return new Response(
        JSON.stringify({
          success: false,
          error: `OpenRouter OCR failed: ${orRes.status} ${rawText.slice(0, 300)}`,
          code,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let data: { choices?: Array<{ message?: { content?: string } }> };
    try {
      data = JSON.parse(rawText);
    } catch {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid JSON from OpenRouter",
          code: "provider_error",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const content = data.choices?.[0]?.message?.content;
    if (!content || typeof content !== "string" || !content.trim()) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Empty OCR response from model",
          code: "provider_error",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        markdown: content.trim(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (error) {
    console.error("OCR processing error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
        code: "error",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  }
});
