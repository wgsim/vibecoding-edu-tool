/**
 * Common types shared across all VibeCoding Edu modules.
 */

/** Supported AI coding tools for session parsing */
export type AiTool = "claude-code" | "codex-cli";

/** A single turn in an AI coding session */
export interface SessionTurn {
  /** Timestamp of the turn */
  timestamp: string;
  /** Role: user prompt or assistant response */
  role: "user" | "assistant";
  /** Text content of the message */
  content: string;
  /** Tool calls made by the assistant (if any) */
  toolCalls?: ToolCall[];
  /** Token usage for this turn */
  tokenUsage?: TokenUsage;
}

export interface ToolCall {
  /** Tool name (e.g., "Write", "Edit", "Bash") */
  name: string;
  /** Tool input parameters */
  input: Record<string, unknown>;
  /** Tool output/result */
  output?: string;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}

/** Parsed session: a complete AI coding conversation tied to a project */
export interface ParsedSession {
  /** Which AI tool generated this session */
  tool: AiTool;
  /** Unique session identifier */
  sessionId: string;
  /** Absolute path to the project this session belongs to */
  projectPath: string;
  /** Absolute path to the session file */
  sessionFilePath: string;
  /** Session start time */
  startTime: string;
  /** All turns in chronological order */
  turns: SessionTurn[];
}

/** File change extracted from a session */
export interface FileChange {
  /** Path of the changed file (relative to project root) */
  filePath: string;
  /** Type of change */
  changeType: "create" | "edit" | "delete";
  /** The prompt that triggered this change */
  promptText: string;
  /** Index of the turn that caused this change */
  turnIndex: number;
}

/** JSON output contract for the `analyze --json` command */
export interface AnalysisFailedSession {
  tool: AiTool;
  filePath: string;
  error: string;
}

export interface AnalysisSessionSummary {
  sessionId: string;
  tool: AiTool;
  totalTurns: number;
  promptCount: number;
  fileChangeCount: number;
  tokens: TokenUsage;
  topFiles: Array<{ filePath: string; changeCount: number }>;
  promptMappings: Array<Pick<FileChange, "filePath" | "changeType" | "promptText" | "turnIndex">>;
}

export interface AnalysisTotals {
  turns: number;
  prompts: number;
  fileChanges: number;
  inputTokens: number;
  outputTokens: number;
  claudeSessions: number;
}

export interface AnalysisJsonResult {
  projectPath: string;
  sessionsFound: number;
  activeSessions: number;
  skippedSessions: number;
  failedSessions: number;
  totals: AnalysisTotals;
  topFiles: Array<{ filePath: string; changeCount: number }>;
  sessions: AnalysisSessionSummary[];
  errors: AnalysisFailedSession[];
}

/** Level 1 analysis result (no AI model required) */
export interface StaticAnalysisReport {
  /** Source session metadata */
  tool: AiTool;
  sessionId: string;
  projectPath: string;
  /** Prompt-to-file-change mappings */
  fileChanges: FileChange[];
  /** Total turns in session */
  totalTurns: number;
  /** User prompt count */
  promptCount: number;
  /** Total tokens consumed */
  totalTokens: TokenUsage;
  /** Files sorted by change frequency (most changed first) */
  changeFrequency: Array<{ filePath: string; changeCount: number }>;
}
