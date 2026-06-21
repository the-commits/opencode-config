**Home > MCP Servers > Chrome DevTools MCP**

**Parent:** [[MCP-Servers|MCP Servers]]
**Siblings:** [[MCP-Semgrep|Semgrep MCP]], [[MCP-WebSearch|Web Search with Citations]]

---

# Chrome DevTools MCP

**Command:** `npx -y chrome-devtools-mcp@latest`

## Light

Gives the agent a full set of browser automation and inspection tools. It can navigate to pages, take screenshots, inspect the DOM, monitor network requests, capture console messages, run Lighthouse audits, and record performance traces.

## Nitty-Gritty

### Source

Open-source project at [github.com/ChromeDevTools/chrome-devtools-mcp](https://github.com/ChromeDevTools/chrome-devtools-mcp). Runs via `npx` (requires Node.js). The `-y` flag auto-accepts the prompt.

### Available Tools (Grouped by Category)

**Navigation:**
- `navigate_page(url)` / `chrome-devtools_navigate_page` -- Go to URL, back, forward, or reload
- `new_page(url)` -- Open new tab
- `close_page(pageId)` -- Close a tab
- `list_pages()` -- List open pages
- `select_page(pageId)` -- Switch active page

**DOM Interaction:**
- `take_snapshot()` -- Get a11y tree text snapshot of the page
- `click(uid)` / `dblClick` -- Click on an element
- `fill(uid, value)` -- Type into input or select option
- `fill_form(elements)` -- Fill multiple form fields at once
- `hover(uid)` -- Hover over element
- `drag(from_uid, to_uid)` -- Drag-and-drop
- `press_key(key)` -- Keyboard shortcuts
- `type_text(text)` -- Type text into focused input
- `upload_file(uid, path)` -- Upload file through file input

**Inspection:**
- `take_screenshot()` -- Screenshot of page or element
- `resize_page(width, height)` -- Resize viewport
- `emulate(options)` -- Emulate network conditions, CPU throttling, geolocation, user agent, color scheme, viewport

**Network:**
- `list_network_requests()` -- List all requests since last navigation
- `get_network_request(reqId)` -- Get request/response details (save bodies to file)

**Console:**
- `list_console_messages()` -- List console messages
- `get_console_message(msgId)` -- Get full message details

**Performance:**
- `performance_start_trace()` -- Start performance trace recording
- `performance_stop_trace()` -- Stop trace and save results
- `performance_analyze_insight()` -- Get detailed information on a specific performance insight

**Memory:**
- `take_heapsnapshot()` -- Capture heap snapshot for memory debugging

**Lighthouse:**
- `lighthouse_audit()` -- Run Lighthouse audit (accessibility, SEO, best practices, agentic browsing)

**Dialogs:**
- `handle_dialog()` -- Accept/dismiss browser dialogs (alert, confirm, prompt)

**Waiting:**
- `wait_for(text)` -- Wait for text to appear on page

### Use Cases

- **Frontend debugging:** Inspect the DOM to understand rendering issues
- **Form testing:** Fill and submit forms programmatically
- **Performance audits:** Run Lighthouse and trace recordings to identify bottlenecks
- **Memory analysis:** Capture heap snapshots to find memory leaks
- **Network inspection:** Monitor XHR/fetch requests and their responses
