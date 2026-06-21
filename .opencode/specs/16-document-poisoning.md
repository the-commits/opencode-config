# Feature: Document Poisoning Protection

**Source:** OWASP RAG Security Cheat Sheet — Section 1 (Document Poisoning)
**Reference:** https://cheatsheetseries.owasp.org/cheatsheets/RAG_Security_Cheat_Sheet.html#doc-poisoning

## Problem

The RAG proxy indexes project files to build its local knowledge base. If an attacker injects malicious content into any indexed file (README, wiki page, issue, PR description, dependency changelog), the RAG system will retrieve and serve that poisoned content to the agent. Since RAG responses bypass the LLM provider's safety alignment, poisoned content can directly influence agent behaviour — enabling prompt injection, hidden instructions, or misinformation.

Typical attack vectors include:
- Malicious README in a dependency's cloned repo
- Issue or PR body containing hidden instructions
- Wiki page edited by an external contributor
- Dependency changelog with embedded attacker content
- A file modified via supply chain compromise

## User Story

As a developer using opencode-config's RAG proxy, I want all documents indexed into the knowledge base validated for malicious content before ingestion, so that poisoned content is never retrieved or served to the agent.

## Acceptance Criteria

### Pre-Indexing Content Validation
- Given the RAG proxy indexes a file, when the file is opened for chunking, the content is scanned for known prompt injection patterns ("ignore previous instructions", "forget all rules", embedded base64 instructions, zero-width Unicode characters, bidi override characters).
- Given a file contains injection patterns, when the scan detects them, the file is excluded from indexing and a WARNING is logged with the file path and detected pattern.
- Given a file exceeds a maximum size threshold (configurable, default 1 MB), when the proxy tries to index it, the file is skipped with a warning.

### Trusted vs Untrusted Sources
- Given a document originates from a trusted path (project source, `.opencode/`, local wiki), when the proxy indexes it, the document is tagged as "trusted" and given a lower scrutiny level.
- Given a document originates from an untrusted path (node_modules, cloned repositories, fetched web pages), when the proxy indexes it, it is tagged as "untrusted" and scanned with stricter rules.
- Given an untrusted document fails the injection scan, when it is excluded, the proxy also logs the source origin for audit.

### Index Integrity Verification
- Given the knowledge base has been indexed, when the proxy starts, it computes a hash of each indexed file and stores it alongside the chunks.
- Given a file changes on disk, when the proxy detects a hash mismatch, it re-scans and re-indexes the file, re-running all validation checks.
- Given a document's hash verification fails repeatedly, when the file cannot be read consistently, the proxy removes all chunks for that document and logs an error.

## Implementation Notes

- Validation module: `plugins/rag-proxy/validation.ts` — shared with prompt injection guard patterns
- Pattern detection: Same patterns used in `plugins/prompt-injection-guard.ts` (reuse the module)
- Trusted paths: Default trust list: project root, `.opencode/`, `wiki/`, `AGENTS.md`, `CONTRIBUTING.md`, `README.md`
- File hashing: SHA-256 per file, stored in vector index metadata
- Escalation: If a file fails validation >3 consecutive indexing attempts, notify user via status bar message

## Definition of Done

- [ ] Pre-indexing scan detects prompt injection, unicode attacks, oversized files
- [ ] Trusted vs untrusted source tagging with different scrutiny levels
- [ ] File hash verification on startup and on change detection
- [ ] Malicious files excluded from index with clear warning
- [ ] Audit log of all excluded files with reason and source origin
- [ ] Re-indexing with re-validation on file change
- [ ] Unit tests for pattern detection, hash verification, source tagging
- [ ] Wiki documentation updated
