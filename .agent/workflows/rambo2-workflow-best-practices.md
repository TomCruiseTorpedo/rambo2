---
description: Rambo 2 Agentic Workflow Best Practices
---

> **Purpose**: These rules are designed to optimize the performance of AI agents (like Cursor, Windsurf, or Antigravity) working on this project. Follow them to reduce token usage, prevent errors, and maintain architectural integrity.

##  Automated Workflows

### Workflow: "Deploy Updates"
1.  **Frontend**: Run `npm run build` to verify no errors.
2.  **Backend**: Run `npx supabase functions deploy process-sred --no-verify-jwt`.
3.  **AI**: Run `./scripts/deploy_to_hf.sh` (only if Dockerfile changed).

### Workflow: "Debug Backend"
1.  **Logs**: Check Supabase dashboard logs (or ask user to).
2.  **Test**: Run `node scripts/test_end_to_end.js`.
3.  **Fix**: Edit `supabase/functions/process-sred/index.ts`.
4.  **Deploy**: Redeploy function immediately to test fix.

### Workflow: "Add New Field to PDF"
1.  **Identify**: Find the field ID in the PDF (use `scripts/extract_pdf_fields.py`).
2.  **Map**: Add the field to `supabase/field_mappings/t661_critical_fields.json`.
3.  **Upload**: Run `node scripts/upload_mapping.js`.
4.  **Code**: Update `process-sred` to extract the data and pass it to `fill-pdf-t661`.

### Workflow: "Pre-Commit Security Check"
1.  **Scan**: Run `grep -r "API_KEY" . --exclude-dir=node_modules --exclude-dir=.git` to check for leaks.
2.  **Review**: Manually check any new `scripts/` or `functions/` for hardcoded strings.
3.  **Commit**: Only commit after verifying clean status.