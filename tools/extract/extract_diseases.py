"""Extract the diseases with game statistics (Art & Academe, Dies Irae): their stage, humor, Severity,
Stable and Improvement Ease Factors, interval, cause and symptoms.

A disease is written as its name (a bold line or a heading), then
"Major Phlegmatic Disease, Severity 14" and "Stable: 9, Improve 15, Interval: Week", on one line or two.
Diseases of plants and animals (no humor) are left out.
"""
import re

from books import BOOKS, read_book
from common import clean_inline, slug, strip_quote, write_json

STAT = re.compile(
    r'(Minor|Serious|Major|Critical)\s+(Sanguine|Choleric|Melancholic|Phlegmatic)\s+Disease,\s*Severity\s+(\d+)'
    r'(?:\s|<br>)*Stable:\s*(\d+),\s*Improve:?\s*(\d+|n/a),\s*Interval:\s*(\w+)', re.I)
NAME = re.compile(r'^(?:\*\*(.+?)\*\*(?:<br>)?|#{2,6}\s+(.+))$')


def diseases(book_id):
    lines = read_book(book_id).split('\n')
    plain = [strip_quote(l).strip() for l in lines]
    out = []
    for i, l in enumerate(plain):
        # the stat line, and the line after it when the Ease Factors are on their own line
        text = f'{l} {plain[i + 1] if i + 1 < len(plain) else ""}'
        m = STAT.match(text)
        if not m:
            continue
        # the name is the nearest bold line or heading above
        name = None
        for j in range(i - 1, max(-1, i - 4), -1):
            n = NAME.match(plain[j])
            if n:
                name = clean_inline(n.group(1) or n.group(2))
                break
        if not name:
            continue
        # cause and symptoms: the paragraphs that follow, up to the next disease
        cause, symptoms = '', ''
        for k in range(i + 1, min(len(plain), i + 14)):
            t = plain[k]
            if k > i + 1 and (NAME.match(t) or STAT.match(t)):
                break
            if t.lower().startswith('symptoms:'):
                symptoms = clean_inline(t.split(':', 1)[1].strip())
            elif not cause and len(t) > 40 and not STAT.match(t):
                # the cause may follow the Ease Factors on their own line
                cause = clean_inline(re.sub(r'^.*?Interval:\s*\w+\s*(<br>)?', '', t)) if 'Interval:' in t else clean_inline(t)
        stage, humor, severity, stable, improve, interval = m.groups()
        out.append({
            'id': slug(f'{book_id}-{name}'), 'name': name, 'stage': stage.capitalize(), 'humor': humor.capitalize(),
            'severity': int(severity), 'stable': int(stable), 'improve': None if improve == 'n/a' else int(improve),
            'interval': interval.capitalize(), 'cause': cause[:400], 'symptoms': symptoms[:400],
            'source': {'book': book_id, 'line': i + 1},
        })
    return out


def main():
    found = []
    for b in BOOKS:
        if b[0] in ('AA', 'DI'):
            found += diseases(b[0])
    # one of each name (the Dies Irae pestilences repeat for each Form)
    seen, uniq = set(), []
    for d in found:
        key = re.sub(r'^saint ', 'st. ', d['name'].lower())
        if key in seen:
            continue
        seen.add(key)
        uniq.append(d)
    write_json('diseases.json', uniq)


if __name__ == '__main__':
    main()
