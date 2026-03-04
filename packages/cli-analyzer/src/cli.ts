#!/usr/bin/env node

import { resolve, relative } from "node:path";
import { findAllSessions, parseSession, analyzeSession } from "@vibecoding/core";
import type {
  StaticAnalysisReport,
  AnalysisFailedSession,
  AnalysisJsonResult,
} from "@vibecoding/core";

type OutputMode = "text" | "json";

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === "--help" || command === "-h") {
    printUsage();
    return;
  }

  if (command === "analyze") {
    const { targetPath, outputMode } = parseAnalyzeArgs(args.slice(1));
    await runAnalysis(targetPath, outputMode);
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

function parseAnalyzeArgs(args: string[]): { targetPath: string; outputMode: OutputMode } {
  let outputMode: OutputMode = "text";
  let pathArg: string | undefined;

  for (const arg of args) {
    if (arg === "--json") {
      outputMode = "json";
      continue;
    }
    if (arg.startsWith("-")) {
      throw new Error(`Unknown option for analyze: ${arg}`);
    }
    pathArg = arg;
  }

  return {
    targetPath: resolve(pathArg ?? "."),
    outputMode,
  };
}

function printUsage(): void {
  console.log(`
vibecoding - AI coding session analyzer

Usage:
  vibecoding sessions [path]            List AI sessions found for a project
  vibecoding analyze [path] [--json]    Run Level 1 static analysis on sessions

Options:
  -h, --help                            Show this help message
  --json                                Output machine-readable JSON (analyze only)

Examples:
  vibecoding sessions .                 Find sessions for current directory
  vibecoding analyze ~/my-app           Analyze AI sessions for ~/my-app
  vibecoding analyze . --json           Analyze and print JSON output
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

async function runAnalysis(projectPath: string, outputMode: OutputMode): Promise<void> {
  if (outputMode === "text") {
    console.log(`\nAnalyzing AI sessions for: ${projectPath}\n`);
  }

  const sessions = await findAllSessions(projectPath);

  if (sessions.length === 0) {
    if (outputMode === "json") {
      const emptyResult: AnalysisJsonResult = {
        projectPath,
        sessionsFound: 0,
        activeSessions: 0,
        skippedSessions: 0,
        failedSessions: 0,
        totals: {
          turns: 0,
          prompts: 0,
          fileChanges: 0,
          inputTokens: 0,
          outputTokens: 0,
          claudeSessions: 0,
        },
        topFiles: [],
        sessions: [],
        errors: [],
      };
      console.log(JSON.stringify(emptyResult));
      return;
    }

    console.log("No AI coding sessions found for this project.");
    return;
  }

  const parsedResults = await Promise.all(
    sessions.map(async ({ tool, filePath }) => {
      try {
        const parsed = await parseSession(tool, filePath, projectPath);
        const report = analyzeSession(parsed);
        return { ok: true as const, report };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          ok: false as const,
          failed: {
            tool,
            filePath,
            error: errorMessage,
          } satisfies AnalysisFailedSession,
        };
      }
    }),
  );

  const reports = parsedResults
    .filter((result): result is { ok: true; report: StaticAnalysisReport } => result.ok)
    .map((result) => result.report);

  const failedSessions = parsedResults
    .filter((result): result is { ok: false; failed: AnalysisFailedSession } => !result.ok)
    .map((result) => result.failed);

  const active = reports.filter((r) => r.totalTurns > 0);
  const skipped = reports.length - active.length;

  if (outputMode === "json") {
    const payload = buildAnalysisJson(projectPath, sessions.length, active, skipped, failedSessions);
    console.log(JSON.stringify(payload));
    return;
  }

  console.log(
    `Found ${sessions.length} session(s). Analyzing... ` +
    `(${active.length} active, ${skipped} empty skipped, ${failedSessions.length} failed)\n`,
  );

  printProjectSummary(active, projectPath, failedSessions.length);

  for (const report of active) {
    printReport(report);
  }

  if (failedSessions.length > 0) {
    printFailedSessions(failedSessions, projectPath);
  }
}

function buildAnalysisJson(
  projectPath: string,
  sessionsFound: number,
  activeReports: StaticAnalysisReport[],
  skippedSessions: number,
  failedSessions: AnalysisFailedSession[],
): AnalysisJsonResult {
  const totals = {
    turns: activeReports.reduce((s, r) => s + r.totalTurns, 0),
    prompts: activeReports.reduce((s, r) => s + r.promptCount, 0),
    fileChanges: activeReports.reduce((s, r) => s + r.fileChanges.length, 0),
    inputTokens: activeReports.reduce((s, r) => s + r.totalTokens.inputTokens, 0),
    outputTokens: activeReports.reduce((s, r) => s + r.totalTokens.outputTokens, 0),
    claudeSessions: activeReports.filter((r) => r.tool !== "codex-cli").length,
  };

  return {
    projectPath,
    sessionsFound,
    activeSessions: activeReports.length,
    skippedSessions,
    failedSessions: failedSessions.length,
    totals,
    topFiles: aggregateTopFiles(activeReports),
    sessions: activeReports.map((report) => ({
      sessionId: report.sessionId,
      tool: report.tool,
      totalTurns: report.totalTurns,
      promptCount: report.promptCount,
      fileChangeCount: report.fileChanges.length,
      tokens: report.totalTokens,
      topFiles: report.changeFrequency.slice(0, 10),
      promptMappings: report.fileChanges.slice(0, 15).map((change) => ({
        filePath: change.filePath,
        changeType: change.changeType,
        promptText: change.promptText,
        turnIndex: change.turnIndex,
      })),
    })),
    errors: failedSessions,
  };
}

function printProjectSummary(
  reports: StaticAnalysisReport[],
  projectPath: string,
  failedSessionCount: number,
): void {
  const divider = "═".repeat(60);
  const totalTurns = reports.reduce((s, r) => s + r.totalTurns, 0);
  const totalPrompts = reports.reduce((s, r) => s + r.promptCount, 0);
  const totalChanges = reports.reduce((s, r) => s + r.fileChanges.length, 0);
  const totalInputTokens = reports.reduce((s, r) => s + r.totalTokens.inputTokens, 0);
  const totalOutputTokens = reports.reduce((s, r) => s + r.totalTokens.outputTokens, 0);

  const topFiles = aggregateTopFiles(reports);

  console.log(divider);
  console.log("📦 PROJECT SUMMARY");
  console.log(`   ${projectPath}`);
  console.log(divider);
  console.log(`  Active sessions: ${reports.length}`);
  console.log(`  Total turns:     ${totalTurns.toLocaleString()}`);
  console.log(`  User prompts:    ${totalPrompts.toLocaleString()}`);
  console.log(`  File changes:    ${totalChanges.toLocaleString()}`);
  if (failedSessionCount > 0) {
    console.log(`  Failed sessions: ${failedSessionCount.toLocaleString()}`);
  }

  const claudeReports = reports.filter((r) => r.tool !== "codex-cli");
  if (totalInputTokens > 0) {
    const claudeSessions = claudeReports.length;
    console.log(
      `  Tokens (Claude): ${totalInputTokens.toLocaleString()} in / ${totalOutputTokens.toLocaleString()} out`,
    );
    console.log(`                   across ${claudeSessions} Claude Code session(s)`);
  }

  if (topFiles.length > 0) {
    console.log("\n🏆 Most Changed Files (all sessions)");
    const max = topFiles[0].changeCount;
    for (const { filePath, changeCount } of topFiles) {
      const bar = "█".repeat(Math.min(Math.round((changeCount / max) * 20), 20));
      const displayPath = toDisplayPath(projectPath, filePath);
      console.log(`  ${bar.padEnd(20)} ${changeCount}x  ${displayPath}`);
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

  console.log("\n📊 Summary");
  console.log(`  Total turns:    ${report.totalTurns}`);
  console.log(`  User prompts:   ${report.promptCount}`);
  console.log(`  File changes:   ${report.fileChanges.length}`);
  const tokenStr = report.tool === "codex-cli"
    ? "N/A (not recorded by Codex CLI)"
    : `${report.totalTokens.inputTokens.toLocaleString()} in / ${report.totalTokens.outputTokens.toLocaleString()} out`;
  console.log(`  Tokens used:    ${tokenStr}`);

  if (report.changeFrequency.length > 0) {
    console.log("\n📁 Most Changed Files");
    for (const { filePath, changeCount } of report.changeFrequency.slice(0, 10)) {
      const bar = "█".repeat(Math.min(changeCount, 30));
      console.log(`  ${bar} ${changeCount}x  ${rel(filePath)}`);
    }
  }

  if (report.fileChanges.length > 0) {
    console.log("\n🔗 Prompt → File Change Mapping");
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

function printFailedSessions(failedSessions: AnalysisFailedSession[], projectPath: string): void {
  const divider = "!".repeat(60);
  console.log(divider);
  console.log("Failed session files (skipped)");
  console.log(divider);
  for (const failed of failedSessions) {
    console.log(`  [${failed.tool}] ${toDisplayPath(projectPath, failed.filePath)}`);
    console.log(`      error: ${failed.error}`);
  }
  console.log(`\n${divider}\n`);
}

function aggregateTopFiles(
  reports: StaticAnalysisReport[],
): Array<{ filePath: string; changeCount: number }> {
  const freq = new Map<string, number>();
  for (const report of reports) {
    for (const { filePath, changeCount } of report.changeFrequency) {
      freq.set(filePath, (freq.get(filePath) ?? 0) + changeCount);
    }
  }

  return [...freq.entries()]
    .map(([filePath, changeCount]) => ({ filePath, changeCount }))
    .sort((a, b) => b.changeCount - a.changeCount)
    .slice(0, 10);
}

function toDisplayPath(projectPath: string, filePath: string): string {
  return filePath.startsWith(projectPath)
    ? filePath.slice(projectPath.length + 1)
    : filePath;
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
