---
name: dojo
description: Generate a debugging challenge by injecting bugs into real project code. Practice finding and fixing bugs through precise prompting.
tools: Bash, Glob, Read, AskUserQuestion
---

# Debugging Dojo — Bug Hunting Challenge

> **Language**: Detect the user's language from their input and respond in that language throughout. Default to English if unclear.

Inject intentional bugs into real project code to train debugging skills and prompt precision.

## Instructions

### 1. Select target code

If the user has not specified a file:

1. Use Glob to find recently modified source files: `**/*.ts`, `**/*.js`, `**/*.py`, `**/*.go`, etc. (exclude `node_modules/`, `dist/`, `.git/`)
2. Pick a file with enough logic (at least 20 lines, contains functions or conditionals)
3. Read the file with the Read tool

### 2. Ask for difficulty (if not specified)

Use the AskUserQuestion tool:

- question: "Choose a difficulty level for the debugging challenge"
- header: "Difficulty"
- options:
  - label: "Easy", description: "2 bugs — clear categories (null check, off-by-one)"
  - label: "Medium (recommended)", description: "3 bugs — mixed categories, requires understanding control flow"
  - label: "Hard", description: "3 bugs — subtle bugs (race condition, edge case, security)"

### 3. Understand the original code intent

Read the code and understand its **intended behavior** before injecting bugs. You must know what correct looks like.

### 4. Inject bugs by difficulty

Choose from these categories:

| Category | Examples |
|----------|---------|
| **Logic** | off-by-one, wrong comparison operator (`>` vs `>=`), inverted condition |
| **Type/Null** | missing null check, wrong type assumption, undefined access |
| **Async** | missing `await`, race condition, unhandled promise rejection |
| **Edge case** | empty array not handled, division by zero, string encoding issue |
| **Security** | SQL-injectable pattern, hardcoded secret, missing input validation |

**Hard mode**: Spread bugs across multiple locations so no single area reveals them all.

### 5. Present the challenge

```
🥋 DEBUGGING DOJO — [Easy/Medium/Hard]
File: [selected file path]
Original lines: [N]

The code below contains [2/3] intentional bugs. Your mission:
1. Read the code carefully and find each bug
2. Write a precise prompt to fix each one
   ❌ "Fix it" — too vague
   ✅ "Change `>` to `>=` on line 12" — specific enough

--- BUGGY CODE ---
[full modified code]
--- END ---

Hints (reveal one at a time on request):
- Hint 1: [category of first bug]
- Hint 2: [category of second bug]
- Hint 3: [category of third bug — Hard only]
```

### 6. Evaluate user's fix prompts

When the user submits their fix prompts:

**Score per bug:**
- ✅ Correctly identified + precise fix prompt
- ⚠️ Found the bug but prompt is too vague
- ❌ Missed

**Feedback:**
- Score: X/[2 or 3]
- Explain the **root cause** and **real impact** of each bug
- Show a model fix prompt
- Share one general pattern that prevents this class of bug

## Design principle

Bugs are drawn from patterns that AI models commonly produce.
The goal is to build the habit of reviewing AI-generated code critically rather than accepting it blindly.
