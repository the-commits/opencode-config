#!/bin/sh
# Fetches the gitleaks config from a pinned release tag.
# The downloaded TOML is stored at secrets/gitleaks.toml for reference
# and attribution. Our pre-push hook uses a curated subset of patterns
# (secrets/secret-patterns.txt) rather than the full TOML directly,
# because many gitleaks rules rely on entropy thresholds that ripgrep
# cannot evaluate.
#
# Source: https://github.com/gitleaks/gitleaks (MIT licence)
# Pinned: v8.30.1

set -eu

GITLEAKS_TAG="v8.30.1"
GITLEAKS_URL="https://raw.githubusercontent.com/gitleaks/gitleaks/${GITLEAKS_TAG}/config/gitleaks.toml"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CONFIG_DIR="$(dirname "$SCRIPT_DIR")"
DEST="${CONFIG_DIR}/secrets/gitleaks.toml"

echo "Fetching gitleaks.toml (${GITLEAKS_TAG})..." >&2

if command -v curl >/dev/null 2>&1; then
  curl -fsSL "$GITLEAKS_URL" -o "$DEST"
elif command -v wget >/dev/null 2>&1; then
  wget -qO "$DEST" "$GITLEAKS_URL"
else
  echo "Error: neither curl nor wget found." >&2
  exit 1
fi

RULE_COUNT=$(grep -c '^\[\[rules\]\]' "$DEST")
echo "Saved ${DEST} (${RULE_COUNT} rules)" >&2
