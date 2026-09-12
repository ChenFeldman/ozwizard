#!/usr/bin/env bash
# WHY: A workshop needs a receipt. This hook writes one line per tool call to
# .claude/audit.log so anyone can see afterwards what the agent actually ran and
# touched, in order, without scrolling a transcript. It only observes — it never
# blocks and never fails a tool call.
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

tool="$(field '.tool_name' 'tool_name')"
detail="$(field '.tool_input.command' 'command')"
[ -n "$detail" ] || detail="$(field '.tool_input.file_path' 'file_path')"
[ -n "$tool" ] || tool='(unknown)'

printf '%s %s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$tool" "$detail" \
  >> "$project/.claude/audit.log" 2>/dev/null
exit 0
