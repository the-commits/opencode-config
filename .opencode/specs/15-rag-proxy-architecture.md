# Feature: RAG Proxy Architecture

**Source:** OWASP RAG Security Cheat Sheet — Architecture Overview
**Reference:** https://cheatsheetseries.owasp.org/cheatsheets/RAG_Security_Cheat_Sheet.html

## Problem

Every agent query goes directly to the configured LLM provider via API call. This means:
- Sensitive project context (API keys, proprietary code, internal docs) is sent over the network on every query
- Repeated questions about project conventions, rules, and policies incur API costs unnecessarily
- Deterministic answers (project rules, guidelines, config) are non-deterministic — the LLM may answer differently each time
- Offline operation is impossible — no query can be answered without network access

A RAG (Retrieval-Augmented Generation) proxy that sits between the agent and the LLM provider can answer many queries locally, falling through to the provider only when the local knowledge base has no relevant answer.

## User Story

As a developer using opencode-config, I want a configurable RAG proxy that intercepts agent-to-provider queries, checks a local knowledge base first, and only forwards to the LLM provider when no satisfactory answer exists locally, so that common queries are answered privately, instantly, and deterministically without network calls.

## Acceptance Criteria

### Query Interception
- Given a RAG proxy plugin is registered, when the agent sends any query to the LLM provider, then the plugin intercepts the request before network egress.
- Given the proxy intercepts a query, when the query is embedded and searched against the local vector store, then it checks whether the top result exceeds a configurable similarity threshold (default: 0.85).
- Given the top chunk exceeds the threshold, when the chunk's context window is fully contained within the query scope, then the proxy returns the chunk content as the answer without calling the LLM provider.

### Fallthrough Logic
- Given a query has no chunk exceeding the threshold, when no relevant content is found, then the query passes through to the configured LLM provider unchanged.
- Given a query has a partial match below threshold, when the top-3 chunks average similarity is below 0.7, then the query passes through to the provider.
- Given the provider returns an answer, when the answer is cached to the local KB for future use, then the response is returned normally.

### Local Embedding & Vector Store
- Given the proxy needs to embed a query, when no local embedding model is available, then it uses a bundled lightweight model (e.g., `transformers.js` with `all-MiniLM-L6-v2`) with no outbound network call.
- Given the vector store needs initialization, when the proxy starts, it indexes all `.md` files in the project, wiki, and configured paths.
- Given the knowledge base is updated (file changes, new docs), when the proxy detects the change, it re-indexes the affected files incrementally.

### Configuration
- Given a user wants to control the proxy, when they edit `opencode.jsonc`, they can configure: similarity threshold, fallback behavior, knowledge sources, cache TTL, and enabled state.
- Given a user wants to add custom knowledge, when they place `.md` or `.txt` files in `.opencode/rag-knowledge/`, the proxy indexes them on startup.

## Implementation Notes

- New plugin: `plugins/rag-proxy.ts` — hooks into `tool.execute.before` for model call events
- Vector store: File-based HNSW index (no external service) or SQLite with `sqlite-vec`
- Embeddings: `@xenova/transformers` (ONNX-based, runs in-process) for local embedding — zero outbound calls
- Chunking: Split documents into 512-token chunks with 128-token overlap
- Threshold: Configurable, default 0.85 similarity (cosine); store chunk metadata (source file, line range, hash)
- Cache TTL: Default 24h for provider responses cached locally
- Privacy: All embedding and retrieval is local; data never leaves the machine when RAG answers

## Definition of Done

- [ ] RAG proxy plugin intercepts model calls and queries local vector store
- [ ] Fallthrough to LLM provider when confidence is below threshold
- [ ] Local embedding with zero outbound network calls
- [ ] Incremental indexing of project `.md` files, wiki, and `.opencode/rag-knowledge/`
- [ ] Configuration in `opencode.jsonc` (threshold, sources, cache TTL)
- [ ] Response caching from provider for future local answers
- [ ] Comprehensive unit tests for embedding, retrieval, fallthrough logic
- [ ] E2E test: query answered locally vs forwarded to provider
- [ ] Wiki documentation updated with architecture, configuration, and usage
