# Feature: Human Accountability for AI-Generated Code

**Source:** OWASP Secure Coding with AI Cheat Sheet — Section 14
**Reference:** https://cheatsheetseries.owasp.org/cheatsheets/Secure_Coding_with_AI_Cheat_Sheet.html#section-14-human-accountability

## Problem

AI-generated code must have a human owner. Every AI-assisted change should be reviewed, approved, and attributable to a developer who is responsible for its security and maintainability. AI tools do not accept responsibility for the code they generate. The developer who accepts and commits the code does.

## User Story

As a developer, I want AI-generated code changes attributed and reviewed by a human before merge, with audit trails, so that human accountability is maintained.

## Acceptance Criteria

### AI-Generated Code Attribution
- Given a commit is created by an AI agent, when the commit is made, the commit message includes an `AI-generated:` footer with the AI tool name and model version.
- Given a PR contains AI-generated commits, when the PR is opened, a CI check verifies that every AI-generated commit has the `AI-generated:` footer and that the PR description includes a human attestation statement.

### Human Review Attestation
- Given a developer approves and merges an AI-generated PR, when the merge happens, the developer is prompted to confirm: "I have reviewed all changes in this PR and accept responsibility for their correctness and security."
- Given the developer confirms, when the merge completes, the merge commit includes a `Reviewed-by:` trailer with the developer's name and timestamp.
- Given the developer declines to confirm, when the merge is blocked, the PR remains open pending human review.

### Pre-Merge Checklist for AI-Generated PRs
- Given a PR is flagged as AI-generated, when the merge is attempted, the CI pipeline enforces a pre-merge checklist:
  - [ ] All changed files reviewed individually
  - [ ] No out-of-scope file modifications (see spec 07)
  - [ ] Tests verified as meaningful (see spec 08)
  - [ ] Dependency changes audited (see specs 01 and 02)
  - [ ] Build/config changes reviewed (see spec 10)
  - [ ] Rules file changes explicitly approved (see spec 06)
  - [ ] Human attestation provided

### Audit Trail
- Given a PR with AI-generated code is merged, when the merge completes, an audit entry is created with: PR number, AI tool name and version, human reviewer, files changed, review timestamp, and attestation status.
- Given a security incident is traced to an AI-generated change, when the audit trail is queried, the responsible human reviewer is identified from the merge commit trailers.

## Implementation Notes

- Pre-push commit message check: `scripts/check-commit-attribution.mjs`
- CI checklist enforcement in `.github/workflows/` — new workflow or extension of existing
- Merge commit trailer injection via GitHub Actions or merge queue hook
- Audit trail: GitHub commit history + optional external logging
- `opencode.jsonc` config: `accountability.toolName` and `accountability.modelVersion` for automatic attribution
- Extend the successful-editing plugin to add `AI-generated:` footer on agent commits

## Definition of Done

- [ ] AI-generated commit attribution via commit message footer
- [ ] CI verification of attribution footer on AI-generated PRs
- [ ] Human attestation prompt before merge with commit trailer
- [ ] Pre-merge checklist for AI-generated PRs
- [ ] Audit trail with human reviewer attribution
- [ ] Unit tests for commit message parsing, attestation flow, and audit logging
- [ ] Wiki documentation updated
