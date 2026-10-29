// Visits every page and tab of a saga in a browser and reports what goes wrong: page errors, console
// errors, a page wider than the screen, and "undefined", "NaN" or "[object Object]" in the text.
//
//   npm run build && npm run qa:saga && npm run qa:sweep
//   node scripts/qa/sweep.cjs [saga.json] [--width 1280,390] [--base http://localhost:4173/]
//
// It serves the built app (dist) with `vite preview` unless something already answers at --base.
// Reports go to scripts/qa/out/sweep-<width>.txt; it exits 1 if any page had a problem. Needs
// Playwright with Chromium (npm i -D playwright && npx playwright install chromium, if it is not
// installed already).
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

let chromium;
try {
  ({ chromium } = require('playwright'));
} catch {
  console.error('The sweep needs Playwright: npm i -D playwright && npx playwright install chromium');
  process.exit(2);
}

const app = path.resolve(__dirname, '../..');
const out = path.join(__dirname, 'out');
const args = process.argv.slice(2);
const opt = (name, dflt) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args.splice(i, 2)[1] : dflt;
};
const widths = opt('width', '1280,390').split(',').map(Number);
const base = opt('base', 'http://localhost:4173/');
const file = path.resolve(args[0] ?? path.join(out, 'saga.json'));
const bundle = JSON.parse(fs.readFileSync(file, 'utf8'));

const up = () => fetch(base).then(() => true, () => false);
async function serve() {
  if (await up()) return undefined;
  if (!fs.existsSync(path.join(app, 'dist'))) throw new Error('No build to serve: run npm run build first.');
  const port = new URL(base).port || '4173';
  const p = spawn(path.join(app, 'node_modules/.bin/vite'), ['preview', '--port', port, '--strictPort'], { cwd: app, stdio: 'ignore' });
  for (let i = 0; i < 60 && !(await up()); i++) await new Promise((r) => setTimeout(r, 500));
  return p;
}

async function sweep(width) {
  const report = [];
  const b = await chromium.launch();
  const page = await b.newPage({ viewport: { width, height: 900 } });
  let errors = [];
  page.on('pageerror', (e) => errors.push(`page error: ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && errors.push(`console error: ${m.text().slice(0, 200)}`));
  page.on('dialog', (d) => d.dismiss());
  await page.goto(base);
  await page.waitForSelector('text=Begin a new saga');
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.getByRole('button', { name: 'Import file…' }).click()]);
  await chooser.setFiles(file);
  await page.waitForURL(/\/saga\//);
  await page.waitForTimeout(800);
  const sid = page.url().split('?')[0].split('/saga/')[1];
  const visit = async (label, route) => {
    errors = [];
    await page.goto(`${base}#${route}`);
    await page.waitForTimeout(700);
    const wide = await page.evaluate(() => {
      const w = document.documentElement.clientWidth;
      const over = [...document.querySelectorAll('body *')]
        .filter((el) => el.getBoundingClientRect().right > w + 1 && el.getBoundingClientRect().width > 0 && getComputedStyle(el).position !== 'fixed')
        .filter((el) => !el.closest('.table-wrap, pre, .scroll-x, [style*="overflow"]'))
        .slice(0, 3)
        .map((el) => `${el.tagName.toLowerCase()}.${String(el.className || '').slice(0, 30)} "${(el.textContent || '').trim().slice(0, 40)}"`);
      return { scroll: document.documentElement.scrollWidth, w, over };
    });
    const text = await page.locator('main').innerText().catch(() => '');
    const bad = text.match(/.{0,40}(undefined|NaN|\[object Object\]).{0,40}/);
    const issues = [...errors];
    if (wide.scroll > wide.w + 1) issues.push(`wider than the screen (${wide.scroll} > ${wide.w}): ${wide.over.join(' | ')}`);
    if (bad) issues.push(`text shows "${bad[0].replace(/\n/g, ' ')}"`);
    report.push(`${issues.length ? 'XX' : 'ok'} ${label}${issues.map((x) => `\n   ${x}`).join('')}`);
  };
  const s = `/saga/${sid}`;
  await visit('saga', s);
  for (const t of ['', '?tab=covenant', '?tab=creatures']) await visit(`build${t}`, `${s}/build${t}`);
  await visit('table', `${s}/table`);
  await visit('seasons', `${s}/seasons`);
  await visit('market', `${s}/market`);
  for (const t of ['browse', 'design', 'guidelines']) await visit(`spells ${t}`, `${s}/spells?tab=${t}`);
  for (const t of ['items', 'longevity', 'vis', 'writing', 'tables']) await visit(`enchant ${t}`, `${s}/enchant?tab=${t}`);
  for (const t of ['saga', 'books', 'optional', 'rules', 'custom', 'mechanics']) await visit(`rules ${t}`, `${s}/rules?tab=${t}`);
  for (const cov of bundle.covenants)
    for (const t of ['overview', 'hooks', 'library', 'labs', 'folk', 'items', 'log']) await visit(`covenant ${cov.name} ${t}`, `${s}/covenant/${cov.id}?tab=${t}`);
  for (const c of bundle.characters)
    for (const t of ['overview', 'abilities', 'combat', 'advancement', 'lab', 'summary', 'rules', ...(c.type === 'magus' ? ['magic'] : [])])
      await visit(`${c.type} ${c.name} ${t}`, `${s}/character/${c.id}?tab=${t}`);
  for (const p of ['/', '/dice', '/reference', '/help', '/mechanics', '/mechanics/lab']) await visit(p, p);
  for (const t of ['vf', 'abilities', 'houses', 'labvf', 'hooks', 'weapons', 'books']) await visit(`reference ${t}`, `/reference?tab=${t}`);
  await b.close();
  return report;
}

(async () => {
  const server = await serve();
  let failed = 0;
  try {
    fs.mkdirSync(out, { recursive: true });
    for (const w of widths) {
      const report = await sweep(w);
      const bad = report.filter((l) => l.startsWith('XX'));
      failed += bad.length;
      fs.writeFileSync(path.join(out, `sweep-${w}.txt`), report.join('\n') + '\n');
      console.log(`${w}px: ${report.length} pages, ${bad.length} with problems${bad.length ? `:\n${bad.join('\n')}` : ''}`);
    }
  } finally {
    server?.kill();
  }
  process.exit(failed ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
