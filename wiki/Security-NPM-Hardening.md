**Home > Security & Hooks > NPM Hardening**

**Parent:** [[Security-and-Hooks|Security & Hooks]]
**Siblings:** [[Security-Pre-Push|Pre-Push Secret Scanning]]

---

# NPM Hardening

**Files:** `.npmrc`, `package.json` (pinned versions), `scripts/verify-deps.mjs`

## Light

This config follows the [OWASP NPM Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/NPM_Security_Cheat_Sheet.html) to protect against supply chain attacks. Three layers of defense: lifecycle script blocking, exact version pinning, and automated integrity verification.

## Nitty-Gritty

### Layer 1: `.npmrc` Hardening

```ini
ignore-scripts=true
save-exact=true
```

**`ignore-scripts=true`** -- Disables all lifecycle scripts (`postinstall`, `prepare`, etc.) from all dependencies. This is the #1 defense against supply chain attacks -- malicious packages often exfiltrate secrets or deploy backdoors via `postinstall` scripts.

**Side effect:** The project's own `prepare` script (which sets up Husky git hooks) is also blocked. Run `npx husky` manually after `npm install` to re-enable hooks.

**`save-exact=true`** -- New dependencies are pinned to exact versions (no `^` or `~` ranges). Combined with `npm ci` enforcement, this ensures deterministic installs and prevents pulling in compromised newly-published minor/patch versions.

### Layer 2: Pinned Dependencies

All versions in `package.json` use exact versions (e.g., `"1.17.8"`, not `"^1.17.8"`). This is enforced by:
- `.npmrc` with `save-exact=true` for new installs
- `scripts/verify-deps.mjs` for checking existing dependencies
- Pre-push hook (stage 3) that blocks pushes if any dependency is unpinned

### Layer 3: `verify-deps.mjs` -- Three Automated Checks

**Check 1 -- Pin verification:** Iterates `dependencies`, `devDependencies`, and `overrides` in `package.json`. If any version string starts with `^` or `~`, it fails with the package name and the offending version.

**Check 2 -- Integrity hash verification:** Reads `package-lock.json` and iterates every entry in `packages`. For each non-root, non-link, non-extraneous package, it verifies the `integrity` field exists (SHA-512 base64 hash). Missing integrity means the lock file is stale or tampered with.

**Check 3 -- Version sync:** Asserts `package.json` version matches `package-lock.json` version. A mismatch means the lock file wasn't regenerated after a version bump.

With `--quiet`, only failure output is shown. Without it, a success message prints the total package count.

### Usage

```bash
# Manual verification
node scripts/verify-deps.mjs

# Quiet mode (failures only, for CI)
node scripts/verify-deps.mjs --quiet
```

### Global NPM Hardening (Recommended)

Apply the same protections to all npm projects on your machine:

```bash
npm config set ignore-scripts true --global
npm config set save-exact true --global
```
