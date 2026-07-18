#!/usr/bin/env bash
# PostToolUse hook: after editing a TypeScript file, run a full-project
# `tsc --noEmit`. On type errors, print them to stderr and exit 2 so Claude
# sees the failure. Clean → exit 0 (silent).
#
# Note: tsc is run project-wide (`-p tsconfig.json`), not per-file, because a
# single file can't be type-checked correctly in isolation under NodeNext.
set -uo pipefail

payload="$(cat)"
file="$(printf '%s' "$payload" | jq -r '.tool_input.file_path // empty')"

# Only react to TypeScript source edits.
case "$file" in
  *.ts|*.tsx) ;;
  *) exit 0 ;;
esac

project="${CLAUDE_PROJECT_DIR:-$(pwd)}"
cd "$project" || exit 0
[ -f tsconfig.json ] || exit 0

out="$(npx --no-install tsc --noEmit -p tsconfig.json 2>&1)"
status=$?

if [ "$status" -ne 0 ]; then
  {
    echo "tsc --noEmit reported type errors:"
    echo "$out"
  } >&2
  exit 2
fi
exit 0
