import * as vscode from "vscode";
import { relative, join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { AnalysisJsonResult } from "@vibecoding/core";

const execFileAsync = promisify(execFile);

let extensionPath: string;

export function activate(context: vscode.ExtensionContext): void {
  extensionPath = context.extensionPath;
  context.subscriptions.push(
    vscode.commands.registerCommand("vibecoding.xray", xrayCommand),
    vscode.commands.registerCommand("vibecoding.dojo", dojoCommand),
    vscode.commands.registerCommand("vibecoding.analyze", analyzeCommand),
  );
}

export function deactivate(): void {}

// ── X-Ray ─────────────────────────────────────────────────────────────────────

async function xrayCommand(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage("VibeCoding: Open a file first.");
    return;
  }

  const level = await vscode.window.showQuickPick(
    [
      { label: "$(mortar-board) Beginner", description: "Analogy-based — minimal jargon", value: "beginner" },
      { label: "$(book) Intermediate", description: "Principles + pattern names", value: "intermediate" },
      { label: "$(shield) Expert", description: "Architecture, risks, trade-offs", value: "expert" },
    ],
    { title: "X-Ray: Choose explanation depth", placeHolder: "Select your level" },
  );
  if (!level) return;

  const selection = editor.selection;
  const code = selection.isEmpty
    ? editor.document.getText()
    : editor.document.getText(selection);

  const fileName = relative(
    vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? "",
    editor.document.uri.fsPath,
  );
  const lineStart = selection.isEmpty ? 1 : selection.start.line + 1;
  const lineEnd = selection.isEmpty ? editor.document.lineCount : selection.end.line + 1;

  const levelInstructions: Record<string, string> = {
    beginner:
      "Use everyday analogies (LEGO, cooking, etc.). Avoid jargon. " +
      "For each section explain: what it does in one plain sentence, what breaks without it, and one concept to remember.",
    intermediate:
      "For each significant section explain: What it does, Why it's needed (what breaks without it), " +
      "and the underlying Concept (pattern name, data structure, algorithm).",
    expert:
      "For each significant section explain: the Design decision (why this structure), " +
      "any Risks (vulnerabilities, performance, scalability limits), and Alternatives with trade-offs.",
  };

  const prompt =
    `Perform an X-Ray analysis of the following code from ${fileName} (lines ${lineStart}–${lineEnd}).\n\n` +
    `Level: ${level.value.toUpperCase()}\n` +
    `${levelInstructions[level.value]}\n\n` +
    `End with a Dependency Map (how this code connects to the rest of the project) ` +
    `and a Learning Path (2–3 concepts to study next).\n\n` +
    "```\n" + code.slice(0, 4000) + (code.length > 4000 ? "\n... (truncated)" : "") + "\n```";

  await vscode.env.clipboard.writeText(prompt);

  const action = await vscode.window.showInformationMessage(
    `X-Ray prompt (${level.value}) copied to clipboard — paste it into your AI assistant.`,
    "Show Preview",
  );

  if (action === "Show Preview") {
    const channel = vscode.window.createOutputChannel("VibeCoding X-Ray");
    channel.clear();
    channel.appendLine(`📍 X-Ray: ${fileName} (lines ${lineStart}–${lineEnd}) — ${level.value}`);
    channel.appendLine("─".repeat(60));
    channel.appendLine(prompt);
    channel.show();
  }
}

// ── Dojo ──────────────────────────────────────────────────────────────────────

async function dojoCommand(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage("VibeCoding: Open a file first.");
    return;
  }

  const difficulty = await vscode.window.showQuickPick(
    [
      { label: "$(check) Easy", description: "2 bugs — null check, off-by-one", value: "easy" },
      { label: "$(warning) Medium", description: "3 bugs — mixed categories, control flow", value: "medium" },
      { label: "$(flame) Hard", description: "3 bugs — race condition, edge case, security", value: "hard" },
    ],
    { title: "Debugging Dojo: Choose difficulty", placeHolder: "Select difficulty" },
  );
  if (!difficulty) return;

  const code = editor.document.getText();
  const fileName = relative(
    vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? "",
    editor.document.uri.fsPath,
  );

  const bugCount = difficulty.value === "easy" ? 2 : 3;
  const difficultyDetails: Record<string, string> = {
    easy: "2 bugs from: missing null check, off-by-one error, wrong comparison operator.",
    medium: "3 bugs from mixed categories: logic error, type/null issue, and edge case.",
    hard: "3 subtle bugs spread across the code: race condition, security vulnerability, and a non-obvious edge case.",
  };

  const prompt =
    `Create a debugging challenge from the code below (${fileName}).\n\n` +
    `Difficulty: ${difficulty.value.toUpperCase()}\n` +
    `Inject exactly ${bugCount} intentional bugs: ${difficultyDetails[difficulty.value]}\n\n` +
    "Present:\n" +
    "1. The full buggy code\n" +
    `2. ${bugCount} one-line hints (category only, revealed one at a time)\n\n` +
    "Then ask me to:\n" +
    "  - Identify each bug\n" +
    '  - Write a precise fix prompt for each (not "fix it" — the exact change needed)\n\n' +
    "After I submit, score my answer and explain each bug's root cause and real-world impact.\n\n" +
    "```\n" + code.slice(0, 4000) + (code.length > 4000 ? "\n... (truncated)" : "") + "\n```";

  await vscode.env.clipboard.writeText(prompt);

  const action = await vscode.window.showInformationMessage(
    `Dojo prompt (${difficulty.value}) copied to clipboard — paste it into your AI assistant.`,
    "Show Preview",
  );

  if (action === "Show Preview") {
    const channel = vscode.window.createOutputChannel("VibeCoding Dojo");
    channel.clear();
    channel.appendLine(`🥋 Dojo: ${fileName} — ${difficulty.value}`);
    channel.appendLine("─".repeat(60));
    channel.appendLine(prompt);
    channel.show();
  }
}

// ── Analyze ───────────────────────────────────────────────────────────────────

async function analyzeCommand(): Promise<void> {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    vscode.window.showWarningMessage("VibeCoding: Open a workspace first.");
    return;
  }

  const projectPath = workspaceFolder.uri.fsPath;

  await vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title: "VibeCoding: Analyzing AI sessions…", cancellable: false },
    async () => {
      try {
        const cliPath = join(extensionPath, "cli", "dist", "cli.js");
        const { stdout } = await execFileAsync("node", [cliPath, "analyze", projectPath, "--json"]);
        const parsed = parseAnalysisJson(stdout);
        showAnalysisPanel(parsed);
      } catch (err: unknown) {
        const error = err as { stdout?: string; message?: string };
        if (error.stdout) {
          try {
            const parsed = parseAnalysisJson(error.stdout);
            showAnalysisPanel(parsed);
          } catch {
            showRawAnalysisPanel(error.stdout, projectPath);
          }
        } else {
          vscode.window.showErrorMessage(`VibeCoding Analyze: ${error.message}`);
        }
      }
    },
  );
}

function parseAnalysisJson(raw: string): AnalysisJsonResult {
  const parsed = JSON.parse(raw) as unknown;
  if (!isAnalysisResultJson(parsed)) {
    throw new Error("Invalid analysis JSON payload");
  }
  return parsed;
}

function isAnalysisResultJson(value: unknown): value is AnalysisJsonResult {
  if (!isRecord(value)) return false;
  if (typeof value.projectPath !== "string") return false;
  if (typeof value.sessionsFound !== "number") return false;
  if (!isRecord(value.totals)) return false;
  const t = value.totals;
  if (
    typeof t.turns !== "number" ||
    typeof t.prompts !== "number" ||
    typeof t.fileChanges !== "number" ||
    typeof t.inputTokens !== "number" ||
    typeof t.outputTokens !== "number" ||
    typeof t.claudeSessions !== "number"
  ) return false;
  if (!Array.isArray(value.topFiles)) return false;
  if (!Array.isArray(value.sessions)) return false;
  if (!Array.isArray(value.errors)) return false;
  return true;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function showAnalysisPanel(data: AnalysisJsonResult): void {
  const panel = vscode.window.createWebviewPanel(
    "vibecoding.analysis",
    "VibeCoding Analysis",
    vscode.ViewColumn.Beside,
    {},
  );
  panel.webview.html = buildAnalysisHtml(data);
}

function showRawAnalysisPanel(rawOutput: string, projectPath: string): void {
  const panel = vscode.window.createWebviewPanel(
    "vibecoding.analysis",
    "VibeCoding Analysis",
    vscode.ViewColumn.Beside,
    {},
  );
  panel.webview.html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  body { font-family: var(--vscode-font-family); font-size: 13px; padding: 16px; color: var(--vscode-foreground); background: var(--vscode-editor-background); }
  h1 { font-size: 15px; margin-bottom: 4px; }
  .path { color: var(--vscode-descriptionForeground); font-size: 11px; margin-bottom: 16px; word-break: break-all; }
  .warn { background: var(--vscode-inputValidation-warningBackground); color: var(--vscode-inputValidation-warningForeground); border: 1px solid var(--vscode-inputValidation-warningBorder); border-radius: 4px; padding: 8px 10px; margin-bottom: 12px; }
  pre { font-size: 11px; white-space: pre-wrap; background: var(--vscode-editor-inactiveSelectionBackground); padding: 10px; border-radius: 4px; overflow: auto; max-height: 400px; }
</style>
</head>
<body>
<h1>VibeCoding — AI Session Analysis</h1>
<div class="path">${escHtml(projectPath)}</div>
<div class="warn">Could not parse JSON output. Showing raw CLI output.</div>
<pre>${escHtml(rawOutput)}</pre>
</body>
</html>`;
}

function toDisplayPath(projectPath: string, filePath: string): string {
  return filePath.startsWith(projectPath)
    ? filePath.slice(projectPath.length + 1)
    : filePath;
}

function buildAnalysisHtml(data: AnalysisJsonResult): string {
  const maxCount = data.topFiles[0]?.changeCount ?? 1;
  const topFileRows = data.topFiles.map((entry) => {
    const pct = Math.round((entry.changeCount / maxCount) * 100);
    return `<tr>
      <td class="file">${escHtml(toDisplayPath(data.projectPath, entry.filePath))}</td>
      <td class="bar-cell"><div class="bar" style="width:${pct}%"></div></td>
      <td class="count">${entry.changeCount}x</td>
    </tr>`;
  }).join("\n");

  const sessionRows = data.sessions.slice(0, 20).map((session) => {
    return `<tr>
      <td class="mono">${escHtml(session.sessionId)}</td>
      <td>${escHtml(session.tool)}</td>
      <td class="mono">${session.totalTurns}</td>
      <td class="mono">${session.promptCount}</td>
      <td class="mono">${session.fileChangeCount}</td>
    </tr>`;
  }).join("\n");

  const errorRows = data.errors.map((entry) => {
    return `<tr>
      <td>${escHtml(entry.tool)}</td>
      <td class="mono">${escHtml(entry.filePath)}</td>
      <td>${escHtml(entry.error)}</td>
    </tr>`;
  }).join("\n");

  const stats = [
    `Sessions found: ${data.sessionsFound}`,
    `Active sessions: ${data.activeSessions}`,
    `Skipped sessions: ${data.skippedSessions}`,
    `Failed sessions: ${data.failedSessions}`,
    `Total turns: ${data.totals.turns.toLocaleString()}`,
    `User prompts: ${data.totals.prompts.toLocaleString()}`,
    `File changes: ${data.totals.fileChanges.toLocaleString()}`,
  ];

  if (data.totals.inputTokens > 0) {
    stats.push(
      `Tokens (Claude): ${data.totals.inputTokens.toLocaleString()} in / ${data.totals.outputTokens.toLocaleString()} out`,
      `Claude sessions: ${data.totals.claudeSessions}`,
    );
  }

  const statLines = stats
    .map((line) => `<div class="stat-line">${escHtml(line)}</div>`)
    .join("\n");

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  body { font-family: var(--vscode-font-family); font-size: 13px; padding: 16px; color: var(--vscode-foreground); background: var(--vscode-editor-background); }
  h1 { font-size: 15px; margin-bottom: 4px; }
  h2 { font-size: 13px; margin: 16px 0 8px; }
  .path { color: var(--vscode-descriptionForeground); font-size: 11px; margin-bottom: 16px; word-break: break-all; }
  .stats { background: var(--vscode-editor-inactiveSelectionBackground); border-radius: 4px; padding: 10px 14px; margin-bottom: 20px; }
  .stat-line { margin: 2px 0; font-family: monospace; }
  table { border-collapse: collapse; width: 100%; }
  th, td { padding: 4px 6px; vertical-align: middle; border-bottom: 1px solid var(--vscode-panel-border); text-align: left; }
  .file { font-family: monospace; font-size: 12px; word-break: break-all; }
  .mono { font-family: monospace; font-size: 12px; }
  .bar-cell { width: 40%; padding: 3px 8px; }
  .bar { height: 12px; background: var(--vscode-progressBar-background, #0e70c0); border-radius: 2px; min-width: 2px; }
  .count { font-family: monospace; color: var(--vscode-descriptionForeground); white-space: nowrap; }
</style>
</head>
<body>
<h1>VibeCoding — AI Session Analysis</h1>
<div class="path">${escHtml(data.projectPath)}</div>

<div class="stats">${statLines}</div>

${topFileRows ? `<h2>Most Changed Files</h2>
<table>${topFileRows}</table>` : ""}

${sessionRows ? `<h2>Active Sessions</h2>
<table>
  <thead>
    <tr>
      <th>Session</th><th>Tool</th><th>Turns</th><th>Prompts</th><th>File Changes</th>
    </tr>
  </thead>
  <tbody>
    ${sessionRows}
  </tbody>
</table>` : ""}

${errorRows ? `<h2>Failed Sessions</h2>
<table>
  <thead>
    <tr>
      <th>Tool</th><th>File</th><th>Error</th>
    </tr>
  </thead>
  <tbody>
    ${errorRows}
  </tbody>
</table>` : ""}
</body>
</html>`;
}

function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
