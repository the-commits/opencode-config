# Feature: Prompt-to-Code Supply Chain Risk Protection

**Source:** OWASP Secure Coding with AI Cheat Sheet — Section 10
**Reference:** https://cheatsheetseries.owasp.org/cheatsheets/Secure_Coding_with_AI_Cheat_Sheet.html#section-10-prompt-to-code-supply-chain-risk

## Problem

AI coding agents modify not just application code but also build scripts, CI/CD configurations, package scripts, and deployment infrastructure. Changes to these files execute automatically in trusted contexts with elevated privileges. An attacker who can influence prompts can inject malicious build/deploy steps.

## User Story

As a developer, I want build/config file changes flagged in CI with SHA pinning enforcement, so that prompt-to-code supply chain attacks are detected.

## Acceptance Criteria

### Build Script Change Detection
- Given a PR modifies any build/deploy/config file (`package.json` scripts section, `.github/workflows/*.yml`, `Dockerfile`, `Makefile`, `setup.py`/`pyproject.toml` build scripts, `go generate` directives), when CI runs, the check flags every modified build file with a specific annotation.
- Given a build file change adds network access, downloads external resources, or executes shell commands, when CI detects the new pattern, the check requires explicit human approval.
- Given a PR modifies `package.json` scripts, when `postinstall`, `preinstall`, `prepare`, or `prebuild` scripts are added or changed, CI blocks the PR pending security review.

### GitHub Actions SHA Pinning Enforcement
- Given a PR modifies `.github/workflows/*.yml`, when a third-party action is referenced by a mutable tag (`@v1`, `@v2`, `@main`, `@latest`), CI fails with a "Pin to commit SHA" error.
- Given a PR adds a new GitHub Action step, when the action is not on the approved actions allowlist, CI requires explicit approval.

### Pre-Push CI Config Check
- Given a developer runs `git push`, when the push modifies any CI/CD configuration (`.github/workflows/*`, `.gitlab-ci.yml`), the pre-push hook warns the user and requires confirmation.
- Given a push modifies both CI config and source code, when the CI config change expands permissions or adds new triggers, the pre-push hook blocks the push.

### Agent Awareness
- Given the agent edits a build/deploy file, when the edit is detected, the plugin warns the agent: "This file executes automatically with elevated privileges. All changes require human review."
- Given the agent adds a `postinstall` script, when the script downloads or executes external content, the plugin blocks the edit pending user approval.

## Implementation Notes

- Extend pre-push hook with a new CI/CD change detection stage
- GitHub Actions SHA pinning check: `scripts/check-actions-pinning.mjs`
- Build file patterns list (configurable in `opencode.jsonc` under `supplyChainGuard.buildFiles:`)
- Agent-side awareness via a `tool.execute.before` hook on `edit`/`write` for build files
- Reuse existing `SECURITY.md` and CODEOWNERS patterns for security-critical files

## Definition of Done

- [ ] Build script change detection with per-file annotations
- [ ] Network access/download pattern detection in build scripts
- [ ] GitHub Actions SHA pinning enforcement
- [ ] Pre-push CI config change warning
- [ ] Agent awareness of build file sensitivity
- [ ] Unit tests for build file detection, SHA pinning, and network pattern matching
- [ ] Wiki documentation updated
