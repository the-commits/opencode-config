# Feature: Multi-Agent and Sub-Agent Propagation Protection

**Source:** OWASP Secure Coding with AI Cheat Sheet — Section 13
**Reference:** https://cheatsheetseries.owasp.org/cheatsheets/Secure_Coding_with_AI_Cheat_Sheet.html#section-13-multi-agent-and-sub-agent-propagation

## Problem

When multiple agents interact (e.g. a coding agent delegates to a search agent, or a review agent processes output from a coding agent), prompt injection can propagate across agent boundaries. A compromised context in one agent becomes instructions for the next.

## User Story

As a developer, I want context boundaries enforced between multi-agent interactions, so that prompt injection doesn't propagate across agent hops.

## Acceptance Criteria

### Cross-Agent Context Boundaries
- Given Agent A delegates a task to Agent B (sub-agent), when Agent B receives input, the input is treated as untrusted — no raw conversation history or full tool responses are passed without sanitization.
- Given Agent B produces output for Agent A, when the output contains instructions or commands, Agent A validates that the output stays within the scope defined by the parent task.

### Agent-to-Agent Output Validation
- Given a sub-agent returns results, when the results contain file modification instructions, shell commands, or instructions to change agent behaviour ("ignore previous instructions", "forget rules"), the parent agent blocks execution and warns the user.
- Given a sub-agent's output attempts to escalate privileges or access restricted resources, when detected, the interaction is logged as a security event.

### Scope Enforcement
- Given a parent agent defines a task scope for a sub-agent, when the sub-agent attempts actions outside that scope (reading files not in scope, executing commands not in scope, accessing network endpoints not in scope), the sub-agent's runtime restricts the action.
- Given a sub-agent completes its task, when the output exceeds the expected scope (returns file contents from outside the scope, attempts to modify unrelated files), the parent agent rejects the output.

### Propagation Audit Trail
- Given a multi-agent interaction occurs, when each agent-to-agent communication happens, an audit trail records: source agent, target agent, context summary (not full content), timestamp, and whether the communication was allowed or blocked.
- Given an agent-to-agent communication is blocked due to scope violation or injection detection, when the block occurs, the audit trail logs the reason and the violating content summary.

## Implementation Notes

- New plugin: `plugins/agent-boundary.ts`
- Scope definition format: JSON object with `allowedPaths`, `allowedCommands`, `allowedNetworkHosts`, `maxOutputSize`
- Injection propagation detection: reuse patterns from prompt-injection-guard (spec 03)
- Audit trail via `ctx.client.app.log()` with structured metadata
- Integrate with the build agent's sub-agent delegation pattern (build → build-lite)
- Reference: OWASP AI Agent Security Cheat Sheet and MCP Security Cheat Sheet Section 8

## Definition of Done

- [ ] Cross-agent context boundaries with untrusted input handling
- [ ] Agent-to-agent output validation for injection propagation
- [ ] Sub-agent scope enforcement (files, commands, network)
- [ ] Multi-agent audit trail with allow/block logging
- [ ] Unit tests for scope enforcement, output validation, and audit logging
- [ ] Wiki documentation updated
