import { readFile, readdir } from "node:fs/promises";
import { join, sep } from "node:path";
import { homedir } from "node:os";
import type {
  ParsedSession,
  SessionTurn,
  ToolCall,
  TokenUsage,
} from "../types.js";

const CLAUDE_PROJECTS_DIR = join(homedir(), ".claude", "projects");

/**
 * Encode a project path to the Claude Code directory name format.
 * Claude Code replaces both path separators and underscores with hyphens.
 * e.g., "/Users/alice/my_project" → "-Users-alice-my-project"
 */
export function encodeProjectPath(projectPath: string): string {
  return projectPath.replace(/[/\\_ ]/g, "-");
}

/**
 * Find all session files for a given project path.
 * Uses fuzzy matching: scans all project dirs and matches by encoded path.
 */
export async function findSessionFiles(
  projectPath: string,
): Promise<string[]> {
  const encoded = encodeProjectPath(projectPath);

  // Try exact match first
  const exactDir = join(CLAUDE_PROJECTS_DIR, encoded);
  try {
    const entries = await readdir(exactDir);
    const jsonlFiles = entries
      .filter((f) => f.endsWith(".jsonl"))
      .map((f) => join(exactDir, f));
    if (jsonlFiles.length > 0) return jsonlFiles;
  } catch {
    // exact match failed, try scanning
  }

  // Scan all project directories for a match
  try {
    const allDirs = await readdir(CLAUDE_PROJECTS_DIR);
    for (const dir of allDirs) {
      if (dir === encoded) {
        const fullDir = join(CLAUDE_PROJECTS_DIR, dir);
        const entries = await readdir(fullDir);
        return entries
          .filter((f) => f.endsWith(".jsonl"))
          .map((f) => join(fullDir, f));
      }
    }
  } catch {
    // projects dir doesn't exist
  }

  return [];
}

/**
 * Parse a single Claude Code JSONL session file into a ParsedSession.
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
      continue; // skip malformed lines
    }

    const turn = extractTurn(entry);
    if (turn) {
      if (!startTime && turn.timestamp) {
        startTime = turn.timestamp;
      }
      turns.push(turn);
    }
  }

  // Extract session ID from filename (e.g., "abc-def-123.jsonl" → "abc-def-123")
  const sessionId = sessionFilePath
    .split(sep)
    .pop()!
    .replace(".jsonl", "");

  return {
    tool: "claude-code",
    sessionId,
    projectPath,
    sessionFilePath,
    startTime,
    turns,
  };
}

/**
 * Extract a SessionTurn from a raw JSONL entry.
 * Claude Code JSONL format varies; this handles known message types.
 */
function extractTurn(entry: Record<string, unknown>): SessionTurn | null {
  const type = entry.type as string | undefined;
  const timestamp = (entry.timestamp as string) ?? "";

  // Human/user message (Claude Code uses type: "user", not role: "user")
  if (type === "user" || type === "human" || entry.role === "user") {
    const content = extractContent(entry);
    if (!content) return null;
    // Filter out system/command messages that aren't real user prompts
    if (content.startsWith("<local-command") || content.startsWith("<command-name")) {
      return null;
    }
    return { timestamp, role: "user", content };
  }

  // Assistant message
  if (type === "assistant" || entry.role === "assistant") {
    const content = extractContent(entry);
    const toolCalls = extractToolCalls(entry);
    const tokenUsage = extractTokenUsage(entry);
    return {
      timestamp,
      role: "assistant",
      content: content ?? "",
      ...(toolCalls.length > 0 && { toolCalls }),
      ...(tokenUsage && { tokenUsage }),
    };
  }

  return null;
}

function extractContent(entry: Record<string, unknown>): string | null {
  const msg = entry.message as Record<string, unknown> | undefined;

  // Direct content string
  if (typeof msg?.content === "string") {
    return msg.content;
  }

  // Content array (Claude format)
  if (Array.isArray(msg?.content)) {
    const textParts = (msg.content as Array<Record<string, unknown>>)
      .filter((block) => block.type === "text")
      .map((block) => block.text as string);
    return textParts.length > 0 ? textParts.join("\n") : null;
  }

  // Fallback: direct content on entry
  if (typeof entry.content === "string") {
    return entry.content;
  }

  return null;
}

function extractToolCalls(entry: Record<string, unknown>): ToolCall[] {
  const msg = entry.message as Record<string, unknown> | undefined;
  if (!Array.isArray(msg?.content)) return [];

  return (msg.content as Array<Record<string, unknown>>)
    .filter((block) => block.type === "tool_use")
    .map((block) => ({
      name: block.name as string,
      input: (block.input as Record<string, unknown>) ?? {},
    }));
}

function extractTokenUsage(
  entry: Record<string, unknown>,
): TokenUsage | null {
  const usage = entry.usage as Record<string, unknown> | undefined;
  if (!usage) return null;

  const inputTokens = (usage.input_tokens as number) ?? 0;
  const outputTokens = (usage.output_tokens as number) ?? 0;
  if (inputTokens === 0 && outputTokens === 0) return null;

  return { inputTokens, outputTokens };
}
