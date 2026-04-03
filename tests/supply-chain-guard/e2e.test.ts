/**
 * End-to-end integration tests for the Supply Chain Guard plugin.
 *
 * These tests call the real plugin hooks with a real BunShell (Bun.$)
 * and real Semgrep, exercising the full pipeline: detection -> hashing ->
 * scanning -> caching -> formatting.
 *
 * Requirements: npm, semgrep, python3 (for venv), go
 * Skip with: SKIP_E2E=1 bun test
 *
 * Each test manages its own temp directory via try/finally to avoid
 * shared mutable state that can deadlock bun's test runner with many
 * concurrent subprocess-heavy async tests.
 */
import { describe, test, expect, beforeAll } from "bun:test"
import { $ } from "bun"
import { mkdtemp, rm, writeFile, mkdir, readFile, exists } from "node:fs/promises"
import path from "node:path"
import os from "node:os"
import { SupplyChainGuard } from "../../plugins/supply-chain-guard/index.ts"

if (process.env.SKIP_E2E === "1") {
  describe.skip("E2E: Supply Chain Guard", () => {
    test("skipped via SKIP_E2E=1", () => {})
  })
} else {

const CONFIG_DIR = path.join(os.homedir(), ".config", "opencode")
const RECIPES_DIR = path.join(CONFIG_DIR, "semgrep", "recipes")

function makeCtx(directory: string) {
  return {
    client: { app: { log: async () => {} } },
    project: {} as any,
    directory,
    worktree: directory,
    serverUrl: new URL("http://localhost:0"),
    $,
  }
}

interface HookInput { tool: string; sessionID: string; callID: string; args?: any }
interface BeforeOutput { args: any }
interface AfterOutput { title: string; output: string; metadata: any }

async function runPluginCycle(
  hooks: {
    "tool.execute.before"?: (input: any, output: any) => Promise<void>,
    "tool.execute.after"?: (input: any, output: any) => Promise<void>,
  },
  command: string,
  workdir: string,
  callID: string = "test-call-1",
) {
  const beforeInput: HookInput = { tool: "bash", sessionID: "e2e-session", callID }
  const beforeOutput: BeforeOutput = { args: { command, workdir } }
  await hooks["tool.execute.before"]?.(beforeInput, beforeOutput)

  const result = await $`sh -c ${command}`.cwd(workdir).quiet().nothrow()

  const afterInput = { tool: "bash", sessionID: "e2e-session", callID, args: { command, workdir } }
  const afterOutput: AfterOutput = {
    title: command,
    output: result.stdout.toString(),
    metadata: { exit: result.exitCode },
  }
  await hooks["tool.execute.after"]?.(afterInput, afterOutput)

  return afterOutput.output
}

async function makeTempDir() {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "scg-e2e-"))
  const cacheFile = path.join(tmpDir, ".scg-cache.json")
  return { tmpDir, cacheFile }
}

describe("E2E: Supply Chain Guard", () => {
  beforeAll(async () => {
    const semgrep = await $`which semgrep`.quiet().nothrow()
    if (semgrep.exitCode !== 0) throw new Error("semgrep not found")

    const npm = await $`which npm`.quiet().nothrow()
    if (npm.exitCode !== 0) throw new Error("npm not found")

    const recipesExist = await exists(RECIPES_DIR)
    if (!recipesExist) throw new Error(`Recipes dir not found at ${RECIPES_DIR}`)
  })

  test("1: detects findings in malicious npm package", async () => {
    const { tmpDir, cacheFile } = await makeTempDir()
    try {
      const projDir = path.join(tmpDir, "proj")
      await mkdir(path.join(projDir, "node_modules", "fake-bad"), { recursive: true })
      await writeFile(path.join(projDir, "package.json"), JSON.stringify({
        name: "e2e-test", version: "1.0.0",
        dependencies: { "fake-bad": "1.0.0" },
      }))
      await writeFile(path.join(projDir, "package-lock.json"), JSON.stringify({
        name: "e2e-test", version: "1.0.0", lockfileVersion: 3,
        packages: {
          "": { name: "e2e-test", version: "1.0.0", dependencies: { "fake-bad": "1.0.0" } },
          "node_modules/fake-bad": { version: "1.0.0" },
        },
      }))
      await writeFile(path.join(projDir, "node_modules", "fake-bad", "package.json"),
        JSON.stringify({ name: "fake-bad", version: "1.0.0" }))
      await writeFile(path.join(projDir, "node_modules", "fake-bad", "index.js"), [
        'const cp = require("child_process");',
        'const encoded = Buffer.from("bHMgLWxh", "base64").toString("utf8");',
        'eval(encoded);',
      ].join("\n"))

      const ctx = makeCtx(projDir)
      const hooks = await SupplyChainGuard(ctx as any, RECIPES_DIR, cacheFile)

      const output = await runPluginCycle(hooks, "npm install", projDir)

      expect(output).toContain("Supply Chain Guard")
      expect(output).toContain("finding(s)!")
      expect(output).toMatch(/require-child-process|suspicious-eval|eval-deobfuscated/)
    } finally {
      await rm(tmpDir, { recursive: true, force: true })
    }
  }, 60_000)

  test("2: cache hit on second identical install", async () => {
    const { tmpDir, cacheFile } = await makeTempDir()
    try {
      const projDir = path.join(tmpDir, "proj-cache")
      await mkdir(path.join(projDir, "node_modules", "is-odd"), { recursive: true })
      await writeFile(path.join(projDir, "package.json"), JSON.stringify({
        name: "cache-test", version: "1.0.0", dependencies: { "is-odd": "3.0.1" },
      }))

      await $`npm install`.cwd(projDir).quiet().nothrow()

      const ctx = makeCtx(projDir)
      const hooks = await SupplyChainGuard(ctx as any, RECIPES_DIR, cacheFile)

      const output1 = await runPluginCycle(hooks, "npm install", projDir, "call-1")
      expect(output1).toContain("Supply Chain Guard")
      expect(output1).toContain("Semgrep scan completed")

      const output2 = await runPluginCycle(hooks, "npm install", projDir, "call-2")
      expect(output2).toContain("Skipped: no changes detected")
      expect(output2).toContain("lockfile + recipes unchanged")
    } finally {
      await rm(tmpDir, { recursive: true, force: true })
    }
  }, 120_000)

  test("3: cache bust when dependency changes", async () => {
    const { tmpDir, cacheFile } = await makeTempDir()
    try {
      const projDir = path.join(tmpDir, "proj-bust")
      await mkdir(projDir, { recursive: true })
      await writeFile(path.join(projDir, "package.json"), JSON.stringify({
        name: "bust-test", version: "1.0.0", dependencies: { "is-odd": "3.0.1" },
      }))

      await $`npm install`.cwd(projDir).quiet().nothrow()

      const ctx = makeCtx(projDir)
      const hooks = await SupplyChainGuard(ctx as any, RECIPES_DIR, cacheFile)

      await runPluginCycle(hooks, "npm install", projDir, "call-1")

      await writeFile(path.join(projDir, "package.json"), JSON.stringify({
        name: "bust-test", version: "1.0.0",
        dependencies: { "is-odd": "3.0.1", "is-even": "1.0.0" },
      }))

      const output = await runPluginCycle(hooks, "npm install", projDir, "call-2")
      expect(output).toContain("Semgrep scan completed")
      expect(output).not.toContain("Skipped")
    } finally {
      await rm(tmpDir, { recursive: true, force: true })
    }
  }, 120_000)

  test("4: pip ecosystem detection and scan", async () => {
    const hasVenv = await $`python3 -m venv --help`.quiet().nothrow()
    if (hasVenv.exitCode !== 0) {
      console.log("  [skip] python3 venv not available")
      return
    }

    const { tmpDir, cacheFile } = await makeTempDir()
    try {
      const projDir = path.join(tmpDir, "proj-pip")
      await mkdir(projDir, { recursive: true })
      await writeFile(path.join(projDir, "requirements.txt"), "six==1.17.0\n")

      await $`python3 -m venv ${path.join(projDir, "venv")}`.quiet().nothrow()

      const ctx = makeCtx(projDir)
      const hooks = await SupplyChainGuard(ctx as any, RECIPES_DIR, cacheFile)

      const pipBin = path.join(projDir, "venv", "bin", "pip")
      const output = await runPluginCycle(
        hooks,
        `${pipBin} install -r requirements.txt`,
        projDir,
      )

      expect(output).toContain("Supply Chain Guard")
      expect(output).toContain("pip/poetry/pipenv/uv")
    } finally {
      await rm(tmpDir, { recursive: true, force: true })
    }
  }, 120_000)

  test("5: go ecosystem detection and scan", async () => {
    const hasGo = await $`which go`.quiet().nothrow()
    if (hasGo.exitCode !== 0) {
      console.log("  [skip] go not available")
      return
    }

    const { tmpDir, cacheFile } = await makeTempDir()
    try {
      const projDir = path.join(tmpDir, "proj-go")
      await mkdir(projDir, { recursive: true })
      await writeFile(path.join(projDir, "go.mod"), [
        "module scg-e2e-test",
        "go 1.22",
        "require github.com/google/uuid v1.6.0",
      ].join("\n") + "\n")
      await writeFile(path.join(projDir, "main.go"), [
        'package main',
        'import (',
        '  "fmt"',
        '  "github.com/google/uuid"',
        ')',
        'func main() { fmt.Println(uuid.New()) }',
      ].join("\n") + "\n")

      await $`go mod download`.cwd(projDir).quiet().nothrow()

      const ctx = makeCtx(projDir)
      const hooks = await SupplyChainGuard(ctx as any, RECIPES_DIR, cacheFile)

      const output = await runPluginCycle(hooks, "go mod download", projDir)
      expect(output).toContain("Supply Chain Guard")
      expect(output).toContain("go modules")
    } finally {
      await rm(tmpDir, { recursive: true, force: true })
    }
  }, 120_000)

  test("6: multi-ecosystem command detects both npm and pip", async () => {
    const hasVenv = await $`python3 -m venv --help`.quiet().nothrow()
    if (hasVenv.exitCode !== 0) {
      console.log("  [skip] python3 venv not available")
      return
    }

    const { tmpDir, cacheFile } = await makeTempDir()
    try {
      const projDir = path.join(tmpDir, "proj-multi")
      await mkdir(projDir, { recursive: true })
      await writeFile(path.join(projDir, "package.json"), JSON.stringify({
        name: "multi-test", version: "1.0.0", dependencies: { "is-odd": "3.0.1" },
      }))
      await writeFile(path.join(projDir, "requirements.txt"), "six==1.17.0\n")
      await $`python3 -m venv ${path.join(projDir, "venv")}`.quiet().nothrow()

      await $`npm install`.cwd(projDir).quiet().nothrow()

      const ctx = makeCtx(projDir)
      const hooks = await SupplyChainGuard(ctx as any, RECIPES_DIR, cacheFile)

      const pipBin = path.join(projDir, "venv", "bin", "pip")
      const cmd = `npm install && ${pipBin} install -r requirements.txt`
      const output = await runPluginCycle(hooks, cmd, projDir)

      expect(output).toContain("npm/yarn/pnpm/bun")
      expect(output).toContain("pip/poetry/pipenv/uv")
    } finally {
      await rm(tmpDir, { recursive: true, force: true })
    }
  }, 180_000)

  test("7: no-lockfile edge case — scans but does not cache", async () => {
    const { tmpDir, cacheFile } = await makeTempDir()
    try {
      const projDir = path.join(tmpDir, "proj-nolock")
      await mkdir(path.join(projDir, "node_modules", "is-odd"), { recursive: true })
      await writeFile(path.join(projDir, "package.json"), JSON.stringify({
        name: "nolock-test", version: "1.0.0", dependencies: { "is-odd": "3.0.1" },
      }))
      await $`npm install --package-lock=false`.cwd(projDir).quiet().nothrow()

      const ctx = makeCtx(projDir)
      const hooks = await SupplyChainGuard(ctx as any, RECIPES_DIR, cacheFile)

      const output1 = await runPluginCycle(hooks, "npm install --package-lock=false", projDir, "call-1")
      expect(output1).toContain("Supply Chain Guard")
      expect(output1).toContain("Semgrep scan completed")

      const output2 = await runPluginCycle(hooks, "npm install --package-lock=false", projDir, "call-2")
      expect(output2).toContain("Semgrep scan completed")
      expect(output2).not.toContain("Skipped")

      const cacheExists = await exists(cacheFile)
      if (cacheExists) {
        const cache = JSON.parse(await readFile(cacheFile, "utf-8"))
        const key = `${projDir}::npm/yarn/pnpm/bun`
        expect(cache[key]).toBeUndefined()
      }
    } finally {
      await rm(tmpDir, { recursive: true, force: true })
    }
  }, 120_000)
})

} // end SKIP_E2E guard