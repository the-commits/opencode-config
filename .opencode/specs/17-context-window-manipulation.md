# Feature: Context Window Manipulation Protection

**Source:** OWASP RAG Security Cheat Sheet — Section 2 (Context Window Manipulation)
**Reference:** https://cheatsheetseries.owasp.org/cheatsheets/RAG_Security_Cheat_Sheet.html#context-window-manipulation

## Problem

When the RAG proxy retrieves chunks and constructs the context window for the LLM provider (on fallthrough) or for local answer synthesis, an attacker who controls one or more indexed documents can craft content that corrupts the entire context window. Techniques include:
- **Global Context Manipulation**: Inserting instructions at chunk boundaries that bleed into adjacent chunks, overriding system prompts or user instructions
- **Data Embedding Attacks**: Hiding malicious content in chunks that appear benign during retrieval but activate when concatenated in the context window

On fallthrough to the provider, the retrieved chunks are injected into the prompt. If a poisoned chunk contains instructions like "forget all previous instructions" or "ignore the system prompt", the provider may follow those injected instructions instead of the original prompt.

## User Story

As a developer using opencode-config's RAG proxy, I want context windows constructed from retrieved chunks to be sanitized and structurally isolated, so that injected instructions from a single compromised chunk cannot corrupt the entire context or override the system prompt.

## Acceptance Criteria

### Chunk Boundary Isolation
- Given the RAG proxy retrieves multiple chunks for a query, when they are assembled into a context window, each chunk is wrapped in a semantic boundary marker (e.g., `<|chunk_start source="file.md:42"|>...<|chunk_end|>`) that isolates it from adjacent chunks.
- Given a chunk contains injection patterns, when the context window is built, each chunk is independently validated before assembly; any chunk failing validation is removed and replaced with a placeholder noting the exclusion.

### System Prompt Protection
- Given the proxy constructs a prompt for the provider on fallthrough, when it includes retrieved chunks, the chunks are placed AFTER the system prompt in a clearly demarcated `<knowledge_base>` section, separated by delimiters from the user query.
- Given a retrieved chunk attempts to override the system prompt (e.g., contains "ignore system prompt"), when the chunk is detected, it is excluded and the event is logged.

### Chunk Truncation and Limit
- Given the total retrieved context exceeds the model's context window, when the proxy builds the prompt, it truncates chunks using a priority system (higher similarity = higher priority) rather than arbitrary truncation.
- Given truncation occurs, when chunks are cut mid-sentence, the proxy truncates at the nearest sentence boundary to avoid creating accidental instructions from partial content.

### Content Injection Detection Pipeline
- Given any chunk entering the context window, when it contains known injection signatures (base64-encoded instructions, zero-width characters, bidi text overrides), the chunk is flagged and removed.
- Given a chunk is removed for injection, when the remaining chunks still provide sufficient context (aggregate similarity > threshold), the answer is synthesized from the safe chunks.
- Given insufficient safe chunks remain after removal, when the aggregate similarity drops below threshold, the query falls through to the provider with NO retrieved context (no poisoning risk).

## Implementation Notes

- Context builder: `plugins/rag-proxy/context-builder.ts`
- Chunk delimiter: Use XML-like tags `<context source="...">` for clear separation in prompts
- Truncation strategy: Sentence-boundary-aware, priority-based on similarity score
- Injection scan: Run on each chunk independently before assembly (not after concatenation)
- Fallback to zero-context: If all chunks are poisoned, forward query with no retrieved context — provider may hallucinate less than being poisoned

## Definition of Done

- [ ] Chunk boundary isolation with semantic markers prevents inter-chunk bleeding
- [ ] System prompt protected — chunks placed after system prompt in separate section
- [ ] Priority-based truncation at sentence boundaries
- [ ] Per-chunk injection detection before context assembly
- [ ] Zero-context fallback when all chunks are poisoned
- [ ] Logging of all excluded chunks with source and reason
- [ ] Unit tests for context construction, boundary isolation, truncation
- [ ] Wiki documentation updated
