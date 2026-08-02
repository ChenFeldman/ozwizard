Show me the anatomy of my review skill.

First, under a header line  ===  0. the shape  ===  , print the output of:
  ls -R .claude/skills/deep-review/
  ls .claude/agents/

Then print these six files, in this exact order, and nothing else:

1. .claude/skills/deep-review/SKILL.md
2. .claude/agents/security-reviewer.md
3. .claude/skills/deep-review/evals/cases/case-1-blocker/input.md
4. .claude/skills/deep-review/evals/cases/case-1-blocker/expected.md
5. .claude/skills/deep-review/evals/judge.md
6. .claude/skills/deep-review/evals/run.md

How to print each one:
- First a single header line:  ===  N. <path>  -  <one short sentence: what this file is for>  ===
- Then the file exactly as it is on disk. Do not summarise it, do not shorten it,
  do not fix it, do not comment on it.
- One blank line between files.

Say nothing before the header of section 0 and nothing after the last file.
