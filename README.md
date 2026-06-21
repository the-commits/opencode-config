# opencode-config

An opinionated [OpenCode](https://opencode.ai) configuration with security baked in. Plugins, Semgrep rules, env file guarding, secret scanning, and agent guidelines -- the whole lot.

> **Quick start** -- see [Setup](#setup) to get going in two minutes. For detailed documentation on every component, visit the **[Wiki](https://github.com/the-commits/opencode-config/wiki)**.

### Documentation

| Document | Audience | Description |
|---|---|---|
| [README.md](README.md) | End users | This file -- what's included and how to set up |
| [Wiki](https://github.com/the-commits/opencode-config/wiki) | Everyone | Deep documentation for all components: plugins, Semgrep recipes, agent modes, skills, tools, MCP servers, security |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Contributors | Development setup, testing, and commit conventions |
| [AGENTS.md](AGENTS.md) | AI agents | System-wide agent guidelines (applied globally) |
| [PROJECT.md](PROJECT.md) | AI agents | Dev rules for this repo only (loaded via `opencode.jsonc`) |
| [secrets/ATTRIBUTION.md](secrets/ATTRIBUTION.md) | Everyone | Third-party sources for secret scanning patterns |
| [LICENSE](LICENSE) | Everyone | MIT licence |

---

## What's in the box

Everything below lives in `~/.config/opencode/` and applies **globally** across all your projects. See the **[Wiki](https://github.com/the-commits/opencode-config/wiki)** for full details on each component.

| Category | Components |
|---|---|
| **Plugins** | Env Protection, Successful Editing, Supply Chain Guard, PHP Tooling, Personal Instructions |
| **Semgrep Recipes** | 292 custom rules across 15 recipe files covering 11 language ecosystems |
| **Agent Modes** | 7 modes: scout, brainstorm, plan, analyze, build, build-lite, build-meticulous |
| **Skills & Tools** | Feature Planning, Vulnerability Handling, Math Tools, SBOM Scan |
| **MCP Servers** | Semgrep MCP, Chrome DevTools MCP, Web Search with Citations |
| **Security** | Pre-push secret scanning, NPM hardening, environment file protection |

---

## What happens in your projects

When you open OpenCode inside any code project, these things kick in automatically:

- **Supply Chain Guard** scans after every `npm install`, `composer install`, `pip install`, etc.
- **Env Protection** blocks the agent from touching your `.env` files
- **Successful Editing** verifies edits via LSP before the agent moves on
- **PHP Tooling** auto-provisions Xdebug MCP if the project is PHP (creates or suggests adding to the project's `opencode.jsonc`)
- **Personal Instructions** detects whether per-developer personal instructions are set up and prompts to create `.opencode/personal/AGENTS.md` (gitignored, not shared with the team)
- **NPM Hardening** enforces pinned dependencies, integrity hashes, and disabled lifecycle scripts via `.npmrc` and `scripts/verify-deps.mjs`
- **Secret scanning** runs on every `git push` via the pre-push hook

Project-specific configuration goes in the project's own `opencode.jsonc` (or `opencode.json`). The PHP Tooling plugin creates this automatically for PHP projects. The Personal Instructions plugin prompts you to set up a gitignored `.opencode/personal/AGENTS.md` for per-developer overrides. For other project-specific MCP servers or overrides, create this file yourself at the project root.

---

## Setup

You'll be needing [OpenCode](https://opencode.ai), [Semgrep](https://semgrep.dev), and [ripgrep](https://github.com/BurntSushi/ripgrep).

### Fork or clone (recommended)

Fork or clone the repo, check out a release tag, and install. Updates come through git.

```bash
# Fork on GitHub first, then:

# Back up your existing config if you have one
[ -d ~/.config/opencode ] && mv ~/.config/opencode ~/.config/opencode.bak

# Clone straight into ~/.config/opencode -- no extra env var needed
git clone https://github.com/<you>/opencode-config.git ~/.config/opencode
cd ~/.config/opencode

# Check out the latest release
git checkout v3.3.0

# Install dependencies (ignore-scripts=true in .npmrc blocks lifecycle scripts)
npm install

# Set up git hooks manually (prepare script is disabled by ignore-scripts)
npx husky
```

#### Updating

Pull new releases from upstream and check out the tag:

```bash
cd ~/.config/opencode
git fetch --tags
git checkout v3.3.0
npm install
npx husky
```

> **Note for forks:** GitHub's "Sync fork" button only syncs branches, not tags. You need to fetch tags from upstream manually:
>
> ```bash
> cd ~/.config/opencode
> git remote add upstream https://github.com/the-commits/opencode-config.git  # once
> git fetch --tags upstream
> git push origin --tags
> ```

### Cherry-pick what you want

You can also just grab the bits you fancy:

```bash
# Copy only the plugins into your existing setup
cp -r plugins/ ~/.config/opencode/plugins/

# Or just the semgrep recipes
cp -r semgrep/ ~/.config/opencode/semgrep/

# Or the secret scanning patterns + hook
cp -r secrets/ ~/.config/opencode/secrets/
cp .husky/pre-push ~/.config/opencode/.husky/pre-push
```

---

The plugins fire up automatically at startup. Semgrep recipes are referenced by the supply chain guard plugin at runtime.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, testing, and commit conventions.

---

## Third-party attribution

The pre-push secret scanning patterns in `secrets/secret-patterns.txt` were derived from and validated against:

- **[gitleaks](https://github.com/gitleaks/gitleaks)** (MIT licence, pinned to v8.30.1) -- the leading open-source secret detection tool. Run `scripts/fetch-gitleaks-config.sh` to download the full `gitleaks.toml` for reference.
- **[GitHub secret scanning](https://docs.github.com/en/code-security/secret-scanning)** -- GitHub's documentation on supported secret scanning patterns and partner integrations.

See `secrets/ATTRIBUTION.md` for full details.

## Licence

[MIT](LICENSE)
