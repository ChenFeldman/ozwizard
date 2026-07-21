# LLM wiki — catalog

Load-on-demand long-reference pages. These are **not** always-on context: read a
page only when a task's trigger matches. Keep `CLAUDE.md` small — depth lives here.

| Page                                       | When to load it                                                                                                                                                                                                |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [package-types.md](./package-types.md)     | Before writing/reviewing any code that branches on `ecosystem`, groups ecosystems, loads advisory data, or reasons about scan cost/timeouts (`npm`, `pypi`, `deb`, Maven, "the ecosystem field").              |
| [policy-verdicts.md](./policy-verdicts.md) | Before writing/reviewing `src/core/policy.ts`, or any task about how findings become a verdict — thresholds, denylist, transitive dampening, verdict precedence, "why did this scan return allow/warn/block?". |
| [_TEMPLATE.md](./_TEMPLATE.md)             | Only when authoring a new wiki page — the structure every page must follow.                                                                                                                                    |

## Conventions

- Every page follows `_TEMPLATE.md`: Title → "When to load this" → Summary (3–5
  lines) → detailed sections with stable headings → "Last pruned" date at the
  bottom.
- Add a new page here as a one-line row with its concrete load trigger.
- Prune on a schedule; update the page's "Last pruned" line when you verify it.
