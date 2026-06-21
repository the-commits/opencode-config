**Home > Agent Modes**

**Siblings:** [[Plugins|Plugins]], [[Semgrep-Recipes|Semgrep Recipes]], [[Skills-and-Tools|Skills & Tools]], [[MCP-Servers|MCP Servers]], [[Security-and-Hooks|Security & Hooks]], [[Agent-Guidelines|Agent Guidelines]]

---

# Agent Modes

The OpenCode configuration defines **7 agent modes**, each with carefully tuned temperature settings, permission constraints, and dedicated prompt files. The modes are configured in `opencode.jsonc` and loaded by the `mode` configuration section.

## Mode Comparison

| Mode | Model | Temperature | Write Access | Prompt File | Purpose |
|------|-------|-------------|-------------|-------------|---------|
| [[Agent-Modes#Scout|`scout`]] | `big-pickle` | 0.1 | Read-only (bash allowed) | `prompts/scout.txt` | Lightweight research & exploration |
| [[Agent-Modes#Brainstorm|`brainstorm`]] | `gemini-3.1-pro-preview` | 0.5 | Read-only | `prompts/brainstorm.txt` | Creative ideation |
| [[Agent-Modes#Plan|`plan`]] | `gemini-3.1-pro-preview` | 0.1 | Read-only | Default | Planning & analysis |
| [[Agent-Modes#Analyze|`analyze`]] | `gemini-3.1-pro-preview` | 0.1 | Read-only | `prompts/analysis.txt` | Deep code analysis |
| [[Agent-Modes#Build|`build`]] | `gemini-3-pro-preview` | 0.0 | Full | `prompts/build.txt` | Orchestrator mode |
| [[Agent-Modes#Build-Lite|`build-lite`]] | `gemini-3-flash-preview` | 0.0 | Full | `prompts/build-lite.txt` | Fast small tasks |
| [[Agent-Modes#Build-Meticulous|`build-meticulous`]] | `glm-5.2` | 0.0 | Full | `prompts/build-meticulous.txt` | Structured rigorous builds |

## Scout

**Model:** `opencode/big-pickle` | **Temperature:** 0.1 | **Steps:** 10 | `top_k`: 30

The default mode. A lightweight research and exploration agent designed for quick, focused fact-finding. It has `websearch_cited` and Chrome DevTools for fetching and browsing information. It is capped at 10 agentic steps to keep sessions short, and runs at temperature 0.1 with `top_k: 30` for factual outputs.

- Can run bash commands (man pages, read-only checks) but cannot edit or write files
- Ideal for: answering questions, researching topics, reading documentation

## Brainstorm

**Model:** `gemini-3.1-pro-preview` | **Temperature:** 0.5

A creative mode with higher temperature for generating diverse ideas. Uses a dedicated prompt at `prompts/brainstorm.txt`.

- Read-only (denies bash, edit, write)
- Ideal for: creative problem-solving, generating multiple solutions, exploring alternatives

## Plan

**Model:** `gemini-3.1-pro-preview` | **Temperature:** 0.1

A structured planning mode with low temperature for focused analysis. Uses the default prompt (no custom prompt file).

- Read-only (denies bash, edit, write)
- Ideal for: thinking through implementation before acting, reading files, understanding codebase structure

## Analyze

**Model:** `gemini-3.1-pro-preview` | **Temperature:** 0.1

A deep analysis mode with high thinking level enabled. Uses a dedicated prompt at `prompts/analysis.txt`. Configured with:

```json
{
  "options": {
    "thinkingConfig": {
      "thinkingLevel": "high",
      "includeThoughts": true
    }
  }
}
```

- Read-only (denies bash, edit, write)
- Includes the thinking process in the output for transparency
- Ideal for: code review, security analysis, root cause analysis

## Build

**Model:** `gemini-3-pro-preview` | **Temperature:** 0.0

The orchestrator mode. It can build anything, but splits work into XS sub-tasks and delegates implementation to [[Agent-Modes#Build-Lite|build-lite]] sub-agents.

- Full write access (bash, edit, write all allowed)
- Uses `prompts/build.txt` for instructions
- Ideal for: implementation of S-sized features, orchestrating parallel sub-tasks

## Build-Lite

**Model:** `gemini-3-flash-preview` | **Temperature:** 0.0

A lightweight build mode for small (XS) tasks. Uses a fast flash model for quick, low-overhead implementation.

- Full write access
- Uses `prompts/build-lite.txt` for instructions
- Ideal for: trivial changes, single-file edits, quick fixes

## Build-Meticulous

**Model:** `glm-5.2` | **Temperature:** 0.0

A structured build mode with a five-phase workflow: Understand, Design, Decompose, Implement, Verify. Enforces TDD (red-green-refactor), deep observability via MCP tooling (Semgrep, Chrome DevTools, Xdebug), and ruthless self-review with profiling.

- Full write access
- Uses `prompts/build-meticulous.txt` for instructions
- Orchestrates implementation through subagent escalation: build-lite (1-3 loops) > build (1-3 loops) > self
- Ideal for: complex multi-step features, security-sensitive changes, refactoring

### Mode Switching

The configuration defines explicit `permission` blocks for read-only modes:

```jsonc
"permission": {
  "bash": "deny",
  "edit": "deny",
  "write": "deny"
}
```

Modes with full access (build, build-lite, build-meticulous) have no `permission` block, inheriting the default full access. The `scout` mode permits `bash` but denies `edit` and `write`.

All modes have access to all MCP tools (Semgrep, Chrome DevTools, `websearch_cited`).
