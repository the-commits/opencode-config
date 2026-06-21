# AGENTS.md — opencode-config

This repository is the **global OpenCode configuration** (`~/.config/opencode/`).
Changes here are distributed to all users. See `PROJECT.md` for detailed
development rules (loaded automatically by `.opencode/opencode.jsonc`).

> **Personal instructions:** Per-developer overrides can be placed in `.opencode/personal/AGENTS.md` (gitignored, not shared with the team).

## Critical Rules

- **Never use `opencode.json`** — only `opencode.jsonc`. If you find `opencode.json`, merge its contents into `opencode.jsonc` and delete it.
- **No `zod`** in dependencies. Use `tool.schema` from `@opencode-ai/plugin`.
- **All commits must be signed**: `git commit -S -m "type: message"`
- **Cross-platform**: All plugins, tools, and scripts must work on Windows (no WSL), macOS, and Linux. Use Node.js `fs`/`path`/`child_process` only — no shell commands (`grep`, `find`, `sed`, `awk`). The pre-push hook (`.husky/pre-push`) is the only exception.
- **Lock file**: After changing `package.json`, run `npm install` to sync `package-lock.json`, then verify with `rm -rf node_modules && npm ci`.

## Commands

| Command | What it does |
|---|---|
| `bun test` | All tests (unit + E2E, ~50s) |
| `SKIP_E2E=1 bun test` | 319 unit tests only (~100ms) |
| `bun test tests/supply-chain-guard/e2e.test.ts` | 7 E2E tests (requires semgrep, python3, go) |
| `tsc --noEmit` | Type check (unused vars/params, unreachable code) |
| `knip` | Dead code detection (unused exports, files, deps, types) |
| `node scripts/verify-deps.mjs` | OWASP compliance: pinned versions, integrity hashes, lock sync |
| `npx husky` | Set up git hooks (required after `npm install`) |

Pre-push hook runs in order: `tsc --noEmit` → `knip` → `verify-deps.mjs` → unit tests → E2E → secret scanning.

## Commits & Releases

- **Conventional commits**: `feat:`, `fix:`, `chore:`, `docs:`, `build(deps:)`
- **Granular**: one logical change per commit
- **Release flow**: `release/v<x.y.z>` branch → PR → squash merge → signed tag on `main` → CI auto-creates release
- **Pre-release checklist**: 11 items in `PROJECT.md` (version sync, all tests pass, specs pruned, wiki updated, signatures verified)
- **CI workflows** can't be validated locally (token scope) — push as a PR and let CI run.

## Config & Files

- **Wiki**: Git submodule at `wiki/` (`git@github.com:the-commits/opencode-config.wiki.git`). Update alongside code changes.
- **Specs**: `.opencode/specs/` — planning artifacts. Prune before releases: `node scripts/prune-specs.mjs`
- **Semgrep recipes**: `semgrep/recipes/` — 15 YAML files. Add a new file when supporting a new ecosystem.
- **Supply Chain Guard**: `plugins/supply-chain-guard/ecosystems.ts` defines supported package managers. Update when adding a new ecosystem.
- **Secret patterns**: `secrets/secret-patterns.txt` — prefix-based patterns for ripgrep. Refresh with `scripts/fetch-gitleaks-config.sh`.

## Security

When auditing a project's dependencies for supply chain backdoors:
```
semgrep --config ~/.config/opencode/semgrep/recipes/ --no-git-ignore --exclude='!node_modules' node_modules/
```

## Git Remotes

- **Never push without asking** — always get explicit confirmation first.
- **Never push to forks directly** — forks should only receive changes by syncing from upstream.
