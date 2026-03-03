import { createReadStream } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import { createInterface } from "node:readline";
import { join, sep, basename } from "node:path";
import { homedir } from "node:os";
import type {
  ParsedSession,
  SessionTurn,
  ToolCall,
  TokenUsage,
} from "../types.js";

const CODEX_SESSIONS_DIR = join(homedir(), ".codex", "sessions");

/**
 * Find all Codex CLI session files that match a given project path.
 * Codex stores sessions by date: ~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl
 * The working directory is in the first line's session_meta.payload.cwd
 */
export async function findSessionFiles(
  projectPath: string,
): Promise<string[]> {
  const allFiles = await collectJsonlFiles(CODEX_SESSIONS_DIR);
  const matched: string[] = [];

  for (const filePath of allFiles) {
    const cwd = await extractCwd(filePath);
    if (cwd && normalizePath(cwd) === normalizePath(projectPath)) {
      matched.push(filePath);
    }
  }

  return matched;
}

/**
 * Parse a single Codex CLI JSONL session file into a ParsedSession.
 *
 * Codex JSONL format:
 *   - type: "session_meta"   → payload.cwd, payload.id
 *   - type: "response_item"  → payload.role ("user"|"assistant"|"developer"|"function_call"|"function_call_output")
 *   - type: "event_msg"      → metadata (token counts, rate limits, etc.)
 */
export async function parseSessionFile(
  sessionFilePath: string,
  projectPath: string,
): Promise<ParsedSession> {
  const content = await readFile(sessionFilePath, "utf-8");
  const lines = content.split("\n").filter((line) => line.trim());

  const turns: SessionTurn[] = [];
  let startTime = "";
  let sessionId = "";

  for (const line of lines) {
    let entry: Record<string, unknown>;
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }

    const type = entry.type as string | undefined;
    const timestamp = (entry.timestamp as string) ?? "";
    const payload = (entry.payload as Record<string, unknown>) ?? {};

    if (!startTime && timestamp) {
      startTime = timestamp;
    }

    // Session metadata
    if (type === "session_meta") {
      sessionId = (payload.id as string) ?? "";
      continue;
    }

    // Response items contain actual conversation data
    if (type === "response_item") {
      const turn = extractTurnFromResponseItem(payload, timestamp);
      if (turn) turns.push(turn);
    }
  }

  if (!sessionId) {
    sessionId = basename(sessionFilePath, ".jsonl");
  }

  return {
    tool: "codex-cli",
    sessionId,
    projectPath,
    sessionFilePath,
    startTime,
    turns,
  };
}

function extractTurnFromResponseItem(
  payload: Record<string, unknown>,
  timestamp: string,
): SessionTurn | null {
  const role = payload.role as string | undefined;
  const itemType = payload.type as string | undefined;

  // User message
  if (role === "user") {
    const content = extractContent(payload);
    if (!content) return null;
    // Filter out system context injections
    if (
      content.startsWith("<environment_context>") ||
      content.startsWith("# AGENTS.md")
    ) {
      return null;
    }
    return { timestamp, role: "user", content };
  }

  // Assistant message
  if (role === "assistant") {
    const content = extractContent(payload);
    return {
      timestamp,
      role: "assistant",
      content: content ?? "",
    };
  }

  // Function call (tool use by assistant)
  if (itemType === "function_call") {
    const name = (payload.name as string) ?? "unknown";
    let args: Record<string, unknown> = {};
    try {
      const rawArgs = payload.arguments as string | undefined;
      if (rawArgs) args = JSON.parse(rawArgs);
    } catch {
      // arguments might not be valid JSON
    }

    const toolCall: ToolCall = { name, input: args };
    return {
      timestamp,
      role: "assistant",
      content: "",
      toolCalls: [toolCall],
    };
  }

  return null;
}

function extractContent(payload: Record<string, unknown>): string | null {
  const content = payload.content;

  if (typeof content === "string") return content;

  if (Array.isArray(content)) {
    const texts = (content as Array<Record<string, unknown>>)
      .filter(
        (block) =>
          block.type === "input_text" ||
          block.type === "output_text" ||
          block.type === "text",
      )
      .map((block) => block.text as string)
      .filter(Boolean);
    return texts.length > 0 ? texts.join("\n") : null;
  }

  return null;
}

/** Extract cwd from session_meta (first line only — avoids loading entire file) */
function extractCwd(filePath: string): Promise<string | null> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: createReadStream(filePath) });
    let settled = false;

    const finish = (value: string | null) => {
      if (settled) return;
      settled = true;
      rl.close();
      resolve(value);
    };

    rl.once("line", (line) => {
      try {
        const entry = JSON.parse(line);
        finish(entry.type === "session_meta" ? ((entry.payload?.cwd as string) ?? null) : null);
      } catch {
        finish(null);
      }
    });

    rl.once("close", () => finish(null));
    rl.once("error", () => finish(null));
  });
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
