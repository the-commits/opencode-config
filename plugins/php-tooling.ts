import type { Plugin } from "@opencode-ai/plugin"
import path from "node:path"
import fs from "node:fs"

/**
 * PHP Tooling Plugin
 *
 * Auto-detects PHP projects at startup and injects Xdebug MCP server
 * configuration into the agent's context, so PHP debugging tools are
 * available without manual per-project config.
 *
 * Detection: checks for composer.json, composer.lock, or *.php files
 * in the project root directory.
 */

const PHP_INDICATORS = ["composer.json", "composer.lock", "artisan", "index.php"]

function isPhpProject(directory: string): boolean {
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

export const PhpTooling: Plugin = async ({ client, directory }) => {
	if (!isPhpProject(directory)) return {}

	await client.app.log({
		body: {
			service: "php-tooling",
			level: "info",
			message: `PHP project detected in ${directory} — Xdebug MCP available via project .opencode.jsonc`,
		},
	})

	return {
		event: async ({ event }) => {
			if (event.type === "session.created") {
				const session = event.properties as { id?: string }
				if (!session.id) return

				await client.session.prompt({
					path: { id: session.id },
					body: {
						noReply: true,
						parts: [
							{
								type: "text",
								text: [
									"## PHP Project Detected",
									"",
									"This is a PHP project. If you need to debug PHP code, the Xdebug MCP server",
									"can be enabled by adding this to the project's `.opencode.jsonc`:",
									"",
									"```jsonc",
									'{',
									'  "mcp": {',
									'    "xdebug": {',
									'      "type": "local",',
									'      "command": ["npx", "-y", "xdebug-mcp@latest"]',
									'    }',
									'  }',
									'}',
									"```",
									"",
									"This gives you breakpoints, step debugging, variable inspection, and stack traces.",
								].join("\n"),
							},
						],
					},
				})
			}
		},
	}
}
