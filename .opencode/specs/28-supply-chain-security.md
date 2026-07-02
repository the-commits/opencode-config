# Feature: Supply Chain Security for RAG Pipeline

**Source:** OWASP RAG Security Cheat Sheet — Section 13 (Supply Chain Security)
**Reference:** https://cheatsheetseries.owasp.org/cheatsheets/RAG_Security_Cheat_Sheet.html#supply-chain

## Problem

The RAG proxy depends on several components that form its supply chain:
- **Embedding model**: A local ONNX/transformers model loaded from npm or local storage
- **Vector store library**: SQLite with vector extension or a vector index library
- **Chunking and text processing**: Libraries for text splitting, tokenization, language detection
- **Configuration and data files**: `.rag-key`, index files, cache files

Each component is a potential attack surface. A compromised embedding model could produce biased embeddings that cause retrieval of attacker-chosen chunks. A compromised vector library could leak or corrupt the index. Supply chain attacks on the RAG proxy components could undermine the entire security posture.

## User Story

As a developer using opencode-config's RAG proxy, I want the RAG pipeline's dependencies and data files to be supply-chain-secured, so that compromised components are detected before they can affect the proxy's behaviour.

## Acceptance Criteria

### Embedding Model Integrity
- Given the embedding model is loaded from npm (e.g., `@xenova/transformers`), when the proxy loads the model, it verifies the package integrity via the existing dependency verification system (`scripts/verify-deps.mjs`), checking pinned versions, integrity hashes, and lockfile sync.
- Given the embedding model is a local file (e.g., downloaded ONNX model), when the proxy loads it, it verifies the model file's SHA-256 hash against a known-good hash stored in configuration or a hash manifest.
- Given the model hash verification fails, when the proxy detects the mismatch, it refuses to load the model and reports the error with instructions to re-download.

### Vector Store Library Integrity
- Given the vector store library is a dependency (npm or bundled), when the proxy initializes, it verifies the library is from a pinned version with a known integrity hash (same as npm verification).
- Given the proxy creates or opens a vector index file, when it accesses the file, it verifies the file's HMAC signature (per the Index Integrity story) before reading or writing.
- Given a vector index file fails verification, when the proxy detects the failure, it falls back to provider-only mode and does not attempt to read or repair the compromised file.

### Plugin Dependency Management
- Given the RAG proxy is a plugin (`plugins/rag-proxy.ts`), when it imports dependencies, it uses only pinned, integrity-verified packages from the project's `package.json`.
- Given the proxy uses any new npm dependency, when added, it follows the project's NPM security rules: pinned exact version, `ignore-scripts=true`, integrity hash in lockfile.
- Given an existing dependency has a known vulnerability (via `npm audit` or supply chain scan), when detected, the proxy logs a WARNING and uses a safe fallback path if available.

### Data File Security
- Given the proxy writes data files (index, cache, key, audit log), when creating them, it sets restrictive file permissions (0600 for key file, 0644 for others).
- Given the proxy reads a data file, when the file permissions are too permissive (world-readable for key file), the proxy logs a WARNING and suggests fixing permissions.
- Given the proxy's `.rag-key` file is missing, when the proxy needs it for HMAC, it generates a new key (invalidating existing signatures) and rebuilds the index and cache.

## Implementation Notes

- Supply chain module: `plugins/rag-proxy/supply-chain.ts`
- Model verification: Store known-good hashes in `plugins/rag-proxy/model-hashes.json`; update on model version bumps
- Dependency verification: Reuse `scripts/verify-deps.mjs` — add RAG proxy dependencies to the check
- File permissions: Use Node.js `fs.chmod` with `0o600` for sensitive files
- Vulnerability monitoring: Integrate with the existing Supply Chain Guard plugin and dependency audit

## Definition of Done

- [ ] Embedding model integrity verification via SHA-256 hash
- [ ] Vector store library pinned and integrity-verified
- [ ] RAG proxy dependencies follow project's NPM security rules
- [ ] Restrictive file permissions on all data files
- [ ] Permission warnings for overly permissive files
- [ ] Key file generation on missing key
- [ ] Provider-only fallback on supply chain verification failure
- [ ] Unit tests for model verification, permission checks, dependency checks
- [ ] Wiki documentation updated
