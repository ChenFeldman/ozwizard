Show me the anatomy of my review skill.

Every header line below is a markdown H2 (`## `) so each section renders as a
coloured, clearly separated title in the terminal. Never print a header as plain text.

## 0. the shape

Print the output of:
  ls -R .claude/skills/deep-review/
  ls .claude/agents/

## 0.5 the flow

Before printing any file, print the two ASCII diagrams below inside plain fenced
code blocks — the review path first, then the eval loop — so the reader has the map
before diving into the files. Do NOT use mermaid: this is read in a terminal, where
mermaid source is just text. Reproduce the box-drawing characters and the column
alignment exactly.

```
  /deep-review  src/a.ts src/b.ts          ·  or bare: scope = git diff + untracked
             │
             ▼
  ┌──────────────────────────────┐
  │  SKILL.md  —  orchestrator   │   1. scope    resolve the file list
  │  runs inline, never forked   │   2. dispatch ONE message, N Agent calls
  └───────────────┬──────────────┘
                  │  parallel — each reviewer gets its own context
                  │  and never sees the others' findings
  ┌──────────┬────┴─────┬──────────┬──────────┬──────────┐
  ▼          ▼          ▼          ▼          ▼          ▼
┌────────┐┌────────┐┌────────┐┌────────┐┌────────┐┌────────┐
│security││ perf   ││ conv   ││  dup   ││structure││ tests  │
│ opus   ││ sonnet ││ haiku  ││        ││         ││        │
├────────┤├────────┤├────────┤├────────┤├────────┤├────────┤
│secrets ││ N+1    ││swallow ││ logic  ││layering││missing │
│PII,XSS ││serial  ││ .js    ││already ││ god    ││vacuous │
│inject. ││sync IO ││ drift  ││in repo ││ files  ││deleted │
└───┬────┘└───┬────┘└───┬────┘└───┬────┘└───┬────┘└───┬────┘
    │         │         │         │         │         │
    └─────────┴─────────┴────┬────┴─────────┴─────────┘
                             │  all read-only: Read, Grep, Glob — none can edit
                             ▼
              3. synthesize   dedupe same file:line  ·  rank BLOCKER→COMMENT→NIT
                             │
                             ▼
              4. VERDICT     REQUEST-CHANGES │ APPROVE-WITH-NITS │ APPROVE
```

```
  evals/ — the proof the gate works                    ┌─ green: catches the planted BLOCKER
                                                       └─ red:   degrade the gate ⇒ FAIL
  cases/case-1-blocker/          cases/case-2-clean/  — same function, one line apart
  ┌───────────────┐        ┌──────────────────────┐
  │  subject.ts   │        │                      │
  │  the code     │───────▶│  /deep-review run    │──── the RUN ────┐
  │  input.md     │        │  (the diagram above) │                 │
  │  what to run  │        └──────────────────────┘                 ▼
  └───────────────┘                                           ┌───────────┐
  ┌───────────────┐                                           │ judge.md  │
  │ expected.md   │──── expect: / must not: ─────────────────▶│ PASS/FAIL │
  │  2 lines      │                                           └─────┬─────┘
  └───────────────┘                                                 │
                                                                    ▼
  run.md  — how to run both cases, and the                  results/latest.md
           green → break it → red workshop demo             (overwritten each run)
```

Adjust the diagrams to match what section 0 actually listed — if the roster or the
case folders on disk differ from the ones drawn above, draw what is on disk.

## the files

Then print these seven files, in this exact order, and nothing else:

1. .claude/skills/deep-review/SKILL.md
2. .claude/agents/security-reviewer.md
3. .claude/skills/deep-review/evals/cases/case-1-blocker/subject.ts
4. .claude/skills/deep-review/evals/cases/case-1-blocker/input.md
5. .claude/skills/deep-review/evals/cases/case-1-blocker/expected.md
6. .claude/skills/deep-review/evals/judge.md
7. .claude/skills/deep-review/evals/run.md

How to print each one:
- First a single H2 header line:  ## N. <path> — <one short sentence: what this file is for>
- Then the file exactly as it is on disk. Do not summarise it, do not shorten it,
  do not fix it, do not comment on it.
- One blank line between files.

Say nothing before the header of section 0 and nothing after the last file.
