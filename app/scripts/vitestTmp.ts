// Vitest's global setup, for both configs: it clears what earlier runs left in the temp folder.
//
// With the forks pool, Vitest copies each transformed module into a folder of the temp folder named
// by a random id (`/tmp/<id>/ssr`, `/tmp/<id>/client`), and it does not always remove it: a full run
// leaves about 100 MB. In a long session the disk fills, and Chromium then fails with "Page crashed",
// which looks like a fault in the page. A folder is taken only when it holds nothing but those, and
// none of it has changed for ten minutes, so a run going on at the same time keeps its own.
import { readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const KINDS = new Set(['ssr', 'client', '__vitest__']);
const STALE_MS = 10 * 60_000;

export function clearStale(root = tmpdir(), now = Date.now()): string[] {
  const gone: string[] = [];
  let names: string[];
  try {
    names = readdirSync(root);
  } catch {
    return gone;
  }
  for (const name of names) {
    if (!/^[\w-]{21}$/.test(name)) continue;
    const dir = join(root, name);
    try {
      const kids = readdirSync(dir, { withFileTypes: true });
      if (!kids.length || !kids.every((k) => k.isDirectory() && KINDS.has(k.name))) continue;
      const times = [dir, ...kids.map((k) => join(dir, k.name))].map((p) => statSync(p).mtimeMs);
      if (now - Math.max(...times) < STALE_MS) continue;
      rmSync(dir, { recursive: true, force: true });
      gone.push(dir);
    } catch {
      // gone already, or not ours to read
    }
  }
  return gone;
}

export default function setup() {
  clearStale();
  return () => void clearStale();
}
