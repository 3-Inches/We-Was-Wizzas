// A season in full as each kind of character first sees it (roadmap 5.4): open Game Table › Seasons for
// them in a fresh browser, so every card starts as it would on a first visit (folded on a phone), list the
// cards in order with the line of what is left out, and save a screenshot of the season in full.
// The kinds: a magus, a companion and a grog of each practice saga, each practice saga's special
// characters (the hedge traditions, the faerie wizard, the Mystery cultists), and from a saga file
// (the owner's, by default) one of each kind it has, the holy and a Mystery cultist among them.
//
// Usage: node scripts/qa/seasonOrder.cjs [width] [saga.json | --no-saga] [--only fixture|saga]
// The built app must be served first: npx vite preview --port 4173 --strictPort
// Output: the order, on the console; scripts/qa/out/seasonOrder/<saga>-<who>-<width>.png
// Clean: "problems: 0" (a problem is a season whose first card is not the character's own work while
// they have some, own work after the planning, a page wider than the screen, or a page error).
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const base = 'http://localhost:4173/';
const FIX = path.join(__dirname, 'fixtures');
const OUT = path.join(__dirname, 'out', 'seasonOrder');
fs.mkdirSync(OUT, { recursive: true });
const args = process.argv.slice(2);
const width = Number(args.find((a) => /^\d+$/.test(a))) || 390;
const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : undefined;
const sagaArg = args.find((a) => a.endsWith('.json'));
const sagaFile = args.includes('--no-saga') ? undefined : path.resolve(sagaArg ?? path.join(__dirname, 'out', 'saga.json'));
const index = JSON.parse(fs.readFileSync(path.join(FIX, 'index.json'), 'utf8'));

// the titles of a character's own season work (seasonCards' first group)
const OWN = /^(A season in the kitchen|Make an amulet|A season of charms|A season of Refining|A gruagach's season|A vitki's season|Seasons of holy work|Seasons of devotion|A mason's season|Livelihood: |Lab projects|Original research|Longevity Ritual|Apprentice)/;
const HOLY = ['adjuration', 'blessing', 'cursing', 'wonders', 'intervention', 'transcendence', 'understanding', 'craft-amulets', 'kabbalah', 'merkavah', 'gematria'];
// as the season's picker has them (canPlay): a peregrinator among them
const live = (c) => c.creation?.finalized && !c.wounds?.dead;
const holds = (c, ids) => c.virtues?.some((v) => ids.includes(v.defId));

/** The people to look at in a saga: the practice saga's own, then one of each kind. */
function chosen(file, practice) {
  const s = JSON.parse(fs.readFileSync(file, 'utf8'));
  const chars = (s.characters ?? []).filter(live);
  const out = [];
  const add = (kind, c) => c && !out.some((x) => x.c.id === c.id) && out.push({ kind, c });
  // the first of a kind not already chosen
  const first = (kind, test) => add(kind, chars.find((c) => test(c) && !out.some((x) => x.c.id === c.id)));
  // one still being made is not in the season's picker
  if (practice) for (const [k, id] of Object.entries(practice.who)) add(`${practice.what} (${k})`, chars.find((c) => c.id === id));
  first('magus', (c) => c.type === 'magus');
  first('companion', (c) => c.type === 'companion' && !c.virtues.some((v) => /gift|witch|gruagach|vitki|nightwalker|faerie|elementalist/.test(v.defId)));
  first('grog', (c) => c.type === 'grog');
  first('holy', (c) => c.abilities?.some((a) => HOLY.includes(a.abilityId)) || holds(c, ['true-faith']));
  if (!practice) {
    first('Mystery cultist', (c) => ['bjornaer', 'criamon', 'merinita', 'verditius'].includes(c.house) || c.abilities?.some((a) => a.abilityId === 'mystery-cult-lore'));
    first('faerie wizard', (c) => holds(c, ['faerie-sympathy', 'evocation', 'enchantment', 'empathy']));
    first('hedge', (c) => holds(c, ['folk-witch', 'gruagach', 'vitki', 'nightwalker', 'mathematicus-of-bologna', 'witch-healing', 'elemental-magic']));
  }
  return out;
}

(async () => {
  const sagas = [];
  for (const [name, fx] of Object.entries(index)) if (!only || only === name) sagas.push({ name, file: path.join(FIX, `${name}.saga.json`), practice: fx });
  if (sagaFile && (!only || only === 'saga') && fs.existsSync(sagaFile)) sagas.push({ name: 'saga', file: sagaFile });
  const b = await chromium.launch();
  let problems = 0;
  for (const sg of sagas) {
    for (const { kind, c } of chosen(sg.file, sg.practice)) {
      // a fresh browser for each: no card remembers being opened
      const ctx = await b.newContext({ viewport: { width, height: 900 } });
      const page = await ctx.newPage();
      page.setDefaultTimeout(15000);
      const errs = [];
      page.on('pageerror', (e) => errs.push(e.message.slice(0, 200)));
      page.on('dialog', (d) => d.accept());
      await page.goto(base);
      const [fc] = await Promise.all([page.waitForEvent('filechooser'), page.getByRole('button', { name: 'Import file…' }).click()]);
      await fc.setFiles(sg.file);
      await page.locator('[data-tour="import-go"]').click();
      await page.waitForURL(/\/saga\//);
      const sid = page.url().split('?')[0].split('/saga/')[1];
      await page.goto(`${base}#/saga/${sid}/table?tab=seasons&who=${c.id}&to=table-plan`);
      await page.waitForTimeout(1500);
      const plan = page.locator('[data-tour="table-plan"]');
      const seen = await plan.evaluate((el) => ({
        cards: [...el.querySelectorAll(':scope .card')].filter((x) => x !== el).map((x) => `${x.querySelector(':scope > .card-head h3')?.textContent ?? '?'}${x.classList.contains('folded') ? '' : ' (open)'}`),
        hidden: el.querySelector('[data-tour="season-hidden"] summary')?.textContent ?? '',
        hiddenList: [...el.querySelectorAll('[data-tour="season-hidden"] li')].map((x) => x.textContent),
        wide: document.documentElement.scrollWidth > window.innerWidth + 1,
      }));
      const titles = seen.cards.map((t) => t.replace(/ \(open\)$/, ''));
      const firstOther = titles.findIndex((t) => !OWN.test(t));
      const late = titles.slice(firstOther < 0 ? titles.length : firstOther).filter((t) => OWN.test(t));
      const own = titles.filter((t) => OWN.test(t));
      const bad = [...(own.length && !OWN.test(titles[0]) ? ['own work is not first'] : []), ...(late.length ? [`own work after the planning: ${late.join(', ')}`] : []), ...(seen.wide ? ['wider than the screen'] : []), ...errs];
      problems += bad.length;
      const file = `${sg.name.replace(/\.saga\.json$/, '')}-${(c.name || c.id).replace(/[^A-Za-z0-9]+/g, '_')}-${width}.png`;
      await plan.screenshot({ path: path.join(OUT, file) });
      console.log(`\n${sg.name}: ${c.name || 'Unnamed'}, ${kind} (${c.type})`);
      seen.cards.forEach((t, i) => console.log(`  ${i + 1}. ${t}`));
      if (seen.hidden) console.log(`  ${seen.hidden}: ${seen.hiddenList.join(' | ')}`);
      for (const p of bad) console.log(`  PROBLEM: ${p}`);
      console.log(`  screenshot: ${path.relative(process.cwd(), path.join(OUT, file))}`);
      await ctx.close();
    }
  }
  await b.close();
  console.log(`\nproblems: ${problems}`);
  process.exit(problems ? 1 : 0);
})();
