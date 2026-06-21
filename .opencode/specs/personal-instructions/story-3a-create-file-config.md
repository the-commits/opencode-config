# Story 3a: Create personal file + wire opencode.jsonc

## Story

As an AI agent who receives user approval, I want to create `.opencode/personal/AGENTS.md` (info alert only) and add the `instructions` reference to `opencode.jsonc` (creating it if needed), so the personal file is loaded by OpenCode.

## Priority

Must have

## Estimate

S — File creation + JSONC append with dedup, modeled on `createConfigWithXdebug`

## Acceptance Criteria

- **AC 3.1** — On approval, `.opencode/personal/AGENTS.md` is created with info alert only (no template scaffolding):
  ```markdown
  # Personal Agent Instructions

  > This file is for your personal, per-project agent instructions.
  > It is gitignored and not shared with your team.
  > Add any agent customizations specific to you and this project below.
  ```
- **AC 3.2** — On approval, `opencode.jsonc` `instructions` array includes `.opencode/personal/AGENTS.md` without duplicating an existing entry
- **AC 3.3** — If no `opencode.jsonc` or `opencode.json` exists, a new `opencode.jsonc` is created with the `instructions` array containing `.opencode/personal/AGENTS.md`

## Implementation Notes

- File creation functions go in `lib/personal-instructions-internals.ts` (mirrors `createConfigWithXdebug` and `addXdebugToConfig`)
- Create `.opencode/personal/` directory with `fs.mkdirSync(..., { recursive: true })`
- When adding to existing `opencode.jsonc`, strip JSONC comments, parse, append to `instructions` array (create array if missing), write back
- Dedup check: search existing `instructions` array for `.opencode/personal/AGENTS.md` before adding
