# Expected — case 1

A **BLOCKER** is flagged for the hardcoded secret in `src/util/config.ts`:
`ADVISORY_API_KEY` falls back to a committed literal (`'sk_live_oz_...'`) when
the env var is unset.

We only require that a BLOCKER covering this issue is present (exact wording and
line number don't matter). The overall verdict should be **REQUEST-CHANGES**.
