# VibeCoding Edu Tool - Project Vision & Core Features

## 1. Project Overview
This project is a hybrid educational platform that teaches both the new AI-driven paradigm of 'Vibe Coding' and traditional 'Software Engineering Literacy'. It enables anyone—from children and non-developers to experts—to learn how to generate code using natural language prompts, while simultaneously reverse-engineering the generated code to understand its internal mechanics (Code Literacy) and how to handle edge cases (System Architecture).

## 2. Target Persona Engine
The system dynamically adjusts the depth of the AI's explanations and the metaphors used based on the user's selected level.
*   **Kids/Students:** Focuses on intuitive metaphors (Lego blocks, cooking recipes) and logical flow. Emphasizes "why you need to instruct the computer this way."
*   **Beginners (Non-developers):** Excludes jargon, focusing on understanding the big picture of Frontend/Backend/DB. Teaches how to ask the AI questions when errors occur.
*   **Intermediates (Junior Developers):** Clearly explains code mechanics, focusing on performance optimization and how to remove boilerplate code using AI.
*   **Experts (Senior Developers):** Focuses on architecture design, security vulnerabilities, comparisons with alternative/latest technologies, and sophisticated prompting to enforce advanced design patterns.

> **Phase 1 Persona Support:** All tracks (VSCode Extension, Claude Code Plugin, CLI Analyzer) are available to all personas. However, the **recommended entry point** differs by level:
>
> | Persona | Recommended Track | Reason |
> |---------|------------------|--------|
> | **Students (teens+)** | VSCode Extension | GUI-based, no terminal needed, Copilot Free tier available |
> | **Beginners** | VSCode Extension | One-click install from Marketplace, visual hover explanations |
> | **Intermediates** | VSCode Extension + Claude Code Plugin | Real-time education in their existing workflow |
> | **Experts** | All 3 tracks (+ CLI Analyzer) | Full post-analysis of session history, deepest insights |
>
> **Kids (children)** are deferred to Phase 2 (Web GUI), where animations and visual diagrams can maximize accessibility.
>
> A **"Getting Started" guide** with screenshots will be provided to enable Beginners/Students to go from zero to running without ever opening a terminal: VSCode install → Copilot Free activation → Extension install (3 steps).

## 3. Core Differentiating Features
These original features differentiate this project from simple prompt generation tools or syntax-focused coding education platforms. Features are divided into **MVP (Phase 1)** and **Future (Phase 2+)** based on implementation priority and technical feasibility.

### Phase 1 — MVP Features

#### 3.1. Code X-Ray Viewer — **Code Literacy Focus** (MVP Core)
*   **Feature:** Explains 'why' each line of AI-generated code is necessary from a traditional programming perspective. In the IDE, triggered via hover or inline annotations. In the CLI analyzer, generated as a structured report from session history.
*   **Learning Outcome:** Dismantles the 'black box' created by vibe coding, helping users develop the "Code Literacy" to independently read the syntax and structure of traditional code (variables, loops, asynchronous processing, etc.).

#### 3.2. Prompt Evaluator (MVP Core)
*   **Feature:** Receives user prompts, scores the intent/structural similarity with the original code, and outputs actionable feedback.
*   **Learning Outcome:** Teaches users to write precise, well-structured prompts rather than vague instructions.

#### 3.3. "Fix the AI's Mess" — Debugging Dojo (MVP Core)
*   **Feature:** The system intentionally presents output containing logic bugs or inefficient spaghetti code.
*   **Learning Outcome:** Users read the code, find the error, and practice writing specific debugging prompts like, "Change this for-loop to a map and add exception handling," rather than just saying "Rewrite it from scratch."

#### 3.4. Re-run Diff — Non-determinism Education (MVP Sub-feature)
*   **Feature:** Re-executes the same prompt on the same model and highlights differences between the two outputs.
*   **Learning Outcome:** Teaches that AI-generated code is non-deterministic — the same prompt can produce different results each time, reinforcing the need for code review and understanding rather than blind trust.
*   **Cost:** One additional model invocation per comparison (user opt-in).

### Phase 2+ — Future Features

#### 3.5. "Vibe to Logic" Translator (Prompt Anatomy)
*   **Feature:** Visually maps how the user's natural language prompt (the "vibe") translates into specific 'technical components' in the actual code.
*   **Learning Outcome:** Helps users visually confirm how vague instructions are replaced by system structures, fostering traditional Computational Thinking.
*   **Rationale for Phase 2+:** Requires rich visual UI (diagrams, animations) best suited for the Web GUI.

#### 3.6. Security & Edge-Case Simulator
*   **Feature:** The system intentionally injects 'malicious inputs (e.g., SQL Injection)' or 'extreme situations (e.g., 10,000 concurrent users)' into the user's perfectly working code to break it.
*   **Learning Outcome:** Encourages users not to settle for "it works," but to imagine failure conditions and add defensive programming constraints to their prompts.
*   **Rationale for Phase 2+:** Requires visual simulation results and interactive UI for maximum educational impact.

#### 3.7. Step-by-Step Architecture Build
*   **Feature:** The system analyzes curated open-source projects and breaks them down into around 10 small functional steps (e.g., 1. DB Schema, 2. API, 3. UI Rendering).
*   **Learning Outcome:** Cultivates the architectural design ability to decompose and assemble software in modular units, rather than trying to build massive software with a single magic prompt.
*   **Scope:** Limited to 3–5 curated example projects. Arbitrary GitHub URL analysis deferred due to reliability constraints of current LLMs on unknown repositories.

#### 3.8. Multi-Model Prompt Comparison
*   **Feature:** Shows how the exact same prompt is interpreted and coded differently across various models (Gemini, Claude, GPT-4, etc.).
*   **Learning Outcome:** Teaches robust prompting skills that work universally by understanding the characteristics of different LLMs.
*   **Rationale for Phase 2+:** High token cost (multiplied by number of models). Will be offered as an opt-in paid feature in the Web GUI, with explicit cost warnings.

## 4. Architecture & Deployment Strategy

### 4.1. Core Design Principle: Plugin, Not Standalone App
This project is **not a standalone application** that calls AI models directly. It is a **plugin/extension for existing AI coding tools**, leveraging the user's already-authenticated model access. This eliminates the need to manage API keys, authentication, and billing infrastructure.

```
User's Existing Environment (model cost = user's responsibility)
┌──────────────────────────────────────┐
│  VSCode / Cursor / Claude Code /     │
│  Codex CLI                           │
│                                      │
│  ┌────────────────────────────────┐  │
│  │  VibeCoding Edu Plugin         │  │
│  │  ─────────────────────         │  │
│  │  · X-Ray Viewer                │  │
│  │  · Prompt Evaluator            │  │
│  │  · Debugging Dojo              │  │
│  │  · Re-run Diff                 │  │
│  └────────────────────────────────┘  │
│                                      │
│  Host tool's AI model ───────────────│
└──────────────────────────────────────┘
```

### 4.2. Phase 1 — MVP (3 Parallel Tracks)

**Track A: VSCode Extension** — Real-time education within the IDE
*   Target: Largest user pool (tens of millions). Also compatible with Cursor (VSCode fork).
*   AI model access: User's existing Copilot subscription or API key.
*   Plugin system: Mature Extension API, well-documented.

**Track B: Claude Code Plugin** — Real-time education in the terminal
*   Target: Rapidly growing AI-native developer community.
*   AI model access: User's existing Anthropic subscription (already authenticated).
*   Plugin system: Hook/Skill system (emerging).

**Track C: CLI Post-Analysis Tool** — Offline analysis of completed projects
*   Analyzes existing local projects by parsing AI session history files to generate educational reports.
*   **Level 1 (No AI model required, free, offline):**
    *   Prompt → code change mapping (which prompt modified which files)
    *   Code structure tree (function/class/module relationships)
    *   Change frequency heatmap (most AI-modified areas)
    *   Prompt pattern statistics (clear instructions vs. vague instructions)
*   **Level 2 (User's own API key, optional):**
    *   X-Ray commentary (the "why" behind each code block)
    *   Security/edge-case diagnosis
    *   Prompt improvement suggestions ("writing it this way would have produced better code")
    *   Auto-generated Debugging Dojo problems from real session data

**Session File Support (Phase 1):**

| Tool | Session File Location | Format | Project Mapping |
|------|----------------------|--------|-----------------|
| **Claude Code** | `~/.claude/projects/<encoded-path>/session-id.jsonl` | JSONL | Project path encoded in directory name — exact mapping |
| **Codex CLI** | `~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl` | JSONL | Parse `working_directory` field inside JSONL to match project |

### 4.3. Shared Monorepo Structure

All three tracks share core logic via a TypeScript monorepo:

```
vibecoding-edu/
├── packages/
│   ├── core/                    ← Shared core logic
│   │   ├── xray-parser.ts             # Code dissection engine
│   │   ├── prompt-evaluator.ts        # Prompt scoring
│   │   ├── debugging-dojo.ts          # Bug injection/verification
│   │   ├── diff-analyzer.ts           # Re-run diff
│   │   └── session-parsers/
│   │       ├── claude-code.ts         # Claude Code JSONL parser
│   │       └── codex-cli.ts           # Codex CLI JSONL parser
│   │
│   ├── vscode-extension/        ← Track A: VSCode/Cursor adapter
│   │   └── extension.ts
│   │
│   ├── claude-code-plugin/      ← Track B: Claude Code adapter
│   │   ├── hooks/
│   │   └── skills/
│   │
│   └── cli-analyzer/            ← Track C: CLI post-analysis tool
│       └── cli.ts
```

### 4.4. Phase 2 — Web GUI
*   Next.js-based web application for Kids/Students and Beginners.
*   Visual features: Vibe to Logic Translator, Security Simulator with architecture diagrams and animations.
*   Multi-Model Comparison as opt-in paid feature.
*   LMS integration (Canvas, Google Classroom) for B2B education.

### 4.5. Phase 3 — Expansion
*   Gemini CLI Extension (Google ecosystem).
*   Additional session parsers (Aider, Cline/Roo Code, etc.).
*   Additional IDE integrations as demand emerges.

## 5. Competitive Landscape Analysis

### 5.1. Market Overview

The current market is split into two distinct camps with no player occupying the intersection:

```
┌─────────────────────────────────────────────────┐
│            AI Code Generation (Make)             │
│     Replit  ·  bolt.new  ·  v0  ·  Cursor       │
│                      ↑                           │
│                ┌─────┴─────┐                     │
│                │ VibeCoding │  ← Only crossover  │
│                │  Edu Tool  │                     │
│                └─────┬─────┘                     │
│                      ↓                           │
│          Code Understanding (Learn)              │
│     Codecademy  ·  Scratch  ·  Code.org          │
└─────────────────────────────────────────────────┘
```

**One-line positioning:** *"The only educational platform for understanding AI-generated code."*

### 5.2. Competitor Comparison Matrix

| Service | Core Identity | Target | Price | AI Education | Code Literacy |
|---------|--------------|--------|-------|-------------|---------------|
| **Replit Agent** | AI code generation + runtime | Beginner–Intermediate devs | $0–100/mo | Explains generation process | ✗ |
| **Cursor** | AI-native IDE | Intermediate–Expert devs | $0–200/mo | ✗ (productivity tool) | ✗ |
| **bolt.new** | Prompt → full-stack app | Non-devs–Beginners | $0–200/mo | ✗ (output-focused) | ✗ |
| **v0.dev** | Prompt → React UI | Frontend developers | $0–30/mo | ✗ (output-focused) | ✗ |
| **Copilot Workspace** | GitHub Issue → PR | Intermediate–Expert devs | $10–39/mo | ✗ (workflow tool) | ✗ |
| **Codecademy** | Traditional coding education + AI assist | Beginner–Intermediate learners | $0–25/mo | AI hints/feedback | ✓ (traditional) |
| **Scratch / Code.org** | Block-based coding education | Children (ages 5–16) | Free | ML model integration (2026) | ✗ (not text code) |
| **VibeCoding Edu (Ours)** | Vibe Coding ↔ Code Literacy | All levels (persona-based) | AGPL open-source → SaaS | **Core purpose** | **Core purpose** |

### 5.3. Differentiation by Competitor

| vs | Our Differentiation |
|----|---------------------|
| **Replit / bolt / v0** | They generate code and stop. We **dissect (X-Ray)** and **stress-test (Simulator)** the generated code to build understanding. |
| **Cursor / Copilot** | Professional developer productivity tools with no educational purpose. We teach **why code is structured the way it is**. |
| **Codecademy** | Traditional syntax education with AI bolted on as an assistant. We take the **reverse direction — analyzing AI-generated code** as a new learning paradigm. |
| **Scratch** | Block-based coding for children. We work with **real text-based code** but adjust explanation depth via the Persona Engine. |

### 5.4. Key Opportunity: The Blue Ocean

No existing product occupies the **"Make → Understand" loop**:
*   AI code generation tools help users build but never teach them what was built.
*   Traditional education platforms teach syntax but ignore the AI-driven workflow that is rapidly becoming standard.
*   This project bridges that gap as the only platform designed around **reverse-engineering AI output for educational purposes**.

### 5.5. Threat Assessment

| Threat | Likelihood | Impact | Mitigation |
|--------|-----------|--------|------------|
| Replit adds educational code-explanation features | Medium | High | Move fast on MVP; build community moat via open-source |
| Codecademy introduces AI code reverse-analysis curriculum | Low–Medium | High | Target B2B education market early with differentiated content |
| v0.dev student plan ($4.99/mo) captures student market on price | Medium | Low | Our CLI Phase 1 is free/open-source; Web Phase 2 competes on value, not price |
| New entrant copies the concept | Medium | Medium | AGPL license prevents SaaS cloning; community + content library as defensible moat |

### 5.6. Strategic Recommendations

1.  **"Make → Understand" loop** as the core marketing message — a position no competitor occupies.
2.  **Partner, don't compete** with generation tools — e.g., "Built an app with bolt? Understand it with VibeCoding." Integration hooks with Replit/bolt/v0 as potential growth channels.
3.  **Target the B2B education market** long-term — universities and bootcamps will need "AI-era Code Literacy" curricula as vibe coding becomes mainstream.

## 6. Business Model & Licensing

### 6.1. License
**AGPL-3.0** — Prevents competitors from cloning the codebase to run as a proprietary SaaS. All modifications must be open-sourced if served over a network.

### 6.2. Monetization Strategy (Phased)

| Phase | Model | Revenue |
|-------|-------|---------|
| **Phase 1 (0–6 months)** | Fully open-source, free | $0 — goal is GitHub stars, community, user feedback |
| **Phase 2 (6–12 months)** | Web GUI with Freemium SaaS (Stripe) | Free tier (limited daily usage) / Paid tier ($9–19/mo) |
| **Phase 3 (12+ months)** | B2B Education Licensing | University/bootcamp licenses, LMS integration dashboard |

### 6.3. Distribution Channels

| Product | Channel |
|---------|---------|
| VSCode Extension | VSCode Marketplace (free) |
| Claude Code Plugin | npm package (free) |
| CLI Analyzer | npm / pip package (free) |
| Web GUI | Self-hosted domain (e.g., `vibecoding.dev`) + Stripe |
| B2B Education | Direct outreach / LemonSqueezy |

## 7. MVP Milestones

### Track A: VSCode Extension
1.  **Extension scaffold:** Set up VSCode Extension project with TypeScript, configure activation events and command palette.
2.  **X-Ray Viewer:** Implement hover/inline annotations that explain AI-generated code line-by-line.
3.  **Prompt Evaluator:** Integrate prompt scoring panel within the editor sidebar.

### Track B: Claude Code Plugin
1.  **Plugin scaffold:** Set up Claude Code plugin with hooks and skills structure.
2.  **X-Ray Skill:** Implement a `/xray` skill that analyzes the most recent AI-generated code block.
3.  **Debugging Dojo Skill:** Implement a `/dojo` skill that injects bugs into code for prompt-based fixing practice.

### Track C: CLI Post-Analysis Tool
1.  **Session parsers:** Implement JSONL parsers for Claude Code and Codex CLI session files with project-path matching.
2.  **Level 1 static analysis:** Generate prompt→code mapping reports, code structure trees, and change frequency heatmaps without AI model usage.
3.  **Level 2 AI-enhanced analysis:** Integrate optional user API key for X-Ray commentary, prompt improvement suggestions, and auto-generated Debugging Dojo problems.

### Shared Core
1.  **Monorepo setup:** Initialize TypeScript monorepo with shared `core` package.
2.  **Core engines:** Implement xray-parser, prompt-evaluator, debugging-dojo, and diff-analyzer as reusable modules.
3.  **Re-run Diff:** Add "Run Again" comparison feature within X-Ray Viewer across all tracks.
