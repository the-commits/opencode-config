# Feature: Query Injection Prevention

**Source:** OWASP RAG Security Cheat Sheet — Section 7 (Query Injection)
**Reference:** https://cheatsheetseries.owasp.org/cheatsheets/RAG_Security_Cheat_Sheet.html#query-injection

## Problem

When the RAG proxy intercepts a query, embeds it, and searches the vector store, the query itself can be crafted by an attacker to probe or manipulate the RAG system. Query injection attacks against RAG include:
- **Probing queries**: Carefully crafted queries designed to extract information about what documents exist in the knowledge base (e.g., asking about specific file paths, secret names, internal project names)
- **Manipulation queries**: Queries designed to cause the retrieval of specific poisoned chunks by matching their embedding vectors
- **Reconstruction queries**: Iterative queries that attempt to reconstruct the contents of the knowledge base chunk by chunk
- **Adversarial queries**: Queries with appended noise designed to shift the embedding toward a target region in vector space

Since the RAG proxy runs locally, injection primarily threatens the confidentiality of the knowledge base contents rather than data exfiltration, but probing can still reveal sensitive project information.

## User Story

As a developer using opencode-config's RAG proxy, I want query injection and probing attacks detected and mitigated, so that the knowledge base contents cannot be extracted or manipulated via crafted queries.

## Acceptance Criteria

### Query Rate Limiting
- Given the same workspace, when a query is submitted, the proxy tracks query frequency per session.
- Given a query rate exceeds a configurable threshold (default: 30 queries per minute), when the proxy detects the burst, it temporarily degrades to provider-only mode for 60 seconds.
- Given rate limiting activates, when the user is notified via warning message, the event is logged.

### Query Similarity Probing Detection
- Given a query is submitted, when the proxy embeds it, it checks the cosine similarity between the current query and the last N queries (N=10, configurable).
- Given the current query is within 0.95 cosine similarity of multiple recent queries (suggesting iterative probing), when detected, the proxy inserts a small random noise vector into the embedding (±0.01) to reduce reconstruction precision.
- Given iterative probing is detected beyond a threshold (20+ high-similarity queries in a row), when confirmed, the proxy rejects further queries for that session and logs a SECURITY event.

### Query Content Sanitization
- Given a query is received, when it contains patterns consistent with knowledge base probing (e.g., "list all files", "what documents exist", "show me the chunks"), the proxy recognizes these as probing patterns and limits results to at most 1 chunk per query.
- Given a query contains escape or delimiter patterns (e.g., "---", "```", null bytes) that could interfere with chunk boundary markers, when detected, the proxy strips or encodes the characters before embedding.
- Given a query excessively repeats the same phrase (potential adversarial noise), when detected, the proxy deduplicates the repeated tokens before embedding.

### Embedding Privacy
- Given a query is embedded locally, when the embedding vector is computed, it is used only for the current search and not persisted beyond the session.
- Given the proxy has debug mode enabled, when queries and embeddings are logged, sensitive terms (api keys, passwords, tokens) are redacted using the same patterns from the pre-push secret scanner before logging.

## Implementation Notes

- Query security module: `plugins/rag-proxy/query-security.ts`
- Rate limiter: Token bucket algorithm, configurable rate and burst
- Probing detection: Sliding window of last N query embeddings, cosine similarity check
- Noise injection: Small gaussian noise (±0.01) on detection to frustrate reconstruction
- Sanitization: Reuse secret patterns from `secrets/secret-patterns.txt` for redaction
- Persistence: Query embeddings stored in memory only, not written to disk

## Definition of Done

- [ ] Rate limiting with configurable threshold; degrades to provider-only on burst
- [ ] Iterative probing detection via query similarity window
- [ ] Random noise injection to frustrate reconstruction on probing detection
- [ ] Probing pattern recognition with result limiting
- [ ] Query sanitization (escape chars, repeated tokens, null bytes)
- [ ] Sensitive term redaction in debug logs
- [ ] In-memory only query embeddings (no persistence)
- [ ] Unit tests for rate limiter, probing detection, sanitization, redaction
- [ ] Wiki documentation updated
