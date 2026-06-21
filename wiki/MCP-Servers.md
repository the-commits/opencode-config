**Home > MCP Servers**

**Siblings:** [[Plugins|Plugins]], [[Semgrep-Recipes|Semgrep Recipes]], [[Agent-Modes|Agent Modes]], [[Skills-and-Tools|Skills & Tools]], [[Security-and-Hooks|Security & Hooks]], [[Agent-Guidelines|Agent Guidelines]]
**Children:** [[MCP-Semgrep|Semgrep MCP]], [[MCP-Chrome-DevTools|Chrome DevTools MCP]], [[MCP-WebSearch|Web Search with Citations]]

---

# MCP Servers (Global)

Configured in `opencode.jsonc` and available in every project. All three MCP servers are defined under the `mcp` configuration key and run as local processes.

## Configuration Format

```jsonc
"mcp": {
  "semgrep": {
    "type": "local",
    "command": ["semgrep", "mcp"]
  },
  "chrome-devtools": {
    "type": "local",
    "command": ["npx", "-y", "chrome-devtools-mcp@latest"]
  }
}
```

All servers use `type: "local"`, meaning they run as child processes launched by OpenCode.

## Pages in this Section

| Page | Server | What it provides |
|------|--------|-----------------|
| [[MCP-Semgrep|Semgrep MCP]] | `semgrep mcp` | 7 Semgrep tools for static analysis |
| [[MCP-Chrome-DevTools|Chrome DevTools MCP]] | `chrome-devtools-mcp` | Full browser automation & inspection |
| [[MCP-WebSearch|Web Search with Citations]] | `opencode-websearch-cited` | Grounded web search with citations |

## MCP Server Architecture

All three servers are launched by OpenCode at startup. They communicate via stdio JSON-RPC (the standard MCP protocol). The agent can call any of their exposed tools directly without configuration.

The `websearch_cited` plugin is unique -- it's loaded as an OpenCode plugin (from `plugins` in `opencode.jsonc`) rather than an MCP server. It injects a `websearch_cited` tool directly into the agent's context. However, it's included alongside the MCP servers because it serves the same purpose: extending the agent's capabilities.
