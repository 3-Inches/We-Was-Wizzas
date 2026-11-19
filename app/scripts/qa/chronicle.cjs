// Is each kind of season told in the Chronicle as what it did? For each fixture saga's characters, open
// their season in full on the Seasons page, work one season on each card that spends one (its button ends
// "(a season)", or "Work a season"), end the season, and print what the Chronicle's people section says
// of the character (audit 3, B2; owner point 9: "a new kind of season's work gets its own sentence").
//
// Usage: node scripts/qa/chronicle.cjs [width] [fixture] [saga.json]   e.g.  node scripts/qa/chronicle.cjs 390 witch
// A saga file given as the third argument is imported in place of the fixture (its characters are all visited).
// The built app must be served first: npx vite preview --port 4173 --strictPort
// Clean is "stock phrases: 0" and "page errors: none". A card whose button is disabled as it opens is listed
// as "not worked", with the reason beside the button; firstChoice.cjs checks that separately.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const read = require('./idb.cjs');
const base = 'http://localhost:4173/';
const FIX = path.join(__dirname, 'fixtures');
const index = JSON.parse(fs.readFileSync(path.join(FIX, 'index.json'), 'utf8'));
const SEASON_BUTTON = /\(a season\)$|^Work a season$/;
// the Chronicle's stock phrases for a season with no phrase of its own (chronicle.ts, DID.exposure and DID.other)
const STOCK = /went about the season’s ordinary work|saw to the daily round of duties|was kept busy with the business of the covenant|went about business of their own|saw to affairs of their own/;

(async () => {
  const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const w = Number(args[0]) || 390;
  const only = args[1];
  const file = args[2];
  const b = await chromium.launch();
  let stock = 0;
  let errors = 0;
  const runs = file ? [[only || 'saga', { what: file, who: null }]] : Object.entries(index).filter(([n]) => !only || n === only);
  for (const [name, fx] of runs) {
    const ctx = await b.newContext({ viewport: { width: w, height: 900 } });
    const page = await ctx.newPage();
    page.setDefaultTimeout(8000);
    const errs = [];
    page.on('pageerror', (e) => errs.push(e.message.slice(0, 200)));
    page.on('dialog', (d) => d.accept());
    await page.goto(base);
    const src = file ?? path.join(FIX, `${name}.saga.json`);
    const [fc] = await Promise.all([page.waitForEvent('filechooser'), page.getByRole('button', { name: 'Import file…' }).click()]);
    await fc.setFiles(src);
    await page.waitForTimeout(1500);
    await page.locator('[data-tour="import-go"]').click();
    await page.waitForTimeout(1500);
    const sid = Object.keys((await read(page)).sagas)[0];
    const chars = JSON.parse(fs.readFileSync(src, 'utf8')).characters;
    const who = fx.who ?? Object.fromEntries(chars.filter((c) => c.type !== 'grog' && (!process.env.QA_WHO || process.env.QA_WHO.split(",").includes(c.name))).map((c) => [c.name, c.id]));
    console.log(`${name} (${fx.what})`);
    for (const [k, id] of Object.entries(who)) {
      const cname = chars.find((c) => c.id === id)?.name ?? k;
      const open = async () => {
        await page.goto(`${base}#/saga/${sid}/table?tab=seasons&who=${id}&to=table-plan`);
        await page.waitForTimeout(1500);
        return page.locator('[data-tour="table-plan"] section.card');
      };
      // the cards with a season's button, by title, as the page lists them
      let cards = await open();
      const titles = [];
      for (let i = 0; i < (await cards.count()); i++) {
        const card = cards.nth(i);
        const toggle = card.locator(':scope > .card-head > .fold-toggle[aria-expanded="false"]');
        if (await toggle.count()) await toggle.click({ timeout: 1000 }).catch(() => {});
        const has = await card.locator('button').filter({ hasText: SEASON_BUTTON }).count() + (await card.locator('button').filter({ hasText: /^Begin inventing$/ }).count());
        if (has) titles.push(((await card.locator(':scope > .card-head').first().innerText().catch(() => '')) || '').replace(/\s*[▸▾] (Show|Fold)\s*$/, '').split('\n')[0].trim());
      }
      // the card's own choice of work ("Work", "This season"), if it has one: each is a kind of season
      const workSelect = (card) => card.locator('label.field', { has: page.locator(':scope > span', { hasText: /^(Work|This season)$/ }) }).locator('select').first();
      const jobs = [];
      for (const title of [...new Set(titles)]) {
        cards = await open();
        const card = cards.filter({ has: page.locator(':scope > .card-head', { hasText: title }) }).first();
        const toggle = card.locator(':scope > .card-head > .fold-toggle[aria-expanded="false"]');
        if (await toggle.count()) await toggle.click({ timeout: 1000 }).catch(() => {});
        const sel = workSelect(card);
        const opts = (await sel.count()) ? await sel.locator('option').evaluateAll((os) => os.filter((o) => !o.disabled).map((o) => [o.value, o.textContent.trim()])) : [[undefined, '']];
        for (const [value, label] of opts) jobs.push({ title, value, label });
      }
      for (const { title, value, label } of jobs) {
        const name = label ? `${title} (${label})` : title;
        cards = await open();
        const card = cards.filter({ has: page.locator(':scope > .card-head', { hasText: title }) }).first();
        const toggle = card.locator(':scope > .card-head > .fold-toggle[aria-expanded="false"]');
        if (await toggle.count()) await toggle.click({ timeout: 1000 }).catch(() => {});
        await page.waitForTimeout(200);
        if (value !== undefined) await workSelect(card).selectOption(value);
        // a name the toolkit cannot know: a curse's target, an amulet's bearer
        for (const input of await card.locator('input[placeholder="whom"], input[placeholder="its bearer"]').all()) await input.fill('the reeve of Altdorf');
        // a charm designed first, to invent or to be taught (the card's own designer, as it opens)
        const first = card.locator('button').filter({ hasText: /^(Begin inventing|Add to the lessons)$/ }).first();
        if ((await first.count()) && (await first.isEnabled())) await first.click();
        await page.waitForTimeout(200);
        const btn = card.locator('button').filter({ hasText: SEASON_BUTTON }).first();
        if (!(await btn.count()) || (await btn.isDisabled())) {
          const why = (await card.locator('span.small.muted').first().innerText().catch(() => '')).trim();
          console.log(`  not worked  ${cname} › ${name}: ${why || 'its button is disabled'}`);
          continue;
        }
        await btn.click();
        await page.waitForTimeout(400);
        await page.locator('[data-tour="table-advance"]').click();
        await page.waitForTimeout(1500);
        await page.goto(`${base}#/saga/${sid}/table?tab=chronicle`);
        await page.waitForTimeout(1200);
        const people = await page.locator('article.chronicle-entry').first().locator('section', { has: page.locator('h4', { hasText: 'At the covenant' }) }).innerText().catch(() => '');
        const sentence = people.split(/(?<=\.)\s+/).find((s) => s.includes(cname)) ?? '(not in the Chronicle)';
        const said = sentence.split(/, while /).find((s) => s.includes(cname)) ?? sentence;
        const isStock = STOCK.test(said);
        if (isStock) stock++;
        console.log(`  ${isStock ? 'STOCK' : 'told '}  ${cname} › ${name}: ${said.replace(/^At the covenant\s*/, '').trim()}`);
      }
    }
    if (errs.length) console.log(`  ERRORS ${errs[0]}`);
    errors += errs.length;
    await ctx.close();
  }
  await b.close();
  console.log(`stock phrases: ${stock}; page errors: ${errors || 'none'}`);
  process.exit(stock || errors ? 1 : 0);
})();
