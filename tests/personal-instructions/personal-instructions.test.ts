import { describe, it, expect, beforeEach, afterEach } from "bun:test"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import {
	PERSONAL_INSTRUCTIONS_PATH,
	PERSONAL_GITIGNORE_PATTERN,
	PERSONAL_AGENTS_NOTE,
	CONFIG_FILENAMES,
	hasPersonalFile,
	hasInstructionsReference,
	hasGitignoreCoverage,
	hasAgentsNote,
	detectState,
} from "../../lib/personal-instructions-internals"

let tmpDir: string

beforeEach(() => {
	tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "personal-instructions-test-"))
})

afterEach(() => {
	fs.rmSync(tmpDir, { recursive: true, force: true })
})

// ---------------------------------------------------------------------------
// hasPersonalFile
// ---------------------------------------------------------------------------
describe("hasPersonalFile", () => {
	it("returns false when .opencode/personal/AGENTS.md does not exist", () => {
		expect(hasPersonalFile(tmpDir)).toBe(false)
	})

	it("returns true when .opencode/personal/AGENTS.md exists", () => {
		const personalDir = path.join(tmpDir, ".opencode", "personal")
		fs.mkdirSync(personalDir, { recursive: true })
		fs.writeFileSync(path.join(personalDir, "AGENTS.md"), "# My personal instructions")
		expect(hasPersonalFile(tmpDir)).toBe(true)
	})

	it("returns false for non-existent directory", () => {
		expect(hasPersonalFile(path.join(tmpDir, "nope"))).toBe(false)
	})
})

// ---------------------------------------------------------------------------
// hasInstructionsReference
// ---------------------------------------------------------------------------
describe("hasInstructionsReference", () => {
	it("returns false when no config file exists", () => {
		expect(hasInstructionsReference(tmpDir)).toBe(false)
	})

	it("returns false when config has no instructions array", () => {
		const configPath = path.join(tmpDir, "opencode.jsonc")
		fs.writeFileSync(configPath, JSON.stringify({ model: "some-model" }))
		expect(hasInstructionsReference(tmpDir)).toBe(false)
	})

	it("returns false when instructions array does not contain the personal path", () => {
		const configPath = path.join(tmpDir, "opencode.jsonc")
		fs.writeFileSync(configPath, JSON.stringify({
			instructions: ["CONTRIBUTING.md", "docs/guidelines.md"],
		}))
		expect(hasInstructionsReference(tmpDir)).toBe(false)
	})

	it("returns true when instructions array contains the personal path", () => {
		const configPath = path.join(tmpDir, "opencode.jsonc")
		fs.writeFileSync(configPath, JSON.stringify({
			instructions: [".opencode/personal/AGENTS.md"],
		}))
		expect(hasInstructionsReference(tmpDir)).toBe(true)
	})

	it("returns true when instructions array contains the personal path among others", () => {
		const configPath = path.join(tmpDir, "opencode.jsonc")
		fs.writeFileSync(configPath, JSON.stringify({
			instructions: ["CONTRIBUTING.md", ".opencode/personal/AGENTS.md", "docs/guidelines.md"],
		}))
		expect(hasInstructionsReference(tmpDir)).toBe(true)
	})

	it("works with opencode.json (not just .jsonc)", () => {
		const configPath = path.join(tmpDir, "opencode.json")
		fs.writeFileSync(configPath, JSON.stringify({
			instructions: [".opencode/personal/AGENTS.md"],
		}))
		expect(hasInstructionsReference(tmpDir)).toBe(true)
	})

	it("handles JSONC with single-line comments", () => {
		const configPath = path.join(tmpDir, "opencode.jsonc")
		fs.writeFileSync(configPath, [
			"// This is a comment",
			'{ "instructions": [".opencode/personal/AGENTS.md"] }',
		].join("\n"))
		expect(hasInstructionsReference(tmpDir)).toBe(true)
	})

	it("returns false for unparseable config", () => {
		const configPath = path.join(tmpDir, "opencode.jsonc")
		fs.writeFileSync(configPath, "not json {{")
		expect(hasInstructionsReference(tmpDir)).toBe(false)
	})
})

// ---------------------------------------------------------------------------
// hasGitignoreCoverage
// ---------------------------------------------------------------------------
describe("hasGitignoreCoverage", () => {
	it("returns false when .gitignore does not exist", () => {
		expect(hasGitignoreCoverage(tmpDir)).toBe(false)
	})

	it("returns false when .gitignore lacks the pattern", () => {
		fs.writeFileSync(path.join(tmpDir, ".gitignore"), "node_modules\nbun.lock\n")
		expect(hasGitignoreCoverage(tmpDir)).toBe(false)
	})

	it("returns true when .gitignore contains the pattern", () => {
		fs.writeFileSync(path.join(tmpDir, ".gitignore"), `node_modules\n${PERSONAL_GITIGNORE_PATTERN}\n`)
		expect(hasGitignoreCoverage(tmpDir)).toBe(true)
	})

	it("returns true when .gitignore contains the pattern without trailing newline", () => {
		fs.writeFileSync(path.join(tmpDir, ".gitignore"), `node_modules\n${PERSONAL_GITIGNORE_PATTERN}`)
		expect(hasGitignoreCoverage(tmpDir)).toBe(true)
	})

	it("returns true when .gitignore contains only the pattern", () => {
		fs.writeFileSync(path.join(tmpDir, ".gitignore"), PERSONAL_GITIGNORE_PATTERN)
		expect(hasGitignoreCoverage(tmpDir)).toBe(true)
	})
})

// ---------------------------------------------------------------------------
// hasAgentsNote
// ---------------------------------------------------------------------------
describe("hasAgentsNote", () => {
	it("returns false when AGENTS.md does not exist", () => {
		expect(hasAgentsNote(tmpDir)).toBe(false)
	})

	it("returns false when AGENTS.md lacks the personal instructions mention", () => {
		fs.writeFileSync(path.join(tmpDir, "AGENTS.md"), "# Project Rules\n\nSome guidelines.\n")
		expect(hasAgentsNote(tmpDir)).toBe(false)
	})

	it("returns true when AGENTS.md contains the personal instructions note", () => {
		fs.writeFileSync(path.join(tmpDir, "AGENTS.md"), `# Project Rules\n\n${PERSONAL_AGENTS_NOTE}\n`)
		expect(hasAgentsNote(tmpDir)).toBe(true)
	})

	it("returns true when AGENTS.md mentions the personal path anywhere", () => {
		fs.writeFileSync(path.join(tmpDir, "AGENTS.md"), [
			"# Project Rules",
			"",
			"See `.opencode/personal/AGENTS.md` for personal overrides.",
			"",
		].join("\n"))
		expect(hasAgentsNote(tmpDir)).toBe(true)
	})
})

// ---------------------------------------------------------------------------
// detectState
// ---------------------------------------------------------------------------
describe("detectState", () => {
	it("returns all absent for a bare project", () => {
		const state = detectState(tmpDir)
		expect(state).toEqual({
			personalFile: false,
			instructionsRef: false,
			gitignoreCoverage: false,
			agentsNote: false,
		})
	})

	it("returns all present for a fully configured project", () => {
		const personalDir = path.join(tmpDir, ".opencode", "personal")
		fs.mkdirSync(personalDir, { recursive: true })
		fs.writeFileSync(path.join(personalDir, "AGENTS.md"), "# Personal")

		fs.writeFileSync(path.join(tmpDir, "opencode.jsonc"), JSON.stringify({
			instructions: [".opencode/personal/AGENTS.md"],
		}))
		fs.writeFileSync(path.join(tmpDir, ".gitignore"), `node_modules\n${PERSONAL_GITIGNORE_PATTERN}\n`)
		fs.writeFileSync(path.join(tmpDir, "AGENTS.md"), `# Project\n\n${PERSONAL_AGENTS_NOTE}\n`)

		const state = detectState(tmpDir)
		expect(state).toEqual({
			personalFile: true,
			instructionsRef: true,
			gitignoreCoverage: true,
			agentsNote: true,
		})
	})

	it("returns partial state when only some checks pass", () => {
		const personalDir = path.join(tmpDir, ".opencode", "personal")
		fs.mkdirSync(personalDir, { recursive: true })
		fs.writeFileSync(path.join(personalDir, "AGENTS.md"), "# Personal")

		const state = detectState(tmpDir)
		expect(state).toEqual({
			personalFile: true,
			instructionsRef: false,
			gitignoreCoverage: false,
			agentsNote: false,
		})
	})
})
