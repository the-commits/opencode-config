# Feature: Rules Files and Persistent Steering Protection

**Source:** OWASP Secure Coding with AI Cheat Sheet — Section 6
**Reference:** https://cheatsheetseries.owasp.org/cheatsheets/Secure_Coding_with_AI_Cheat_Sheet.html#section-6-rules-files-and-persistent-steering

## Problem

AI coding tools read configuration files that steer their behaviour across all future interactions. These files are a persistence mechanism — an attacker who can modify them controls every subsequent generation. Affected files include `.cursorrules`, `CLAUDE.md`, `AGENTS.md`, `.github/copilot-instructions.md`, `.windsurfrules`, `.aider.conf.yml`, and custom prompt files.

## User Story

As a developer, I want rules files (AGENTS.md, .cursorrules, etc.) monitored for unauthorized changes in PRs, so that persistent steering by attackers is prevented.

## Acceptance Criteria

### Pre-Push Rules File Check
- Given a developer runs `git push`, when the pre-push hook detects changes to any known rules file (`AGENTS.md`, `CLAUDE.md`, `.cursorrules`, `.github/copilot-instructions.md`, `.windsurfrules`, `.aider.conf.yml`), then the push is blocked and the developer is prompted to confirm the change.
- Given the pre-push hook detects a new rules file was created, when it matches a known rules file pattern, then the push is blocked for review.

### Agent Self-Modification Prevention
- Given the agent tries to edit a rules file, when the file is on the protected list, then the plugin blocks the edit and notifies the user.
- Given the agent tries to create a new rules file, when the filename matches known patterns, then the plugin prompts for explicit user approval.

### Rules File Audit Command
- Given a developer runs `/audit-rules`, when the command executes, then all known rules files in the project are listed with their current content hash, last modification time, and last modifier.
- Given any rules file content differs from its baseline hash, when the audit runs, then the difference is highlighted.

### CI Rules File Change Detection
- Given a PR modifies a rules file, when CI runs, then a specific annotation flags the change and requires a reviewer from a security team (CODEOWNERS).
- Given a PR from an external contributor adds or modifies a rules file, when CI detects it, then the PR is automatically blocked from merging.

## Implementation Notes

- Extend `.husky/pre-push` with a new stage between dependency verification and unit tests
- New plugin: `plugins/rules-file-guard.ts`
- Known rules file patterns list (configurable in `opencode.jsonc` or a dedicated config)
- Agent-side protection hooks into `tool.execute.before` for `edit` and `write` tools
- Use git hashes for baseline comparison
- Add CODEOWNERS entry for rules files if not already present

## Definition of Done

- [ ] Pre-push hook blocks unauthorized rules file changes
- [ ] Agent blocked from self-modifying rules files without user approval
- [ ] `/audit-rules` command available with hash comparison
- [ ] CI detects rules file changes in PRs with CODEOWNERS enforcement
- [ ] Unit tests for rules file detection, hash comparison, and hook integration
- [ ] Wiki documentation updated
