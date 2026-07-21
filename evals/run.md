# Running the evals

A tiny harness to prove the deep-review gate works. Two cases: one that must go
**red** (a planted BLOCKER), one that must stay **green** (a clean file).

## Steps (per case)

For each folder under `evals/cases/`:

1. Open `input.md` and run its `/deep-review ...` command.
2. Copy the full deep-review output (ranked findings + verdict).
3. Judge it: hand `evals/judge.md` two inputs — the RUN (that output) and the
   case's `expected.md` — and read the single `PASS` / `FAIL` line.

## Expected result

| Case             | Deep-review verdict    | Judge |
| ---------------- | ---------------------- | ----- |
| `case-1-blocker` | REQUEST-CHANGES        | PASS  |
| `case-2-clean`   | APPROVE / APPROVE-NITS | PASS  |

Both PASS ⇒ the gate catches the planted BLOCKER and doesn't cry wolf on clean code.

## Workshop demo — green → break it → red

This proves the eval has teeth: it goes **red** when the gate misses the BLOCKER.

- **Green:** run `case-1-blocker` with the full gate (all three reviewers) →
  BLOCKER flagged → **Judge PASS**.
- **Break it (degrade the gate):** re-run `case-1-blocker` with the gate degraded
  so it reports **no BLOCKER** — e.g. skip/disable the reviewers (a gate that
  didn't actually review). The run has no BLOCKER, so the judge returns **FAIL** —
  the eval turns red, proving it tests the gate, not just the happy path.
- **Restore:** run the full gate again → BLOCKER flagged → **Judge PASS** (green).

> **Why "degrade the gate", not "remove one reviewer"?** The three reviewers
> overlap: the convention (and often performance) reviewer also flags a glaring
> secret/XSS, even though it's outside their stated charter. So removing _only_
> the security reviewer still catches the planted BLOCKER — the gate has
> defense-in-depth. To make the run genuinely miss the BLOCKER you must degrade
> the gate so **no** reviewer reports it. That's what turns the eval red.
