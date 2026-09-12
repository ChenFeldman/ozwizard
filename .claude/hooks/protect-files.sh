#!/usr/bin/env bash
# WHY: Some files are the workshop's ground truth — global policy, the denylist,
# customer records and the .claude harness itself. An agent editing them turns a
# per-customer fix into a fleet-wide change, or lets it rewrite its own guardrails.
# This hook refuses the edit and points at the narrow, safe place to change instead.
set -uo pipefail

payload="$(cat)"
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
project="${CLAUDE_PROJECT_DIR:-$(cd "$here/../.." && pwd)}"
list="$here/protected-paths.txt"

# Field extraction: jq when we have it, a conservative sed otherwise.
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
[ -f "$list" ] || exit 0

# Compare repo-relative paths so absolute and relative payloads behave the same.
rel="${file#"$project"/}"
rel="${rel#./}"

matched=''
while IFS= read -r rule || [ -n "$rule" ]; do
  rule="${rule%%$'\r'}"
  [ -n "$rule" ] || continue
  case "$rule" in \#*) continue ;; esac
  case "$rule" in
    */) case "$rel" in $rule*) matched="$rule" ;; esac ;;
    *)  case "$rel" in $rule|$rule/*) matched="$rule" ;; esac ;;
  esac
  [ -z "$matched" ] || break
done < "$list"

[ -n "$matched" ] || exit 0

printf '%s BLOCKED protect-files %s (rule: %s)\n' \
  "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$rel" "$matched" >> "$project/.claude/audit.log" 2>/dev/null

echo "Blocked: $rel is protected ($matched). Per-customer changes go in data/customers/<id>.json; global config and the harness are for humans." >&2
exit 2
