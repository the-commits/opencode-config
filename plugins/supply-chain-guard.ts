import type { Plugin } from "@opencode-ai/plugin"
import { createHash } from "node:crypto"
import fs from "node:fs"
import path from "node:path"

/**
 * Supply Chain Guard Plugin
 *
 * Intercepts bash tool calls that run package manager install/update commands
 * and automatically runs Semgrep security recipes afterward. Each ecosystem
 * runs one or more scan passes: vendor directories (node_modules, vendor, etc.)
 * AND project source code, so backdoors are caught in both dependencies and
 * your own code.
 *
 * Uses lockfile + recipes hashing to skip scans when nothing changed.
 *
 * Supported ecosystems:
 *   JS/TS  - npm, pnpm, yarn, bun       (deps + source)
 *   PHP    - composer                    (deps + source)
 *   C#     - dotnet, nuget               (source)
 *   Ruby   - bundler, gem                (deps + source)
 *   Java   - maven (mvn), gradle         (source)
 *   Python - pip, pip3, poetry, pipenv, uv (source)
 *   Rust   - cargo                       (source)
 *   Go     - go modules                  (source)
 *   C/C++  - conan, vcpkg                (source)
 */

// =============================================================================
// Ecosystem configurations
// =============================================================================

interface ScanPass {
  /** Label for this scan pass (shown in output headers) */
  label: string
  /** Directory to scan with semgrep (relative to workdir) */
  target: string
  /** Extra semgrep flags needed for this scan pass */
  flags: string[]
}

interface EcosystemConfig {
  /** Human-readable name */
  name: string
  /** Regex to detect install/update commands in bash */
  installPattern: RegExp
  /** Lockfiles to hash for cache invalidation (checked in order, first found wins) */
  lockfiles: string[]
  /** One or more scan passes to run after install (vendor dir + project source, or just source) */
  scanPasses: ScanPass[]
}

const ECOSYSTEMS: EcosystemConfig[] = [
  // --- JS/TS ---
  {
    name: "npm/yarn/pnpm/bun",
    installPattern:
      /\b(npm|pnpm|yarn|bun|npx|bunx)\s+(?:(?:run|exec|dlx)\s+)?(?:install|add|ci|update|upgrade|i)(?:\s|$|;|&&|\|)/,
    lockfiles: [
      "package-lock.json",
      "yarn.lock",
      "pnpm-lock.yaml",
      "bun.lockb",
    ],
    scanPasses: [
      {
        label: "dependencies",
        target: "node_modules/",
        // node_modules is gitignored AND semgrepignored by default
        flags: ["--no-git-ignore", "--exclude=!node_modules"],
      },
      {
        label: "source",
        target: ".",
        flags: [],
      },
    ],
  },

  // --- PHP ---
  {
    name: "composer",
    installPattern:
      /\bcomposer\s+(?:install|require|update|dump-autoload)(?:\s|$|;|&&|\|)/,
    lockfiles: ["composer.lock"],
    scanPasses: [
      {
        label: "dependencies",
        target: "vendor/",
        flags: ["--no-git-ignore", "--exclude=!vendor"],
      },
      {
        label: "source",
        target: ".",
        flags: [],
      },
    ],
  },

  // --- C# / .NET ---
  {
    name: "dotnet/nuget",
    installPattern:
      /\b(?:dotnet\s+(?:restore|add\s+package|build)|nuget\s+(?:install|restore|update))(?:\s|$|;|&&|\|)/,
    lockfiles: [
      "packages.lock.json",
      "obj/project.assets.json",
    ],
    scanPasses: [
      {
        label: "source",
        target: ".",
        // .NET stores packages globally in ~/.nuget — scan the project source
        flags: [],
      },
    ],
  },

  // --- Ruby ---
  {
    name: "bundler/gem",
    installPattern:
      /\b(?:bundle\s+(?:install|update|add)|gem\s+install)(?:\s|$|;|&&|\|)/,
    lockfiles: ["Gemfile.lock"],
    scanPasses: [
      {
        label: "dependencies",
        target: "vendor/bundle/",
        flags: ["--no-git-ignore", "--exclude=!vendor"],
      },
      {
        label: "source",
        target: ".",
        flags: [],
      },
    ],
  },

  // --- Java ---
  {
    name: "maven/gradle",
    installPattern:
      /\b(?:mvn\s+(?:install|dependency:resolve|dependency:copy-dependencies|package|compile|verify)|gradle\s+(?:build|dependencies|assemble|compileJava)|\.\/gradlew\s+(?:build|dependencies|assemble|compileJava))(?:\s|$|;|&&|\|)/,
    lockfiles: [
      "gradle.lockfile",
      "pom.xml",
      "build.gradle",
      "build.gradle.kts",
    ],
    scanPasses: [
      {
        label: "source",
        target: ".",
        // Java deps go to ~/.m2 or build/libs — scan project source
        flags: [],
      },
    ],
  },

  // --- Python ---
  {
    name: "pip/poetry/pipenv/uv",
    installPattern:
      /\b(?:pip3?\s+install|poetry\s+(?:install|add|update)|pipenv\s+(?:install|update)|uv\s+(?:pip\s+install|sync|add))(?:\s|$|;|&&|\|)/,
    lockfiles: [
      "poetry.lock",
      "Pipfile.lock",
      "requirements.txt",
      "uv.lock",
    ],
    scanPasses: [
      {
        label: "source",
        target: ".",
        // Python deps go to site-packages — scan project source
        flags: [],
      },
    ],
  },

  // --- Rust ---
  {
    name: "cargo",
    installPattern:
      /\bcargo\s+(?:build|add|update|install|fetch)(?:\s|$|;|&&|\|)/,
    lockfiles: ["Cargo.lock"],
    scanPasses: [
      {
        label: "source",
        target: ".",
        // Rust deps go to ~/.cargo or target/ — scan project source
        flags: [],
      },
    ],
  },

  // --- Go ---
  {
    name: "go modules",
    installPattern:
      /\bgo\s+(?:get|mod\s+(?:download|tidy)|build|install)(?:\s|$|;|&&|\|)/,
    lockfiles: ["go.sum"],
    scanPasses: [
      {
        label: "source",
        target: ".",
        // Go deps go to GOPATH/pkg/mod — scan project source
        flags: [],
      },
    ],
  },

  // --- C/C++ ---
  {
    name: "conan/vcpkg",
    installPattern:
      /\b(?:conan\s+install|vcpkg\s+install)(?:\s|$|;|&&|\|)/,
    lockfiles: [
      "conan.lock",
      "vcpkg.json",
    ],
    scanPasses: [
      {
        label: "source",
        target: ".",
        flags: [],
      },
    ],
  },
]

// =============================================================================
// Config paths
// =============================================================================

const CONFIG_DIR =
  process.env.OPENCODE_CONFIG_DIR ||
  path.join(process.env.HOME || "~", ".config", "opencode")
const SEMGREP_RECIPES = path.join(CONFIG_DIR, "semgrep", "recipes")
const CACHE_FILE = path.join(CONFIG_DIR, ".supply-chain-guard-cache.json")

// =============================================================================
// Hashing utilities
// =============================================================================

function md5(content: string | Buffer): string {
  return createHash("md5").update(content).digest("hex")
}

function hashFile(filePath: string): string | null {
  try {
    return md5(fs.readFileSync(filePath))
  } catch {
    return null
  }
}

function hashLockfiles(workdir: string, lockfiles: string[]): string | null {
  for (const lockfile of lockfiles) {
    const h = hashFile(path.join(workdir, lockfile))
    if (h) return h
  }
  return null
}

function hashRecipes(): string {
  try {
    const files = fs
      .readdirSync(SEMGREP_RECIPES)
      .filter((f) => f.endsWith(".yaml") || f.endsWith(".yml"))
      .sort()
    const combined = files
      .map((f) => fs.readFileSync(path.join(SEMGREP_RECIPES, f), "utf8"))
      .join("")
    return md5(combined)
  } catch {
    return "no-recipes"
  }
}

// =============================================================================
// Cache persistence
// =============================================================================

interface CacheEntry {
  lockfileHash: string
  recipesHash: string
  findingsCount: number
  scannedAt: string
  ecosystem: string
}

type Cache = Record<string, CacheEntry>

function loadCache(): Cache {
  try {
    return JSON.parse(fs.readFileSync(CACHE_FILE, "utf8"))
  } catch {
    return {}
  }
}

function saveCache(cache: Cache): void {
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), "utf8")
  } catch {
    // best-effort
  }
}

// =============================================================================
// Detect which ecosystem(s) a command targets
// =============================================================================

interface DetectedInstall {
  ecosystem: EcosystemConfig
  command: string
}

function detectInstalls(command: string): DetectedInstall[] {
  const matches: DetectedInstall[] = []
  for (const eco of ECOSYSTEMS) {
    if (eco.installPattern.test(command)) {
      matches.push({ ecosystem: eco, command })
    }
  }
  return matches
}

// =============================================================================
// Format findings summary
// =============================================================================

function formatFindings(stdout: string, ecoName: string): { summary: string; count: number } {
  if (!stdout) {
    return {
      summary: `\n\n--- Supply Chain Guard (${ecoName}) ---\nSemgrep scan completed: no output (dependency directory may not exist).\n`,
      count: 0,
    }
  }

  try {
    const json = JSON.parse(stdout)
    const findings = json.results || []

    if (findings.length === 0) {
      return {
        summary: `\n\n--- Supply Chain Guard (${ecoName}) ---\nSemgrep scan completed: 0 findings. Dependencies look clean.\n`,
        count: 0,
      }
    }

    const lines = [
      `\n\n--- Supply Chain Guard (${ecoName}) ---`,
      `Semgrep scan completed: ${findings.length} finding(s)!\n`,
    ]

    // Group by rule
    const byRule = new Map<string, number>()
    for (const f of findings) {
      const rule = f.check_id || "unknown"
      byRule.set(rule, (byRule.get(rule) || 0) + 1)
    }
    for (const [rule, count] of byRule) {
      lines.push(`  ${rule}: ${count} hit(s)`)
    }

    // Show first 10 details
    const shown = findings.slice(0, 10)
    lines.push("")
    for (const f of shown) {
      const file = f.path || "?"
      const line = f.start?.line || "?"
      const rule = f.check_id || "?"
      const snippet = (f.extra?.lines || "").substring(0, 120)
      lines.push(`  [${rule}] ${file}:${line}`)
      if (snippet) lines.push(`    ${snippet}`)
    }
    if (findings.length > 10) {
      lines.push(`  ... and ${findings.length - 10} more findings.`)
    }
    lines.push("")

    return { summary: lines.join("\n"), count: findings.length }
  } catch {
    return {
      summary: `\n\n--- Supply Chain Guard (${ecoName}) ---\nSemgrep output:\n${stdout.substring(0, 2000)}\n`,
      count: 0,
    }
  }
}

// =============================================================================
// Plugin
// =============================================================================

interface PendingCall {
  detections: DetectedInstall[]
  cwd?: string
  lockfileHashesBefore: Map<string, string | null>
}

const pendingCalls = new Map<string, PendingCall>()

export const SupplyChainGuard: Plugin = async (ctx) => {
  const log = async (level: string, message: string) => {
    try {
      await ctx.client.app.log({
        body: { service: "supply-chain-guard", level, message },
      })
    } catch {
      // logging is best-effort
    }
  }

  await log("info", "Supply Chain Guard plugin loaded (multi-ecosystem)")

  return {
    "tool.execute.before": async (input, output) => {
      if (input.tool !== "bash") return

      const command: string = output.args?.command ?? ""
      if (!command) return

      const detections = detectInstalls(command)
      if (detections.length === 0) return

      const workdir = output.args?.workdir || ctx.directory

      // Hash lockfiles for each detected ecosystem before install
      const lockfileHashesBefore = new Map<string, string | null>()
      for (const det of detections) {
        lockfileHashesBefore.set(
          det.ecosystem.name,
          hashLockfiles(workdir, det.ecosystem.lockfiles),
        )
      }

      pendingCalls.set(input.callID, {
        detections,
        cwd: workdir,
        lockfileHashesBefore,
      })

      const ecoNames = detections.map((d) => d.ecosystem.name).join(", ")
      await log(
        "info",
        `Detected install command for [${ecoNames}]: ${command.substring(0, 120)}`,
      )
    },

    "tool.execute.after": async (input, output) => {
      if (input.tool !== "bash") return

      const pending = pendingCalls.get(input.callID)
      if (!pending) return
      pendingCalls.delete(input.callID)

      const workdir = pending.cwd || ctx.directory
      const currentRecipesHash = hashRecipes()
      const cache = loadCache()

      for (const det of pending.detections) {
        const eco = det.ecosystem
        const lockfileHashAfter = hashLockfiles(workdir, eco.lockfiles)
        const lockfileHashBefore = pending.lockfileHashesBefore.get(eco.name)
        const cacheKey = `${workdir}::${eco.name}`
        const cached = cache[cacheKey]

        // Check cache: skip scan if lockfile and recipes unchanged
        if (
          cached &&
          cached.lockfileHash === lockfileHashAfter &&
          cached.recipesHash === currentRecipesHash &&
          lockfileHashBefore === lockfileHashAfter
        ) {
          await log(
            "info",
            `Skipping scan for ${eco.name} in ${workdir}: lockfile and recipes unchanged (cached ${cached.findingsCount} findings from ${cached.scannedAt})`,
          )
          output.output =
            (output.output || "") +
            `\n\n--- Supply Chain Guard (${eco.name}) ---\nSkipped: no changes detected (lockfile + recipes unchanged). Last scan: ${cached.findingsCount} finding(s) on ${cached.scannedAt}.\n`
          continue
        }

        let totalFindings = 0

        for (const pass of eco.scanPasses) {
          const passLabel = `${eco.name} / ${pass.label}`

          // Check scan target exists
          const scanTargetPath = path.join(workdir, pass.target)
          try {
            fs.accessSync(scanTargetPath)
          } catch {
            await log(
              "info",
              `Scan target ${pass.target} does not exist in ${workdir}, skipping ${passLabel} scan`,
            )
            output.output =
              (output.output || "") +
              `\n\n--- Supply Chain Guard (${passLabel}) ---\nSkipped: ${pass.target} not found.\n`
            continue
          }

          await log(
            "info",
            `Running Semgrep supply chain scan for ${passLabel} in ${workdir}/${pass.target}`,
          )

          try {
            // Build and run semgrep command with pass-specific flags
            // Using sh -c because the flag set varies per pass.
            // Paths are single-quoted to handle spaces.
            const flagStr = pass.flags
              .map((f) => `'${f}'`)
              .join(" ")
            const cmd = [
              "semgrep",
              "--config",
              `'${SEMGREP_RECIPES}'`,
              flagStr,
              "--json",
              `'${pass.target}'`,
            ]
              .filter(Boolean)
              .join(" ")

            const result = await ctx
              .$`sh -c ${cmd}`
              .cwd(workdir)
              .quiet()
              .nothrow()

            const stdout = result.stdout.toString().trim()
            const { summary, count } = formatFindings(stdout, passLabel)
            totalFindings += count

            output.output = (output.output || "") + summary
          } catch (e: any) {
            const errMsg = e?.message || String(e)
            await log("warn", `Semgrep scan failed for ${passLabel}: ${errMsg}`)
            output.output =
              (output.output || "") +
              `\n\n--- Supply Chain Guard (${passLabel}) ---\nSemgrep scan failed: ${errMsg.substring(0, 500)}\n`
          }
        }

        // Update cache after all passes complete
        if (lockfileHashAfter) {
          cache[cacheKey] = {
            lockfileHash: lockfileHashAfter,
            recipesHash: currentRecipesHash,
            findingsCount: totalFindings,
            scannedAt: new Date().toISOString().split("T")[0],
            ecosystem: eco.name,
          }
          saveCache(cache)
        }
      }
    },
  }
}
