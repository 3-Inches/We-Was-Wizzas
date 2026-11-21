// The checks a pull request runs once, at the end (step 5 of CLAUDE.md's "Check work in this order"),
// in one command, with one summary:
//
//   node scripts/qa/final.cjs [--fixtures] [--no-sweep] [--keep-saga] [--report-only]      (npm run qa:final)
//
// - the owner's saga made afresh for the sweep (QA_LIVING=all QA_OPTIONAL=all npm run qa:saga), unless
//   --keep-saga or --no-sweep: a saga made by older code misses what was built since;
// - the tutorials at 1280 and 390;
// - with --fixtures (when a tutorial changed), the hedge magic, Faerie and Mysteries tutorials on each
//   practice saga, at both widths;
// - the sweep of the owner's saga and the practice sagas, at both widths (unless --no-sweep).
//
// It first says which build it checks: the time `dist` was built and the commit it was built on, and it
// stops if a file in src/ is newer than the build, so a pull request never reports checks of a build
// that is not its own. Do not rebuild while it runs: the tutorials and the sweep read dist/.
// It serves dist with `vite preview` on 4173 unless something already answers there. The summary goes
// to scripts/qa/out/final.txt; it exits 1 if any check is not clean. --report-only runs nothing and
// summarizes the reports already in scripts/qa/out/ (to read a run again, or one run by hand).
const { spawn, spawnSync, execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const app = path.resolve(__dirname, '../..');
const out = path.join(__dirname, 'out');
const args = process.argv.slice(2);
const BASE = 'http://localhost:4173/';
const REPORT_ONLY = args.includes('--report-only');

function newest(dir) {
  let t = 0;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    t = Math.max(t, e.isDirectory() ? newest(p) : fs.statSync(p).mtimeMs);
  }
  return t;
}

async function answers() {
  try {
    return (await fetch(BASE)).ok;
  } catch {
    return false;
  }
}

function run(label, script, ...a) {
  if (REPORT_ONLY) return { status: 0, why: '' };
  console.log(`-- ${label}…`);
  const r = spawnSync(process.execPath, [path.join(__dirname, script), ...a], { cwd: app, stdio: ['ignore', 'ignore', 'pipe'], encoding: 'utf8', maxBuffer: 64 << 20 });
  const last = (r.stderr ?? '').trim().split('\n').pop();
  return { status: r.status, why: r.status === 0 ? '' : `; exited ${r.status}${last ? `: ${last}` : ''}` };
}

let built = 0;
// A report written before the build it is said to check is not its report.
function read(f) {
  const p = path.join(out, f);
  if (!fs.existsSync(p)) return { text: '', old: '; no report' };
  return { text: fs.readFileSync(p, 'utf8'), old: fs.statSync(p).mtimeMs < built ? '; REPORT FROM BEFORE THIS BUILD' : '' };
}

// The two steps that have no target in a clean run (see tutorials.cjs).
const EXPECTED_NO_TARGET = [/^Find your way around \d+ of \d+ Welcome:/, /^Design a power \d+ of \d+ Design the power:/];

function tutorials(w) {
  const r = run(`tutorials at ${w}`, 'tutorials.cjs', String(w));
  const { text, old } = read(`tutorials-${w}.txt`);
  const errors = /^errors: (.*)$/m.exec(text)?.[1] ?? 'no report';
  const missing = text.split('\n').filter((l) => /: no target/.test(l));
  const unexpected = missing.filter((l) => !EXPECTED_NO_TARGET.some((re) => re.test(l)));
  const clean = !r.why && !old && errors === 'none' && unexpected.length === 0 && missing.length === EXPECTED_NO_TARGET.length;
  return { clean, line: `tutorials ${w}: errors ${errors}; no target ${missing.length} (expected ${EXPECTED_NO_TARGET.length})${unexpected.length ? `; unexpected: ${unexpected.join(' | ')}` : ''}${old}${r.why}` };
}

function fixtureTutorials(w) {
  const r = run(`tutorials on the practice sagas at ${w}`, 'tutorials.cjs', String(w), '--fixtures');
  const { text, old } = read(`tutorials-fixtures-${w}.txt`);
  const errors = /^errors: (.*)$/m.exec(text)?.[1] ?? 'no report';
  const missing = /^no target: (\d+)/m.exec(text)?.[1] ?? '?';
  return { clean: !r.why && !old && errors === 'none' && missing === '0', line: `tutorials --fixtures ${w}: errors ${errors}; no target ${missing}${old}${r.why}` };
}

function sweep() {
  const r = run('sweep at 1280 and 390', 'sweep.cjs');
  return [1280, 390].map((w) => {
    const { text, old } = read(`sweep-${w}.txt`);
    const first = text.split('\n')[0];
    const bad = /(\d+) with problems/.exec(first)?.[1];
    return { clean: !r.why && !old && bad === '0', line: `sweep ${first || w}${old}${r.why}` };
  });
}

(async () => {
  const index = path.join(app, 'dist/index.html');
  if (!fs.existsSync(index)) {
    console.error('No build: run npm run build first.');
    process.exit(2);
  }
  built = fs.statSync(index).mtimeMs;
  const stale = newest(path.join(app, 'src')) > built;
  const commit = execSync('git log -1 --format="%h %s"', { cwd: app, encoding: 'utf8' }).trim();
  const dirty = execSync('git status --porcelain -- src', { cwd: app, encoding: 'utf8' }).trim();
  const head = [`build of ${new Date(built).toISOString()}, on ${commit}${dirty ? ' (src/ has uncommitted changes)' : ''}`];
  console.log(head[0]);
  if (stale) {
    console.error('A file in src/ is newer than the build: run npm run build, then this again.');
    process.exit(2);
  }

  let server = null;
  if (!REPORT_ONLY && !(await answers())) {
    server = spawn(path.join(app, 'node_modules/.bin/vite'), ['preview', '--port', '4173', '--strictPort'], { cwd: app, stdio: 'ignore' });
    for (let i = 0; i < 50 && !(await answers()); i++) await new Promise((r) => setTimeout(r, 200));
  }
  const results = [];
  try {
    if (!REPORT_ONLY && !args.includes('--keep-saga') && !args.includes('--no-sweep')) {
      console.log('-- the owner\'s saga…');
      const r = spawnSync(path.join(app, 'node_modules/.bin/vitest'), ['run', '--config', 'scripts/qa/vitest.config.ts'], { cwd: app, stdio: 'ignore', env: { ...process.env, QA_LIVING: 'all', QA_OPTIONAL: 'all' } });
      if (r.status !== 0) results.push({ clean: false, line: `the owner's saga could not be made (exited ${r.status}): run npm run qa:saga to see why` });
    }
    const saga = path.join(out, 'saga.json');
    if (fs.existsSync(saga)) head.push(`the owner's saga made ${new Date(fs.statSync(saga).mtimeMs).toISOString()}`);
    results.push(tutorials(1280), tutorials(390));
    if (args.includes('--fixtures')) results.push(fixtureTutorials(1280), fixtureTutorials(390));
    if (!args.includes('--no-sweep')) results.push(...sweep());
  } finally {
    server?.kill();
  }
  const lines = [...results.map((r) => `${r.clean ? 'clean   ' : 'NOT CLEAN'} ${r.line}`)];
  const ok = results.every((r) => r.clean);
  lines.push(ok ? 'All clean.' : 'Not clean: see the reports in scripts/qa/out/.');
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'final.txt'), [...head, ...lines].join('\n') + '\n');
  console.log(lines.join('\n'));
  process.exit(ok ? 0 : 1);
})();
