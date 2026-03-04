import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { analyzeSession } from "./static-analyzer.js";
import type { ParsedSession } from "./types.js";

function makeSession(overrides: Partial<ParsedSession> = {}): ParsedSession {
  return {
    tool: "claude-code",
    sessionId: "test-session",
    projectPath: "/project",
    sessionFilePath: "/project/.claude/sessions/test-session.jsonl",
    startTime: "2024-01-01T00:00:00Z",
    turns: [],
    ...overrides,
  };
}

// ─── Basic counts ──────────────────────────────────────────────────────────────

describe("analyzeSession: basic counts", () => {
  test("empty session → all counts 0", () => {
    const report = analyzeSession(makeSession());
    assert.equal(report.totalTurns, 0);
    assert.equal(report.promptCount, 0);
    assert.equal(report.fileChanges.length, 0);
    assert.deepEqual(report.totalTokens, { inputTokens: 0, outputTokens: 0 });
    assert.deepEqual(report.changeFrequency, []);
  });

  test("session metadata is passed through", () => {
    const session = makeSession({ tool: "codex-cli", sessionId: "abc", projectPath: "/myproj" });
    const report = analyzeSession(session);
    assert.equal(report.tool, "codex-cli");
    assert.equal(report.sessionId, "abc");
    assert.equal(report.projectPath, "/myproj");
  });

  test("turns without tokenUsage → totalTokens {0, 0}", () => {
    const session = makeSession({
      turns: [
        { timestamp: "t", role: "user", content: "hello" },
        { timestamp: "t", role: "assistant", content: "world" },
      ],
    });
    const report = analyzeSession(session);
    assert.deepEqual(report.totalTokens, { inputTokens: 0, outputTokens: 0 });
  });

  test("promptCount counts only user turns", () => {
    const session = makeSession({
      turns: [
        { timestamp: "t", role: "user", content: "prompt one" },
        { timestamp: "t", role: "assistant", content: "response" },
        { timestamp: "t", role: "user", content: "prompt two" },
      ],
    });
    assert.equal(analyzeSession(session).promptCount, 2);
  });
});

// ─── Token usage ──────────────────────────────────────────────────────────────

describe("analyzeSession: token usage", () => {
  test("sums tokens across turns", () => {
    const session = makeSession({
      turns: [
        { timestamp: "t", role: "assistant", content: "", tokenUsage: { inputTokens: 100, outputTokens: 50 } },
        { timestamp: "t", role: "assistant", content: "", tokenUsage: { inputTokens: 200, outputTokens: 75 } },
      ],
    });
    const report = analyzeSession(session);
    assert.equal(report.totalTokens.inputTokens, 300);
    assert.equal(report.totalTokens.outputTokens, 125);
  });
});

// ─── File changes: Write/Edit ──────────────────────────────────────────────────

describe("analyzeSession: Write/Edit tool calls", () => {
  test("Write toolCall → create change", () => {
    const session = makeSession({
      turns: [
        { timestamp: "t", role: "user", content: "create index file" },
        {
          timestamp: "t",
          role: "assistant",
          content: "",
          toolCalls: [{ name: "Write", input: { file_path: "/project/src/index.ts", content: "" } }],
        },
      ],
    });
    const report = analyzeSession(session);
    assert.equal(report.fileChanges.length, 1);
    assert.equal(report.fileChanges[0].changeType, "create");
    assert.equal(report.fileChanges[0].filePath, "/project/src/index.ts");
    assert.equal(report.fileChanges[0].promptText, "create index file");
  });

  test("Edit toolCall → edit change", () => {
    const session = makeSession({
      turns: [
        { timestamp: "t", role: "user", content: "fix the bug" },
        {
          timestamp: "t",
          role: "assistant",
          content: "",
          toolCalls: [{ name: "Edit", input: { file_path: "/project/src/app.ts" } }],
        },
      ],
    });
    const report = analyzeSession(session);
    assert.equal(report.fileChanges[0].changeType, "edit");
  });

  test("path field (alternative to file_path) is used", () => {
    const session = makeSession({
      turns: [
        { timestamp: "t", role: "user", content: "update config" },
        {
          timestamp: "t",
          role: "assistant",
          content: "",
          toolCalls: [{ name: "Write", input: { path: "/project/config.json" } }],
        },
      ],
    });
    const report = analyzeSession(session);
    assert.equal(report.fileChanges[0].filePath, "/project/config.json");
  });

  test("no toolCalls → empty fileChanges", () => {
    const session = makeSession({
      turns: [
        { timestamp: "t", role: "user", content: "hello" },
        { timestamp: "t", role: "assistant", content: "world" },
      ],
    });
    assert.equal(analyzeSession(session).fileChanges.length, 0);
  });
});

// ─── exec_command patterns ────────────────────────────────────────────────────

describe("analyzeSession: exec_command patterns", () => {
  function sessionWithCmd(cmd: string): ParsedSession {
    return makeSession({
      turns: [
        { timestamp: "t", role: "user", content: "run command" },
        {
          timestamp: "t",
          role: "assistant",
          content: "",
          toolCalls: [{ name: "exec_command", input: { cmd } }],
        },
      ],
    });
  }

  test("cat > file → create", () => {
    const report = analyzeSession(sessionWithCmd("cat > /project/out.txt"));
    assert.equal(report.fileChanges.length, 1);
    assert.equal(report.fileChanges[0].changeType, "create");
  });

  test("echo ... > file → create", () => {
    const report = analyzeSession(sessionWithCmd("echo hello > /project/out.txt"));
    assert.equal(report.fileChanges.length, 1);
  });

  test("mv src dst → create", () => {
    const report = analyzeSession(sessionWithCmd("mv /tmp/src.txt /project/dst.txt"));
    assert.equal(report.fileChanges.length, 1);
    assert.equal(report.fileChanges[0].filePath, "/project/dst.txt");
  });

  test("mkdir -p dir → create", () => {
    const report = analyzeSession(sessionWithCmd("mkdir -p /project/newdir"));
    assert.equal(report.fileChanges.length, 1);
  });

  test("sed -i → edit", () => {
    const report = analyzeSession(sessionWithCmd("sed -i 's/foo/bar/' /project/src/app.ts"));
    assert.equal(report.fileChanges.length, 1);
    assert.equal(report.fileChanges[0].changeType, "edit");
  });

  test("$VAR path → rejected by sanitizeFilePath", () => {
    const report = analyzeSession(sessionWithCmd("cat > $OUTPUT_FILE"));
    assert.equal(report.fileChanges.length, 0);
  });

  test("backtick in path → rejected", () => {
    const report = analyzeSession(sessionWithCmd("cat > `echo /tmp/file`"));
    assert.equal(report.fileChanges.length, 0);
  });
});

// ─── findPrecedingPrompt ──────────────────────────────────────────────────────

describe("analyzeSession: preceding prompt", () => {
  test("no preceding user turn → '(no preceding prompt)'", () => {
    const session = makeSession({
      turns: [
        {
          timestamp: "t",
          role: "assistant",
          content: "",
          toolCalls: [{ name: "Write", input: { file_path: "/f.ts" } }],
        },
      ],
    });
    const report = analyzeSession(session);
    assert.equal(report.fileChanges[0].promptText, "(no preceding prompt)");
  });
});

// ─── changeFrequency ─────────────────────────────────────────────────────────

describe("analyzeSession: changeFrequency", () => {
  test("most changed file is first", () => {
    const session = makeSession({
      turns: [
        { timestamp: "t", role: "user", content: "p1" },
        {
          timestamp: "t",
          role: "assistant",
          content: "",
          toolCalls: [
            { name: "Edit", input: { file_path: "/a.ts" } },
            { name: "Edit", input: { file_path: "/b.ts" } },
            { name: "Edit", input: { file_path: "/a.ts" } },
          ],
        },
      ],
    });
    const report = analyzeSession(session);
    assert.equal(report.changeFrequency[0].filePath, "/a.ts");
    assert.equal(report.changeFrequency[0].changeCount, 2);
    assert.equal(report.changeFrequency[1].filePath, "/b.ts");
    assert.equal(report.changeFrequency[1].changeCount, 1);
  });
});
