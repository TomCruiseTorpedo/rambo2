import type { SupabaseClient } from "@supabase/supabase-js";
import Tesseract from "tesseract.js";
import * as pdfjs from "pdfjs-dist";

export type OcrFallbackReason = "rate_limit" | "cloud_failed";

if (typeof window !== "undefined") {
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();
}

type EdgeOcrResult = {
  success: boolean;
  markdown?: string;
  error?: string;
  code?: string;
};

async function invokeEdgeOcr(
  supabase: SupabaseClient,
  imageData: string,
  imageType: string,
  fileName: string,
): Promise<EdgeOcrResult> {
  const { data, error } = await supabase.functions.invoke("process-document-ocr", {
    body: { imageData, imageType, fileName },
  });
  if (error) {
    return { success: false, error: error.message, code: "error" };
  }
  if (data && typeof data === "object" && "success" in data) {
    return data as EdgeOcrResult;
  }
  return { success: false, error: "Unexpected OCR response", code: "error" };
}

async function tesseractFromDataUrl(dataUrl: string): Promise<string> {
  const r = await Tesseract.recognize(dataUrl, "eng", {
    logger: () => undefined,
  });
  return (r.data.text || "").trim();
}

async function pdfPagesToDataUrls(file: File, maxPages: number): Promise<string[]> {
  const buf = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: buf }).promise;
  const urls: string[] = [];
  const n = Math.min(pdf.numPages, maxPages);
  for (let i = 1; i <= n; i++) {
    const page = await pdf.getPage(i);
    const scale = 1.5;
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas not available");
    await page.render({ canvasContext: ctx, viewport }).promise;
    urls.push(canvas.toDataURL("image/jpeg", 0.85));
  }
  return urls;
}

export async function extractWithClientOcrFallback(
  supabase: SupabaseClient,
  file: File,
  encoded: { data: string; type: string; name: string },
  opts: {
    onCloudOcr: () => void;
    onLocalOcr: (detail: string) => void;
    onFallbackNotice: (reason: OcrFallbackReason) => void;
  },
): Promise<{ textBody: string; usedLocalFallback: boolean; fallbackReason?: OcrFallbackReason }> {
  if (!encoded.type.startsWith("image/") && encoded.type !== "application/pdf") {
    throw new Error("clientOcrPipeline: not an image or PDF");
  }

  opts.onCloudOcr();
  const edge = await invokeEdgeOcr(supabase, encoded.data, encoded.type, encoded.name);
  if (edge.success && edge.markdown?.trim()) {
    return { textBody: edge.markdown.trim(), usedLocalFallback: false };
  }

  const isRate = edge.code === "rate_limit";
  const reason: OcrFallbackReason = isRate ? "rate_limit" : "cloud_failed";
  opts.onFallbackNotice(reason);

  if (encoded.type.startsWith("image/")) {
    opts.onLocalOcr("Running on-device OCR…");
    const mime = encoded.type || "image/jpeg";
    const dataUrl = `data:${mime};base64,${encoded.data}`;
    const txt = await tesseractFromDataUrl(dataUrl);
    return { textBody: txt, usedLocalFallback: true, fallbackReason: reason };
  }

  opts.onLocalOcr("Rendering PDF pages…");
  const urls = await pdfPagesToDataUrls(file, 8);
  const parts: string[] = [];
  for (let i = 0; i < urls.length; i++) {
    opts.onLocalOcr(`On-device OCR: page ${i + 1} of ${urls.length}…`);
    parts.push(await tesseractFromDataUrl(urls[i]));
  }
  return {
    textBody: parts.filter(Boolean).join("\n\n---\n\n"),
    usedLocalFallback: true,
    fallbackReason: reason,
  };
}
