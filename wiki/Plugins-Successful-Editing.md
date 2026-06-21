**Home > Plugins > Successful Editing**

**Siblings:** [[Plugins-Env-Protection|Env Protection]], [[Plugins-Supply-Chain-Guard|Supply Chain Guard]], [[Plugins-PHP-Tooling|PHP Tooling]], [[Plugins-Personal-Instructions|Personal Instructions]]

---

# Successful Editing Plugin

**File:** `plugins/successful-editing.ts`

## Light -- What It Does

The Successful Editing plugin verifies that code edits made by the AI agent are syntactically and semantically correct by hooking into the IDE's Language Server Protocol (LSP) diagnostics. After the agent edits a file, this plugin listens for LSP diagnostic events and confirms when the edit results in zero errors.

It also supports optional auto-committing of successfully edited files when `granular_commits` is enabled in the project's `opencode.jsonc`.

## Nitty-Gritty -- How It Works

### Hook Architecture

The plugin hooks into `"tool.execute.after"` for the `"edit"` tool:

```typescript
export default function successfulEditing(ctx: PluginContext) {
  return {
    "tool.execute.after": async (input) => {
      if (input.tool !== "edit" || !input.output) return;

      const output = JSON.parse(input.output);
      // Check for LSP errors in the edit output
    },
  };
}
```

### LSP Error Detection

After an edit completes, the plugin inspects the output for the string `"LSP errors detected"`. If this string is present, it logs a skip message and does nothing further -- the agent should let the user fix errors manually before retrying.

If no LSP errors are detected, the edit is considered successful and `handleSuccessfulEdit()` is called.

### Auto-Commit Behavior: `handleSuccessfulEdit()`

This function:

1. **Reads the project config** -- Looks for `opencode.jsonc` or `opencode.json` in the project root to check if `"granular_commits": true` is set
2. **Commits if enabled** -- If `granular_commits` is true, it runs:
   ```
   git add <file>
   git commit -m "chore(auto): successful edit of <filename>"
   ```
   The commit body includes details about the auto-commit.
3. **Logs if disabled** -- If `granular_commits` is not set, it simply logs an info message noting the successful edit

### Error Handling

Auto-commit failures are caught and logged without crashing the plugin:
- Nothing to commit (file unchanged after edit)
- Git not configured in the environment
- File already staged from a previous operation

### Configuration

To enable auto-committing, add to your project's `opencode.jsonc`:

```json
{
  "granular_commits": true
}
```

### Replaced Approach

This plugin replaced an earlier approach that used `"lsp.client.diagnostics"` event listeners. That approach was abandoned because the LSP event fires for ALL diagnostic changes (including transitions to zero-error states) and carries no payload distinguishing success from failure -- making it unreliable for this use case.

### Edge Cases

- **Binary files:** The plugin only processes `edit` tool calls, not `write` or other file operations
- **Non-existent files:** If a config file doesn't exist yet when the plugin checks, it gracefully handles the missing file
- **CI environments:** Auto-commit fails silently in headless environments where git isn't configured
