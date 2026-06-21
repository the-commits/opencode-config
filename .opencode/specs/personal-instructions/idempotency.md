# Idempotency (Cross-Cutting Constraint)

## Description

Idempotency is a non-functional requirement that applies to every story. Each story's acceptance criteria already include "no duplicate" checks and "never overwrite" guarantees. This file documents the cross-cutting idempotency acceptance criteria and the integration test.

## Acceptance Criteria

- **AC 5.1** — `opencode.jsonc` already containing `.opencode/personal/AGENTS.md` → `instructions` array not modified on re-run
- **AC 5.2** — `.gitignore` already containing `.opencode/personal/*` → not modified on re-run
- **AC 5.3** — `AGENTS.md` already containing the one-line note → not modified on re-run
- **AC 5.4** — Existing `.opencode/personal/AGENTS.md` with user content → NOT overwritten or modified on re-run
- **AC 5.5** — Fully configured project restarted 3x → no files modified, no prompts appear

## Integration Test

- E2E test at `tests/personal-instructions/` — run setup twice, assert:
  - No duplicate entries in `opencode.jsonc` `instructions` array
  - No duplicate lines in `.gitignore`
  - No duplicate notes in `AGENTS.md`
  - `.opencode/personal/AGENTS.md` content unchanged after second run
- Modeled on existing `tests/php-tooling/php-tooling.test.ts` structure
