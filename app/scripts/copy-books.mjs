// Copies the markdown books from the repository into public/books so the in-app reader can load
// them on demand (they are not bundled into the JS): the Fifth Edition books, the earlier editions'
// books and the third-party books. Which of them the reader lists is decided in
// src/data/constants.ts (BOOKS and REFERENCE_BOOKS). A translation of a book already here is left out.
import { cpSync, mkdirSync, readdirSync, existsSync, rmSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, '..', '..');
const out = join(here, '..', 'public', 'books');
rmSync(out, { recursive: true, force: true }); // so that a book that moved or left does not linger
mkdirSync(out, { recursive: true });
const manifest = [];
for (const dir of ['reviewed', 'wip', '3rd-party']) {
  const src = join(repo, dir);
  if (!existsSync(src)) continue;
  for (const f of readdirSync(src)) {
    if (!f.endsWith('.md') || /\(ES\)\.md$/.test(f)) continue;
    cpSync(join(src, f), join(out, f));
    manifest.push({ file: f, status: dir });
  }
}
writeFileSync(join(out, 'manifest.json'), JSON.stringify(manifest, null, 1));
console.log(`copied ${manifest.length} books to public/books`);
