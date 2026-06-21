# Developing opencode-config

This document contains specific instructions for AI agents and developers working on the `opencode-config` repository itself.

## Project Architecture
- `plugins/supply-chain-guard/` - Core supply chain scanning plugin (detection, scanner, cache, formatting, hashing, ecosystems).
- `semgrep/recipes/` - Custom Semgrep YAML rules for npm, PyPI, RubyGems, Composer, Maven/Gradle, NuGet, Cargo, Go, C/C++, C#, Java, PHP, Python, Ruby, Rust, JS/TS.
- `secrets/secret-patterns.txt` - Curated prefix-based regex patterns for the pre-push secret scanner.
- `tools/` - Custom tools: feature-planning, math, sbom-scan, vulnerability-handling.
- `commands/` - Custom slash commands: `/feature`, `/vuln`.
- `lib/` - Shared utilities (resolve-config-dir, sbom-scan, text-to-number, php-tooling-internals).
- `prompts/` - Agent mode prompts (analysis.txt, brainstorm.txt, build-meticulous.txt, scout.txt).
- `.husky/pre-push` - Pre-push hook: unit tests, E2E tests, secret scanning.
- `.opencode/opencode.jsonc` - Project-level opencode config (overrides global defaults).
- `.opencode/specs/` - Temporary feature spec files (tracked in Git for PR visibility, pruned before releases via `scripts/prune-specs.sh`).
- `.trivyignore` - Accepted Trivy vulnerability exceptions with re-evaluation dates.
- `opencode.jsonc` - The main global configuration template.
- `AGENTS.md` - The global agent guidelines template (system-wide, not project-specific).

## Requirements
- **Node.js**: v26 LTS (Current as of 2026). Managed via nvm (`.nvmrc`).
- **Package manager**: `npm` for dependency management (`package.json`, `package-lock.json`).
- **GitHub CLI (`gh`)**: Used for PRs, releases, and repository management.
- **SSH Agent**: Ensure `ssh-agent` is running and your GitHub key is added (`add2agent GitHub`) for authenticated operations.

## Development Rules
- **Code Quality**: No empty statements (like empty `catch` blocks). **Absolutely no dead code** -- no unused functions, no unused variables, no unreachable branches, no type-only overloads that serve no runtime purpose. If code is not called, delete it. Always handle errors appropriately and log them if necessary.
- **Commits**: You must use GRANULAR, focused commits (one logical change per commit). Use conventional commits (`feat:`, `fix:`, `chore:`, `docs:`, `build(deps):`). **All commits and tags MUST be GPG/SSH signed** to ensure they appear as "Verified" on GitHub.
- **SemVer**: We strictly follow [Semantic Versioning](https://semver.org/). On every release/push that warrants a new tag, you MUST ensure that `package.json`, `README.md` (e.g. checkout instructions), and any other files referencing the git tag version are updated accordingly.
- **Testing**: Use `bun test` for unit tests. Run E2E tests with `bun test tests/supply-chain-guard/e2e.test.ts`. Tests must pass before committing (enforced by the pre-push hook). CI workflows cannot be validated locally (token scope limitation); push as a PR and let CI run.
- **Releases**: Use `gh release create` for new releases. Ensure the tag is signed before pushing.
- **Supply Chain Guard**: If adding a new ecosystem, update `plugins/supply-chain-guard/ecosystems.ts`, add the corresponding semgrep recipes in `semgrep/recipes/`, and update the `README.md`. Supported ecosystems: npm/yarn/pnpm/bun, composer, dotnet/nuget, bundler/gem, maven/gradle, pip/poetry/pipenv/uv, cargo, go modules.
- **Secret Patterns**: When adding to `secrets/secret-patterns.txt`, ensure patterns are prefix-based to work efficiently with `ripgrep` in the `.husky/pre-push` hook. Run `scripts/fetch-gitleaks-config.sh` to refresh the reference gitleaks config.
- **OpenCode tools**: Do **not** add `zod` as an external dependency. Use `tool.schema` provided natively by `@opencode-ai/plugin` instead.
- **CI**: Prefer PR-based workflows. The GitHub token lacks `workflow` scope, so direct pushes modifying `.github/workflows/` are rejected. Create a branch and PR instead.

## Release Integrity
- **Signed tags, not just signed commits:** GitHub marks a release "Verified" only when the *tag object itself* is signed (`git tag -s`), not merely the commit it points to. A signed commit with an unsigned tag shows as "Unverified."
- **Immutable releases:** This repo enforces immutable tag rules. Once a tag is pushed, it cannot be deleted or overwritten remotely. Always verify locally with `git tag -v <tag>` before pushing.
- **Signing setup:** `ssh-agent` must be running with the GitHub key loaded (`add2agent GitHub`). GPG signing key is configured via `git config user.signingkey` with `gpg.format = openpgp`.
- **Release flow:** Bump version in `package.json` + `README.md` → commit with `-S` → `git tag -s v<x.y.z>` → push branch → push tag → `gh release create`.
- **Spec pruning:** Before tagging a release, run `./scripts/prune-specs.sh` to remove `.opencode/specs/`. Verify with `./scripts/prune-specs.sh --check` that no spec files remain. Specs are planning artifacts and must not ship in release tags.

## Context
When modifying this repository, remember that you are modifying the *global* configuration that will be distributed to all users. Keep `AGENTS.md` general enough for all projects, and keep `opencode.jsonc` clean.
