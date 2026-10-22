import { describe, expect, it } from 'vitest';
import { marked } from 'marked';
import { dropEmptyHeads, tidyTables } from './tables';

const html = (md: string) => dropEmptyHeads(marked.parse(tidyTables(md), { async: false, gfm: true }) as string);

describe('book tables', () => {
  it('draws a table whose first line is the dashes', () => {
    const out = html('Shapes:\n\n|------|------|\n| Aloe | +3 friendship |\n| Copper | +3 bloodshed |');
    expect(out).toContain('<td>Aloe</td>');
    expect(out).toContain('<td>+3 bloodshed</td>');
    expect(out).not.toContain('<thead>');
  });

  it('keeps the cells of rows wider than the header', () => {
    const out = html('| Change | Requires | Notes |\n|---|---|---|\n| serf to freeman | 5 Gratitude | a | extra |');
    expect(out).toContain('<td>extra</td>');
  });

  it('draws rows that carry on a table without its header', () => {
    const out = html('> | Gallop | 30 | 40 |\n> | Trot | 12 | 15 |');
    expect(out).toContain('<td>Gallop</td>');
    expect(out).toContain('<blockquote>');
  });

  it('leaves out an empty header row and keeps a real one', () => {
    expect(html('|  |  |\n| --- | --- |\n| 6+ | A shop |')).not.toContain('<thead>');
    expect(html('| Gait | Walk |\n|:--:|:-:|\n| Horse | 7 |')).toContain('<th align="center">Gait</th>');
  });

  it('leaves text without tables alone', () => {
    const md = '## Heading\n\nSome text | with a pipe.\n\n- a list';
    expect(tidyTables(md)).toBe(md);
  });
});
