---
name: analyze
description: Run static analysis on AI coding session history for the current project
---

# Session Analyzer — Level 1 Static Analysis

Analyze AI coding session history for the current project using the VibeCoding CLI analyzer.

## Instructions

1. **Run the CLI analyzer** on the current project directory:

```bash
node [plugin_root]/../../cli-analyzer/dist/cli.js analyze "$(pwd)"
```

If the CLI analyzer is not built yet, build it first:

```bash
cd [project_root] && pnpm --filter @vibecoding/core run build && pnpm --filter @vibecoding/cli-analyzer run build
```

2. **Present the results** to the user with interpretation:
   - Highlight the most frequently changed files — these are likely the core of the project
   - Show which user prompts led to the most code changes
   - If token usage is high relative to changes made, note this as a potential prompt efficiency issue

3. **Provide actionable insights:**
   - "Your most active file was X — consider reviewing it for accumulated complexity"
   - "Prompt Y resulted in Z file changes — this was an efficient/inefficient prompt"
   - "Total token cost: ~$X (estimated based on model pricing)"

## Limitations
- Level 1 analysis is static only (no AI model calls needed)
- Currently supports Claude Code and Codex CLI session files
- Token cost estimates are approximate
