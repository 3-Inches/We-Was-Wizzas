// The checks a pull request runs once, at the end (step 5 of CLAUDE.md's "Check work in this order"),
// in one command, with one summary:
//
//   node scripts/qa/final.cjs [--fixtures] [--no-sweep] [--keep-saga] [--report-only]
//   npm run qa:final -- --fixtures                    (npm needs the "--" before a flag)
//
// - the owner's saga made afresh for the sweep (QA_LIVING=all QA_OPTIONAL=all npm run qa:saga), unless
//   --keep-saga: a saga made by older code misses what was built since;
// - the tutorials at 1280 and 390;
// - with --fixtures (when a tutorial changed), the hedge magic, Faerie and Mysteries tutorials on each
//   practice saga, at both widths;
// - the sweep of the owner's saga and the practice sagas, at both widths (unless --no-sweep).
//
// "All clean." is said only when every check ran, on this build, and was clean. A check left out is
// named as not run, so the summary says what it does not cover. It first says which build it checks
// (when dist was built, and the commit checked out now), and refuses a build older than what it is
// built from (src/, the books, index.html, the configs). Do not rebuild while it runs: the tutorials
// and the sweep read dist/, and a build that changes under it makes every check not clean. It serves
// dist with `vite preview` on 4173 unless this build already answers there. The summary goes to
// scripts/qa/out/final.txt, which says "running" until it ends; it exits 1 if anything is not clean
// or not run. --report-only runs nothing and judges the reports already in scripts/qa/out/.
const { spawn, spawnSync, execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const app = path.resolve(__dirname, '../..');
const repo = path.resolve(app, '..');
const out = path.join(__dirname, 'out');
const FINAL = path.join(out, 'final.txt');
const args = process.argv.slice(2);
const BASE = 'http://localhost:4173/';
const REPORT_ONLY = args.includes('--report-only');
const FIXTURES = args.includes('--fixtures');
const SWEEP = !args.includes('--no-sweep');
const KEEP_SAGA = args.includes('--keep-saga');
const SAGA = path.join(out, 'saga.json');

fs.mkdirSync(out, { recursive: true });
const finish = (lines, code) => {
  fs.writeFileSync(FINAL, lines.join('\n') + '\n');
  console.log(lines.join('\n'));
  process.exit(code);
};

// What the build is made from; a test file is not (a scratch test written after the build is fine).
const SOURCES = ['app/src', 'app/index.html', 'app/vite.config.ts', 'app/package-lock.json', 'app/scripts/copy-books.mjs', 'reviewed', 'wip', '3rd-party'];
function newest(p) {
  if (!fs.existsSync(p)) return { t: 0, f: '' };
  const st = fs.statSync(p);
  if (!st.isDirectory()) return /\.test\.tsx?$/.test(p) ? { t: 0, f: '' } : { t: st.mtimeMs, f: p };
  let best = { t: 0, f: '' };
  for (const e of fs.readdirSync(p)) {
    const n = newest(path.join(p, e));
    if (n.t > best.t) best = n;
  }
  return best;
}

async function served() {
  try {
    const r = await fetch(BASE);
    return r.ok ? await r.text() : null;
  } catch {
    return null;
  }
}

function run(label, cmd, a, env) {
  if (REPORT_ONLY) return { why: '' };
  console.log(`-- ${label}…`);
  const r = spawnSync(cmd, a, { cwd: app, stdio: ['ignore', 'ignore', 'pipe'], encoding: 'utf8', maxBuffer: 64 << 20, env: { ...process.env, ...env } });
  const last = (r.stderr ?? '').trim().split('\n').pop();
  return { why: r.status === 0 ? '' : `; exited ${r.status ?? r.signal}${last ? `: ${last.slice(0, 200)}` : ''}` };
}
const node = (label, script, ...a) => run(label, process.execPath, [path.join(__dirname, script), ...a]);

let built = 0;
// A report written before the build it is said to check is not its report.
function read(f) {
  const p = path.join(out, f);
  if (!fs.existsSync(p)) return { text: '', old: '; no report' };
  return { text: fs.readFileSync(p, 'utf8'), old: fs.statSync(p).mtimeMs < built ? '; REPORT FROM BEFORE THIS BUILD' : '' };
}

// A run that stopped, or a step whose button was not there to press, is not clean though it found no error.
const STOPS = /STUCK at|\(panel gone\)|STOPPED at the step limit|DID NOT GO ON|NO BUTTON|NOT OFFERED|OUT OF VIEW|MENU CLOSED|^FAILED/m;
// The two steps that have no target in a clean run (see tutorials.cjs).
const EXPECTED_NO_TARGET = [/^Find your way around \d+ of \d+ Welcome:/, /^Design a power \d+ of \d+ Design the power:/];

function tutorials(w) {
  const r = node(`tutorials at ${w}`, 'tutorials.cjs', String(w));
  const { text, old } = read(`tutorials-${w}.txt`);
  const errors = /^errors: (.*)$/m.exec(text)?.[1] ?? 'no report';
  const missing = text.split('\n').filter((l) => /: no target/.test(l));
  const unexpected = missing.filter((l) => !EXPECTED_NO_TARGET.some((re) => re.test(l)));
  const stops = text.split('\n').filter((l) => STOPS.test(l)).map((l) => l.trim());
  const finished = /^\(finished\)$/m.test(text);
  const clean = !r.why && !old && errors === 'none' && finished && !stops.length && !unexpected.length && missing.length === EXPECTED_NO_TARGET.length;
  return {
    clean,
    line: `tutorials ${w}: errors ${errors}; no target ${missing.length} (expected ${EXPECTED_NO_TARGET.length})${finished ? '' : '; DID NOT FINISH'}${stops.length ? `; ${stops.join(' | ')}` : ''}${unexpected.length ? `; unexpected: ${unexpected.join(' | ')}` : ''}${old}${r.why}`,
  };
}

function fixtureTutorials(w) {
  const r = node(`tutorials on the practice sagas at ${w}`, 'tutorials.cjs', String(w), '--fixtures');
  const { text, old } = read(`tutorials-fixtures-${w}.txt`);
  const errors = /^errors: (.*)$/m.exec(text)?.[1] ?? 'no report';
  const missing = /^no target: (\d+)/m.exec(text)?.[1] ?? '?';
  const lines = text.split('\n');
  // each character a tutorial follows ends with "(finished)"; one still in creation is not followed
  const followed = lines.filter((l, i) => /^\S.*:$/.test(l) && !/^errors|^no target/.test(l) && !/in creation/.test(lines[i + 1] ?? '')).length;
  const finished = lines.filter((l) => l.trim() === '(finished)').length;
  const stops = lines.filter((l) => STOPS.test(l)).map((l) => l.trim());
  const clean = !r.why && !old && errors === 'none' && missing === '0' && !stops.length && followed > 0 && finished === followed;
  return { clean, line: `tutorials --fixtures ${w}: errors ${errors}; no target ${missing}; finished ${finished} of ${followed}${stops.length ? `; ${stops.join(' | ')}` : ''}${old}${r.why}` };
}

function sweep(sagaOld) {
  const r = node('sweep at 1280 and 390', 'sweep.cjs');
  return [1280, 390].map((w) => {
    const { text, old } = read(`sweep-${w}.txt`);
    const first = text.split('\n')[0];
    const bad = /(\d+) with problems/.exec(first)?.[1];
    return { clean: !r.why && !old && !sagaOld && bad === '0', line: `sweep ${first || w}${old}${sagaOld}${r.why}` };
  });
}

(async () => {
  fs.writeFileSync(FINAL, `running since ${new Date().toISOString()}: not finished, so nothing here is a result yet\n`);
  const index = path.join(app, 'dist/index.html');
  if (!fs.existsSync(index)) finish(['NOT CLEAN: no build. Run npm run build, then this again.'], 2);
  built = fs.statSync(index).mtimeMs;
  const builtHtml = fs.readFileSync(index, 'utf8');
  const commit = execSync('git log -1 --format="%h %s"', { cwd: app, encoding: 'utf8' }).trim();
  const dirty = execSync('git status --porcelain --untracked-files=no', { cwd: repo, encoding: 'utf8' }).trim();
  const head = [`build of ${new Date(built).toISOString()}; checked out now: ${commit}${dirty ? ' (with uncommitted changes)' : ''}`];
  console.log(head[0]);
  const src = SOURCES.map((s) => newest(path.join(repo, s))).reduce((a, b) => (b.t > a.t ? b : a));
  if (src.t > built) finish([...head, `NOT CLEAN: ${path.relative(repo, src.f)} is newer than the build. Run npm run build, then this again.`], 2);

  const results = [];
  const notRun = [];
  let server = null;
  if (!REPORT_ONLY) {
    const html = await served();
    if (html !== null && html !== builtHtml) finish([...head, `NOT CLEAN: something else answers at ${BASE} (another build, or another checkout). Stop it, then run this again.`], 2);
    if (html === null) {
      server = spawn(path.join(app, 'node_modules/.bin/vite'), ['preview', '--port', '4173', '--strictPort'], { cwd: app, stdio: 'ignore' });
      for (let i = 0; i < 50 && (await served()) === null; i++) await new Promise((r) => setTimeout(r, 200));
    }
  }
  try {
    if (SWEEP && !KEEP_SAGA) {
      // QA_OUT is set, so a value left in the shell does not send the saga where the sweep does not look
      const r = run("the owner's saga", path.join(app, 'node_modules/.bin/vitest'), ['run', '--config', 'scripts/qa/vitest.config.ts'], { QA_LIVING: 'all', QA_OPTIONAL: 'all', QA_OUT: SAGA });
      if (r.why) results.push({ clean: false, line: `the owner's saga could not be made${r.why}: run npm run qa:saga to see why` });
    }
    const sagaAt = fs.existsSync(SAGA) ? fs.statSync(SAGA).mtimeMs : 0;
    if (SWEEP) head.push(sagaAt ? `the owner's saga made ${new Date(sagaAt).toISOString()}` : "no saga for the owner's sweep");
    const sagaOld = !SWEEP || KEEP_SAGA || sagaAt >= built ? '' : '; THE SAGA SWEPT WAS MADE BEFORE THIS BUILD';
    results.push(tutorials(1280), tutorials(390));
    if (FIXTURES) results.push(fixtureTutorials(1280), fixtureTutorials(390));
    else notRun.push('the tutorials on the practice sagas (--fixtures; run them when a tutorial changed)');
    if (SWEEP) results.push(...sweep(sagaOld));
    else notRun.push('the sweep (--no-sweep)');
    if (SWEEP && KEEP_SAGA) notRun.push("the owner's saga made afresh (--keep-saga)");
  } finally {
    server?.kill();
  }
  // the build must be the same one at the end as at the start
  if (fs.existsSync(index) && fs.statSync(index).mtimeMs !== built) results.push({ clean: false, line: 'dist was rebuilt while the checks ran: run them again' });

  const lines = [...head, ...results.map((r) => `${r.clean ? 'clean    ' : 'NOT CLEAN'} ${r.line}`), ...notRun.map((n) => `not run   ${n}`)];
  const ok = results.every((r) => r.clean);
  lines.push(!ok ? 'Not clean: see the reports in scripts/qa/out/.' : notRun.length ? 'Clean as far as it ran; not run is named above.' : 'All clean.');
  finish(lines, ok && !notRun.length ? 0 : 1);
})().catch((e) => finish([`NOT CLEAN: final.cjs failed: ${e.message}`], 2));
