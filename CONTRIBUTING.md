# Contributing to opencode-config

This guide is for humans working on the opencode-config repository itself. If you're just using the config, see [README.md](README.md).

> AI agents: see `PROJECT.md` instead (loaded automatically via `opencode.jsonc`).

---

## Prerequisites

- [Node.js](https://nodejs.org) and npm (for dependency installation)
- [Bun](https://bun.sh) (test runner)
- [Semgrep](https://semgrep.dev) (required for E2E tests and supply chain scanning)
- [ripgrep](https://github.com/BurntSushi/ripgrep) (used by the pre-push hook)

### Install Bun

```bash
curl -fsSL https://bun.sh/install | bash
```

---

## Testing

Tests use [Bun's built-in test runner](https://bun.sh/docs/cli/test) (`bun:test`). Two tiers:

### Unit tests (~100ms)

158 tests across 10 modules covering the supply chain guard, PHP tooling, and the shared `resolveConfigDir` utility. Pure, fast, no external dependencies.

```bash
SKIP_E2E=1 bun test
```

### E2E integration tests (~50s)

7 tests that exercise the full plugin pipeline with real npm/pip/go installs and real Semgrep scans. Requires: `npm`, `semgrep`, `python3` (for venv), `go`.

```bash
bun test tests/supply-chain-guard/e2e.test.ts
```

| Test | What it verifies |
|---|---|
| Findings detection | Semgrep catches backdoor patterns in installed packages |
| Cache hit | Second identical install returns cached result |
| Cache bust | Changing a dependency invalidates cache and triggers rescan |
| pip ecosystem | Plugin detects and scans pip installs |
| go ecosystem | Plugin detects and scans go mod downloads |
| Multi-ecosystem | Single command with both npm and pip triggers both scans |
| No-lockfile edge | Plugin scans successfully without a lockfile (no caching) |

### Running everything

```bash
bun test
```

### Pre-push hook

Both tiers run automatically on `git push` via the Husky pre-push hook. Unit tests run first (fast fail), then E2E. The hook also runs secret scanning on all tracked files.

Skip E2E for faster pushes:

```bash
SKIP_E2E=1 git push
```

---

## Commit conventions

- Use [conventional commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `chore:`, `docs:`, `build(deps):`.
- One logical change per commit. Keep commits granular and focused.
- We follow strict [Semantic Versioning](https://semver.org/). When releasing, update the version in `package.json`, `README.md` (checkout instructions), and any other files referencing the tag.

---

## Project-specific dev rules

`PROJECT.md` and `opencode.jsonc` contain rules that only apply when developing this repo (not when using it as a config). These are loaded automatically by OpenCode agents working in this directory. See `PROJECT.md` for details.
