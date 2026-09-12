#!/usr/bin/env bash
# WHY: Settings changing under you is the hardest kind of surprise to debug — the
# rules moved, not the code. This hook records every configuration change with its
# source and file. It deliberately only logs: the workshop's own state scripts
# rewrite settings on purpose, and blocking them would break the exercise.
set -uo pipefail

payload="$(cat)"
project="${CLAUDE_PROJECT_DIR:-$(pwd)}"

field() { # $1 = jq path, $2 = bare key name
  if command -v jq >/dev/null 2>&1 && [ -z "${WS_NO_JQ:-}" ]; then
    printf '%s' "$payload" | jq -r "$1 // empty" 2>/dev/null
  else
    printf '%s' "$payload" | tr -d '\n' \
      | sed -n "s/.*\"$2\"[[:space:]]*:[[:space:]]*\"\([^\"]*\)\".*/\1/p" | head -1
  fi
}

source_name="$(field '.source' 'source')"
file="$(field '.file_path' 'file_path')"
[ -n "$source_name" ] || source_name='(unknown-source)'
[ -n "$file" ] || file='(unknown-file)'

printf '%s CONFIG %s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$source_name" "$file" \
  >> "$project/.claude/audit.log" 2>/dev/null
exit 0
