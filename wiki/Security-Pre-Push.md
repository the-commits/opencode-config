**Home > Security & Hooks > Pre-Push Secret Scanning**

**Parent:** [[Security-and-Hooks|Security & Hooks]]
**Siblings:** [[Security-NPM-Hardening|NPM Hardening]]

---

# Pre-Push Secret Scanning

**File:** `.husky/pre-push`

## Light

A git hook that runs before every `git push`. It enforces a five-stage pipeline: type checking, dead code detection, dependency verification, unit tests, E2E integration tests, and secret scanning. If any stage fails, the push is blocked.

## Nitty-Gritty -- The 6-Stage Pipeline

| Stage | Command | What It Catches |
|-------|---------|-----------------|
| **1. Type check** | `npx tsc --noEmit` | Unused variables, unused parameters, unreachable code, type errors |
| **2. Dead code detection** | `npx knip` | Unused exports, unused files, unused dependencies, unused types |
| **3. Dependency verification** | `node scripts/verify-deps.mjs --quiet` | OWASP NPM Security compliance |
| **4. Unit tests** | `SKIP_E2E=1 bun test tests/` | Fast test suite (~1s) |
| **5. E2E tests** | `bun test tests/supply-chain-guard/e2e.test.ts` | Real Semgrep scans (~50s) |
| **6. Secret scanning** | Two-pass `rg` (ripgrep) | Potential secret leaks in git-tracked files |

### Implementation Details

- Uses `set +e` because Husky enables `set -e`, but `rg` exits with 1 on no matches (which is the success case here)
- All output goes to stderr (`>&2`) to avoid corrupting the OpenCode TUI
- The hook dynamically resolves `CONFIG_DIR` so it works regardless of where the repo is cloned
- Uses `PIPESTATUS` to capture the exit code of the subshell command (before the `sed` pipe)

### Secret Scanning -- Two-Pass Approach

#### Pass 1: Keyword-Context Patterns

Searches for assignments to known secret-related keys:

```sh
rg -in --column '(api.?key|secret|token|password|credential|private.?key)\s*[:=]\s*["\x27]?[A-Za-z0-9_\-/+=]{8,}'
```

This catches patterns like `api_key = "abc123"` or `password: "s3cret"`.

#### Pass 2: Prefix-Based Patterns

Uses `rg -f secrets/secret-patterns.txt` to match secrets by their **format prefix**. The file contains **72 patterns** covering:

| Category | Examples |
|----------|----------|
| Cloud providers | AWS `AKIA*`, GCP `AIza*` |
| AI/LLM | OpenAI `sk-proj-*`, Anthropic `sk-ant-*` |
| Git hosting | GitHub `ghp_*`, `github_pat_*`, GitLab `glpat-*` |
| Payment | Stripe `sk_live_*` |
| Communication | Slack, SendGrid, Mailgun |
| Package registries | npm, PyPI, Hugging Face |
| Infrastructure | Fly.io, Vault, 1Password |
| Private keys | `-----BEGIN RSA PRIVATE KEY-----` headers |

#### File Filtering

Both passes:
- Operate only on **git-tracked files** (`git ls-files -z`) to avoid scanning `node_modules/`, `.git/`, etc.
- Exclude `secrets/gitleaks.toml` (the reference config)
- Do **not block** on `rg` exit code individually -- they accumulate matches into `FOUND_SECRETS` and block at the end

### Pattern Derivation

The prefix patterns are curated from [gitleaks](https://github.com/gitleaks/gitleaks) v8.30.1 (MIT license). Unlike gitleaks, which uses entropy-based detection, this scanner uses only regex-based prefix patterns because `ripgrep` cannot evaluate entropy thresholds. The full gitleaks TOML can be fetched via `scripts/fetch-gitleaks-config.sh`.
