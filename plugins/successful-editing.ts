import fs from "node:fs/promises";
import path from "node:path";
import type { Plugin } from "@opencode-ai/plugin";

/**
 * Successful Editing Plugin
 *
 * Hooks into tool.execute.after for the "edit" tool. If the edit output
 * does NOT contain LSP error diagnostics, the edit is considered successful
 * and (optionally) auto-committed.
 *
 * This avoids the lsp.client.diagnostics event which fires for ALL
 * diagnostic changes (including zero-error results) and carries no payload.
 */

export const SuccessfulEditingPlugin: Plugin = async ({ client, $, directory, worktree }) => {
	const projectDir = worktree || directory;

	const hasGranularCommitsEnabled = async () => {
		for (const filename of ["opencode.jsonc", "opencode.json"]) {
			try {
				const configPath = path.join(projectDir, filename);
				const content = await fs.readFile(configPath, "utf-8");
				if (content.includes('"granular_commits": true')) {
					return true;
				}
			} catch {
				// File doesn't exist
			}
		}
		return false;
	};

	const handleSuccessfulEdit = async (file: string) => {
		const autoCommit = await hasGranularCommitsEnabled();
		if (autoCommit) {
			try {
				const fileName = path.basename(file);
				await $`git add ${file}`;
				const result = await $`git commit -m "chore(auto): successful edit of ${fileName}" -m "Auto-committed by successful-editing plugin."`;

				if (result.exitCode === 0) {
					await client.app.log({
						body: {
							service: "successful-editing",
							level: "info",
							message: `Auto-committed ${file}`,
						},
					});
				}
			} catch (e: any) {
				await client.app.log({
					body: {
						service: "successful-editing",
						level: "info",
						message: `Auto-commit skipped for ${file}: ${e.message}`,
					},
				});
			}
		} else {
			await client.app.log({
				body: {
					service: "successful-editing",
					level: "info",
					message: `Successful edit: ${file} (no auto-commit)`,
				},
			});
		}
	};

	return {
		"tool.execute.after": async (input, output) => {
			if (input.tool !== "edit") return;

			const file = input.args?.filePath as string;
			if (!file) return;

			// OpenCode appends LSP error text to the edit output when errors exist
			const hasLspErrors = output.output?.includes("LSP errors detected");

			if (hasLspErrors) {
				await client.app.log({
					body: {
						service: "successful-editing",
						level: "info",
						message: `LSP errors after editing ${file}, skipping`,
					},
				});
				return;
			}

			await handleSuccessfulEdit(file);
		},
	};
};
