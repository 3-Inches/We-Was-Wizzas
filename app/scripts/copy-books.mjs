// Copies the 5th Edition markdown books from the repository into public/books so the
// in-app rules reader can load them on demand (they are not bundled into the JS).
import { cpSync, mkdirSync, readdirSync, existsSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, '..', '..');
const out = join(here, '..', 'public', 'books');
mkdirSync(out, { recursive: true });
const manifest = [];
for (const dir of ['reviewed', 'wip']) {
  const src = join(repo, dir);
  if (!existsSync(src)) continue;
  for (const f of readdirSync(src)) {
    if (!f.endsWith('.md')) continue;
    if (!/Ars Magica (5e|- Definitive)/.test(f)) continue;
    cpSync(join(src, f), join(out, f));
    manifest.push({ file: f, status: dir });
  }
}
writeFileSync(join(out, 'manifest.json'), JSON.stringify(manifest, null, 1));
console.log(`copied ${manifest.length} books to public/books`);
