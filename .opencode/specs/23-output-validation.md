# Feature: RAG Output Validation

**Source:** OWASP RAG Security Cheat Sheet — Section 8 (Output Validation)
**Reference:** https://cheatsheetseries.owasp.org/cheatsheets/RAG_Security_Cheat_Sheet.html#output-validation

## Problem

When the RAG proxy synthesizes a local answer from retrieved chunks, the output is constructed from raw document content. If a poisoned or malformed chunk enters the context, the synthesized answer may contain:
- Malicious instructions or commands that the agent could execute
- Hallucinated information presented as if from the knowledge base
- Format corruptions (unclosed code blocks, malformed JSON, injection markers)
- Misattributed content (claiming a chunk said something it did not)

On fallthrough to the LLM provider, the provider's output is also potentially malicious if the provider is untrusted or if the prompt was manipulated via retrieved chunks. Output validation is a critical safety layer in both RAG-local and provider-fallthrough paths.

## User Story

As a developer using opencode-config's RAG proxy, I want all RAG-synthesized and provider-fallback outputs validated against injection patterns, structural integrity, and factual consistency with source chunks, so that no malicious or corrupted output reaches the agent.

## Acceptance Criteria

### Output Injection Detection
- Given the RAG proxy synthesizes a local answer, when the answer text is ready, it is scanned for prompt injection patterns (same patterns used for document poisoning: "ignore previous instructions", base64-encoded instructions, unicode attacks).
- Given an answer contains injection patterns, when detected, the output is rejected and a safe fallback message is returned: "Answer withheld — output contained potential injection patterns. [ref: <chunk-source>]"
- Given an answer passes injection scanning, when the result is returned to the agent, it includes the source citations as specified in the Source Attribution story.

### Structural Integrity Validation
- Given an answer contains code blocks (triple backticks), when the proxy validates the output, it verifies all code blocks are properly closed.
- Given an answer contains JSON or YAML, when the proxy validates the output, it checks for structural correctness (balanced braces, valid syntax) and logs a warning if malformed.
- Given an answer has structural issues but passes injection scanning, when the proxy detects minor issues, it attempts auto-repair (closing unclosed blocks) and logs the repair.

### Factual Consistency (Grounding Check)
- Given a RAG-local answer is synthesized from multiple chunks, when the output makes claims, the proxy verifies each claim can be traced back to at least one source chunk (simple containment check: does the source chunk contain the claimed text or a close paraphrase?).
- Given a claim in the output cannot be grounded to any source chunk, when detected, the ungrounded claim is flagged with an annotation `[ungrounded]` in the output.
- Given a RAG-local answer has more than 30% ungrounded content, when the proxy evaluates it, the entire answer is rejected and falls through to the provider (which may handle it better).

### Provider Fallback Output Validation
- Given the query falls through to the LLM provider, when the provider returns an answer, the answer is validated with the same injection and structural checks as RAG-local answers.
- Given a provider answer fails validation, when the proxy detects the issue, it returns a generic error and logs the provider output for analysis (debug mode only).

## Implementation Notes

- Output validation module: `plugins/rag-proxy/output-validation.ts`
- Reuse injection patterns from document poisoning module (single source of truth)
- Grounding check: Simple substring containment + TF-IDF overlap score; can be enhanced later
- Auto-repair: Close unclosed code blocks, fix unbalanced braces
- Provider output: Same validation pipeline; no special treatment for provider vs RAG

## Definition of Done

- [ ] Output injection detection using same patterns as document poisoning
- [ ] Structural integrity checks (code blocks, JSON, YAML)
- [ ] Auto-repair of minor structural issues with logging
- [ ] Factual grounding check against source chunks
- [ ] Ungrounded content flagged; reject if >30% ungrounded
- [ ] Provider fallback output validated with same pipeline
- [ ] Rejected outputs logged with reason and source
- [ ] Unit tests for injection detection, structural validation, grounding check
- [ ] Wiki documentation updated
