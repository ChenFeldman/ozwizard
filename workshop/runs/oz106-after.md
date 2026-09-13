# oz106-after

Source: `b1dcf9cc-3eb3-4f19-9815-b3335e581252.jsonl`

## User — 2026-09-13T12:05:07.397Z

Work on tickets/OZ-106.md.

- **Bash**: `cat tickets/OZ-106.md && ls tickets docs docs/llm-wiki 2>/dev/null && cat .claude/rules/*.md`
- **Bash**: `cat src/core/policy.ts docs/llm-wiki/policy-verdicts.md; grep -rn "180\|critical → block\|critical.*block" docs README.md src test --include=*.md --include=*.ts | head -40`
- **Bash**: `cd /Users/chenfeldman/demo/ozwizard; grep -rn -i "critical.\{0,5\}block\|180\|aged\|publishedAt" --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=graphify-out --exclude-dir=workshop . | grep -v "^./data/" | head -40; echo ---; grep -n "Finding\b" -A15 src/core/types.ts | head -30; echo ---; git status --short; git diff --stat`
- **Read**
- **Read**
- **Bash**: `cd /Users/chenfeldman/demo/ozwizard; grep -rn "evaluate(" src; grep -n "publishedAt" -B3 -A3 src/data/advisories.json | head -30`
- **Edit**: `/Users/chenfeldman/demo/ozwizard/docs/llm-wiki/policy-verdicts.md`
- **Edit**: `/Users/chenfeldman/demo/ozwizard/docs/llm-wiki/policy-verdicts.md`
- **Bash**: `npx vitest run test/policy.test.ts 2>&1 | tail -8`

## Final assistant message

OZ-106 isn't a bug, so I didn't change any code. The `warn` result comes from the 180-day advisory-age rule, which this project's CLAUDE.md says is intentional and must stay as it is, tests included.

**Why it happened**
- The thresholds are fine: `critical → block` is set in `config/policy.json`.
- In `src/core/policy.ts:100`, any finding whose advisory was published more than 180 days ago counts as `warn` instead of `block`, even at `critical`. The scan route always passes the current time (`src/api/routes.ts:54`), so this applies to live scans.
- That explains the ticket: the old critical advisory warns, and newer ones on other packages still block.
- An existing test ("warns when that same critical advisory is 200 days old") covers exactly this case. All 8 policy tests pass.

**What I changed:** only `docs/llm-wiki/policy-verdicts.md`. The page didn't mention the age rule and said verdicts "never downgrade", which is likely how both the customer and the ticket got it wrong. It now lists the age rule as rule 4 and warns that an old critical advisory will come back `warn`.

**Before closing the ticket:**
- **An untracked note is wrong.** `docs/ai-learnings/2026-09.md` says OZ-106 was "fixed" by exempting critical findings from the age rule and changing the test. That change isn't in the code, and making it would break the business rule. If someone trusts that note later, they could break the rule, so it should be corrected or deleted. I left it alone because I didn't write it.
- **Suggested reply to the customer:** thresholds are correct, and critical advisories older than 180 days warn by design. If they need a build stopped anyway, they can file an escalation.
- **Optional follow-up:** the scan result doesn't say when a finding was softened because of its age, even though `.claude/rules/core.md` says every policy decision should be explained. Adding that note would make the next report like this obvious from the scan output alone. I can do it if you want, but it changes what the scan returns, which is more than this ticket asked for.
