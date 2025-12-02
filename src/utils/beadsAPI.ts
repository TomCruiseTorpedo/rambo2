// High‑level wrapper around the Beads CLI for Antigravity agents.
// All functions return parsed JSON (the `--json` flag is required).

import { bdCommand } from "./beadsCLI";

/** Create a new issue in Beads. */
export async function createIssue(
  title: string,
  tags: string[] = [],
  priority: number = 0
): Promise<any> {
  const args = ["create", title, "-t", tags.join(","), "-p", `${priority}`, "--json"];
  return await bdCommand(args);
}

/** Get a list of ready (unblocked) issues. */
export async function getReadyIssues(): Promise<any> {
  return await bdCommand(["ready", "--json"]);
}

/** Add a discovered‑from dependency between two issues. */
export async function addDiscoveredDependency(
  childId: string,
  parentId: string
): Promise<any> {
  return await bdCommand([
    "dep",
    "add",
    childId,
    parentId,
    "--type",
    "discovered-from",
    "--json",
  ]);
}

/** Simple helper to fetch an issue by ID (optional). */
export async function getIssue(id: string): Promise<any> {
  return await bdCommand(["show", id, "--json"]);
}