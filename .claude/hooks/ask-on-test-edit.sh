#!/usr/bin/env bash
# WHY: The fastest way to make a failing test pass is to change the test. That is
# sometimes right and usually not, and the difference is a judgement call a human
# should make. This hook does not block; it asks, so an intended behaviour change
# goes through and a quiet weakening of the suite has to be admitted out loud.
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

file="$(field '.tool_input.file_path' 'file_path')"
[ -n "$file" ] || exit 0

rel="${file#"$project"/}"
rel="${rel#./}"
case "$rel" in
  test/*|e2e/*) ;;
  *) exit 0 ;;
esac

printf '%s ASK ask-on-test-edit %s\n' \
  "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$rel" >> "$project/.claude/audit.log" 2>/dev/null

printf '%s\n' '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"ask","permissionDecisionReason":"Editing a test. Confirm this is a real behaviour change, not making a failing test pass."}}'
exit 0
