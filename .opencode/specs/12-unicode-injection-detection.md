# Feature: Markdown, Link, and Unicode Injection Detection

**Source:** OWASP Secure Coding with AI Cheat Sheet — Section 12
**Reference:** https://cheatsheetseries.owasp.org/cheatsheets/Secure_Coding_with_AI_Cheat_Sheet.html#section-12-markdown-link-and-unicode-injection

## Problem

Agent output rendered in IDE chat panes, PR comments, or review interfaces can contain Markdown-based exfiltration links, bidi (bidirectional) text overrides, and zero-width characters that influence future agent behaviour or mislead reviewers.

## User Story

As a developer, I want CI checks that detect bidi characters, zero-width unicode, and markdown exfiltration links in agent output, so that unicode injection is caught.

## Acceptance Criteria

### Unicode Safety Check
- Given a PR is opened, when CI runs, a check scans all changed files for bidi override characters (U+202A through U+202E, U+2066 through U+2069), zero-width characters (U+200B, U+200C, U+200D, U+FEFF), and homoglyph characters.
- Given bidi or zero-width characters are found, when CI detects them, the check fails with the exact file, line, column, and Unicode code point for each match.
- Given a file contains homoglyph characters that differ from the expected ASCII equivalents, when CI runs, the check flags them as potential injection attempts.

### Markdown Exfiltration Detection
- Given a PR modifies markdown files, commit messages, or PR descriptions, when the content contains Markdown image tags with external URLs (`![alt](http://... )`), the check flags each image URL as a potential exfiltration vector.
- Given a PR contains hidden Markdown links (zero-width link text, transparent images, tracking pixels), when CI detects them, the check fails and displays the hidden content.

### Pre-Commit Agent Output Sanitization
- Given the agent generates output (PR description, commit message, code comment), when the output contains unicode injection characters, the plugin sanitizes them (replaces with safe alternatives or strips them) before the output is committed.
- Given the agent writes code containing bidi characters that could mislead reviewers (e.g., a comment that appears to end a block but doesn't), when detected, the plugin warns the agent and the user.

### CI Pre-Push Hook Integration
- Given a developer runs `git push`, when the pre-push hook detects unicode injection characters in any staged file, the push is blocked with a detailed report of the findings.
- Given the pre-push hook finds markdown exfiltration URLs in files or commit messages, when detected, the push is blocked.

## Implementation Notes

- CI check script: `scripts/check-unicode.mjs`
- Unicode character detection: use regex character classes for bidi and zero-width ranges
- Markdown parsing for image/link extraction: simple regex or `marked` library
- Pre-push hook stage added after secret scanning
- Agent-side sanitization as a `tool.execute.after` hook on `write`/`edit` tools
- Reuse the pattern from the existing pre-push secret scanning for file iteration

## Definition of Done

- [ ] Unicode safety check for bidi and zero-width characters in CI
- [ ] Markdown exfiltration link detection in CI
- [ ] Pre-commit agent output sanitization
- [ ] Pre-push hook integration with block on unicode injection
- [ ] Unit tests for unicode detection, markdown parsing, and sanitization
- [ ] Wiki documentation updated
