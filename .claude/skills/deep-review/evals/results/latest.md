# Latest eval run

One file, overwritten each run. No timestamps in filenames.

| date       | case                              | result | reason                                                                                                       |
| ---------- | --------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------ |
| 2026-08-02 | case-1-blocker                    | PASS   | security flagged the hardcoded ADVISORY_API_KEY as BLOCKER (convention corroborated); zod defaults untouched |
| 2026-08-02 | case-2-clean                      | PASS   | all three reviewers returned no findings on the types-only file; verdict APPROVE                             |
| 2026-08-02 | case-1-blocker (security removed) | PASS   | expected FAIL — performance and convention each filed the same key as BLOCKER, so the gate did not miss it   |

The third row is the **red-path attempt**, and it did not go red. Removing one reviewer
from a roster of three overlapping charters does not make this eval fail — see the note at
the end of `run.md`.
