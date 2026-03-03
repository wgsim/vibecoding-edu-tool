---
name: xray
description: Explain AI-generated code line-by-line from a traditional programming perspective. Adapts depth to user level (beginner/intermediate/expert).
tools: AskUserQuestion
---

# X-Ray Viewer — Code Literacy Analysis

> **Language**: Detect the user's language from their input and respond in that language throughout. Default to English if unclear.

Dissect AI-generated code from a traditional software engineering perspective.

## Instructions

### 1. Ask for user level (if not specified)

If the user has not stated their level, use the AskUserQuestion tool:

- question: "Choose your level so I can adjust the explanation depth"
- header: "Level"
- options:
  - label: "Beginner", description: "New to programming — analogy-based explanations, minimal jargon"
  - label: "Intermediate", description: "Can read code but unfamiliar with patterns — principles + pattern names"
  - label: "Expert", description: "Developer reviewing AI-generated code — architecture, risks, trade-offs"

### 2. Identify the target code

- If the user specifies a file or code block, analyze that.
- Otherwise, use the most recently written or edited code in this conversation.

### 3. Analyze by level

For each significant code section, explain according to the selected level:

---

**Beginner** — analogy-first, minimal terminology

```
📍 [file:line_range]
   In one sentence: [everyday analogy — LEGO, cooking, mailbox, etc.]
   What breaks without it: [concrete consequence]
   One concept to remember: [single takeaway]
```

**Intermediate** — principles + pattern names

```
📍 [file:line_range] — brief description
   What:    [what it does]
   Why:     [why it's needed — what breaks without it]
   Concept: [Observer pattern / null guard / async execution / etc.]
```

**Expert** — architecture, risks, trade-offs

```
📍 [file:line_range] — brief description
   Design decision: [why this structure was chosen]
   Risk:            [potential vulnerability, performance issue, scalability limit]
   Alternative:     [other approach and its trade-offs]
```

---

### 4. Closing summary

End with:

**Dependency map** — how the analyzed code connects to the rest of the project

**Learning path** (by level):

- Beginner: 1–2 things to learn next to fully understand this code
- Intermediate: 2–3 traditional CS concepts that underpin this code
- Expert: patterns, papers, or books relevant to architectural improvement

## What NOT to do

- Do not rewrite or refactor the code unless asked
- Do not suggest improvements outside of the Expert "Risk" section
- Focus on **understanding**, not evaluation
