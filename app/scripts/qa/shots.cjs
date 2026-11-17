// Open each fixture saga's special characters on their Dice page with every card unfolded, and save a
// screenshot and the page's text; then their season in full on the Seasons page, where a hedge
// tradition's season cards are. For looking at the hedge magic, Faerie and Mysteries pages as a player
// sees them.
//
// Usage: node scripts/qa/shots.cjs [width] [fixture]   e.g.  node scripts/qa/shots.cjs 390 witch
// The built app must be served first: npx vite preview --port 4173 --strictPort
// Output: scripts/qa/out/shots/<fixture>-<who>-<width>.png and .txt, and <fixture>-<who>-seasons-<width>.png and .txt
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const read = require('./idb.cjs');
const base = 'http://localhost:4173/';
const FIX = path.join(__dirname, 'fixtures');
const OUT = path.join(__dirname, 'out', 'shots');
fs.mkdirSync(OUT, { recursive: true });
const index = JSON.parse(fs.readFileSync(path.join(FIX, 'index.json'), 'utf8'));
(async () => {
  const w = Number(process.argv[2]) || 1280;
  const only = process.argv[3];
  const b = await chromium.launch();
  let failed = 0;
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
    const unfold = async (within) => {
      for (let i = 0; i < 3; i++) {
        const x = page.locator(`${within} .fold-toggle[aria-expanded="false"]`);
        const n = await x.count();
        for (let j = 0; j < n; j++) await x.nth(0).click({ timeout: 1000 }).catch(() => {});
      }
      await page.waitForTimeout(300);
    };
    for (const [k, id] of Object.entries(fx.who)) {
      await page.goto(`${base}#/saga/${sid}/table?tab=dice&sub=${fx.dice}&who=${id}`);
      await page.waitForTimeout(1200);
      await unfold('main');
      await page.locator('main').screenshot({ path: path.join(OUT, `${name}-${k}-${w}.png`) });
      fs.writeFileSync(path.join(OUT, `${name}-${k}-${w}.txt`), await page.locator('main').innerText());
      // their season in full: the seasons of their own magic, as the Seasons page offers them
      await page.goto(`${base}#/saga/${sid}/table?tab=seasons&who=${id}&to=table-plan`);
      await page.waitForTimeout(1500);
      const plan = '[data-tour="table-plan"]';
      await unfold(plan);
      await page.locator(plan).screenshot({ path: path.join(OUT, `${name}-${k}-seasons-${w}.png`) });
      fs.writeFileSync(path.join(OUT, `${name}-${k}-seasons-${w}.txt`), await page.locator(plan).innerText());
    }
    console.log(`${name} (${fx.what}): ${errs.length ? 'ERRORS ' + errs[0] : 'no page errors'}`);
    failed += errs.length;
    await ctx.close();
  }
  await b.close();
  process.exit(failed ? 1 : 0);
})();
