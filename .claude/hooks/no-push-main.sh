#!/usr/bin/env bash
# WHY: A push to main or master skips review and lands straight on the branch
# everyone builds from, and a forced push can erase someone else's commits.
# Work goes to a feature branch and through a pull request; this hook keeps
# every other push working and stops only those two shapes.
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
case "$cmd" in *"git push"*) ;; *) exit 0 ;; esac

deny() { # $1 = short reason for the log, $2 = message for Claude
  printf '%s BLOCKED no-push-main %s\n' \
    "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$1" >> "$project/.claude/audit.log" 2>/dev/null
  echo "$2" >&2
  exit 2
}

padded=" $cmd "
case "$padded" in
  *" --force-with-lease"*)
    deny "--force-with-lease" "Blocked: --force-with-lease rewrites the remote branch. Push without force, or ask a human." ;;
  *" --force"*|*" -f "*)
    deny "--force" "Blocked: a forced push can erase other people's commits. Push without --force, or ask a human." ;;
esac

# Which branch is this aimed at? Look at the refspec side of the push.
branch=''
for word in $cmd; do
  case "$word" in
    main|master|*:main|*:master|refs/heads/main|refs/heads/master)
      branch="${word##*:}"; branch="${branch##refs/heads/}" ;;
  esac
done

if [ -n "$branch" ]; then
  deny "push to $branch" "Blocked: pushing to $branch is not allowed. Push a feature branch and open a pull request."
fi
exit 0
