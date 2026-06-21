#!/usr/bin/env node
/**
 * Verify dependency security per OWASP NPM Security Cheat Sheet.
 *
 * Checks:
 * 1. All dependencies in package.json are pinned (no ^ or ~ ranges)
 * 2. All packages in package-lock.json have integrity hashes
 * 3. package.json and package-lock.json versions match
 *
 * Cross-platform: uses only Node.js fs operations.
 *
 * Usage:
 *   node scripts/verify-deps.mjs          # verify, exit 1 on failure
 *   node scripts/verify-deps.mjs --quiet  # only output on failure
 *
 * Refs: https://cheatsheetseries.owasp.org/cheatsheets/NPM_Security_Cheat_Sheet.html
 */
import fs from "node:fs"
import path from "node:path"

const root = path.resolve(import.meta.dirname, "..")
const quiet = process.argv[2] === "--quiet"

let failures = 0

function fail(message) {
	console.error(`FAIL: ${message}`)
	failures++
}

// --- Check 1: All dependencies are pinned (no ^ or ~) ---
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf-8"))

const versionFields = [
	["dependencies", pkg.dependencies],
	["devDependencies", pkg.devDependencies],
	["overrides", pkg.overrides],
]

for (const [label, deps] of versionFields) {
	if (!deps) continue
	for (const [name, version] of Object.entries(deps)) {
		if (typeof version !== "string") continue
		if (version.startsWith("^") || version.startsWith("~")) {
			fail(`${label}.${name} uses range "${version}" — must be pinned to exact version`)
		}
	}
}

// --- Check 2: All packages in lock file have integrity hashes ---
const lock = JSON.parse(fs.readFileSync(path.join(root, "package-lock.json"), "utf-8"))

const packages = lock.packages || {}
let missingIntegrity = 0

for (const [pkgPath, info] of Object.entries(packages)) {
	if (pkgPath === "") continue // root package
	if (info.link) continue // symlinks don't have integrity
	if (info.extraneous) continue

	if (!info.integrity) {
		missingIntegrity++
		fail(`package-lock.json: ${pkgPath} missing integrity hash`)
	}
}

// --- Check 3: package.json and package-lock.json versions match ---
if (pkg.version !== lock.version) {
	fail(`version mismatch: package.json=${pkg.version}, package-lock.json=${lock.version}`)
}

// --- Summary ---
if (failures > 0) {
	console.error(`\n${failures} check(s) failed. See OWASP NPM Security Cheat Sheet for details.`)
	process.exit(1)
}

if (!quiet) {
	const totalPackages = Object.keys(packages).length - 1 // exclude root
	console.log(`OK: all dependencies pinned, ${totalPackages} packages have integrity hashes, versions match`)
}
