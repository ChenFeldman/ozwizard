#!/usr/bin/env bash
# WHY: A handful of shell commands destroy work that no test will notice is gone —
# recursive deletes, hard resets, git clean, discarding the working tree, docker,
# and the workshop's own seed/reset script. They are cheap to type and impossible
# to undo, so the hook refuses them and lets everything else through.
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

deny() { # $1 = one-line reason
  printf '%s BLOCKED block-destructive %s\n' \
    "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$1" >> "$project/.claude/audit.log" 2>/dev/null
  echo "Blocked: $1" >&2
  exit 2
}

padded=" $cmd "

# Recursive delete — allowed only under /tmp/ or for node_modules.
case "$padded" in
  *" rm "*"-rf"*|*" rm "*"-fr"*|*" rm "*"-r "*"-f"*|*" rm "*"-f "*"-r"*|"rm "*"-rf"*|"rm "*"-fr"*)
    targets="$(printf '%s' "$cmd" | tr ' ' '\n' | grep -v -e '^rm$' -e '^-' -e '^$' -e '^sudo$' || true)"
    [ -n "$targets" ] || deny "'rm -rf' with no visible target."
    while IFS= read -r t; do
      case "$t" in
        /tmp/*|node_modules|node_modules/*|./node_modules|./node_modules/*) ;;
        *) deny "recursive delete of '$t'. Only /tmp/... and node_modules may be removed this way." ;;
      esac
    done <<< "$targets"
    ;;
esac

case "$padded" in
  *" git reset --hard"*|"git reset --hard"*)
    deny "'git reset --hard' throws away commits and working-tree changes." ;;
esac
case "$padded" in
  *" git clean"*|"git clean"*)
    deny "'git clean' deletes untracked files that are not recoverable from git." ;;
esac
case "$padded" in
  *"git checkout -- ."*|*"git checkout ."*)
    deny "'git checkout -- .' discards every uncommitted change in the tree." ;;
esac
case "$padded" in
  *" docker "*|"docker "*|*" docker"|"docker")
    deny "docker commands are out of scope for this workshop (no containers, no daemon)." ;;
esac
if printf '%s' "$cmd" | grep -Eq 'node[[:space:]]+([^|;&]*/)?ws-state\.mjs|(^|[[:space:]])\./([^ ]*/)?ws-state\.mjs'; then
  deny "running scripts/ws-state.mjs directly rewrites the workshop state and reseeds data. Use the npm scripts (ws:before / ws:after / ws:reset), and only between exercises."
fi

exit 0
