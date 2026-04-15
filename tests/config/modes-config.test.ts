import { describe, expect, it } from "bun:test"
import fs from "node:fs"
import path from "node:path"

describe("mode config", () => {
  it("uses a valid brainstorm model", () => {
    const configPath = path.join(process.cwd(), "opencode.jsonc")
    const config = JSON.parse(fs.readFileSync(configPath, "utf8"))

    expect(config.mode.brainstorm.model).toBe("github-copilot/claude-4.6-sonnet")
  })
})
