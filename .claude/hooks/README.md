# Hooks

Ten hooks. Two came with the repo (prettier, typecheck); the other eight are the
workshop guardrails, wired in `workshop/state/after/settings.json` and inactive in
the `before` state. Every guardrail hook reads the event JSON on stdin, works with
or without `jq` (set `WS_NO_JQ=1` to force the no-jq path), and exits 0 silently when
the event is not its business. Anything that blocks or asks also appends a line to
`.claude/audit.log`.

Verify them without Claude in the loop: `npm run ws:selftest`.

| Hook                     | Event        | Matcher                         | Blocks / Asks / Logs                                          | Why                                                                                                                                                                                                           |
| ------------------------ | ------------ | ------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `protect-files.sh`       | PreToolUse   | `Edit\|Write\|MultiEdit`        | Blocks (exit 2) + logs                                        | Global policy, the denylist, customer records and `.claude/` are ground truth. Per-customer changes belong in `data/customers/<id>.json`; the harness belongs to humans. Rules live in `protected-paths.txt`. |
| `no-push-main.sh`        | PreToolUse   | `Bash` (`if: Bash(git push *)`) | Blocks (exit 2) + logs                                        | A push to `main`/`master` skips review; `--force` / `--force-with-lease` can erase other people's commits. Every other push passes.                                                                           |
| `block-destructive.sh`   | PreToolUse   | `Bash`                          | Blocks (exit 2) + logs                                        | `rm -rf` (outside `/tmp/` and `node_modules`), `git reset --hard`, `git clean`, `git checkout -- .`, any `docker`, and direct `scripts/ws-state.mjs` runs destroy work no test will miss.                     |
| `ask-on-test-edit.sh`    | PreToolUse   | `Edit\|Write\|MultiEdit`        | Asks (`permissionDecision: ask`) + logs                       | Editing `test/` or `e2e/` is how a failing test quietly becomes a passing one. A real behaviour change should be confirmed out loud.                                                                          |
| `ask-on-long-running.sh` | PreToolUse   | `Bash`                          | Asks (`permissionDecision: ask`) + logs                       | `npm run dev`, `npm run dev:all`, `npm start`, `node src/index`, `npm run e2e`, `npx playwright` never return — they hold the session, take ports, open browsers.                                             |
| `run-tests.sh`           | PostToolUse  | `Edit\|Write\|MultiEdit`        | Reports only (`systemMessage`, always exit 0; `timeout: 120`) | After a `.ts` edit under `src/` or `test/`, the last 15 lines of `npm test` go straight back to Claude, while the reasoning is still in context.                                                              |
| `audit-log.sh`           | PostToolUse  | `*`                             | Logs only                                                     | One line per tool call in `.claude/audit.log` — a receipt anyone can read afterwards without scrolling a transcript.                                                                                          |
| `config-audit.sh`        | ConfigChange | _(empty)_                       | Logs only                                                     | Settings moving under you is the hardest surprise to debug. Never blocks: the workshop's own state scripts rewrite settings on purpose.                                                                       |
| `prettier.sh`            | PostToolUse  | `Edit\|Write`                   | Reports only (best effort, exit 0)                            | Formats the edited file so formatting never shows up in a diff or a review.                                                                                                                                   |
| `typecheck.sh`           | PostToolUse  | `Edit\|Write`                   | Blocks (exit 2 on type errors)                                | Runs project-wide `tsc --noEmit` after a TypeScript edit; a single file can't be checked in isolation under NodeNext.                                                                                         |

## The audit log

`.claude/audit.log`, one line per event:

```
<ISO time> BLOCKED <hook> <detail>     # protect-files, no-push-main, block-destructive
<ISO time> ASK <hook> <detail>         # ask-on-test-edit, ask-on-long-running
<ISO time> <tool_name> <command|path>  # audit-log
<ISO time> CONFIG <source> <path>      # config-audit
```

`npm run ws:reset` deletes it.
