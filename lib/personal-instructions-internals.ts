/**
 * Personal Instructions — Internal helpers
 *
 * Extracted from the plugin so they can be tested without being exported
 * from the plugin file. OpenCode treats every export from a plugin file
 * as a plugin function, so non-function exports break plugin loading.
 *
 * All detection uses Node.js `fs` operations only — no shell commands,
 * no child_process. This ensures cross-platform compatibility (Windows
 * without WSL, macOS, Linux).
 */

import path from "node:path"
import fs from "node:fs"

/** Filenames OpenCode recognises as project config, in preference order. */
export const CONFIG_FILENAMES = ["opencode.jsonc", "opencode.json"]

/** Path to the personal instructions file, relative to project root. */
export const PERSONAL_INSTRUCTIONS_PATH = ".opencode/personal/AGENTS.md"

/** Pattern to add to .gitignore for personal instructions. */
export const PERSONAL_GITIGNORE_PATTERN = ".opencode/personal/*"

/** One-line note to add to AGENTS.md documenting the personal instructions architecture. */
export const PERSONAL_AGENTS_NOTE =
	"> **Personal instructions:** Per-developer overrides can be placed in `.opencode/personal/AGENTS.md` (gitignored, not shared with the team)."

/** Result of detecting the personal-instructions setup state. */
export interface PersonalInstructionsState {
	personalFile: boolean
	instructionsRef: boolean
	gitignoreCoverage: boolean
	agentsNote: boolean
}

/**
 * Check if the personal instructions file exists.
 * Uses fs.existsSync — no shell commands.
 */
export function hasPersonalFile(projectDir: string): boolean {
	return fs.existsSync(path.join(projectDir, PERSONAL_INSTRUCTIONS_PATH))
}

/**
 * Find the existing OpenCode project config file, if any.
 * Returns the full path to the first match, or null.
 */
function findProjectConfig(directory: string): string | null {
	for (const name of CONFIG_FILENAMES) {
		const candidate = path.join(directory, name)
		if (fs.existsSync(candidate)) return candidate
	}
	return null
}

/**
 * Strip JSONC single-line comments so the result can be JSON.parse'd.
 * Mirrors the approach in php-tooling-internals.ts.
 */
function stripJsoncComments(raw: string): string {
	return raw.replace(/^\s*\/\/.*$/gm, "")
}

/**
 * Check if the project config's instructions array references the personal
 * instructions file. Returns true if found, false otherwise (including when
 * no config file exists or the file is unparseable).
 */
export function hasInstructionsReference(projectDir: string): boolean {
	const configPath = findProjectConfig(projectDir)
	if (!configPath) return false

	try {
		const raw = fs.readFileSync(configPath, "utf-8")
		const stripped = stripJsoncComments(raw)
		const config = JSON.parse(stripped)
		return Array.isArray(config.instructions) && config.instructions.includes(PERSONAL_INSTRUCTIONS_PATH)
	} catch {
		return false
	}
}

/**
 * Check if .gitignore contains the personal instructions pattern.
 * Searches line-by-line for an exact match.
 */
export function hasGitignoreCoverage(projectDir: string): boolean {
	const gitignorePath = path.join(projectDir, ".gitignore")
	if (!fs.existsSync(gitignorePath)) return false

	try {
		const raw = fs.readFileSync(gitignorePath, "utf-8")
		const lines = raw.split("\n")
		return lines.includes(PERSONAL_GITIGNORE_PATTERN)
	} catch {
		return false
	}
}

/**
 * Check if AGENTS.md mentions the personal instructions path.
 * Searches for the path string anywhere in the file.
 */
export function hasAgentsNote(projectDir: string): boolean {
	const agentsPath = path.join(projectDir, "AGENTS.md")
	if (!fs.existsSync(agentsPath)) return false

	try {
		const raw = fs.readFileSync(agentsPath, "utf-8")
		return raw.includes(PERSONAL_INSTRUCTIONS_PATH)
	} catch {
		return false
	}
}

/**
 * Run all 4 detection checks and return the combined state.
 * This is the deterministic state used by the plugin's state machine.
 */
export function detectState(projectDir: string): PersonalInstructionsState {
	return {
		personalFile: hasPersonalFile(projectDir),
		instructionsRef: hasInstructionsReference(projectDir),
		gitignoreCoverage: hasGitignoreCoverage(projectDir),
		agentsNote: hasAgentsNote(projectDir),
	}
}
