#!/usr/bin/env bash
# PostToolUse hook: format the edited file with Prettier.
# Receives the tool payload as JSON on stdin; the edited file is at
# .tool_input.file_path. Best-effort and non-blocking (always exits 0).
set -euo pipefail

payload="$(cat)"
file="$(printf '%s' "$payload" | jq -r '.tool_input.file_path // empty')"

# Nothing to do if no file, file is gone, or it's outside the project.
[ -n "$file" ] || exit 0
[ -f "$file" ] || exit 0

project="${CLAUDE_PROJECT_DIR:-$(pwd)}"
case "$file" in
  "$project"/*) ;;      # inside the project — proceed
  *) exit 0 ;;          # outside — ignore
esac

# Only touch files Prettier understands.
case "$file" in
  *.ts|*.tsx|*.js|*.jsx|*.mjs|*.cjs|*.json|*.md|*.yml|*.yaml|*.css|*.html) ;;
  *) exit 0 ;;
esac

# Format in place; swallow noise so a formatting hiccup never blocks the edit.
npx --no-install prettier --write "$file" >/dev/null 2>&1 || true
exit 0
