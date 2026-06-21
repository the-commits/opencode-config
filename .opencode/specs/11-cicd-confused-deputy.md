# Feature: CI/CD Agents and Confused Deputy Prevention

**Source:** OWASP Secure Coding with AI Cheat Sheet — Section 11
**Reference:** https://cheatsheetseries.owasp.org/cheatsheets/Secure_Coding_with_AI_Cheat_Sheet.html#section-11-cicd-agents-and-confused-deputy-risk

## Problem

AI-powered CI/CD agents (review bots, automated code fixers, PR assistants) run on PR events with access to org secrets, deployment credentials, and write access to the repository. A malicious PR can manipulate the CI agent into exfiltrating secrets or modifying the pipeline.

## User Story

As a developer, I want CI agent credentials scoped to minimum permissions and PR content sanitized before agent processing, so that confused deputy attacks are prevented.

## Acceptance Criteria

### CI Agent Credential Scoping
- Given a CI/CD agent runs on a PR event, when the agent is configured in `.github/workflows/*.yml`, the workflow uses the minimum required `permissions:` block (no `write-all`, explicit scope per job).
- Given a CI agent needs repository write access, when it's triggered by a PR from a fork or external contributor, the workflow restricts write access to creating PR comments only (not pushing commits or modifying workflows).

### PR Content Sanitization for CI Agents
- Given a CI agent processes PR content (title, body, comments), when the content contains injection patterns (base64, hidden instructions, URL exfiltration attempts), the sanitization step strips or flags them before passing to the agent.
- Given a PR from an external contributor triggers a CI agent, when the agent has access to any secrets, the workflow step sanitizes all PR-provided context before the agent processes it.

### CI Agent Action Logging
- Given a CI agent takes an action (comment, commit, approval, label), when the action is executed, a full audit log entry is created with: agent name, PR number, action type, timestamp, and the context that triggered the action.
- Given a CI agent makes unexpected file modifications or network calls, when the action is logged, the monitoring system alerts the repository admin.

### Approval Gates
- Given a CI agent wants to push a commit to a PR, when the push is attempted, the CI pipeline requires a human approval step before the push proceeds.
- Given a CI agent wants to modify workflow files, when the modification is detected, the action is blocked regardless of the agent's permissions.

## Implementation Notes

- GitHub Actions workflow templates in `.github/workflows/` that follow least-privilege patterns
- PR content sanitization script: `scripts/sanitize-pr-context.mjs`
- Audit log destination: GitHub Actions workflow run logs + optional external SIEM
- Approval gates via GitHub Environments or `workflow_dispatch` with `inputs`
- Document CI agent security patterns in a new wiki page: "CI/CD Agent Security"

## Definition of Done

- [ ] All CI workflows use minimum `permissions:` blocks
- [ ] PR content sanitization for injection patterns before agent processing
- [ ] CI agent action audit logging with full context
- [ ] Approval gates for agent push and workflow modification actions
- [ ] Wiki documentation with CI/CD agent security patterns
- [ ] Unit tests for PR content sanitization patterns
