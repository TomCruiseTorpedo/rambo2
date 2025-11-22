# SR&ED GPT

## Project info

This project is a vendor-agnostic implementation of SR&ED GPT, featuring:
- **Frontend**: React + Vite (deployed on Vercel)
- **Backend**: Supabase
- **AI**: Hybrid 3-Tier Architecture (DeepSeek-R1-Distill-Qwen-1.5B)
  - **Tier 1**: Hugging Face Serverless API (Primary)
  - **Tier 2**: Self-Hosted Docker on HF Spaces (Backup)
  - **Tier 3**: Groq API (Fallback)

## Getting Started

### Prerequisites
- Node.js & npm
- Supabase CLI
- Docker (optional, for local testing)

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

3. Set up environment variables:
   Create a `.env` file with:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_key
   ```

4. Start the development server:
   ```sh
   npm run dev
   ```

## Deployment

### Frontend (Vercel)
Connect this repository to Vercel and deploy. Ensure the build command is `npm run build` and output directory is `dist`.

### AI (Hugging Face Spaces)
This project uses a **Tier 2 Backup** hosted on Hugging Face Spaces.

1. Create a new Space (SDK: Docker, Hardware: CPU Basic).
2. Use the helper script to deploy the Dockerfile:
   ```sh
   ./scripts/deploy_to_hf.sh <your_hf_username> <space_name>
   ```
   Example: `./scripts/deploy_to_hf.sh myuser tomcruisemissile-rambo2`

### Backend (Supabase)
Deploy the Edge Functions:
```sh
npx supabase functions deploy process-sred --no-verify-jwt
npx supabase functions deploy fill-pdf-t661 --no-verify-jwt
```
Ensure you have set the following secrets in Supabase:
- `LLM_API_URL` (Your HF Space URL)
- `LLM_API_KEY` (Your HF Token)
- `GROQ_API_KEY` (Optional, for Tier 3 fallback)
