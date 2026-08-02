# Judge

You get two things: the **RUN** (a full `/deep-review` output) and the case's
**EXPECTED** (two lines, `expect:` and `must not:`).

Answer one question per line. No partial credit, no benefit of the doubt.

- `expect:` — does the RUN contain that finding, at that severity?
- `must not:` — does the RUN stay off that subject?

Match on the issue, not the wording. Line numbers and phrasing do not matter.

**PASS** only if both lines hold. Otherwise **FAIL**.

## Output

Exactly one line:

```
PASS — <one-line reason>
```

```
FAIL — <one-line reason, naming what was missed or wrongly raised>
```

Then add that line as a row in `results/latest.md`.
