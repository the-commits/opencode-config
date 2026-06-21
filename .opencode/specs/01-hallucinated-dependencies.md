# Feature: Hallucinated Dependency Protection

**Source:** OWASP Secure Coding with AI Cheat Sheet — Section 1
**Reference:** https://cheatsheetseries.owasp.org/cheatsheets/Secure_Coding_with_AI_Cheat_Sheet.html#section-1-hallucinated-dependencies

## Problem

AI coding assistants frequently suggest package names that do not exist on public registries. Attackers monitor these hallucinated names and register malicious packages with matching names (AI-assisted typosquatting). The agent could be instructed to `npm install` a hallucinated package, and a pre-existing attacker package with that name gets installed.

## User Story

As a developer using opencode-config, I want a pre-install hook that verifies AI-suggested packages exist on the registry and meet minimum age/trust criteria, so that hallucinated dependencies are never installed.

## Acceptance Criteria

### Pre-Install Verification Hook
- Given the agent runs `npm install <package>`, when the package name matches known hallucination patterns (unusual name, close to a known package), then the hook queries the npm registry API to verify the package exists with a minimum age (>30 days) and minimum download count.
- Given the agent runs `pip install <package>`, when the package is not on the project's allowlist, then the hook checks PyPI for existence, creation date, and maintainer reputation.
- Given an install command for any supported ecosystem (composer, cargo, go, gem, nuget, etc.), when the package name is flagged, then the hook blocks the install and reports the risk to the user.

### Supply Chain Guard Integration
- Given the Supply Chain Guard plugin detects an install command, when no lockfile exists post-install, then the plugin checks whether each new package exists on its registry and records creation date and download count.
- Given a package fails the hallucination check, then the scan output includes a WARNING with the package name, registry response, and suggested alternative.

### CI Enforcement
- Given a PR adds a new dependency to `package.json`, when the dependency has fewer than 100 weekly downloads or was created less than 30 days ago, then the CI check fails with a hallucination risk warning.
- Given a developer manually overrides the block, when they push with `--no-verify`, then the override is logged to the audit trail.

## Implementation Notes

- Add a new module `plugins/supply-chain-guard/hallucination.ts` for registry lookup logic
- Extend `detection.ts` to extract package names from install commands
- Use npm registry API (`https://registry.npmjs.org/`) and PyPI JSON API (`https://pypi.org/pypi/<package>/json`) — no API key needed
- Cache registry responses for 1 hour to avoid rate limiting
- Show top 5 candidate package names when a hallucination is detected

## Definition of Done

- [ ] Pre-install hook blocks hallucinated packages across npm, pip, and at least 2 more ecosystems
- [ ] Supply Chain Guard reports hallucination findings in scan output
- [ ] CI check for new dependencies with low trust scores
- [ ] Override mechanism with audit logging
- [ ] Unit tests for registry lookup, pattern matching, and cache logic
- [ ] Wiki documentation updated
