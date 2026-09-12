#!/usr/bin/env bash
# WHY: Dev servers and browser suites do not return — they hold the session open,
# take ports, and can pop browser windows on someone else's screen. The agent
# rarely needs one to finish a task, so this hook asks first instead of letting a
# turn hang on a process nobody meant to start.
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

cmd="$(field '.tool_input.command' 'command')"
[ -n "$cmd" ] || exit 0

match=''
case "$cmd" in
  "npm run dev:all"*|*" npm run dev:all"*) match='npm run dev:all' ;;
  "npm run dev"*|*" npm run dev"*)         match='npm run dev' ;;
  "npm start"*|*" npm start"*)             match='npm start' ;;
  "node src/index"*|*" node src/index"*)   match='node src/index' ;;
  "npm run e2e"*|*" npm run e2e"*)         match='npm run e2e' ;;
  "npx playwright"*|*" npx playwright"*)   match='npx playwright' ;;
esac
[ -n "$match" ] || exit 0

printf '%s ASK ask-on-long-running %s\n' \
  "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$match" >> "$project/.claude/audit.log" 2>/dev/null

printf '%s\n' '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"ask","permissionDecisionReason":"Starts a long-running process or opens browsers. Confirm."}}'
exit 0
