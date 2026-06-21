# Feature: Access Control Inheritance

**Source:** OWASP RAG Security Cheat Sheet — Section 3 (Access Control Inheritance)
**Reference:** https://cheatsheetseries.owasp.org/cheatsheets/RAG_Security_Cheat_Sheet.html#access-control

## Problem

The RAG proxy indexes files from multiple sources with different sensitivity levels. Project source code, configuration files (opencode.jsonc), environment files, wiki pages, and dependency documentation may all be indexed into a single vector store. Without per-document or per-chunk access control, the RAG system may return sensitive content from a restricted file to a query that should not have access to that information.

For example:
- A query about "API keys" could return content from a `.env.example` file
- A query about "deployment secrets" could return content from a sensitive doc intended only for maintainers
- A query from a different project context could leak information from another project's indexed files

## User Story

As a developer using opencode-config's RAG proxy, I want per-document and per-chunk access control tags that restrict retrieval based on query context and file sensitivity, so that sensitive content is never returned inappropriately.

## Acceptance Criteria

### Sensitivity Tagging
- Given the proxy indexes a file, when it reads the file, it checks for sensitivity metadata in the file path pattern or frontmatter (e.g., `sensitivity: internal` in `.md` frontmatter).
- Given a file path matches known sensitivity patterns (e.g., `.env*`, `secrets/`, `.private/`), when indexed, the chunks are automatically tagged with the highest sensitivity level.
- Given a file has no explicit sensitivity, when indexed, it receives the default "public" tag.

### Query-Context Access Check
- Given a query is evaluated against the vector store, when results are retrieved, the proxy checks whether the current project context (project name, workspace root) is authorized for each chunk's sensitivity level.
- Given a chunk is tagged "internal" and the query originates from a different workspace, when the access check fails, the chunk is excluded from results.
- Given a chunk is tagged "secret" (e.g., from `.env`), when any query attempts to retrieve it, the chunk is excluded unless the user explicitly confirms via a prompt.

### Granularity Levels
- The proxy supports at least three sensitivity levels:
  - `public` — retrievable by any query (default for wiki, README, AGENTS.md)
  - `internal` — retrievable only within the same project workspace (project docs, specs)
  - `restricted` — retrievable only on explicit user confirmation (secrets, credentials, private configs)

### Override and Audit
- Given a user needs to access restricted content, when they authorize the access, the decision is logged with timestamp and workspace.
- Given a query accesses internal content, when the access is granted, the event is logged at INFO level.
- Given a query attempts to access restricted content and is denied, when the block occurs, the event is logged at WARN level with query text and chunk source.

## Implementation Notes

- Access module: `plugins/rag-proxy/access-control.ts`
- Sensitivity detection: File path patterns (`.env*`, `secrets/*`, `.private/*`), YAML frontmatter (`sensitivity:`), `.opencode/rag-access.jsonc` override file
- Workspace context: Use `workspaceRoot` from OpenCode plugin context
- User prompt for restricted access: Use the existing `question` tool pattern to ask user
- Audit log: Append-only JSONL file at `.opencode/rag-audit.jsonl`

## Definition of Done

- [ ] Sensitivity tagging on file path patterns and frontmatter
- [ ] Three sensitivity levels: public, internal, restricted
- [ ] Query-context access check restricts retrieval based on workspace
- [ ] User confirmation prompt for restricted content access
- [ ] Audit logging for all access decisions (granted and denied)
- [ ] `.opencode/rag-access.jsonc` for custom sensitivity overrides
- [ ] Unit tests for tagging, access checks, and audit logging
- [ ] Wiki documentation updated
