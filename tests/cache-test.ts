import { createHash } from "node:crypto"
import fs from "node:fs"
import path from "node:path"
import os from "node:os"

/**
 * Unit tests for the supply-chain-guard cache logic.
 * Runs against an isolated temp file — no side effects on the real cache.
 * Exit 0 = all pass, exit 1 = failure.
 */

// --- Replicate cache functions from supply-chain-guard.ts ---

function md5(content: string | Buffer): string {
  return createHash("md5").update(content).digest("hex")
}

interface CacheEntry {
  lockfileHash: string
  recipesHash: string
  findingsCount: number
  scannedAt: string
  ecosystem: string
}

type Cache = Record<string, CacheEntry>

function loadCache(cacheFile: string): Cache {
  try {
    return JSON.parse(fs.readFileSync(cacheFile, "utf8"))
  } catch {
    return {}
  }
}

function saveCache(cache: Cache, cacheFile: string): void {
  fs.writeFileSync(cacheFile, JSON.stringify(cache, null, 2), "utf8")
}

// --- Test harness ---

let passed = 0
let failed = 0

function assert(label: string, condition: boolean) {
  if (condition) {
    passed++
  } else {
    failed++
    console.error(`  FAIL: ${label}`)
  }
}

// --- Tests ---

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "scg-cache-test-"))
const cacheFile = path.join(tmpDir, "cache.json")

try {
  // 1. Load from non-existent file returns empty object
  const empty = loadCache(cacheFile)
  assert("load non-existent returns empty", Object.keys(empty).length === 0)

  // 2. Write and read back
  const entry: CacheEntry = {
    lockfileHash: md5("lockfile-content-v1"),
    recipesHash: md5("recipes-content-v1"),
    findingsCount: 5,
    scannedAt: "2026-03-12",
    ecosystem: "npm/yarn/pnpm/bun",
  }
  const cache: Cache = { "/project::npm/yarn/pnpm/bun": entry }
  saveCache(cache, cacheFile)
  const reloaded = loadCache(cacheFile)
  assert("write+read roundtrip", JSON.stringify(reloaded) === JSON.stringify(cache))

  // 3. Cache hit: same lockfile + recipes, lockfile unchanged before/after
  const cached = reloaded["/project::npm/yarn/pnpm/bun"]!
  const lockBefore = md5("lockfile-content-v1")
  const lockAfter = md5("lockfile-content-v1")
  const recipesNow = md5("recipes-content-v1")
  const isHit =
    cached.lockfileHash === lockAfter &&
    cached.recipesHash === recipesNow &&
    lockBefore === lockAfter
  assert("cache hit when nothing changed", isHit === true)

  // 4. Cache miss: lockfile changed (new dep installed)
  const lockAfterInstall = md5("lockfile-content-v2")
  const isMissLockfile =
    cached.lockfileHash === lockAfterInstall &&
    cached.recipesHash === recipesNow &&
    lockBefore === lockAfterInstall
  assert("cache miss when lockfile changed", isMissLockfile === false)

  // 5. Cache miss: recipes changed (new rules added)
  const newRecipes = md5("recipes-content-v2")
  const isMissRecipes =
    cached.lockfileHash === lockAfter &&
    cached.recipesHash === newRecipes &&
    lockBefore === lockAfter
  assert("cache miss when recipes changed", isMissRecipes === false)

  // 6. Cache miss: lockfile changed between before and after (even if after matches cache)
  // This catches the case where install restored the original lockfile content
  // but something did change during the process
  const lockBeforeDifferent = md5("lockfile-content-v0")
  const isMissBeforeAfterDiffer =
    cached.lockfileHash === lockAfter &&
    cached.recipesHash === recipesNow &&
    lockBeforeDifferent === lockAfter
  assert("cache miss when before != after (even if after matches cache)", isMissBeforeAfterDiffer === false)

  // 7. Multiple ecosystems in same workdir
  cache["/project::composer"] = {
    lockfileHash: md5("composer-lock-v1"),
    recipesHash: recipesNow,
    findingsCount: 2,
    scannedAt: "2026-03-12",
    ecosystem: "composer",
  }
  saveCache(cache, cacheFile)
  const multi = loadCache(cacheFile)
  assert("multiple ecosystems coexist", Object.keys(multi).length === 2)
  assert("npm entry preserved", multi["/project::npm/yarn/pnpm/bun"]?.findingsCount === 5)
  assert("composer entry stored", multi["/project::composer"]?.findingsCount === 2)

  // 8. Findings count sums across passes (simulated)
  const totalFindings = 3 + 4 // deps pass + source pass
  cache["/project::npm/yarn/pnpm/bun"] = {
    ...entry,
    findingsCount: totalFindings,
  }
  saveCache(cache, cacheFile)
  const summed = loadCache(cacheFile)
  assert("findings count reflects sum of passes", summed["/project::npm/yarn/pnpm/bun"]?.findingsCount === 7)

  // 9. Old-format entries (without ecosystem field) don't break loading
  const rawCache = JSON.parse(fs.readFileSync(cacheFile, "utf8"))
  rawCache["/old-project"] = {
    lockfileHash: "abc123",
    recipesHash: "def456",
    findingsCount: 1,
    scannedAt: "2026-01-01",
    // no ecosystem field
  }
  fs.writeFileSync(cacheFile, JSON.stringify(rawCache, null, 2), "utf8")
  const withOld = loadCache(cacheFile)
  assert("old entries without ecosystem field load OK", withOld["/old-project"]?.findingsCount === 1)
  assert("new entries unaffected by old format", withOld["/project::npm/yarn/pnpm/bun"]?.findingsCount === 7)

} finally {
  // Clean up
  fs.rmSync(tmpDir, { recursive: true, force: true })
}

// --- Report ---

if (failed > 0) {
  console.error(`\nCache tests: ${failed} FAILED, ${passed} passed`)
  process.exit(1)
} else {
  console.error(`Cache tests: ${passed} passed`)
  process.exit(0)
}
