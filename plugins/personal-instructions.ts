import type { Plugin } from "@opencode-ai/plugin"
import {
	detectState,
	createPersonalFile,
	addInstructionsReference,
	addGitignoreCoverage,
	addAgentsNote,
	PERSONAL_INSTRUCTIONS_PATH,
	PERSONAL_GITIGNORE_PATTERN,
	PERSONAL_AGENTS_NOTE,
} from "../lib/personal-instructions-internals"

/**
 * Personal Instructions Plugin
 *
 * Detects whether per-developer personal instructions are set up in the
 * project. Uses a deterministic state machine (mirrors the xdebug plugin):
 *
 * 1. All checks pass → log "already configured", skip
 * 2. All checks absent → prompt user to opt in to full setup
 * 3. Partial → prompt user listing only what's missing (per-item confirm)
 *
 * All detection uses Node.js fs operations only — no shell commands.
 * Cross-platform: works on Windows without WSL, macOS, and Linux.
 *
 * IMPORTANT: This file must only export Plugin functions. OpenCode treats
 * every export as a plugin and calls it — non-function exports cause
 * "Plugin export is not a function" errors at startup.
 */

export const PersonalInstructions: Plugin = async ({ client, directory, worktree }) => {
	// Use worktree (git root) for project detection and config placement.
	// `directory` is CWD which may differ from the project root for global plugins.
	const projectDir = worktree || directory

	const state = detectState(projectDir)

	const allPresent = state.personalFile && state.instructionsRef && state.gitignoreCoverage && state.agentsNote
	const nonePresent = !state.personalFile && !state.instructionsRef && !state.gitignoreCoverage && !state.agentsNote

	// Branch 1: All checks pass — already configured, skip
	if (allPresent) {
		await client.app.log({
			body: {
				service: "personal-instructions",
				level: "info",
				message: `Personal instructions already configured in ${projectDir}`,
			},
		})
		return {}
	}

	// Branch 2: All checks absent — prompt for full setup
	if (nonePresent) {
		await client.app.log({
			body: {
				service: "personal-instructions",
				level: "info",
				message: `Personal instructions not configured in ${projectDir}. Will prompt user.`,
			},
		})

		return {
			event: async ({ event }) => {
				if (event.type !== "session.created") return
				const session = event.properties as { id?: string }
				if (!session.id) return

				await client.session.prompt({
					path: { id: session.id },
					body: {
						parts: [
							{
								type: "text",
								text: [
									"## Personal Per-Developer Instructions — Not Set Up",
									"",
									"This project does not have personal per-developer instructions configured.",
									"This feature lets each developer have a gitignored `.opencode/personal/AGENTS.md`",
									"for agent customizations that are specific to them and not shared with the team.",
									"",
									"Setting it up will:",
									`- Create \`${PERSONAL_INSTRUCTIONS_PATH}\` with an info alert`,
									`- Add it to the \`instructions\` array in \`opencode.jsonc\``,
									`- Add \`${PERSONAL_GITIGNORE_PATTERN}\` to \`.gitignore\``,
									"- Add a one-line architecture note to `AGENTS.md`",
									"",
									"None of these files will be overwritten if they already exist.",
									"",
									"Ask the user if they want you to set this up. If they say yes, create all four",
									"and confirm when done. If they say no, do nothing.",
								].join("\n"),
							},
						],
					},
				})
			},
		}
	}

	// Branch 3: Partial — list only what's missing (Story 2b)
	const missing: string[] = []
	if (!state.personalFile) missing.push(`- \`${PERSONAL_INSTRUCTIONS_PATH}\` (file does not exist)`)
	if (!state.instructionsRef) missing.push(`- \`instructions\` array in \`opencode.jsonc\` (missing reference to \`${PERSONAL_INSTRUCTIONS_PATH}\`)`)
	if (!state.gitignoreCoverage) missing.push(`- \`.gitignore\` (missing \`${PERSONAL_GITIGNORE_PATTERN}\` pattern)`)
	if (!state.agentsNote) missing.push(`- \`AGENTS.md\` (missing architecture note about personal instructions)`)

	await client.app.log({
		body: {
			service: "personal-instructions",
			level: "info",
			message: `Personal instructions partially configured in ${projectDir}. Missing: ${missing.join(", ")}`,
		},
	})

	return {
		event: async ({ event }) => {
			if (event.type !== "session.created") return
			const session = event.properties as { id?: string }
			if (!session.id) return

			await client.session.prompt({
				path: { id: session.id },
				body: {
					parts: [
						{
							type: "text",
							text: [
								"## Personal Per-Developer Instructions — Partially Set Up",
								"",
								"Some parts of the personal instructions setup are missing:",
								"",
								missing.join("\n"),
								"",
								"Only the missing items will be added. Existing correct content will not be modified.",
								"",
								"Ask the user if they want you to fix the missing items. If they say yes,",
								"apply only the fixes needed and confirm what was done. If they say no, do nothing.",
							].join("\n"),
						},
					],
				},
			})
		},
	}
}
