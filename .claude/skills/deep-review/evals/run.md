# Running the evals

**The eval travels with the skill.** It lives inside `deep-review/`, not in a top-level
`evals/`, on purpose: if you hand someone the skill folder, you have handed them the proof
it works.

Two cases: one that must go **red** if the gate breaks (a planted BLOCKER), one that must
stay **green** (a clean file).

## A case is a subject plus a contract

Each case folder is self-contained: the code under review sits next to the two files that
say what should happen to it. Nothing to look up elsewhere.

```
subject.ts   the code under review — a few lines, one deliberate problem (or none)
input.md     what to review, and with which reviewers
expected.md  expect:    what the run MUST contain
             must not:  what the run MUST NOT say
```

`case-1-blocker` and `case-2-clean` are the same function, one line apart — one commits the
API key, the other reads it from the environment. That pair is the demo: it shows the gate
keys on _committed credential_, not on the word "key".

`must not:` is what stops a gate from passing the eval by shouting about everything.

## Steps (per case)

For each folder under `cases/`:

1. `cat cases/<case>/input.md` — run `/deep-review` on the file it names, with the roster
   it names.
2. Copy the full deep-review output (ranked findings + verdict).
3. Judge it: hand `judge.md` two inputs — the RUN (that output) and the case's
   `expected.md` — and read the single `PASS` / `FAIL` line.
4. **The judge's verdict goes in `results/latest.md`** — one file, overwritten each run,
   no timestamps in filenames.

## Expected result

| Case             | Deep-review verdict    | Judge |
| ---------------- | ---------------------- | ----- |
| `case-1-blocker` | REQUEST-CHANGES        | PASS  |
| `case-2-clean`   | APPROVE / APPROVE-NITS | PASS  |

Both PASS ⇒ the gate catches the planted BLOCKER and doesn't cry wolf on clean code.

## Workshop demo — green → break it → red

An eval you have never seen fail is not an eval. To show it has teeth you have to make it
go red on purpose.

- **Green:** run `case-1-blocker` with the full roster → BLOCKER flagged → **Judge PASS**.
- **Break it (degrade the gate):** re-run `case-1-blocker` with the gate degraded so it
  reports **no BLOCKER** — e.g. skip the dispatch entirely (a gate that didn't actually
  review). No BLOCKER in the run ⇒ the judge returns **FAIL**. The eval turns red, proving
  it tests the gate and not just the happy path.
- **Restore:** run the full roster again → BLOCKER flagged → **Judge PASS** (green).

> **Why "degrade the gate", not "remove the security reviewer"?** Because removing it does
> not work, and this is measured, not assumed. Run `case-1-blocker` with only
> `performance` + `convention` and **both** of them independently file the hardcoded
> `sk_live_oz_...` key as a BLOCKER — the convention reviewer under "no secrets in source",
> the performance reviewer despite it being outside its charter entirely. The run still
> comes back REQUEST-CHANGES and the judge still says PASS.
>
> These three charters **overlap on anything glaring**. That feels like defense-in-depth
> and it is — but it also means single-reviewer ablation cannot move this eval. The lesson
> for the room: if you want to prove one sub-agent is load-bearing, its charter has to be
> **disjoint** from the others, and the others have to be told to stay out of it. See
> `docs/demo/saved/eval-green-red-green.md`, where a six-reviewer roster with disjoint
> charters does turn red when one reviewer is removed.
