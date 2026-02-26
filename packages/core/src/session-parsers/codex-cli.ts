import { readFile, readdir } from "node:fs/promises";
import { join, sep } from "node:path";
import { homedir } from "node:os";
import type {
  ParsedSession,
  SessionTurn,
  TokenUsage,
} from "../types.js";

const CODEX_SESSIONS_DIR = join(homedir(), ".codex", "sessions");

/**
 * Find all Codex CLI session files that match a given project path.
 * Codex stores sessions by date: ~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl
 * We need to read each file and check the working_directory field.
 */
export async function findSessionFiles(
  projectPath: string,
): Promise<string[]> {
  const allFiles = await collectJsonlFiles(CODEX_SESSIONS_DIR);
  const matched: string[] = [];

  for (const filePath of allFiles) {
    const workDir = await extractWorkingDirectory(filePath);
    if (workDir && normalizePath(workDir) === normalizePath(projectPath)) {
      matched.push(filePath);
    }
  }

  return matched;
}

/**
 * Parse a single Codex CLI JSONL session file into a ParsedSession.
 */
export async function parseSessionFile(
  sessionFilePath: string,
  projectPath: string,
): Promise<ParsedSession> {
  const content = await readFile(sessionFilePath, "utf-8");
  const lines = content.split("\n").filter((line) => line.trim());

  const turns: SessionTurn[] = [];
  let startTime = "";

  for (const line of lines) {
    let entry: Record<string, unknown>;
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }

    const turn = extractTurn(entry);
    if (turn) {
      if (!startTime && turn.timestamp) {
        startTime = turn.timestamp;
      }
      turns.push(turn);
    }
  }

  const sessionId = sessionFilePath
    .split(sep)
    .pop()!
    .replace(".jsonl", "");

  return {
    tool: "codex-cli",
    sessionId,
    projectPath,
    sessionFilePath,
    startTime,
    turns,
  };
}

function extractTurn(entry: Record<string, unknown>): SessionTurn | null {
  const type = entry.type as string | undefined;
  const role = entry.role as string | undefined;
  const timestamp = (entry.timestamp as string) ?? "";

  if (type === "message" || role === "user" || role === "assistant") {
    const content = extractContent(entry);
    const tokenUsage = extractTokenUsage(entry);

    return {
      timestamp,
      role: role === "assistant" ? "assistant" : "user",
      content: content ?? "",
      ...(tokenUsage && { tokenUsage }),
    };
  }

  return null;
}

function extractContent(entry: Record<string, unknown>): string | null {
  if (typeof entry.content === "string") return entry.content;
  if (typeof entry.message === "string") return entry.message;

  const msg = entry.message as Record<string, unknown> | undefined;
  if (typeof msg?.content === "string") return msg.content;

  return null;
}

function extractTokenUsage(
  entry: Record<string, unknown>,
): TokenUsage | null {
  const usage = entry.usage as Record<string, unknown> | undefined;
  if (!usage) return null;

  const inputTokens =
    (usage.input_tokens as number) ?? (usage.prompt_tokens as number) ?? 0;
  const outputTokens =
    (usage.output_tokens as number) ??
    (usage.completion_tokens as number) ??
    0;
  if (inputTokens === 0 && outputTokens === 0) return null;

  return { inputTokens, outputTokens };
}

/** Extract working_directory from the first few lines of a session file */
async function extractWorkingDirectory(
  filePath: string,
): Promise<string | null> {
  try {
    const content = await readFile(filePath, "utf-8");
    // Only scan first 10 lines for efficiency
    const lines = content.split("\n").slice(0, 10);

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const entry = JSON.parse(line);
        const workDir =
          (entry.working_directory as string) ??
          (entry.cwd as string) ??
          null;
        if (workDir) return workDir;
      } catch {
        continue;
      }
    }
  } catch {
    // File not readable
  }
  return null;
}

/** Recursively collect all .jsonl files under a directory */
async function collectJsonlFiles(dir: string): Promise<string[]> {
  const results: string[] = [];

  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...(await collectJsonlFiles(fullPath)));
      } else if (entry.name.endsWith(".jsonl")) {
        results.push(fullPath);
      }
    }
  } catch {
    // Directory doesn't exist or not readable
  }

  return results;
}

/** Normalize path for comparison (remove trailing slash) */
function normalizePath(p: string): string {
  return p.endsWith(sep) ? p.slice(0, -1) : p;
}
