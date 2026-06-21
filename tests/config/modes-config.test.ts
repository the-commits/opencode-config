import { describe, expect, it } from "bun:test"
import fs from "node:fs"
import path from "node:path"

const MODES = ["brainstorm", "plan", "analyze", "build", "build-lite", "scout", "build-meticulous"] as const

function extractModeModel(raw: string, mode: string): string | undefined {
  const block = raw.match(
    new RegExp(`"${mode}"\\s*:\\s*\\{[\\s\\S]*?"model"\\s*:\\s*"([^"]+)"`),
  )
  return block?.[1]
}

function extractDefaultModel(raw: string): string | undefined {
  // Match the first top-level "model" field (not inside a nested block like provider or mode)
  const match = raw.match(/^\s*"model"\s*:\s*"([^"]+)"/m)
  return match?.[1]
}

describe("mode config", () => {
  const configPath = path.join(process.cwd(), "opencode.jsonc")
  const raw = fs.readFileSync(configPath, "utf8")
  const defaultModel = extractDefaultModel(raw)

  it("has a valid default model in provider/name format", () => {
    expect(defaultModel).toBeDefined()
    expect(defaultModel).toMatch(/^[a-zA-Z0-9_-]+\/[a-zA-Z0-9._-]+$/)
  })

  it.each(MODES.map((m) => [m]))("%s mode either specifies a model or inherits the default", (mode) => {
    const modeModel = extractModeModel(raw, mode)

    if (modeModel) {
      // Explicit mode model must be in valid format
      expect(modeModel).toMatch(/^[a-zA-Z0-9_-]+\/[a-zA-Z0-9._-]+$/)
    } else {
      // No explicit model — must inherit from default
      expect(defaultModel).toBeDefined()
      expect(defaultModel).toMatch(/^[a-zA-Z0-9_-]+\/[a-zA-Z0-9._-]+$/)
    }
  })
})
