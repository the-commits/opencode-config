**Home > MCP Servers > Web Search with Citations**

**Parent:** [[MCP-Servers|MCP Servers]]
**Siblings:** [[MCP-Semgrep|Semgrep MCP]], [[MCP-Chrome-DevTools|Chrome DevTools MCP]]

---

# Web Search with Citations

**Plugin:** `opencode-websearch-cited@latest`

## Light

Adds a `websearch_cited` tool that lets the agent do grounded web search with inline citations and a sources list. Backed by Google Gemini's native search grounding, it automatically returns factual answers with `[1]`-style inline citations and a full "Sources:" list.

## Nitty-Gritty

### Architecture

This is an OpenCode plugin (loaded via the `plugins` array in `opencode.jsonc`), not an MCP server. It injects a tool called `websearch_cited` into the agent's context at startup.

### Configuration

Configured in `opencode.jsonc`:

```jsonc
"google": {
  "options": {
    "websearch_cited": {
      "model": "gemini-2.5-flash"
    }
  }
}
```

The plugin scans all `provider` entries in order and picks the first one with `options.websearch_cited.model` set. Since Google appears first in the providers array, Gemini handles all search queries.

### Capabilities

- **Automatic triggering:** Runs whenever the agent needs current web information
- **Inline citations:** Returns answers with `[1]`-style citations and a full sources list
- **Grounded responses:** Uses Google's search grounding for factual accuracy

### Known Issue

Loading this plugin after `opencode-gemini-auth` can break `opencode auth login` for Google providers ([upstream issue #6](https://github.com/ghoulr/opencode-websearch-cited/issues/6)). Disable the plugin temporarily if you encounter this issue.
