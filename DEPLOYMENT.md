# SR&ED GPT Deployment Guide

## Phase 1: Vercel Configuration (Frontend)

You have already connected the repository. Now we need to inject the backend configuration.

1.  **Go to Vercel Dashboard**: Navigate to your project on Vercel.
2.  **Settings**: Click on the **Settings** tab.
3.  **Environment Variables**: Select **Environment Variables** from the left menu.
4.  **Add Variables**: Add the following key-value pairs (copy these from your Supabase project settings or local `.env`):
    *   `VITE_SUPABASE_URL`: Your Supabase Project URL.
    *   `VITE_SUPABASE_PUBLISHABLE_KEY`: Your Supabase Anon/Public Key.
5.  **Redeploy**:
    *   Go to the **Deployments** tab.
    *   Click the three dots on the latest deployment -> **Redeploy**.
    *   This ensures the new environment variables are baked into the build.

## Phase 2: Hugging Face Spaces (AI Backend)

We will host the LLM (**Phi-3.5 Mini**) on Hugging Face Spaces using Docker.

1.  **Create a Space**:
    *   Go to [huggingface.co/spaces](https://huggingface.co/spaces).
    *   Click **Create new Space**.
    *   **Name**: `rambo2` (matches your repo).
    *   **License**: Apache 2.0 (or MIT).
    *   **SDK**: Select **Docker**.
    *   **Template**: Blank.
    *   **Visibility**: Public or Private.

2.  **Upload Docker Files**:
    You need to upload the contents of the `docker` folder from this repo to the root of your Space.
    *   **Option A (Web UI)**:
        *   In your new Space, go to **Files**.
        *   Click **Add file** -> **Upload files**.
        *   Upload `docker/Dockerfile` and `docker/start.sh`.
        *   **Important**: Ensure `Dockerfile` is at the root of the Space, not in a `docker` subfolder.
    *   **Option B (Git)**:
        *   Clone the Space locally: `git clone https://huggingface.co/spaces/TomCruiseMissile/rambo2`
        *   Copy the contents of `rambo2/docker/*` to the Space folder.
        *   `git add . && git commit -m "Init LLM" && git push`

3.  **Verify Deployment**:
    *   The Space will start building. It might take a few minutes to download the model.
    *   Once "Running", you will see an API endpoint: `https://tomcruisemissile-rambo2.hf.space`

## Phase 3: Connect Frontend to AI

Once the Space is running:

1.  **Update Supabase Env (Important)**:
    *   Since the logic runs on Supabase Edge Functions, you need to set the secret there, not just in Vercel.
    *   Go to your Supabase Dashboard -> Project Settings -> Edge Functions (or Secrets).
    *   Add `LLM_API_URL` (or `OLLAMA_URL` - check your code).
    *   Value: `https://tomcruisemissile-rambo2.hf.space`
    *   *Note: This is the direct API endpoint derived from your Space URL.*
    *   **Optional**: Add `LLM_MODEL` with value `phi3.5` (defaults to phi3.5 if unset).

2.  **Update Vercel Env**:
    *   Go back to Vercel -> Settings -> Environment Variables.
    *   Add `VITE_LLM_API_URL` (if your frontend needs it directly).
    *   Value: `https://tomcruisemissile-rambo2.hf.space`

3.  **Redeploy Vercel**: Redeploy one last time to apply the AI endpoint.

## Security Best Practices & Environment Variables

### 1. Vercel (Frontend)
*   **`VITE_` Prefix**: In Vite/Vercel, any variable starting with `VITE_` (like `VITE_SUPABASE_URL`) is **embedded into the public JavaScript bundle**. Anyone can see these.
    *   **Safe**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (These are designed to be public; security is handled by Supabase Row Level Security).
    *   **Unsafe**: Never put admin keys, database passwords, or the `LLM_API_URL` here if you want to keep the LLM private (though for this alpha, exposing the LLM URL is low risk).
*   **Import .env**: Do **not** use this feature if it requires committing `.env` to GitHub. We explicitly git-ignored `.env` to protect you. Manually add variables in the Vercel Dashboard.
*   **System Env Vars**: You can leave "Automatically expose System Environment Variables" checked; these are just Vercel metadata (like branch name) and are harmless.

### 2. Supabase (Backend Logic)
*   **Edge Function Secrets**: Variables set in **Supabase -> Settings -> Edge Functions** are **private**. They are never exposed to the browser.
*   **Best Practice**: Store the `LLM_API_URL` and `LLM_MODEL` here. The frontend calls the Supabase Function, and the Function talks to the AI. This acts as a secure proxy, hiding the AI infrastructure from the public internet.

### 3. Hugging Face (AI Host)
*   **Visibility**: If your Space is "Public", anyone can query it. If "Private", you need to pass a Hugging Face Token in the header.
*   **For this Alpha**: Keeping it "Public" (or "Unlisted") is easiest. If you make it Private, you must add `LLM_API_KEY` (your HF Token) to the Supabase Secrets so the Edge Function can authenticate.
