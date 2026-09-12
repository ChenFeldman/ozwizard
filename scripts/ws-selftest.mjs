#!/usr/bin/env node
/**
 * Hook self-test — verifies every guardrail hook without Claude in the loop.
 *
 *   node scripts/ws-selftest.mjs
 *
 * Each case feeds a hook the same stdin JSON Claude Code would send and checks the
 * exit code, stderr and stdout. The whole table runs twice: once normally, once with
 * WS_NO_JQ=1 so the grep/sed fallback path is covered too. Exits non-zero if any row
 * fails. Hooks that write to .claude/audit.log are pointed at a throwaway project
 * directory, so the repo's audit log and settings are never touched.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const HOOKS = join(ROOT, '.claude', 'hooks');

/** The event JSON Claude Code puts on a hook's stdin. */
const preEdit = (file, tool = 'Edit') => ({
  session_id: 'ws-selftest',
  cwd: ROOT,
  hook_event_name: 'PreToolUse',
  tool_name: tool,
  tool_input: { file_path: file, old_string: 'a', new_string: 'b' },
});
const preBash = (command) => ({
  session_id: 'ws-selftest',
  cwd: ROOT,
  hook_event_name: 'PreToolUse',
  tool_name: 'Bash',
  tool_input: { command, description: 'selftest' },
});
const postEdit = (file) => ({ ...preEdit(file), hook_event_name: 'PostToolUse' });
const postBash = (command) => ({ ...preBash(command), hook_event_name: 'PostToolUse' });

const ASK = '"permissionDecision":"ask"';

/**
 * hook     script name under .claude/hooks
 * name     case label
 * stdin    event object
 * exit     expected exit code
 * stderr   substring expected on stderr
 * stdout   substring expected on stdout
 * empty    stdout must be empty
 * audit    substring the hook must have appended to audit.log
 * inRepo   run with CLAUDE_PROJECT_DIR = the real repo (run-tests needs it)
 */
const CASES = [
  {
    hook: 'protect-files.sh',
    name: 'Edit config/policy.json',
    stdin: preEdit('config/policy.json'),
    exit: 2,
    stderr: 'Blocked',
  },
  {
    hook: 'protect-files.sh',
    name: 'Edit .claude/settings.json',
    stdin: preEdit('.claude/settings.json'),
    exit: 2,
    stderr: 'Blocked',
  },
  {
    hook: 'protect-files.sh',
    name: 'Edit src/core/policy.ts',
    stdin: preEdit('src/core/policy.ts'),
    exit: 0,
    empty: true,
  },

  {
    hook: 'no-push-main.sh',
    name: 'git push origin main',
    stdin: preBash('git push origin main'),
    exit: 2,
    stderr: 'Blocked',
  },
  {
    hook: 'no-push-main.sh',
    name: 'git push origin master',
    stdin: preBash('git push origin master'),
    exit: 2,
    stderr: 'Blocked',
  },
  {
    hook: 'no-push-main.sh',
    name: 'git push --force origin feature/x',
    stdin: preBash('git push --force origin feature/x'),
    exit: 2,
    stderr: 'Blocked',
  },
  {
    hook: 'no-push-main.sh',
    name: 'git push origin feature/x',
    stdin: preBash('git push origin feature/x'),
    exit: 0,
    empty: true,
  },

  {
    hook: 'block-destructive.sh',
    name: 'rm -rf node_modules',
    stdin: preBash('rm -rf node_modules'),
    exit: 0,
    empty: true,
  },
  {
    hook: 'block-destructive.sh',
    name: 'rm -rf src',
    stdin: preBash('rm -rf src'),
    exit: 2,
    stderr: 'Blocked',
  },
  {
    hook: 'block-destructive.sh',
    name: 'git reset --hard HEAD~1',
    stdin: preBash('git reset --hard HEAD~1'),
    exit: 2,
    stderr: 'Blocked',
  },
  {
    hook: 'block-destructive.sh',
    name: 'docker compose up',
    stdin: preBash('docker compose up'),
    exit: 2,
    stderr: 'Blocked',
  },
  {
    hook: 'block-destructive.sh',
    name: 'git status',
    stdin: preBash('git status'),
    exit: 0,
    empty: true,
  },

  {
    hook: 'ask-on-test-edit.sh',
    name: 'Edit test/policy.test.ts',
    stdin: preEdit('test/policy.test.ts'),
    exit: 0,
    stdout: ASK,
  },
  {
    hook: 'ask-on-test-edit.sh',
    name: 'Edit src/x.ts',
    stdin: preEdit('src/x.ts'),
    exit: 0,
    empty: true,
  },

  {
    hook: 'ask-on-long-running.sh',
    name: 'npm run e2e',
    stdin: preBash('npm run e2e'),
    exit: 0,
    stdout: ASK,
  },
  {
    hook: 'ask-on-long-running.sh',
    name: 'npx playwright test',
    stdin: preBash('npx playwright test'),
    exit: 0,
    stdout: ASK,
  },
  {
    hook: 'ask-on-long-running.sh',
    name: 'npm test',
    stdin: preBash('npm test'),
    exit: 0,
    empty: true,
  },

  {
    hook: 'run-tests.sh',
    name: 'Edit src/core/policy.ts',
    stdin: postEdit('src/core/policy.ts'),
    exit: 0,
    stdout: 'systemMessage',
    stdoutRe: /Tests|passed/,
    inRepo: true,
  },
  {
    hook: 'run-tests.sh',
    name: 'Edit README.md',
    stdin: postEdit('README.md'),
    exit: 0,
    empty: true,
    inRepo: true,
  },

  {
    hook: 'audit-log.sh',
    name: 'Bash git status',
    stdin: postBash('git status'),
    exit: 0,
    audit: 'git status',
  },

  {
    hook: 'config-audit.sh',
    name: 'ConfigChange project_settings',
    stdin: {
      hook_event_name: 'ConfigChange',
      source: 'project_settings',
      file_path: '.claude/settings.json',
    },
    exit: 0,
    audit: 'CONFIG',
  },
];

function describeExpected(c) {
  const bits = [`exit ${c.exit}`];
  if (c.stderr) bits.push(`stderr ~ "${c.stderr}"`);
  if (c.stdout) bits.push(`stdout ~ "${c.stdout}"`);
  if (c.stdoutRe) bits.push(`stdout ~ ${c.stdoutRe}`);
  if (c.empty) bits.push('stdout empty');
  if (c.audit) bits.push(`audit.log += "${c.audit}"`);
  return bits.join(', ');
}

function runCase(c, sandbox, env) {
  const project = c.inRepo ? ROOT : sandbox;
  const auditLog = join(project, '.claude', 'audit.log');
  const before = existsSync(auditLog) ? readFileSync(auditLog, 'utf8') : '';

  const res = spawnSync('bash', [join(HOOKS, c.hook)], {
    input: JSON.stringify(c.stdin),
    encoding: 'utf8',
    cwd: project,
    env: { ...process.env, ...env, CLAUDE_PROJECT_DIR: project },
  });

  const after = existsSync(auditLog) ? readFileSync(auditLog, 'utf8') : '';
  const added = after.slice(before.length).trim();
  const out = (res.stdout ?? '').trim();
  const err = (res.stderr ?? '').trim();

  const fails = [];
  if (res.status !== c.exit) fails.push(`exit ${res.status}`);
  if (c.stderr && !err.includes(c.stderr))
    fails.push(`stderr "${err.split('\n')[0] || '(empty)'}"`);
  if (c.stdout && !out.includes(c.stdout)) fails.push(`stdout "${out.slice(0, 60) || '(empty)'}"`);
  if (c.stdoutRe && !c.stdoutRe.test(out)) fails.push(`stdout !~ ${c.stdoutRe}`);
  if (c.empty && out !== '') fails.push(`stdout not empty: "${out.slice(0, 60)}"`);
  if (c.audit) {
    const lines = added.split('\n').filter(Boolean);
    if (lines.length !== 1 || !lines[0].includes(c.audit)) {
      fails.push(`audit.log +${lines.length} line(s): "${added.slice(0, 60) || '(nothing)'}"`);
    }
  }

  const got = [`exit ${res.status}`];
  if (err) got.push(`stderr "${err.split('\n')[0].slice(0, 50)}"`);
  if (out)
    got.push(out.includes(ASK) ? 'stdout ask JSON' : `stdout "${out.split('\n')[0].slice(0, 50)}"`);
  else got.push('stdout empty');
  if (c.audit) got.push(`audit.log +${added.split('\n').filter(Boolean).length}`);

  return { pass: fails.length === 0, got: got.join(', '), fails };
}

function runTable(label, env) {
  const sandbox = mkdtempSync(join(tmpdir(), 'ws-selftest-'));
  mkdirSync(join(sandbox, '.claude'), { recursive: true });
  let failed = 0;

  console.log(`\n### ${label}\n`);
  console.log('| Hook | Case | Expected | Got | PASS/FAIL |');
  console.log('| --- | --- | --- | --- | --- |');
  for (const c of CASES) {
    const r = runCase(c, sandbox, env);
    if (!r.pass) failed += 1;
    console.log(
      `| \`${c.hook}\` | ${c.name} | ${describeExpected(c)} | ${r.got} | ${r.pass ? 'PASS' : `FAIL (${r.fails.join('; ')})`} |`
    );
  }
  rmSync(sandbox, { recursive: true, force: true });
  console.log(`\n${CASES.length - failed}/${CASES.length} rows PASS`);
  return failed;
}

const settingsPath = join(ROOT, '.claude', 'settings.json');
const settingsBefore = existsSync(settingsPath) ? readFileSync(settingsPath, 'utf8') : null;

let failed = 0;
failed += runTable('Run 1 — with jq (if installed)', {});
failed += runTable('Run 2 — WS_NO_JQ=1 (grep/sed fallback)', { WS_NO_JQ: '1' });

const settingsAfter = existsSync(settingsPath) ? readFileSync(settingsPath, 'utf8') : null;
if (settingsBefore !== settingsAfter) {
  console.error('\nFAIL: .claude/settings.json was modified by the self-test.');
  failed += 1;
}

console.log(`\n**Total: ${failed === 0 ? 'all rows PASS' : `${failed} row(s) FAILED`}**`);
process.exit(failed === 0 ? 0 : 1);
