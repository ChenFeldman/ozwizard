#!/usr/bin/env node
/**
 * Documentation check for docs/workshop/.
 *
 *   node scripts/ws-doccheck.mjs        # npm run ws:doccheck
 *
 * Proves the workshop docs still match what is on disk: every hook script is
 * documented, every ticket is covered by both the re-learn page and the runbook, no
 * unfilled placeholders escaped the one table that is allowed them, and every link is
 * well-formed. Prints a markdown table and exits non-zero on failure.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, URL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const p = (...s) => join(ROOT, ...s);
const read = (f) => readFileSync(p(f), 'utf8');

const GUARDRAILS = 'docs/workshop/guardrails.md';
const RUNBOOK = 'docs/workshop/demo-runbook.md';
const PROMPTS = 'docs/workshop/participant-prompts.md';
const DOCS = [GUARDRAILS, RUNBOOK, PROMPTS];

/** The one heading whose section may hold `[N]`-style placeholders. */
const PLACEHOLDER_SECTION = 'Before and after';
const PLACEHOLDER = /\[[A-Z]\]/g;

const rows = [];
const row = (item, ok, detail) => rows.push({ item, ok, detail });

/* ------------------------------------------------------------- the files --- */

for (const f of DOCS)
  row(`${f} exists`, existsSync(p(f)), existsSync(p(f)) ? 'present' : 'MISSING');

if (rows.some((r) => !r.ok)) {
  print();
  process.exit(1);
}

const guardrails = read(GUARDRAILS);
const runbook = read(RUNBOOK);
const prompts = read(PROMPTS);

/* ------------------------------------------------------------- the hooks --- */

const hooks = readdirSync(p('.claude', 'hooks'))
  .filter((f) => f.endsWith('.sh'))
  .sort();
const missingHooks = hooks.filter((h) => !guardrails.includes(h));
row(
  `Every .sh in .claude/hooks/ is in ${GUARDRAILS}`,
  missingHooks.length === 0,
  missingHooks.length === 0
    ? `${hooks.length} hooks, all named`
    : `missing: ${missingHooks.join(', ')}`
);

/* ----------------------------------------------------------- the tickets --- */

const tickets = readdirSync(p('tickets'))
  .filter((f) => /^OZ-10[5-8]\.md$/.test(f))
  .map((f) => f.replace(/\.md$/, ''))
  .sort();

for (const [label, text] of [
  [GUARDRAILS, guardrails],
  [RUNBOOK, runbook],
]) {
  const missing = tickets.filter((t) => !text.includes(t));
  row(
    `Every OZ-105..108 ticket is in ${label}`,
    missing.length === 0,
    missing.length === 0 ? tickets.join(', ') : `missing: ${missing.join(', ')}`
  );
}

/* ------------------------------------------------------- no loose ends ----- */

for (const [label, text] of [
  [GUARDRAILS, guardrails],
  [RUNBOOK, runbook],
  [PROMPTS, prompts],
]) {
  const todos = text.split('\n').filter((l) => l.includes('TODO')).length;
  row(`No TODO in ${label}`, todos === 0, todos === 0 ? 'none' : `${todos} line(s) contain TODO`);
}

/**
 * Placeholders like `[N]` are allowed only inside the "Before and after" section,
 * where the facilitator fills in the two prompt counts by hand.
 */
for (const [label, text] of [
  [GUARDRAILS, guardrails],
  [RUNBOOK, runbook],
  [PROMPTS, prompts],
]) {
  const lines = text.split('\n');
  let inAllowed = false;
  const stray = [];
  lines.forEach((line, i) => {
    if (/^#{1,6}\s/.test(line)) inAllowed = line.includes(PLACEHOLDER_SECTION);
    if (inAllowed) return;
    if (PLACEHOLDER.test(line)) stray.push(`${label}:${i + 1}`);
    PLACEHOLDER.lastIndex = 0;
  });
  row(
    `No [N]-style placeholder outside "${PLACEHOLDER_SECTION}" in ${label}`,
    stray.length === 0,
    stray.length === 0 ? 'none' : stray.join(', ')
  );
}

/* ------------------------------------------------------------- the links --- */

const links = [...guardrails.matchAll(/https?:\/\/[^\s<>)"'\]]+/g)].map((m) => m[0]);
const badLinks = links.filter((u) => {
  try {
    const url = new URL(u);
    return !/^https?:$/.test(url.protocol) || !url.hostname.includes('.') || /[<>"\s]/.test(u);
  } catch {
    return true;
  }
});
row(
  `Every http link in ${GUARDRAILS} is well-formed`,
  links.length > 0 && badLinks.length === 0,
  links.length === 0
    ? 'no links found'
    : badLinks.length === 0
      ? `${links.length} links OK`
      : `bad: ${badLinks.join(', ')}`
);

/* ------------------------------------------------------------------ out --- */

function print() {
  console.log('| Item | Result | Detail |');
  console.log('| --- | --- | --- |');
  for (const r of rows) console.log(`| ${r.item} | ${r.ok ? 'PASS' : 'FAIL'} | ${r.detail} |`);
  const failed = rows.filter((r) => !r.ok).length;
  console.log(`\n${rows.length - failed}/${rows.length} rows PASS`);
  return failed;
}

if (print() > 0) process.exit(1);
