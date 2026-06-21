**Home > Agent Guidelines**

**Siblings:** [[Plugins|Plugins]], [[Semgrep-Recipes|Semgrep Recipes]], [[Agent-Modes|Agent Modes]], [[Skills-and-Tools|Skills & Tools]], [[MCP-Servers|MCP Servers]], [[Security-and-Hooks|Security & Hooks]]

---

# Agent Guidelines

**File:** `AGENTS.md`

## Light

The system-wide instructions for AI coding agents. These guidelines ensure agents produce consistent, maintainable, and secure code. They cover everything from code reuse and naming conventions to security protocols and mode-specific behavior.

## Nitty-Gritty -- Philosophy

The `AGENTS.md` is the global agent instructions template that ships with opencode-config. It is referenced by every OpenCode project via the `instructions` array in `opencode.jsonc`. These guidelines apply to all projects unless overridden by a project-specific `AGENTS.md`.

### Core Principles

**Code Quality:** Write clean, maintainable code. Prioritize readability over cleverness. Follow the principle of least surprise -- code should behave as a reader would reasonably expect.

**Reuse Before Writing:** Before writing new code, exhaust existing solutions in this order:
1. **DRY** -- Check if the logic already exists in the codebase. Reuse or extend it.
2. **Libraries and frameworks** -- Know the imported dependencies and the current framework. Use their built-in utilities, helpers, and patterns before rolling your own.
3. **Project conventions** -- Follow established patterns in the codebase for similar problems.
4. **Only then write new code** -- If no existing solution applies, implement it yourself.

**Minimal Changes:** Make focused, incremental changes. Avoid large refactors unless explicitly requested. One logical change per commit. Small changes are easier to review, test, and revert if needed.

**Testing (TDD):** Follow Test-Driven Development (red-green-refactor) when working with application code in languages and frameworks that have a standard test runner.

Skip TDD for infrastructure and operations work: Ansible playbooks, Terraform/HCL, Dockerfiles, CI/CD workflows, shell scripts, config files, and other declarative or glue-code artifacts.

**Single Responsibility Principle (SRP):** Every module, class, and function must have exactly one reason to change. Functions should do one thing and do it well. Classes/modules should encapsulate a single concern.

**Small Files and Scopes:** Prefer many small, focused files over few large ones. Keep functions under ~20-30 lines. Keep files under ~200-300 lines. Limit nesting depth -- use early returns, guard clauses, and extraction.

**Error Handling:** Throw descriptive errors that explain what went wrong and why. Include relevant values in error messages. Never silently fail or return unexpected values.

**Comments:** Comments are a sign of bad naming. If you feel the need to explain what code does, rename variables, functions, and types until the code explains itself. Only add a comment when naming alone cannot convey intent.

**Naming:** Be descriptive and consistent. Use clear names that convey intent. Follow language-specific conventions: PascalCase for types, camelCase for variables/functions/properties, UPPER_SNAKE_CASE for constants.

**Code Style:** Follow the project's existing style. Read nearby files before editing to identify established conventions. Match indentation, semicolon usage, quote style, brace placement.

### Mode-Specific Guidelines

Each mode has specific behavior and constraints:

| Mode | Temperature | Write Access | Purpose |
|------|-------------|-------------|---------|
| **Analyze** | 0.1 | Read-only | Follow analysis frameworks, dissect components, contextualize |
| **Build** | 0.0 | Full | Focus on correctness and efficiency |
| **Build-Lite** | 0.0 | Full | Lightweight for small (XS) tasks |
| **Build-Meticulous** | 0.0 | Full | 5-phase structured workflow (understand, design, decompose, implement, verify) |
| **Plan** | 0.1 | Read-only | Think through implementation before acting |
| **Brainstorm** | 0.7 | Read-only | Suspend judgment, generate ideas, cross-pollinate |

### Security Protocol

When first working with a project that has `node_modules` (or equivalent dependency directory), run:

```
semgrep --config ~/.config/opencode/semgrep/recipes/ --no-git-ignore --exclude='!node_modules' node_modules/
```

This audits dependencies for supply chain backdoors and inventories outbound network calls.

### Communication

Be concise and direct. Answer questions directly without unnecessary preamble. Use the appropriate verbosity for the task -- brief for simple answers, thorough for complex explanations.

### Git Remotes

- **Never push without asking.** Always get explicit confirmation before pushing to any remote.
- **Never push to forks directly.** Forks should only receive changes by syncing from upstream.
