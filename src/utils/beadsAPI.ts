// High‑level wrapper around the Beads CLI for Antigravity agents.
// All functions return parsed JSON (the `--json` flag is required).
//
// ⚠️ SHARED RESOURCE: Before modifying this file, read:
// rambo2/group-code/.ai_context/BEADS_SHARED_CONTEXT.md

import { bdCommand } from "./beadsCLI";

/** Interface representing a Beads issue (v0.30.0) */
export interface BeadsIssue {
  id: string; // short hash (e.g., "a1b2c3d")
  title: string;
  description?: string;
  labels?: string[]; // primary field
  tags?: string[]; // deprecated alias for backward compatibility
  priority: number; // clamped to 0‑4
  status: "open" | "ready" | "in-progress" | "closed";
  issue_type?: "task" | "bug" | "feature" | "epic" | "chore"; // v0.30.0
  created_at?: string; // ISO timestamp
  updated_at?: string; // ISO timestamp
  // Optional fields from previous versions
  content_hash?: string;
  closed_at?: string;
  close_reason?: string;
  source_repo?: string;
  dependency_count?: number;
  dependent_count?: number;
  assignee?: string;
  estimate?: number; // time estimate in minutes
  external_ref?: string; // external reference (e.g., 'gh-9', 'jira-ABC')
  parent?: string; // parent issue ID for hierarchical issues
}

/** Normalise raw issue data from the CLI */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normaliseIssue(raw: any): BeadsIssue {
  return {
    id: raw.id,
    title: raw.title,
    description: raw.description,
    labels: raw.labels ?? raw.tags,
    tags: raw.tags, // keep for backward compatibility
    priority: Math.min(Math.max(raw.priority ?? 0, 0), 4),
    status: raw.status === "done" ? "closed" : raw.status,
    issue_type: raw.issue_type,
    created_at: raw.created_at,
    updated_at: raw.updated_at,
    content_hash: raw.content_hash,
    closed_at: raw.closed_at,
    close_reason: raw.close_reason,
    source_repo: raw.source_repo,
    dependency_count: raw.dependency_count,
    dependent_count: raw.dependent_count,
    assignee: raw.assignee,
    estimate: raw.estimate,
    external_ref: raw.external_ref,
    parent: raw.parent,
  };
}

/** Create a new issue in Beads with v0.30.0 support and backward compatibility. */
export async function createIssue(
  title: string,
  labelsOrOptions?: string[] | {
    labels?: string[];
    priority?: number;
    description?: string;
    issue_type?: "task" | "bug" | "feature" | "epic" | "chore";
    assignee?: string;
    estimate?: number; // time estimate in minutes
    external_ref?: string;
    parent?: string; // parent issue ID
  },
  priority?: number
): Promise<BeadsIssue> {
  // Handle backward compatibility: createIssue(title, labels[], priority)
  let options: {
    labels?: string[];
    priority?: number;
    description?: string;
    issue_type?: "task" | "bug" | "feature" | "epic" | "chore";
    assignee?: string;
    estimate?: number;
    external_ref?: string;
    parent?: string;
  } = {};
  
  if (Array.isArray(labelsOrOptions)) {
    // Old signature: createIssue(title, labels, priority)
    options = {
      labels: labelsOrOptions,
      priority: priority ?? 2,
    };
  } else {
    // New signature: createIssue(title, options)
    options = labelsOrOptions || {};
  }

  const {
    labels = [],
    priority: finalPriority = 2,
    description,
    issue_type = "task",
    assignee,
    estimate,
    external_ref,
    parent,
  } = options;

  const safePriority = Math.min(Math.max(finalPriority, 0), 4);
  const args = [
    "create",
    title,
    ...(labels.length ? ["--labels", labels.join(",")] : []),
    "--priority",
    `${safePriority}`,
    "--type",
    issue_type,
    ...(description ? ["--description", description] : []),
    ...(assignee ? ["--assignee", assignee] : []),
    ...(estimate ? ["--estimate", `${estimate}`] : []),
    ...(external_ref ? ["--external-ref", external_ref] : []),
    ...(parent ? ["--parent", parent] : []),
    "--json",
  ];
  const raw = await bdCommand(args);
  return normaliseIssue(raw);
}

/** Get a list of ready (unblocked) issues. */
export async function getReadyIssues(): Promise<BeadsIssue[]> {
  const raw = await bdCommand(["ready", "--json"]);
  return Array.isArray(raw) ? raw.map(normaliseIssue) : [];
}

/** Add a discovered‑from dependency between two issues. */
export async function addDiscoveredDependency(
  childId: string,
  parentId: string
// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
export async function getIssue(id: string): Promise<BeadsIssue> {
  const raw = await bdCommand(["show", id, "--json"]);
  return normaliseIssue(raw);
}

/** Get issues by type (v0.30.0 feature) */
export async function getIssuesByType(
  type: "task" | "bug" | "feature" | "epic" | "chore"
): Promise<BeadsIssue[]> {
  const raw = await bdCommand(["list", "--json"]);
  const issues = Array.isArray(raw) ? raw.map(normaliseIssue) : [];
  return issues.filter((issue) => issue.issue_type === type);
}

/** Get issues by status with enhanced filtering */
export async function getIssuesByStatus(
  status: "open" | "ready" | "in-progress" | "closed"
): Promise<BeadsIssue[]> {
  const raw = await bdCommand(["list", "--json"]);
  const issues = Array.isArray(raw) ? raw.map(normaliseIssue) : [];
  return issues.filter((issue) => issue.status === status);
}

/** Update an existing issue (v0.30.0) */
export async function updateIssue(
  id: string,
  updates: {
    title?: string;
    description?: string;
    labels?: string[];
    priority?: number;
    status?: "open" | "ready" | "in-progress" | "closed";
    assignee?: string;
    estimate?: number;
  }
): Promise<BeadsIssue> {
  const args = ["update", id];
  
  if (updates.title) args.push("--title", updates.title);
  if (updates.description) args.push("--description", updates.description);
  if (updates.labels) args.push("--labels", updates.labels.join(","));
  if (updates.priority !== undefined) {
    const safePriority = Math.min(Math.max(updates.priority, 0), 4);
    args.push("--priority", `${safePriority}`);
  }
  if (updates.status) args.push("--status", updates.status);
  if (updates.assignee) args.push("--assignee", updates.assignee);
  if (updates.estimate) args.push("--estimate", `${updates.estimate}`);
  
  args.push("--json");
  const raw = await bdCommand(args);
  return normaliseIssue(raw);
}

/** Close an issue with optional reason */
export async function closeIssue(
  id: string,
  reason?: string
): Promise<BeadsIssue> {
  const args = ["close", id];
  if (reason) args.push("--reason", reason);
  args.push("--json");
  const raw = await bdCommand(args);
  return normaliseIssue(raw);
}

/** Search issues by text query (v0.30.0) */
export async function searchIssues(query: string): Promise<BeadsIssue[]> {
  const raw = await bdCommand(["search", query, "--json"]);
  return Array.isArray(raw) ? raw.map(normaliseIssue) : [];
}

/** Get issue statistics */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getIssueStats(): Promise<any> {
  return await bdCommand(["stats", "--json"]);
}

/** Backward‑compatible wrapper for old tag‑based API */
export const getIssuesByTag = async (tag: string) => {
  const all = await getReadyIssues();
  return all.filter((issue) => (issue.labels ?? []).includes(tag));
};


