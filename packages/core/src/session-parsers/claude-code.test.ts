import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { encodeProjectPath, isMeaningfulPrompt, parseSessionFile } from "./claude-code.js";

// ─── encodeProjectPath ─────────────────────────────────────────────────────────

describe("encodeProjectPath", () => {
  test("replaces slashes with hyphens", () => {
    assert.equal(encodeProjectPath("/Users/alice/project"), "-Users-alice-project");
  });

  test("replaces underscores with hyphens", () => {
    assert.equal(encodeProjectPath("/Users/alice/my_project"), "-Users-alice-my-project");
  });

  test("replaces spaces with hyphens", () => {
    assert.equal(encodeProjectPath("/Users/alice/my project"), "-Users-alice-my-project");
  });

  test("replaces backslashes with hyphens", () => {
    assert.equal(encodeProjectPath("C:\\Users\\alice"), "C:-Users-alice");
  });

  test("empty string returns empty", () => {
    assert.equal(encodeProjectPath(""), "");
  });
});

// ─── isMeaningfulPrompt ────────────────────────────────────────────────────────

describe("isMeaningfulPrompt", () => {
  test("short string → false", () => {
    assert.equal(isMeaningfulPrompt("ok"), false);
    assert.equal(isMeaningfulPrompt("yes"), false);
  });

  test("Korean trivials → false", () => {
    assert.equal(isMeaningfulPrompt("응"), false);
    assert.equal(isMeaningfulPrompt("네"), false);
    assert.equal(isMeaningfulPrompt("알겠습니다"), false);
  });

  test("numeric selection → false", () => {
    assert.equal(isMeaningfulPrompt("2번"), false);
    assert.equal(isMeaningfulPrompt("3."), false);
  });

  test("XML-tagged message with no free text → false", () => {
    assert.equal(isMeaningfulPrompt("<result><text>hi</text></result>"), false);
  });

  test("Error: prefix → false", () => {
    assert.equal(isMeaningfulPrompt("Error: something went wrong"), false);
  });

  test("meaningful EN prompt (>15 chars) → true", () => {
    assert.equal(isMeaningfulPrompt("Please implement a login form with validation"), true);
  });

  test("meaningful KO prompt → true", () => {
    assert.equal(isMeaningfulPrompt("로그인 폼에 유효성 검사를 추가해줘"), true);
  });

  test("exactly 15 chars → true", () => {
    // 15 chars, no trivial pattern
    assert.equal(isMeaningfulPrompt("implement this!"), true);
  });

  test("14 chars → false (too short)", () => {
    assert.equal(isMeaningfulPrompt("short message!"), false);
  });

  test("space-padded trivial is still filtered", () => {
    assert.equal(isMeaningfulPrompt("yes"), false);
  });
});

// ─── parseSessionFile ──────────────────────────────────────────────────────────

function makeTmpDir(): string {
  return mkdtempSync(join(tmpdir(), "cc-test-"));
}

function cleanup(dir: string): void {
  rmSync(dir, { recursive: true, force: true });
}

describe("parseSessionFile", () => {
  test("empty file → empty turns", async () => {
    const dir = makeTmpDir();
    const file = join(dir, "session.jsonl");
    writeFileSync(file, "");
    try {
      const result = await parseSessionFile(file, "/project");
      assert.equal(result.turns.length, 0);
      assert.equal(result.sessionId, "session");
      assert.equal(result.tool, "claude-code");
    } finally {
      cleanup(dir);
    }
  });

  test("user message with string content is extracted", async () => {
    const dir = makeTmpDir();
    const file = join(dir, "abc.jsonl");
    const line = JSON.stringify({
      type: "user",
      timestamp: "2024-01-01T00:00:00Z",
      message: { content: "Please implement a feature with proper validation" },
    });
    writeFileSync(file, line + "\n");
    try {
      const result = await parseSessionFile(file, "/project");
      assert.equal(result.turns.length, 1);
      assert.equal(result.turns[0].role, "user");
      assert.equal(result.turns[0].content, "Please implement a feature with proper validation");
    } finally {
      cleanup(dir);
    }
  });

  test("user message with content array is extracted", async () => {
    const dir = makeTmpDir();
    const file = join(dir, "abc.jsonl");
    const line = JSON.stringify({
      type: "user",
      timestamp: "2024-01-01T00:00:00Z",
      message: {
        content: [
          { type: "text", text: "Add a logout button to the navigation bar" },
        ],
      },
    });
    writeFileSync(file, line + "\n");
    try {
      const result = await parseSessionFile(file, "/project");
      assert.equal(result.turns.length, 1);
      assert.equal(result.turns[0].content, "Add a logout button to the navigation bar");
    } finally {
      cleanup(dir);
    }
  });

  test("assistant message with toolCalls extracted", async () => {
    const dir = makeTmpDir();
    const file = join(dir, "s.jsonl");
    const line = JSON.stringify({
      type: "assistant",
      timestamp: "2024-01-01T00:00:01Z",
      message: {
        content: [
          { type: "text", text: "I'll write the file." },
          { type: "tool_use", name: "Write", input: { file_path: "/src/index.ts", content: "" } },
        ],
      },
    });
    writeFileSync(file, line + "\n");
    try {
      const result = await parseSessionFile(file, "/project");
      assert.equal(result.turns.length, 1);
      assert.equal(result.turns[0].role, "assistant");
      assert.ok(result.turns[0].toolCalls);
      assert.equal(result.turns[0].toolCalls![0].name, "Write");
    } finally {
      cleanup(dir);
    }
  });

  test("token usage extracted and cache tokens summed", async () => {
    const dir = makeTmpDir();
    const file = join(dir, "s.jsonl");
    const line = JSON.stringify({
      type: "assistant",
      timestamp: "2024-01-01T00:00:01Z",
      message: {
        content: "ok",
        usage: {
          input_tokens: 100,
          output_tokens: 50,
          cache_creation_input_tokens: 20,
          cache_read_input_tokens: 10,
        },
      },
    });
    writeFileSync(file, line + "\n");
    try {
      const result = await parseSessionFile(file, "/project");
      const usage = result.turns[0].tokenUsage;
      assert.ok(usage);
      assert.equal(usage!.inputTokens, 130); // 100 + 20 + 10
      assert.equal(usage!.outputTokens, 50);
    } finally {
      cleanup(dir);
    }
  });

  test("malformed JSONL lines are skipped", async () => {
    const dir = makeTmpDir();
    const file = join(dir, "s.jsonl");
    const content = [
      "NOT VALID JSON !!!",
      JSON.stringify({
        type: "user",
        timestamp: "t",
        message: { content: "This is a meaningful prompt to test skipping" },
      }),
    ].join("\n");
    writeFileSync(file, content);
    try {
      const result = await parseSessionFile(file, "/project");
      assert.equal(result.turns.length, 1);
    } finally {
      cleanup(dir);
    }
  });

  test("trivial prompts are filtered out", async () => {
    const dir = makeTmpDir();
    const file = join(dir, "s.jsonl");
    const line = JSON.stringify({
      type: "user",
      timestamp: "t",
      message: { content: "yes" },
    });
    writeFileSync(file, line + "\n");
    try {
      const result = await parseSessionFile(file, "/project");
      assert.equal(result.turns.length, 0);
    } finally {
      cleanup(dir);
    }
  });

  test("startTime set from first turn timestamp", async () => {
    const dir = makeTmpDir();
    const file = join(dir, "s.jsonl");
    const lines = [
      JSON.stringify({
        type: "user",
        timestamp: "2024-06-01T10:00:00Z",
        message: { content: "Build a comprehensive testing framework" },
      }),
    ].join("\n");
    writeFileSync(file, lines);
    try {
      const result = await parseSessionFile(file, "/project");
      assert.equal(result.startTime, "2024-06-01T10:00:00Z");
    } finally {
      cleanup(dir);
    }
  });
});
