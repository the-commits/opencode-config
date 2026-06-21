**Home > Skills & Tools > Math Tools**

**Parent:** [[Skills-and-Tools|Skills & Tools]]
**Siblings:** [[Tools-Feature-Planning|Feature Planning]], [[Tools-Vulnerability-Handling|Vulnerability Handling]], [[Tools-SBOM-Scan|SBOM Scan]]

---

# Math Tools

**Tool file:** `tools/math.ts`
**Library:** `lib/text-to-number.ts`

## Light

Four arithmetic tools that force the agent to use proper calculation instead of guessing in its head. Supports natural-language number input in 5 languages.

## Nitty-Gritty

### Tools

- `math_add(a, b)` -- Addition
- `math_subtract(a, b)` -- Subtraction
- `math_multiply(a, b)` -- Multiplication
- `math_divide(a, b)` -- Division (throws on division by zero)

### Multi-Language Parsing

Both arguments run through `textToNumber()` which supports:

- **English:** `one` through `nineteen`, `twenty` through `ninety`, scales
- **Swedish:** `noll`, `en`, `ett`, `två`, `tjugo`, `trettio`...
- **Spanish:** `cero`, `un`, `uno`, `dos`, `veinte`, `treinta`...
- **German:** `null`, `eins`, `zwei`, `zwanzig`, `dreißig`...
- **French:** `zéro`, `deux`, `trois`, `vingt`, `trente`... plus special combos like `quatre-vingts` (80)

### Short vs. Long Scale

Detects US short-scale (`"billion"` = 1,000,000,000) vs UK/European long-scale (`"billion"` = 1,000,000,000,000) based on currency context hints (`$` vs `£`).

### Compound Parsing

Handles multi-word numbers: `"twenty three"` → 23, `"two hundred fifty"` → 250. Uses connector words: `and`, `y` (Spanish), `und` (German), `och` (Swedish), `et` (French).

### French Specifics

Normalizes compounded forms: `quatre-vingts` → `quatrevingt`, `soixante-dix` → `seventy`, `quatrevingt-dix` → `ninety`. Throws on unparseable input.
