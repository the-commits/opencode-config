**Home > Skills & Tools**

**Siblings:** [[Plugins|Plugins]], [[Semgrep-Recipes|Semgrep Recipes]], [[Agent-Modes|Agent Modes]], [[MCP-Servers|MCP Servers]], [[Security-and-Hooks|Security & Hooks]], [[Agent-Guidelines|Agent Guidelines]]
**Children:** [[Tools-Feature-Planning|Feature Planning]], [[Tools-Vulnerability-Handling|Vulnerability Handling]], [[Tools-Math|Math Tools]], [[Tools-SBOM-Scan|SBOM Scan]]

---

# Skills & Custom Tools

## Light -- What They Are

opencode-config ships with three interactive skills (domain-specific workflows) and four custom tools that extend the agent's capabilities. Skills are loaded on demand via slash commands (`/feature`, `/vuln`), while tools are always available to the agent in every session.

There are two architectural patterns:

1. **Skill-loader** tools (feature-planning, vulnerability-handling) -- Thin loaders that read a `SKILL.md` from disk and inject its workflow into the agent's context. All the actual logic lives in the markdown files.

2. **Self-contained tools** (sbom-scan, math) -- Have their own complete implementation, delegating only deterministic helpers to shared libraries.

## Nitty-Gritty -- Tool by Tool

### Feature Planning (`tools/feature-planning.ts`)

**Type:** Skill-loader
**Slash command:** `/feature` (starts in **plan** mode)

Loads `skills/feature-planning/SKILL.md` and runs a 7-step agile planning workflow:

1. **Understand** the feature goal -- Clarify purpose, persona, desired outcome, constraints
2. **Write user stories** -- `As a [persona], I want [goal], so that [benefit]` format (INVEST criteria)
3. **Define acceptance criteria** -- Given/When/Then Gherkin syntax
4. **Split large stories** -- Workflow steps, data variations, business rule variations
5. **Estimate complexity** -- T-shirt sizing (XS, S, M, L, XL)
6. **Definition of Done** -- Customizable checklist
7. **Output feature spec** -- Structured markdown document

**Mode recommendation logic:** After estimation, recommends build-lite (all XS), build (S), or build-meticulous (any M+) mode for implementation. M+ stories are split down to S/XS first.

The tool resolves the config directory via `resolveConfigDir()` from `lib/resolve-config-dir.ts`, reads the SKILL.md, strips YAML frontmatter, and injects the body into the agent's context.

### Vulnerability Handling (`tools/vulnerability-handling.ts`)

**Type:** Skill-loader
**Slash command:** `/vuln` (starts in **analyze** mode)

Loads `skills/vulnerability-handling/SKILL.md` and runs a 7-step CVE/CWE handling workflow:

1. **Identify & classify** -- Determine the CWE category of the vulnerability
2. **Assess risk exposure** -- Decide: accept risk or proceed to fix
3. **Write site-wide CWE E2E test** -- Playwright test guarding the entire weakness class
4. **Fix the specific CVE** -- Isolated branch fix with TDD cycle (red-green-refactor)
5. **Version-lock the fix** -- E2E test that fails on upstream version change (includes date-based deadline)
6. **Document in PR description** -- Structured PR description
7. **Verify in CI** -- Green CI pipeline

**Key principle:** "CVE = the specific incident, CWE = the type of weakness. Fix the CVE, test against the CWE."

**Auto-discovery:** If no CVE is provided, the tool checks:
- GitHub repos: Dependabot alerts, SARIF results, SBOM data via `gh api`
- Local projects: Look for SBOM files or run `npm audit` / `composer audit` / `pip audit`

The skill's workflow includes automatic mode transitions: start in **analyze** (read-only), then switch to **build** mode for Steps 3-7.

### Math Tools (`tools/math.ts`)

**Type:** Self-contained

Exports four arithmetic tools: `math_add`, `math_subtract`, `math_multiply`, `math_divide`

Each tool accepts two string-typed arguments (`a`, `b`) that can be digit strings or number words in **5 languages**: English, Swedish, Spanish, German, French.

**Parsing:** Both arguments are run through `textToNumber()` from `lib/text-to-number.ts`, which handles:
- Direct numeric strings (`"42"`)
- Single words (`"fifty"`, `"tjugo"`, `"cuatro"`)
- Compound phrases (`"twenty three"`, `"two hundred fifty"`)
- Short vs. long scale context detection (US `"billion"` = 1e9 vs. UK/European = 1e12) via currency hints (`$` vs `£`)
- Multi-language connector words: `and`, `y` (Spanish), `und` (German), `och` (Swedish), `et` (French)

`math_divide` explicitly throws on division by zero.

### SBOM Scan (`tools/sbom-scan.ts`)

**Type:** Self-contained with helpers in `lib/sbom-scan.ts`

Sets up Trivy SBOM vulnerability scanning as a GitHub Actions CI pipeline.

**Flow:**
1. `detectGitHubRepo()` -- Reads `.git/config` and matches a GitHub remote URL pattern
2. If not a GitHub repo, returns manual git init instructions
3. `writeWorkflowFile()` -- Creates `.github/workflows/sbom-scan.yml` (idempotent)
4. `detectGhCli()` -- Checks if `gh` CLI is available and authenticated
5. If `gh` is ready: automates `git add`, `git commit`, `git push`, triggers workflow via `gh workflow run`
6. Otherwise: returns manual instructions via `buildManualInstructions()`

**Generated workflow features:**
- Triggers: `push` to `main`/`master`, `pull_request`, `workflow_dispatch`, scheduled daily (`cron: '30 09 * * *'`)
- SPDX SBOM generation via Anchore's `sbom-action`
- Trivy vulnerability scan with severity filtering:
  - CRITICAL/HIGH/MEDIUM → blocks the build (`exit-code: '1'`)
  - LOW → uploaded as SARIF to GitHub Security tab (informational)
- SARIF upload to GitHub Security tab

## Slash Commands

Defined in `commands/` directory:

| Command | Starts in | Description |
|---------|-----------|-------------|
| `/feature` | plan | Start an agile feature planning session |
| `/vuln` | analyze | Start a vulnerability handling session (CVE/CWE) |

Commands are thin entry points that specify which agent mode to invoke (via `agent:` field in frontmatter) and reference the corresponding skill. They pass user arguments via `$ARGUMENTS` placeholder.

## Shared Libraries (`lib/`)

| File | Purpose | Used By |
|------|---------|---------|
| `lib/resolve-config-dir.ts` | Resolves `~/.config/opencode` (via `OPENCODE_CONFIG_DIR` or `OPENCODE_CONFIG` env vars) | feature-planning, vulnerability-handling |
| `lib/text-to-number.ts` | Multi-language natural-language number parser (5 languages, short/long scale) | math tools |
| `lib/personal-instructions-internals.ts` | State detection + idempotent setup for per-developer instructions | Personal Instructions plugin |
| `lib/php-tooling-internals.ts` | PHP project detection + Xdebug MCP config management | PHP Tooling plugin |
| `lib/sbom-scan.ts` | GitHub repo detection, `gh` CLI detection, workflow generation | sbom-scan tool |

### Implementation Notes

- **No `zod` dependency:** The tools use `tool.schema` provided natively by `@opencode-ai/plugin` instead
- **JSONC handling:** Two lib files independently implement `stripJsoncComments()` for parsing `opencode.jsonc` (containing `//` comments), since `JSON.parse()` cannot handle JSONC
- **Testability extraction:** Internals files were extracted from plugins so they can be tested without OpenCode treating non-function exports as plugins
- **Cross-platform:** All operations use Node.js `fs` APIs exclusively (no shell commands)
