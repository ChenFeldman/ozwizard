# `docs/demo/` — the OZ-102 workshop kit

Everything the OZ-102 workshop needs that is **not** live in the repo. The live
`.claude/agents/` and `.claude/skills/` are deliberately left at three reviewers and the
original skill, because building the rest is the workshop.

> **The candidate diff is never applied** — `oz-102-candidate.diff` exists only to be
> reviewed, and the repo stays serial on purpose.

## The files

| File                                   | What it is                                                                                                                                   | Workshop beat                                                                 |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `oz-102-candidate.diff`                | A realistic PR implementing OZ-102 **badly**: it hand-rolls a bounded worker pool inside `src/core/`, and it skips an existing scanner test. | **Review.** The thing every reviewer in the room is pointed at.               |
| `final/agents/duplication-reviewer.md` | Finds logic that already exists in the repo. Searches before reporting.                                                                      | **Build a sub-agent.** Written live; this is the safety net if time runs out. |
| `final/agents/structure-reviewer.md`   | Asks one question: if this has to change, how much do you have to touch?                                                                     | Same beat — the second one built live.                                        |
| `final/agents/tests-reviewer.md`       | Coverage, meaningful assertions, and any test deleted/skipped/weakened.                                                                      | Same beat — the third one built live.                                         |
| `final/deep-review-SKILL.md`           | The finished `deep-review` skill: selectable roster, six-reviewer table, default three, and an Eval section.                                 | **Skill structure.** What the live SKILL.md grows into.                       |
| `saved/a-generalist.md`                | One plain review of the candidate, no sub-agents.                                                                                            | **Why sub-agents.** The baseline that misses things.                          |
| `saved/b-default-three.md`             | The default roster — convention, duplication, structure.                                                                                     | Same beat — the contrast that lands.                                          |
| `saved/c-all-six.md`                   | All six reviewers.                                                                                                                           | Same beat — what full coverage costs and buys.                                |
| `saved/eval-green-red-green.md`        | The three-line eval passing, failing with the duplication reviewer removed, and passing again.                                               | **Evals.** Proof the gate has teeth and isn't just vibes.                     |

## How to use it

Run the workshop from `docs/runsheet.md`. Reach in here only when the room is stuck or
short on time: copy `final/agents/*.md` into `.claude/agents/` and
`final/deep-review-SKILL.md` over `.claude/skills/deep-review/SKILL.md`, and the saved runs
under `saved/` become reproducible instead of aspirational.

The participants' own task afterwards is to implement OZ-102 **properly** —
`docs/design/OZ-102.md` says where the concurrency actually belongs, and there is already
a helper in the repo that does most of it. Finding both is the exercise.
