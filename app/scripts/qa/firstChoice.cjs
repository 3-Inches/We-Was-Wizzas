// Does a card open on something this character can do? For each fixture saga's characters, open their
// Dice page and their season in full on the Seasons page, unfold each card as a player would, and list
// any card that then shows a disabled button or a warning (the card checklist in the design principles:
// "It does not open on a warning or a disabled button").
//
// Usage: node scripts/qa/firstChoice.cjs [width] [fixture] [--shots]   e.g.  node scripts/qa/firstChoice.cjs 390 witch --shots
// With --shots, each card is saved as it first opens: scripts/qa/out/first/<fixture>-<who>-<page>-<card>-<width>.png
// The built app must be served first: npx vite preview --port 4173 --strictPort
// It also checks what is offered (audit 3, A2): only a magus is offered the Hermetic Arts, or study from
// raw vis, on the Seasons page; a magus is still offered them.
// Clean is "0 cards open on a disabled button or a warning" and "Arts offered: as they should be". A card may list a reason it is right as it is
// (the season already spent, say): those are listed as "allowed".
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const read = require('./idb.cjs');
const base = 'http://localhost:4173/';
const FIX = path.join(__dirname, 'fixtures');
const index = JSON.parse(fs.readFileSync(path.join(FIX, 'index.json'), 'utf8'));

// what a card may say on opening and still be right: a fact about the saga, not a choice made for the player
const ALLOWED = [
  /already spent/i, // the season is logged: nothing more can be done in it
  /Tick the Sympathy Traits that fit first/, // which traits fit a faerie rite only the player can say (audit 2, C5)
  /Personality Flaw|no longer controls/, // an Elemental Trait's weight on the character: a fact about them, not a choice refused
];

(async () => {
  const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const shots = process.argv.includes('--shots');
  const w = Number(args[0]) || 390;
  const only = args[1];
  const OUT = path.join(__dirname, 'out', 'first');
  if (shots) fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch();
  let bad = 0;
  let errors = 0;
  let offered = 0;
  for (const [name, fx] of Object.entries(index)) {
    if (only && only !== name) continue;
    const ctx = await b.newContext({ viewport: { width: w, height: 900 } });
    const page = await ctx.newPage();
    page.setDefaultTimeout(8000);
    const errs = [];
    page.on('pageerror', (e) => errs.push(e.message.slice(0, 200)));
    page.on('dialog', (d) => d.accept());
    await page.goto(base);
    const [fc] = await Promise.all([page.waitForEvent('filechooser'), page.getByRole('button', { name: 'Import file…' }).click()]);
    await fc.setFiles(path.join(FIX, `${name}.saga.json`));
    await page.waitForTimeout(1500);
    await page.locator('[data-tour="import-go"]').click();
    await page.waitForTimeout(1500);
    const sid = Object.keys((await read(page)).sagas)[0];
    const types = Object.fromEntries(JSON.parse(fs.readFileSync(path.join(FIX, `${name}.saga.json`), 'utf8')).characters.map((c) => [c.id, c.type]));
    // each card, unfolded one at a time from folded, as a player opens it
    const check = async (where, label) => {
      const cards = page.locator(`${where} section.card`);
      const n = await cards.count();
      const out = [];
      for (let i = 0; i < n; i++) {
        const card = cards.nth(i);
        if (!(await card.isVisible())) continue;
        const toggle = card.locator(':scope > .card-head > .fold-toggle[aria-expanded="false"]');
        if (await toggle.count()) await toggle.click({ timeout: 1000 }).catch(() => {});
        await page.waitForTimeout(150);
        const title = ((await card.locator(':scope > .card-head').first().innerText().catch(() => '')) || '(untitled)').replace(/\s*[▸▾] (Show|Fold)\s*$/, '').trim();
        // only what is the card's own, not a card inside it; a stepper at its limit is not a choice refused
        const found = await card.evaluate((el) => {
          const own = (x) => x.closest('section.card') === el;
          const seen = (x) => !!(x.offsetWidth || x.offsetHeight || x.getClientRects().length);
          const disabled = [...el.querySelectorAll('button:disabled')].filter((x) => own(x) && seen(x) && !x.classList.contains('fold-toggle') && !/^[−+]$/.test(x.innerText.trim())).map((x) => `disabled “${x.innerText.trim().slice(0, 60)}”${x.title ? ` (${x.title.slice(0, 80)})` : ''}`);
          const warn = [...el.querySelectorAll('.warn-text')].filter((x) => own(x) && seen(x)).map((x) => `warning “${x.innerText.trim().slice(0, 120)}”`);
          return [...disabled, ...warn];
        });
        if (found.length) out.push({ title, found });
        if (shots) await card.screenshot({ path: path.join(OUT, `${name}-${label.replace(/\s+/g, '-')}-${title.replace(/[^A-Za-z]+/g, '-').slice(0, 40)}-${w}.png`) }).catch(() => {});
      }
      for (const { title, found } of out) {
        const allowed = found.every((f) => ALLOWED.some((r) => r.test(f)));
        if (!allowed) bad++;
        console.log(`  ${allowed ? 'allowed' : 'PROBLEM'}  ${label} › ${title}: ${found.join('; ')}`);
      }
    };
    console.log(`${name} (${fx.what})`);
    for (const [k, id] of Object.entries(fx.who)) {
      await page.goto(`${base}#/saga/${sid}/table?tab=dice&sub=${fx.dice}&who=${id}`);
      await page.waitForTimeout(1200);
      await check('main', `${k} Dice`);
      await page.goto(`${base}#/saga/${sid}/table?tab=seasons&who=${id}&to=table-plan`);
      await page.waitForTimeout(1500);
      await check('[data-tour="table-plan"]', `${k} Seasons`);
      // only a magus is offered an Art to learn, or raw vis to study (Hedge Magic, line 433)
      const plan = page.locator('[data-tour="table-plan"]');
      const arts = await plan.locator('optgroup[label="Arts"]').count();
      const vis = await plan.locator('option', { hasText: 'Study raw vis' }).count();
      const magus = types[id] === 'magus';
      if (magus !== (arts > 0 && vis > 0)) {
        offered++;
        console.log(`  PROBLEM  ${k} Seasons: a ${types[id]} is offered ${arts} lists of Arts and ${vis} of study from vis`);
      }
    }
    if (errs.length) console.log(`  ERRORS ${errs[0]}`);
    errors += errs.length;
    await ctx.close();
  }
  await b.close();
  console.log(`${bad} cards open on a disabled button or a warning; Arts offered: ${offered ? `${offered} wrong` : 'as they should be'}; page errors: ${errors || 'none'}`);
  process.exit(bad || offered || errors ? 1 : 0);
})();
