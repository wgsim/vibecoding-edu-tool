import type {
  ParsedSession,
  FileChange,
  StaticAnalysisReport,
  TokenUsage,
} from "./types.js";

/**
 * Level 1 Static Analysis: generates a report from a parsed session
 * without requiring any AI model calls.
 */
export function analyzeSession(session: ParsedSession): StaticAnalysisReport {
  const fileChanges = extractFileChanges(session);
  const totalTokens = sumTokenUsage(session);
  const promptCount = session.turns.filter((t) => t.role === "user").length;
  const changeFrequency = computeChangeFrequency(fileChanges);

  return {
    tool: session.tool,
    sessionId: session.sessionId,
    projectPath: session.projectPath,
    fileChanges,
    totalTurns: session.turns.length,
    promptCount,
    totalTokens,
    changeFrequency,
  };
}

/**
 * Extract file changes from assistant turns that contain tool calls
 * targeting file-modifying tools (Write, Edit, etc.)
 */
function extractFileChanges(session: ParsedSession): FileChange[] {
  const changes: FileChange[] = [];

  for (let i = 0; i < session.turns.length; i++) {
    const turn = session.turns[i];
    if (turn.role !== "assistant" || !turn.toolCalls) continue;

    // Find the most recent user prompt before this assistant turn
    const promptText = findPrecedingPrompt(session, i);

    for (const toolCall of turn.toolCalls) {
      const change = toolCallToFileChange(toolCall, promptText, i);
      if (change) {
        changes.push(change);
      }
    }
  }

  return changes;
}

function toolCallToFileChange(
  toolCall: { name: string; input: Record<string, unknown> },
  promptText: string,
  turnIndex: number,
): FileChange | null {
  // Claude Code tools: Write, Edit with file_path
  const filePath =
    (toolCall.input.file_path as string) ??
    (toolCall.input.path as string) ??
    null;

  if (filePath) {
    let changeType: FileChange["changeType"];
    switch (toolCall.name) {
      case "Write":
      case "write":
        changeType = "create";
        break;
      case "Edit":
      case "edit":
        changeType = "edit";
        break;
      default:
        return null;
    }
    return { filePath, changeType, promptText, turnIndex };
  }

  // Codex CLI tools: exec_command with cmd string
  if (toolCall.name === "exec_command") {
    const cmd = (toolCall.input.cmd as string) ?? "";
    return parseExecCommandForFileChange(cmd, promptText, turnIndex);
  }

  return null;
}

/**
 * Attempt to extract file changes from Codex CLI exec_command strings.
 * This is best-effort — only catches common write patterns.
 */
function parseExecCommandForFileChange(
  cmd: string,
  promptText: string,
  turnIndex: number,
): FileChange | null {
  // Patterns: cat > file, echo > file, tee file, cp ... dest
  const writePatterns = [
    /(?:cat|tee)\s+>\s*["']?([^\s"']+)/,
    /echo\s+.*>\s*["']?([^\s"']+)/,
    /(?:mv|cp)\s+\S+\s+["']?([^\s"']+)/,
    /mkdir\s+-p\s+["']?([^\s"']+)/,
  ];

  for (const pattern of writePatterns) {
    const match = cmd.match(pattern);
    if (match?.[1]) {
      return {
        filePath: match[1],
        changeType: "create",
        promptText,
        turnIndex,
      };
    }
  }

  // sed -i modifies files in-place
  const sedMatch = cmd.match(/sed\s+-i[^\s]*\s+.*\s+["']?([^\s"']+)/);
  if (sedMatch?.[1]) {
    return {
      filePath: sedMatch[1],
      changeType: "edit",
      promptText,
      turnIndex,
    };
  }

  return null;
}

function findPrecedingPrompt(
  session: ParsedSession,
  assistantTurnIndex: number,
): string {
  for (let i = assistantTurnIndex - 1; i >= 0; i--) {
    if (session.turns[i].role === "user" && session.turns[i].content) {
      return session.turns[i].content;
    }
  }
  return "(no preceding prompt)";
}

function sumTokenUsage(session: ParsedSession): TokenUsage {
  let inputTokens = 0;
  let outputTokens = 0;

  for (const turn of session.turns) {
    if (turn.tokenUsage) {
      inputTokens += turn.tokenUsage.inputTokens;
      outputTokens += turn.tokenUsage.outputTokens;
    }
  }

  return { inputTokens, outputTokens };
}

function computeChangeFrequency(
  changes: FileChange[],
): Array<{ filePath: string; changeCount: number }> {
  const counts = new Map<string, number>();

  for (const change of changes) {
    counts.set(change.filePath, (counts.get(change.filePath) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([filePath, changeCount]) => ({ filePath, changeCount }))
    .sort((a, b) => b.changeCount - a.changeCount);
}
