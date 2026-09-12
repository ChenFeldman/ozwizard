#!/usr/bin/env node
/**
 * Workshop state switcher.
 *
 *   node scripts/ws-state.mjs before|after|reset|check
 *
 * `before` / `after` swap in that state's .claude/settings.json and its CLAUDE.md
 * rule block. `reset` puts the repo back to a clean, seeded, stateless start.
 * `check` prints a PASS/FAIL table and exits non-zero if anything is wrong.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const p = (...s) => join(ROOT, ...s);

const SETTINGS = p('.claude', 'settings.json');
const CLAUDE_MD = p('.claude', 'CLAUDE.md');
const ACTIVE = p('workshop', 'state', 'ACTIVE');
const START = '<!-- ws:rule:start -->';
const END = '<!-- ws:rule:end -->';
const STATES = ['before', 'after'];

const read = (f) => readFileSync(f, 'utf8');
const stateFile = (name, f) => p('workshop', 'state', name, f);

/** Replace (or append) the marked rule block at the end of CLAUDE.md. */
function writeRuleBlock(body) {
  const block = `${START}\n${body.trim()}\n${END}\n`;
  const current = stripRuleBlock(read(CLAUDE_MD));
  writeFileSync(CLAUDE_MD, `${current.trimEnd()}\n\n${block}`);
}

function stripRuleBlock(text) {
  const start = text.indexOf(START);
  const end = text.indexOf(END);
  if (start === -1 || end === -1) return text;
  return `${text.slice(0, start).trimEnd()}\n${text.slice(end + END.length).replace(/^\n+/, '')}`;
}

function currentRuleBlock() {
  const text = read(CLAUDE_MD);
  const start = text.indexOf(START);
  const end = text.indexOf(END);
  if (start === -1 || end === -1) return null;
  return text.slice(start + START.length, end).trim();
}

function activate(name) {
  writeFileSync(SETTINGS, read(stateFile(name, 'settings.json')));
  writeRuleBlock(read(stateFile(name, 'claude-rule.md')));
  writeFileSync(ACTIVE, `${name}\n`);
  console.log(`ws-state: activated "${name}"`);
}

function activeState() {
  if (!existsSync(ACTIVE)) return null;
  const name = read(ACTIVE).trim();
  return STATES.includes(name) ? name : null;
}

function rm(path) {
  if (existsSync(path)) rmSync(path, { recursive: true, force: true });
}

/** Re-run the repo's own seeding (src/store/seed.ts) against the configured store. */
function reseed() {
  const dir = mkdtempSync(join(tmpdir(), 'ws-seed-'));
  const runner = join(dir, 'seed.mts');
  const url = (...s) => JSON.stringify(pathToFileURL(p(...s)).href);
  writeFileSync(
    runner,
    [
      `import { createStore } from ${url('src', 'store', 'index.ts')};`,
      `import { seedStore } from ${url('src', 'store', 'seed.ts')};`,
      `import { config } from ${url('src', 'util', 'config.ts')};`,
      `const seeded = await seedStore(createStore(config));`,
      `console.log('ws-state: seeded ' + seeded + ' sample artifacts');`,
    ].join('\n')
  );
  try {
    console.log(execFileSync('npx', ['tsx', runner], { cwd: ROOT, encoding: 'utf8' }).trim());
  } finally {
    rm(dir);
  }
}

function reset() {
  execFileSync('git', ['checkout', '--', 'config/', 'data/', 'test/', 'src/', 'tickets/'], {
    cwd: ROOT,
    stdio: 'inherit',
  });
  rm(p('.claude', 'settings.local.json'));
  rm(p('.claude', 'audit.log'));
  rm(p('workshop', '.counters'));
  writeFileSync(CLAUDE_MD, `${stripRuleBlock(read(CLAUDE_MD)).trimEnd()}\n`);
  rm(ACTIVE);
  reseed();
  console.log('ws-state: reset complete');
}

/* ---------------------------------------------------------------- check --- */

function npmTest() {
  try {
    const out = execFileSync('npm', ['test'], { cwd: ROOT, encoding: 'utf8', stdio: 'pipe' });
    const m = /Tests\s+(\d+)\s+passed/.exec(out);
    return { ok: true, detail: m ? `Tests ${m[1]} passed` : 'passed' };
  } catch (err) {
    const out = `${err.stdout ?? ''}${err.stderr ?? ''}`;
    const m = /Tests\s+.*$/m.exec(out);
    return { ok: false, detail: m ? m[0].trim() : 'npm test failed' };
  }
}

/** In the `after` state the hooks are live, so prove they still behave. */
function selfTest() {
  try {
    const out = execFileSync('node', [p('scripts', 'ws-selftest.mjs')], {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: 'pipe',
    });
    const rows = [...out.matchAll(/^(\d+)\/(\d+) rows PASS$/gm)].map((m) => m[0]);
    return { ok: true, detail: rows.join(' + ') || 'all rows PASS' };
  } catch (err) {
    const out = `${err.stdout ?? ''}${err.stderr ?? ''}`;
    const fails = (out.match(/\| FAIL/g) ?? []).length;
    return { ok: false, detail: fails ? `${fails} hook row(s) FAILED` : 'ws:selftest failed' };
  }
}

/** The workshop docs have to keep matching the hooks and tickets on disk. */
function docCheck() {
  try {
    const out = execFileSync('node', [p('scripts', 'ws-doccheck.mjs')], {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: 'pipe',
    });
    const m = /^(\d+\/\d+) rows PASS$/m.exec(out);
    return { ok: true, detail: m ? m[1] + ' doc rows PASS' : 'all doc rows PASS' };
  } catch (err) {
    const out = `${err.stdout ?? ''}${err.stderr ?? ''}`;
    const fails = (out.match(/\| FAIL/g) ?? []).length;
    return { ok: false, detail: fails ? `${fails} doc row(s) FAILED` : 'ws:doccheck failed' };
  }
}

function check() {
  const rows = [];
  const row = (item, ok, detail) => rows.push({ item, ok, detail });

  const active = activeState();
  row('Active state', true, active ?? 'none');

  if (active) {
    row(
      '.claude/settings.json matches state',
      read(SETTINGS) === read(stateFile(active, 'settings.json')),
      `compared to workshop/state/${active}/settings.json`
    );
    row(
      'ws:rule block matches state',
      currentRuleBlock() === read(stateFile(active, 'claude-rule.md')).trim(),
      `compared to workshop/state/${active}/claude-rule.md`
    );
  } else {
    row('.claude/settings.json matches state', true, 'no active state');
    row('ws:rule block matches state', currentRuleBlock() === null, 'no active state, no block');
  }

  for (const f of ['config/policy.json', 'config/denylist.json', 'data/customers/acme.json']) {
    row(f, existsSync(p(f)), 'present');
  }

  const tickets = ['OZ-105', 'OZ-106', 'OZ-107', 'OZ-108'];
  row(
    'Tickets OZ-105..108',
    tickets.every((t) => existsSync(p('tickets', `${t}.md`))),
    tickets.join(', ')
  );

  const policyTest = existsSync(p('test', 'policy.test.ts'))
    ? read(p('test', 'policy.test.ts'))
    : '';
  row(
    'Case 1 transitive denylist test',
    policyTest.includes('does not block denylisted transitive dependency'),
    'test/policy.test.ts'
  );

  const policySrc = existsSync(p('src', 'core', 'policy.ts'))
    ? read(p('src', 'core', 'policy.ts'))
    : '';
  row(
    'Case 2 advisory-age rule',
    /ADVISORY_AGE_DAYS\s*=\s*180/.test(policySrc) && policySrc.includes('isAgedAdvisory'),
    'src/core/policy.ts'
  );

  const thresholdFor = /function thresholdFor[\s\S]*?\n}/.exec(policySrc)?.[0] ?? '';
  row(
    'Case 3 silent-allow path',
    /catch\s*{\s*return 'allow';/.test(thresholdFor),
    "thresholdFor() returns 'allow' on error"
  );

  const docs = docCheck();
  row('npm run ws:doccheck', docs.ok, docs.detail);

  const test = npmTest();
  row('npm test', test.ok, test.detail);

  if (active === 'after') {
    const hooks = selfTest();
    row('npm run ws:selftest', hooks.ok, hooks.detail);
  }

  console.log('| Item | Result | Detail |');
  console.log('| --- | --- | --- |');
  for (const r of rows) console.log(`| ${r.item} | ${r.ok ? 'PASS' : 'FAIL'} | ${r.detail} |`);

  const failed = rows.filter((r) => !r.ok).length;
  console.log(`\n${rows.length - failed}/${rows.length} rows PASS`);
  if (failed > 0) process.exit(1);
}

const cmd = process.argv[2];
if (STATES.includes(cmd)) activate(cmd);
else if (cmd === 'reset') reset();
else if (cmd === 'check') check();
else {
  console.error('usage: node scripts/ws-state.mjs before|after|reset|check');
  process.exit(2);
}
