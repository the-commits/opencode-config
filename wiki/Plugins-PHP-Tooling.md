**Home > Plugins > PHP Tooling**

**Siblings:** [[Plugins-Env-Protection|Env Protection]], [[Plugins-Successful-Editing|Successful Editing]], [[Plugins-Supply-Chain-Guard|Supply Chain Guard]], [[Plugins-Personal-Instructions|Personal Instructions]]

---

# PHP Tooling Plugin

**File:** `plugins/php-tooling.ts` (with internals in `lib/php-tooling-internals.ts`)

## Light -- What It Does

The PHP Tooling plugin auto-detects PHP projects at OpenCode startup and provisions [Xdebug MCP](https://github.com/kpanuragh/xdebug-mcp) configuration automatically. Xdebug MCP gives the AI agent step-through debugging capabilities: breakpoints, variable inspection, and stack trace analysis.

It only acts when a PHP project is detected and will not clobber existing Xdebug configuration.

## Nitty-Gritty -- How It Works

### PHP Project Detection: `isPhpProject()`

The plugin checks for the presence of any of these files in the project directory:
- `composer.json`
- `composer.lock`
- `artisan` (Laravel)
- `index.php`
- **Any** `.php` file via a glob search

It uses `worktree` (git root) to locate the project, not `directory` (CWD). This ensures consistent behavior regardless of which subdirectory the agent is currently in.

### State Machine

The plugin uses a deterministic state machine (mirroring the pattern from the Personal Instructions plugin):

1. **Not PHP** → Skip silently (no action)
2. **PHP detected, no project config exists** → Auto-create `opencode.jsonc` with Xdebug MCP config
3. **PHP detected, project config exists but lacks Xdebug** → Prompt the agent to ask the user before modifying
4. **PHP detected, Xdebug already configured** → Skip silently (idempotent)

### Config Creation: `createConfigWithXdebug()`

When creating a new `opencode.jsonc`, it writes:

```json
{
  "mcp": {
    "xdebug": {
      "type": "local",
      "command": ["npx", "-y", "xdebug-mcp@latest"]
    }
  }
}
```

The Xdebug MCP server runs via `npx` (requires Node.js). The `-y` flag auto-accepts the package prompt.

### Config Modification: `addXdebugToConfig()`

When an existing `opencode.jsonc` or `opencode.json` is found, the plugin:
1. Reads and parses the existing config
2. Checks if `mcp.xdebug` already exists
3. If missing, adds the xdebug block and writes back

### Cross-Platform Design

All operations use Node.js `fs` APIs exclusively -- no shell commands, no `child_process`. This ensures the plugin works on Windows without WSL, macOS, and Linux.

### Internals in `lib/php-tooling-internals.ts`

The detection and config management logic lives in `lib/php-tooling-internals.ts` so it can be unit-tested independently. This is necessary because OpenCode treats every export from a plugin file as a plugin function -- non-function exports would break plugin loading.

### Edge Cases

- **Mixed-language projects:** If a project has both PHP and non-PHP files, the plugin still provisions Xdebug (safe to have even without PHP usage)
- **Docker-based PHP:** Xdebug MCP supports Docker-based PHP setups natively
- **Existing config without xdebug:** The plugin prompts before modifying -- it never silently overwrites user settings
- **`npx` not available:** If Node.js is not installed, the MCP server won't start, but the config is still created (safe failure)
