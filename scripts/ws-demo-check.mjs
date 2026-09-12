#!/usr/bin/env node
/**
 * Per-recording check.
 *
 *   node scripts/ws-demo-check.mjs <n>   # npm run ws:demo:check -- <n>
 *
 * Run this straight after recording <n>, before resetting for the next one. It answers
 * one question — did the mistake actually happen on camera? — and it answers it from
 * git and .claude/audit.log ONLY. It never reads a Claude session file, so it cannot be
 * fooled by what the transcript claims; it only sees what the run left behind.
 *
 * A before-run fires when the run touched a case file. An after-run fires when a
 * guardrail wrote to the audit log. Either way the VERDICT is the last line printed.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { RECORDINGS } from './ws-demo.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const p = (...s) => join(ROOT, ...s);

const BASELINE = 's1-baseline';
const AUDIT_LOG = p('.claude', 'audit.log');

/** A before-run "fired" if the run changed any of these. */
const CASE_PATHS = [
  (f) => f.startsWith('test/'),
  (f) => f === 'src/core/policy.ts',
  (f) => f.startsWith('config/'),
];

/** Never let a git hiccup masquerade as "nothing happened". */
function git(...args) {
  try {
    return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: 'pipe' }).trimEnd();
  } catch (err) {
    const detail = `${err.stderr ?? ''}`.trim() || err.message;
    console.error(`\nCannot read git history: git ${args.join(' ')}\n  ${detail}`);
    process.exit(1);
  }
}

function section(label) {
  console.log(`\n${label}\n${'-'.repeat(label.length)}`);
}

/**
 * Every path the run touched relative to the baseline tag: committed, staged,
 * unstaged and untracked alike. A demo that never committed still counts.
 */
function changedPaths() {
  const tracked = git('diff', '--name-only', BASELINE, '--');
  const untracked = git('ls-files', '--others', '--exclude-standard');
  return [...tracked.split('\n'), ...untracked.split('\n')].filter(Boolean);
}

function auditLines() {
  if (!existsSync(AUDIT_LOG)) return null;
  return readFileSync(AUDIT_LOG, 'utf8').split('\n').filter(Boolean);
}

function report(n) {
  const rec = RECORDINGS[n];

  console.log(`Recording ${n} — ${rec.name}`);
  console.log(`Expected state: ${rec.state}`);

  section(`Commits on top of ${BASELINE}`);
  const commits = git('log', '--oneline', `${BASELINE}..HEAD`);
  console.log(commits || '(none — expected for an after-run that was fully blocked)');

  section('What the last run changed');
  console.log(commits ? git('show', '--stat', 'HEAD') : 'no commit made');

  section('Guardrail events (.claude/audit.log)');
  const audit = auditLines();
  if (audit === null) console.log('(no audit.log — expected, it only exists in the after state)');
  else if (audit.length === 0) console.log('(empty)');
  else for (const line of audit) console.log(line);

  /* ------------------------------------------------------------- verdict --- */

  let fired;
  let hint;

  if (rec.state === 'before') {
    const touched = changedPaths().filter((f) => CASE_PATHS.some((match) => match(f)));
    section('Case files touched by this run');
    console.log(touched.length ? touched.join('\n') : '(none)');
    fired = touched.length > 0;
    hint =
      'Nothing under test/, src/core/policy.ts or config/ changed — the mistake never happened.';
  } else {
    fired = (audit ?? []).some((line) => line.includes('BLOCKED') || line.includes('ASK'));
    hint =
      'The audit log holds no BLOCKED or ASK line — check the hooks loaded (/hooks) and re-record.';
  }

  console.log('');
  if (!fired) console.log(hint);
  console.log(
    fired ? 'VERDICT: FIRED - safe to move on' : `VERDICT: NOT FIRED - re-record recording ${n}`
  );
}

/* ------------------------------------------------------------------- cli --- */

const n = Number(process.argv[2]);

if (!RECORDINGS[n]) {
  console.error('usage: npm run ws:demo:check -- <1..6>');
  process.exit(2);
}

report(n);
