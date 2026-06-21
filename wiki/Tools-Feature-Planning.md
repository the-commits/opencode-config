**Home > Skills & Tools > Feature Planning**

**Parent:** [[Skills-and-Tools|Skills & Tools]]
**Siblings:** [[Tools-Vulnerability-Handling|Vulnerability Handling]], [[Tools-Math|Math Tools]], [[Tools-SBOM-Scan|SBOM Scan]]

---

# Feature Planning (`/feature`)

**Tool file:** `tools/feature-planning.ts`
**Skill file:** `skills/feature-planning/SKILL.md`
**Command file:** `commands/feature.md`

## Light

An interactive agile planning session. When you ask to plan a feature, write user stories, or break down an epic, the agent loads the Feature Planning skill to guide the session. It runs in **plan** mode (read-only).

## Nitty-Gritty

The tool is a thin loader: it resolves the config directory, reads `SKILL.md`, strips YAML frontmatter, and injects the content into the agent's context. All workflow logic lives in the markdown file itself.

### 7-Step Workflow

1. **Understand the feature goal** -- Clarify purpose, persona, outcome, constraints
2. **Write user stories** -- Uses INVEST criteria (Independent, Negotiable, Valuable, Estimable, Small, Testable)
3. **Define acceptance criteria** -- Given/When/Then Gherkin syntax, covering happy path, edge cases, error states
4. **Split large stories** -- Uses splitting patterns: workflow steps, data variations, business rule variations, operational needs
5. **Estimate complexity** -- T-shirt sizing (XS, S, M, L, XL) or story points (Fibonacci)
6. **Definition of Done** -- Customizable checklist
7. **Output feature spec** -- Structured markdown template

### After Estimation: Mode Recommendation

- All stories XS → **build-lite** mode (fast, lightweight model)
- Mix of XS/S → **build** mode (standard implementation)
- Any M+ → **build-meticulous** mode (deep analysis, split M+ stories to S/XS first)

### TDD Recommendation

- S and M+ stories should use **red-green-refactor** (write failing tests first)
- XS stories (handled by build-lite) do **not** require TDD
