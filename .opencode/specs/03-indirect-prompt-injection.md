# Feature: Indirect Prompt Injection Protection

**Source:** OWASP Secure Coding with AI Cheat Sheet — Section 3
**Reference:** https://cheatsheetseries.owasp.org/cheatsheets/Secure_Coding_with_AI_Cheat_Sheet.html#section-3-indirect-prompt-injection-in-the-development-loop

## Problem

Agentic coding tools ingest context from the repository, the network, and connected tools. Any content the agent reads can contain hidden instructions that alter its behaviour. Attack vectors include issue bodies, PR descriptions, README files, dependency changelogs, error traces, and fetched web pages.

## User Story

As a developer, I want repository content (issues, PRs, READMEs) sanitized before agent processing, so that indirect prompt injection in the development loop is blocked.

## Acceptance Criteria

### Injection Pattern Detection Plugin
- Given the agent reads any repository content (file, issue, PR, web page), when the content contains known prompt injection patterns (e.g., "ignore previous instructions", "forget all rules", embedded base64 instructions), then the plugin flags the content with a WARNING.
- Given the agent reads content with hidden instructions (zero-width characters, invisible unicode, HTML comments with instructions), when the patterns are detected, then the plugin blocks the content from entering the agent's context.
- Given a README or documentation file in a dependency or cloned repo, when injection patterns are detected, then the plugin logs a security event and warns the agent.

### Context Restriction Controls
- Given an agent task that only needs specific files, when the agent tries to read unrelated files for context, then a permission check restricts access to the minimum scope.
- Given the agent fetches a web page, when the page content exceeds a reasonable size or contains injected instructions, then the fetch is blocked and the user is prompted.

### Agent Action Audit
- Given the agent processes content from an external source (PR, issue, web page), when the agent subsequently makes unexpected file modifications, then the changes are flagged for human review.
- Given an agent reads content from an untrusted contributor, when the agent then executes shell commands or modifies CI configurations, then the actions are blocked pending user approval.

## Implementation Notes

- New plugin: `plugins/prompt-injection-guard.ts`
- Pattern database: Common prompt injection phrases, base64 detection, unicode safety checks
- Use semgrep rules from existing recipes for injection detection patterns
- Integrate with the existing web fetching capabilities to add response sanitization
- Hook into `tool.execute.before` for `read`, `webfetch`, `grep` tools
- Consider adding `.opencode/safe-context.md` as a curated context file for trusted content

## Definition of Done

- [ ] Injection detection plugin blocks known patterns
- [ ] Unicode safety check catches zero-width and bidi characters
- [ ] Context restriction controls limit agent file access per task
- [ ] Web fetch sanitization implemented
- [ ] Agent action audit flags unexpected changes after external content ingestion
- [ ] Unit tests for pattern matching, unicode detection, and context restriction
- [ ] Wiki documentation updated
