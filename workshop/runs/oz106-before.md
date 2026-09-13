# oz106-before

Source: `929a8406-844e-4a8a-8328-5866cd652534.jsonl`

## User — 2026-09-13T12:01:40.532Z

Work on tickets/OZ-106.md.

- **Read**
- **Skill**
- **Read**
- **Read**
- **Read**
- **Bash**: `grep -rniE "180|advisory age|aged|publishedAt|critical.{0,5}(→|->).{0,3}block" --include=*.md --include=*.ts --include=*.json --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=graphify-out --exclude-dir=workshop . | grep -v "src/data/advisories.json" | head -60`
- **Bash**: `git log --oneline -S ADVISORY_AGE_DAYS -- src && git log --oneline -5 -- src/core/policy.ts && git status --short`
- **Bash**: `ls test docs docs/design docs/llm-wiki 2>/dev/null; grep -rn "evaluate(" src test | grep -v "^src/core/policy.ts"`
- **Read**
- **Read**
- **Bash**: `grep -rniE "180|advisory age|aged advisor|publishedAt|critical.{0,5}(→|->).{0,3}block" docs tickets README.md src/util src/core/types.ts 2>/dev/null | grep -v "^docs/workshop" | head -40`
- **AskUserQuestion**
- **Edit**: `/Users/chenfeldman/demo/ozwizard/test/policy.test.ts`
- **Edit**: `/Users/chenfeldman/demo/ozwizard/docs/llm-wiki/policy-verdicts.md`
- **Edit**: `/Users/chenfeldman/demo/ozwizard/docs/llm-wiki/policy-verdicts.md`
- **Bash**: `npx vitest run test/policy.test.ts 2>&1 | tail -25`
- **Edit**: `/Users/chenfeldman/demo/ozwizard/src/core/policy.ts`

> **Hook message — PostToolUse:Edit:**
> PostToolUse hook modified /Users/chenfeldman/demo/ozwizard/src/core/policy.ts after your edit (likely a formatter). Your next Edit will not fail with a stale-file error, but if its old_string targets a region the hook reformatted, Read the file first.

- **Edit**: `/Users/chenfeldman/demo/ozwizard/src/core/policy.ts`
- **Edit**: `/Users/chenfeldman/demo/ozwizard/src/core/policy.ts`
- **Bash**: `npm test 2>&1 | tail -12`
- **Bash**: `npm run lint 2>&1 | tail -15`
- **Bash**: `npx tsc --noEmit 2>&1 | tail -10; echo "tsc exit $?"`
- **Skill**
- **Bash**: `git diff -- src/core/policy.ts`
- **Bash**: `date +%F; ls docs/ai-learnings/`
- **Read**
- **Write**: `/Users/chenfeldman/demo/ozwizard/docs/ai-learnings/2026-09.md`

## Final assistant message

I fixed OZ-106: a critical advisory now blocks no matter how old it is. All 17 tests pass and the typecheck is clean.

**Cause:** the severity thresholds were fine, since critical already maps to block. A separate rule in `src/core/policy.ts` caps any advisory published more than 180 days ago at `warn`, and critical ones weren't excluded. That's why newer advisories blocked and this older one didn't. An existing test even expected the old behavior. The policy wiki page didn't mention the rule and said verdicts never go down, which is why it read like a threshold bug.

**Fix (the "exempt critical" option you picked):**
- **`src/core/policy.ts`:** the age rule now skips findings whose original severity is `critical`. I also updated the comments that describe the rule.
- **`test/policy.test.ts`:** the 200-day-old critical test now expects `block`. I confirmed it failed before the fix. A new test checks that a 200-day-old `high` finding still gets `warn`.
- **`docs/llm-wiki/policy-verdicts.md`:** added the age rule and its critical exemption, and corrected the "verdicts never go down" claim.
- **`docs/ai-learnings/2026-09.md`:** a new note on the root cause and what to check next time.

Because the check uses the original severity, a transitive critical is also exempt, even though it counts as `high` for thresholds.

`npm run lint` still reports Prettier formatting warnings in three files I didn't touch (`.claude/settings.local.json`, `scripts/ws-demo-check.mjs`, `workshop/REPORT-2.md`). I left them alone.

Nothing is committed yet.
