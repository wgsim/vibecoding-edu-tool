import type { AiTool, ParsedSession } from "../types.js";
import * as claudeCode from "./claude-code.js";
import * as codexCli from "./codex-cli.js";

/**
 * Find all session files for a project, across all supported AI tools.
 */
export async function findAllSessions(
  projectPath: string,
): Promise<Array<{ tool: AiTool; filePath: string }>> {
  const [claudeFiles, codexFiles] = await Promise.all([
    claudeCode.findSessionFiles(projectPath),
    codexCli.findSessionFiles(projectPath),
  ]);

  return [
    ...claudeFiles.map((f) => ({ tool: "claude-code" as AiTool, filePath: f })),
    ...codexFiles.map((f) => ({ tool: "codex-cli" as AiTool, filePath: f })),
  ];
}

/**
 * Parse a session file from any supported tool.
 */
export async function parseSession(
  tool: AiTool,
  sessionFilePath: string,
  projectPath: string,
): Promise<ParsedSession> {
  switch (tool) {
    case "claude-code":
      return claudeCode.parseSessionFile(sessionFilePath, projectPath);
    case "codex-cli":
      return codexCli.parseSessionFile(sessionFilePath, projectPath);
  }
}

export { claudeCode, codexCli };
