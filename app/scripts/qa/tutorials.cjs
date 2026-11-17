// Usage: node scripts/qa/tutorials.cjs [width]   (the built app must be served: npx vite preview --port 4173 --strictPort)
// Writes scripts/qa/out/tutorials-<width>.txt. A clean run ends with "errors: none", and two steps
// report "no target": the toolkit's Welcome, and the power tutorial's "Design the power" (its card shows only once the
// character has a power, and the practice draft has none). A tutorial it skips is not looked at.
// Take every tutorial in turn from a fresh browser, as a player would: press what the steps ask,
// use practice options where something is missing, skip the magus and grog. Note for each step whether its
// control was found and in view, whether the menu opened for it, where the page was scrolled, and whether a
// step that asks for a button went on by itself.
const { chromium } = require('playwright');
const fs = require('fs');
const OUT = require('path').join(__dirname, 'out');
fs.mkdirSync(OUT, { recursive: true });
const width = Number(process.argv[2] || 390);
const skip = (process.env.SKIP || 'Make a magus,Make a grog').split(',');
const report = [];
const say = (...a) => report.push(a.join(' '));
(async () => {
  const b = await chromium.launch();
  const page = await b.newPage({ viewport: { width, height: 844 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push('CONSOLE ' + m.text().slice(0, 160)));
  page.on('dialog', (d) => d.accept());
  const B = 'http://localhost:4173/';
  await page.goto(`${B}#/help`);
  await page.waitForTimeout(1200);
  // start from far down the Guide, as a player scrolling to the tutorials would
  await page.evaluate(() => window.scrollTo(0, 2500));
  await page.getByRole('button', { name: 'Take every tutorial in turn' }).click();
  const panel = page.locator('.tour-panel');
  let lastKey = '';
  for (let n = 0; n < 220; n++) {
    await page.waitForTimeout(1400);
    if (!(await panel.count())) { say('(panel gone)'); break; }
    const name = (await panel.locator('.tour-name').innerText().catch(() => '')).replace(/ · $/, '').trim();
    const count = (await panel.locator('.tour-count').innerText()).replace(/^.*· /, '').trim();
    const title = (await panel.locator('h4').innerText()).trim();
    const key = `${name}|${count}`;
    if (key === lastKey) { say(`  STUCK at ${key}`); break; }
    lastKey = key;
    // the first step of a tutorial: skip, or choose what to work on (a practice one when nothing suits),
    // before looking for the step's control, which may be on what is chosen
    if (count.startsWith('1 of') && skip.includes(name)) {
      await panel.getByRole('button', { name: /Skip this one/ }).click();
      say(`${name} ${count} ${title}: (skipped)`);
      continue;
    }
    for (const sel of await panel.locator('select').all()) {
      const v = await sel.inputValue();
      const opts = await sel.locator('option').allInnerTexts();
      if (!v && opts.some((o) => /＋ Make/.test(o))) {
        const pick = opts.find((o) => !/^—|＋/.test(o)) ?? opts.find((o) => /＋ Make/.test(o));
        await sel.selectOption({ label: pick });
        say(`  chose: ${pick}`);
        await page.waitForTimeout(1500);
      }
    }
    const url = page.url().replace(/^.*#/, '').replace(/[0-9a-f]{12}/g, 'ID');
    const info = await page.evaluate(() => {
      const el = document.querySelector('[data-tour-on]');
      const sb = document.querySelector('.sidebar');
      const open = !!sb && sb.getBoundingClientRect().right > 1;
      if (!el) return { on: '', open, y: Math.round(window.scrollY) };
      const r = el.getBoundingClientRect();
      const top = document.querySelector('.tour-panel')?.getBoundingClientRect().top ?? innerHeight;
      return { on: el.getAttribute('data-tour'), open, y: Math.round(window.scrollY), inView: r.bottom > 0 && r.top < top, topAt: Math.round(r.top), inMenu: !!el.closest('.sidebar') };
    });
    const warn = (await panel.locator('.warn-text').allInnerTexts()).join(' ');
    const take = await panel.getByRole('button', { name: 'Take me there' }).count();
    say(`${name} ${count} ${title}: ${info.on ? `→ ${info.on}${info.inView ? '' : ' (OUT OF VIEW)'} top ${info.topAt}${info.inMenu ? (info.open ? ' [menu open]' : ' [MENU CLOSED]') : ''}` : `no target, scrollY ${info.y}`}${warn ? ` WARN ${warn}` : ''}${take ? ' (not on its page)' : ''} @ ${url}`);
    // a step that asks for a button: press it and see whether the tutorial goes on by itself
    const press = async (locator, what) => {
      const before = (await panel.locator('.tour-count').innerText()).trim();
      await locator.click();
      await page.waitForTimeout(1500);
      const after = (await panel.locator('.tour-count').innerText().catch(() => '')).trim();
      say(`  pressed ${what}: ${after !== before ? 'went on by itself' : 'DID NOT GO ON'}`);
      return after !== before;
    };
    if (title === 'Sagas') {
      await page.locator('[data-tour="new-saga"] input').fill('Course saga');
      if (await press(page.getByRole('button', { name: 'Begin a new saga' }), 'Begin a new saga')) continue;
    }
    if (/^Found it$|^Create the /.test(title) && info.on) { if (await press(page.locator('[data-tour-on]').first(), title)) continue; }
    if (title === 'Start it' && info.on) { if (await press(page.getByRole('button', { name: /Start the guided build/ }), 'Start the guided build')) continue; }
    if (title === 'End the season' && info.on) { if (await press(page.locator('[data-tour-on]').first(), 'End')) continue; }
    // the City & Guild tutorial's hands-on steps: press what each asks, in the control it points at
    const HANDS = { 'Assistants': /\+ Assistant/, 'Work a season': /^Work a season/, 'Move a season on': /^End /, 'Read the market': /^Read the market/, 'Hiring': /^Look for a craftsman|^Look again/, 'Haggling': /^Appraise/, 'Damaged goods': /^Roll the check/, 'Call it': /Entreat|Call the effect/, 'Send it': /Share/ };
    if (/^For players/.test(name) && title === 'Create your character' && info.on) { if (await press(page.locator('[data-tour="people-create"]').getByRole('button', { name: /^Companion/ }).first(), 'Companion')) continue; }
    if (HANDS[title] && info.on) {
      const on = page.locator('[data-tour-on]').first();
      // the step may point at the button itself
      const self = HANDS[title].test(((await on.innerText().catch(() => '')) || '').trim()) && (await on.evaluate((e) => e.tagName === 'BUTTON').catch(() => false));
      const btn = self ? on : on.getByRole('button', { name: HANDS[title] }).first();
      if (await btn.count()) { await btn.scrollIntoViewIfNeeded().catch(() => {}); if (await press(btn, title)) continue; }
      else say('  NO BUTTON for', title);
    }
    if (title === 'The Tribunal page' && info.on === 'tribunal-switch') { if (await press(page.getByRole('button', { name: /Set the saga’s Tribunal to Rhine/ }), 'Set the saga’s Tribunal to Rhine')) continue; }
    if (title === 'Bringing the covenants in') {
      const add = page.locator('[data-tour="tribunal-covenants"]').getByRole('button', { name: /^Add$/ }).first();
      if (await add.count()) { if (await press(add, 'Add (one covenant)')) { await page.waitForTimeout(4000); continue; } }
    }
    // Concept in the companion tutorial: build the whole character, then finalize it at the Review step
    const build = panel.getByRole('button', { name: 'Build the whole character for me' });
    if (name === 'Make a companion' && title === 'Concept' && (await build.count())) {
      await build.click();
      await page.waitForTimeout(2500);
      say('  built the whole character');
      continue;
    }
    if (title === 'Review and finalize') {
      const fin = page.getByRole('button', { name: /Finalize character/ });
      if (await fin.count()) { await fin.first().click(); await page.waitForTimeout(1200); say('  finalized'); }
    }
    const next = panel.getByRole('button', { name: /^Next ›$/ });
    const nextTut = panel.getByRole('button', { name: /^Next tutorial ›$/ });
    if (await next.count()) await next.click();
    else if (await nextTut.count()) { await nextTut.click(); say(''); }
    else { const fin = panel.getByRole('button', { name: /Finish/ }); if (await fin.count()) await fin.click(); say('(finished)'); break; }
  }
  // the companion the tutorial built: Personality Flaws, Reputations, descriptions and specialties
  say('\nerrors:', errors.join(' ; ') || 'none');
  fs.writeFileSync(require('path').join(OUT, `tutorials-${width}.txt`), report.join('\n'));
  await b.close();
})().catch((e) => { report.push('FAILED ' + e.message); fs.writeFileSync(require('path').join(OUT, `tutorials-${width}.txt`), report.join('\n')); process.exit(1); });
