# Feature: Vector Index Integrity Protection

**Source:** OWASP RAG Security Cheat Sheet — Section 6 (Vector Index Integrity)
**Reference:** https://cheatsheetseries.owasp.org/cheatsheets/RAG_Security_Cheat_Sheet.html#vector-index-integrity

## Problem

The vector index is the RAG proxy's core data structure. If an attacker gains write access to the index files, they can:
- Insert malicious chunks that will be retrieved for targeted queries (index poisoning)
- Delete or corrupt legitimate chunks, causing the RAG system to fail or fall through to the provider
- Modify chunk metadata to bypass access controls or attribution
- Plant chunks that activate only on specific queries (sleeper attacks)

Since the vector index is stored locally on disk, its integrity depends entirely on filesystem security. An attacker with filesystem access (via supply chain compromise of a dev dependency, or a malicious MCP tool) can tamper with the index.

## User Story

As a developer using opencode-config's RAG proxy, I want the vector index files integrity-verified and tamper-evident, so that any unauthorized modification to the index is detected and the system defaults to safe behaviour (fallthrough to provider) when integrity is compromised.

## Acceptance Criteria

### Index File Integrity Verification
- Given the RAG proxy loads a vector index file, when it opens the file, it verifies the file's digital signature or HMAC before reading any chunks.
- Given the index file's signature is invalid or missing, when the proxy detects tampering, it refuses to load the index and falls back to provider-only mode (no RAG).
- Given the proxy falls back due to index tampering, when it logs the event at ERROR level with the index file path and timestamp, it also notifies the user via status bar message or notification.

### Index Content Integrity
- Given the vector index is loaded successfully, when the proxy retrieves chunks, it spot-checks a random sample of chunk content hashes against their stored hashes (configurable sampling rate, default 5%).
- Given a spot-check fails (stored hash ≠ recomputed hash), when the proxy detects the mismatch, it logs a SECURITY event with the chunk ID and source file, and excludes the corrupted chunk.
- Given corrupted chunks exceed a configurable threshold (default 10% of total), when the proxy detects widespread corruption, it invalidates the entire index and rebuilds from source files.

### Index Backup and Recovery
- Given the proxy creates or updates the vector index, when the write completes successfully, it creates a backup of the previous valid index state.
- Given the current index is invalidated due to integrity failure, when a valid backup exists, the proxy restores the backup and logs a WARNING.
- Given no valid backup exists and the current index is corrupted, when the proxy cannot recover, it rebuilds the index from scratch from the original source files.

### Integrity Signature Implementation
- The index file includes a footer with: `{ indexHash: string, signature: string, signedAt: string, version: number }`
- The signature is an HMAC-SHA256 of the index content using a key derived from the workspace root (machine-local, not shared).
- The key is stored in `.opencode/.rag-key` (0600 permissions) — generated on first index creation.
- On key loss, the index is treated as untrusted and rebuilt.

## Implementation Notes

- Integrity module: `plugins/rag-proxy/index-integrity.ts`
- HMAC key: Crypto.randomBytes(32), stored in `.opencode/.rag-key` with restrictive permissions
- Backup strategy: Keep last 3 valid index backups in `.opencode/rag-backups/`
- Spot-check: Random sampling with configurable rate; log metric for monitoring
- Fallback: Provider-only mode retains full functionality, just no RAG augmentation
- Recovery: Rebuild from source files listed in the index manifest

## Definition of Done

- [ ] HMAC-signed index files with verification on load
- [ ] Tampered index detected and refused; fallback to provider-only mode
- [ ] Random spot-checking of chunk hashes on retrieval
- [ ] Auto-invalidation and rebuild when corruption exceeds threshold
- [ ] Index backup and restore mechanism (last 3 backups)
- [ ] Key management in `.opencode/.rag-key` with restrictive permissions
- [ ] Notification to user on integrity failure events
- [ ] Unit tests for signature verification, spot-checking, backup/restore
- [ ] Wiki documentation updated
