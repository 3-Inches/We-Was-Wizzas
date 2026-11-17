// Open every book on the reader's shelves and check that it loads: it has a table of contents and
// a page, and raises no error. Run it after the books change (see
// tools/books/README.md). Also saves a picture of the Books tab and of one book from each shelf.
//
// Usage: node scripts/qa/books.cjs [width]   e.g.  node scripts/qa/books.cjs 390
// The built app must be served first: npx vite preview --port 4173 --strictPort
// Output: scripts/qa/out/books/*.png. Clean is "<n> books opened, none failed".
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const base = 'http://localhost:4173/';
const OUT = path.join(__dirname, 'out', 'books');
fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const w = Number(process.argv[2]) || 1280;
  const b = await chromium.launch();
  const page = await (await b.newContext({ viewport: { width: w, height: 900 } })).newPage();
  page.setDefaultTimeout(15000);
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message.slice(0, 200)));

  await page.goto(`${base}#/reference?tab=books`);
  await page.waitForSelector('main .card');
  await page.locator('main').screenshot({ path: path.join(OUT, `shelves-${w}.png`) });
  const wide = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (wide > 1) errs.push(`the Books tab is ${wide}px wider than the screen`);

  await page.goto(`${base}#/reference/book/DE`);
  await page.waitForSelector('.reader-layout');
  const shelves = await page.$$eval('.reader .topbar select optgroup', (gs) => gs.map((g) => ({ label: g.label, books: [...g.querySelectorAll('option')].map((o) => ({ id: o.value, title: o.textContent })) })));
  const failed = [];
  let opened = 0;
  for (const shelf of shelves) {
    for (const [i, book] of shelf.books.entries()) {
      const before = errs.length;
      await page.goto(`${base}#/reference/book/${encodeURIComponent(book.id)}`);
      let problem = '';
      try {
        await page.waitForSelector('.reader-layout');
        // a book may open on a bare title, so it is judged by its contents list, not its first page
        const toc = await page.locator('.reader-toc .toc-item').count();
        if (toc < 3) problem = `a table of contents of ${toc}`;
        else if (!(await page.locator('.book-body').count())) problem = 'no page shown';
      } catch (e) {
        problem = `did not load: ${(await page.locator('main').innerText()).slice(0, 80)}`;
      }
      if (errs.length > before) problem = problem || errs[errs.length - 1];
      if (problem) failed.push(`${book.id} (${book.title}): ${problem}`);
      opened++;
      if (i === 0) {
        const name = shelf.label.toLowerCase().replace(/[^a-z]+/g, '-');
        await page.screenshot({ path: path.join(OUT, `${name}-${w}.png`) });
        const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        if (over > 1) failed.push(`${book.id}: the reader is ${over}px wider than the screen`);
      }
    }
    console.log(`${shelf.label}: ${shelf.books.length} books`);
  }
  for (const f of failed) console.log('FAILED ' + f);
  for (const e of errs) console.log('ERROR ' + e);
  console.log(`${opened} books opened, ${failed.length ? failed.length + ' failed' : 'none failed'}`);
  await b.close();
  process.exit(failed.length || errs.length ? 1 : 0);
})();
