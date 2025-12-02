// Thin wrapper around the `bd` CLI for programmatic use.
// All commands return parsed JSON (the `--json` flag is required).

import { execFile } from "node:child_process";

export async function bdCommand(args: string[]): Promise<any> {
  return new Promise((resolve, reject) => {
    execFile("bd", args, { encoding: "utf8" }, (err, stdout, stderr) => {
      if (err) {
        reject(new Error(`bd command failed: ${stderr.trim()}`));
      } else {
        try {
          const parsed = JSON.parse(stdout);
          resolve(parsed);
        } catch {
          // Some commands (e.g. `bd list`) output plain text – return it unchanged.
          resolve(stdout.trim());
        }
      }
    });
  });
}