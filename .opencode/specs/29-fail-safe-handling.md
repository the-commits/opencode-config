# Feature: Fail-Safe Handling (Graceful Failure)

**Source:** OWASP RAG Security Cheat Sheet — Section 14 (Fail-Safe/Fail-Secure)
**Reference:** https://cheatsheetseries.owasp.org/cheatsheets/RAG_Security_Cheat_Sheet.html#fail-safe

## Problem

The RAG proxy is an intermediary that can fail in many ways: embedding model fails to load, vector store is corrupted, index verification fails, disk is full, configuration is invalid. How the proxy handles these failures determines the security posture:

- **Fail-Open (dangerous)**: On failure, bypass all RAG checks and forward every query directly to the provider. This means poisoning, injection, and access control protections are silently disabled.
- **Fail-Closed (secure)**: On failure, block all queries and notify the user. No query is processed until the failure is resolved.
- **Fail-Graceful (balanced)**: On failure, fall through to the provider but with reduced functionality and clear user notification of the degraded state.

The RAG proxy must never silently fail-open, disabling security protections without the user's knowledge.

## User Story

As a developer using opencode-config's RAG proxy, I want the proxy to fail gracefully and securely — never silently degrading security — so that I am always aware of the proxy's operational status and can take corrective action.

## Acceptance Criteria

### Failure Categorization
- Given a failure occurs, when the proxy categorizes it, it determines whether the failure is:
  - **Critical** (index tampered, key file missing, embedding model corrupted, HMAC verification failed) → provider-only mode, NO caching, NO RAG
  - **Degraded** (disk space low, high latency, partial index corruption below threshold) → provider-only mode, with caching enabled, user notified
  - **Transient** (file temporarily locked, network timeout for model loading) → retry up to 3 times with exponential backoff, then escalate to Degraded
- Given a Critical failure, when categorized, the proxy immediately switches to provider-only mode with zero RAG functionality.

### User Notification on Failure
- Given a failure forces provider-only mode, when the proxy degrades, it displays a clear status bar notification: `⚠ RAG Proxy: <component> failed — running provider-only. Check log for details.`
- Given the user clicks the notification, when they interact, the proxy opens a diagnostic view with the failure details and recommended actions.
- Given a transient failure is resolved (e.g., disk space freed), when the proxy detects the recovery, it auto-restores full RAG functionality and notifies the user.

### No Silent Degradation
- Given any failure occurs, when the proxy changes its operational mode, it ALWAYS logs the event at WARN or ERROR level with full context.
- Given the proxy operates in a degraded mode, when a query is processed, it includes a subtle indicator in the response metadata: `ragProxy: "degraded"` (not visible in normal output, visible in debug mode).
- Given a failure is critical and provider-only mode is active, when any RAG security feature would have applied (document poisoning, access control, output validation), the proxy adds a log warning that the feature was unavailable.

### Recovery and Re-initialization
- Given the proxy is in provider-only mode due to a failure, when the user runs `rag-proxy:restart`, the proxy re-runs the full initialization sequence (health check, index verification, model loading).
- Given the re-initialization succeeds, when all components pass health checks, the proxy resumes full RAG functionality and notifies the user.
- Given the re-initialization fails again, when the same failure recurs, the proxy logs the repeated failure and suggests manual intervention (reinstall, rebuild index, check permissions).

### Initialization Guard
- Given the proxy starts, when initialization fails (any critical component), the proxy does NOT start in a half-initialized state. It must either fully initialize or fail completely (provider-only mode).
- Given the proxy cannot initialize the embedding model, when it falls back to provider-only, it also skips cache initialization (no point caching without RAG).

## Implementation Notes

- Failure handling module: `plugins/rag-proxy/failover.ts` or integrated into main plugin `plugins/rag-proxy.ts`
- Failure categories: Defined as enum in a shared types module
- Retry: Exponential backoff for transient failures: 1s, 2s, 4s
- User notification: Status bar API + log entry
- Recovery: `rag-proxy:restart` command triggers full re-init
- No half-states: Either fully initialized (all components loaded and verified) or provider-only (no RAG features active)

## Definition of Done

- [ ] Failure categorization into Critical, Degraded, Transient
- [ ] Provider-only mode on Critical failures (fail-closed/graceful, never fail-open)
- [ ] Status bar notification on every degradation with details
- [ ] No silent degradation — always logged with context
- [ ] Auto-recovery from transient failures
- [ ] `rag-proxy:restart` command for manual re-initialization
- [ ] Initialization guard prevents half-initialized state
- [ ] Degraded indicator in response metadata (debug mode)
- [ ] Unit tests for failure categorization, retry logic, recovery
- [ ] Wiki documentation updated
