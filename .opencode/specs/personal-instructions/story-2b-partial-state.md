# Story 2b: Partial state with per-item confirmation

## Story

As a startup plugin, I want to handle the partial state by listing only missing items and asking the user to confirm each fix individually, so existing correct content is never touched.

## Priority

Should have (can be deferred — Story 2a covers the common cases)

## Estimate

M — Enumerate missing items, per-item confirmation, no xdebug reference (xdebug is binary: present or absent)

## Acceptance Criteria

- **AC 2.3** — Partial state → plugin lists ONLY missing items and asks user to confirm each fix individually; agent does NOT modify any file that already passes its check
- **AC 2.5** — On confirmation, only missing items are added; existing correct content is never modified, reordered, or rewritten

## Implementation Notes

- This is the most complex story — no direct reference in the xdebug plugin (xdebug is binary: present or absent)
- Must enumerate which of the 4 checks failed
- Present missing items clearly to the user
- Handle per-item confirmation (user may accept some, decline others)
- Only apply fixes the user confirmed
- Never modify files that already pass their check
