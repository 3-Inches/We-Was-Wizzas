"""Magic Qualities and Inferiorities (Realms of Power: Magic, Chapter Four: Magic Characters).

Each entry is a bold "**Name:**" paragraph under one of the four headings (Major and Minor Magic
Qualities, Major and Minor Magic Inferiorities); its text runs to the next entry or heading.

Writes app/src/data/generated/magicQualities.json:
  [{"id", "name", "kind": "quality" | "inferiority", "size": "Major" | "Minor", "text", "source"}]
"""
import os
import re

from books import BOOKS, ROOT
from common import github_anchor, slug, write_json

SECTIONS = {
    'major magic qualities': ('quality', 'Major'),
    'minor magic qualities': ('quality', 'Minor'),
    'major magic inferiorities': ('inferiority', 'Major'),
    'minor magic inferiorities': ('inferiority', 'Minor'),
}


def main():
    entry = next(b for b in BOOKS if b[0] == 'RoP_M')
    lines = open(os.path.join(ROOT, entry[1]), encoding='utf-8').read().split('\n')
    out = []
    section = None
    cur = None

    def close():
        if cur:
            cur['text'] = re.sub(r'\n{3,}', '\n\n', '\n'.join(cur.pop('lines')).strip())
            out.append(cur)

    for i, line in enumerate(lines):
        h = re.match(r'^(#{1,6})\s+(.*?)\s*$', line)
        if h:
            close()
            cur = None
            section = SECTIONS.get(h.group(2).strip().lower())
            continue
        if not section:
            continue
        m = re.match(r'^\*\*(.+?):\*\*\s*(.*)$', line)
        if m:
            close()
            name = m.group(1).strip()
            kind, size = section
            cur = {
                'id': slug(name) + ('' if kind == 'quality' else '-inferiority'),
                'name': name, 'kind': kind, 'size': size,
                'source': {'book': 'RoP_M', 'line': i + 1, 'anchor': github_anchor(name)},
                'lines': [m.group(2)],
            }
        elif cur is not None:
            cur['lines'].append(line)
    close()
    write_json('magicQualities.json', out)


if __name__ == '__main__':
    main()
