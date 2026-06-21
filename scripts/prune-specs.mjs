#!/usr/bin/env node
/**
 * Prune feature spec files before a release.
 *
 * Specs live in .opencode/specs/ and are tracked in Git for PR visibility,
 * but they are temporary planning artifacts that should not ship in releases.
 * This script removes them so the release tag stays clean.
 *
 * Cross-platform: uses only Node.js fs operations (no shell commands).
 *
 * Usage:
 *   node scripts/prune-specs.mjs          # prune specs
 *   node scripts/prune-specs.mjs --check  # exit 0 if clean, exit 1 if specs remain
 */
import fs from "node:fs"
import path from "node:path"

const root = path.resolve(import.meta.dirname, "..")
const SPECS_DIR = path.join(root, ".opencode", "specs")
const isCheckMode = process.argv[2] === "--check"

function hasSpecFiles(dir) {
	if (!fs.existsSync(dir)) return false
	return fs.readdirSync(dir).length > 0
}

if (isCheckMode) {
	if (hasSpecFiles(SPECS_DIR)) {
		console.error(`error: spec files remain in ${SPECS_DIR} — run node scripts/prune-specs.mjs before releasing`)
		process.exit(1)
	}
	process.exit(0)
}

if (fs.existsSync(SPECS_DIR)) {
	fs.rmSync(SPECS_DIR, { recursive: true, force: true })
	console.log(`pruned: ${SPECS_DIR}`)
} else {
	console.log(`clean: ${SPECS_DIR} does not exist`)
}
