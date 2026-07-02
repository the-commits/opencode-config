# Feature: MCP and Tool Security

**Source:** OWASP Secure Coding with AI Cheat Sheet — Section 4
**Reference:** https://cheatsheetseries.owasp.org/cheatsheets/Secure_Coding_with_AI_Cheat_Sheet.html#section-4-mcp-and-tool-security

## Problem

AI coding agents connect to MCP servers to access tools for file operations, database queries, API calls, and more. Compromised or malicious MCP servers are a direct supply chain risk to the development environment. Tool descriptions are part of the agent's context and can contain prompt injection payloads.

## User Story

As a developer, I want MCP server connections audited, tool definitions pinned and diff-checked, and tool arguments validated, so that malicious MCP servers can't compromise my environment.

## Acceptance Criteria

### MCP Server Allowlisting
- Given a new MCP server configuration is added to `opencode.jsonc`, when the server host/command is not on the user's allowlist, then the plugin prompts for explicit approval before allowing the connection.
- Given an MCP server is already approved, when its tool definitions change (rug-pull), then the plugin detects the diff and re-prompts for approval.

### Tool Definition Snapshot and Diff
- Given an MCP server exposes tools, when first connected, the plugin snapshots all tool names, descriptions, and parameter schemas.
- Given a subsequent session, when any tool definition differs from the snapshot, then the plugin warns and requires re-approval.
- Given tool descriptions are snapshotted, when the agent invokes a tool, the plugin validates that the tool name matches an approved snapshot.

### Tool Argument Validation
- Given the agent calls an MCP tool, when tool arguments contain sensitive data (file paths outside the project, environment variable names, credential-like strings), then the plugin warns the user.
- Given the agent calls a filesystem tool, when the argument targets a path outside the project root, then the plugin blocks the call.
- Given the agent calls a network tool, when the URL or host is not in an approved list, then the plugin prompts for confirmation.

### Hook into MCP Connection Lifecycle
- Given the plugin loads at startup, when MCP servers are configured, the plugin audits each server before the agent can call any tools.
- Given an MCP server fails the audit, when the server is marked as untrusted, then the plugin disables the server and notifies the user.

## Implementation Notes

- New plugin: `plugins/mcp-security.ts`
- Snapshot storage: `~/.config/opencode/.mcp-snapshots.json` (JSON file with server name → tool definitions)
- Tool argument validation patterns: file paths, URLs, credential-looking strings (reuse patterns from `secrets/secret-patterns.txt`)
- Integrate with the existing MCP config in `opencode.jsonc`
- Reference: CVE-2026-39313 (mcp-framework DoS) — include runtime limits on MCP server memory/request size

## Definition of Done

- [ ] MCP server allowlisting with first-connect approval
- [ ] Tool definition snapshot and rug-pull detection
- [ ] Tool argument validation for sensitive data
- [ ] MCP connection lifecycle auditing
- [ ] Unit tests for snapshot comparison, argument validation, and allowlisting
- [ ] Wiki documentation updated
