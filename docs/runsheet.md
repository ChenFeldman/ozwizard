# OzWizard Runsheet — zero to hero

The golden path for the workshop. Work top to bottom. Each step has an **exact prompt to
paste into Claude Code** (in this repo). Run the shell bits in your terminal first.

Prereqs: Node ≥ 20 (`nvm use`), and `npm install && npm install --prefix web`.

---

## 0. Clone & run

```bash
git clone <your-fork-url> ozwizard && cd ozwizard
nvm use            # Node 20
npm install && npm install --prefix web
npm run dev:all    # API :3000 + dashboard :5173
```

Open http://localhost:5173, submit the prefilled artifact, see a **block** verdict.

> Prompt:
>
> ```
> Give me a one-paragraph tour of what this service does and how a request flows from the dashboard to a verdict.
> ```

---

## 1. `/context` + CLAUDE.md tour

See what Claude loaded for this repo.

- Run **`/context`** — confirm `.claude/CLAUDE.md` and the path rules are in context.
- Run **`/memory`** to view the loaded project guide.

> Prompt:
>
> ```
> Using .claude/CLAUDE.md, summarize the architecture, the key conventions I must follow, and the "things to skip". What are the two path-scoped rules and when do they apply?
> ```

---

## 2. Build your first skill

Make a trivial skill to feel the loop.

> Prompt:
>
> ```
> Create a new skill at .claude/skills/list-blocked/SKILL.md that lists every scan with a block verdict by calling the ozwizard-store MCP tool (action list_scans, verdict block). Keep it under 20 lines. Then tell me how I invoke it.
> ```

Then reload the session (`/clear`) and try `/list-blocked` (after generating some data — see the README "Run & verify").

---

## 3. Run the investigate flow on OZ-101

`OZ-101` ("support .toml manifests — unexpected") is deliberately vague — perfect for the
investigation skill.

> Prompt:
>
> ```
> Use the investigate-ozwizard-bug skill to work tickets/OZ-101.md. It's under-specified on purpose — walk the 5 stages, and at stage 1 tell me exactly what you need from me before writing any code.
> ```

Expect Claude to stop and ask for a concrete `.toml` example rather than guessing. (Bonus:
try OZ-103, a real planted bug, for a full root-cause + regression test.)

---

## 4. Build + `/deep-review` the 3 reviewers

The three reviewer subagents already exist under `.claude/agents/`. Point the orchestrator
at the planted-issue files.

> Prompt:
>
> ```
> /deep-review src/util/config.ts src/util/logger.ts src/api/artifacts.ts src/core/scanner.ts src/core/policy.ts
> ```

You should get one ranked BLOCKER→NIT list (security + performance + convention) and a
verdict. Compare it against `docs/PLANTED.md` (facilitator copy) — the reviewers should
independently rediscover the planted issues.

> Follow-up prompt:
>
> ```
> Pick the highest-severity finding and fix it with a minimal diff plus a regression test. Run npm test.
> ```

---

## 5. Capture a learning

Close the loop so the next person benefits.

> Prompt:
>
> ```
> Use the capture-learning skill to record what we just learned fixing that finding — root cause and how to prevent it — into docs/ai-learnings/.
> ```

---

Done. You've toured the repo, built a skill, run an investigation, orchestrated a
multi-agent review, and captured a durable learning — the full OzWizard loop.
