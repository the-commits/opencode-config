# Developing opencode-config

This document contains specific instructions for AI agents and developers working on the `opencode-config` repository itself.

## Project Architecture
- `plugins/supply-chain-guard/` - Core supply chain scanning plugin (detection, scanner, cache, formatting, hashing, ecosystems).
- `plugins/personal-instructions.ts` - Startup plugin that detects and prompts for per-developer personal instructions setup (`.opencode/personal/AGENTS.md`).
- `semgrep/recipes/` - Custom Semgrep YAML rules for npm, PyPI, RubyGems, Composer, Maven/Gradle, NuGet, Cargo, Go, C/C++, C#, Java, PHP, Python, Ruby, Rust, JS/TS.
- `secrets/secret-patterns.txt` - Curated prefix-based regex patterns for the pre-push secret scanner.
- `tools/` - Custom tools: feature-planning, math, sbom-scan, vulnerability-handling.
- `commands/` - Custom slash commands: `/feature`, `/vuln`.
- `lib/` - Shared utilities (resolve-config-dir, sbom-scan, text-to-number, php-tooling-internals, personal-instructions-internals).
- `prompts/` - Agent mode prompts (analysis.txt, brainstorm.txt, build-meticulous.txt, scout.txt).
- `.husky/pre-push` - Pre-push hook: type check (tsc), dead code detection (knip), dependency verification (verify-deps.mjs), unit tests, E2E tests, secret scanning.
- `tsconfig.json` - TypeScript config with `noUnusedLocals`, `noUnusedParameters`, `allowUnreachableCode: false` for dead code prevention.
- `knip.jsonc` - Knip config for cross-file dead code detection (unused exports, files, dependencies, types).
- `.npmrc` - NPM hardening: `ignore-scripts=true` (blocks malicious lifecycle scripts), `save-exact=true` (pins exact versions).
- `scripts/verify-deps.mjs` - OWASP NPM Security compliance check: pinned versions, integrity hashes, lock file sync.
- `.opencode/opencode.jsonc` - Project-level opencode config (overrides global defaults).
- `.opencode/specs/` - Temporary feature spec files (tracked in Git for PR visibility, pruned before releases via `scripts/prune-specs.mjs`).
- `.trivyignore` - Accepted Trivy vulnerability exceptions with re-evaluation dates.
- `opencode.jsonc` - The main global configuration template.
- `AGENTS.md` - The global agent guidelines template (system-wide, not project-specific).

## Requirements
- **Node.js**: v26 LTS (Current as of 2026). Managed via nvm (`.nvmrc`).
- **Package manager**: `npm` for dependency management (`package.json`, `package-lock.json`).
- **GitHub CLI (`gh`)**: Used for PRs, releases, and repository management.
- **SSH Agent**: Ensure `ssh-agent` is running and your GitHub key is added (`add2agent GitHub`) for authenticated operations.

## Development Rules
- **Code Quality**: No empty statements (like empty `catch` blocks). **Absolutely no dead code** -- no unused functions, no unused variables, no unreachable branches, no type-only overloads that serve no runtime purpose. If code is not called, delete it. Always handle errors appropriately and log them if necessary. Enforced by `tsc --noEmit` (intra-file: unused vars, params, unreachable code) and `knip` (cross-file: unused exports, files, dependencies, types) in the pre-push hook.
- **Cross-platform**: All scripts, plugins, and tools MUST work on Windows without WSL, macOS, and Linux. Use Node.js APIs (`fs`, `path`, `child_process` with cross-platform flags) instead of shell commands (`grep`, `find`, `sed`, `awk`). No bash-only scripts in the release flow — use Node.js (`.mjs`) scripts instead. The pre-push hook (`.husky/pre-push`) is the only exception as it runs in a POSIX shell provided by Husky on all platforms.
- **Commits**: You must use GRANULAR, focused commits (one logical change per commit). Use conventional commits (`feat:`, `fix:`, `chore:`, `docs:`, `build(deps):`). **All commits and tags MUST be GPG/SSH signed** to ensure they appear as "Verified" on GitHub.
- **SemVer**: We strictly follow [Semantic Versioning](https://semver.org/). On every release/push that warrants a new tag, you MUST ensure that `package.json`, `package-lock.json`, `README.md` (e.g. checkout instructions), and any other files referencing the git tag version are updated accordingly.
- **Lock file sync**: When updating `package.json` (version, dependencies, or overrides), ALWAYS run `npm install` to regenerate `package-lock.json`, then verify with `npm ci` from a clean state (`rm -rf node_modules && npm ci`) that everything is synced and installable. A stale lock file will break `npm ci` for users.
- **Testing**: Use `bun test` for unit tests. Run E2E tests with `bun test tests/supply-chain-guard/e2e.test.ts`. Tests must pass before committing (enforced by the pre-push hook). CI workflows cannot be validated locally (token scope limitation); push as a PR and let CI run.
- **Documentation**: When adding or changing a feature, ALWAYS update `README.md` (user-facing docs), `PROJECT.md` (architecture listing), `CONTRIBUTING.md` (test counts, dev setup), and `AGENTS.md` (agent guidelines) as needed. Docs are part of the release — stale docs are a bug.
- **Releases**: Use `gh release create` for new releases. Ensure the tag is signed before pushing.
- **Supply Chain Guard**: If adding a new ecosystem, update `plugins/supply-chain-guard/ecosystems.ts`, add the corresponding semgrep recipes in `semgrep/recipes/`, and update the `README.md`. Supported ecosystems: npm/yarn/pnpm/bun, composer, dotnet/nuget, bundler/gem, maven/gradle, pip/poetry/pipenv/uv, cargo, go modules.
- **Secret Patterns**: When adding to `secrets/secret-patterns.txt`, ensure patterns are prefix-based to work efficiently with `ripgrep` in the `.husky/pre-push` hook. Run `scripts/fetch-gitleaks-config.sh` to refresh the reference gitleaks config.
- **OpenCode tools**: Do **not** add `zod` as an external dependency. Use `tool.schema` provided natively by `@opencode-ai/plugin` instead.
- **NPM Security**: Follow the [OWASP NPM Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/NPM_Security_Cheat_Sheet.html). All dependencies MUST be pinned to exact versions (no `^` or `~` ranges). `.npmrc` enforces `ignore-scripts=true` (blocks malicious lifecycle scripts) and `save-exact=true` (pins new installs). `scripts/verify-deps.mjs` checks pinning, integrity hashes, and lock file sync in the pre-push hook. When adding a new dependency, allow new package versions some time to circulate before upgrading — don't rush to the latest version. Run `npx husky` manually after `npm install` since `ignore-scripts=true` disables the `prepare` script.
- **CI**: Prefer PR-based workflows. The GitHub token lacks `workflow` scope, so direct pushes modifying `.github/workflows/` are rejected. Create a branch and PR instead.
- **PR merges**: ALWAYS squash merge PRs (`gh pr merge <n> --squash --delete-branch`). This keeps the commit history clean with one commit per PR. After merging, sync locally: `git checkout main && git pull origin main && git remote prune origin`. Delete the local branch: `git branch -d <branch-name>`.

## Release Integrity
- **Signed tags, not just signed commits:** GitHub marks a release "Verified" only when the *tag object itself* is signed (`git tag -s`), not merely the commit it points to. A signed commit with an unsigned tag shows as "Unverified."
- **Immutable releases:** This repo enforces immutable tag rules. Once a tag is pushed, it cannot be deleted or overwritten remotely. Always verify locally with `git tag -v <tag>` before pushing.
- **Signing setup:** `ssh-agent` must be running with the GitHub key loaded (`add2agent GitHub`). GPG signing key is configured via `git config user.signingkey` with `gpg.format = openpgp`.
- **Release flow:** Bump version in `package.json` + `package-lock.json` + `README.md` → commit with `-S` → `git tag -s v<x.y.z>` → push branch → push tag → `gh release create`.
- **Spec pruning:** Before tagging a release, run `node scripts/prune-specs.mjs` to remove `.opencode/specs/`. Verify with `node scripts/prune-specs.mjs --check` that no spec files remain. Specs are planning artifacts and must not ship in release tags.
- **Pre-release checklist:** Before tagging, verify ALL of the following:
  1. `package.json` and `package-lock.json` versions match (run `npm install` to sync, then `rm -rf node_modules && npm ci` to verify clean install)
  2. `README.md` checkout instructions reference the new tag version
  3. `CONTRIBUTING.md` test counts match actual test counts (`SKIP_E2E=1 bun test`)
  4. `PROJECT.md` architecture listing is up to date
  5. `AGENTS.md` reflects current agent guidelines
  6. All tests pass: `SKIP_E2E=1 bun test` (unit) and `bun test tests/supply-chain-guard/e2e.test.ts` (E2E)
  7. Semgrep scan runs clean on source: `semgrep --config semgrep/recipes/ .` (0 findings expected on project source)
  8. Specs pruned: `node scripts/prune-specs.mjs` then `node scripts/prune-specs.mjs --check` (exit 0)
  9. Tag is signed: `git tag -s v<x.y.z>` (verify with `git tag -v v<x.y.z>` before pushing)

## Context
When modifying this repository, remember that you are modifying the *global* configuration that will be distributed to all users. Keep `AGENTS.md` general enough for all projects, and keep `opencode.jsonc` clean.
