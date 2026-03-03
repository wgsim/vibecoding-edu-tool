# vibecoding-edu — Claude Code Plugin

A Claude Code skill plugin for understanding AI-generated code, practicing debugging, and reviewing AI session history.

## Skills

| Skill | Invocation | Description |
|-------|-----------|-------------|
| X-Ray | `/vibecoding-edu:xray` | Explain AI-generated code line-by-line from a traditional engineering perspective |
| Dojo | `/vibecoding-edu:dojo` | Inject bugs into real project code and practice finding them through precise prompting |
| Analyze | `/vibecoding-edu:analyze` | Run static analysis on AI coding session history for the current project |

---

## Installation

### Method A — Local clone (recommended, always works)

```bash
git clone <repo-url>
cd vibecoding-edu-tool-for-child
bash packages/claude-code-plugin/install.sh
```

Open a new Claude Code session — the skills will be active.

> Re-run the same command to update. The script is idempotent.

---

### Method B — GitHub Marketplace

> Available once the repo is public on GitHub.
> **Must be run in a regular terminal, not inside a Claude Code session.**
> (Running inside a session causes `installPath` to be written to a session-specific directory, breaking subsequent sessions.)

```bash
# Register marketplace (once)
claude plugin marketplace add <owner>/<repo>

# Install
claude plugin install vibecoding-edu@vibecoding-edu

# Update
claude plugin update vibecoding-edu@vibecoding-edu
```

Open a new Claude Code session — the skills will be active.

---

## Directory Structure

```
packages/claude-code-plugin/
├── .claude-plugin/
│   ├── plugin.json       # Plugin metadata
│   └── marketplace.json  # Local marketplace reference
├── skills/
│   ├── xray/SKILL.md     # X-Ray skill definition
│   ├── dojo/SKILL.md     # Dojo skill definition
│   └── analyze/SKILL.md  # Analyze skill definition
└── install.sh            # Installation script
```

> `plugins/vibecoding-edu/` at the repo root is a symlink to this directory.
> GitHub marketplace discovery uses the `plugins/<name>/` structure.

---

## How install.sh Works

Running `claude plugin install` inside a Claude session writes `installPath` to a session-specific path (`~/.claude-per-sessions/sessions/<id>/...`), which breaks loading in new sessions.

`install.sh` bypasses this by directly writing to the global paths:

| Step | Target | Action |
|------|--------|--------|
| 1 | `~/.claude/plugins/cache/vibecoding-edu/vibecoding-edu/0.1.0/` | Copy plugin files |
| 2 | `~/.claude/plugins/marketplaces/vibecoding-edu/plugins/vibecoding-edu/` | Sync local marketplace |
| 3 | `~/.claude/plugins/installed_plugins.json` | Register with global cache path as `installPath` |
| 4 | `~/.claude/settings.json` | Enable in `enabledPlugins` |
