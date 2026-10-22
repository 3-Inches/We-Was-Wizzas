"""Extract the House Mysteries (Houses of Hermes: Mystery Cults, and the core rules' examples): each
Mystery Virtue with its House, size and a summary, the Initiation Scripts the books give for them
(Ease Factor, Script bonus and what the Initiate must do), and the stations of the Criamon Paths with
their Scripts.
"""
import re

from books import read_book
from common import clean_inline as _clean, slug, strip_quote, write_json

HOUSE_OF_CHAPTER = {'Bjornaer': 'bjornaer', 'Criamon': 'criamon', 'Merinita': 'merinita', 'Verditius': 'verditius'}
# scripts whose title does not name the Virtue they Initiate
SCRIPT_VIRTUE = {
    'Initiation of Heartbeast (The Ritual of Twelve Years)': 'Heartbeast',
    'Initiation to the Mystery of the Inner Heartbeast': 'Inner Heartbeast (Epitome, Chimera or Anima)',
    'Initiation of Bind Curses': 'Bind Curse',
    'Initiation to the rank of Eumolpid and tHe Mystery of Hermetic Theurgy': 'Hermetic Theurgy',
    'Embryonic Initiation of a Refinement Mystery': 'Inner Heartbeast Refinement',
}

def clean_inline(t):
    return _clean(t).replace('$\\times$', '×')


VIRTUE_RE = re.compile(r'^(.*?)\s*\((Minor|Major)\s+(\w+\s+)?Mystery\)\s*$')


def first_sentences(lines, start, limit=260):
    """The opening of the text under a heading, a sentence or two."""
    text = ''
    for l in lines[start:start + 12]:
        t = strip_quote(l).strip()
        if not t or t.startswith('#'):
            if text:
                break
            continue
        text = clean_inline(t)
        break
    if len(text) <= limit:
        return text
    cut = text[:limit]
    return cut[:cut.rfind('. ') + 1] if '. ' in cut else cut.rstrip() + '…'


def script_bonus(text):
    m = re.search(r'([+-]\d+)', text)
    return int(m.group(1)) if m else 0


def mysteries_book(book_id, house_hint=None):
    lines = read_book(book_id).split('\n')
    plain = [strip_quote(l).strip() for l in lines]
    virtues, scripts = [], []
    chapter = ''
    heading = ''
    for i, t in enumerate(plain):
        m = re.match(r'^(#{1,6})\s+(.*)$', t)
        if m:
            heading = clean_inline(m.group(2))
            if len(m.group(1)) == 1:
                chapter = heading
            v = VIRTUE_RE.match(heading)
            if v:
                house = house_hint or next((h for k, h in HOUSE_OF_CHAPTER.items() if k in chapter), None)
                name = v.group(1)
                if name.startswith('The Ritual of Twelve Years'):
                    continue
                virtues.append({
                    'id': slug(name), 'name': name, 'house': house, 'size': v.group(2), 'kind': (v.group(3) or '').strip() or 'House',
                    'summary': first_sentences(lines, i + 1), 'source': {'book': book_id, 'line': i + 1},
                })
            continue
        if t.startswith('**Ease Factor:**'):
            title = ''
            for j in range(i - 1, max(-1, i - 6), -1):
                if plain[j].startswith('**') and 'Ease Factor' not in plain[j]:
                    title = clean_inline(plain[j].strip('*'))
                    break
            ease = t.split('**Ease Factor:**', 1)[1].strip()
            bonus = next((plain[k] for k in range(i + 1, i + 4) if plain[k].startswith('**Script Bonus:**')), '')
            details = next((plain[k] for k in range(i + 1, i + 7) if plain[k].startswith('**Script Details:**')), '')
            name = SCRIPT_VIRTUE.get(title)
            if not name:
                m2 = re.search(r'(?:Initiation(?: of|:)|the Mystery of)\s+(.+)$', title)
                name = m2.group(1).strip() if m2 else title
            house = house_hint or next((h for k, h in HOUSE_OF_CHAPTER.items() if k in chapter), None)
            scripts.append({
                'virtue': name, 'title': title, 'house': house, 'cult': heading,
                'ease': int(re.match(r'\d+', ease).group(0)) if re.match(r'\d+', ease) else None, 'easeText': ease,
                'bonus': script_bonus(bonus.split('**Script Bonus:**', 1)[1]) if bonus else 0,
                'bonusText': clean_inline(bonus.split('**Script Bonus:**', 1)[1].strip()) if bonus else '',
                'details': clean_inline(details.split('**Script Details:**', 1)[1].strip()) if details else '',
                'source': {'book': book_id, 'line': i + 1},
            })
    return virtues, scripts


def criamon_stations(book_id):
    """The stations of the four Criamon Paths, in order, with the Script each one is Initiated by."""
    lines = read_book(book_id).split('\n')
    plain = [strip_quote(l).strip() for l in lines]
    out = []
    path = ''
    order = 0
    for i, t in enumerate(plain):
        m = re.match(r'^#{2,4}\s+The (Path of [\w ]+?),', t)
        if m:
            path, order = m.group(1).strip(), 0
            continue
        if path and t.startswith('**') and ('Station' in t or 'Threshold' in t or 'Repose' in t) and (i + 2 < len(plain)):
            target = next((plain[k] for k in range(i + 1, i + 8) if plain[k].startswith('Target level')), '')
            bonus = next((plain[k] for k in range(i + 1, i + 10) if plain[k].lower().startswith('script bonus')), '')
            if not target:
                continue
            title = clean_inline(t.strip('*'))
            sm = re.search(r'(Station[\w ,]*|Threshold[\w ]*|Immortal Ascension as Repose)$', title)
            name = (sm.group(1).strip() if sm else title).replace('Exaliation', 'Exaltation')
            order += 1
            tl = re.match(r'Target level (\d+)', target)
            out.append({
                'id': slug(f'criamon {name}'), 'name': name, 'path': path, 'order': order, 'avenue': title,
                'target': int(tl.group(1)) if tl else None, 'targetText': clean_inline(target),
                'bonus': script_bonus(bonus.split(':', 1)[0]) if bonus else 0, 'bonusText': clean_inline(bonus.split(':', 1)[1].strip()) if ':' in bonus else '',
                'source': {'book': book_id, 'line': i + 1},
            })
    return out


def main():
    v, s = mysteries_book('HoH_MC')
    dv, ds = mysteries_book('DE')
    names = {x['name'].lower() for x in v}
    # the core rules' examples that the Mystery Cults book does not restate
    for x in dv:
        x['house'] = {'Secret Name': 'bjornaer', 'Spell Timing': 'merinita'}.get(x['name'], x['house'])
        if x['name'].lower() not in names and x['house']:
            v.append(x)
    stations = criamon_stations('HoH_MC')
    write_json('houseMysteries.json', {'virtues': v, 'scripts': s, 'stations': stations})


if __name__ == '__main__':
    main()
