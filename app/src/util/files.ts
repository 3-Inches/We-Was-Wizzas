import LZString from 'lz-string';
import type { ExportBundle } from '../store/store';

export function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function pickJsonFile(): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = async () => {
      const f = input.files?.[0];
      if (!f) return reject(new Error('No file'));
      try {
        resolve(JSON.parse(await f.text()));
      } catch (e) {
        reject(e);
      }
    };
    input.click();
  });
}

export function isBundle(x: unknown): x is ExportBundle {
  return !!x && typeof x === 'object' && (x as ExportBundle).format === 'arm5-toolkit';
}

export function bundleToShareLink(b: ExportBundle): string {
  const packed = LZString.compressToEncodedURIComponent(JSON.stringify(b));
  const base = window.location.href.split('#')[0];
  return `${base}#/import?d=${packed}`;
}

export function shareLinkToBundle(packed: string): ExportBundle | null {
  try {
    const json = LZString.decompressFromEncodedURIComponent(packed);
    if (!json) return null;
    const b = JSON.parse(json);
    return isBundle(b) ? b : null;
  } catch {
    return null;
  }
}

export function safeFilename(name: string): string {
  return (name || 'untitled').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '_') || 'untitled';
}
