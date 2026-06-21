# Feature: Model Inversion and Membership Inference Prevention

**Source:** OWASP RAG Security Cheat Sheet — Section 10 (Model Inversion and Membership Inference)
**Reference:** https://cheatsheetseries.owasp.org/cheatsheets/RAG_Security_Cheat_Sheet.html#model-inversion-and-membership-inference

## Problem

The RAG proxy's vector store contains chunks extracted from the project's documents. An attacker with access to the RAG proxy (or its logs/debug output) can attempt model inversion and membership inference attacks to reconstruct the knowledge base contents:

- **Membership Inference**: Asking specific questions to determine whether a particular document or piece of information exists in the knowledge base (e.g., "What is the API key for production?" — if the answer cites a source, the attacker learns the API key exists in the KB)
- **Model Inversion**: Iteratively querying the RAG system to reconstruct the embedding space and ultimately extract the text of indexed documents
- **Differential Analysis**: Comparing responses with and without certain documents indexed to infer document contents

Since the RAG proxy runs locally, the primary threat is from malicious MCP tools, compromised dev dependencies, or co-tenants on shared dev machines who can interact with the proxy via the agent.

## User Story

As a developer using opencode-config's RAG proxy, I want model inversion and membership inference attacks mitigated, so that an attacker who can query the proxy cannot determine whether specific documents exist in the knowledge base or reconstruct their contents.

## Acceptance Criteria

### Confidence Threshold to Prevent Probing
- Given an attacker queries with a non-existent document title or phrase, when the proxy retrieves chunks, it uses the same similarity threshold for all queries — matching or not matching — returning a uniform "no relevant content found" response rather than distinguishing between "no match" (empty) and "match but below threshold" (partial).
- Given a query produces low-similarity results, when the proxy responds, it returns a generic message indistinguishable from a true no-match.

### Response Uniformity
- Given a query matches the knowledge base, when the proxy returns a RAG answer, the response format is identical to a provider-fallthrough response (both are returned as plain text answers with optional citations).
- Given a query does not match the knowledge base, when the proxy falls through to the provider, the response format is the same as a RAG answer (no observable difference in structure).
- Given debug mode is disabled (default), when the proxy returns any response, it does NOT reveal whether the answer came from RAG or the provider (unless the user explicitly enables this in config).

### Differential Privacy for Embeddings
- Given a document is indexed, when its chunks are embedded, a small amount of calibrated noise is added to the embeddings (differential privacy, ε=8) to prevent exact reconstruction of chunk text from the embedding vectors.
- Given an attacker collects many query embeddings, when they attempt to invert the embeddings to reconstruct text, the noise added during embedding frustrates exact reconstruction.

### Sensitive Content Hardening
- Given a document is tagged as `restricted` (per access control story), when it is indexed, the proxy applies additional safeguards: reduced chunk size (128 tokens vs 512), no overlap between chunks, and optional content hashing instead of full text storage.
- Given a restricted document chunk's embedding is exposed, when an attacker extracts the embedding vector, the reduced chunk size and lack of overlap limit the amount of reconstructable content.

## Implementation Notes

- Privacy module: `plugins/rag-proxy/privacy.ts`
- Response uniformity: Both RAG and provider responses wrapped in same output format
- Differential privacy: Add Laplace noise calibrated to ε=8 to embedding vectors (configurable)
- Restricted content: Reduced chunk size, no overlap, store hash + embedding instead of raw text for maximum security
- Generic no-match: "I don't have specific information about that in my knowledge base" — identical text for both no-match and below-threshold

## Definition of Done

- [ ] Uniform response format for RAG and provider answers (debug mode off)
- [ ] Generic no-match response indistinguishable from below-threshold response
- [ ] Differential privacy noise added to embeddings (ε=8)
- [ ] Restricted document hardening (reduced chunks, no overlap, hash-only storage option)
- [ ] User config to enable RAG-vs-provider origin disclosure
- [ ] Unit tests for response uniformity, DP noise, restricted hardening
- [ ] Wiki documentation updated
