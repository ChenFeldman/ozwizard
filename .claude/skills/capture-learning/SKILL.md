---
name: capture-learning
description: Append a durable learning to docs/ai-learnings/ — a root cause, a gotcha, or a "how to work this repo" insight worth remembering. Use after fixing a bug, discovering a non-obvious constraint, or finishing an investigation.
---

# capture-learning

Record something worth remembering so the next session (human or AI) doesn't relearn it.

## When to use

- After an RCA/fix (what broke, why, how it was found).
- When you hit a non-obvious constraint (ESM `.js` specifiers, core purity, no-DB rule,
  the transitive-vs-direct policy subtlety).
- A workflow insight ("scanning verdicts are best reproduced via `evaluate(...)` directly").

Skip trivia the code/tests already make obvious.

## Steps

1. Ensure `docs/ai-learnings/` exists (create it if missing). Its `README.md` describes the
   format — read it if unsure.
2. Append to a single monthly file `docs/ai-learnings/YYYY-MM.md` (create with an `# ` header
   if new). Append a new entry; never overwrite existing entries.
3. Use a fixed date. Get it from the environment (`date +%F`) rather than guessing.

## Entry format

```markdown
## <short title> — <YYYY-MM-DD>

**Context:** what were we doing / what triggered this.
**What we learned:** the fact, root cause, or constraint (be specific — name files/lines).
**How to apply next time:** the actionable takeaway (what to check / do / avoid).
```

Keep entries short and specific. Link the ticket (OZ-1xx) or `file:line` when relevant.
