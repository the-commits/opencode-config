# Story 3b: Update .gitignore + AGENTS.md one-liner

## Story

As an AI agent with user approval, I want to add `.opencode/personal/*` to `.gitignore` and add the one-line note to `AGENTS.md` (creating either if needed), so the personal file is gitignored and the architecture is documented.

## Priority

Must have

## Estimate

S — Two text file appends with dedup checks

## Acceptance Criteria

- **AC 3.4** — On approval, `.opencode/personal/*` is appended to `.gitignore` on a new line; if `.gitignore` doesn't exist, it is created
- **AC 3.5** — On approval, the following one-liner is added to `AGENTS.md` without duplicating an existing note:
  ```markdown
  > **Personal instructions:** Per-developer overrides can be placed in `.opencode/personal/AGENTS.md` (gitignored, not shared with the team).
  ```
- **AC 3.6** — If `AGENTS.md` doesn't exist, it is created with the one-line note

## Implementation Notes

- Append functions go in `lib/personal-instructions-internals.ts`
- `.gitignore` dedup: read file, search line-by-line for `.opencode/personal/*`, append only if not found
- `AGENTS.md` dedup: read file, search for `.opencode/personal/AGENTS.md` string, append only if not found
- When creating `.gitignore` or `AGENTS.md` from scratch, write the content directly (no append needed)
- Ensure trailing newline on appended content
