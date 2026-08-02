# How these evals work

A tiny, code-free way to test an AI workflow: prompts in, a verdict out, a judge
that says PASS or FAIL. Everything here is markdown — nothing to install, nothing
to run but the agent itself.

## The idea

An AI review gate is only trustworthy if you can show two things:

1. It **catches** the bad thing.
2. It **doesn't cry wolf** on the good thing.

So we keep one case for each, and check both every time.

## The layout

The eval lives **inside the skill it tests**, so handing someone the skill folder hands
them the proof it works:

```
.claude/skills/deep-review/
  SKILL.md
  evals/
    run.md            how to run the cases + the results you should get
    judge.md          the judge's prompt: compare a run to its expectation → PASS/FAIL
    cases/
      <bad-case>/
        input.md      one line: what to review, with which roster
        expected.md   two lines: expect: / must not:
      <good-case>/
        input.md
        expected.md
    results/
      latest.md       the last run's verdicts, overwritten each time
```

Every case is the same contract: **input** (what to run), **expected** (what must
come back). One shared **judge** compares them. Add a case by copying the folder.

## The flow

```
input.md ──▶ run the workflow ──▶ RUN (findings + verdict)
                                        │
                        expected.md ────┤
                                        ▼
                                    judge.md
                                        ▼
                                 PASS  or  FAIL
```

Three steps, per case:

1. **Run** — open `input.md`, run the command it names.
2. **Capture** — copy the full output: the findings and the verdict.
3. **Judge** — hand the judge that output plus the case's `expected.md`; read the
   single PASS/FAIL line.

## Why a judge, and not string matching

Wording and line numbers drift between runs. The judge matches on the _issue_, not
the text, so the eval is stable — but its rule is deliberately one question with
no partial credit and no benefit of the doubt:

> Did the run flag the thing `expected.md` asked for — yes or no?

Narrow rules are what make an LLM judge reproducible enough to demo live.

## Proving the eval has teeth

A passing eval means nothing until you've watched it fail. The demo is
**green → break it → red**:

- **Green** — run the bad case with the workflow intact → it catches the issue → PASS.
- **Break it** — degrade the workflow so it can no longer catch that issue → the
  run comes back clean → **FAIL**. The eval turns red.
- **Restore** — run it intact again → PASS.

That third step is the whole point: it shows the eval is testing the workflow,
not just replaying a happy path.

### The subtlety worth knowing

If your workflow fans out to several reviewers, they **overlap** — a reviewer
outside its stated charter will still flag a glaring problem. So disabling one
reviewer usually _doesn't_ turn the eval red; the others cover for it.

To make a run genuinely miss the issue you have to degrade the whole gate, so that
**no** reviewer reports it. That redundancy is a feature of the workflow — and a
reminder that single-component ablation is a weak way to test a panel.

## Adding a case

1. Copy a case folder and rename it.
2. Write `input.md`: the command, and the exact target under review.
3. Write `expected.md`: the one outcome that matters — keep it to a single
   requirement the judge can answer yes/no.
4. Add a row to the results table in `run.md`.

Keep the pair balanced: for every case that must go red, keep one that must stay
green.
