// The books' tables, made whole before they are drawn. The converted books have a few kinds of
// table that a markdown renderer shows badly: a table whose first line is the dashes (no header
// row), rows with more cells than the header (the extra cells would be dropped), and rows that
// carry on a table without its header (after a cut or a page break).

const QUOTE = /^(\s*>\s?)?/;
const isRow = (l: string) => l.replace(QUOTE, '').trim().startsWith('|');
const isDelimiter = (l: string) => /^\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?$/.test(l.replace(QUOTE, '').trim());
const prefixOf = (l: string) => QUOTE.exec(l)?.[0] ?? '';

/** The cells of a table row, without its outer pipes. */
function cellsOf(l: string): string[] {
  const body = l.replace(QUOTE, '').trim().replace(/^\|/, '').replace(/\|$/, '');
  return body.split(/(?<!\\)\|/);
}

const emptyRow = (prefix: string, n: number) => `${prefix}|${' |'.repeat(n)}`;
const dashes = (prefix: string, n: number) => `${prefix}|${' --- |'.repeat(n)}`;

/** Every table in `text` with a header row, a dash row and as many header cells as its widest row. */
export function tidyTables(text: string): string {
  const lines = text.split('\n');
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    if (!isRow(lines[i])) {
      out.push(lines[i]);
      i++;
      continue;
    }
    let j = i;
    while (j < lines.length && isRow(lines[j])) j++;
    const block = lines.slice(i, j);
    const prefix = prefixOf(block[0]);
    const hasHeader = block.length >= 2 && !isDelimiter(block[0]) && isDelimiter(block[1]);
    // the header (made empty when there is none) and the rows, without the dash rows
    const head = hasHeader ? cellsOf(block[0]) : [];
    const rows = (hasHeader ? block.slice(2) : block).filter((l) => !isDelimiter(l)).map(cellsOf);
    const width = Math.max(head.length, ...rows.map((r) => r.length), 1);
    const pad = (cells: string[], fill: string) => [...cells, ...Array(Math.max(0, width - cells.length)).fill(fill)].join('|');
    // the book's own dash row is kept, for its alignment
    if (hasHeader) out.push(`${prefix}|${pad(head, ' ')}|`, `${prefix}|${pad(cellsOf(block[1]), ' --- ')}|`);
    else out.push(emptyRow(prefix, width), dashes(prefix, width));
    for (const r of rows) out.push(`${prefix}|${r.join('|')}|`);
    i = j;
  }
  return out.join('\n');
}

/** A table head with nothing in it (a table that has no header row) is left out of the page. */
export function dropEmptyHeads(html: string): string {
  return html.replace(/<thead>\s*<tr>(?:\s*<th[^>]*>\s*<\/th>)+\s*<\/tr>\s*<\/thead>/g, '');
}
