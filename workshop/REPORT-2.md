# Workshop prep — Report 2: guardrails (hooks, permissions, self-test)

Branch `workshop-s1`, on top of tag `s1-step1`. Everything below was run on
2026-09-12 on macOS (darwin 25.6.0), Node 20+, zsh.

**`jq` present: yes** — `/usr/bin/jq`. Every hook was still verified twice: once
with jq, once with `WS_NO_JQ=1` forcing the grep/sed fallback, so the hooks work on
a laptop without jq too.

## Results

| Step | Item | Status | Proof |
| --- | --- | --- | --- |
| 0 | Working tree clean | PASS | `git status --short` -> (no output) |
| 0 | Branch | PASS | `git rev-parse --abbrev-ref HEAD` -> `workshop-s1` |
| 0 | Tag `s1-step1` exists | PASS | `git tag -l 's1-*'` -> `s1-step1` |
| 0 | Reset + check baseline | PASS | `npm run ws:reset` -> `ws-state: reset complete`; `npm run ws:check` -> `11/11 rows PASS`, Active state = `none` |
| 0 | jq installed | PASS | `command -v jq` -> `/usr/bin/jq` |
| 1 | 8 hook scripts exist, executable | PASS | `ls -l .claude/hooks/` -> `protect-files.sh no-push-main.sh block-destructive.sh ask-on-test-edit.sh ask-on-long-running.sh run-tests.sh audit-log.sh config-audit.sh`, all `-rwxr-xr-x` |
| 1 | Each has a `# WHY:` header | PASS | `for f in .claude/hooks/*.sh; do sed -n '2p' $f; done` -> all eight start `# WHY:` (prettier.sh / typecheck.sh keep their original headers) |
| 1 | `bash -n` on each | PASS | `for f in .claude/hooks/*.sh; do bash -n "$f"; done` -> `syntax ok` (no output) |
| 1 | `protected-paths.txt` created | PASS | 5 rules: `config/policy.json`, `config/denylist.json`, `data/customers/`, `.env`, `.claude/` |
| 2 | `workshop/state/after/settings.json` valid JSON | PASS | `node -e "JSON.parse(...)"` -> `after/settings.json: valid JSON` |
| 2 | after wires all 10 hooks + permissions | PASS | 3 `PreToolUse` groups, 3 `PostToolUse` groups (prettier+typecheck kept), 1 `ConfigChange`; `permissions.allow` 9 rules, `permissions.deny` `Read(./.env)`, `Read(./.env.*)`; no `ask` rules |
| 2 | `.claude/hooks/README.md` lists 10 hooks | PASS | `grep -c '^| `' .claude/hooks/README.md` -> `10` |
| 3 | `npm run ws:selftest` wired | PASS | `package.json` scripts -> `... ws:check ws:selftest` |
| 3 | Self-test, run 1 (with jq) | PASS | `21/21 rows PASS` |
| 3 | Self-test, run 2 (`WS_NO_JQ=1`) | PASS | `21/21 rows PASS` |
| 3 | Self-test exit code | PASS | `npm run ws:selftest; echo $?` -> `0`, final line `**Total: all rows PASS**` |
| 3 | Self-test leaves no trace | PASS | Hooks run against a throwaway `CLAUDE_PROJECT_DIR` (`mkdtemp`), removed at the end; the runner re-reads `.claude/settings.json` before and after and fails the run if it changed |
| 3 | `run-tests.sh` emits parseable JSON | PASS | piped through `JSON.parse` -> `valid JSON`, `systemMessage` tail `Tests  16 passed (16)` |
| 4 | `ws:after` round trip | PASS | `npm run ws:after` -> `activated "after"`; `npm run ws:check` -> `12/12 rows PASS`; `diff .claude/settings.json workshop/state/after/settings.json` -> `IDENTICAL` |
| 4 | `ws:check` runs the self-test in state `after` | PASS | extra row: `| npm run ws:selftest | PASS | 21/21 rows PASS + 21/21 rows PASS |` |
| 4 | `ws:before` round trip | PASS | `npm run ws:before` -> `activated "before"`; `npm run ws:check` -> `11/11 rows PASS`; `diff` vs before file -> `IDENTICAL` |
| 4 | `before/settings.json` untouched | PASS | `git diff --stat workshop/state/before/settings.json` -> (no diff) |
| 4 | `ws:reset` round trip | PASS | `npm run ws:reset` -> `reset complete`; `npm run ws:check` -> `11/11 rows PASS`, Active state = `none` |
| 5 | Commit + tag | see below | `workshop: step 2 guardrails, hooks, permissions, self-test`, tag `s1-step2` |

## Self-test output (both runs, verbatim)

```
> node scripts/ws-selftest.mjs


### Run 1 — with jq (if installed)

| Hook | Case | Expected | Got | PASS/FAIL |
| --- | --- | --- | --- | --- |
| `protect-files.sh` | Edit config/policy.json | exit 2, stderr ~ "Blocked" | exit 2, stderr "Blocked: config/policy.json is protected (config/p", stdout empty | PASS |
| `protect-files.sh` | Edit .claude/settings.json | exit 2, stderr ~ "Blocked" | exit 2, stderr "Blocked: .claude/settings.json is protected (.clau", stdout empty | PASS |
| `protect-files.sh` | Edit src/core/policy.ts | exit 0, stdout empty | exit 0, stdout empty | PASS |
| `no-push-main.sh` | git push origin main | exit 2, stderr ~ "Blocked" | exit 2, stderr "Blocked: pushing to main is not allowed. Push a fe", stdout empty | PASS |
| `no-push-main.sh` | git push origin master | exit 2, stderr ~ "Blocked" | exit 2, stderr "Blocked: pushing to master is not allowed. Push a ", stdout empty | PASS |
| `no-push-main.sh` | git push --force origin feature/x | exit 2, stderr ~ "Blocked" | exit 2, stderr "Blocked: a forced push can erase other people's co", stdout empty | PASS |
| `no-push-main.sh` | git push origin feature/x | exit 0, stdout empty | exit 0, stdout empty | PASS |
| `block-destructive.sh` | rm -rf node_modules | exit 0, stdout empty | exit 0, stdout empty | PASS |
| `block-destructive.sh` | rm -rf src | exit 2, stderr ~ "Blocked" | exit 2, stderr "Blocked: recursive delete of 'src'. Only /tmp/... ", stdout empty | PASS |
| `block-destructive.sh` | git reset --hard HEAD~1 | exit 2, stderr ~ "Blocked" | exit 2, stderr "Blocked: 'git reset --hard' throws away commits an", stdout empty | PASS |
| `block-destructive.sh` | docker compose up | exit 2, stderr ~ "Blocked" | exit 2, stderr "Blocked: docker commands are out of scope for this", stdout empty | PASS |
| `block-destructive.sh` | git status | exit 0, stdout empty | exit 0, stdout empty | PASS |
| `ask-on-test-edit.sh` | Edit test/policy.test.ts | exit 0, stdout ~ ""permissionDecision":"ask"" | exit 0, stdout ask JSON | PASS |
| `ask-on-test-edit.sh` | Edit src/x.ts | exit 0, stdout empty | exit 0, stdout empty | PASS |
| `ask-on-long-running.sh` | npm run e2e | exit 0, stdout ~ ""permissionDecision":"ask"" | exit 0, stdout ask JSON | PASS |
| `ask-on-long-running.sh` | npx playwright test | exit 0, stdout ~ ""permissionDecision":"ask"" | exit 0, stdout ask JSON | PASS |
| `ask-on-long-running.sh` | npm test | exit 0, stdout empty | exit 0, stdout empty | PASS |
| `run-tests.sh` | Edit src/core/policy.ts | exit 0, stdout ~ "systemMessage", stdout ~ /Tests|passed/ | exit 0, stdout "{"hookSpecificOutput":{"hookEventName":"PostToolUs" | PASS |
| `run-tests.sh` | Edit README.md | exit 0, stdout empty | exit 0, stdout empty | PASS |
| `audit-log.sh` | Bash git status | exit 0, audit.log += "git status" | exit 0, stdout empty, audit.log +1 | PASS |
| `config-audit.sh` | ConfigChange project_settings | exit 0, audit.log += "CONFIG" | exit 0, stdout empty, audit.log +1 | PASS |

21/21 rows PASS

### Run 2 — WS_NO_JQ=1 (grep/sed fallback)

| Hook | Case | Expected | Got | PASS/FAIL |
| --- | --- | --- | --- | --- |
| `protect-files.sh` | Edit config/policy.json | exit 2, stderr ~ "Blocked" | exit 2, stderr "Blocked: config/policy.json is protected (config/p", stdout empty | PASS |
| `protect-files.sh` | Edit .claude/settings.json | exit 2, stderr ~ "Blocked" | exit 2, stderr "Blocked: .claude/settings.json is protected (.clau", stdout empty | PASS |
| `protect-files.sh` | Edit src/core/policy.ts | exit 0, stdout empty | exit 0, stdout empty | PASS |
| `no-push-main.sh` | git push origin main | exit 2, stderr ~ "Blocked" | exit 2, stderr "Blocked: pushing to main is not allowed. Push a fe", stdout empty | PASS |
| `no-push-main.sh` | git push origin master | exit 2, stderr ~ "Blocked" | exit 2, stderr "Blocked: pushing to master is not allowed. Push a ", stdout empty | PASS |
| `no-push-main.sh` | git push --force origin feature/x | exit 2, stderr ~ "Blocked" | exit 2, stderr "Blocked: a forced push can erase other people's co", stdout empty | PASS |
| `no-push-main.sh` | git push origin feature/x | exit 0, stdout empty | exit 0, stdout empty | PASS |
| `block-destructive.sh` | rm -rf node_modules | exit 0, stdout empty | exit 0, stdout empty | PASS |
| `block-destructive.sh` | rm -rf src | exit 2, stderr ~ "Blocked" | exit 2, stderr "Blocked: recursive delete of 'src'. Only /tmp/... ", stdout empty | PASS |
| `block-destructive.sh` | git reset --hard HEAD~1 | exit 2, stderr ~ "Blocked" | exit 2, stderr "Blocked: 'git reset --hard' throws away commits an", stdout empty | PASS |
| `block-destructive.sh` | docker compose up | exit 2, stderr ~ "Blocked" | exit 2, stderr "Blocked: docker commands are out of scope for this", stdout empty | PASS |
| `block-destructive.sh` | git status | exit 0, stdout empty | exit 0, stdout empty | PASS |
| `ask-on-test-edit.sh` | Edit test/policy.test.ts | exit 0, stdout ~ ""permissionDecision":"ask"" | exit 0, stdout ask JSON | PASS |
| `ask-on-test-edit.sh` | Edit src/x.ts | exit 0, stdout empty | exit 0, stdout empty | PASS |
| `ask-on-long-running.sh` | npm run e2e | exit 0, stdout ~ ""permissionDecision":"ask"" | exit 0, stdout ask JSON | PASS |
| `ask-on-long-running.sh` | npx playwright test | exit 0, stdout ~ ""permissionDecision":"ask"" | exit 0, stdout ask JSON | PASS |
| `ask-on-long-running.sh` | npm test | exit 0, stdout empty | exit 0, stdout empty | PASS |
| `run-tests.sh` | Edit src/core/policy.ts | exit 0, stdout ~ "systemMessage", stdout ~ /Tests|passed/ | exit 0, stdout "{"hookSpecificOutput":{"hookEventName":"PostToolUs" | PASS |
| `run-tests.sh` | Edit README.md | exit 0, stdout empty | exit 0, stdout empty | PASS |
| `audit-log.sh` | Bash git status | exit 0, audit.log += "git status" | exit 0, stdout empty, audit.log +1 | PASS |
| `config-audit.sh` | ConfigChange project_settings | exit 0, audit.log += "CONFIG" | exit 0, stdout empty, audit.log +1 | PASS |

21/21 rows PASS

**Total: all rows PASS**
```

## Files created

- `.claude/hooks/protect-files.sh` — PreToolUse `Edit|Write|MultiEdit`, blocks (exit 2) + logs
- `.claude/hooks/protected-paths.txt` — the 5 protection rules, one per line
- `.claude/hooks/no-push-main.sh` — PreToolUse `Bash` / `if: Bash(git push *)`, blocks + logs
- `.claude/hooks/block-destructive.sh` — PreToolUse `Bash`, blocks + logs
- `.claude/hooks/ask-on-test-edit.sh` — PreToolUse `Edit|Write|MultiEdit`, asks + logs
- `.claude/hooks/ask-on-long-running.sh` — PreToolUse `Bash`, asks + logs
- `.claude/hooks/run-tests.sh` — PostToolUse `Edit|Write|MultiEdit`, reports (`timeout: 120`)
- `.claude/hooks/audit-log.sh` — PostToolUse `*`, logs only
- `.claude/hooks/config-audit.sh` — ConfigChange, logs only
- `.claude/hooks/README.md` — the 10-hook table (8 new + prettier + typecheck) and the audit-log format
- `scripts/ws-selftest.mjs` — 21 cases x 2 runs, no dependencies

## Files modified

- `workshop/state/after/settings.json` — wiring for all ten hooks + the `permissions` block
- `scripts/ws-state.mjs` — `check` gains a `npm run ws:selftest` row when the active state is `after`
- `package.json` — new script `ws:selftest`

## Files deliberately untouched

`.claude/hooks/prettier.sh`, `.claude/hooks/typecheck.sh`, `.claude/skills/**`,
`.claude/agents/**`, `docs/demo/**`, `workshop/state/before/settings.json`.

## Design notes

- **Every hook is self-contained.** Each one re-declares its own `field()` extractor
  rather than sourcing a shared library, so a single file can be read, copied, or
  explained on its own during the workshop. That is duplication on purpose.
- **jq is optional.** `field()` uses jq when it is on PATH and `WS_NO_JQ` is unset;
  otherwise a `tr -d '\n' | sed -n 's/.*"key"..."\([^"]*\)".*/\1/p'` fallback. Run 2
  of the self-test exercises that path on every case.
- **The audit log is append-only and never fatal.** Every write is
  `>> "$project/.claude/audit.log" 2>/dev/null`; a missing or unwritable log never
  turns into a blocked tool call. `npm run ws:reset` deletes it.
- **`config-audit.sh` only logs.** `ws:before` / `ws:after` rewrite
  `.claude/settings.json` on purpose; blocking a ConfigChange would break the exercise.
- **`block-destructive.sh` blocks direct `scripts/ws-state.mjs` invocations**, not the
  `npm run ws:*` wrappers — the facilitator still drives states through npm.
- **Paths are compared repo-relative.** Hooks strip `$CLAUDE_PROJECT_DIR/` and `./`
  first, so absolute and relative `file_path` payloads behave identically.

## Known wrinkle (pre-existing, not introduced here)

`npm run lint` reports `[warn] .claude/settings.local.json` from `prettier --check`.
That file is untracked local machine state (MCP toggles), it predates this step, and
nothing in this step wrote it. Left alone rather than reformatted.

Also unchanged from Report 1: `npm run ws:reset` deletes `.claude/settings.local.json`.
Keep a copy before resetting.

## Manual smoke tests pending (Chen)

Run these once, by hand, in a **fresh session** with state `after` active
(`npm run ws:after`). Nothing below is automatable — they test the hooks through
Claude, which the self-test deliberately does not do.

- [ ] **(a) Protected file.** Ask Claude: *"add a comment at the top of
      `config/policy.json`"*. Expect the edit to be refused with
      `Blocked: config/policy.json is protected (config/policy.json). Per-customer
      changes go in data/customers/<id>.json; global config and the harness are for
      humans.` — and Claude to say so rather than retry.
- [ ] **(b) Push to main.** Ask Claude to *"push this to main"*. Expect
      `Blocked: pushing to main is not allowed. Push a feature branch and open a
      pull request.` Note that `Bash(git push *)` is in `permissions.allow` on
      purpose: the hook, not the permission rule, is what decides.
- [ ] **(c) Test edit.** Ask Claude to *"change an assertion in
      `test/policy.test.ts`"*. Expect a permission **prompt** (not a block) reading
      *"Editing a test. Confirm this is a real behaviour change, not making a failing
      test pass."* Decline it, and confirm the edit does not happen.
- [ ] **(d) The receipt.** `cat .claude/audit.log` — expect a `BLOCKED protect-files`
      line, a `BLOCKED no-push-main` line, an `ASK ask-on-test-edit` line, plus one
      plain `<tool>` line per tool call from `audit-log.sh`.

Finish with `npm run ws:reset` (and restore `.claude/settings.local.json`).
