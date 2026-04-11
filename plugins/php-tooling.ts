import type { Plugin } from "@opencode-ai/plugin"
import path from "node:path"
import {
	isPhpProject,
	findProjectConfig,
	hasXdebugMcp,
	createConfigWithXdebug,
} from "../lib/php-tooling-internals"

/**
 * PHP Tooling Plugin
 *
 * Auto-detects PHP projects at startup. When detected:
 * 1. If no OpenCode config exists, creates `opencode.jsonc` with Xdebug MCP
 * 2. If a config exists but lacks xdebug, prompts the agent to ask the user
 *    before modifying it
 * 3. If xdebug is already configured, injects a context message
 *
 * IMPORTANT: This file must only export Plugin functions. OpenCode treats
 * every export as a plugin and calls it — non-function exports cause
 * "Plugin export is not a function" errors at startup.
 */

export const PhpTooling: Plugin = async ({ client, directory, worktree }) => {
	// Use worktree (git root) for project detection and config placement.
	// `directory` is CWD which may differ from the project root for global plugins.
	const projectDir = worktree || directory

	if (!isPhpProject(projectDir)) return {}

	const existingConfig = findProjectConfig(projectDir)

	if (!existingConfig) {
		const configPath = createConfigWithXdebug(projectDir)
		const configName = path.basename(configPath)

		await client.app.log({
			body: {
				service: "php-tooling",
				level: "info",
				message: `PHP project detected — created ${configName} with Xdebug MCP in ${projectDir}`,
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
										"## PHP Project Detected — Xdebug MCP Active",
										"",
										`This is a PHP project. Created \`${configName}\` with Xdebug MCP server.`,
										"You can set breakpoints, step through PHP execution, inspect variables,",
										"and analyze stack traces for debugging.",
									].join("\n"),
								},
							],
						},
					})
				}
			},
		}
	}

	// Config exists -- check if xdebug is already there
	const configName = path.basename(existingConfig)
	const alreadyHasXdebug = hasXdebugMcp(existingConfig)

	if (alreadyHasXdebug) {
		await client.app.log({
			body: {
				service: "php-tooling",
				level: "info",
				message: `PHP project detected — Xdebug MCP already configured in ${projectDir}`,
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
										"## PHP Project Detected — Xdebug MCP Active",
										"",
										`This is a PHP project with Xdebug MCP configured in \`${configName}\`.`,
										"You can set breakpoints, step through PHP execution, inspect variables,",
										"and analyze stack traces for debugging.",
									].join("\n"),
								},
							],
						},
					})
				}
			},
		}
	}

	// Config exists but no xdebug -- ask the user via the agent
	await client.app.log({
		body: {
			service: "php-tooling",
			level: "info",
			message: `PHP project detected — ${configName} exists but lacks Xdebug MCP. Will prompt user.`,
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
						parts: [
							{
								type: "text",
								text: [
									"## PHP Project Detected — Xdebug MCP Not Configured",
									"",
									`This is a PHP project with an existing \`${configName}\`, but it doesn't`,
									"include the Xdebug MCP server for PHP debugging.",
									"",
									"To enable PHP debugging (breakpoints, step execution, variable inspection),",
									`add this to \`${configName}\`:`,
									"",
									"```jsonc",
									'"xdebug": {',
									'  "type": "local",',
									'  "command": ["npx", "-y", "xdebug-mcp@latest"]',
									"}",
									"```",
									"",
									"(Add it inside the `mcp` key, creating it if needed.)",
									"",
									"Ask the user if they want you to add it. Restart OpenCode after to activate.",
								].join("\n"),
							},
						],
					},
				})
			}
		},
	}
}
