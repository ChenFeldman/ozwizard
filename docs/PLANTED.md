# Planted Issues (Teaching)

These defects were **deliberately introduced** for a find-and-fix / RCA exercise.
Do not treat this file as a list of things already fixed — the issues are live in
the code. Each entry gives the exact location, why it's wrong, and how to trigger it.

> ⚠️ This repository intentionally contains insecure code and a fake credential.
> Do not deploy it. The "secret" in `config.ts` is a made-up placeholder, not a
> real key.
>
> For the security & usage posture (why these are safe here), see [USING_SAFELY.md](./USING_SAFELY.md).

---

## Security

### S1 — Hardcoded secret / API key

- **Location:** `src/util/config.ts:22`
- **What:** `ADVISORY_API_KEY` falls back to a hardcoded literal
  (`'sk_live_oz_...'`) when the env var is unset.
- **Why it's wrong:** Secrets must come from the environment only (Stage 1 rule).
  A committed key leaks to anyone with repo access and ends up in git history.
- **Fix direction:** Require the env var; fail fast if missing. Never commit a default.

### S2 — Token written to logs

- **Location:** `src/util/logger.ts:19`
- **What:** On startup the logger emits `{ advisoryApiKey: ADVISORY_API_KEY }`.
- **Why it's wrong:** Secrets in logs are exfiltration-ready (log aggregators,
  stdout capture, screenshots). Logs are lower-trust than config.
- **Fix direction:** Never log credentials; if you must confirm presence, log a
  boolean or a redacted last-4.

### S3 — PII written to logs on an error path

- **Location:** `src/api/artifacts.ts:30`
- **What:** The `POST /artifacts` catch block logs `submittedBy` (an email) and
  the full `rawBody`.
- **Why it's wrong:** PII in logs breaches data-minimization; error logs are often
  shipped to third-party tools with broad access.
- **Fix direction:** Log an error id + non-PII context; keep PII out of logs.

### S4 — Unescaped user input reflected into a response

- **Location:** `src/api/artifacts.ts:20`
- **What:** The validation-error branch returns `text/html` containing the raw,
  attacker-controlled `name`: `<h1>Invalid manifest for artifact: ${name}</h1>`.
- **Why it's wrong:** Reflected XSS — a `name` of `<script>…</script>` executes in
  any browser that renders the response.
- **Repro:** `curl -X POST /artifacts -d '{"name":"<script>alert(1)</script>"}'`
  (invalid body → HTML echoes the payload).
- **Fix direction:** Return JSON (not HTML), or HTML-escape any echoed input.

---

## Performance

### P1 — Serial `await` in a loop (should be parallel)

- **Location:** `src/core/scanner.ts:131` (inside `scanDependenciesLive`)
- **What:** Each dependency's `refreshAdvisories(dep, …)` is awaited one at a time
  in a `for` loop, so N deps cost N sequential round-trips.
- **Why it's wrong:** The lookups are independent; wall-clock scales linearly with
  dependency count on large/complex artifacts.
- **Fix direction:** Resolve all lookups with `Promise.all` (or a bounded pool),
  then match. See ticket **OZ-102**.

---

## Convention

### C1 — Swallowed error / inconsistent handling

- **Location:** `src/core/policy.ts:54` (the `catch {}` in `thresholdFor`)
- **What:** `thresholdFor` wraps a threshold lookup in `try/catch` and silently
  returns `'allow'` on any error — masking failures and defaulting to the _least_
  safe verdict. The rest of the module surfaces problems rather than hiding them.
- **Why it's wrong:** Swallowing errors hides bugs; defaulting to `allow` turns a
  fault into a silent security bypass. Inconsistent with the strict style elsewhere.
- **Fix direction:** Remove the catch (lookup can't throw), or fail closed (`block`)
  and log.

---

## Business-logic bug

### B1 — Transitive dependency that should BLOCK returns ALLOW (OZ-103)

- **Location:** `src/core/policy.ts:70` (the denylist filter in `evaluate`)
- **What:** The denylist filter is guarded by `dep.direct &&`, so only **direct**
  dependencies are checked against the denylist. A **transitive** denylisted
  package is never turned into a blocking finding.
- **Why it's wrong:** Denylisted packages must be blocked wherever they appear in
  the tree. As written, a transitive denylisted dep with no separate advisory
  produces **no findings → `allow`**, shipping a package policy forbids.
- **Repro (conceptual):** An artifact whose dependency transitively pulls in
  `left-hand@2.0.0` (denylisted, and 2.0.0 has no advisory) evaluates to `allow`;
  the same package as a _direct_ dep correctly `block`s. This asymmetry is the bug.
- **Latent by design:** existing tests only cover a _direct_ denylisted dep, so the
  suite stays green — part of the RCA exercise is to write the missing case.
- **Fix direction:** Drop the `dep.direct &&` guard so the denylist applies to all
  resolved dependencies. See ticket **OZ-103**.
