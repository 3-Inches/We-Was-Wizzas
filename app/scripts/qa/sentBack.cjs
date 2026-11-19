// A record the sheet keeps, changed where it is kept, and named when a character is sent back.
//
// 1. On the faerie practice saga: Dice › Faerie shows the faerie wizard's Sympathy Traits in one line;
//    its link opens the sheet's Sympathy Traits card; a trait set there shows on Dice › Faerie after.
// 2. On the faerie and the learned magician's practice sagas: the character is exported from the sheet,
//    a Sympathy Trait (or a charm) and a hedge or faerie Art are changed in the file, and the file is
//    imported again. The list of changes must name each, and must not call them "nothing the rules count".
//
// Usage: node scripts/qa/sentBack.cjs [width]
// The built app must be served first: npx vite preview --port 4173 --strictPort
// Output: scripts/qa/out/sentBack/*.png, and a line for each check. Clean is "problems: 0".
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const read = require('./idb.cjs');
const base = 'http://localhost:4173/';
const FIX = path.join(__dirname, 'fixtures');
const OUT = path.join(__dirname, 'out', 'sentBack');
fs.mkdirSync(OUT, { recursive: true });
const index = JSON.parse(fs.readFileSync(path.join(FIX, 'index.json'), 'utf8'));
const problems = [];
const check = (ok, what) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`);
  if (!ok) problems.push(what);
};

async function open(b, w, name) {
  const ctx = await b.newContext({ viewport: { width: w, height: 900 }, acceptDownloads: true });
  const page = await ctx.newPage();
  page.setDefaultTimeout(8000);
  page.on('pageerror', (e) => problems.push(`${name}: page error ${e.message.slice(0, 160)}`));
  page.on('dialog', (d) => d.accept());
  await page.goto(base);
  await importFile(page, path.join(FIX, `${name}.saga.json`));
  await page.locator('[data-tour="import-go"]').click();
  await page.waitForTimeout(1500);
  const sid = Object.keys((await read(page)).sagas)[0];
  return { ctx, page, sid };
}

async function importFile(page, file) {
  await page.goto(base);
  const [fc] = await Promise.all([page.waitForEvent('filechooser'), page.getByRole('button', { name: 'Import file…' }).click()]);
  await fc.setFiles(file);
  await page.waitForTimeout(1500);
}

/** Export the character from its sheet, change the file with `edit`, import it, and return the list of changes. */
async function sendBack(page, sid, id, edit, label, w) {
  await page.goto(`${base}#/saga/${sid}/character/${id}`);
  await page.waitForTimeout(1000);
  await page.locator('[data-tour="sheet-share"]').click();
  const [dl] = await Promise.all([page.waitForEvent('download'), page.locator('[data-tour="share-file"]').click()]);
  const file = path.join(OUT, `${label}.json`);
  await dl.saveAs(file);
  const bundle = JSON.parse(fs.readFileSync(file, 'utf8'));
  const c = bundle.characters.find((x) => x.id === id);
  edit(c);
  fs.writeFileSync(file, JSON.stringify(bundle));
  await importFile(page, file);
  const box = page.locator('[data-tour="import-changes"]');
  if (!(await box.count())) return '';
  await box.evaluate((el) => (el.open = true));
  await box.screenshot({ path: path.join(OUT, `${label}-changes-${w}.png`) });
  return box.innerText();
}

(async () => {
  const w = Number(process.argv[2]) || 390;
  const b = await chromium.launch();

  // 1. the faerie wizard: one line on Dice › Faerie, the card on the sheet
  {
    const { ctx, page, sid } = await open(b, w, 'faerie');
    const id = index.faerie.who.w;
    await page.goto(`${base}#/saga/${sid}/table?tab=dice&sub=faerie&who=${id}`);
    await page.waitForTimeout(1200);
    const line = page.locator('[data-tour="faerie-traits"]');
    check((await line.count()) === 1, 'Dice › Faerie shows the Sympathy Traits in one line');
    const before = await line.innerText();
    check(/Faerie Rank/.test(before), `the line gives the Faerie Rank: "${before}"`);
    check((await page.locator('main [data-tour="sympathy"]').count()) === 0, 'Dice › Faerie draws no Sympathy Traits card');
    check((await page.getByRole('button', { name: /\+ Sympathy Trait/ }).count()) === 0, 'Dice › Faerie offers no button to add a trait');
    await page.locator('main').screenshot({ path: path.join(OUT, `faerie-dice-${w}.png`) });
    await line.getByRole('link').click();
    await page.waitForTimeout(1200);
    check(/\/character\//.test(page.url()), `the link opens the sheet (${page.url().split('#')[1]})`);
    const card = page.locator('[data-tour="sympathy"]');
    check((await card.count()) === 1 && !(await card.evaluate((el) => el.classList.contains('folded'))), 'the sheet’s Sympathy Traits card is there, open');
    const inView = await card.evaluate((el) => { const r = el.getBoundingClientRect(); return r.top < window.innerHeight && r.bottom > 0; });
    check(inView, 'the page is scrolled to it');
    await card.screenshot({ path: path.join(OUT, `faerie-sheet-card-${w}.png`) });
    // raise the first trait by one on the sheet
    await card.locator('input').first().fill('Dusk');
    const plusBtn = card.getByRole('button', { name: 'increase' }).first();
    if (await plusBtn.count()) await plusBtn.click();
    await page.waitForTimeout(500);
    await page.goBack();
    await page.waitForTimeout(1200);
    const after = await page.locator('[data-tour="faerie-traits"]').innerText();
    check(/Dusk/.test(after), `back on Dice › Faerie, the line shows the trait changed on the sheet: "${after}"`);
    await ctx.close();
  }

  // 2. sent back: the faerie wizard with a trait and a faerie Power changed in the file
  {
    const { ctx, page, sid } = await open(b, w, 'faerie');
    const id = index.faerie.who.w;
    const text = await sendBack(page, sid, id, (c) => {
      c.sympathy[0].score += 1;
      c.sympathy.push({ uid: 'qa-iron', trait: 'Iron', score: -1 });
      const art = c.abilities.find((a) => ['weal', 'evocation'].includes(a.abilityId));
      art.xp.laterLife = (art.xp.laterLife ?? 0) + 15;
    }, 'faerie-sent', w);
    console.log(text.split('\n').map((l) => `      ${l}`).join('\n'));
    check(/Sympathy Trait: .*→/.test(text), 'the list names the changed Sympathy Trait');
    check(/Sympathy Trait: Iron/.test(text), 'the list names the new Sympathy Trait');
    check(/(Weal|Evocation) \d+ → \d+/.test(text), 'the list names the faerie Art (Power or Method)');
    check(!/nothing the rules count/.test(text), 'no "nothing the rules count"');
    await ctx.close();
  }

  // 3. sent back: the learned magician with a hedge Art and a charm changed in the file
  {
    const { ctx, page, sid } = await open(b, w, 'learned');
    const id = index.learned.who.w;
    const LEARNED = ['tueor', 'succurro', 'vulnero', 'fortunam', 'salutem', 'potentiam', 'naturam', 'intellegentiam'];
    let artName = '';
    const text = await sendBack(page, sid, id, (c) => {
      const art = c.abilities.find((a) => LEARNED.includes(a.abilityId));
      artName = art.abilityId;
      art.xp.laterLife = (art.xp.laterLife ?? 0) + 15;
      c.learned = c.learned ?? {};
      c.learned.charms = [...(c.learned.charms ?? []), { uid: 'qa-charm', name: 'QA Ward', tf: 'TuSa', level: 5, range: 'Touch', duration: 'Sun', target: 'Individual', source: 'play' }];
    }, 'learned-sent', w);
    console.log(text.split('\n').map((l) => `      ${l}`).join('\n'));
    check(new RegExp(`${artName} \\d+ → \\d+`, 'i').test(text), `the list names the hedge Art (${artName})`);
    check(/Charm: QA Ward/.test(text), 'the list names the charm');
    check(!/nothing the rules count/.test(text), 'no "nothing the rules count"');
    await ctx.close();
  }

  await b.close();
  console.log(`problems: ${problems.length}${problems.length ? `\n  ${problems.join('\n  ')}` : ''}`);
  process.exit(problems.length ? 1 : 0);
})();
