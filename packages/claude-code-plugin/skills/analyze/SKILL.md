---
name: analyze
description: Analyze AI coding session history for the current project. Shows file change frequency, prompt-to-file mappings, and token usage.
tools: Bash
---

# Session Analyzer — AI Session History Analysis

> **Language**: Detect the user's language from their input and respond in that language throughout. Default to English if unclear.

Analyze AI coding sessions (Claude Code, Codex CLI) for the current project and provide learning insights.

## Instructions

### 1. Run the analysis script

Run the following Python3 script with the Bash tool:

```bash
python3 << 'PYEOF'
import os, json, glob
from pathlib import Path
from collections import defaultdict

project_path = os.getcwd()
home = str(Path.home())

sessions = []

# ── Claude Code sessions ──────────────────────────────────────────
# Directory name format: /path/to/project → -path-to-project (/ and _ both become -)
claude_projects = os.path.join(home, ".claude", "projects")
if os.path.isdir(claude_projects):
    proj_dir_name = "-" + project_path.replace("/", "-").replace("_", "-").lstrip("-")
    proj_dir = os.path.join(claude_projects, proj_dir_name)
    for jsonl in glob.glob(os.path.join(proj_dir, "*.jsonl")):
        try:
            with open(jsonl) as f:
                lines = [json.loads(l) for l in f if l.strip()]
            if lines:
                sessions.append(("claude-code", jsonl, lines))
        except Exception:
            pass
    # Fallback: scan all projects and match by cwd field (handles edge cases)
    if not sessions:
        for jsonl in glob.glob(os.path.join(claude_projects, "*", "*.jsonl")):
            try:
                with open(jsonl) as f:
                    first = json.loads(f.readline())
                if first.get("cwd", "").startswith(project_path):
                    with open(jsonl) as f:
                        lines = [json.loads(l) for l in f if l.strip()]
                    sessions.append(("claude-code", jsonl, lines))
            except Exception:
                pass

# ── Codex CLI sessions ────────────────────────────────────────────
codex_sessions = os.path.join(home, ".codex", "sessions")
if os.path.isdir(codex_sessions):
    for jsonl in glob.glob(os.path.join(codex_sessions, "*.jsonl")):
        try:
            with open(jsonl) as f:
                lines = [json.loads(l) for l in f if l.strip()]
            belongs = any(
                l.get("type") == "session_meta" and
                l.get("cwd", "").startswith(project_path)
                for l in lines[:10]
            )
            if belongs:
                sessions.append(("codex-cli", jsonl, lines))
        except Exception:
            pass

if not sessions:
    print(f"No AI sessions found for: {project_path}")
    print("Supported tools: Claude Code (~/.claude/projects/), Codex CLI (~/.codex/sessions/)")
    exit(0)

# ── Aggregate analysis ────────────────────────────────────────────
total_turns = 0
total_prompts = 0
total_in = 0
total_out = 0
file_freq = defaultdict(int)
prompt_file_map = []

FILE_TOOLS = {"Write", "write", "Edit", "edit"}

TRIVIAL_EN = re.compile(
    r"^(yes|no|ok|okay|sure|yep|yeah|nope|go|proceed|continue|next|done|"
    r"fine|great|sounds good|got it|agreed|perfect|correct|right|good|"
    r"nice|cool|thanks|thank you|please proceed)[.\s!?]*$", re.I)
TRIVIAL_KO = re.compile(
    r"^(응|네|아니|ㄴ|ㅇ|ㅇㅇ|ㄱㄱ|고|좋아|오케이|알겠어|알겠습니다|"
    r"진행해줘|계속해줘|그래|맞아|넵|넹|ㅇㅋ|감사|감사합니다)[.\s!?]*$")

def is_meaningful(text):
    t = text.strip()
    if len(t) < 15: return False
    if re.match(r"^<[a-z]", t): return False
    if re.match(r"^(Unknown skill:|Error:|Warning:)", t, re.I): return False
    if re.match(r"^(option\s*)?\d+[번.\s!?]*$", t, re.I): return False
    if TRIVIAL_EN.match(t) or TRIVIAL_KO.match(t): return False
    return True

for tool, path, lines in sessions:
    last_prompt = ""
    for entry in lines:
        msg = entry.get("message", {})
        role = msg.get("role") or entry.get("role", "")
        content = msg.get("content") or entry.get("content", "")

        if role == "user":
            text = content if isinstance(content, str) else \
                   " ".join(b.get("text","") for b in content if isinstance(b, dict) and b.get("type")=="text")
            text = text.strip()
            if is_meaningful(text):
                last_prompt = text
                total_prompts += 1
            total_turns += 1
        elif role == "assistant":
            total_turns += 1
            usage = msg.get("usage") or entry.get("usage", {})
            total_in  += usage.get("input_tokens", 0)
            total_out += usage.get("output_tokens", 0)
            if isinstance(content, list):
                for block in content:
                    if isinstance(block, dict) and block.get("type") == "tool_use":
                        name = block.get("name", "")
                        inp  = block.get("input", {})
                        fpath = inp.get("file_path") or inp.get("path")
                        if name in FILE_TOOLS and fpath:
                            file_freq[fpath] += 1
                            prompt_file_map.append((last_prompt[:80], fpath, name))

# ── Print report ──────────────────────────────────────────────────
div = "=" * 60
print(div)
print("PROJECT SESSION ANALYSIS")
print(f"  {project_path}")
print(div)
print(f"  Sessions found : {len(sessions)}")
print(f"  Total turns    : {total_turns:,}")
print(f"  User prompts   : {total_prompts:,}")
print(f"  File changes   : {sum(file_freq.values()):,}")
if total_in > 0:
    print(f"  Tokens (Claude): {total_in:,} in / {total_out:,} out")

if file_freq:
    top = sorted(file_freq.items(), key=lambda x: -x[1])[:10]
    mx  = top[0][1]
    print("\nMost Changed Files")
    for fp, cnt in top:
        bar = "#" * min(round(cnt/mx*20), 20)
        rel = fp[len(project_path)+1:] if fp.startswith(project_path) else fp
        print(f"  {bar:<20} {cnt}x  {rel}")

if prompt_file_map:
    print("\nPrompt -> File Change Mapping (last 10)")
    for prompt, fp, op in prompt_file_map[-10:]:
        icon = "+" if op in ("Write","write") else "~"
        rel  = fp[len(project_path)+1:] if fp.startswith(project_path) else fp
        dots = "..." if len(prompt) == 80 else ""
        print(f"  [{icon}] {rel}")
        print(f"      <- \"{prompt}{dots}\"")

print(f"\n{'-'*60}")
PYEOF
```

### 2. Interpret the results

Based on the analysis output, provide insights:

**File change frequency:**

- Most-changed files → core modules or areas with unstable design
- Even distribution → systematic development; concentrated changes → possible refactoring need

**Prompt efficiency:**

- Short prompt → many file changes: efficient
- Long prompt → few changes: room to improve prompt clarity

**Token usage:**

- Input tokens >> output tokens: long context maintained (large files repeatedly referenced)
- Balanced ratio: efficient session

### 3. Provide actionable feedback

Summarize findings and suggest concrete next steps for the user.
