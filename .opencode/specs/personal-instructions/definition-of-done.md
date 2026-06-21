# Definition of Done

## Code

- [ ] Detection internals extracted to `lib/personal-instructions-internals.ts` (mirrors `lib/php-tooling-internals.ts`)
- [ ] Plugin file created at `plugins/personal-instructions.ts` (only exports the Plugin function)
- [ ] Unit tests at `tests/personal-instructions/personal-instructions.test.ts` (mirrors `tests/php-tooling/php-tooling.test.ts` — `bun:test`, `tmpDir` setup/teardown)
- [ ] Idempotency E2E test — run setup twice, assert no duplicates, personal file never overwritten
- [ ] Cross-platform verification — only Node.js `fs` operations, no shell commands (no `child_process`, no `execSync`)
- [ ] No dead code — no unused functions, variables, or unreachable branches
- [ ] No `zod` dependency — use `tool.schema` natively
- [ ] Code style matches existing `php-tooling.ts` / `php-tooling-internals.ts` (tabs, no semicolons, same import ordering)

## Tests

- [ ] All unit tests pass: `SKIP_E2E=1 bun test`
- [ ] All E2E tests pass: `bun test tests/personal-instructions/`
- [ ] Pre-push hook passes (unit tests + secret scanning)

## Documentation

- [ ] `AGENTS.md` updated with the one-liner architecture note (this repo demonstrates the pattern)
- [ ] `README.md` updated to document the personal instructions feature
- [ ] `PROJECT.md` updated to list the new plugin in Project Architecture

## Commits

- [ ] Commits are granular — one logical change per commit, conventional commit format
- [ ] All commits GPG/SSH signed
