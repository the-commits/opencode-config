# Feature: Caching Security

**Source:** OWASP RAG Security Cheat Sheet — Section 11 (Caching)
**Reference:** https://cheatsheetseries.owasp.org/cheatsheets/RAG_Security_Cheat_Sheet.html#caching

## Problem

The RAG proxy caches provider responses locally so that future queries can be answered without an API call. However, an insecure cache introduces risks:

- **Cache Poisoning**: An attacker writes malicious content into the cache that will be served to future queries instead of fresh responses
- **Cache Timing Side Channels**: Different cache hit/miss times reveal whether a specific query has been made before (membership inference)
- **Stale Cache Serving**: Old, superseded content in the cache is returned even after the source documents have been updated
- **Cross-Workspace Cache Contamination**: A response cached from workspace A is served to a query in workspace B

## User Story

As a developer using opencode-config's RAG proxy, I want the response cache to be integrity-protected, workspace-scoped, and freshness-checked, so that cached responses are trustworthy and never served across workspace boundaries.

## Acceptance Criteria

### Cache Integrity
- Given a provider response is cached, when the proxy writes it to the cache store, it signs the cache entry with an HMAC-SHA256 (same key as index integrity, from `.opencode/.rag-key`).
- Given a cached response is retrieved, when the proxy reads it, it verifies the HMAC signature before returning the cached value.
- Given a cache entry's signature is invalid, when the proxy detects tampering, it discards the entry, logs a SECURITY event, and treats the query as a cache miss (forward to provider).

### Workspace-Scoped Caching
- Given a response is cached, when stored, it includes the workspace root in the cache key: `cache_key = HMAC(workspaceRoot + query_embedding_hash)`.
- Given a query originates from workspace A, when the proxy looks up the cache, it only considers entries with workspace A's key prefix.
- Given the same query text is asked in two different workspaces, when the proxy checks the cache, each workspace gets its own independent cache entry.

### Cache Freshness and Invalidation
- Given a cache entry has a configurable TTL (default 24 hours), when the proxy checks the cache, it verifies the entry's age against the TTL.
- Given a cache entry is expired, when the proxy detects the expiry, it discards the entry and forwards the query to the provider.
- Given a source file changes (detected by file watcher or on next startup), when the proxy detects the change, it invalidates all cache entries that were derived from the changed file's chunks (if the cached response metadata references affected files).
- Given a user wants to force-clear the cache, when they set `"ragProxy.clearCache": true` in config or run an explicit command, the entire cache is cleared and rebuilt.

### Cache Timing Protection
- Given a query is submitted, when the proxy checks the cache, it adds a small random delay (0-50ms jitter) to the cache lookup to mask cache hit/miss timing differences.
- Given a cache miss occurs and the query is forwarded to the provider, when the proxy returns the response, the total response time is not exposed in a way that distinguishes cache vs provider origin (in non-debug mode).

## Implementation Notes

- Cache module: `plugins/rag-proxy/cache.ts`
- Cache store: Local SQLite or JSONL file at `.opencode/rag-cache/`
- Cache key: `HMAC-SHA256(workspace + query_embedding_base64)` — ensures query privacy in key
- TTL: Configurable per workspace in `opencode.jsonc: ragProxy.cacheTTL` (default 86400000 ms)
- File-based invalidation: Track which files contributed to each cached response in metadata; invalidate on file change
- Jitter: cryptographically-secure random delay 0-50ms

## Definition of Done

- [ ] HMAC-signed cache entries with verification on read
- [ ] Workspace-scoped cache keys prevent cross-project contamination
- [ ] TTL-based expiry with configurable duration
- [ ] File-change-triggered cache invalidation
- [ ] User command to force-clear cache
- [ ] Timing jitter to mask cache hit/miss
- [ ] Response time not exposed in non-debug mode
- [ ] Unit tests for signing, key scoping, expiry, invalidation, timing protection
- [ ] Wiki documentation updated
