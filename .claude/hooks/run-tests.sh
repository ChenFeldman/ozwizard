#!/usr/bin/env bash
# WHY: The cheapest moment to learn an edit broke something is right after the
# edit, while the reasoning behind it is still in context. This hook runs the
# suite after any TypeScript change under src/ or test/ and hands the last lines
# back to Claude as a system message. It reports; it never blocks.
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
  src/*.ts|src/**/*.ts|test/*.ts|test/**/*.ts) ;;
  *) exit 0 ;;
esac
case "$rel" in *.ts) ;; *) exit 0 ;; esac

cd "$project" || exit 0
out="$(npm test -- --run 2>&1 | tail -15)"

# Escape for a JSON string: backslashes, quotes, tabs, then newlines.
esc="$(printf '%s' "$out" \
  | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g' -e 's/\t/  /g' \
  | awk '{ printf "%s\\n", $0 }')"

printf '{"hookSpecificOutput":{"hookEventName":"PostToolUse","systemMessage":"Test run after your edit:\\n%s"}}\n' "$esc"
exit 0
