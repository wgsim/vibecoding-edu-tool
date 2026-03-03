# VibeCoding Edu Tool

A hybrid education platform that teaches both AI-era vibe coding and traditional software engineering skills.

Analyzes AI-generated code, explains it, trains debugging skills, and reviews AI session history.

---

## Packages

| Package | Path | Description |
|---------|------|-------------|
| **core** | `packages/core` | Session parsers + static analysis engine |
| **cli-analyzer** | `packages/cli-analyzer` | CLI tool (`vibecoding analyze`) |
| **vscode-extension** | `packages/vscode-extension` | VSCode Extension (Track A) |
| **claude-code-plugin** | `packages/claude-code-plugin` | Claude Code skill plugin (Track B) |

```
vibecoding-edu-tool/
├── packages/
│   ├── core/                   # ParsedSession, StaticAnalysisReport types and parsers
│   ├── cli-analyzer/           # vibecoding CLI (sessions / analyze commands)
│   ├── vscode-extension/       # VSCode Extension + bundled CLI
│   └── claude-code-plugin/     # Claude Code skills (xray / dojo / analyze)
├── plugins/
│   └── vibecoding-edu/         # → symlink to packages/claude-code-plugin
│                               #   (for GitHub marketplace discovery)
├── .claude-plugin/
│   └── marketplace.json        # GitHub marketplace metadata
└── plan/                       # Project planning documents
```

---

## Quick Start

### Track A — VSCode Extension

```bash
pnpm install
pnpm --filter vscode-extension build    # tsc + bundle CLI
pnpm --filter vscode-extension package  # generate .vsix
```

Install the `.vsix` file in VSCode via `Extensions: Install from VSIX...`.

### Track B — Claude Code Plugin

```bash
bash packages/claude-code-plugin/install.sh
```

Skills available in a new Claude Code session: `/vibecoding-edu:xray`, `/vibecoding-edu:dojo`, `/vibecoding-edu:analyze`

→ Details: [`packages/claude-code-plugin/README.md`](packages/claude-code-plugin/README.md)

### Track C — CLI Analyzer (standalone)

```bash
pnpm install
pnpm --filter cli-analyzer build

# List AI sessions for the current directory
node packages/cli-analyzer/dist/cli.js sessions .

# Analyze sessions
node packages/cli-analyzer/dist/cli.js analyze .
```

---

## Supported AI Tools

| Tool | Session file path |
|------|-----------------|
| Claude Code | `~/.claude/projects/<hash>/` (JSONL) |
| Codex CLI | `~/.codex/sessions/` (JSONL) |

---

## Development

- Node.js 18+, pnpm
- TypeScript (ESM, project references)
- VSCode Extension: esbuild (CJS bundle)

```bash
pnpm install
pnpm build   # build all packages
```
