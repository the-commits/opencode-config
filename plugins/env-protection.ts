import type { Plugin } from "@opencode-ai/plugin"
import path from "node:path"

/**
 * Env Protection Plugin
 *
 * Prevents the agent from reading, editing, searching, or cat'ing .env files.
 * Only .env.example (and similar non-secret patterns) are allowed.
 *
 * Covers: read, edit, write, patch, bash (cat/head/tail/less/more), grep, glob
 */

const ALLOWED_ENV_PATTERNS = [
  /\.env\.example$/,
  /\.env\.sample$/,
  /\.env\.template$/,
]

function isProtectedEnvFile(filePath: string): boolean {
  const basename = path.basename(filePath)
  if (!/\.env($|\.)/.test(basename)) return false
  return !ALLOWED_ENV_PATTERNS.some((p) => p.test(basename))
}

// Patterns that indicate reading a file via bash
const BASH_READ_PATTERN =
  /\b(cat|head|tail|less|more|bat|source|\.)\s+.*\.env\b/

export const EnvProtection: Plugin = async (ctx) => {
  const log = async (message: string) => {
    try {
      await ctx.client.app.log({
        body: { service: "env-protection", level: "warn", message },
      })
    } catch {
      // best-effort
    }
  }

  await ctx.client.app.log({
    body: {
      service: "env-protection",
      level: "info",
      message: "Env protection plugin loaded",
    },
  })

  return {
    "tool.execute.before": async (input, output) => {
      // --- read / edit / write / patch ---
      if (["read", "edit", "write", "patch"].includes(input.tool)) {
        const filePath: string = output.args?.filePath ?? ""
        if (isProtectedEnvFile(filePath)) {
          await log(`Blocked ${input.tool} on ${filePath}`)
          throw new Error(
            `Blocked: cannot ${input.tool} ${path.basename(filePath)}. ` +
              `.env files contain secrets and must never be read by the agent. ` +
              `Use .env.example for reference.`,
          )
        }
      }

      // --- bash ---
      if (input.tool === "bash") {
        const command: string = output.args?.command ?? ""
        if (BASH_READ_PATTERN.test(command)) {
          await log(`Blocked bash command accessing .env: ${command.substring(0, 120)}`)
          throw new Error(
            `Blocked: bash command attempts to read a .env file. ` +
              `.env files contain secrets and must never be read by the agent. ` +
              `Use .env.example for reference.`,
          )
        }
      }

      // --- grep ---
      if (input.tool === "grep") {
        const include: string = output.args?.include ?? ""
        if (/\.env($|\.)/.test(include) && !ALLOWED_ENV_PATTERNS.some((p) => p.test(include))) {
          await log(`Blocked grep with .env include pattern: ${include}`)
          throw new Error(
            `Blocked: grep targeting .env files. ` +
              `.env files contain secrets and must never be searched by the agent.`,
          )
        }
      }
    },
  }
}
