**Home > Skills & Tools > SBOM Scan**

**Parent:** [[Skills-and-Tools|Skills & Tools]]
**Siblings:** [[Tools-Feature-Planning|Feature Planning]], [[Tools-Vulnerability-Handling|Vulnerability Handling]], [[Tools-Math|Math Tools]]

---

# SBOM Scan Tool

**Tool file:** `tools/sbom-scan.ts`
**Library:** `lib/sbom-scan.ts`
**Skill file:** `skills/sbom-scan/SKILL.md`

## Light

Sets up SBOM vulnerability scanning with Trivy in a GitHub Actions CI pipeline. Detects GitHub repos, generates the workflow file with SPDX SBOM generation and SARIF reporting, and optionally automates the full setup via `gh` CLI.

## Nitty-Gritty

### Flow

1. **`detectGitHubRepo(directory)`** -- Reads `.git/config` and matches `/github\.com[:/](owner)/(repo)/` with a regex. Returns `{ owner, repo }` or `null`.
2. **If not a GitHub repo** → Returns manual git init instructions.
3. **`writeWorkflowFile(directory)`** -- Creates `.github/workflows/sbom-scan.yml`. Idempotent: returns `{ status: "alreadyExists" }` if the file already exists.
4. **`detectGhCli()`** -- Runs `gh --version` then `gh auth status`. Returns `{ available, authenticated }`.
5. **If `gh` is ready** → Automates `git add`, `git commit`, `git push`, and triggers the workflow via `gh workflow run`.
6. **Otherwise** → Returns manual instructions via `buildManualInstructions()`.

### Generated Workflow

The workflow YAML (140 lines) generates:

- **Triggers:** `push` to `main`/`master`, `pull_request`, `workflow_dispatch`, scheduled daily at 09:30 UTC
- **SBOM generation:** Uses `anchore/sbom-action` to generate a SPDX-formatted SBOM
- **Trivy scan (blocking):** CRITICAL, HIGH, MEDIUM severities block the build (`exit-code: '1'`)
- **Trivy scan (informational):** LOW severities uploaded as SARIF to GitHub Security tab
- **SARIF upload:** Uses `github/codeql-action/upload-sarif` for results visibility

### Requirements

- GitHub repository (public or private)
- `gh` CLI (optional, for automation)
