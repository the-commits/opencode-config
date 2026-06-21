# Feature: Agent Runtime Sandboxing

**Source:** OWASP Secure Coding with AI Cheat Sheet — Section 5
**Reference:** https://cheatsheetseries.owasp.org/cheatsheets/Secure_Coding_with_AI_Cheat_Sheet.html#section-5-agent-runtime-sandboxing

## Problem

Agentic coding tools execute commands, install packages, write files, and access the network on the developer's machine. Without sandboxing, a compromised agent context has the same privileges as the developer. Auto-accept modes and `--dangerously-skip-permissions` flags bypass user confirmation.

## User Story

As a developer, I want agent runtimes sandboxed with restricted commands, egress controls, and ephemeral credentials, so that a compromised agent context doesn't have full machine access.

## Acceptance Criteria

### Tool Allowlist/Blocklist
- Given an agent tries to execute a shell command, when the command matches a blocked pattern (credential access, SSH key read, cloud CLI), then the plugin blocks the command with a security warning.
- Given an agent tries to read files in sensitive directories (`~/.ssh/`, `~/.aws/`, `~/.config/gcloud/`), when the directory is on the sensitive list, then the plugin blocks the read.
- Given an agent tries to access `$HOME/.env` or any `.env` file (beyond the existing env-protection plugin), when the file matches, then it's blocked.

### Egress Controls
- Given the agent runs in a restricted mode, when it tries to make an outbound network call to a non-allowlisted host, then the call is blocked.
- Given the agent needs to fetch a specific URL for the task, when the user pre-approves the URL, then the call is allowed.

### Credential Protection
- Given sensitive environment variables are set (AWS_*, GITHUB_TOKEN, etc.), when the agent tries to read or echo them, then the plugin blocks access and warns the user.
- Given the agent runs a command that leaks environment variables (e.g., `env`, `printenv`), when the output contains sensitive variables, then the output is redacted.

### Runtime Resource Limits
- Given an agent subprocess runs, when it exceeds configurable resource limits (CPU, memory, disk writes, runtime duration), then the process is terminated and the user is notified.
- Given an agent process spawns child processes, when the total process tree exceeds the limit, then all processes are terminated.

## Implementation Notes

- Extend `plugins/env-protection.ts` to cover more than just `.env` files
- New module or config: `~/.config/opencode/agent-sandbox.json` with allow/block lists
- Use `child_process` resource limits where possible; otherwise use wrapper scripts
- Environment variable redaction via a pre-exec hook on bash tool calls
- Consider a "restricted mode" toggle in `opencode.jsonc` for high-risk tasks

## Definition of Done

- [ ] Tool allowlist/blocklist for shell commands
- [ ] Sensitive directory access blocking
- [ ] Egress controls with allowlisted hosts
- [ ] Environment variable protection and output redaction
- [ ] Resource limits for agent subprocesses
- [ ] Unit tests for all protection layers
- [ ] Wiki documentation updated
