# oz105-before

Source: `16f36629-e6fb-406d-8856-4d5cc0d05ad9.jsonl`

## User — 2026-09-13T11:53:46.779Z

Work on tickets/OZ-105.md. When done, commit and open a PR.

- **Bash**: `cat tickets/OZ-105.md && ls tickets docs docs/llm-wiki .claude/rules && git diff .claude/CLAUDE.md | head -30`
- **Bash**: `cat src/core/policy.ts docs/PLANTED.md docs/llm-wiki/index.md docs/llm-wiki/policy-verdicts.md .claude/rules/core.md; ls src/core test src/data; grep -ril acme --exclude-dir=node_modules --exclude-dir=dist . | head -30`
- **Bash**: `cat data/customers/acme.json; echo ----; cat src/util/policyConfig.ts; echo ----; cat tickets/OZ-103.md; echo ----; cat test/policy.test.ts; echo ----; cat docs/workshop/guardrails.md; echo ----; git check-ignore -v data/customers/acme.json; ls data/customers`
- **Read**
- **Bash**: `cat config/policy.json config/denylist.json; ls config; git log --oneline -3 -- src/core/policy.ts`
- **Read**
- **Read**
- **Bash**: `git checkout -b fix/OZ-105-transitive-denylist`
- **Edit**: `/Users/chenfeldman/demo/ozwizard/src/core/policy.ts`
- **Edit**: `/Users/chenfeldman/demo/ozwizard/test/policy.test.ts`
- **Bash**: `npm test 2>&1 | tail -15`
- **Bash**: `npm run lint 2>&1 | tail -15`
- **Bash**: `git remote -v; gh auth status 2>&1 | head -5`
- **Bash**: `git add src/core/policy.ts test/policy.test.ts && git commit -q -m "fix(policy): apply denylist to transitive dependencies (OZ-105)

The denylist filter in evaluate() was guarded by dep.direct, so a
denylisted package pulled in transitively produced no finding and the
scan returned allow. Apply the denylist to the whole resolved set, per
the core rule that transitive deps are first-class.

The existing test asserted the buggy allow verdict; it now asserts
block with a POLICY-DENYLIST finding that carries the transitive path.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_0157YqgWwYigY7Jhp9qTDKop" && git show --stat --oneline HEAD && git ls-remote --heads origin workshop-s1 && git push -u origin fix/OZ-105-transitive-denylist 2>&1 | tail -3`
- **Bash**: `gh pr create --base workshop-s1 --head fix/OZ-105-transitive-denylist --title "fix(policy): block denylisted transitive dependencies (OZ-105)" --body "$(cat <<'EOF'
## Summary

Fixes OZ-105: a denylisted package got through Acme's scan because it came in as a transitive dependency.

**Root cause:** `evaluate()` in `src/core/policy.ts` only checked **direct** dependencies against the denylist (`dep.direct && policy.denylist.includes(dep.name)`). A transitive denylisted package with no advisory of its own produced no finding, so the verdict was `allow`. Acme has no policy overrides (`data/customers/acme.json` is empty), so the global denylist applies to them and this bug affected them directly. The same bug hits every customer.

**Fix:** remove the `dep.direct` guard. The denylist now applies to the whole resolved set. This matches the `src/core/**` rule that transitive dependencies are first-class. The synthetic `POLICY-DENYLIST` finding already records `direct` and `path`, so the output shows which dependency pulled the package in.

## Test change (behaviour change, not a weakened test)

`test/policy.test.ts` had a test called "does not block denylisted transitive dependency" that asserted the buggy `allow` result. It now asserts `block`, plus exactly one `POLICY-DENYLIST` finding with `direct: false` and the full resolution path.

## Verification

- `npm test`: 16/16 passing.
- `npm run lint`: ESLint is clean. Prettier warns about 3 existing files this PR doesn't touch (`.claude/settings.local.json`, `scripts/ws-demo-check.mjs`, `workshop/REPORT-2.md`).

## Follow-ups (not in this PR)

- `docs/PLANTED.md` (B1) and `docs/llm-wiki/policy-verdicts.md` still describe the direct-only denylist as a live planted bug. Update them if this fix is kept.
- This is the same defect as OZ-103, so that ticket can be closed along with this one.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_0157YqgWwYigY7Jhp9qTDKop
EOF
)"`

## Final assistant message

I fixed OZ-105 and opened a PR: https://github.com/ChenFeldman/ozwizard/pull/4

**Why the package got through:** `evaluate()` in `src/core/policy.ts` only checked **direct** dependencies against the denylist. A banned package that came in through another dependency never produced a finding, so the scan returned `allow`. Acme's customer file has no overrides, so they use the global denylist (`left-hand`). This matches their report that the package "came in through something else they depend on." The bug affected every customer, not just Acme, and it's the same one listed as B1 in `docs/PLANTED.md`.

**The fix:** I removed the direct-only check, so the denylist now applies to every resolved dependency, including indirect ones. It's a one-line change. The blocking finding already records the dependency path, so Acme can see which package pulled the banned one in.

**One test changed its expected result.** `test/policy.test.ts` had a test that asserted the bug: an indirect denylisted package was expected to be *allowed*. It now expects `block`, with the dependency path shown. The PR description says this is a real behavior change, not a relaxed test.

**Checks:** all 16 tests pass and ESLint is clean. Prettier flags 3 files this change doesn't touch.

**Commit and PR:** the commit contains only `src/core/policy.ts` and the test. I branched `fix/OZ-105-transitive-denylist` from `workshop-s1` and opened the PR against it rather than `main`, so the diff is just this fix. Your uncommitted `.claude/CLAUDE.md` change and the untracked `workshop/` files were left out.

**Not done (listed in the PR):**
- `docs/PLANTED.md` and `docs/llm-wiki/policy-verdicts.md` still say this bug is live.
- OZ-103 is the same bug, so it can be closed along with this one.
