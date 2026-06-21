**Home > Plugins > Env Protection**

**Siblings:** [[Plugins-Successful-Editing|Successful Editing]], [[Plugins-Supply-Chain-Guard|Supply Chain Guard]], [[Plugins-PHP-Tooling|PHP Tooling]], [[Plugins-Personal-Instructions|Personal Instructions]]

---

# Env Protection Plugin

**File:** `plugins/env-protection.ts`

## Light -- What It Does

The Env Protection plugin stops the AI agent from ever reading `.env` files. This prevents secrets, API keys, and other sensitive environment variables from appearing in agent logs, context windows, or being accidentally committed.

It intercepts three types of tool calls:

- **File reads** (`read`, `edit`, `write`, `patch`) on `.env` files
- **Bash commands** that display file contents (e.g., `cat .env`, `head .env`)
- **Grep searches** targeting `.env` file patterns

Allowed exceptions: `.env.example`, `.env.sample`, `.env.template` pass through without blocking.

## Nitty-Gritty -- How It Works

### Hook Architecture

The plugin hooks into `tool.execute.before` -- it fires **before** every tool call and decides whether to block or allow it.

```typescript
export default function envProtection(ctx: PluginContext) {
  return {
    "tool.execute.before": (input) => {
      // Check input.tool and input.args, block if needed
    },
  };
}
```

### Protected File Detection: `isProtectedEnvFile()`

This helper function determines whether a file path targets a protected `.env` file:

- **Matched (blocked):** Any basename containing `.env` -- this covers `.env`, `.env.local`, `.env.production`, `.env.development`
- **Allowed:** `.env.example`, `.env.sample`, `.env.template`
- **Detection:** `basename.includes(".env")` with exclusions for the allowlisted patterns

This means any variant of `.env.*` that isn't in the allowlist is blocked. For example, `.env.staging`, `.env.testing`, and `.env.docker` are all blocked.

### Bash Command Blocking

For the `bash` tool, the plugin uses a regex to match commands that would display `.env` file contents:

```
\b(cat|head|tail|less|more|bat|source|\.)\s+.*\.env\b
```

This matches:
- `cat .env`
- `head .env.local`
- `source .env`
- `. .env` (POSIX source shorthand)

It does **not** block commands that write to `.env` files (e.g., `echo "KEY=value" >> .env`) -- only read operations.

### Grep Tool Blocking

For the `grep` tool, the plugin checks the `include` parameter. If the include pattern targets `.env` files (using the same `isProtectedEnvFile` logic), it blocks the call.

### Error Messages

When a call is blocked, the plugin throws a clear error explaining why and what to use instead. For example:

> Cannot read protected file `.env`. Use `.env.example` for documentation, or environment variables (e.g., `process.env.MY_KEY`) for runtime access.

### Logging

On startup, the plugin logs:
```
[env-protection] Loaded. .env file access will be blocked.
```

Each blocked call logs a warning to the OpenCode service log:
```
[env-protection] Blocked <tool> on <path>
```

### Edge Cases

- **Symlinks:** If `.env` is a symlink to another file, the plugin blocks based on the accessed path, not the resolved target
- **Subdirectories:** `.env` files in subdirectories (e.g., `config/.env.production`) are blocked
- **Hidden directories:** `.env` inside `.config/` is still caught because the basename check matches the filename, not the directory
