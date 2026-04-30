# SR&ED GPT Deployment Guide

## Phase 1: Vercel (Frontend)

1. **Vercel Dashboard** → your project → **Settings** → **Environment Variables**.
2. Add:
   - `VITE_SUPABASE_URL` — Supabase project URL
   - `VITE_SUPABASE_PUBLISHABLE_KEY` — anon/public key
3. Redeploy so the bundle picks up variables.

`VITE_` values are public in the client; never put `OPENROUTER_API_KEY` here.

## Phase 2: Supabase (Edge Functions & secrets)

1. **Secrets** (Dashboard → Edge Functions / Secrets):
   - `OPENROUTER_API_KEY` (required)
   - `OPENROUTER_MODEL` — narrative chat model (OpenRouter id)
   - `OPENROUTER_VISION_MODEL` — optional OCR model (default `baidu/qianfan-ocr-fast:free`)
   - `GROQ_API_KEY` — optional narrative fallback
   - `GROQ_MODEL` — optional (default `llama-3.1-8b-instant`)
   - `OPENROUTER_HTTP_REFERER`, `OPENROUTER_APP_TITLE` — optional; sent as standard `Referer` and `X-Title` on OpenRouter requests

2. **Deploy functions**:

   ```sh
   npx supabase functions deploy process-sred --no-verify-jwt
   npx supabase functions deploy process-document-ocr --no-verify-jwt
   npx supabase functions deploy fill-pdf-t661 --no-verify-jwt
   ```

3. The browser calls these functions with the anon key; keys above stay server-side.

## Phase 3: OCR & client fallback

- **Cloud OCR**: `process-document-ocr` uses OpenRouter (images as `image_url`; PDFs as `file` parts per OpenRouter multimodal API).
- **Fallback**: the React app calls the same function first; on failure or `rate_limit`, it runs **Tesseract.js** locally and shows explicit toasts + UI notices.

No Azure Document Intelligence configuration is required.

## Security notes

- **Supabase secrets**: private; used only in Edge Functions.
- **Vercel**: only `VITE_SUPABASE_*` and other public config.
- **OpenRouter**: monitor usage in the OpenRouter dashboard; free tiers have low RPM/daily caps.

## Manual product smoke (after deploy)

Quick pass to confirm OpenRouter + OCR + UI wiring:

1. Open the deployed app with devtools **Network** visible; confirm `process-sred` and `process-document-ocr` return **200** (not 401/500).
2. Run the wizard with a **short text claim** — narrative sections populate without Groq-only errors in the function logs.
3. Upload a **small PDF or image** — cloud OCR succeeds, or the UI shows the Tesseract fallback notice and still produces text.
4. **Session history** — a completed run appears in history after refresh.

## Legacy

Older docs referred to Hugging Face Spaces and `LLM_API_URL` / `LLM_API_KEY`. Those paths are removed; use OpenRouter secrets above.
