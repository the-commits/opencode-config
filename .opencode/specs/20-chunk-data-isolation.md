# Feature: Chunk Data Isolation and Integrity

**Source:** OWASP RAG Security Cheat Sheet — Section 5 (Chunk Data Isolation and Integrity)
**Reference:** https://cheatsheetseries.owasp.org/cheatsheets/RAG_Security_Cheat_Sheet.html#chunk-data-isolation-and-integrity

## Problem

A single vector store mixing chunks from multiple projects, domains, or sensitivity levels creates cross-contamination risks. A query about project A could inadvertently retrieve chunks from project B's indexed files. Additionally, if chunk integrity is not verified, tampered chunks in the vector store could serve stale or corrupted content without detection.

Without isolation:
- Confidential project B data leaks through project A queries
- Chunks from external dependencies mix with first-party code answers
- Different knowledge domains (security policies vs API docs vs onboarding guides) cannot be independently scoped
- Chunk corruption or tampering goes undetected

## User Story

As a developer using opencode-config's RAG proxy across multiple projects, I want chunks segregated by project workspace and verified for integrity on every retrieval, so that cross-project data leakage is impossible and tampered chunks are detected immediately.

## Acceptance Criteria

### Workspace Namespace Isolation
- Given the RAG proxy indexes files in multiple workspaces, when a query originates from workspace A, the vector store search is scoped exclusively to workspace A's chunks via a namespace filter.
- Given a file is indexed in workspace A, when the same file path exists in workspace B, the chunks are stored separately under each workspace's namespace with different chunk IDs.

### Domain Tagging for Multi-Domain Filtering
- Given a knowledge base contains documents from different domains (security policies, API docs, onboarding, project rules), when indexed, each chunk receives a domain tag based on its source directory or frontmatter.
- Given a query is made, when the query context includes a domain hint (explicit or inferred), the search is scoped to the relevant domain tag(s).

### Integrity Verification on Retrieval
- Given a chunk is retrieved from the vector store, when the proxy uses it for an answer, it verifies the chunk's integrity hash against the source file's current hash.
- Given a chunk's integrity check fails (source file modified since indexing), when the proxy detects the mismatch, it marks the chunk as stale, logs a warning, and excludes it from results.
- Given a chunk is excluded for integrity failure, when the proxy has no valid chunks for the query, it falls through to the provider with a note that the knowledge base has stale content.

### Vector Store Structure
- The vector store stores per-chunk metadata: `{ workspaceRoot, domain, filePath, lineRange, contentHash, indexedAt, sourceMtime, sensitivity }`.
- Chunk IDs are derived from `workspaceRoot + filePath + lineRange + contentHash` to prevent collisions.
- The proxy supports separate vector index files per workspace for offline/air-gapped use.

## Implementation Notes

- Namespace module: `plugins/rag-proxy/namespace.ts`
- Vector store: Use namespaced collections (SQLite schema with `workspace` column, or separate index files per workspace)
- Domain tagging: Auto-detect from directory structure (`security/`, `api/`, `docs/`, `.opencode/`) or YAML frontmatter `domain:`
- Integrity: SHA-256 of chunk content stored in metadata; compared against SHA-256 of source file lines on retrieval
- Staleness handling: Re-index stale chunks lazily (on retrieval) or eagerly (on file change via fs watcher)

## Definition of Done

- [ ] Workspace namespace isolation prevents cross-project chunk retrieval
- [ ] Domain tagging with scoped search support
- [ ] Integrity hash verification on every chunk retrieval
- [ ] Stale chunks excluded with warning and fallthrough to provider
- [ ] Per-chunk metadata stored with all required fields
- [ ] Separate vector index files per workspace option
- [ ] Unit tests for namespace filtering, domain scoping, integrity verification
- [ ] Wiki documentation updated
