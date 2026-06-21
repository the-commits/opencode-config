# Story 1: Detection via Node.js `fs` (cross-platform)

## Story

As a startup plugin, I want to use Node.js `fs` operations (`existsSync`, `readFileSync` + string matching) to check if `.opencode/personal/AGENTS.md` exists, if `opencode.jsonc` references it, if `.gitignore` covers it, and if `AGENTS.md` mentions it — so detection is deterministic and works on Windows, macOS, and Linux without OS-specific commands.

## Priority

Must have

## Estimate

S — 4 simple `fs` checks, modeled on `php-tooling-internals.ts`

## Acceptance Criteria

- **AC 1.1** — `fs.existsSync(".opencode/personal/AGENTS.md")` returns false when absent; plugin reports "personal instructions file: absent"
- **AC 1.2** — `fs.readFileSync` on `opencode.jsonc` + string search for `.opencode/personal/AGENTS.md` reports "instructions reference: absent" when not in the `instructions` array
- **AC 1.3** — `fs.readFileSync` on `.gitignore` + line-by-line search for `.opencode/personal/*` reports "gitignore coverage: absent" when not present
- **AC 1.4** — `fs.readFileSync` on `AGENTS.md` + string search for `.opencode/personal/AGENTS.md` reports "AGENTS.md note: absent" when not present
- **AC 1.5** — On Windows without WSL (no `grep`/`find`/`findstr`), detection succeeds using only Node.js `fs` — no shell commands spawned

## Implementation Notes

- Extract detection functions to `lib/personal-instructions-internals.ts` (mirrors `lib/php-tooling-internals.ts` pattern — testable without plugin export issues)
- Use `fs.existsSync`, `fs.readFileSync` + string matching — no `child_process`, no `execSync`, no shell spawning
- Handle JSONC comments when reading `opencode.jsonc` (strip `//` lines before string search, same as `hasXdebugMcp` does)
- Unit tests at `tests/personal-instructions/personal-instructions.test.ts` using `bun:test` with `tmpDir` setup/teardown
