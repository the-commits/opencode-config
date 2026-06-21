**Home > Plugins > Supply Chain Guard**

**Siblings:** [[Plugins-Env-Protection|Env Protection]], [[Plugins-Successful-Editing|Successful Editing]], [[Plugins-PHP-Tooling|PHP Tooling]], [[Plugins-Personal-Instructions|Personal Instructions]]

---

# Supply Chain Guard Plugin

**Directory:** `plugins/supply-chain-guard/` (multi-module: 8 files)

## Light -- What It Does

The Supply Chain Guard plugin automatically runs Semgrep supply chain scans whenever you install or update packages. It covers nine package ecosystems, scanning both vendor directories (e.g., `node_modules/`, `vendor/`) and your project source code.

It uses smart caching to avoid redundant scans: if neither your lockfile nor the Semgrep recipes have changed since the last scan, it skips the scan entirely.

## Nitty-Gritty -- Architecture

The plugin is split into 8 focused modules following the Single Responsibility Principle:

| Module | File | Responsibility |
|--------|------|----------------|
| **Ecosystems** | `ecosystems.ts` | 9 ecosystem configs, install regex patterns, scan pass definitions |
| **Hashing** | `hashing.ts` | SHA-256 file/lockfile/recipe fingerprinting |
| **Cache** | `cache.ts` | Cache persistence, hit detection, stale entry eviction |
| **Detection** | `detection.ts` | Match bash commands to ecosystem install patterns |
| **Formatting** | `formatting.ts` | Transform Semgrep JSON output into readable summaries |
| **Scanner** | `scanner.ts` | Orchestrate Semgrep execution across scan passes |
| **Plugin** | `plugin.ts` | Wire hooks together, manage pending-call state |
| **Index** | `index.ts` | Barrel re-export of public API |

### Lifecycle Flow

```
User types "npm install"
       │
       ▼
tool.execute.before
  ├── detectInstalls("npm install")  → [ecosystem: npm]
  ├── hashLockfiles(workdir, lockfiles)  → "before" hash
  └── store PendingCall { detections, cwd, hashBefore }
       │
       ▼
[Bash tool runs: npm install executes]
       │
       ▼
tool.execute.after
  ├── hashLockfiles(workdir, lockfiles)  → "after" hash
  ├── hashRecipes(recipesDir)  → recipes hash
  ├── retrieve PendingCall by callID
  ├── for each detection:
  │     if isCacheHit → skip (append "cached" message)
  │     if cache miss → runScanPasses() → append output
  │     if lockfile exists → save cache entry
  └── delete PendingCall
```

### Module Details

#### 1. Ecosystems (`ecosystems.ts`)

Defines 9 `EcosystemConfig` objects, each with:
- **`name`** -- Human-readable label (e.g., `"npm/yarn/pnpm/bun"`)
- **`installPattern`** -- Regex to detect install commands (e.g., `/\b(npm|pnpm|yarn|bun)\b.*\b(install|add|ci|update|upgrade|i)\b(?:\s|$|;|&&|\|)/`)
- **`lockfiles`** -- Array of lockfile names to hash for change detection
- **`scanPasses`** -- Array of `{ label, target, flags }` defining semgrep invocations

Supported ecosystems:

| Ecosystem | Package Managers | Scans Lockfiles | Scan Passes |
|-----------|-----------------|-----------------|-------------|
| JS/TS | npm, pnpm, yarn, bun | `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`, `bun.lockb` | `node_modules/` + source |
| PHP | composer | `composer.lock` | `vendor/` + source |
| Ruby | bundler, gem | `Gemfile.lock` | `vendor/bundle/` + source |
| C#/.NET | dotnet, nuget | `packages.lock.json`, `obj/project.assets.json` | Source only |
| Java | maven, gradle | `gradle.lockfile`, `pom.xml`, `build.gradle`, `build.gradle.kts` | Source only |
| Python | pip, pip3, poetry, pipenv, uv | `poetry.lock`, `Pipfile.lock`, `requirements.txt`, `uv.lock` | Source only |
| Rust | cargo | `Cargo.lock` | Source only |
| Go | go modules | `go.sum` | Source only |
| C/C++ | conan, vcpkg | `conan.lock`, `vcpkg.json` | Source only |

#### 2. Hashing (`hashing.ts`)

- **`hashContent(content)`** -- SHA-256 digest of string/buffer
- **`hashFile(path)`** -- Hash a file on disk, returns `null` if missing
- **`hashLockfiles(workdir, lockfiles)`** -- Hashes the **first existing** lockfile only (in config order)
- **`hashRecipes(recipesDir)`** -- Concatenates all `.yaml`/`.yml` files sorted alphabetically, then hashes. Returns `"no-recipes"` if directory is missing

Important: Only the first existing lockfile is hashed. If `package-lock.json` and `yarn.lock` both exist, only `package-lock.json` is used.

#### 3. Cache (`cache.ts`)

- **Storage:** JSON file at `~/.config/opencode/.supply-chain-guard-cache.json`
- **Cache key format:** `"<absolute_workdir>::<ecosystem_name>"`
- **Cache entry:** `{ lockfileHash, recipesHash, findingsCount, scannedAt (ISO date), ecosystem }`
- **Eviction:** Entries older than 90 days removed on every `after` hook (lazy eviction)

Cache hit requires ALL of:
1. Cache entry exists for this workdir+ecosystem
2. `cached.lockfileHash === lockfileHashAfter` (lockfile unchanged during scan)
3. `cached.recipesHash === recipesHash` (recipes unchanged)
4. `lockfileHashBefore === lockfileHashAfter` (lockfile was actually modified by the install)

#### 4. Detection (`detection.ts`)

- **`detectInstalls(command)`** -- Tests the command string against ALL ecosystem patterns. Returns ALL matches (compound commands like `npm install && composer install` return 2).
- Uses regex terminators `(?:\s|$|;|&&|\|)` to avoid false matches on unrelated commands

Known behavior: `echo npm install` **does** match (no quotes), but `echo "npm install"` does **not** (the quote `"` isn't in the terminator set).

#### 5. Scanner (`scanner.ts`)

- **`runScanPasses({ scanPasses, workdir, recipesDir, ecoName, shell, log })`** -- Runs each scan pass sequentially
- Each pass constructs: `semgrep --config <recipesDir> [pass.flags...] --json <pass.target>`
- Checks if target path exists via `fs.access()` before running (skips with message if missing)
- Errors are caught and truncated to 500 characters; scan continues to next pass
- Uses an injected `ShellExecutor` function for testability

#### 6. Formatting (`formatting.ts`)

- **`formatFindings(stdout, ecoName)`** -- Parses Semgrep JSON output
- Shows up to 10 individual findings with 120-char code snippets
- Groups findings by `check_id` with counts
- Falls back to raw stdout (truncated to 2000 chars) if JSON parsing fails

#### 7. Plugin (`plugin.ts`)

- **`SupplyChainGuard(ctx, recipesDir?, cacheFilePath?)`** -- Plugin factory
- Uses a `Map<string, PendingCall>` keyed by `callID` to track pending scans
- `PendingCall` stores: `detections[]`, `cwd`, `lockfileHashesBefore` (Map per ecosystem)
- The `after` hook appends scan results to the existing bash output (does not replace it)
- Cache entries are only saved if `lockfileHashAfter` is non-null

### Edge Cases

- **No lockfile:** If no lockfile exists after install, the scan still runs but the result is **not cached**. Next identical command will re-scan.
- **Missing vendor dir:** If `node_modules/` doesn't exist (e.g., install failed), the scan pass is skipped silently
- **Concurrent installs:** Unique `callID`s per invocation ensure independent tracking
- **Compound commands:** `npm install && composer install` scans both ecosystems
- **Semgrep crash:** Errors are caught, truncated to 500 chars, and logged; scan continues to next pass
- **Project moved:** Old cache entries use absolute paths and become orphaned (abandoned, not evicted by time)
