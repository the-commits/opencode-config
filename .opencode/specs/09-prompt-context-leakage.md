# Feature: Prompt Context Leakage Prevention

**Source:** OWASP Secure Coding with AI Cheat Sheet — Section 9
**Reference:** https://cheatsheetseries.owasp.org/cheatsheets/Secure_Coding_with_AI_Cheat_Sheet.html#section-9-prompt-context-leakage-and-sensitive-code-exposure

## Problem

AI coding assistants send code context (open files, project structure, terminal output) to the model provider's API. This context may contain credentials, personal data, proprietary business logic, and internal architecture details. Most tools do not clearly document what they send.

## User Story

As a developer, I want AI tool context exclusion configured to block sensitive files from being sent to model providers, so that prompt context leakage is prevented.

## Acceptance Criteria

### Context Exclusion Configuration
- Given the project has an `.opencode/` directory, when the agent loads context, files matching sensitive patterns (`.env*`, `*.pem`, `*.key`, `credentials.json`, `serviceAccountKey.json`, `secrets/**`) are excluded from the context sent to any model provider.
- Given the developer configures additional exclusion patterns in `opencode.jsonc` under `contextGuard.exclude:` key, when the agent processes context, the configured patterns are respected.
- Given a sensitive file is opened by the developer in their editor, when the AI tool would normally include it in context, the exclusion list prevents it from being sent.

### Context Audit Trail
- Given an agent session, when context is loaded, the plugin logs what files and directories were included in the context (without logging the content itself).
- Given a command or file read accesses sensitive content, when the content was included in context, a security event is logged with the file path and context size.

### Sensitive File Startup Check
- Given the Personal Instructions plugin runs at startup, when it detects `.env` files or other sensitive files in the project tree, it warns the user that these files should be excluded from AI tool context.
- Given the user has not configured context exclusions, when startup completes, the plugin prompts the user to configure `contextGuard.exclude` patterns.

### Network Egress Monitoring
- Given the agent makes API calls to model providers, when the payload size or frequency exceeds thresholds, the plugin warns the user and logs the API call metadata (endpoint, payload size, timestamp).
- Given the user enables audit mode, when any outbound API call contains context data, the call is logged with a summary of what was sent (file paths, context size).

## Implementation Notes

- New plugin or extension of env-protection: `plugins/context-guard.ts`
- Context exclusion patterns as a reusable config in `opencode.jsonc`
- Audit logging via existing `ctx.client.app.log()` service
- Network monitoring via proxy configuration or MCP-level observation
- Reuse `secrets/secret-patterns.txt` to identify credential-like content in context

## Definition of Done

- [ ] Context exclusion for sensitive file patterns
- [ ] Configurable exclusion patterns in `opencode.jsonc`
- [ ] Context audit trail logging (which files, not content)
- [ ] Startup warning if sensitive files are in tree without exclusions
- [ ] Network egress monitoring for model provider API calls
- [ ] Unit tests for pattern matching, exclusion logic, and audit logging
- [ ] Wiki documentation updated
