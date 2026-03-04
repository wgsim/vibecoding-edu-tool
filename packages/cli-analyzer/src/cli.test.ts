import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { parseAnalyzeArgs, buildAnalysisJson } from "./cli.js";
import type { StaticAnalysisReport } from "@vibecoding/core";

// ─── parseAnalyzeArgs ─────────────────────────────────────────────────────────

describe("parseAnalyzeArgs", () => {
  test("no args → resolve('.') and 'text'", () => {
    const result = parseAnalyzeArgs([]);
    assert.equal(result.targetPath, resolve("."));
    assert.equal(result.format, "text");
  });

  test("--json → format: 'json'", () => {
    const result = parseAnalyzeArgs(["--json"]);
    assert.equal(result.format, "json");
    assert.equal(result.targetPath, resolve("."));
  });

  test("path and --json → both set", () => {
    const result = parseAnalyzeArgs(["./myproject", "--json"]);
    assert.equal(result.targetPath, resolve("./myproject"));
    assert.equal(result.format, "json");
  });

  test("--json before path → both set", () => {
    const result = parseAnalyzeArgs(["--json", "./myproject"]);
    assert.equal(result.format, "json");
    assert.equal(result.targetPath, resolve("./myproject"));
  });

  test("unknown flag → throws Error", () => {
    assert.throws(() => parseAnalyzeArgs(["--unknown"]), Error);
  });

  test("unknown flag message includes flag name", () => {
    try {
      parseAnalyzeArgs(["--unknown"]);
      assert.fail("should throw");
    } catch (e) {
      assert.ok((e as Error).message.includes("--unknown"));
    }
  });
});

// ─── buildAnalysisJson ────────────────────────────────────────────────────────

function makeReport(overrides: Partial<StaticAnalysisReport> = {}): StaticAnalysisReport {
  return {
    tool: "claude-code",
    sessionId: "s1",
    projectPath: "/project",
    fileChanges: [],
    totalTurns: 0,
    promptCount: 0,
    totalTokens: { inputTokens: 0, outputTokens: 0 },
    changeFrequency: [],
    ...overrides,
  };
}

describe("buildAnalysisJson", () => {
  test("empty reports → 0 totals and empty arrays", () => {
    const result = buildAnalysisJson([]);
    assert.equal(result.totalSessions, 0);
    assert.equal(result.totalTurns, 0);
    assert.equal(result.totalPrompts, 0);
    assert.equal(result.totalChanges, 0);
    assert.equal(result.totalInputTokens, 0);
    assert.equal(result.totalOutputTokens, 0);
    assert.equal(result.claudeSessions, 0);
    assert.deepEqual(result.topFiles, []);
  });

  test("multiple reports → totals summed", () => {
    const reports = [
      makeReport({
        totalTurns: 10,
        promptCount: 5,
        fileChanges: [
          { filePath: "/a.ts", changeType: "edit", promptText: "p", turnIndex: 0 },
        ],
        totalTokens: { inputTokens: 100, outputTokens: 50 },
        changeFrequency: [{ filePath: "/a.ts", changeCount: 1 }],
      }),
      makeReport({
        sessionId: "s2",
        totalTurns: 20,
        promptCount: 8,
        fileChanges: [
          { filePath: "/b.ts", changeType: "create", promptText: "p", turnIndex: 0 },
          { filePath: "/a.ts", changeType: "edit", promptText: "p", turnIndex: 1 },
        ],
        totalTokens: { inputTokens: 200, outputTokens: 80 },
        changeFrequency: [
          { filePath: "/b.ts", changeCount: 1 },
          { filePath: "/a.ts", changeCount: 1 },
        ],
      }),
    ];

    const result = buildAnalysisJson(reports);
    assert.equal(result.totalSessions, 2);
    assert.equal(result.totalTurns, 30);
    assert.equal(result.totalPrompts, 13);
    assert.equal(result.totalChanges, 3);
    assert.equal(result.totalInputTokens, 300);
    assert.equal(result.totalOutputTokens, 130);
  });

  test("codex-cli sessions excluded from claudeSessions count", () => {
    const reports = [
      makeReport({ tool: "claude-code" }),
      makeReport({ tool: "codex-cli" }),
      makeReport({ tool: "claude-code" }),
    ];
    const result = buildAnalysisJson(reports);
    assert.equal(result.claudeSessions, 2);
  });

  test("topFiles merged and sorted by changeCount desc", () => {
    const reports = [
      makeReport({
        changeFrequency: [
          { filePath: "/a.ts", changeCount: 1 },
          { filePath: "/b.ts", changeCount: 3 },
        ],
      }),
      makeReport({
        changeFrequency: [
          { filePath: "/a.ts", changeCount: 2 },
        ],
      }),
    ];
    const result = buildAnalysisJson(reports);
    // /a.ts: 1+2=3, /b.ts: 3 → tied, but /b.ts comes first (insertion order)
    assert.equal(result.topFiles[0].changeCount, 3);
    // /a.ts should have 3 as well
    const aEntry = result.topFiles.find((f) => f.filePath === "/a.ts");
    assert.equal(aEntry?.changeCount, 3);
  });
});
