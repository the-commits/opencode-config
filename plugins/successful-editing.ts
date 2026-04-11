import type { Plugin } from "@opencode-ai/plugin";

export const SuccessfulEditingPlugin: Plugin = async ({ client }) => {
	// We'll keep track of the files edited recently
	const editedFiles = new Set<string>();

	return {
		event: async ({ event }) => {
			if (event.type === "file.edited") {
				// Mark that this file was edited
				editedFiles.add(event.file);
			}

			if (event.type === "lsp.client.diagnostics") {
				// We check if the diagnostics are for a file we just edited
				if (editedFiles.has(event.file)) {
					// Are there any errors in the diagnostics?
					// Usually diagnostics contain an array of objects, where severity 1 = Error
					const hasErrors = event.diagnostics?.some(
						(d: any) => d.severity === 1 || d.severity === "Error" || d.severity === "error"
					);

					if (!hasErrors) {
						// No errors found! We emit our custom successful-editing event
						client.emit("successful-editing", {
							file: event.file,
							message: `Successfully edited ${event.file} with no LSP errors.`,
						});

						// Optional: Log it for debugging
						await client.app.log({
							body: {
								service: "successful-editing-plugin",
								level: "info",
								message: `Emitted successful-editing for ${event.file}`,
							},
						});

						// Remove the file from tracking since we successfully handled it
						editedFiles.delete(event.file);
					}
				}
			}
		},
	};
};
