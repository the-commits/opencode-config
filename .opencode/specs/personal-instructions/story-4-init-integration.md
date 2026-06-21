# Story 4: `/init` integration

## Story

As a developer running `/init`, I want the same deterministic detection and optional setup to run, so the experience is consistent whether I'm using the startup plugin or the `/init` command.

## Priority

Must have

## Estimate

M — Reuses detection logic from Story 1; wiring into built-in `/init` needs investigation

## Acceptance Criteria

- **AC 4.1** — Running `/init` triggers the same 4-check detection and state machine
- **AC 4.2** — Behavior is consistent: same prompt and setup flow whether via startup plugin or `/init`

## Implementation Notes

- `/init` is a built-in OpenCode command, not a custom command in this repo
- Investigation needed: how to hook into `/init` — likely via a plugin event hook rather than direct `/init` modification
- The detection logic is reused from Story 1 (same `lib/personal-instructions-internals.ts` functions)
- The setup logic is reused from Stories 3a + 3b
- The state machine is reused from Story 2a
- Goal: whether the user runs `/init` or just starts OpenCode, the same detection + prompt + setup flow is available
