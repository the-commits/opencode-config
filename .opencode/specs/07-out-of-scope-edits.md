# Feature: Out-of-Scope Edit Detection and Review Anchoring Prevention

**Source:** OWASP Secure Coding with AI Cheat Sheet — Section 7
**Reference:** https://cheatsheetseries.owasp.org/cheatsheets/Secure_Coding_with_AI_Cheat_Sheet.html#section-7-out-of-scope-edits-and-review-anchoring

## Problem

Agents routinely touch files beyond the scope of the requested change: lockfiles, CI configurations, unrelated tests, formatting changes, and dependency updates. Reviewers anchored on the requested change miss these modifications. This is the most common review failure mode in agentic coding.

## User Story

As a developer, I want agent PR diffs flagged for out-of-scope file modifications (lockfiles, CI configs, tests), so that review anchoring failures are caught.

## Acceptance Criteria

### CI Diff Scope Check
- Given a PR is opened with agent-generated changes, when CI runs, it compares the changed files against the expected scope (derived from the PR title, description, or linked issue).
- Given files outside the expected scope are modified (lockfiles, CI configs, Dockerfiles, unrelated tests, formatting-only changes), when CI detects them, then each unexpected file is annotated on the PR with a WARNING and the reason it's flagged.
- Given lockfile changes are detected (`package-lock.json`, `yarn.lock`, etc.), when the agent was not asked to add/remove dependencies, then CI flags the change as potentially unintended.

### Sensitive File CODEOWNERS Enforcement
- Given a PR modifies a sensitive file (`.github/workflows/*`, `Dockerfile`, `.husky/*`, `scripts/*`, `secrets/*`), when the file is covered by CODEOWNERS, then CI requires a specific reviewer approval.
- Given a PR modifies multiple sensitive files, when each is in a different CODEOWNERS group, then all required reviewers must approve.

### Agent Diff Summary Tool
- Given the agent completes a set of edits, when the edits are presented to the user, then the output includes a categorized diff summary: "In scope changes", "Out of scope changes (flagged)", "Lockfile changes", "Config changes".
- Given the agent made out-of-scope changes, when the user reviews the summary, then each out-of-scope change requires explicit user confirmation before proceeding.

## Implementation Notes

- CI check script: `scripts/check-scope.mjs`
- Scope derivation heuristic: match PR title/description against changed file paths
- Sensitive file patterns configured in `opencode.jsonc` under `scopeGuard:` key
- Agent-side diff categorization in a new plugin or extension of the successful-editing plugin
- Reuse existing CODEOWNERS pattern

## Definition of Done

- [ ] CI scope check flags unexpected file modifications in PRs
- [ ] Sensitive file CODEOWNERS enforcement for CI/deploy/build configs
- [ ] Agent diff summary with categorized changes
- [ ] Out-of-scope changes require explicit user confirmation
- [ ] Unit tests for scope matching, sensitive file detection, and diff categorization
- [ ] Wiki documentation updated
