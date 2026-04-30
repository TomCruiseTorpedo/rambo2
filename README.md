# SR&ED GPT

## Project info

Vendor-agnostic SR&ED narrative + T661 tooling:

- **Frontend**: React + Vite (e.g. Vercel)
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **Narrative LLM**: **OpenRouter** (primary) with **Groq** fallback when `GROQ_API_KEY` is set
- **OCR**: **OpenRouter** vision / document models (default `baidu/qianfan-ocr-fast:free` via `OPENROUTER_VISION_MODEL`), with **automatic on-device fallback** (Tesseract.js in the browser) when cloud OCR fails or hits rate limits — users see toasts, processing-stage text, and an inline results notice

### Sibling repo

**[julienne-salad](https://github.com/TomCruiseTorpedo/julienne-salad)** is a local Streamlit + Ollama + EasyOCR prototype. Prompt and knowledge-base wording may differ; align manually if you want parity.

## Getting Started

### Prerequisites

- Node.js & npm
- Supabase CLI (for local functions)

### Installation

1. Clone the repository:

   ```sh
   git clone https://github.com/TomCruiseTorpedo/rambo2
   cd rambo2
   ```

2. Install dependencies:

   ```sh
   npm install
   ```

3. Environment variables — create a `.env`:

   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
   ```

4. Supabase Edge secrets (Dashboard → Edge Functions → Secrets), required for production:

   - `OPENROUTER_API_KEY` — required for OCR and narrative generation
   - `OPENROUTER_MODEL` — chat model id for SR&ED narrative (e.g. `openai/gpt-4o-mini` or a free-tier id)
   - `OPENROUTER_VISION_MODEL` — optional; defaults to `baidu/qianfan-ocr-fast:free`
   - `GROQ_API_KEY` — optional fallback for narrative only
   - `GROQ_MODEL` — optional; defaults to `llama-3.1-8b-instant`
   - `OPENROUTER_HTTP_REFERER` / `OPENROUTER_APP_TITLE` — optional OpenRouter attribution headers

5. Dev server:

   ```sh
   npm run dev
   ```

## Deployment

### Frontend (Vercel)

Connect the repo; build `npm run build`, output `dist`. Set `VITE_SUPABASE_*` in Vercel.

### Backend (Supabase)

Deploy functions:

```sh
npx supabase functions deploy process-sred --no-verify-jwt
npx supabase functions deploy process-document-ocr --no-verify-jwt
npx supabase functions deploy fill-pdf-t661 --no-verify-jwt
```

Set secrets as above. **Azure Document Intelligence** and **Hugging Face** inference endpoints are no longer used.

### Legacy Hugging Face Spaces

`scripts/deploy_to_hf.sh` and root `Dockerfile` are **deprecated** (historical); the app no longer depends on HF Spaces for inference.
