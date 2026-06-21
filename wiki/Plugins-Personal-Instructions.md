**Home > Plugins > Personal Instructions**

**Siblings:** [[Plugins-Env-Protection|Env Protection]], [[Plugins-Successful-Editing|Successful Editing]], [[Plugins-Supply-Chain-Guard|Supply Chain Guard]], [[Plugins-PHP-Tooling|PHP Tooling]]

---

# Personal Instructions Plugin

**File:** `plugins/personal-instructions.ts` (with internals in `lib/personal-instructions-internals.ts`)

## Light -- What It Does

The Personal Instructions plugin detects whether per-developer personal instructions are set up in each project. If not (or partially), it prompts the user to set them up. Per-developer instructions are gitignored, so they remain private and team-specific instructions can live in the project's own `AGENTS.md`.

Setting it up creates:
- `.opencode/personal/AGENTS.md` -- gitignored, per-developer agent instructions
- `instructions` reference in `opencode.jsonc` (so OpenCode loads the personal file)
- `.opencode/personal/*` entry in `.gitignore`
- One-line architecture note in `AGENTS.md`

## Nitty-Gritty -- How It Works

### State Detection: `detectState()`

The plugin checks four components independently:

1. **`hasPersonalFile()`** -- Does `.opencode/personal/AGENTS.md` exist?
2. **`hasInstructionsReference()`** -- Does `opencode.jsonc` have `.opencode/personal/AGENTS.md` in its `instructions` array?
3. **`hasGitignoreCoverage()`** -- Does `.gitignore` contain `.opencode/personal/*`?
4. **`hasAgentsNote()`** -- Does the project's `AGENTS.md` contain the personal-instructions architecture note?

All detection uses `fs.readFileSync` -- no shell commands, ensuring cross-platform compatibility.

### State Machine Result

| State | Action |
|-------|--------|
| All 4 components present | Skip silently (idempotent) |
| None present | Prompt user to opt in to full setup |
| Some present (partial) | List only what's missing, ask for per-item confirmation |

### Setup Functions (all idempotent)

1. **`createPersonalFile()`** -- Creates `.opencode/personal/AGENTS.md` with a starter template:
   ```markdown
   # Personal Agent Instructions

   (Per-developer overrides go here. This file is gitignored and not shared with the team.)
   ```

2. **`addInstructionsReference()`** -- Adds `".opencode/personal/AGENTS.md"` to the `instructions` array in `opencode.jsonc`. Creates the file and writes the full JSONC if it doesn't exist.

3. **`addGitignoreCoverage()`** -- Appends `.opencode/personal/*` to `.gitignore` (with a newline separator).

4. **`addAgentsNote()`** -- Inserts a one-line note into `AGENTS.md` explaining that personal per-developer overrides can be placed in `.opencode/personal/AGENTS.md`.

### JSONC Handling

Since `opencode.jsonc` contains `//` line comments (which `JSON.parse()` cannot handle), the plugin uses a `stripJsoncComments()` helper to remove `//`-style comments before parsing. After modification, it rebuilds the JSONC carefully to preserve structure.

### `/init` Re-triggering

Detection also runs when `/init` is executed, so the setup prompt appears consistently whether you start a new session or run `/init`.

### Internals in `lib/personal-instructions-internals.ts`

The state machine and setup functions live in a separate `lib/` file so they can be unit-tested independently. Same reasoning as PHP Tooling: OpenCode treats every export from a plugin file as a plugin function.

### Edge Cases

- **Existing file, no instructions reference:** Only the missing `instructions` entry is added (no overwrite of existing content)
- **Existing instructions, no personal file:** Only the missing file is created
- **Both `opencode.jsonc` and `opencode.json` exist:** The plugin only reads `opencode.jsonc` (per the project rule that `opencode.json` should be merged into `opencode.jsonc` and deleted)
- **`AGENTS.md` doesn't exist yet:** The note is prepended as a new file
- **`.gitignore` doesn't exist:** Created from scratch with just the personal instructions entry
