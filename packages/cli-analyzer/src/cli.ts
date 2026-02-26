#!/usr/bin/env node

import { resolve } from "node:path";
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

  console.log(`Found ${sessions.length} session(s). Analyzing...\n`);

  for (const { tool, filePath } of sessions) {
    const parsed = await parseSession(tool, filePath, projectPath);
    const report = analyzeSession(parsed);
    printReport(report);
  }
}

function printReport(report: StaticAnalysisReport): void {
  const divider = "─".repeat(60);

  console.log(divider);
  console.log(`Session: ${report.sessionId}`);
  console.log(`Tool:    ${report.tool}`);
  console.log(`Project: ${report.projectPath}`);
  console.log(divider);

  console.log(`\n📊 Summary`);
  console.log(`  Total turns:    ${report.totalTurns}`);
  console.log(`  User prompts:   ${report.promptCount}`);
  console.log(`  File changes:   ${report.fileChanges.length}`);
  console.log(`  Tokens used:    ${report.totalTokens.inputTokens.toLocaleString()} in / ${report.totalTokens.outputTokens.toLocaleString()} out`);

  if (report.changeFrequency.length > 0) {
    console.log(`\n📁 Most Changed Files`);
    for (const { filePath, changeCount } of report.changeFrequency.slice(0, 10)) {
      const bar = "█".repeat(Math.min(changeCount, 30));
      console.log(`  ${bar} ${changeCount}x  ${filePath}`);
    }
  }

  if (report.fileChanges.length > 0) {
    console.log(`\n🔗 Prompt → File Change Mapping`);
    for (const change of report.fileChanges.slice(0, 15)) {
      const prompt = change.promptText.slice(0, 80).replace(/\n/g, " ");
      const icon = change.changeType === "create" ? "+" : "~";
      console.log(`  [${icon}] ${change.filePath}`);
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
