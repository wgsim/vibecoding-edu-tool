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

/**
 * X-Ray: Explain selected code or current file line-by-line.
 * Presents the code in an output channel with prompts for AI-assisted explanation.
 */
async function xrayCommand(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage("VibeCoding: Open a file first.");
    return;
  }

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

  const channel = vscode.window.createOutputChannel("VibeCoding X-Ray");
  channel.show();
  channel.clear();
  channel.appendLine(`📍 X-Ray Analysis: ${fileName} (lines ${lineStart}–${lineEnd})`);
  channel.appendLine("─".repeat(60));
  channel.appendLine("");

  // Number each line for reference
  const lines = code.split("\n");
  for (let i = 0; i < lines.length; i++) {
    channel.appendLine(`  ${String(lineStart + i).padStart(4)}  ${lines[i]}`);
  }

  channel.appendLine("");
  channel.appendLine("─".repeat(60));
  channel.appendLine("");
  channel.appendLine("💡 Copy the prompt below to your AI assistant for a full X-Ray:");
  channel.appendLine("");
  channel.appendLine("--- PROMPT START ---");
  channel.appendLine(
    `Explain the following code from ${fileName} (lines ${lineStart}–${lineEnd}) ` +
    "line-by-line from a traditional programming perspective. " +
    "For each significant section, explain: (1) what it does, " +
    "(2) why it's needed (what breaks without it?), and " +
    "(3) the underlying CS concept (design pattern, data structure, etc.)."
  );
  channel.appendLine("");
  channel.appendLine("```");
  channel.appendLine(code.slice(0, 3000));
  if (code.length > 3000) {
    channel.appendLine("... (truncated)");
  }
  channel.appendLine("```");
  channel.appendLine("--- PROMPT END ---");
}

/**
 * Dojo: Generate a debugging challenge from the current file.
 */
async function dojoCommand(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage("VibeCoding: Open a file first.");
    return;
  }

  const code = editor.document.getText();
  const fileName = relative(
    vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? "",
    editor.document.uri.fsPath,
  );

  const channel = vscode.window.createOutputChannel("VibeCoding Dojo");
  channel.show();
  channel.clear();
  channel.appendLine(`🥋 Debugging Dojo: ${fileName}`);
  channel.appendLine("─".repeat(60));
  channel.appendLine("");
  channel.appendLine(`Source: ${fileName} (${code.split("\n").length} lines)`);
  channel.appendLine("");
  channel.appendLine("💡 Copy the prompt below to your AI assistant:");
  channel.appendLine("");
  channel.appendLine("--- PROMPT START ---");
  channel.appendLine(
    `Create a debugging challenge from the code below (${fileName}). ` +
    "Inject exactly 2-3 realistic bugs (logic errors, missing null checks, " +
    "async issues, or edge cases). Show the buggy code and ask me to: " +
    "(1) identify each bug, (2) write a specific fix prompt for each " +
    '(not "rewrite it" but the exact change needed). ' +
    "Include hints I can reveal one at a time."
  );
  channel.appendLine("");
  channel.appendLine("```");
  channel.appendLine(code.slice(0, 3000));
  if (code.length > 3000) {
    channel.appendLine("... (truncated)");
  }
  channel.appendLine("```");
  channel.appendLine("--- PROMPT END ---");
}

/**
 * Analyze: Run the CLI analyzer on the current workspace.
 * Shells out to the @vibecoding/cli-analyzer package.
 */
async function analyzeCommand(): Promise<void> {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    vscode.window.showWarningMessage("VibeCoding: Open a workspace first.");
    return;
  }

  const projectPath = workspaceFolder.uri.fsPath;
  const channel = vscode.window.createOutputChannel("VibeCoding Analysis");
  channel.show();
  channel.clear();
  channel.appendLine(`🔍 Analyzing AI sessions for: ${projectPath}`);
  channel.appendLine("");

  try {
    // Try to find the CLI analyzer relative to the extension
    const cliPath = join(extensionPath, "cli", "dist", "cli.js");
    const { stdout, stderr } = await execFileAsync("node", [cliPath, "analyze", projectPath]);

    if (stdout) channel.appendLine(stdout);
    if (stderr) channel.appendLine(stderr);
  } catch (err: unknown) {
    const error = err as { stdout?: string; stderr?: string; message?: string };
    if (error.stdout) {
      channel.appendLine(error.stdout);
    } else {
      channel.appendLine(`Error running analyzer: ${error.message}`);
      channel.appendLine("");
      channel.appendLine("Make sure the CLI analyzer is built:");
      channel.appendLine("  cd <project-root> && pnpm --filter @vibecoding/cli-analyzer run build");
    }
  }
}
