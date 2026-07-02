import type { Plugin } from "@opencode-ai/plugin"
import {
	detectState,
	PERSONAL_INSTRUCTIONS_PATH,
	PERSONAL_GITIGNORE_PATTERN,
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
 * Detection runs on one trigger:
 * - command.executed: when /init runs (re-check after AGENTS.md may have changed)
 *
 * All detection uses Node.js fs operations only — no shell commands.
 * Cross-platform: works on Windows without WSL, macOS, and Linux.
 *
 * IMPORTANT: This file must only export Plugin functions. OpenCode treats
 * every export as a plugin and calls it — non-function exports cause
 * "Plugin export is not a function" errors at startup.
 */

/** Build the prompt text for the "not set up" case. */
function buildFullSetupPrompt(): string {
	return [
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
		"This is informational only. If the user asks about setting up personal",
		"instructions, you can create all four items and confirm when done.",
	].join("\n")
}

/** Build the prompt text for the "partially set up" case. */
function buildPartialSetupPrompt(missing: string[]): string {
	return [
		"## Personal Per-Developer Instructions — Partially Set Up",
		"",
		"Some parts of the personal instructions setup are missing:",
		"",
		missing.join("\n"),
		"",
		"Only the missing items will be added. Existing correct content will not be modified.",
		"",
		"This is informational only. If the user asks about fixing the missing items,",
		"you can apply only the fixes needed and confirm what was done.",
	].join("\n")
}

/** Build the list of missing items for the partial state. */
function buildMissingList(state: ReturnType<typeof detectState>): string[] {
	const missing: string[] = []
	if (!state.personalFile) missing.push(`- \`${PERSONAL_INSTRUCTIONS_PATH}\` (file does not exist)`)
	if (!state.instructionsRef) missing.push(`- \`instructions\` array in \`opencode.jsonc\` (missing reference to \`${PERSONAL_INSTRUCTIONS_PATH}\`)`)
	if (!state.gitignoreCoverage) missing.push(`- \`.gitignore\` (missing \`${PERSONAL_GITIGNORE_PATTERN}\` pattern)`)
	if (!state.agentsNote) missing.push(`- \`AGENTS.md\` (missing architecture note about personal instructions)`)
	return missing
}

export const PersonalInstructions: Plugin = async ({ client, directory, worktree }) => {
	// Use worktree (git root) for project detection and config placement.
	// `directory` is CWD which may differ from the project root for global plugins.
	const projectDir = worktree || directory

	/** Check state and send a prompt to the session if setup is needed. */
	async function checkAndPrompt(sessionId: string): Promise<void> {
		const state = detectState(projectDir)

		const allPresent = state.personalFile && state.instructionsRef && state.gitignoreCoverage && state.agentsNote
		if (allPresent) return

		const nonePresent = !state.personalFile && !state.instructionsRef && !state.gitignoreCoverage && !state.agentsNote
		const text = nonePresent
			? buildFullSetupPrompt()
			: buildPartialSetupPrompt(buildMissingList(state))

		await client.session.prompt({
			path: { id: sessionId },
			body: {
				noReply: true,
				parts: [{ type: "text", text }],
			},
		})
	}

	// Initial detection at plugin load time (for logging)
	const initialState = detectState(projectDir)
	const allPresent = initialState.personalFile && initialState.instructionsRef && initialState.gitignoreCoverage && initialState.agentsNote

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

	const nonePresent = !initialState.personalFile && !initialState.instructionsRef && !initialState.gitignoreCoverage && !initialState.agentsNote
	await client.app.log({
		body: {
			service: "personal-instructions",
			level: "info",
			message: nonePresent
				? `Personal instructions not configured in ${projectDir}. Will prompt user.`
				: `Personal instructions partially configured in ${projectDir}. Will prompt user.`,
		},
	})

	return {
		event: async ({ event }) => {
			// Trigger: /init command executed (re-check after AGENTS.md may have changed)
			// SDK: properties.name, properties.sessionID
			if (event.type === "command.executed") {
				const cmd = event.properties as { name?: string; command?: string; sessionID?: string; sessionId?: string }
				const cmdName = cmd.name ?? cmd.command
				const sessionId = cmd.sessionID ?? cmd.sessionId
				if (cmdName !== "init" || !sessionId) return
				await checkAndPrompt(sessionId)
			}
		},
	}
}
