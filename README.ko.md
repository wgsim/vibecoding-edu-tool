<div align="center">

<img src="docs/assets/banner.png" alt="VibeCoding Edu Tool Banner" width="800">

# 🚀 VibeCoding Edu Tool

**AI 코딩(Vibe Coding)을 넘어, 코드를 완벽하게 이해하고 통제하는 힘**<br>
AI가 생성한 코드의 '블랙박스'를 해체하고, 전통적인 소프트웨어 엔지니어링 관점에서 코드를 분석·학습하는 도구입니다.

[English](README.md) | [한국어](README.ko.md)

[![VSCode Extension](https://img.shields.io/badge/VSCode-Extension-blue)](https://github.com/woogwangsim/vibecoding_edu_tool_for_child/tree/main/packages/vscode-extension)
[![Claude Code Plugin](https://img.shields.io/badge/Claude_Code-Plugin-orange)](https://github.com/woogwangsim/vibecoding_edu_tool_for_child/tree/main/packages/claude-code-plugin)
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)

</div>

---

## 💡 Vibe Coding, 편하지만 불안하지 않으신가요?

최근 AI를 활용해 프롬프트만으로 코딩하는 'Vibe Coding'이 트렌드입니다. 비개발자도 쉽게 결과물을 만들 수 있고, 개발자의 생산성도 극대화됩니다. 

하지만 치명적인 단점이 있습니다.
* **비개발자:** *"원하는 대로 동작은 하는데, 코드가 어떻게 돌아가는지 전혀 몰라 불안합니다. 나중에 고장 나면 어쩌죠?"*
* **개발자:** *"AI가 짠 코드가 우리 프로젝트의 컨벤션이나 전통적인 아키텍처 원칙에 맞는지 리뷰하기가 너무 벅찹니다."*

**VibeCoding Edu Tool**은 이 간극을 메웁니다. AI가 짜준 코드를 분석(Analyze)하고, 해설(X-Ray)하며, 더 나아가 예상치 못한 버그에 대처하는 훈련(Dojo)을 제공합니다.

## ✨ 핵심 기능 (Features)

### 1. 🔍 Code X-Ray (코드 심층 분석)
AI가 작성한 코드의 핵심 로직을 한 줄 한 줄 뜯어봅니다. 단순히 주석을 다는 수준을 넘어, 전통적인 소프트웨어 엔지니어링 관점(아키텍처, 성능, 보안)에서 코드가 왜 이렇게 작성되었는지 해설합니다. 비개발자는 원리를 이해하고, 개발자는 코드 리뷰 시간을 단축할 수 있습니다.

<img src="docs/assets/xray.png" alt="Code X-Ray Demo" width="700">

### 2. 🥋 Debugging Dojo (디버깅 도장)
"AI가 짠 코드에서 에러가 발생했다!" 실제 프로젝트 코드에 의도적으로 버그를 주입(Inject)하고, 이를 해결하는 연습을 제공합니다. 에러 메시지를 보고 AI에게 '정확하게 질문하는 법(프롬프팅)'과 '스스로 문제를 추적하는 감각'을 훈련합니다.

<img src="docs/assets/dojo.png" alt="Debugging Dojo Demo" width="700">

### 3. 📊 AI Session Analyzer (AI 대화 기록 분석기)
Claude Code, Codex CLI 등에서 AI와 나눈 대화 기록(Session)을 정적 분석합니다. 어떤 프롬프트 패턴이 효과적이었는지, AI가 반복적으로 실수하는 지점은 어디인지 리포트를 생성하여, 당신의 Vibe Coding 스킬 자체를 한 단계 업그레이드해 줍니다.

<img src="docs/assets/analyzer.png" alt="Session Analyzer Demo" width="700">

---

## 🚀 시작하기 (Quick Start)

사용하시는 환경에 맞춰 도구를 선택하세요.

### 🛠 Track A: Claude Code Plugin (가장 빠름)
Claude Code 사용자라면 플러그인으로 즉시 기능을 사용할 수 있습니다.

```bash
# 로컬 설치 스크립트 실행
git clone https://github.com/woogwangsim/vibecoding_edu_tool_for_child.git
cd vibecoding_edu_tool_for_child
bash packages/claude-code-plugin/install.sh
```
> 설치 후 Claude Code에서 다음 스킬을 사용할 수 있습니다:
> - `/vibecoding-edu:xray` : 현재 코드 분석
> - `/vibecoding-edu:dojo` : 디버깅 훈련 시작
> - `/vibecoding-edu:analyze` : AI 세션 기록 분석

### 💻 Track B: VSCode Extension (UI 기반)
코드를 직접 보면서 시각적인 분석 결과를 얻고 싶다면 추천합니다.
1. `pnpm install && pnpm --filter vscode-extension build && pnpm --filter vscode-extension package` 실행
2. 생성된 `.vsix` 파일을 VSCode에 설치
3. `Cmd + Shift + P` ➔ `VibeCoding: Start Analysis` 실행

### 🧰 Track C: CLI Analyzer (터미널 단독 사용)
CI/CD 파이프라인이나 로컬 환경에서 AI 세션 기록만 빠르게 분석하고 싶을 때 사용합니다.
```bash
pnpm install
pnpm --filter cli-analyzer build

# 현재 프로젝트의 AI 세션 분석
node packages/cli-analyzer/dist/cli.js analyze .
```

---

## 📦 지원하는 AI 툴 환경

AI와의 대화 기록을 분석하기 위해 현재 다음 도구들의 로컬 세션 파일을 지원합니다:
- **Claude Code** (`~/.claude/projects/`)
- **Codex CLI** (`~/.codex/sessions/`)

---

## 👨‍💻 기여하기 (Contributing)

이 프로젝트는 Monorepo(pnpm) 기반으로 개발되었습니다. 버그 리포트, 기능 제안, PR 모두 환영합니다!

<details>
<summary><b>로컬 개발 환경 세팅 (클릭해서 펼치기)</b></summary>

### Prerequisites
- Node.js 18+
- pnpm

### Build Instructions
```bash
git clone https://github.com/woogwangsim/vibecoding_edu_tool_for_child.git
cd vibecoding_edu_tool_for_child
pnpm install
pnpm build   # 모든 패키지 동시 빌드
```

### Repository Structure
- `packages/core`: 핵심 세션 파서 및 정적 분석 엔진
- `packages/cli-analyzer`: CLI 툴 (`vibecoding analyze`)
- `packages/vscode-extension`: VSCode 익스텐션 (esbuild 사용)
- `packages/claude-code-plugin`: Claude Code 스킬 플러그인
</details>

---

## 📝 License
This project is licensed under the GNU Affero General Public License v3.0 - see the [LICENSE](LICENSE) file for details.