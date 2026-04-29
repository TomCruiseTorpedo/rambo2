// Thin wrapper around the `bd` CLI for programmatic use (v0.30.0).
// All commands return parsed JSON (the `--json` flag is required).
//
// ⚠️ SHARED RESOURCE: Before modifying this file, read:
// rambo2/group-code/.ai_context/BEADS_SHARED_CONTEXT.md
//
// Path precedence:
//   1. BEADS_BIN environment variable (explicit path to bd binary)
//   2. Default: /usr/local/bin/bd (system/Homebrew install for Antigravity/Kiro)
//
// Note: VS Code (Cline/Codex) uses its own isolated install at ~/.vscode-beads/bin/bd.
// Do NOT overwrite that path. See ~/.config/tooling/beads-paths.txt for details.

import { execFile } from "node:child_process";

/** Resolve the bd binary path */
function getBdPath(): string {
  return process.env.BEADS_BIN || "/usr/local/bin/bd";
}

export async function bdCommand(args: string[]): Promise<any> {
  const bdPath = getBdPath();
  return new Promise((resolve, reject) => {
    execFile(bdPath, args, { encoding: "utf8" }, (err, stdout, stderr) => {
      if (err) {
        // Enhanced error handling for v0.30.0
        const errorMessage = stderr.trim() || err.message;
        reject(new Error(`bd command failed (${bdPath}): ${errorMessage}`));
        return;
      }
      
      // Handle empty output
      if (!stdout.trim()) {
        resolve(null);
        return;
      }
      
      try {
        const parsed = JSON.parse(stdout);
        resolve(parsed);
      } catch (parseError) {
        // Some commands output plain text – return it unchanged.
        // In v0.30.0, most commands support --json, but some may still return plain text
        resolve(stdout.trim());
      }
    });
  });
}

/** Get the current Beads version */
export async function getBdVersion(): Promise<string> {
  const output = await bdCommand(["--version"]);
  return typeof output === "string" ? output : "unknown";
}

/** Check if Beads is properly initialized in the current directory */
export async function isBdInitialized(): Promise<boolean> {
  try {
    await bdCommand(["status", "--json"]);
    return true;
  } catch {
    return false;
  }
}

/** Initialize Beads in the current directory */
export async function initBd(): Promise<void> {
  await bdCommand(["init"]);
}
