#!/usr/bin/env node

import { resolve, relative } from "node:path";
import { findAllSessions, parseSession, analyzeSession } from "@vibecoding/core";
import type { StaticAnalysisReport } from "@vibecoding/core";

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === "--help" || command === "-h") {
    printUsage();
    return;
  }

  if (command === "analyze") {
    const targetPath = resolve(args[1] ?? ".");
    await runAnalysis(targetPath);
    return;
  }

  if (command === "sessions") {
    const targetPath = resolve(args[1] ?? ".");
    await listSessions(targetPath);
    return;
  }

  console.error(`Unknown command: ${command}`);
  printUsage();
  process.exit(1);
}

function printUsage(): void {
  console.log(`
vibecoding - AI coding session analyzer

Usage:
  vibecoding sessions [path]    List AI sessions found for a project
  vibecoding analyze [path]     Run Level 1 static analysis on sessions

Options:
  -h, --help                    Show this help message

Examples:
  vibecoding sessions .         Find sessions for current directory
  vibecoding analyze ~/my-app   Analyze AI sessions for ~/my-app
`);
}

async function listSessions(projectPath: string): Promise<void> {
  console.log(`\nSearching for AI sessions for: ${projectPath}\n`);

  const sessions = await findAllSessions(projectPath);

  if (sessions.length === 0) {
    console.log("No AI coding sessions found for this project.");
    console.log("Supported tools: Claude Code, Codex CLI");
    return;
  }

  console.log(`Found ${sessions.length} session(s):\n`);
  for (const s of sessions) {
    console.log(`  [${s.tool}] ${s.filePath}`);
  }
}

async function runAnalysis(projectPath: string): Promise<void> {
  console.log(`\nAnalyzing AI sessions for: ${projectPath}\n`);

  const sessions = await findAllSessions(projectPath);

  if (sessions.length === 0) {
    console.log("No AI coding sessions found for this project.");
    return;
  }

  const reports = await Promise.all(
    sessions.map(async ({ tool, filePath }) => {
      const parsed = await parseSession(tool, filePath, projectPath);
      return analyzeSession(parsed);
    }),
  );

  const active = reports.filter((r) => r.totalTurns > 0);
  const skipped = reports.length - active.length;

  console.log(
    `Found ${sessions.length} session(s). Analyzing... ` +
    `(${active.length} active, ${skipped} empty skipped)\n`,
  );

  printProjectSummary(active, projectPath);

  for (const report of active) {
    printReport(report);
  }
}

function printProjectSummary(reports: StaticAnalysisReport[], projectPath: string): void {
  const divider = "═".repeat(60);
  const totalTurns = reports.reduce((s, r) => s + r.totalTurns, 0);
  const totalPrompts = reports.reduce((s, r) => s + r.promptCount, 0);
  const totalChanges = reports.reduce((s, r) => s + r.fileChanges.length, 0);
  const totalInputTokens = reports.reduce((s, r) => s + r.totalTokens.inputTokens, 0);
  const totalOutputTokens = reports.reduce((s, r) => s + r.totalTokens.outputTokens, 0);

  // Aggregate file change frequency across all sessions
  const freq = new Map<string, number>();
  for (const r of reports) {
    for (const { filePath, changeCount } of r.changeFrequency) {
      freq.set(filePath, (freq.get(filePath) ?? 0) + changeCount);
    }
  }
  const topFiles = [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  console.log(divider);
  console.log(`📦 PROJECT SUMMARY`);
  console.log(`   ${projectPath}`);
  console.log(divider);
  console.log(`  Active sessions: ${reports.length}`);
  console.log(`  Total turns:     ${totalTurns.toLocaleString()}`);
  console.log(`  User prompts:    ${totalPrompts.toLocaleString()}`);
  console.log(`  File changes:    ${totalChanges.toLocaleString()}`);

  const claudeReports = reports.filter((r) => r.tool !== "codex-cli");
  if (totalInputTokens > 0) {
    const claudeSessions = claudeReports.length;
    console.log(`  Tokens (Claude): ${totalInputTokens.toLocaleString()} in / ${totalOutputTokens.toLocaleString()} out`);
    console.log(`                   across ${claudeSessions} Claude Code session(s)`);
  }

  if (topFiles.length > 0) {
    console.log(`\n🏆 Most Changed Files (all sessions)`);
    const max = topFiles[0][1];
    for (const [filePath, count] of topFiles) {
      const bar = "█".repeat(Math.min(Math.round((count / max) * 20), 20));
      const displayPath = filePath.startsWith(projectPath)
        ? filePath.slice(projectPath.length + 1)
        : filePath;
      console.log(`  ${bar.padEnd(20)} ${count}x  ${displayPath}`);
    }
  }

  console.log("\n" + divider + "\n");
}

function printReport(report: StaticAnalysisReport): void {
  const divider = "─".repeat(60);
  const rel = (p: string) => {
    const r = relative(report.projectPath, p);
    return r.startsWith("../../") ? p : r || p;
  };

  console.log(divider);
  console.log(`Session: ${report.sessionId}`);
  console.log(`Tool:    ${report.tool}`);
  console.log(`Project: ${report.projectPath}`);
  console.log(divider);

  console.log(`\n📊 Summary`);
  console.log(`  Total turns:    ${report.totalTurns}`);
  console.log(`  User prompts:   ${report.promptCount}`);
  console.log(`  File changes:   ${report.fileChanges.length}`);
  const tokenStr = report.tool === "codex-cli"
    ? "N/A (not recorded by Codex CLI)"
    : `${report.totalTokens.inputTokens.toLocaleString()} in / ${report.totalTokens.outputTokens.toLocaleString()} out`;
  console.log(`  Tokens used:    ${tokenStr}`);

  if (report.changeFrequency.length > 0) {
    console.log(`\n📁 Most Changed Files`);
    for (const { filePath, changeCount } of report.changeFrequency.slice(0, 10)) {
      const bar = "█".repeat(Math.min(changeCount, 30));
      console.log(`  ${bar} ${changeCount}x  ${rel(filePath)}`);
    }
  }

  if (report.fileChanges.length > 0) {
    console.log(`\n🔗 Prompt → File Change Mapping`);
    for (const change of report.fileChanges.slice(0, 15)) {
      const prompt = change.promptText.slice(0, 80).replace(/\n/g, " ");
      const icon = change.changeType === "create" ? "+" : "~";
      console.log(`  [${icon}] ${rel(change.filePath)}`);
      console.log(`      ← "${prompt}${change.promptText.length > 80 ? "..." : ""}"`);
    }
    if (report.fileChanges.length > 15) {
      console.log(`  ... and ${report.fileChanges.length - 15} more changes`);
    }
  }

  console.log(`\n${divider}\n`);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});

// ─── Exported pure functions (for testing) ────────────────────────────────────

export interface AnalyzeArgs {
  targetPath: string;
  format: "text" | "json";
}

/**
 * Parse analyze-command arguments.
 * Accepts: [path?] [--json]
 */
export function parseAnalyzeArgs(args: string[]): AnalyzeArgs {
  let targetPath = resolve(".");
  let format: "text" | "json" = "text";

  for (const arg of args) {
    if (arg === "--json") {
      format = "json";
    } else if (arg.startsWith("--")) {
      throw new Error(`Unknown option: ${arg}`);
    } else {
      targetPath = resolve(arg);
    }
  }

  return { targetPath, format };
}

export interface AnalysisJson {
  totalSessions: number;
  totalTurns: number;
  totalPrompts: number;
  totalChanges: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  claudeSessions: number;
  topFiles: Array<{ filePath: string; changeCount: number }>;
  sessions: StaticAnalysisReport[];
}

/**
 * Build a JSON-serializable analysis summary from multiple reports.
 */
export function buildAnalysisJson(reports: StaticAnalysisReport[]): AnalysisJson {
  const totalTurns = reports.reduce((s, r) => s + r.totalTurns, 0);
  const totalPrompts = reports.reduce((s, r) => s + r.promptCount, 0);
  const totalChanges = reports.reduce((s, r) => s + r.fileChanges.length, 0);
  const totalInputTokens = reports.reduce((s, r) => s + r.totalTokens.inputTokens, 0);
  const totalOutputTokens = reports.reduce((s, r) => s + r.totalTokens.outputTokens, 0);
  const claudeSessions = reports.filter((r) => r.tool !== "codex-cli").length;

  const freq = new Map<string, number>();
  for (const r of reports) {
    for (const { filePath, changeCount } of r.changeFrequency) {
      freq.set(filePath, (freq.get(filePath) ?? 0) + changeCount);
    }
  }
  const topFiles = [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([filePath, changeCount]) => ({ filePath, changeCount }));

  return {
    totalSessions: reports.length,
    totalTurns,
    totalPrompts,
    totalChanges,
    totalInputTokens,
    totalOutputTokens,
    claudeSessions,
    topFiles,
    sessions: reports,
  };
}
