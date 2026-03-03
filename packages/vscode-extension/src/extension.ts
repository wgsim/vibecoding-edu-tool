import * as vscode from "vscode";
import { relative, join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

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
      {
        label: "$(mortar-board) Beginner",
        description: "Analogy-based — minimal jargon",
        value: "beginner",
      },
      {
        label: "$(book) Intermediate",
        description: "Principles + pattern names",
        value: "intermediate",
      },
      {
        label: "$(shield) Expert",
        description: "Architecture, risks, trade-offs",
        value: "expert",
      },
    ],
    {
      title: "X-Ray: Choose explanation depth",
      placeHolder: "Select your level",
    },
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
  const lineEnd = selection.isEmpty
    ? editor.document.lineCount
    : selection.end.line + 1;

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
    "```\n" +
    code.slice(0, 4000) +
    (code.length > 4000 ? "\n... (truncated)" : "") +
    "\n```";

  await vscode.env.clipboard.writeText(prompt);

  const action = await vscode.window.showInformationMessage(
    `X-Ray prompt (${level.value}) copied to clipboard — paste it into your AI assistant.`,
    "Show Preview",
  );

  if (action === "Show Preview") {
    const channel = vscode.window.createOutputChannel("VibeCoding X-Ray");
    channel.clear();
    channel.appendLine(
      `📍 X-Ray: ${fileName} (lines ${lineStart}–${lineEnd}) — ${level.value}`,
    );
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
      {
        label: "$(check) Easy",
        description: "2 bugs — null check, off-by-one",
        value: "easy",
      },
      {
        label: "$(warning) Medium",
        description: "3 bugs — mixed categories, control flow",
        value: "medium",
      },
      {
        label: "$(flame) Hard",
        description: "3 bugs — race condition, edge case, security",
        value: "hard",
      },
    ],
    {
      title: "Debugging Dojo: Choose difficulty",
      placeHolder: "Select difficulty",
    },
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
    medium:
      "3 bugs from mixed categories: logic error, type/null issue, and edge case.",
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
    "```\n" +
    code.slice(0, 4000) +
    (code.length > 4000 ? "\n... (truncated)" : "") +
    "\n```";

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
    {
      location: vscode.ProgressLocation.Notification,
      title: "VibeCoding: Analyzing AI sessions…",
      cancellable: false,
    },
    async () => {
      try {
        const cliPath = join(extensionPath, "cli", "dist", "cli.js");
        const { stdout } = await execFileAsync("node", [
          cliPath,
          "analyze",
          projectPath,
        ]);
        showAnalysisPanel(stdout, projectPath);
      } catch (err: unknown) {
        const error = err as { stdout?: string; message?: string };
        if (error.stdout) {
          showAnalysisPanel(error.stdout, projectPath);
        } else {
          vscode.window.showErrorMessage(
            `VibeCoding Analyze: ${error.message}`,
          );
        }
      }
    },
  );
}

function showAnalysisPanel(output: string, projectPath: string): void {
  const panel = vscode.window.createWebviewPanel(
    "vibecoding.analysis",
    "VibeCoding Analysis",
    vscode.ViewColumn.Beside,
    {},
  );
  panel.webview.html = buildAnalysisHtml(output, projectPath);
}

function buildAnalysisHtml(output: string, projectPath: string): string {
  // Parse bar chart lines: "  ████████            8x  src/foo.ts"
  const fileRows = output
    .split("\n")
    .filter((l) => /^\s+[#█]+\s+\d+x\s+\S/.test(l))
    .map((l) => {
      const m = l.match(/([#█]+)\s+(\d+)x\s+(.+)/);
      if (!m) return null;
      return { bar: m[1].length, count: parseInt(m[2]), file: m[3].trim() };
    })
    .filter(Boolean) as { bar: number; count: number; file: string }[];

  const maxBar = fileRows[0]?.bar ?? 1;

  const rows = fileRows
    .map((r) => {
      const pct = Math.round((r.bar / maxBar) * 100);
      return `<tr>
      <td class="file">${escHtml(r.file)}</td>
      <td class="bar-cell"><div class="bar" style="width:${pct}%"></div></td>
      <td class="count">${r.count}x</td>
    </tr>`;
    })
    .join("\n");

  // Extract summary lines (lines containing ":")
  const summaryLines = output
    .split("\n")
    .filter((l) => /:\s+[\d,]+/.test(l) || /Tokens/.test(l))
    .map((l) => `<div class="stat-line">${escHtml(l.trim())}</div>`)
    .join("\n");

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  body { font-family: var(--vscode-font-family); font-size: 13px; padding: 16px; color: var(--vscode-foreground); background: var(--vscode-editor-background); }
  h1 { font-size: 15px; margin-bottom: 4px; }
  .path { color: var(--vscode-descriptionForeground); font-size: 11px; margin-bottom: 16px; word-break: break-all; }
  .stats { background: var(--vscode-editor-inactiveSelectionBackground); border-radius: 4px; padding: 10px 14px; margin-bottom: 20px; }
  .stat-line { margin: 2px 0; font-family: monospace; }
  h2 { font-size: 13px; margin: 16px 0 8px; }
  table { border-collapse: collapse; width: 100%; }
  td { padding: 3px 6px; vertical-align: middle; }
  .file { font-family: monospace; font-size: 12px; white-space: nowrap; max-width: 280px; overflow: hidden; text-overflow: ellipsis; }
  .bar-cell { width: 40%; padding: 3px 8px; }
  .bar { height: 12px; background: var(--vscode-progressBar-background, #0e70c0); border-radius: 2px; min-width: 2px; }
  .count { font-family: monospace; color: var(--vscode-descriptionForeground); white-space: nowrap; }
  pre { font-size: 11px; white-space: pre-wrap; background: var(--vscode-editor-inactiveSelectionBackground); padding: 10px; border-radius: 4px; overflow: auto; max-height: 400px; }
</style>
</head>
<body>
<h1>VibeCoding — AI Session Analysis</h1>
<div class="path">${escHtml(projectPath)}</div>

${summaryLines ? `<div class="stats">${summaryLines}</div>` : ""}

${
  rows
    ? `<h2>Most Changed Files</h2>
<table>${rows}</table>`
    : ""
}

<h2>Full Output</h2>
<pre>${escHtml(output)}</pre>
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
