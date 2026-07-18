---
paths:
  - 'src/api/**'
---

# Rules for `src/api/**` (the HTTP edge)

This layer is the boundary between untrusted callers and the pure core. Its whole job is
to validate, translate, and stay thin.

- **Validate every input with zod.** Parse the request body/params/query with a schema
  from `schemas.ts` before using it. Never pass unvalidated `request.body` into core.
- **Never log tokens, secrets, or PII.** Do not log request bodies, auth headers,
  `submittedBy` (email), API keys, or full error objects that may embed them. Log an
  error id + non-sensitive context instead. Secrets must never reach logs.
- **No user input echoed unescaped into responses.** Return JSON. Do not build HTML from
  request fields (reflected-XSS risk). If you must include user input, escape it.
- **No business logic here.** Resolve, scan, evaluate, and record belong in `src/core/**`.
  The route wires core functions to the store and shapes the HTTP response.
- **Consistent errors.** Validation → 400, unknown resource → 404, unexpected → 500, with
  a stable JSON shape (`{ error, message }`). Don't swallow errors silently.
- **Keep it deterministic-friendly.** Generate ids/timestamps here (the IO edge) and pass
  them into core, so core stays pure.
