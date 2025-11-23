---
trigger: always_on
---

> **Purpose**: These rules are designed to optimize the performance of AI agents (like Cursor, Windsurf, or Antigravity) working on this project. Follow them to reduce token usage, prevent errors, and maintain architectural integrity.

##  Workspace-Specific Rules (Rambo2)

### A. LLM Integration
*   **Rule**: **NEVER** hardcode LLM API calls in the frontend (`src/`).
*   **Why**: We use a 3-tier fallback system that lives exclusively in the `process-sred` Edge Function.
*   **Action**: Always call `supabase.functions.invoke("process-sred", ...)` from the frontend.

### B. PDF Generation
*   **Rule**: **NEVER** guess PDF coordinates.
*   **Why**: The T661 form is strict.
*   **Action**: If you need to change field positions, modify `supabase/field_mappings/t661_critical_fields.json` and run `node scripts/upload_mapping.js`.

### C. Deployment
*   **Rule**: Use the helper scripts.
*   **AI Deployment**: ` ./scripts/deploy_to_hf.sh <user> <space>`
*   **Backend Deployment**: `npx supabase functions deploy --no-verify-jwt`

### D. Free Tier Constraints
*   **Rule**: Respect memory limits (128MB).
*   **Action**: Do not use `fs.readFileSync` on large files in Edge Functions. Use streams.
*   **Action**: Do not import heavy libraries (like `xlsx`) unless absolutely necessary and optimized.

### E. Secret API Keys (Future Migration)
*   **Current State**: Using legacy `service_role` key (works fine, but Supabase recommends migration).
*   **Future Enhancement**: A Secret API key has been created in the Supabase Dashboard for eventual migration.
*   **Action Required (Later)**: Update `scripts/upload_mapping.js` to use the Secret API key instead of `SUPABASE_SERVICE_ROLE_KEY`.
*   **Benefits**: Better audit logging, revocability, SOC2 compliance alignment.