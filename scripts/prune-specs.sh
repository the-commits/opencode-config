#!/usr/bin/env bash
#
# Prune feature spec files before a release.
#
# Specs live in .opencode/specs/ and are tracked in Git for PR visibility,
# but they are temporary planning artifacts that should not ship in releases.
# This script removes them so the release tag stays clean.
#
# Usage:
#   ./scripts/prune-specs.sh          # prune (fails if specs exist and cannot be removed)
#   ./scripts/prune-specs.sh --check  # exit 0 if clean, exit 1 if specs remain
#
set -euo pipefail

SPECS_DIR=".opencode/specs"

# --check mode: report status without modifying anything
if [ "${1:-}" = "--check" ]; then
	if [ -d "$SPECS_DIR" ] && [ -n "$(ls -A "$SPECS_DIR" 2>/dev/null)" ]; then
		echo "error: spec files remain in $SPECS_DIR — run ./scripts/prune-specs.sh before releasing" >&2
		exit 1
	fi
	exit 0
fi

if [ -d "$SPECS_DIR" ]; then
	rm -rf "$SPECS_DIR"
	echo "pruned: $SPECS_DIR"
else
	echo "clean: $SPECS_DIR does not exist"
fi
