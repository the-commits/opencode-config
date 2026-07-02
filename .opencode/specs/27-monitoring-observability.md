# Feature: Monitoring and Observability

**Source:** OWASP RAG Security Cheat Sheet — Section 12 (Monitoring and Observability)
**Reference:** https://cheatsheetseries.owasp.org/cheatsheets/RAG_Security_Cheat_Sheet.html#monitoring

## Problem

The RAG proxy makes critical security decisions on every query: which chunks to retrieve, whether to answer locally or fall through to the provider, which chunks to exclude (poisoning, access control, integrity). Without monitoring and observability:
- Security events (document poisoning detected, index tampering, query injection attempts) are invisible to the user
- Performance degradation (slow retrieval, high fallthrough rate) goes unnoticed
- Debugging incorrect RAG answers requires inspecting the entire pipeline without tooling
- Attack patterns (sustained probing, repeated injection attempts) cannot be detected over time

## User Story

As a developer using opencode-config's RAG proxy, I want full observability into the RAG pipeline's decisions, performance, and security events, so that I can monitor health, debug issues, and detect attacks.

## Acceptance Criteria

### Structured Audit Log
- Given the RAG proxy processes a query, when the pipeline completes, it writes a structured audit log entry to `.opencode/rag-audit.jsonl` containing: timestamp, query hash (not plaintext), decision (rag_local | provider_fallthrough | cache_hit | blocked), top-3 chunks with scores and sources, confidence, latency, and any events (exclusions, warnings, errors).
- Given a security event occurs (poisoning detected, index tampering, rate limit triggered, access denied), when the event is generated, it includes severity level, event type, timestamp, affected resources, and recommendation.
- Given the audit log grows, when it exceeds a configurable size (default 50 MB), the proxy rotates the log, compressing the old file (`.rag-audit.jsonl.gz`).

### Real-Time Dashboard (Status Bar)
- Given the proxy is active, when the user is in a session, the status bar shows: RAG proxy status (active/degraded/off), current mode (local/provider/hybrid), and recent event count (since session start).
- Given a security event occurs (e.g., poisoned document detected), when the proxy logs it, it also displays a status bar notification with the event summary and a link to the audit log entry.

### Metrics Collection
- Given the proxy processes queries, when each query completes, it collects metrics: query count (total, RAG-local, provider-fallback, cache-hit), average latency (RAG vs provider), confidence distribution, chunk retrieval stats (avg chunks retrieved, avg score), security event counts by type.
- Given metrics are collected, when a user queries with `"ragProxy.report"` command, the proxy returns a summary report of key metrics.
- Given an anomaly is detected (e.g., fallthrough rate >80% indicating poor KB coverage), when the threshold is exceeded, the proxy logs a warning with actionable recommendations.

### Health Check
- Given the proxy starts, when initialization completes, it runs a self-check: vector store accessibility, embedding model loaded, index integrity verified, key file exists with correct permissions.
- Given a health check fails, when the proxy detects the failure, it logs the specific issue, degrades to provider-only mode, and notifies the user.
- Given a user runs a health check command (`rag-proxy:health`), when invoked, the proxy returns a health report with status of each component and any actions needed.

## Implementation Notes

- Observability module: `plugins/rag-proxy/observability.ts`
- Audit log: JSONL format, append-only, auto-rotating at configurable size
- Status bar: Use OpenCode's status bar API (if available) or write to a `.opencode/rag-status` file
- Metrics: In-memory counters with periodic flush to metrics log
- Health check: Run on startup and on `rag-proxy:health` command; check each component independently

## Definition of Done

- [ ] Structured audit log with all pipeline decisions and events
- [ ] Security events with severity, type, and recommendations
- [ ] Auto-rotating audit log with compression
- [ ] Status bar indicators for proxy status, mode, events
- [ ] Metrics collection (queries, latency, confidence, security events)
- [ ] Summary report command (`ragProxy.report`)
- [ ] Startup health check with component-level status
- [ ] `rag-proxy:health` command for on-demand diagnostics
- [ ] Anomaly detection with actionable warnings
- [ ] Unit tests for logging, metrics, health check
- [ ] Wiki documentation updated
