# Participant prompts

Five prompts. Above each one is a line saying **where** it gets pasted — which tool,
which repository, in which state. Copy the whole fenced block, replace the
`[paste ...]` parts with your own values, and send it.

The three "own repo" prompts are the same ones in
`docs/workshop/guardrails.md` section 8, so you only need one of the two pages later.

---

## Block 1 — in the session

**WHERE:** Claude Code, in **your own repository** (any language, any state), in a
fresh session.

```
Add a PreToolUse hook to this repository that blocks edits to protected files.

Paths that must never change:
[paste the paths that must never change, one per line — e.g. config/, .env, .github/workflows/]

Create exactly these files:
1. .claude/hooks/protected-paths.txt — one path prefix or glob per line, the list
   above, "#" for comments, a trailing "/" meaning everything beneath.
2. .claude/hooks/protect-files.sh — bash, executable, starting with a "# WHY:" comment
   explaining the rule in two sentences. It reads the hook event JSON on stdin, takes
   the edited path from .tool_input.file_path (use jq if available, a sed fallback if
   not), makes it relative to $CLAUDE_PROJECT_DIR, and compares it against every line
   of protected-paths.txt. On a match: print "Blocked: <path> is protected" to stderr
   and exit 2. Otherwise exit 0 silently.
3. In .claude/settings.json, add under hooks.PreToolUse an entry with
   matcher "Edit|Write|MultiEdit" running
   bash "$CLAUDE_PROJECT_DIR"/.claude/hooks/protect-files.sh

Then test it without me: pipe a fake event JSON into the script by hand — one path
from the protected list (expect exit 2 and the Blocked message) and one ordinary
source file (expect exit 0 and no output). Show me both results.
Do not weaken the hook to make the test pass.

When that is done and both tests show what they should: restart this session so the
new hook is loaded, then edit one of the protected files above — add a comment at the
top of it. Show me exactly what happens.
```

You should see the edit refused with your own `Blocked:` message, from a hook you
wrote ninety seconds ago. That is the whole workshop in one prompt.

---

## Block 5 — in the session

**WHERE:** Claude Code, in **your clone of the OzWizard demo repo**, on branch
`workshop-s1`. Run the two shell commands in a terminal first, then open a **fresh**
Claude Code session before pasting the prompt.

In the terminal: `git fetch && git checkout workshop-s1 && npm run ws:after`

Then, in a fresh Claude Code session in that directory:

```
Work on tickets/OZ-105.md. When done, commit and open a PR.
```

Count every permission prompt you are shown, and write the number down. Compare it
with the number the facilitator recorded for the same ticket with the guardrails
switched off. The counts are the exercise — not the patch.

---

## Take home (a) — protect your files

**WHERE:** Claude Code, in **your own repository**, any state. Run it once per repo
you care about.

```
Add a PreToolUse hook to this repository that blocks edits to protected files.

Paths that must never change:
[paste the paths that must never change, one per line — e.g. config/, .env, .github/workflows/]

Create exactly these files:
1. .claude/hooks/protected-paths.txt — one path prefix or glob per line, the list
   above, "#" for comments, a trailing "/" meaning everything beneath.
2. .claude/hooks/protect-files.sh — bash, executable, starting with a "# WHY:" comment
   explaining the rule in two sentences. It reads the hook event JSON on stdin, takes
   the edited path from .tool_input.file_path (use jq if available, a sed fallback if
   not), makes it relative to $CLAUDE_PROJECT_DIR, and compares it against every line
   of protected-paths.txt. On a match: print "Blocked: <path> is protected" to stderr
   and exit 2. Otherwise exit 0 silently.
3. In .claude/settings.json, add under hooks.PreToolUse an entry with
   matcher "Edit|Write|MultiEdit" running
   bash "$CLAUDE_PROJECT_DIR"/.claude/hooks/protect-files.sh

Then test it without me: pipe a fake event JSON into the script by hand — one path
from the protected list (expect exit 2 and the Blocked message) and one ordinary
source file (expect exit 0 and no output). Show me both results.
Do not weaken the hook to make the test pass.
```

---

## Take home (b) — run your tests after every edit

**WHERE:** Claude Code, in **your own repository**, any state. Needs a test command
that runs in under two minutes.

```
Add a PostToolUse hook to this repository that runs the tests after every code edit
and reports the result back to you in the same turn.

My test command is:
[paste your test command — e.g. npm test, pytest -q, go test ./..., composer test]

Create .claude/hooks/run-tests.sh, executable, starting with a "# WHY:" comment in two
sentences. It must:
- read the hook event JSON on stdin and take .tool_input.file_path (jq if available,
  sed fallback if not);
- exit 0 silently unless that path is a source or test file in this project;
- run the test command above from $CLAUDE_PROJECT_DIR, capture stdout and stderr;
- print the LAST 15 LINES of that output — no more — as JSON on stdout in the form
  {"hookSpecificOutput":{"hookEventName":"PostToolUse","systemMessage":"<the tail>"}}
- ALWAYS exit 0, pass or fail. This hook reports; it never blocks.

Wire it in .claude/settings.json under hooks.PostToolUse with matcher
"Edit|Write|MultiEdit" and "timeout": 120.

Then test it: pipe a fake event naming a real source file into the script and show me
the JSON it printed and its exit code. Confirm the output is at most 15 lines.
```

---

## Take home (c) — one more guardrail, its choice

**WHERE:** Claude Code, in **your own repository**, any state. Best run after (a) and
(b), so it can see what is already there.

```
Pick ONE of these seven guardrail patterns for this repository — whichever is most
useful given what you can see in the repo — and install it. Tell me which you picked
and why, in two sentences, before you write anything.

1. protect-files — refuse edits to files that are ground truth.
2. config-guard — refuse or log edits to .claude/ and the settings files themselves.
3. git-safety — block git reset --hard, git clean, git checkout -- ., and force pushes.
4. protect-tests — ask a human before any edit under the test directory.
5. checks-after-edit — run the formatter and type/lint check after every edit.
6. review-on-push — run a security and quality pass before commit or push.
7. audit-log — append one line per tool call to .claude/audit.log.

I care most about:
[paste what you are most afraid of an agent doing in this repo]

Whichever you pick, produce the same three things: an executable bash script in
.claude/hooks/ whose first comment line starts with "# WHY:" and explains the rule;
the matching entry in .claude/settings.json under the correct event (PreToolUse to
block or ask, PostToolUse to report, ConfigChange to log settings changes); and a
by-hand test where you pipe a fake event JSON into the script and show me the exit
code and output for both a case it should catch and a case it should ignore.

Exit 2 blocks. Printing {"hookSpecificOutput":{"hookEventName":"PreToolUse",
"permissionDecision":"ask","permissionDecisionReason":"<why>"}} asks. Exit 0 allows.
Keep the script working whether or not jq is installed.
```
