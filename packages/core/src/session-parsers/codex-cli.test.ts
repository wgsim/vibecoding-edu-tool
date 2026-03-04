import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseSessionFile } from "./codex-cli.js";

function makeTmpDir(): string {
  return mkdtempSync(join(tmpdir(), "codex-test-"));
}

function cleanup(dir: string): void {
  rmSync(dir, { recursive: true, force: true });
}

describe("codex-cli parseSessionFile", () => {
  test("empty file → empty turns", async () => {
    const dir = makeTmpDir();
    const file = join(dir, "rollout-abc.jsonl");
    writeFileSync(file, "");
    try {
      const result = await parseSessionFile(file, "/project");
      assert.equal(result.turns.length, 0);
      assert.equal(result.tool, "codex-cli");
    } finally {
      cleanup(dir);
    }
  });

  test("session_meta → sessionId extracted", async () => {
    const dir = makeTmpDir();
    const file = join(dir, "rollout-abc.jsonl");
    const line = JSON.stringify({
      type: "session_meta",
      timestamp: "2024-01-01T00:00:00Z",
      payload: { id: "my-session-id", cwd: "/project" },
    });
    writeFileSync(file, line + "\n");
    try {
      const result = await parseSessionFile(file, "/project");
      assert.equal(result.sessionId, "my-session-id");
    } finally {
      cleanup(dir);
    }
  });

  test("sessionId falls back to filename if no session_meta", async () => {
    const dir = makeTmpDir();
    const file = join(dir, "rollout-xyz.jsonl");
    writeFileSync(file, "");
    try {
      const result = await parseSessionFile(file, "/project");
      assert.equal(result.sessionId, "rollout-xyz");
    } finally {
      cleanup(dir);
    }
  });

  test("response_item user turn extracted", async () => {
    const dir = makeTmpDir();
    const file = join(dir, "s.jsonl");
    const line = JSON.stringify({
      type: "response_item",
      timestamp: "2024-01-01T00:00:00Z",
      payload: { role: "user", content: "Write a function that validates email" },
    });
    writeFileSync(file, line + "\n");
    try {
      const result = await parseSessionFile(file, "/project");
      assert.equal(result.turns.length, 1);
      assert.equal(result.turns[0].role, "user");
      assert.equal(result.turns[0].content, "Write a function that validates email");
    } finally {
      cleanup(dir);
    }
  });

  test("response_item assistant turn extracted", async () => {
    const dir = makeTmpDir();
    const file = join(dir, "s.jsonl");
    const line = JSON.stringify({
      type: "response_item",
      timestamp: "2024-01-01T00:00:01Z",
      payload: { role: "assistant", content: "Here is the email validation function..." },
    });
    writeFileSync(file, line + "\n");
    try {
      const result = await parseSessionFile(file, "/project");
      assert.equal(result.turns.length, 1);
      assert.equal(result.turns[0].role, "assistant");
    } finally {
      cleanup(dir);
    }
  });

  test("function_call → toolCalls with parsed args", async () => {
    const dir = makeTmpDir();
    const file = join(dir, "s.jsonl");
    const line = JSON.stringify({
      type: "response_item",
      timestamp: "2024-01-01T00:00:01Z",
      payload: {
        type: "function_call",
        name: "exec_command",
        arguments: JSON.stringify({ cmd: "cat > /src/app.ts" }),
      },
    });
    writeFileSync(file, line + "\n");
    try {
      const result = await parseSessionFile(file, "/project");
      assert.equal(result.turns.length, 1);
      assert.equal(result.turns[0].role, "assistant");
      assert.ok(result.turns[0].toolCalls);
      assert.equal(result.turns[0].toolCalls![0].name, "exec_command");
      assert.equal((result.turns[0].toolCalls![0].input as { cmd: string }).cmd, "cat > /src/app.ts");
    } finally {
      cleanup(dir);
    }
  });

  test("function_call with invalid JSON args → empty input", async () => {
    const dir = makeTmpDir();
    const file = join(dir, "s.jsonl");
    const line = JSON.stringify({
      type: "response_item",
      timestamp: "t",
      payload: {
        type: "function_call",
        name: "exec_command",
        arguments: "NOT VALID JSON",
      },
    });
    writeFileSync(file, line + "\n");
    try {
      const result = await parseSessionFile(file, "/project");
      assert.deepEqual(result.turns[0].toolCalls![0].input, {});
    } finally {
      cleanup(dir);
    }
  });

  test("<environment_context> user messages are filtered", async () => {
    const dir = makeTmpDir();
    const file = join(dir, "s.jsonl");
    const line = JSON.stringify({
      type: "response_item",
      timestamp: "t",
      payload: { role: "user", content: "<environment_context>cwd=/project</environment_context>" },
    });
    writeFileSync(file, line + "\n");
    try {
      const result = await parseSessionFile(file, "/project");
      assert.equal(result.turns.length, 0);
    } finally {
      cleanup(dir);
    }
  });

  test("# AGENTS.md user messages are filtered", async () => {
    const dir = makeTmpDir();
    const file = join(dir, "s.jsonl");
    const line = JSON.stringify({
      type: "response_item",
      timestamp: "t",
      payload: { role: "user", content: "# AGENTS.md\nDo not do X" },
    });
    writeFileSync(file, line + "\n");
    try {
      const result = await parseSessionFile(file, "/project");
      assert.equal(result.turns.length, 0);
    } finally {
      cleanup(dir);
    }
  });

  test("content array with input_text/output_text/text blocks", async () => {
    const dir = makeTmpDir();
    const file = join(dir, "s.jsonl");
    const line = JSON.stringify({
      type: "response_item",
      timestamp: "t",
      payload: {
        role: "user",
        content: [
          { type: "input_text", text: "Build a REST API endpoint" },
          { type: "text", text: " with authentication" },
        ],
      },
    });
    writeFileSync(file, line + "\n");
    try {
      const result = await parseSessionFile(file, "/project");
      assert.equal(result.turns.length, 1);
      assert.equal(result.turns[0].content, "Build a REST API endpoint\n with authentication");
    } finally {
      cleanup(dir);
    }
  });

  test("malformed JSONL lines are skipped", async () => {
    const dir = makeTmpDir();
    const file = join(dir, "s.jsonl");
    writeFileSync(file, "BAD JSON\n" + JSON.stringify({
      type: "response_item",
      timestamp: "t",
      payload: { role: "assistant", content: "ok" },
    }));
    try {
      const result = await parseSessionFile(file, "/project");
      assert.equal(result.turns.length, 1);
    } finally {
      cleanup(dir);
    }
  });
});
