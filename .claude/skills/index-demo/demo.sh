#!/usr/bin/env bash
# Scripted walkthrough for the index-demo skill. Read-only except `codegraph init`.
# Usage: bash .claude/skills/index-demo/demo.sh
set -uo pipefail
cd "$(git rev-parse --show-toplevel)" || exit 1
export PATH="$HOME/.local/bin:$PATH"

pause() { printf '\n\033[2m— press enter —\033[0m'; read -r _; }
act()   { printf '\n\033[1;36m%s\033[0m\n' "$*"; }
say()   { printf '\033[2m%s\033[0m\n' "$*"; }

act "ACT 1 — codegraph: the code layer"
say "Use case: I'm about to change evaluate(). What breaks?"
time codegraph init
say "-> 34 files, 232 nodes, 462 edges. Zero tokens. The agent now calls codegraph_callers / codegraph_explore."
pause

act "The honest limit — ground truth via grep (6 sites; codegraph reports 2)"
grep -rn --include='*.ts' "evaluate(" src test
say "-> The 4 test sites sit inside it() callbacks with no enclosing function. grep stays the tiebreaker."
pause

act "ACT 2 — graphify: the knowledge layer"
say "Use case: do our docs still tell the truth? No grep can answer this."
graphify query "what is the db of this repo? persistence, store, Repository, DATA_PATH" 2>/dev/null | head -25
say "-> Names and file:line, no code. Orientation, not retrieval."
pause

act "What graphify found that grep cannot"
sed -n '/## Surprising Connections/,/## Suggested Questions/p' graphify-out/GRAPH_REPORT.md | head -18
say "-> Contradictions across files with no shared string. Cost: 213k tokens, ~6 min for 95 files."
pause

act "ACT 3 — the split"
printf '%-22s %-18s %s\n' "" "codegraph" "graphify"
printf '%-22s %-18s %s\n' "markdown files"  "0"        "54"
printf '%-22s %-18s %s\n' "build"           "124ms/0tok" "6min/213k tok"
printf '%-22s %-18s %s\n' "calls edges"     "65"       "33"
printf '%-22s %-18s %s\n' "returns"         "source"   "file:line"
printf '%-22s %-18s %s\n' "rebuild"         "identical" "non-deterministic"
say ""
say "codegraph = local tooling, gitignore it (rebuilds identically in 124ms)."
say "graphify  = shared artifact, build in CI and commit the output."
say ""
say "Open graphify-out/graph.html to finish on the picture."
