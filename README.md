# SR&ED GPT

## Project info

This project is a vendor-agnostic implementation of SR&ED GPT, featuring:
- **Frontend**: React + Vite (deployed on Vercel)
- **Backend**: Supabase
- **AI**: Open-source LLM (DeepSeek-R1-Distill-Qwen-1.5B) hosted on Hugging Face Spaces

## Getting Started

### Prerequisites
- Node.js & npm
- Docker (for local LLM testing)

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
Deploy the `docker` directory to a Hugging Face Space using the Docker SDK.
- Ensure the Space is set to expose port 7860.
- The Dockerfile is configured to run as user 1000.
