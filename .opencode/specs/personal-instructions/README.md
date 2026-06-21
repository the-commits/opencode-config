# Feature: Per-Developer Personal Instructions per Project

## Problem

OpenCode currently supports two tiers of agent instructions:
1. **System-wide** (`~/.config/opencode/AGENTS.md`) — personal but global across all projects
2. **Project-wide** (`<project>/AGENTS.md`) — per-project but shared via Git with the whole team

There is no mechanism for an individual developer to have **personal, per-project** agent customizations that are not shared with teammates. A developer who wants to adapt agent behavior for a specific repo — in ways irrelevant to others — has no gitignored, automatically-discovered place to do so.

This feature adds a `.opencode/personal/` directory pattern, gitignored by default, that `/init` and a startup plugin set up deterministically and idempotently — modeled on the existing `plugins/php-tooling.ts` xdebug auto-configuration pattern.

## Architecture

```
<project>/
├── .opencode/
│   ├── opencode.jsonc          # instructions: [".opencode/personal/AGENTS.md"]
│   └── personal/
│       └── AGENTS.md           # gitignored, per-developer, not shared
├── .gitignore                  # contains ".opencode/personal/*"
└── AGENTS.md                   # one-line note about personal instructions
```

**Detection** uses Node.js `fs` operations only (no shell commands) — cross-platform by design, works on Windows without WSL.

**State machine** (deterministic, mirrors xdebug plugin):
- All 4 checks pass → log "already configured", skip
- All 4 checks fail → prompt user for full setup
- Partial → list only missing items, ask for per-item confirmation

## Story Index

| # | Story | Priority | Estimate | File |
|---|-------|----------|----------|------|
| 1 | Detection via Node.js `fs` (cross-platform) | Must have | S | [story-1-detection.md](story-1-detection.md) |
| 2a | All-or-none state machine | Must have | S | [story-2a-state-machine.md](story-2a-state-machine.md) |
| 2b | Partial state with per-item confirmation | Should have | M | [story-2b-partial-state.md](story-2b-partial-state.md) |
| 3a | Create personal file + wire opencode.jsonc | Must have | S | [story-3a-create-file-config.md](story-3a-create-file-config.md) |
| 3b | Update .gitignore + AGENTS.md one-liner | Must have | S | [story-3b-gitignore-agents-note.md](story-3b-gitignore-agents-note.md) |
| 4 | `/init` integration | Must have | M | [story-4-init-integration.md](story-4-init-integration.md) |
| — | Idempotency (cross-cutting constraint) | Must have | — | [idempotency.md](idempotency.md) |
| — | Definition of Done | — | — | [definition-of-done.md](definition-of-done.md) |

**Total: ~2M + 4S = roughly 3-4 days focused work**

## Dependencies

```
Story 1 (detection) ─┬─→ Story 2a (state machine) ─┬─→ Story 3a (file + config) ─┐
                     │                              └─→ Story 3b (gitignore + note) ─┤
                     └─→ Story 2b (partial) ─────────────────────────────────────────┤
                                                                                    ↓
                                                                           Story 4 (/init)
```

## Suggested Implementation Order

1. Story 1 — detection internals + unit tests
2. Story 2a — simple state machine
3. Story 3a + 3b — scaffold creation
4. Story 4 — `/init` integration
5. Story 2b — partial state (enhancement, can be deferred)
