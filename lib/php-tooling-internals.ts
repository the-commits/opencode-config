/**
 * PHP Tooling — Internal helpers
 *
 * Extracted from the plugin so they can be tested without being exported
 * from the plugin file. OpenCode treats every export from a plugin file
 * as a plugin function, so non-function exports break plugin loading.
 */

import path from "node:path"
import fs from "node:fs"

/** Filenames OpenCode recognises as project config, in preference order. */
export const CONFIG_FILENAMES = ["opencode.jsonc", "opencode.json"]

export const PHP_INDICATORS = ["composer.json", "composer.lock", "artisan", "index.php"]

export const XDEBUG_MCP_CONFIG = {
	type: "local" as const,
	command: ["npx", "-y", "xdebug-mcp@latest"],
	enabled: true,
}

export function isPhpProject(directory: string): boolean {
	for (const indicator of PHP_INDICATORS) {
		if (fs.existsSync(path.join(directory, indicator))) return true
	}

	try {
		const entries = fs.readdirSync(directory)
		return entries.some((e) => e.endsWith(".php"))
	} catch {
		return false
	}
}

/**
 * Find the existing OpenCode project config file, if any.
 * Returns the full path to the first match, or null.
 */
export function findProjectConfig(directory: string): string | null {
	for (const name of CONFIG_FILENAMES) {
		const candidate = path.join(directory, name)
		if (fs.existsSync(candidate)) return candidate
	}
	return null
}

/**
 * Check if an existing config file already has xdebug MCP configured.
 * Returns null if the file can't be parsed.
 */
export function hasXdebugMcp(configPath: string): boolean | null {
	try {
		const raw = fs.readFileSync(configPath, "utf-8")
		const stripped = raw.replace(/^\s*\/\/.*$/gm, "")
		const config = JSON.parse(stripped)
		return !!config.mcp?.xdebug
	} catch {
		return null
	}
}

/**
 * Create a new opencode.jsonc with xdebug MCP config.
 * Only call when no config file exists.
 */
export function createConfigWithXdebug(directory: string): string {
	const configPath = path.join(directory, CONFIG_FILENAMES[0])
	const config = {
		mcp: {
			xdebug: XDEBUG_MCP_CONFIG,
		},
	}
	fs.writeFileSync(configPath, JSON.stringify(config, null, "\t") + "\n", "utf-8")
	return configPath
}

/**
 * Add xdebug MCP to an existing config file.
 * Returns true if modified, false if it couldn't be done.
 */
export function addXdebugToConfig(configPath: string): boolean {
	try {
		const raw = fs.readFileSync(configPath, "utf-8")
		const stripped = raw.replace(/^\s*\/\/.*$/gm, "")
		const config = JSON.parse(stripped)

		if (!config.mcp) config.mcp = {}
		config.mcp.xdebug = XDEBUG_MCP_CONFIG

		fs.writeFileSync(configPath, JSON.stringify(config, null, "\t") + "\n", "utf-8")
		return true
	} catch {
		return false
	}
}
