// Follow the Game Mechanics topics' "In the app" pointers (src/data/appPlaces.ts) and check each lands.
// For each topic it opens the topic's page, reads the pointers, and follows each one that is a link: the
// page it lands on must have no error, and must show the place the pointer names (the words after its
// last → or ›, up to a bracket or colon, or its first phrase). A Game Table page opens on the first
// character, so a place shown only for a magus (or a pious one…) is looked for with each of the troupe's
// characters picked in turn. A pointer with no link (a sheet's tab or card) is listed, to be checked by eye.
//
// Usage: node scripts/qa/pointers.cjs [width] [saga.json] [topic …]
//   e.g. node scripts/qa/pointers.cjs 390 scripts/qa/fixtures/learned.saga.json other-hazards holy-traditions
// With no topics, every topic with a pointer. The built app must be served: npx vite preview --port 4173 --strictPort
// Writes scripts/qa/out/pointers-<width>.txt. Clean is "problems: 0". On the owner's saga it is "problems: 1": Trade, money and
// wealth's "Stories and investments" is on a craftsman's workshop card, and that troupe has no craftsman.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const B = 'http://localhost:4173/';
const OUT = path.join(__dirname, 'out');
fs.mkdirSync(OUT, { recursive: true });
const width = Number(process.argv[2]) || 1280;
const sagaFile = process.argv[3] || path.join(__dirname, 'fixtures', 'learned.saga.json');
const only = process.argv.slice(4);
const index = JSON.parse(fs.readFileSync(path.join(__dirname, '../../src/data/generated/mechanics/index.json'), 'utf8'));
// topic id -> area id
const areaOf = {};
for (const a of index.areas) for (const g of [...(a.groups ?? []), ...(a.gated ?? [])]) areaOf[g.id] = a.id;
const places = fs.readFileSync(path.join(__dirname, '../../src/data/appPlaces.ts'), 'utf8');
const withPointer = [...places.matchAll(/^\s+'?([a-z0-9-]+)'?: \[/gm)].map((m) => m[1]).filter((id) => areaOf[id]);
const topics = only.length ? only : withPointer;
// the place a pointer names: the words after its last arrow, up to a bracket, colon or semicolon
const focus = (t) => {
  const f = (t.split(/ → | › /).pop() || '').split(/[(:;]/)[0].trim();
  // a character's season in full is titled "Name: Spring in full"
  return /^a season in full$/i.test(f) ? 'in full' : f;
};
(async () => {
  const b = await chromium.launch();
  const page = await b.newPage({ viewport: { width, height: 900 } });
  page.setDefaultTimeout(8000);
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message.slice(0, 160)));
  page.on('dialog', (d) => d.accept());
  await page.goto(B);
  const [fc] = await Promise.all([page.waitForEvent('filechooser'), page.getByRole('button', { name: 'Import file…' }).click()]);
  await fc.setFiles(sagaFile);
  await page.waitForTimeout(1500);
  await page.locator('[data-tour="import-go"]').click();
  await page.waitForTimeout(1500);
  // the troupe's finished characters, to pick on a Game Table page
  const st = await require('./idb.cjs')(page);
  const own = Object.values(st.characters).filter((c) => !c.living && c.creation?.finalized);
  const players = own.map((c) => c.id);
  const names = Object.fromEntries(own.map((c) => [c.id, c.name || 'Unnamed']));
  const out = [];
  let problems = 0;
  for (const id of topics) {
    if (!areaOf[id]) { out.push(`${id}: NOT A TOPIC`); problems++; continue; }
    await page.goto(`${B}#/mechanics/${areaOf[id]}/${id}`);
    await page.waitForTimeout(900);
    const para = page.locator('p', { hasText: 'In the app:' }).first();
    if (!(await para.count())) { out.push(`${id}: NO POINTER SHOWN`); problems++; continue; }
    const links = await para.locator('a').evaluateAll((as) => as.map((a) => ({ text: a.textContent, href: a.getAttribute('href') })));
    const text = await para.innerText();
    out.push(`${id}: ${text.replace(/^In the app:\s*/, '')}`);
    for (const l of links) {
      const want = focus(l.text);
      // a pointer with no arrow names the page itself; else the place on it, or its first phrase
      const words = !/ → | › /.test(l.text) ? [] : [want, want.split(',')[0].trim()];
      // a Game Table page opens on the first character: what is for a magus, or a pious one, shows once they are picked
      const tries = [l.href, ...(/table\?tab=/.test(l.href) && words.length ? players.map((c) => `${l.href}&who=${c}`) : [])];
      let found = false;
      let main = '';
      let landed = l.href;
      errs.length = 0;
      for (const href of tries) {
        await page.goto(B + href.replace(/^\/?/, ''));
        await page.waitForTimeout(1300);
        // unfold the cards, so a card's title is found whether it starts folded or not
        const toggles = page.locator('main .fold-toggle[aria-expanded="false"]');
        for (let i = await toggles.count(); i > 0; i--) await toggles.nth(0).click({ timeout: 800 }).catch(() => {});
        main = await page.locator('main').innerText();
        landed = href;
        found = !words.length || words.some((w) => main.toLowerCase().includes(w.toLowerCase()));
        if (found || errs.length) break;
      }
      const bad = errs.length || /No such|undefined|NaN/.test(main) || !found;
      if (bad) problems++;
      const who = landed !== l.href ? ` (with ${names[landed.split('who=')[1]]})` : '';
      out.push(`  ${bad ? 'PROBLEM' : 'ok'} → ${l.href.replace(/[0-9a-f]{12}/g, 'ID')}: ${words.length ? `"${want}" ${found ? 'found' + who : 'NOT FOUND'}` : 'the page'}${errs.length ? ' ERRORS ' + errs.join(' | ') : ''}`);
    }
  }
  out.push(`problems: ${problems}`);
  fs.writeFileSync(path.join(OUT, `pointers-${width}.txt`), out.join('\n'));
  console.log(out.join('\n'));
  await b.close();
})();
