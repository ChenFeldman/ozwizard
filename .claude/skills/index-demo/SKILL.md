---
name: index-demo
description: Live demo of codegraph and graphify — what each one indexes, what it costs, and what you get without them. Use when showing a teammate how the two code/knowledge indexes work, separately and together.
---

# index-demo

A ~10 minute live demo. Three acts: **codegraph alone**, **graphify alone**, **both together**.
Run the commands in front of the person. Every number below was measured on this repo.

**The one-sentence framing to open with:**

> codegraph indexes _code_ — free and instant. graphify indexes _everything else_ — slow and expensive.
> Neither replaces grep. They reduce how much you have to read before you know where to look.

Run `bash .claude/skills/index-demo/demo.sh` for the scripted version, or walk the acts by hand below.

---

## Act 1 — codegraph: the code layer

**Use case:** "I'm about to change `evaluate()`. What breaks?"

```bash
codegraph init          # first time only
```

> **Result on this repo:** 34 files → 232 nodes, 462 edges, **124 ms, 0 tokens**, 552 KB SQLite.

Then ask, via the MCP tools (no shell command — the agent calls these):

- `codegraph_callers evaluate` → `registerRoutes` (routes.ts:52), `POST /scans` (routes.ts:41)
- `codegraph_explore "policy evaluate"` → returns the **verbatim source**, grouped by file

**Without it:** the agent greps, guesses which of the hits matter, then reads 2–4 whole files into context.
**With it:** one call returns the call sites _and_ the code. Fewer file reads → **lower token spend per question.**

**Show them the honest limit.** Ground truth has 6 call sites; codegraph reports 2:

```bash
grep -rn --include='*.ts' "evaluate(" src test
```

The 4 missing ones live inside `it()` callbacks with no enclosing named function. Say this out loud —
it's an orientation tool, not an authority. grep is still the tiebreaker.

---

## Act 2 — graphify: the knowledge layer

**Use case:** "Do our docs still tell the truth?" — the question no grep can answer.

```bash
graphify query "what is the db of this repo? persistence, store, Repository, DATA_PATH"
```

> **Result:** 52 nodes across the store layer, each with `file:line`. It answers _where things are and how
> they connect_. It stores **no code** — you still open the file afterward.

The real payoff is the build report, not the query:

```bash
open graphify-out/graph.html          # 440 nodes, 25 clusters
head -60 graphify-out/GRAPH_REPORT.md # god nodes, surprising connections, AMBIGUOUS edges
```

> **Three things it found here that grep cannot**, because there is no shared string to search for:
>
> 1. `deep-review/SKILL.md` documents **three** reviewers; `.claude/agents/` holds **six**.
> 2. `docs/package-facts/deb.md` and `docs/llm-wiki/package-types.md` state the same fact, unlinked.
> 3. README claims no outbound network; a saved review run describes upstream fetches. Flagged AMBIGUOUS.

**Without it:** nobody finds these until a doc misleads someone. There is no query that surfaces
"two files disagree."
**Cost to be honest about:** 95 files → **213,111 tokens, ~6 minutes**, 3 parallel agents. Incremental
`--update` re-extracts only changed files.

---

## Act 3 — together

**Use case:** "Why is the scanner slow on deb packages?" — needs code _and_ the design docs behind it.

The split, and why it isn't a competition:

|                    | codegraph                            | graphify                                     |
| ------------------ | ------------------------------------ | -------------------------------------------- |
| indexes            | code only — **0 markdown files**     | code **+ 54 doc files** (205 doc-side nodes) |
| build              | 124 ms, 0 tokens                     | ~6 min, 213k tokens                          |
| `calls` edges here | 65                                   | 33                                           |
| returns            | verbatim source → **cuts** tokens    | names + `file:line` → **adds** tokens        |
| rebuild            | byte-identical every time (pure AST) | non-deterministic (LLM)                      |
| freshness          | file watcher, ~1s lag                | snapshot until you rerun                     |

Demo the handoff: ask a question that needs both.

1. graphify → _which_ design note governs deb scanning (`docs/design/OZ-102.md`, the rejected options)
2. codegraph → _where_ that lands in code and what calls it
3. grep → confirm nothing was missed

**The line to close on:**

> codegraph is local tooling — gitignore it, it rebuilds identically in 124ms on every laptop.
> graphify is a shared artifact — build it once in CI and commit the output, or your team has eight
> different brains.

---

## The comparison to state explicitly

| question                           | no tools                      | with the right index                |
| ---------------------------------- | ----------------------------- | ----------------------------------- |
| "what calls X?"                    | grep → **6/6**, instant, free | codegraph → 2/6 + the source inline |
| "how does subsystem Y work?"       | read 4–6 files into context   | one `codegraph_explore` call        |
| "do the docs contradict the code?" | **no way to ask**             | graphify report, AMBIGUOUS edges    |
| "onboard someone"                  | a wiki tour, hand-maintained  | `graph.html` + `GRAPH_REPORT.md`    |

Neither index is complete — both missed 4 of 6 call sites in a 27-file repo. Sell them as
**accelerators for orientation, not authorities for impact analysis.**

---

## Setup notes (say these before anyone tries it at home)

```bash
# .gitignore — neither is ignored by default
.codegraph/
graphify-out/cache/
graphify-out/.graphify_*
```

Commit `graphify-out/graph.json` + `GRAPH_REPORT.md` (the shared brain). Never commit `.codegraph/`
or `.graphify_python` — the latter stores an absolute path to your home directory.

Install: `brew install codegraph` · `uv tool install graphifyy && graphify install`
