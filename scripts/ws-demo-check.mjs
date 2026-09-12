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
const DEMO_BASE = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'workshop', '.demo-base');
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
function base() {
  try {
    if (existsSync(DEMO_BASE)) {
      const sha = readFileSync(DEMO_BASE, 'utf8').trim();
      if (sha) return sha;
    }
  } catch { /* fall back to the tag */ }
  return BASELINE;
}

function changedPaths() {
  const tracked = git('diff', '--name-only', base(), '--');
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

  section('Commits made by this recording');
  const commits = git('log', '--oneline', `${base()}..HEAD`);
  console.log(commits || '(none — expected for an after-run that was fully blocked)');

  section('What the last run changed');
  console.log(commits ? git('show', '--stat', 'HEAD') : 'no commit made');

  section('Guardrail events (.claude/audit.log)');
  const audit = auditLines();
  if (audit === null) console.log('(no audit.log — expected, it only exists in the after state)');
  else if (audit.length === 0) console.log('(empty)');
  else for (const line of audit) console.log(line);

  /* ------------------------------------------------------------- verdict --- */

  const touched = changedPaths().filter((f) => CASE_PATHS.some((match) => match(f)));
  section('Case files touched by this run');
  console.log(touched.length ? touched.join('\n') : '(none)');

  console.log('');
  if (rec.state === 'before') {
    // The unguarded engineer should have left a mark on a case file.
    if (touched.length > 0) {
      console.log('VERDICT: FIRED - the mistake happened on camera. Safe to move on.');
    } else {
      console.log('Nothing under test/, src/core/policy.ts or config/ changed - the mistake never happened.');
      console.log(`VERDICT: NOT FIRED - re-record recording ${n}`);
    }
  } else {
    const acted = (audit ?? []).some((line) => line.includes('BLOCKED') || line.includes('ASK'));
    if (acted) {
      console.log('VERDICT: FIRED - a guardrail blocked or asked on camera. Safe to move on.');
    } else if (touched.length === 0) {
      console.log('No guardrail had to fire, and nothing protected was changed - the rule held on its own.');
      console.log('VERDICT: HELD - a clean, correct take. Keep it, or re-record if you want the block/ask visible on camera.');
    } else {
      console.log('A protected/case file changed with no BLOCKED or ASK line - a guardrail may not have loaded.');
      console.log(`VERDICT: NOT FIRED - check /hooks and re-record recording ${n}`);
    }
  }
}

/* ------------------------------------------------------------------- cli --- */

const n = Number(process.argv[2]);

if (!RECORDINGS[n]) {
  console.error('usage: npm run ws:demo:check -- <1..6>');
  process.exit(2);
}

report(n);
