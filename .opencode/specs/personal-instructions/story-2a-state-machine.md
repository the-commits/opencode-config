# Story 2a: All-or-none state machine

## Story

As a startup plugin, I want to handle the two simple cases: all checks pass (skip) or all checks fail (prompt for full setup), so the common paths work first.

## Priority

Must have

## Estimate

S — Two branches, mirrors xdebug plugin patterns

## Acceptance Criteria

- **AC 2.1** — All 4 checks present → plugin logs "personal instructions already configured" and returns without prompting
- **AC 2.2** — All 4 checks absent → plugin prompts user via agent: "Set up personal per-developer instructions?" (yes/no)
- **AC 2.4** — User declines → no files modified, session continues normally

## Implementation Notes

- Uses the 4 detection checks from Story 1
- Plugin structure mirrors `plugins/php-tooling.ts`:
  - Log via `client.app.log` with `service: "personal-instructions"`
  - Prompt via `client.session.prompt` on `session.created` event
- The "all present" branch returns early with no event handler (like xdebug's "already configured" path)
- The "all absent" branch injects a prompt asking the user to opt in
- User decline = no reply action taken; session continues normally
