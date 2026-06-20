import { describe, expect, it } from "bun:test"
import fs from "node:fs"
import path from "node:path"

const MODES = ["brainstorm", "plan", "analyze", "build", "scout", "build-meticulous"] as const

function extractModel(raw: string, mode: string): string | undefined {
  const block = raw.match(
    new RegExp(`"${mode}"\\s*:\\s*\\{[\\s\\S]*?"model"\\s*:\\s*"([^"]+)"`),
  )
  return block?.[1]
}

describe("mode config", () => {
  const configPath = path.join(process.cwd(), "opencode.jsonc")
  const raw = fs.readFileSync(configPath, "utf8")

  it.each(MODES)("%s mode has a valid model in provider/name format", (mode) => {
    const model = extractModel(raw, mode)

    expect(model).toBeDefined()
    expect(model).toMatch(/^[a-zA-Z0-9_-]+\/[a-zA-Z0-9._-]+$/)
  })
})
