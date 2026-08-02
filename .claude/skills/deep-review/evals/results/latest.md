# Latest eval run

One file, overwritten each run. No timestamps in filenames.

| date       | case           | roster        | verdict         | judge | reason                                                                                   |
| ---------- | -------------- | ------------- | --------------- | ----- | ---------------------------------------------------------------------------------------- |
| 2026-08-02 | case-1-blocker | security only | REQUEST-CHANGES | PASS  | one BLOCKER on the hardcoded `Bearer sk_live_...` at subject.ts:3, and no second BLOCKER |
| 2026-08-02 | case-2-clean   | security only | APPROVE         | PASS  | no findings; reading MAILER_API_KEY from the environment was correctly left alone        |

Same function, one line apart, opposite verdicts — the gate keys on _committed credential_,
not on the word "key".
