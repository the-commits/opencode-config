# Feature: Source Attribution for RAG Responses

**Source:** OWASP RAG Security Cheat Sheet — Section 4 (Source Attribution)
**Reference:** https://cheatsheetseries.owasp.org/cheatsheets/RAG_Security_Cheat_Sheet.html#source-attribution

## Problem

When the RAG proxy answers a query locally (without calling the provider), the agent receives information without knowing its origin. Without source attribution:
- The agent cannot verify the answer's authority or freshness
- Errors in indexed documents propagate silently as "facts"
- Users cannot distinguish between RAG-provided answers vs provider-generated answers
- Debugging incorrect RAG responses is impossible without knowing which source document provided the information
- Stale or superseded content in the KB may be served without indication of age

## User Story

As a developer using opencode-config's RAG proxy, I want every RAG-sourced answer to include inline source citations (file path, line range, last modified timestamp) so that I can verify the provenance, freshness, and authority of every response.

## Acceptance Criteria

### Inline Source Citations
- Given the RAG proxy answers a query locally, when it synthesizes the response, each factual claim includes a source citation `[source: path/to/file.md:42-48]` in the response text.
- Given a response is constructed from multiple chunks, when the chunks originate from different source files, each chunk's contribution is separately cited.
- Given a chunk is truncated or summarized, when cited, the line range reflects the original chunk extents, not the truncated portion.

### Source Metadata in Response
- Given a RAG response is returned, when the response includes citations, the proxy also attaches structured metadata to the response object: `{ sources: [{ file: string, lines: string, hash: string, indexedAt: string }] }`.
- Given a file has been modified since indexing, when the proxy serves a response from that file, it includes a warning badge: `⚠ Source modified since index — verify currency`.

### Confidence Display
- Given a response is completely from RAG (no provider fallthrough), when returned, the response includes a confidence indicator based on the top chunk's similarity score: `[confidence: 0.92]`.
- Given a response is partially from RAG (some chunks, provider filled gaps), when returned, each section is tagged `[RAG]` or `[LLM]` to distinguish origin.
- Given a response is entirely from the provider (no RAG match), when returned, no source citation is added (provider-generated).

### Debug View
- Given a user sets `"ragProxy.debug": true` in `opencode.jsonc`, when the proxy returns a response, it also logs the full retrieval details: query embedding, top-5 chunks with scores, any excluded chunks with reasons, and the final confidence decision.
- Given debug mode is enabled, when chunks are excluded (poisoned, access denied), the exclusion reason is included in the debug log.

## Implementation Notes

- Attribution module: `plugins/rag-proxy/attribution.ts`
- Citation format: `[source: relative/path.md:start-end]` — machine-parseable, human-readable
- Metadata attachment: Use the plugin's response metadata field (if available) or append to response text
- Staleness check: Compare file mtime with chunk's `indexedAt` timestamp on each retrieval
- Debug mode: Controlled by `ragProxy.debug` config flag; logs to `.opencode/rag-audit.jsonl`

## Definition of Done

- [ ] Inline source citations with file path and line range
- [ ] Structured source metadata attached to responses
- [ ] Staleness warning when source file modified since indexing
- [ ] Confidence indicator per response (or per section for hybrid responses)
- [ ] Debug mode with full retrieval trace
- [ ] Provider-only responses correctly omit source citations
- [ ] Unit tests for citation generation, metadata attachment, staleness detection
- [ ] Wiki documentation updated
