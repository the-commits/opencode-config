import { describe, it, expect, beforeEach, afterEach } from "bun:test"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import {
	isPhpProject,
	findProjectConfig,
	hasXdebugMcp,
	createConfigWithXdebug,
	addXdebugToConfig,
	XDEBUG_MCP_CONFIG,
	CONFIG_FILENAMES,
} from "../../lib/php-tooling-internals"

let tmpDir: string

beforeEach(() => {
	tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "php-tooling-test-"))
})

afterEach(() => {
	fs.rmSync(tmpDir, { recursive: true, force: true })
})

// ---------------------------------------------------------------------------
// isPhpProject
// ---------------------------------------------------------------------------
describe("isPhpProject", () => {
	it("returns true when composer.json exists", () => {
		fs.writeFileSync(path.join(tmpDir, "composer.json"), "{}")
		expect(isPhpProject(tmpDir)).toBe(true)
	})

	it("returns true when composer.lock exists", () => {
		fs.writeFileSync(path.join(tmpDir, "composer.lock"), "{}")
		expect(isPhpProject(tmpDir)).toBe(true)
	})

	it("returns true when artisan exists", () => {
		fs.writeFileSync(path.join(tmpDir, "artisan"), "#!/usr/bin/env php")
		expect(isPhpProject(tmpDir)).toBe(true)
	})

	it("returns true when index.php exists", () => {
		fs.writeFileSync(path.join(tmpDir, "index.php"), "<?php")
		expect(isPhpProject(tmpDir)).toBe(true)
	})

	it("returns true when any .php file exists", () => {
		fs.writeFileSync(path.join(tmpDir, "functions.php"), "<?php")
		expect(isPhpProject(tmpDir)).toBe(true)
	})

	it("returns false for empty directory", () => {
		expect(isPhpProject(tmpDir)).toBe(false)
	})

	it("returns false for non-PHP project", () => {
		fs.writeFileSync(path.join(tmpDir, "package.json"), "{}")
		fs.writeFileSync(path.join(tmpDir, "index.ts"), "export {}")
		expect(isPhpProject(tmpDir)).toBe(false)
	})

	it("returns false for non-existent directory", () => {
		expect(isPhpProject(path.join(tmpDir, "nope"))).toBe(false)
	})
})

// ---------------------------------------------------------------------------
// findProjectConfig
// ---------------------------------------------------------------------------
describe("findProjectConfig", () => {
	it("returns null when no config exists", () => {
		expect(findProjectConfig(tmpDir)).toBeNull()
	})

	it("finds opencode.jsonc", () => {
		const configPath = path.join(tmpDir, "opencode.jsonc")
		fs.writeFileSync(configPath, "{}")
		expect(findProjectConfig(tmpDir)).toBe(configPath)
	})

	it("finds opencode.json", () => {
		const configPath = path.join(tmpDir, "opencode.json")
		fs.writeFileSync(configPath, "{}")
		expect(findProjectConfig(tmpDir)).toBe(configPath)
	})

	it("prefers opencode.jsonc over opencode.json when both exist", () => {
		fs.writeFileSync(path.join(tmpDir, "opencode.jsonc"), "{}")
		fs.writeFileSync(path.join(tmpDir, "opencode.json"), "{}")
		expect(findProjectConfig(tmpDir)).toBe(path.join(tmpDir, "opencode.jsonc"))
	})

	it("does not match .opencode.jsonc (wrong filename)", () => {
		fs.writeFileSync(path.join(tmpDir, ".opencode.jsonc"), "{}")
		expect(findProjectConfig(tmpDir)).toBeNull()
	})
})

// ---------------------------------------------------------------------------
// hasXdebugMcp
// ---------------------------------------------------------------------------
describe("hasXdebugMcp", () => {
	it("returns true when xdebug is configured", () => {
		const configPath = path.join(tmpDir, "opencode.jsonc")
		fs.writeFileSync(configPath, JSON.stringify({ mcp: { xdebug: XDEBUG_MCP_CONFIG } }))
		expect(hasXdebugMcp(configPath)).toBe(true)
	})

	it("returns true for custom xdebug config (pinned version)", () => {
		const configPath = path.join(tmpDir, "opencode.jsonc")
		fs.writeFileSync(configPath, JSON.stringify({
			mcp: { xdebug: { type: "local", command: ["npx", "-y", "xdebug-mcp@1.0.0"] } },
		}))
		expect(hasXdebugMcp(configPath)).toBe(true)
	})

	it("returns false when mcp exists but no xdebug", () => {
		const configPath = path.join(tmpDir, "opencode.jsonc")
		fs.writeFileSync(configPath, JSON.stringify({ mcp: { semgrep: {} } }))
		expect(hasXdebugMcp(configPath)).toBe(false)
	})

	it("returns false when no mcp key exists", () => {
		const configPath = path.join(tmpDir, "opencode.jsonc")
		fs.writeFileSync(configPath, JSON.stringify({ model: "some-model" }))
		expect(hasXdebugMcp(configPath)).toBe(false)
	})

	it("returns null for unparseable file", () => {
		const configPath = path.join(tmpDir, "opencode.jsonc")
		fs.writeFileSync(configPath, "not json {{")
		expect(hasXdebugMcp(configPath)).toBeNull()
	})

	it("handles JSONC with single-line comments", () => {
		const configPath = path.join(tmpDir, "opencode.jsonc")
		fs.writeFileSync(configPath, [
			"// This is a comment",
			'{ "mcp": { "xdebug": { "type": "local" } } }',
		].join("\n"))
		expect(hasXdebugMcp(configPath)).toBe(true)
	})
})

// ---------------------------------------------------------------------------
// createConfigWithXdebug
// ---------------------------------------------------------------------------
describe("createConfigWithXdebug", () => {
	it("creates opencode.jsonc with xdebug MCP config", () => {
		const configPath = createConfigWithXdebug(tmpDir)

		expect(configPath).toBe(path.join(tmpDir, CONFIG_FILENAMES[0]))
		expect(fs.existsSync(configPath)).toBe(true)
	})

	it("writes valid JSON with correct structure", () => {
		const configPath = createConfigWithXdebug(tmpDir)
		const config = JSON.parse(fs.readFileSync(configPath, "utf-8"))

		expect(config.mcp.xdebug).toEqual(XDEBUG_MCP_CONFIG)
	})

	it("uses tabs for indentation and ends with newline", () => {
		const configPath = createConfigWithXdebug(tmpDir)
		const raw = fs.readFileSync(configPath, "utf-8")

		expect(raw).toContain("\t")
		expect(raw).toEndWith("\n")
	})
})

// ---------------------------------------------------------------------------
// addXdebugToConfig
// ---------------------------------------------------------------------------
describe("addXdebugToConfig", () => {
	it("adds xdebug to existing mcp section", () => {
		const existing = {
			mcp: { semgrep: { type: "local", command: ["semgrep", "mcp"] } },
		}
		const configPath = path.join(tmpDir, "opencode.jsonc")
		fs.writeFileSync(configPath, JSON.stringify(existing, null, "\t"))

		expect(addXdebugToConfig(configPath)).toBe(true)

		const config = JSON.parse(fs.readFileSync(configPath, "utf-8"))
		expect(config.mcp.xdebug).toEqual(XDEBUG_MCP_CONFIG)
		expect(config.mcp.semgrep).toEqual(existing.mcp.semgrep)
	})

	it("creates mcp section when file has no mcp key", () => {
		const configPath = path.join(tmpDir, "opencode.jsonc")
		fs.writeFileSync(configPath, JSON.stringify({ model: "some-model" }, null, "\t"))

		expect(addXdebugToConfig(configPath)).toBe(true)

		const config = JSON.parse(fs.readFileSync(configPath, "utf-8"))
		expect(config.mcp.xdebug).toEqual(XDEBUG_MCP_CONFIG)
		expect(config.model).toBe("some-model")
	})

	it("works with opencode.json (not just .jsonc)", () => {
		const configPath = path.join(tmpDir, "opencode.json")
		fs.writeFileSync(configPath, JSON.stringify({ model: "x" }, null, "\t"))

		expect(addXdebugToConfig(configPath)).toBe(true)

		const config = JSON.parse(fs.readFileSync(configPath, "utf-8"))
		expect(config.mcp.xdebug).toEqual(XDEBUG_MCP_CONFIG)
	})

	it("returns false for unparseable file without modifying it", () => {
		const garbage = "not json {{"
		const configPath = path.join(tmpDir, "opencode.jsonc")
		fs.writeFileSync(configPath, garbage)

		expect(addXdebugToConfig(configPath)).toBe(false)
		expect(fs.readFileSync(configPath, "utf-8")).toBe(garbage)
	})
})
