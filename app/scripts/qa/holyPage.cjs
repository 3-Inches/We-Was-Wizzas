// Open Game Table › Dice › Faith & miracles as the divine tutorial's practice character, every card
// unfolded, and save the page's text and a screenshot. For comparing the page before and after a change
// that should change nothing a reader sees: run it on the old build, then on the new one, with the same
// profile, and compare the two .txt files.
//
// Usage: node scripts/qa/holyPage.cjs [width] [profile] [label]   e.g.  node scripts/qa/holyPage.cjs 390 /tmp/holy-profile before
// The built app must be served first: npx vite preview --port 4173 --strictPort
// The profile is a browser profile kept between runs, so both builds see the same saga and character.
// The first run in a new profile makes them: it starts the divine tutorial, which makes a saga, a
// practice covenant and a practice holy companion, then leaves it.
// Output: scripts/qa/out/holy-<label>-<width>.txt and .png
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const read = require('./idb.cjs');
const B = 'http://localhost:4173/';
const OUT = path.join(__dirname, 'out');
fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const width = Number(process.argv[2]) || 390;
  const profile = process.argv[3] || path.join(OUT, 'holy-profile');
  const label = process.argv[4] || 'page';
  const ctx = await chromium.launchPersistentContext(profile, { viewport: { width, height: 900 } });
  const page = ctx.pages()[0] ?? (await ctx.newPage());
  page.setDefaultTimeout(8000);
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message.slice(0, 200)));
  page.on('dialog', (d) => d.accept());
  await page.goto(B);
  await page.waitForTimeout(1200);
  const practice = (st) => Object.values(st?.characters ?? {}).find((c) => /practice/i.test(c.notes ?? '') && c.virtues?.some((v) => v.defId === 'invocation'));
  let st = await read(page);
  if (!practice(st)) {
    await page.goto(`${B}#/help`);
    await page.waitForTimeout(1000);
    const row = page.locator('.list-row', { hasText: 'Faith, miracles and holy powers' }).first();
    await row.getByRole('button', { name: /^(Start|Restart)$/ }).click();
    await page.waitForTimeout(1500);
    const panel = page.locator('.tour-panel');
    for (const sel of await panel.locator('select').all()) {
      const opts = await sel.locator('option').allInnerTexts();
      const make = opts.find((o) => /＋ Make/.test(o));
      if (make) await sel.selectOption({ label: make });
      await page.waitForTimeout(2500);
    }
    st = await read(page);
  }
  const c = practice(st);
  if (!c) throw new Error('no practice holy character was made');
  await page.goto(`${B}#/saga/${c.sagaId}/table?tab=dice&sub=holy&who=${c.id}`);
  await page.waitForTimeout(1500);
  // leave the tutorial, if one is open, so its panel is not in the picture
  const end = page.locator('.tour-panel').getByRole('button', { name: /^(End|Close|Stop)/ });
  if (await end.count()) await end.first().click().catch(() => {});
  for (let i = 0; i < 3; i++) {
    const x = page.locator('main .fold-toggle[aria-expanded="false"]');
    const n = await x.count();
    for (let j = 0; j < n; j++) await x.nth(0).click({ timeout: 1000 }).catch(() => {});
  }
  await page.waitForTimeout(400);
  const text = await page.locator('main').innerText();
  fs.writeFileSync(path.join(OUT, `holy-${label}-${width}.txt`), text);
  await page.locator('main').screenshot({ path: path.join(OUT, `holy-${label}-${width}.png`) });
  console.log(`${c.name} on Faith & miracles at ${width}: ${text.split('\n').length} lines; ${errs.length ? 'ERRORS ' + errs.join(' | ') : 'no page errors'}`);
  await ctx.close();
})();
