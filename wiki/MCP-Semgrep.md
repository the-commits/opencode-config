**Home > MCP Servers > Semgrep MCP**

**Parent:** [[MCP-Servers|MCP Servers]]
**Siblings:** [[MCP-Chrome-DevTools|Chrome DevTools MCP]], [[MCP-WebSearch|Web Search with Citations]]

---

# Semgrep MCP

**Command:** `semgrep mcp`

## Light

Runs Semgrep as a local MCP server, giving the agent direct access to Semgrep's scanning capabilities as tools. On top of the automatic supply chain scanning that the [[Plugins-Supply-Chain-Guard|Supply Chain Guard]] plugin already does, this gives the agent on-demand access to static analysis.

## Nitty-Gritty

### Available Tools

| Tool | Description |
|------|-------------|
| `semgrep_semgrep_scan` | Run a Semgrep scan on provided code files, return findings in JSON format |
| `semgrep_semgrep_scan_with_custom_rule` | Run a Semgrep scan with a custom YAML rule on provided code content |
| `semgrep_semgrep_findings` | Fetch findings from the Semgrep AppSec Platform API (historical results) |
| `semgrep_semgrep_scan_supply_chain` | Run a Semgrep supply chain scan on the workspace directory |
| `semgrep_semgrep_rule_schema` | Get the schema for writing Semgrep rules |
| `semgrep_get_supported_languages` | List all languages supported by Semgrep |
| `semgrep_get_abstract_syntax_tree` | Get the AST for provided code in a given language |

### Requirements

- Semgrep must be installed and authenticated (`semgrep login`)
- The Semgrep AppSec Platform tools (findings, etc.) require a Semgrep account

### Use Cases

- **Custom rule testing:** Write and test a custom Semgrep rule against project code before committing it to the recipes directory
- **Ad-hoc security audits:** Scan specific files or directories the agent suspects may contain vulnerabilities
- **AST exploration:** Understand code structure in any supported language
- **Supply chain scans:** Independent of the automatic Supply Chain Guard scans, the agent can run targeted scans on specific ecosystems
