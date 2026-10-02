"""Cross-references in Virtue and Flaw texts.

Many Virtues and Flaws point elsewhere for their rules: "you have the Virtue Second Sight (see
page 106)", "works like the Mythic Blood Virtue (ArM5, page 47)", "fast-casting a Mastered
Formulaic spell (see page 213)". This finds those references and resolves them:

- another Virtue or Flaw named in the text (by name, or by the index entry of a cited page)
  becomes a link to its entry, whose rules the app shows alongside;
- a cited page becomes the section of the book it points to, through the Definitive Edition's
  index, or the original core book's index mapped to the Definitive Edition by topic name, or
  for other books the heading named next to the citation. The section's text is kept so the
  app can show the rules in place.

Writes app/src/data/generated/vfRefs.json:
  { "refs": { vfId: [ {"vf": id, "q": quote} | {"s": sectionKey, "q": quote} ] },
    "sections": { "BOOK#anchor": {"book", "anchor", "title", "text"} } }

Usage: python3 tools/extract/extract_vf_refs.py (run after extract_vf.py; run_all.py does both).
"""
import json
import os
import re
from collections import OrderedDict

from books import BOOKS, ROOT
from common import OUT_DIR, write_json

SECTION_CAP = 2400

ARTS = ['Creo', 'Intellego', 'Muto', 'Perdo', 'Rego', 'Animal', 'Aquam', 'Auram', 'Corpus', 'Herbam', 'Ignem', 'Imaginem', 'Mentem', 'Terram', 'Vim']
TECH, FORMS = ARTS[:5], ARTS[5:]
CHARS = ['Intelligence', 'Perception', 'Strength', 'Stamina', 'Presence', 'Communication', 'Dexterity', 'Quickness']
STOP = {'the', 'of', 'and', 'a', 'an', 'to', 'in', 'on', 'for', 'with', 'see', 'page', 'pages', 'as', 'by', 'or', 'is', 'are', 'be',
        'virtue', 'flaw', 'virtues', 'flaws', 'minor', 'major', 'rules', 'its', 'this', 'that', 'per', 'at', 'from', 'can', 'may'}

# Virtues and Flaws so common in the texts that linking them adds nothing.
SKIP_VF = {'the-gift', 'hermetic-magus', 'foe-art'}


# ---------------------------------------------------------------------------- books

def app_slug(text):
    """The heading slug the app's rules reader uses (BookReader.githubSlug)."""
    t = text.lower()
    t = re.sub(r'<[^>]+>', '', t)
    t = re.sub(r'[*_`\[\]()]', '', t)
    t = re.sub(r'[^\w\s-]', '', t)
    return re.sub(r'\s', '-', t)


def loose(s):
    return re.sub(r'[^a-z0-9]+', ' ', s.lower().replace('&', ' and ')).strip()


_books = {}


def book(book_id):
    """Lines and headings of a book: [(line, level, text, slug)], as the reader numbers them."""
    if book_id in _books:
        return _books[book_id]
    entry = next((b for b in BOOKS if b[0] == book_id), None)
    if not entry or not os.path.exists(os.path.join(ROOT, entry[1])):
        _books[book_id] = None
        return None
    lines = open(os.path.join(ROOT, entry[1]), encoding='utf-8').read().split('\n')
    heads, seen, code = [], {}, False
    for i, l in enumerate(lines):
        if l.startswith('```'):
            code = not code
        if code:
            continue
        m = re.match(r'^(#{1,6})\s+(.*?)\s*#*\s*$', l)
        if not m:
            continue
        base = app_slug(m.group(2))
        n = seen.get(base, 0)
        seen[base] = n + 1
        heads.append((i, len(m.group(1)), re.sub(r'[*_]', '', m.group(2)).strip(), f'{base}-{n}' if n else base))
    _books[book_id] = (lines, heads)
    return _books[book_id]


def section_text(book_id, anchor):
    b = book(book_id)
    if not b:
        return None
    lines, heads = b
    k = next((k for k, h in enumerate(heads) if h[3] == anchor), None)
    if k is None:
        return None
    line, level, title, _ = heads[k]
    end = next((h[0] for h in heads[k + 1:] if h[1] <= level), len(lines))
    # a heading with nothing under it but sub-headings: take the sub-sections too
    body = '\n'.join(lines[line + 1:end]).strip()
    body = re.sub(r'\n{3,}', '\n\n', body)
    if len(body) > SECTION_CAP:
        cut = body.rfind('\n\n', 0, SECTION_CAP)
        body = body[:cut if cut > SECTION_CAP // 2 else SECTION_CAP].rstrip() + '\n\n…'
    return {'book': book_id, 'anchor': anchor, 'title': title.rstrip('\\').strip(), 'text': body}


def parse_de_index_unused():
    """Definitive Edition Traditional Index: [(name, kind, first page, last page, anchor)]."""
    lines, _ = book('DE')
    start = next(i for i, l in enumerate(lines) if l.startswith('## Traditional Index'))
    out, parent = [], ''
    for l in lines[start:]:
        m = re.match(r'^\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*$', l)
        if not m or m.group(1).startswith('**') or m.group(1).startswith('-'):
            continue
        name = m.group(1)
        sub = name.startswith('&nbsp;')
        name = re.sub(r'&nbsp;', '', name).strip()
        if name.startswith('*'):
            continue
        if not sub:
            parent = name
        else:
            name = f'{parent} {name}'
        km = re.search(r'\((Virtue|Flaw|Ability|Template)\)$', name)
        kind = km.group(1) if km else ''
        name = re.sub(r'\s*\((Virtue|Flaw|Ability|Template)\)$', '', name)
        for pm in re.finditer(r'\[(\d+)(?:\s*[-–]\s*(\d+))?\]\(#([^)]+)\)', m.group(2)):
            out.append((name, kind, int(pm.group(1)), int(pm.group(2) or pm.group(1)), pm.group(3)))
    return out


def parse_arm5_index():
    """Original core book index: [(name, first page, last page)]."""
    b = book('ArM5')
    if not b:
        return []
    lines, _ = b
    start = next(i for i, l in enumerate(lines) if l.strip() == '# Index')
    out = []
    for l in lines[start + 1:]:
        for m in re.finditer(r'([A-Za-z(][^0-9]*?)\s+((?:\d+(?:-\d+)?(?:,\s*)?)+)', l):
            name = m.group(1).strip().strip(',')
            for p in re.finditer(r'(\d+)(?:-(\d+))?', m.group(2)):
                out.append((name, int(p.group(1)), int(p.group(2) or p.group(1))))
    return out


# ---------------------------------------------------------------------------- book names in citations

def title_patterns():
    pats = [(r'\bArM5\b|Ars Magica,? 5th Edition|Ars Magica Fifth Edition|Ars Magica\s+5th\s+Edition', 'ArM5'),
            (r'\bDefinitive Edition\b', 'DE'),
            (r'City (?:&|and) Guild', 'CG'), (r'Art (?:&|and) Academe', 'AA'), (r'Hedge Magic', 'HMRE'),
            (r'The Mysteries(?:[:,]? Revised(?: Edition)?)?', 'TMRE'), (r'Houses of Hermes: Mystery\s*Cults', 'HoH_MC'),
            (r'Houses of Hermes: Societates', 'HoH_S'), (r'Houses of Hermes: True Lineages', 'HoH_TL')]
    for b in BOOKS:
        t = re.sub(r'\s*\(.*\)$', '', b[2])
        t = re.sub(r'^The ', '', t)
        pats.append((re.escape(t).replace(r'\ ', r'\s+').replace(r'\&', '(?:&|and)'), b[0]))
    return [(re.compile(p), bid) for p, bid in pats]


TITLES = None


def cited_book(text, start, end):
    """The book a page citation names, looking back through its sentence and just after it."""
    global TITLES
    if TITLES is None:
        TITLES = title_patterns()
    before = re.sub(r'[*_]', '', text[max(0, start - 140):start])
    cut = max(before.rfind('. '), before.rfind('\n'))
    before = before[cut + 1:] if cut >= 0 else before
    after = re.sub(r'[*_]', '', text[end:end + 20])
    best = None
    for rx, bid in TITLES:
        for m in rx.finditer(before):
            if best is None or m.end() > best[0]:
                best = (m.end(), bid)
        m = rx.match(after.lstrip(' of'))
        if m and best is None:
            best = (0, bid)
    return best[1] if best else None


# ---------------------------------------------------------------------------- Virtue and Flaw names

def vf_patterns(vfs):
    W = r"[A-Z][\w'’-]*"
    TITLE = rf"{W}(?:\s(?:of\s|the\s|and\s)?{W}){{0,2}}"
    generic = {'Characteristic': '|'.join(CHARS), 'Form': '|'.join(FORMS), 'Technique': '|'.join(TECH), 'Art': '|'.join(ARTS),
               'Realm': 'Magic|Faerie|Divine|Infernal'}
    free = {'Ability', 'Beings', 'Being', 'Land', 'Sin', 'Subject', 'Faculty', 'Commodity', 'Role', 'Terrain', 'Source of Damage'}
    arts = '|'.join(ARTS)
    special = {
        'affinity-with-ability': rf"Affinity with (?!(?:{arts}|Art)\b)\(?{TITLE}\)?",
        'affinity-with-art': rf"Affinity with \(?(?:{arts}|Art)\)?",
        'puissant-ability': rf"Puissant (?!(?:{arts}|Art)\b)\(?{TITLE}\)?",
        'puissant-art': rf"Puissant \(?(?:{arts}|Art)\)?",
        'deficient-form-flaw': rf"Deficient \(?(?:{'|'.join(FORMS)}|Form)\)?",
        'deficient-technique-flaw': rf"Deficient \(?(?:{'|'.join(TECH)}|Technique)\)?",
        'deft-form': rf"Deft \(?(?:{'|'.join(FORMS)}|Form)\)?",
    }
    out = []
    for v in vfs:
        if v['id'] in SKIP_VF:
            continue
        if v['id'] in special:
            p = special[v['id']]
        else:
            p = ''
            for part in re.split(r'(\([^)]*\))', v['name']):
                inner = part[1:-1] if part.startswith('(') else None
                if inner in generic:
                    p += rf"\(?(?:{generic[inner]}|{inner})\)?"
                elif inner in free:
                    p += rf"\(?{TITLE}\)?"
                else:
                    p += re.escape(part)
        single = ' ' not in v['name'].strip()
        out.append((v['id'], re.compile(rf"(?<![\w'’-]){p}(?![\w'’-])"), single))
    return out


def name_refs(v, pats):
    """Other Virtues and Flaws a text names: [(start, end, id)], the longest name at each place."""
    t = v['text']
    found = []
    for vid, rx, single in pats:
        if vid == v['id']:
            continue
        for m in rx.finditer(t):
            if single and not re.search(r'\b(Virtues?|Flaws?)\b', t[max(0, m.start() - 30):m.end() + 30]):
                continue
            found.append((m.start(), m.end(), vid))
    found.sort(key=lambda f: (f[0], -(f[1] - f[0])))
    out = []
    for f in found:
        if any(o[0] <= f[0] and f[1] <= o[1] and (o[1] - o[0]) > (f[1] - f[0]) for o in found):
            continue
        out.append(f)
    return out


# ---------------------------------------------------------------------------- resolving a cited page

ALIAS = {'regiones': 'regio', 'regio': 'regio'}


def stem(w):
    w = ALIAS.get(w, w)
    if w.endswith('ies'):
        w = w[:-3] + 'y'
    elif w.endswith('s') and not w.endswith('ss'):
        w = w[:-1]
    return w[:6]


def words(s):
    """Content words, stemmed and cut to six letters so that plurals and endings still match."""
    return {stem(w) for w in re.findall(r'[a-z]+', s.lower()) if w not in STOP and len(w) > 3}


_weights = {}


def weight(book_id, w):
    """Rarer heading words count for more: "Gestures" says more than "Spells"."""
    if book_id not in _weights:
        df = {}
        for h in book(book_id)[1]:
            for x in words(h[2]):
                df[x] = df.get(x, 0) + 1
        _weights[book_id] = df
    import math
    return 1 / math.log(2 + _weights[book_id].get(w, 0))


def match(book_id, head_text, cw):
    """How much of a heading the context names: (weighted share of its words, words named)."""
    hw = words(head_text)
    if not hw:
        return 0, 0
    hit = hw & cw
    total = sum(weight(book_id, w) for w in hw)
    return sum(weight(book_id, w) for w in hit) / total, len(hit)


def context_of(t, start, end):
    """The sentence a citation ends; the one before (and the rest of its own) when it stands alone."""
    ctx = t[max(0, start - 220):start]
    marks = [m.end() for m in re.finditer(r'(?:[.;!?]\s|\n)', ctx)]
    own = ctx[marks[-1]:] if marks else ctx
    if len(words(own)) < 3:
        if len(marks) >= 2:
            own = ctx[marks[-2]:]
        after = re.split(r'[.;!?]\s|\n', t[end:end + 160])[0]
        own += ' ' + after
    return own


def longest_increasing(pairs):
    """The (page, line) pairs that agree with each other: lines grow with pages."""
    import bisect
    tails, keys, prev = [], [], [-1] * len(pairs)
    for i, (_, l) in enumerate(pairs):
        k = bisect.bisect_left(keys, l)
        if k == len(tails):
            tails.append(i)
            keys.append(l)
        else:
            tails[k] = i
            keys[k] = l
        prev[i] = tails[k - 1] if k else -1
    out, i = [], tails[-1] if tails else -1
    while i != -1:
        out.append(pairs[i])
        i = prev[i]
    return out[::-1]


class PageMap:
    """Where a printed page falls in a book's markdown, from the index entries whose headings are known."""

    def __init__(self, book_id, pairs):
        self.book = book_id
        self.heads = book(book_id)[1]
        self.pairs = longest_increasing(sorted(set(pairs)))

    def window(self, page):
        """Headings from the last indexed heading before the page to the first one after it."""
        lo = max((l for p, l in self.pairs if p < page), default=0)
        hi = min((l for p, l in self.pairs if p > page and l > lo), default=10 ** 9)
        on = [l for p, l in self.pairs if p == page]
        top = min(on) if on else None
        return [h for h in self.heads if lo <= h[0] <= hi], lo, top

    def resolve(self, page, ctx, fallback=True):
        """The heading on that page that the citation's context names, or else the one the page opens under."""
        heads, lo, top = self.window(page)
        heads = [h for h in heads if not is_broad(h)]
        if not heads:
            return None
        cw = words(ctx)
        scored = sorted(((match(self.book, h[2], cw), h) for h in heads), key=lambda x: (-x[0][0], -x[0][1], -x[1][1]))
        if scored and scored[0][0][0] >= 0.5:
            return scored[0][1]
        if not fallback:
            return None
        start = top if top is not None else lo
        on = [h for h in heads if h[0] >= start]
        before = [h for h in heads if h[0] < start]
        return on[0] if top is not None and on else before[-1] if before else heads[0]


def index_rows(lines, start):
    """Rows of the index tables from a line on: (first cells joined, [(first page, last page, anchor)])."""
    for l in lines[start:]:
        if not l.startswith('|') or l.startswith('|--') or l.startswith('| **'):
            continue
        cells = [c.strip() for c in l.strip().strip('|').split('|')]
        links = [(int(m.group(1)), int(m.group(2) or m.group(1)), m.group(3)) for c in cells for m in re.finditer(r'\[(\d+)(?:\s*[-–]\s*(\d+))?\]\(#([^)]+)\)', c)]
        if links:
            yield cells[0], links


def de_page_map():
    lines, heads = book('DE')
    pos = {h[3]: h[0] for h in heads}
    start = next(i for i, l in enumerate(lines) if l.startswith('## Spells Index'))
    pairs = [(p1, pos[a]) for _, links in index_rows(lines, start) for p1, _, a in links if a in pos]
    return PageMap('DE', pairs)


def arm5_page_map():
    """The original core book has a plain index: match its names to its headings to place its pages."""
    b = book('ArM5')
    if not b:
        return None
    lines, heads = b
    start = next(i for i, l in enumerate(lines) if l.strip() == '# Index')
    by_name = {}
    for h in heads:
        by_name.setdefault(loose(h[2]), h[0])
    pairs = []
    for l in lines[start + 1:]:
        for m in re.finditer(r'([A-Za-z(][^0-9]*?)\s+((?:\d+(?:-\d+)?(?:,\s*)?)+)', l):
            line = by_name.get(loose(m.group(1)))
            if line is None:
                continue
            for p in re.finditer(r'(\d+)(?:-\d+)?', m.group(2)):
                pairs.append((int(p.group(1)), line))
    return PageMap('ArM5', pairs)


GAP_WORDS = {'see', 'the', 'virtue', 'flaw', 'minor', 'major', 'mystery', 'supernatural', 'hermetic', 'general', 'story', 'social', 'status',
             'in', 'described', 'as', 'on', 'from', 'also', 'for', 'details', 'more', 'information', 'edition', 'revised', 'at', 'no', 'cost', 'of'}


def only_citation(gap):
    """Nothing but a citation between a name and a page: "Second Sight (see ArM5, page 48)"."""
    global TITLES
    if TITLES is None:
        TITLES = title_patterns()
    g = re.sub(r'[*_]', '', gap)
    for rx, _ in TITLES:
        g = rx.sub(' ', g)
    rest = [w for w in re.findall(r'[A-Za-z]+', g) if w.lower() not in GAP_WORDS]
    return not rest


BOOK_TITLE_HEADS = None


def is_broad(h):
    """A heading too broad to stand for a cited rule: a chapter, a book title, front matter."""
    global BOOK_TITLE_HEADS
    if BOOK_TITLE_HEADS is None:
        BOOK_TITLE_HEADS = [words(re.sub(r'\s*\(.*\)$', '', b[2])) for b in BOOKS]
    return (h[1] <= 1 or re.match(r'(chapter|part|appendix)\b|[IVX]+\s*:', h[2], re.I) or 'ars magica' in h[2].lower()
            or words(h[2]) in BOOK_TITLE_HEADS)


# Citations the search above places wrongly, checked by hand against the books: {vf: {page: target}}.
OVERRIDES = {
    'affinity-with-ability': {48: 'DE#abilities-1'},
    'bee-king': {269: 'DE#opening-the-arts'},
    'strong-faerie-blood': {64: 'DE#opening-the-arts'},
    'dhampir': {107: 'DE#opening-the-arts'},
    'faerie-magic': {236: 'DE#merinita--faerie-magic'},
    'heartbeast': {233: 'DE#bjornaer--the-heartbeast'},
    'deft-form': {216: 'DE#words-and-gestures'},
    'warped-senses-flaw': {407: 'DE#heat-and-corrosion'},
    'master-of-form-creatures': {384: 'DE#training-creatures'},
    'planetary-magic': {103: 'DE#distractions-from-lab-work'},
    'celestial-magic': {103: 'DE#distractions-from-lab-work'},
    'philosophic-alchemy': {103: 'DE#distractions-from-lab-work'},
    'periapt': {102: 'DE#charged-items'},
    'spirit-familiar': {104: 'DE#familiars'},
    'inscription-on-the-soul': {110: 'DE#shape-and-material-bonuses-table'},
    'mechanica-of-heron': {107: 'DE#arcane-experimentation', 187: 'DE#realm-interaction'},
    'insight-of-the-realms': {189: 'DE#regiones'},
    'divination-and-augury': {149: 'DE#intellego-mentem-guidelines'},
    'blood-of-the-old-gods': {52: 'RoP_M#transformation'},
    'submitted-qareen': {43: 'RoP_F#chapter-three--faerie-characters'},
    'aristotelian-training': {103: 'AA#disputatio', 11: 'AA#the-new-aristotle'},
    'blood-of-the-nephilim': {46: 'RoP_D#divine-and-holy-powers'},
    'uncertain-faith-flaw': {38: 'RoP_D#invoking-gods-aid'},
    'clan-ilfetu': {12: 'HoH_MC#clan-ilfetu'},
    'elysian-ecstasy-and-olympian-pact': {102: 'RoP_F#sympathy-traits'},
}
OVERRIDE_KEYS = {(v, p) for v, ps in OVERRIDES.items() for p in ps}


def main():
    vfs = json.load(open(os.path.join(OUT_DIR, 'virtuesFlaws.json'), encoding='utf-8'))
    pats = vf_patterns(vfs)
    # the heading that starts each Virtue or Flaw entry, in every book that has it
    entry_at = {}
    for v in vfs:
        for src in [v['source']] + v.get('alsoIn', []):
            entry_at[(src['book'], src['line'] - 1)] = v['id']
    maps = {'DE': de_page_map(), 'ArM5': arm5_page_map()}
    de_by_name = {}
    for h in book('DE')[1]:
        de_by_name.setdefault(loose(h[2]), h)

    refs = OrderedDict()
    sections = {}
    unresolved = []

    def override_ref(vid, page, quote):
        key = OVERRIDES[vid][page]
        if key.startswith('vf:'):
            return {'vf': key[3:], 'q': quote}
        book_id, anchor = key.split('#')
        h = next(h for h in book(book_id)[1] if h[3] == anchor)
        return heading_to_ref(book_id, h, quote)

    def add(vid, ref):
        lst = refs.setdefault(vid, [])
        key = ref.get('vf') or ref.get('s') or ref.get('p')
        if key == vid or any((r.get('vf') or r.get('s') or r.get('p')) == key for r in lst):
            return
        lst.append(ref)

    def heading_to_ref(book_id, h, quote):
        """A heading as a reference: the Virtue or Flaw it starts, or its section of rules."""
        if (book_id, h[0]) in entry_at:
            return {'vf': entry_at[(book_id, h[0])], 'q': quote}
        if book_id == 'ArM5':
            # the same rule in the Definitive Edition, which supersedes the original core book
            de = de_by_name.get(loose(h[2]))
            if de and not is_broad(de):
                return heading_to_ref('DE', de, quote)
        key = f'{book_id}#{h[3]}'
        if key not in sections:
            s = section_text(book_id, h[3])
            if not s:
                return None
            sections[key] = s
        return {'s': key, 'q': quote}

    def named_heading(book_id, ctx):
        """For books without an index: the most specific heading named right before the citation."""
        b = book(book_id)
        if not b:
            return None
        cw = words(ctx[-110:])
        heads = [h for h in b[1] if words(h[2]) and words(h[2]) <= cw and not is_broad(h)]
        # a lone common word ("Powers", "Magic") names nothing in particular
        heads = [h for h in heads if sum(weight(book_id, w) for w in words(h[2])) >= 0.6]
        return max(heads, key=lambda h: (len(words(h[2])), h[1])) if heads else None

    for v in vfs:
        t = v['text']
        src = v['source']['book']
        items = []  # (pos, ref)
        names = name_refs(v, pats)
        for s0, e0, vid in names:
            items.append((s0, {'vf': vid, 'q': t[s0:e0]}))
        for m in re.finditer(r'\b(?:pages?|p\.|pp\.)\s*(\d+)(?:\s*[-–]\s*(\d+))?|\bpage\s+(\d+)\s+of\b', t, re.I):
            page = int(m.group(1) or m.group(3))
            target = cited_book(t, m.start(), m.end()) or src
            ctx = context_of(t, m.start(), m.end())
            own = t[max(0, m.start() - 160):m.start()]
            own = re.split(r'[.;!?]\s(?=[^.;!?]*$)|\n', own)[-1]
            quote = re.sub(r'\s+', ' ', own + t[m.start():m.end()]).strip()[-140:]
            # a Virtue or Flaw named right before the citation is what it cites
            named = [n for n in names if m.start() - 70 <= n[1] <= m.start() and only_citation(t[n[1]:m.start()])]
            ref = None
            if named:
                ref = {'vf': named[-1][2], 'q': quote}
            elif (v['id'], page) in OVERRIDE_KEYS:
                ref = override_ref(v['id'], page, quote)
            elif target == 'ArM5' and maps.get(target):
                # a heading of the original on that page named by the context, or the same rule named in the Definitive Edition
                h = maps['ArM5'].resolve(page, ctx, fallback=False)
                ref = h and heading_to_ref('ArM5', h, quote)
                if not ref:
                    h = named_heading('DE', ctx)
                    ref = h and heading_to_ref('DE', h, quote)
                if not ref:
                    h = maps['ArM5'].resolve(page, ctx)
                    ref = h and heading_to_ref('ArM5', h, quote)
            elif maps.get(target):
                h = maps[target].resolve(page, ctx)
                ref = h and heading_to_ref(target, h, quote)
            else:
                h = named_heading(target, ctx)
                ref = h and heading_to_ref(target, h, quote)
            if not ref and book(target):
                ref = {'p': f'{target}:{page}', 'q': quote}
            if ref:
                items.append((m.start(), ref))
            if not ref or 'p' in ref:
                unresolved.append((v['id'], target, page, quote))
        for _, ref in sorted(items, key=lambda x: x[0]):
            add(v['id'], ref)

    write_json('vfRefs.json', {'refs': refs, 'sections': dict(sorted(sections.items()))})
    count = lambda k: sum(1 for r in refs.values() for x in r if k in x)
    print(f"{len(refs)} Virtues and Flaws with references: {count('vf')} to other Virtues and Flaws, {count('s')} to {len(sections)} book sections, "
          f"{count('p')} to a page only; {len(unresolved)} citations not placed in a section")
    if os.environ.get('VERBOSE'):
        for u in unresolved:
            print('  unresolved', u)


if __name__ == '__main__':
    main()
