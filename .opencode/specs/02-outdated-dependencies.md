# Feature: Outdated Dependency CVE Auditing

**Source:** OWASP Secure Coding with AI Cheat Sheet — Section 2
**Reference:** https://cheatsheetseries.owasp.org/cheatsheets/Secure_Coding_with_AI_Cheat_Sheet.html#section-2-outdated-dependencies-with-known-cves

## Problem

AI models are trained on historical code and frequently suggest dependency versions that were current during training but now have known vulnerabilities. The AI may not know about CVEs published after its training cutoff or after the coding tool's last security-index update.

## User Story

As a developer, I want automated CVE auditing on every AI-generated dependency list before merging, so that outdated dependencies with known vulnerabilities are caught before they reach production.

## Acceptance Criteria

### Post-Install CVE Scan
- Given the Supply Chain Guard runs after an install, when new dependencies are detected, then each dependency version is cross-referenced against the GitHub Advisory Database and OSV (osv.dev).
- Given a dependency has a known CVE, then the scan output includes the CVE ID, severity, CVSS score, and suggested fixed version.
- Given multiple CVEs exist for the same dependency, then all are reported in a grouped summary with the highest severity first.

### CI Pipeline Integration
- Given a PR introduces or modifies a dependency version, when that version has any CRITICAL or HIGH severity CVE, then CI fails the build.
- Given a dependency has MEDIUM or LOW severity CVEs, then CI passes but generates a warning annotation on the PR.
- Given a developer explicitly accepts a known CVE (with documented justification), when they add an override to `.trivyignore` or equivalent, then CI respects the override.

### Pre-Merge Dependency Audit Command
- Given a developer runs `/audit-deps`, when the command executes, then all project dependencies are checked against vulnerability databases and a summary report is output.
- Given the audit finds no new vulnerabilities, when the report is generated, then it shows the last audit timestamp and "0 new vulnerabilities" with the total dependency count.

## Implementation Notes

- Add OSV API integration (`https://api.osv.dev/v1/query`) — no API key needed, supports bulk queries
- Extend the Supply Chain Guard scanner to make advisory DB queries after semgrep scans
- Reuse the existing `.trivyignore` mechanism for accepted vulnerability overrides
- Add a `commands/audit.md` slash command for `/audit-deps`

## Definition of Done

- [ ] Post-install CVE check integrated into Supply Chain Guard
- [ ] CI blocks on CRITICAL/HIGH CVEs
- [ ] `.trivyignore` override mechanism works
- [ ] `/audit-deps` command available
- [ ] Unit tests for OSV API integration and CVE reporting
- [ ] Wiki documentation updated
