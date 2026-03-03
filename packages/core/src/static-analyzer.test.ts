import test from "node:test";
import assert from "node:assert/strict";
import { analyzeSession } from "./static-analyzer.js";
import type { ParsedSession } from "./types.js";

test("analyzeSession aggregates prompts, tokens, and file changes", () => {
  const session: ParsedSession = {
    tool: "codex-cli",
    sessionId: "session-1",
    projectPath: "/tmp/project",
    sessionFilePath: "/tmp/session.jsonl",
    startTime: "2026-03-03T00:00:00Z",
    turns: [
      {
        timestamp: "2026-03-03T00:00:01Z",
        role: "user",
        content: "Please update src/app.ts",
      },
      {
        timestamp: "2026-03-03T00:00:02Z",
        role: "assistant",
        content: "",
        tokenUsage: { inputTokens: 10, outputTokens: 4 },
        toolCalls: [
          {
            name: "Write",
            input: { file_path: "src/app.ts" },
          },
        ],
      },
      {
        timestamp: "2026-03-03T00:00:03Z",
        role: "assistant",
        content: "",
        tokenUsage: { inputTokens: 3, outputTokens: 2 },
        toolCalls: [
          {
            name: "exec_command",
            input: { cmd: "sed -i 's/old/new/' src/app.ts" },
          },
        ],
      },
    ],
  };

  const report = analyzeSession(session);

  assert.equal(report.promptCount, 1);
  assert.equal(report.totalTurns, 3);
  assert.deepEqual(report.totalTokens, { inputTokens: 13, outputTokens: 6 });
  assert.equal(report.fileChanges.length, 2);
  assert.deepEqual(
    report.fileChanges.map((change) => ({ filePath: change.filePath, changeType: change.changeType })),
    [
      { filePath: "src/app.ts", changeType: "create" },
      { filePath: "src/app.ts", changeType: "edit" },
    ],
  );
  assert.deepEqual(report.changeFrequency, [{ filePath: "src/app.ts", changeCount: 2 }]);
});
