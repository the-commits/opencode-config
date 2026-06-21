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
	createPersonalFile,
	addInstructionsReference,
	addGitignoreCoverage,
	addAgentsNote,
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

// ---------------------------------------------------------------------------
// createPersonalFile
// ---------------------------------------------------------------------------
describe("createPersonalFile", () => {
	it("creates .opencode/personal/AGENTS.md with info alert", () => {
		createPersonalFile(tmpDir)

		const filePath = path.join(tmpDir, PERSONAL_INSTRUCTIONS_PATH)
		expect(fs.existsSync(filePath)).toBe(true)

		const content = fs.readFileSync(filePath, "utf-8")
		expect(content).toContain("# Personal Agent Instructions")
		expect(content).toContain("gitignored and not shared with your team")
	})

	it("creates nested directories that don't exist", () => {
		createPersonalFile(tmpDir)
		expect(fs.existsSync(path.join(tmpDir, ".opencode", "personal"))).toBe(true)
	})

	it("does not overwrite an existing personal file", () => {
		const personalDir = path.join(tmpDir, ".opencode", "personal")
		fs.mkdirSync(personalDir, { recursive: true })
		const filePath = path.join(personalDir, "AGENTS.md")
		fs.writeFileSync(filePath, "# My custom instructions\n\nDo not touch.\n")

		createPersonalFile(tmpDir)

		const content = fs.readFileSync(filePath, "utf-8")
		expect(content).toBe("# My custom instructions\n\nDo not touch.\n")
	})
})

// ---------------------------------------------------------------------------
// addInstructionsReference
// ---------------------------------------------------------------------------
describe("addInstructionsReference", () => {
	it("creates opencode.jsonc with instructions array when no config exists", () => {
		addInstructionsReference(tmpDir)

		const configPath = path.join(tmpDir, CONFIG_FILENAMES[0])
		expect(fs.existsSync(configPath)).toBe(true)

		const config = JSON.parse(fs.readFileSync(configPath, "utf-8"))
		expect(config.instructions).toEqual([PERSONAL_INSTRUCTIONS_PATH])
	})

	it("adds instructions array to existing config without one", () => {
		const configPath = path.join(tmpDir, "opencode.jsonc")
		fs.writeFileSync(configPath, JSON.stringify({ model: "some-model" }, null, "\t"))

		addInstructionsReference(tmpDir)

		const config = JSON.parse(fs.readFileSync(configPath, "utf-8"))
		expect(config.instructions).toEqual([PERSONAL_INSTRUCTIONS_PATH])
		expect(config.model).toBe("some-model")
	})

	it("appends to existing instructions array without duplicates", () => {
		const configPath = path.join(tmpDir, "opencode.jsonc")
		fs.writeFileSync(configPath, JSON.stringify({
			instructions: ["CONTRIBUTING.md"],
		}, null, "\t"))

		addInstructionsReference(tmpDir)

		const config = JSON.parse(fs.readFileSync(configPath, "utf-8"))
		expect(config.instructions).toEqual(["CONTRIBUTING.md", PERSONAL_INSTRUCTIONS_PATH])
	})

	it("does not duplicate when instructions already contains the path", () => {
		const configPath = path.join(tmpDir, "opencode.jsonc")
		fs.writeFileSync(configPath, JSON.stringify({
			instructions: [PERSONAL_INSTRUCTIONS_PATH, "CONTRIBUTING.md"],
		}, null, "\t"))

		addInstructionsReference(tmpDir)

		const config = JSON.parse(fs.readFileSync(configPath, "utf-8"))
		expect(config.instructions).toEqual([PERSONAL_INSTRUCTIONS_PATH, "CONTRIBUTING.md"])
	})

	it("preserves existing config keys when adding instructions", () => {
		const configPath = path.join(tmpDir, "opencode.jsonc")
		const original = {
			model: "test-model",
			mcp: { semgrep: { type: "local", command: ["semgrep", "mcp"] } },
		}
		fs.writeFileSync(configPath, JSON.stringify(original, null, "\t"))

		addInstructionsReference(tmpDir)

		const config = JSON.parse(fs.readFileSync(configPath, "utf-8"))
		expect(config.model).toBe("test-model")
		expect(config.mcp.semgrep).toEqual(original.mcp.semgrep)
		expect(config.instructions).toEqual([PERSONAL_INSTRUCTIONS_PATH])
	})
})

// ---------------------------------------------------------------------------
// addGitignoreCoverage
// ---------------------------------------------------------------------------
describe("addGitignoreCoverage", () => {
	it("creates .gitignore with the pattern when it doesn't exist", () => {
		addGitignoreCoverage(tmpDir)

		const gitignorePath = path.join(tmpDir, ".gitignore")
		expect(fs.existsSync(gitignorePath)).toBe(true)

		const content = fs.readFileSync(gitignorePath, "utf-8")
		expect(content).toContain(PERSONAL_GITIGNORE_PATTERN)
	})

	it("appends the pattern to existing .gitignore", () => {
		const gitignorePath = path.join(tmpDir, ".gitignore")
		fs.writeFileSync(gitignorePath, "node_modules\nbun.lock\n")

		addGitignoreCoverage(tmpDir)

		const content = fs.readFileSync(gitignorePath, "utf-8")
		expect(content).toContain("node_modules")
		expect(content).toContain(PERSONAL_GITIGNORE_PATTERN)
	})

	it("does not duplicate the pattern when already present", () => {
		const gitignorePath = path.join(tmpDir, ".gitignore")
		const original = `node_modules\n${PERSONAL_GITIGNORE_PATTERN}\n`
		fs.writeFileSync(gitignorePath, original)

		addGitignoreCoverage(tmpDir)

		const content = fs.readFileSync(gitignorePath, "utf-8")
		const matches = content.split("\n").filter((l) => l === PERSONAL_GITIGNORE_PATTERN)
		expect(matches.length).toBe(1)
	})
})

// ---------------------------------------------------------------------------
// addAgentsNote
// ---------------------------------------------------------------------------
describe("addAgentsNote", () => {
	it("creates AGENTS.md with the note when it doesn't exist", () => {
		addAgentsNote(tmpDir)

		const agentsPath = path.join(tmpDir, "AGENTS.md")
		expect(fs.existsSync(agentsPath)).toBe(true)

		const content = fs.readFileSync(agentsPath, "utf-8")
		expect(content).toContain(PERSONAL_AGENTS_NOTE)
	})

	it("appends the note to existing AGENTS.md", () => {
		const agentsPath = path.join(tmpDir, "AGENTS.md")
		fs.writeFileSync(agentsPath, "# Project Rules\n\nSome guidelines.\n")

		addAgentsNote(tmpDir)

		const content = fs.readFileSync(agentsPath, "utf-8")
		expect(content).toContain("# Project Rules")
		expect(content).toContain(PERSONAL_AGENTS_NOTE)
	})

	it("does not duplicate the note when already present", () => {
		const agentsPath = path.join(tmpDir, "AGENTS.md")
		const original = `# Project Rules\n\n${PERSONAL_AGENTS_NOTE}\n`
		fs.writeFileSync(agentsPath, original)

		addAgentsNote(tmpDir)

		const content = fs.readFileSync(agentsPath, "utf-8")
		const matches = content.split(PERSONAL_AGENTS_NOTE).length - 1
		expect(matches).toBe(1)
	})
})
