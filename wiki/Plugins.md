**Home > Plugins**

**Section:** Plugins
**Children:** [[Plugins-Env-Protection|Env Protection]], [[Plugins-Successful-Editing|Successful Editing]], [[Plugins-Supply-Chain-Guard|Supply Chain Guard]], [[Plugins-PHP-Tooling|PHP Tooling]], [[Plugins-Personal-Instructions|Personal Instructions]]

---

# Plugins

This section covers all global plugins that ship with opencode-config. These plugins apply globally across all your projects and are loaded automatically at startup via `opencode.jsonc`.

## Plugin Architecture

All plugins in this repo use the [@opencode-ai/plugin](https://www.npmjs.com/package/@opencode-ai/plugin) SDK. They hook into OpenCode's lifecycle events to intercept tool calls, analyze diagnostics, and run security scans. Each plugin follows the Single Responsibility Principle -- one concern per plugin.

### Common Patterns

- **`tool.execute.before/after` hooks** -- Most plugins intercept tool calls before or after execution
- **Plugin factory pattern** -- Each plugin exports a factory function that receives `PluginContext` and returns hooks
- **Logging** -- Plugins log via `ctx.client.app.log()` with a service name, falling back to `console.debug`
- **Cross-platform** -- All file operations use Node.js `fs` APIs, not shell commands (Windows compatibility)

## Pages in this Section

| Page | Plugin | What it does |
|------|--------|-------------|
| [[Plugins-Env-Protection|Env Protection]] | `plugins/env-protection.ts` | Blocks the agent from reading `.env` files |
| [[Plugins-Successful-Editing|Successful Editing]] | `plugins/successful-editing.ts` | Verifies edits via LSP diagnostics |
| [[Plugins-Supply-Chain-Guard|Supply Chain Guard]] | `plugins/supply-chain-guard/` | Auto-scans dependencies after install |
| [[Plugins-PHP-Tooling|PHP Tooling]] | `plugins/php-tooling.ts` | Auto-provisions Xdebug for PHP projects |
| [[Plugins-Personal-Instructions|Personal Instructions]] | `plugins/personal-instructions.ts` | Manages per-developer agent overrides |
