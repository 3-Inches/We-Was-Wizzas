// Visits every page and tab of a saga in a browser and reports what goes wrong: page errors, console
// errors, a page wider than the screen, and "undefined", "NaN" or "[object Object]" in the text.
//
//   npm run build && npm run qa:saga && npm run qa:sweep
//   node scripts/qa/sweep.cjs [saga.json] [--width 1280,390] [--base http://localhost:4173/] [--no-fixtures | --only-fixtures]
//
// One run sweeps the saga (the owner's, from npm run qa:saga) and then each practice saga in
// scripts/qa/fixtures, whose hedge wizards, faerie wizards and Mystery cultists fill the pages the
// owner's saga holds few of.
//
// What it visits is read from the app, not listed here, so a page or tab added later is swept:
// - every tab a page shows is pressed, and every tab that then appears under it (crawl);
// - the Dice page's parts come from DICE_SUBS in src/ui/routes.ts, the hidden ones too;
// - the Game Table pages a character takes a turn on are those whose page reads ?who=.
// A character's turn and sheet are visited for each character it chooses (see `chosen`).
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
const FIX = path.join(__dirname, 'fixtures');
const args = process.argv.slice(2);
const opt = (name, dflt) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args.splice(i, 2)[1] : dflt;
};
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? (args.splice(i, 1), true) : false;
};
const widths = opt('width', '1280,390').split(',').map(Number);
const base = opt('base', 'http://localhost:4173/');
const noFixtures = flag('no-fixtures');
const onlyFixtures = flag('only-fixtures');
const file = path.resolve(args[0] ?? path.join(out, 'saga.json'));

// ---- read from the app's code
const src = (f) => fs.readFileSync(path.join(app, 'src/ui', f), 'utf8');
const listOf = (text, name) => {
  const m = text.match(new RegExp(`${name} = \\[([^\\]]*)\\]`));
  if (!m) throw new Error(`The sweep could not find ${name} in the app's code.`);
  return [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
};
const ROUTES = src('routes.ts');
const DICE_SUBS = listOf(ROUTES, 'DICE_SUBS');
const TABLE_TABS = listOf(ROUTES, 'TABLE_TABS');
// a Game Table page is part of a character's turn when it reads ?who=
const TABLE = src('pages/GameTablePage.tsx');
const TURN_TABS = TABLE_TABS.filter((t) => {
  const comp = TABLE.match(new RegExp(`tab === '${t}' && <(\\w+)`))?.[1];
  const file = comp && TABLE.match(new RegExp(`const ${comp} = lazy\\(\\(\\) => import\\('\\./(\\w+)'\\)\\)`))?.[1];
  if (!file) throw new Error(`The sweep could not find the Game Table's ${t} page.`);
  return /get\('who'\)/.test(src(`pages/${file}.tsx`));
});

const up = () => fetch(base).then(() => true, () => false);
async function serve() {
  if (await up()) return undefined;
  if (!fs.existsSync(path.join(app, 'dist'))) throw new Error('No build to serve: run npm run build first.');
  const port = new URL(base).port || '4173';
  const p = spawn(path.join(app, 'node_modules/.bin/vite'), ['preview', '--port', port, '--strictPort'], { cwd: app, stdio: 'ignore' });
  for (let i = 0; i < 60 && !(await up()); i++) await new Promise((r) => setTimeout(r, 500));
  return p;
}

/**
 * Sweeps one saga at one width. `practice` is a practice saga: only what differs from saga to saga
 * (the Game Table, and the chosen characters' turns and sheets), not the pages every saga shares.
 */
async function sweepSaga(b, width, sagaFile, practice) {
  const bundle = JSON.parse(fs.readFileSync(sagaFile, 'utf8'));
  const report = [];
  const ctx = await b.newContext({ viewport: { width, height: 900 } });
  const page = await ctx.newPage();
  let errors = [];
  page.on('pageerror', (e) => errors.push(`page error: ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && errors.push(`console error: ${m.text().slice(0, 200)}`));
  page.on('dialog', (d) => d.dismiss());
  await page.goto(base);
  await page.waitForSelector('text=Begin a new saga');
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.getByRole('button', { name: 'Import file…' }).click()]);
  await chooser.setFiles(sagaFile);
  // the Import page shows what the file holds; the saga comes in when that is confirmed
  await page.locator('[data-tour="import-go"]').click();
  await page.waitForURL(/\/saga\//);
  await page.waitForTimeout(800);
  const sid = page.url().split('?')[0].split('/saga/')[1];
  const s = `/saga/${sid}`;

  // what has been checked: the address, the tab open in each row of tabs, and the wizard's step
  const seen = new Set();
  const where = () =>
    page.evaluate(() => `${location.hash}|${[...document.querySelectorAll('[role=tablist] [aria-selected=true], .wizard-steps .current')].map((t) => t.getAttribute('data-tour')).join(',')}`);
  const settle = async (ms) => {
    await page.waitForTimeout(ms);
    // a page loaded on demand shows "Loading…" first
    await page.waitForFunction(() => !/^\s*Loading…\s*$/m.test(document.querySelector('main')?.innerText ?? ''), null, { timeout: 5000 }).catch(() => {});
  };
  const check = async (label) => {
    const key = await where();
    if (seen.has(key)) return;
    seen.add(key);
    const wide = await page.evaluate(() => {
      const w = document.documentElement.clientWidth;
      const scroll = document.documentElement.scrollWidth;
      if (scroll <= w + 1) return { scroll, w, over: [] };
      const over = [...document.querySelectorAll('body *')]
        .filter((el) => el.getBoundingClientRect().right > w + 1 && el.getBoundingClientRect().width > 0 && getComputedStyle(el).position !== 'fixed')
        .filter((el) => !el.closest('.table-wrap, pre, .scroll-x, [style*="overflow"]'))
        // the innermost: the element that is too wide, not every box that holds it
        .filter((el, _, all) => !all.some((o) => o !== el && el.contains(o)))
        .slice(0, 3)
        .map((el) => `${el.tagName.toLowerCase()}.${String(el.className || '').slice(0, 30)} "${(el.textContent || '').trim().slice(0, 40)}"`);
      return { scroll, w, over };
    });
    const text = await page.locator('main').innerText().catch(() => '');
    const bad = text.match(/.{0,40}(undefined|NaN|\[object Object\]).{0,40}/);
    const issues = [...errors];
    errors = [];
    if (wide.scroll > wide.w + 1) issues.push(`wider than the screen (${wide.scroll} > ${wide.w}): ${wide.over.join(' | ')}`);
    if (bad) issues.push(`text shows "${bad[0].replace(/\n/g, ' ')}"`);
    report.push(`${issues.length ? 'XX' : 'ok'} ${label}${issues.map((x) => `\n   ${x}`).join('')}`);
  };
  const visit = async (label, route) => {
    errors = [];
    await page.goto(`${base}#${route}`);
    await settle(600);
    await check(label);
  };
  // press every tab in the row of tabs at `level` (0 is the page's own), and every row that opens under it
  const pressTabs = async (label, level) => {
    const row = page.locator('[role=tablist]').nth(level);
    if (!(await row.count())) return;
    const ids = await row.locator('[role=tab]').evaluateAll((ts) => ts.map((t) => (t.getAttribute('data-tour') ?? '').replace(/^tab-/, '')));
    for (const id of ids) {
      const tab = page.locator('[role=tablist]').nth(level).locator(`[data-tour="tab-${id}"]`);
      if (!(await tab.count())) continue;
      if ((await tab.getAttribute('aria-selected')) !== 'true') {
        errors = [];
        await tab.click();
        await settle(350);
        await check(`${label} › ${id}`);
      }
      await pressTabs(`${label} › ${id}`, level + 1);
    }
  };
  // a page and all its tabs; `from` skips the rows above it (a turn keeps to its own page)
  const crawl = async (label, route, from = 0) => {
    await visit(label, route);
    await pressTabs(label, from);
  };

  // ---- the Game Table, and each part of Dice, the hidden ones too
  await crawl('table', `${s}/table`);
  for (const t of DICE_SUBS) await visit(`table › dice › ${t}`, `${s}/table?tab=dice&sub=${t}`);

  // ---- whose turn the sweep visits
  // who each part of Dice is for, as its own picker lists them
  const ids = new Set(bundle.characters.map((c) => c.id));
  const pickerFor = async (sub) => {
    await page.goto(`${base}#${s}/table?tab=dice&sub=${sub}`);
    await settle(400);
    return page.evaluate((ids) => {
      const pick = [...document.querySelectorAll('main select')]
        .map((el) => ({ value: el.value, all: [...el.options].map((o) => o.value).filter((v) => ids.includes(v)) }))
        .sort((a, b) => b.all.length - a.all.length)[0];
      return pick ?? { value: '', all: [] };
    }, [...ids]);
  };
  const special = {};
  for (const sub of ['faerie', 'hedge', 'mysteries']) special[sub] = (await pickerFor(sub)).all;
  // the Faith page opens on the first holy character (or the first, when nobody is holy)
  special['Faith page'] = [(await pickerFor('holy')).value].filter(Boolean);
  const living = new Set(bundle.covenants.filter((c) => c.living).map((c) => c.id));
  const playing = bundle.characters.filter((c) => c.creation?.finalized && !c.wounds?.dead);
  const chosen = new Map();
  const choose = (c, why) => c && !chosen.has(c.id) && chosen.set(c.id, { c, why });
  const byId = (id) => playing.find((c) => c.id === id);
  // everyone the Faerie, Hedge magic and Mysteries pages are for: those pages differ by tradition
  for (const [sub, list] of Object.entries(special)) for (const id of list) choose(byId(id), sub);
  // the troupe's own people (not the living covenants'), on the owner's saga
  if (!practice) for (const c of playing.filter((c) => !living.has(c.covenantId))) choose(c, 'troupe');
  // and one of each kind left: magus, companion, grog
  for (const t of [...new Set(playing.map((c) => c.type))]) if (![...chosen.values()].some((x) => x.c.type === t)) choose(playing.find((c) => c.type === t), t);
  report.push(`-- turns and sheets for ${chosen.size} of ${bundle.characters.length}: ${[...chosen.values()].map((x) => `${x.c.name} (${x.c.type}, ${x.why})`).join(', ')}`);

  // ---- each chosen character's turn at the table: every part of the pages that read ?who=
  for (const { c } of chosen.values()) for (const t of TURN_TABS) await crawl(`turn ${c.name} › ${t}`, `${s}/table?tab=${t}&who=${c.id}`, 1);

  // ---- sheets: every character's on the owner's saga, the chosen ones' on a practice saga; and
  // each one still in creation: every step of the wizard, and the guided build
  const wizard = async (label, id) => {
    await visit(`${label} create`, `${s}/character/${id}/create`);
    const steps = await page.locator('.wizard-steps button').evaluateAll((bs) => bs.map((x) => x.getAttribute('data-tour')));
    for (const st of steps) {
      await page.locator(`.wizard-steps [data-tour="${st}"]`).click();
      await settle(350);
      await check(`${label} create › ${st.replace(/^step-/, '')}`);
    }
    await crawl(`${label} guided`, `${s}/character/${id}/guided`);
  };
  const sheets = practice ? [...chosen.values()].map((x) => x.c) : bundle.characters.filter((c) => c.creation?.finalized);
  for (const c of sheets) await crawl(`${c.type} ${c.name}`, `${s}/character/${c.id}`);
  for (const c of bundle.characters.filter((c) => !c.creation?.finalized)) await wizard(`${c.type} ${c.name}`, c.id);
  for (const cov of bundle.covenants) await crawl(`covenant ${cov.name}`, `${s}/covenant/${cov.id}`);

  if (!practice) {
    await crawl('saga', s);
    await crawl('build', `${s}/build`);
    await visit('people', `${s}/people`);
    await visit('covenants', `${s}/covenants`);
    // the old pages lead to where they are now
    for (const t of ['seasons', 'market', 'rules?tab=books']) await visit(`old ${t}`, `${s}/${t}`);
    await crawl('tribunal', `${s}/tribunal`);
    await crawl('spells', `${s}/spells`);
    await crawl('enchant', `${s}/enchant`);
    for (const p of ['/', '/dice']) await visit(p, p);
    // Game Mechanics: each area its index links to, and each topic each area links to
    const links = (re) => page.evaluate((re) => [...new Set([...document.querySelectorAll('main a[href]')].map((a) => a.getAttribute('href').replace(/^#/, '').split('#')[0].split('?')[0]).filter((h) => new RegExp(re).test(h)))], re);
    await visit('/mechanics', '/mechanics');
    for (const area of await links('^/mechanics/[^/?]+$')) {
      await visit(area, area);
      for (const topic of await links(`^${area}/[^/?]+$`)) await visit(topic, topic);
    }
    await crawl('/reference', '/reference');
    await crawl('/help', '/help');
    // last, since it adds to the saga: a new character of each kind the People page offers, through the wizard
    const card = page.locator('[data-tour="people-create"]');
    const openCard = async () => {
      await page.goto(`${base}#${s}/people`);
      await settle(400);
      if (await card.locator('.fold-toggle[aria-expanded=false]').count()) await card.locator('.fold-toggle').click();
    };
    await openCard();
    const kinds = await card.locator('[data-tour^="create-"]').evaluateAll((bs) => bs.map((x) => x.getAttribute('data-tour').replace(/^create-/, '')));
    if (!kinds.length) report.push('XX people: the sweep found no kind of character to create');
    for (const k of kinds) {
      await openCard();
      await card.locator(`[data-tour="create-${k}"]`).click();
      await page.waitForURL(/\/character\/[^/]+\/create/);
      await wizard(`new ${k}`, page.url().match(/\/character\/([^/?]+)\/create/)[1]);
    }
  }
  await ctx.close();
  return report;
}

(async () => {
  const server = await serve();
  let failed = 0;
  const sagas = [];
  if (!onlyFixtures) sagas.push({ name: path.basename(file), file, practice: false });
  if (!noFixtures)
    for (const f of fs.readdirSync(FIX).filter((x) => x.endsWith('.saga.json')).sort()) sagas.push({ name: f, file: path.join(FIX, f), practice: true });
  try {
    fs.mkdirSync(out, { recursive: true });
    for (const w of widths) {
      const b = await chromium.launch();
      const lines = [];
      const counts = [];
      const t0 = Date.now();
      for (const sg of sagas) {
        const report = await sweepSaga(b, w, sg.file, sg.practice);
        const pages = report.filter((l) => !l.startsWith('--'));
        const bad = pages.filter((l) => l.startsWith('XX'));
        failed += bad.length;
        counts.push(`${sg.name} ${pages.length} pages, ${bad.length} with problems`);
        lines.push(`== ${sg.name}: ${pages.length} pages, ${bad.length} with problems`, ...report);
        console.log(`${w}px ${sg.name}: ${pages.length} pages, ${bad.length} with problems${bad.length ? `:\n${bad.join('\n')}` : ''}`);
      }
      await b.close();
      const total = lines.filter((l) => /^(ok|XX) /.test(l));
      const summary = `${w}px: ${total.length} pages, ${total.filter((l) => l.startsWith('XX')).length} with problems, in ${Math.round((Date.now() - t0) / 60000)} minutes (${counts.join('; ')})`;
      fs.writeFileSync(path.join(out, `sweep-${w}.txt`), `${summary}\n${lines.join('\n')}\n`);
      console.log(summary);
    }
  } finally {
    server?.kill();
  }
  process.exit(failed ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
