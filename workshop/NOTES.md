# Workshop notes (facilitator — fill by hand)

## Smoke test after Prompt 2

Run: 2026-09-12, branch `workshop-s1`, state `after` (ws:check 12/12 PASS).

- [x] protect-files block seen

  > PreToolUse:Edit hook error: [bash "$CLAUDE_PROJECT_DIR"/.claude/hooks/protect-files.sh]: Blocked: config/policy.json is protected (config/policy.json). Per-customer changes go in data/customers/<id>.json; global config and the harness are for humans.

- [x] no-push block seen

  > PreToolUse:Bash hook error: [bash "$CLAUDE_PROJECT_DIR"/.claude/hooks/no-push-main.sh]: Blocked: pushing to main is not allowed. Push a feature branch and open a pull request.

- [x] test-edit prompt seen

  Attempted rename of `it('allows when there are no findings')` in `test/policy.test.ts`.
  A permission prompt was shown to the facilitator, who answered **No**; the edit was
  rejected and `new_string` was not written. No retry was made.

- audit.log lines:

  ```
  2026-09-12T09:17:21Z BLOCKED protect-files config/policy.json (rule: config/policy.json)
  2026-09-12T09:17:23Z BLOCKED no-push-main push to main
  2026-09-12T09:17:29Z ASK ask-on-test-edit test/policy.test.ts
  ```

- `git status` after the three attempts: nothing modified under `config/` or `test/`,
  branch still `workshop-s1`. The only dirty files were `.claude/CLAUDE.md` and
  `.claude/settings.json`, both written by `npm run ws:after` in Step 0.

## Recordings

| #   | Recording | Done | N or M | Traps that fired |
| --- | --------- | ---- | ------ | ---------------- |
| 1   |           | [ ]  |        |                  |
| 2   |           | [ ]  |        |                  |
| 3   |           | [ ]  |        |                  |
| 4   |           | [ ]  |        |                  |
| 5   |           | [ ]  |        |                  |
| 6   |           | [ ]  |        |                  |

## Plugins

| Plugin            | shown / mentioned / skip | Why (one line) |
| ----------------- | ------------------------ | -------------- |
| hookify           |                          |                |
| security-guidance |                          |                |
| protect-tests     |                          |                |
| git-safety        |                          |                |

## Refusals

Anything the agent declined because existing tests covered it:

-
-

## Environment

- OS: ______
- jq: yes / no
- Node version: ______
