"""Build the mechanics reference: app/src/data/generated/mechanics/ (index.json and one file per area).

Input: tools/extract/mechanics_index/*.json, the indexes of every game mechanic in the reviewed
5th Edition books (each entry: heading, line, category, topic, audience, prevalence, summary,
quotes...). They were made by reading the books chunk by chunk; this script trusts none of it
blindly. Every entry is checked against the book:
  - its heading must be on its line (a heading within a few lines is accepted and the line moved);
  - each quote must appear, word for word, in the section the app will show;
  - numbers in its summary must appear in that section (otherwise the summary is reported).
Entries that fail are dropped and listed. The rest are grouped by area (from the category) and
topic, ordered from the most used mechanics to the most specialised, with the mechanics that
need a Virtue, House, initiation or tradition kept apart. Character-creation rules are also
listed under the kind of character they are for.

Usage: python3 build_mechanics.py [--report]
"""
import glob
import json
import os
import re
import sys
from collections import Counter, defaultdict

from books import BOOK_BY_ID, ROOT, book_path
from mechanics_topics import broad_topic
from mechanics_curation import CREATION_KINDS as KIND_NAMES, PLACEMENT, TOPICS
from mechanics_overrides import OVERRIDES, RANGES


def override(x):
    """An entry's corrections: those for a run of lines in its book, then its own."""
    o = {}
    for book, first, last, what in RANGES:
        if x['book'] == book and first <= x['line'] <= last:
            o.update(what)
            break
    return {**o, **OVERRIDES.get(x['id'], {})}

INDEX_DIR = os.path.join(os.path.dirname(__file__), 'mechanics_index')
# a small index (areas, topics, counts) and one file per area, which the app loads when it is opened
OUT = os.path.join(ROOT, 'app', 'src', 'data', 'generated', 'mechanics')

# Areas, from the rules every character uses to the most specialised.
AREAS = [
    ('basics', 'The basics', '🎲', 'How a roll works, Characteristics and Abilities, Personality Traits, Reputations and Confidence: the rules every character uses in every session.'),
    ('creation', 'Character creation', '✒', 'How each kind of character is made: grogs, companions, magi and Mythic Companions in the core rules, then the beings and traditions of the other books, from magic and faerie characters to holy and infernal ones.'),
    ('combat', 'Combat & hazards', '⚔', 'Fighting, wounds, Fatigue and recovery, and the other dangers of Mythic Europe: poison, disease, deprivation, the elements and travel.'),
    ('seasons', 'Seasons, study & aging', '⌛', 'What characters do between stories: study from books, teachers, practice and exposure, writing and copying books, training animals, aging and Warping.'),
    ('magic', 'Hermetic magic & spells', '✶', 'Casting spells with the Arts: Casting Totals, spontaneous and ritual magic, Penetration and Magic Resistance, Range, Duration and Target, and the rules of each Form.'),
    ('lab', 'The laboratory', '⚗', 'Lab Totals and the work done in a laboratory: inventing spells, enchanting items, familiars, longevity rituals, lab texts, experimentation, research and personalising the lab.'),
    ('covenant', 'Covenants', '⌂', 'Founding and running a covenant: Boons and Hooks, Build Points, finances, covenfolk, vis sources, charters, laboratories and libraries.'),
    ('order', 'The Order of Hermes & its Houses', '⚖', 'The Code of Hermes, Tribunals, Wizards\' War and Hermetic law, and the rules particular to each House.'),
    ('social', 'Society & influence', '♜', 'Dealing with the mundane world: social standing, influence, wealth, trade, guilds, nobility, war and the Church.'),
    ('realms', 'The Realms', '☯', 'Auras and regiones, the Magic, Faerie, Divine and Infernal realms, True Faith, miracles, sin and the supernatural world.'),
    ('beings', 'Creatures & supernatural beings', '🐉', 'Designing and playing beings with Might: magic creatures, faeries, angels, demons, spirits, ghosts, elementals and beasts, and how they grow.'),
    ('mysteries', 'Mysteries & initiation', '☥', 'Mystery Cults and Initiation, and the Hermetic Mysteries that change how a magus works: alchemy, astrology, theurgy, dream magic and more.'),
    ('traditions', 'Other magical traditions', '☾', 'Magic outside the Order of Hermes: hedge traditions, faerie wizards, holy and infernal magic, and ancient and foreign traditions.'),
    ('setting', 'Sagas & setting', '🗺', 'Running the saga: troupe play, saga styles and speed, and rules tied to particular places and peoples.'),
]
CATEGORY_AREA = {
    'basics': 'basics', 'creation': 'creation', 'combat': 'combat', 'hazards': 'combat', 'seasons': 'seasons', 'aging': 'seasons',
    'magic': 'magic', 'lab': 'lab', 'covenant': 'covenant', 'order': 'order', 'houses': 'order', 'social': 'social',
    'realms': 'realms', 'beings': 'beings', 'mysteries': 'mysteries', 'traditions': 'traditions', 'setting': 'setting',
}
# Topics that are the same thing under different names.
TOPIC_ALIASES = {
    'spell mastery': 'Spell Mastery', 'laboratory personalization': 'Laboratory personalization', 'lab total': 'Lab Totals',
    'corrupt beasts': 'Corrupted beasts', 'faerie realm': 'The Faerie Realm', 'holy influence': 'Holy influence',
    'holy traditions': 'Holy traditions', 'holy methods': 'Holy Methods', 'faerie powers': 'Faerie Powers', 'faerie rites': 'Faerie rites',
    'magic characters': 'Magic characters', 'magic character creation': 'Magic characters', 'might characters': 'Characters with Might',
    'shapes and materials': 'Shape and material bonuses', 'spirit magic': 'Spirit magic', 'true names': 'True Names',
}
# Character-creation rules, by the kind of character they make (first match wins).
CREATION_KINDS = [
    ('Grogs', r'\bgrogs?\b|covenfolk|specialist'),
    ('Apprentices & young characters', r'apprentice|child|young'),
    ('Mythic Companions', r'mythic companion|heroic|true lineage|blood of heroes'),
    ('Magi', r'heartbeast|bjornaer|criamon|enigma|verditius|tremere|tytalus|jerbiton|flambeau|bonisagus|guernicus|merinita|house acclaim|titanoi|leper mag'),
    ('Faerie characters', r'faerie|changeling|pretense'),
    ('Divine & holy characters', r'holy|divine|angel|muslim|jewish|christian|nephilim|true faith|saint'),
    ('Infernal & tainted characters', r'infernal|demon|tainted|corrupt'),
    ('Hedge wizards & other traditions', r'ex miscellanea|hedge|tradition|learned magician|elementalist|folk witch|gruagach|nightwalker|vitki|ancient|supernatural abilit|maleficia|ars notoria|folk dancing|mythic herbalism|chthonic|sihr'),
    ('Magic characters & creatures', r'magic character|magic human|magic animal|magic thing|magic spirit|magic kin|\bqualit(y|ies)\b|inferiorit|might\b|magical being|elemental|ghost|dragon|giant|golem|magical cat|revenant|spirit|nephelococcygia|homunculus|transformed human|siren|mythic blood'),
    ('Animals & beasts', r'beast|animal|horse|hound'),
    ('Magi', r'\bmag(us|i)\b|hermetic|gauntlet|house|arts\b|parma|spell mastery|certamen|redcap|mercere'),
    ('Careers: craftsmen, merchants, scholars & physicians', r'craft|merchant|guild|physician|medicin|universit|scholar|artist|career|student|philosoph'),
    ('Nobles and clergy', r'\bnoble|knight|clergy|priest|monk|\bnuns?\b|templar|\btitles?\b|bishop|franciscan|benedictine|lord'),
    ('Companions', r'companion'),
]
KIND_ORDER = KIND_NAMES
# the kind of character a rule makes, from the topic or area it is in
KIND_BY_TOPIC = {
    ('beings', 'Mundane beasts'): 'Animals & beasts', ('beings', 'Faeries'): 'Faerie characters',
    ('beings', 'Angels and divine beings'): 'Divine & holy characters', ('beings', 'Demons'): 'Infernal & tainted characters',
    ('traditions', 'Faerie wizards'): 'Faerie characters', ('traditions', 'Holy traditions'): 'Divine & holy characters',
    ('traditions', 'Infernal traditions'): 'Infernal & tainted characters', ('realms', 'True Faith and miracles'): 'Divine & holy characters',
    ('realms', 'The Divine Realm'): 'Divine & holy characters', ('realms', 'The Infernal Realm'): 'Infernal & tainted characters',
}
KIND_BY_AREA = {'beings': 'Magic characters & creatures', 'traditions': 'Hedge wizards & other traditions', 'mysteries': 'Magi', 'order': 'Magi'}
NOT_CREATION_AREAS = {'covenant', 'lab', 'combat'}
NOT_CREATION_TOPICS = {('realms', 'Auras'), ('seasons', 'Books and reading'), ('social', 'Manors and peasants'), ('setting', 'Mythic Locations'), ('setting', 'Dies Irae')}
NOT_CREATION = re.compile(r'covenant|\bboons?\b|\bhooks?\b|\btombs?\b|chapter house|tribunal|\bgilds?\b|founding|saga start|siting|castles?\b|\bvis\b|duties of|liege|eremites|peregrinatores|receiving of gifts|luctationes|perthean|zenodochium|multiple sites|church', re.I)
TABLE_ROW = re.compile(r'^(>\s?)?\s*\|')
META = re.compile(r'\blines? \d+|this file|the file\b|in this file|(its own|lost its) heading|heading (of|in) |my range|this range|second heading|first heading', re.I)
AUDIENCES = {'all', 'magi', 'companions', 'grogs', 'storyguide', 'covenant'}


def norm_ws(s):
    return re.sub(r'\s+', ' ', s).strip()


def norm_heading(s):
    s = re.sub(r'^>\s*', '', s)
    s = re.sub(r'^#+\s*', '', s)
    s = s.replace('\\', '').replace('*', '').replace('_', '')
    return norm_ws(s).lower().rstrip(' #')


def heading_of(line):
    m = re.match(r'^(>\s*)?(#{1,6})\s+(.*?)\s*#*\s*$', line)
    return (len(m.group(2)), m.group(3), bool(m.group(1))) if m else None


def section_end(lines, start, end_line=None):
    """The end (exclusive, 0-based) of the section the app shows; mirrors app/src/ui/bookText.ts."""
    if end_line:
        return min(len(lines), end_line)
    h = heading_of(lines[start])
    end = start + 1
    if h and h[2]:
        while end < len(lines) and lines[end].startswith('>'):
            end += 1
        return end
    in_code = False
    while end < len(lines):
        if lines[end].startswith('```'):
            in_code = not in_code
        elif not in_code:
            n = heading_of(lines[end])
            if n and not n[2] and h and n[0] <= h[0]:
                break
        end += 1
    return end


# the audience filter of the app (MechanicsPage.tsx forAudience); '' is everything
FILTERS = ['', 'magi', 'companions', 'grogs', 'storyguide']


def for_audience(x, who):
    a = x['audience']
    if not who:
        return True
    if who == 'storyguide':
        return 'storyguide' in a
    return who in a or 'all' in a or (who == 'magi' and 'covenant' in a)


# When books repeat a rule: the Definitive Edition comes first (the newest core rules, with the
# errata), then the newer book. Publication years, for that order.
BOOK_YEAR = {
    'DE': 2024, 'Hooks': 2016, 'DI': 2015, 'LotN': 2014, 'Church': 2013, 'AtD': 2012, 'TME': 2012, 'LoH': 2011,
    'AA': 2010, 'HMRE': 2010, 'ML': 2010, 'LaL': 2010, 'SE': 2010, 'HoH_S': 2009, 'App': 2008, 'Grogs': 2008,
    'AM': 2008, 'TMRE': 2008, 'RoP_D': 2008, 'RoP_I': 2008, 'LoM': 2008, 'Cov': 2007, 'CG': 2007, 'RoP_M': 2006,
    'RoP_F': 2006, 'HoH_MC': 2006, 'GotF': 2006, 'HoH_TL': 2005,
}


def precedence(book):
    """Sort key: the book whose version of a repeated rule is shown first."""
    return (book != 'DE', -BOOK_YEAR.get(book, 0), list(BOOK_BY_ID).index(book) if book in BOOK_BY_ID else 99)


def shingles(text):
    """The section's text as overlapping five-word runs, to find the same rules in two books."""
    w = re.sub(r'[^a-z0-9 ]', ' ', re.sub(r'[*_#|\\]', ' ', text.lower())).split()
    return {' '.join(w[k:k + 5]) for k in range(max(0, len(w) - 4))}


def fold_duplicates(entries):
    """
    One entry for a rule that several books print. Two sections from different books whose texts
    share most of their five-word runs (at least 60% of the longer one) are the same rules: the
    one from the book that comes first (see precedence) stays, and the others become its
    'also in'. Sections from different books with the same title in the same topic but different
    text are versions of a rule: they are folded under the first as 'versions', shown with it.
    Returns how many entries were folded.
    """
    posting = defaultdict(list)
    for i, x in enumerate(entries):
        for sh in x['_shingles']:
            posting[sh].append(i)
    shared = Counter()
    for ids in posting.values():
        if len(ids) > 25:  # common phrases say nothing about two sections being the same
            continue
        for a in range(len(ids)):
            for b in range(a + 1, len(ids)):
                if entries[ids[a]]['book'] != entries[ids[b]]['book']:
                    shared[(ids[a], ids[b])] += 1
    parent = list(range(len(entries)))

    def find(i):
        while parent[i] != i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i
    for (a, b), n in shared.items():
        la, lb = len(entries[a]['_shingles']), len(entries[b]['_shingles'])
        if min(la, lb) >= 15 and n / max(la, lb) >= 0.6:
            parent[find(a)] = find(b)
    clusters = defaultdict(list)
    for i in range(len(entries)):
        clusters[find(i)].append(i)
    gone = set()
    for ids in clusters.values():
        if len(ids) < 2:
            continue
        ids.sort(key=lambda i: (precedence(entries[i]['book']), entries[i]['line']))
        keep = entries[ids[0]]
        for i in ids[1:]:
            x = entries[i]
            keep.setdefault('alsoIn', []).append({'book': x['book'], 'line': x['line'], **({'endLine': x['endLine']} if x.get('endLine') else {}), 'title': x['title']})
            keep['audience'] = sorted(set(keep['audience']) | set(x['audience']))
            keep['prevalence'] = min(keep['prevalence'], x['prevalence'])
            if x.get('creation'):
                keep['creation'] = True
            keep['_folded'] = keep.get('_folded', []) + [x['id']]
            gone.add(i)
    # versions: the same title in the same topic, from other books
    by_title = defaultdict(list)
    for i, x in enumerate(entries):
        if i not in gone:
            by_title[(title_key(x['title']), x['_topic'])].append(i)
    for ids in by_title.values():
        if len({entries[i]['book'] for i in ids}) < 2:
            continue
        ids.sort(key=lambda i: (precedence(entries[i]['book']), entries[i]['line']))
        keep = entries[ids[0]]
        for i in ids[1:]:
            x = entries[i]
            if x['book'] == keep['book']:
                continue
            keep.setdefault('versions', []).append({k: v for k, v in x.items() if not k.startswith('_') and k not in ('audience', 'creation', 'versions')})
            keep['audience'] = sorted(set(keep['audience']) | set(x['audience']))
            keep['_folded'] = keep.get('_folded', []) + [x['id']] + x.get('_folded', [])
            gone.add(i)
    folded = len(gone)
    entries[:] = [x for i, x in enumerate(entries) if i not in gone]
    return folded


def clean_quote(q):
    """A quote as it reads on the page: without the markdown emphasis and escapes of the book file."""
    q = q.replace('\\', '').replace('**', '').replace('__', '')
    q = re.sub(r'(?<![\w*])\*(?=\S)|(?<=\S)\*(?![\w*])', '', q)
    return norm_ws(q)


def title_key(s):
    s = re.sub(r'\([^)]*\)', ' ', s.lower())
    s = re.sub(r'^(the|a|an) ', '', norm_ws(s))
    return re.sub(r'[^a-z0-9]+', ' ', s).strip()


def slug(s):
    return re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')


_topic_forms = {}


def canonical_topic(t):
    """One name per topic: aliases merged, and "Spell mastery" the same topic as "Spell Mastery"."""
    t = norm_ws(t or 'General')
    t = TOPIC_ALIASES.get(t.lower(), t[0].upper() + t[1:])
    return _topic_forms.setdefault(slug(t), t)


def heading_path(lines, line):
    """The chapter (# heading) and section (## heading) a line is in, as the book's file has them."""
    ch = sec = ''
    for i in range(line - 1, -1, -1):
        h = heading_of(lines[i])
        if not h or h[2]:
            continue
        if h[0] == 2 and not sec and not ch:
            sec = h[1]
        if h[0] == 1:
            ch = h[1]
            break
    clean = lambda t: norm_ws(t.replace('\\', '').replace('*', ''))
    return clean(ch), clean(sec)


ABILITIES = json.load(open(os.path.join(ROOT, 'app', 'src', 'data', 'generated', 'abilities.json'), encoding='utf-8'))
ABILITY_TYPE = {norm_ws(a['name']).lower(): a['type'] for a in ABILITIES}


# each book's Ability headings, to find the Ability a passage of an Ability list belongs to
ABILITY_LINES = defaultdict(list)
for _a in ABILITIES:
    if (_a.get('source') or {}).get('book'):
        ABILITY_LINES[_a['source']['book']].append((int(_a['source']['line']), _a['name'], _a['type']))
for _v in ABILITY_LINES.values():
    _v.sort()


def ability_section(title, book=None, line=None):
    """Where an Ability goes in the Abilities topic, by its type and name (or the Ability whose description it is part of)."""
    t = re.sub(r'\s*\(.*?\)|\*|^new (arcane |academic |general |martial |supernatural )?ability:\s*', '', title, flags=re.I).strip().lower()
    kind = ABILITY_TYPE.get(t)
    if not kind and book and line:
        under = [a for a in ABILITY_LINES.get(book, []) if a[0] <= line]
        if under:
            t, kind = under[-1][1].lower(), under[-1][2]
    if not kind:
        m = re.search(r'\b(general|academic|arcane|martial|supernatural)\b', title, re.I)
        kind = m.group(1).title() if m else 'General'
    if kind == 'Supernatural':
        return None
    if kind == 'General':
        if re.search(r'lore\b', t):
            return 'Lores'
        if re.search(r'language|sign language', t):
            return 'Languages'
        if re.search(r'^(craft|profession)', t):
            return 'Crafts and Professions'
        return 'General Abilities'
    return f'{kind} Abilities'


def place(x, ch, sec, head):
    """Where an entry goes: (area, topic, section), from its override or the first rule that fits."""
    o = override(x)
    if 'area' in o or 'topic' in o:
        return o.get('area', x['_area']), o.get('topic'), o.get('section')
    for r in PLACEMENT:
        if not r['book'].match(x['book']):
            continue
        if r['ch'] and not r['ch'].search(ch):
            continue
        if r['sec'] and not r['sec'].search(sec):
            continue
        if r['title'] and not r['title'].search(x['title']):
            continue
        if r['head'] and not r['head'].search(head):
            continue
        section = r['section']
        area, topic = r['area'], r['topic']
        if section == '$sec':
            section = sec or None
        elif section == '$ch':
            section = re.sub(r'^(chapter|appendix)\s+[\w]+\s*:?\s*', '', ch, flags=re.I) or None
        elif section == '$form':
            m = re.search(r'Animal|Aquam|Auram|Corpus|Herbam|Ignem|Imaginem|Mentem|Terram|Vim', sec)
            section = m.group(0) if m else None
        elif section == '$ability':
            section = ability_section(x['title'], x['book'], x['line'])
            if section is None:
                area, topic, section = 'magic', 'Supernatural Abilities', None
        return area, topic, section
    return None


def check_overrides():
    """A dict literal keeps the last of two entries for one id; say so rather than lose the first."""
    import ast
    tree = ast.parse(open(os.path.join(os.path.dirname(__file__), 'mechanics_overrides.py'), encoding='utf-8').read())
    for node in tree.body:
        if isinstance(node, ast.Assign) and getattr(node.targets[0], 'id', '') == 'OVERRIDES':
            keys = [k.value for k in node.value.keys]
            twice = sorted({k for k in keys if keys.count(k) > 1})
            assert not twice, f'mechanics_overrides.py has two overrides for {twice}'


def main():
    report = '--report' in sys.argv
    check_overrides()
    book_lines = {}
    order = {b: i for i, b in enumerate(BOOK_BY_ID)}
    dropped, moved, bad_quotes, number_flags = [], 0, 0, []
    seen = set()
    entries = []
    for path in sorted(glob.glob(os.path.join(INDEX_DIR, '*.json'))):
        chunk = os.path.basename(path)[:-5]
        book = chunk.rsplit('-', 1)[0]
        if book not in BOOK_BY_ID:
            continue
        if book not in book_lines:
            book_lines[book] = open(book_path(book), encoding='utf-8').read().split('\n')
        lines = book_lines[book]
        for e in json.load(open(path, encoding='utf-8')):
            line = int(e.get('line') or 0)
            want = norm_heading(e.get('heading', ''))
            # the heading must be on its line; accept one a few lines away
            ok = 0 < line <= len(lines) and heading_of(lines[line - 1]) and norm_heading(lines[line - 1]) == want
            if not ok:
                near = [i for i in range(max(1, line - 6), min(len(lines), line + 6) + 1) if heading_of(lines[i - 1]) and norm_heading(lines[i - 1]) == want]
                if near:
                    line = min(near, key=lambda i: abs(i - line))
                    moved += 1
                else:
                    dropped.append(f"{chunk}: {e.get('title')!r} at {e.get('line')} (heading {e.get('heading')!r} not found)")
                    continue
            end_line = e.get('endLine')
            if end_line is not None:
                end_line = int(end_line)
                if end_line < line or end_line > len(lines):
                    end_line = None
            key = (book, line, end_line)
            if key in seen:
                continue
            seen.add(key)
            # a range that stops inside a table is shown to the table's end (the id keeps the indexes' range)
            shown_end = end_line
            while shown_end is not None and shown_end < len(lines) and TABLE_ROW.match(lines[shown_end - 1]) and TABLE_ROW.match(lines[shown_end]):
                shown_end += 1
            start = line - 1
            end = section_end(lines, start, shown_end)
            text = norm_ws(' '.join(re.sub(r'^>\s?', '', l) for l in lines[start:end]))
            quotes = []
            for q in e.get('quotes') or []:
                if q and norm_ws(q) in text:
                    quotes.append(clean_quote(q))
                else:
                    bad_quotes += 1
                    if report:
                        print(f"quote not in {chunk} {e.get('title')!r}: {q[:80]!r}")
            # notes about the book file itself ("follows line 782", "has no heading of its own") are not rules
            summary = ' '.join(x for x in re.split(r'(?<=[.!?])\s+', norm_ws(e.get('summary') or '')) if not META.search(x))
            missing = [n for n in re.findall(r'(?<![\w.])[+−-]?\d+(?:\.\d+)?', summary) if n.lstrip('+−-') not in text]
            if missing:
                number_flags.append(f"{chunk}: {e.get('title')}: {missing} — {summary}")
            prev = int(e.get('prevalence') or 3)
            prev = min(4, max(1, prev))
            audience = [a for a in (e.get('audience') or ['all']) if a in AUDIENCES] or ['all']
            entries.append({
                'id': f'{book}-{line}' + (f'-{end_line}' if end_line else ''),
                'title': norm_ws(e.get('title') or e.get('heading')),
                'book': book, 'line': line, **({'endLine': shown_end} if shown_end else {}),
                'audience': audience, 'prevalence': prev,
                **({'creation': True} if e.get('creation') else {}),
                **({'requires': norm_ws(e['requires'])} if prev == 4 and e.get('requires') else {}),
                'summary': summary,
                **({'quotes': quotes} if quotes else {}),
                **({'related': [norm_ws(r) for r in e['related'] if r]} if e.get('related') else {}),
                '_area': CATEGORY_AREA.get(e.get('category'), 'setting'),
                # the agent's own topic picks the kind of character; the broader one groups the mechanic
                '_raw_topic': canonical_topic(e.get('topic')),
                '_topic': canonical_topic(broad_topic(canonical_topic(e.get('topic')))),
                '_shingles': shingles(text),
                '_path': heading_path(lines, line),
                '_head': norm_heading(lines[line - 1]),
            })

    # every Ability in the books, where the indexes do not have it already: they make the Abilities topic whole
    have = {(x['book'], x['line']) for x in entries}
    added_abilities = 0
    for a in ABILITIES:
        src = a.get('source') or {}
        book, line = src.get('book'), int(src.get('line') or 0)
        if book not in BOOK_BY_ID or not BOOK_BY_ID[book][1].startswith('reviewed/') or (book, line) in have or not line:
            continue
        if book not in book_lines:
            book_lines[book] = open(book_path(book), encoding='utf-8').read().split('\n')
        lines = book_lines[book]
        if not heading_of(lines[line - 1]):
            continue
        start = line - 1
        end = section_end(lines, start)
        text = norm_ws(' '.join(re.sub(r'^>\s?', '', l) for l in lines[start:end]))
        sentences = re.split(r'(?<=[.!?])\s+', norm_ws(a.get('text') or ''))
        summary = ' '.join(sentences[:2])
        supernatural = a['type'] == 'Supernatural'
        entries.append({
            'id': f'{book}-{line}', 'title': a['name'], 'book': book, 'line': line,
            'audience': ['magi'] if a['type'] == 'Arcane' else ['all'], 'prevalence': 4 if supernatural else 2,
            **({'requires': f"the {a['name']} Virtue, or a tradition that teaches it"} if supernatural else {}),
            'summary': summary or f"The {a['name']} Ability.",
            '_area': 'basics', '_raw_topic': 'Abilities', '_topic': 'Abilities', '_shingles': shingles(text),
            '_path': heading_path(lines, line), '_head': norm_heading(lines[line - 1]), '_ability': True,
        })
        have.add((book, line))
        added_abilities += 1

    # where each one goes: its override or the first placement rule that fits; the rest keep the indexes' topic
    unplaced = []
    for x in entries:
        ch, sec = x['_path']
        # an Ability from the Ability list goes with the other Abilities, whatever book it is in
        p = None if x.get('_ability') and not override(x) else place(x, ch, sec, x['_head'])
        if p is None and x.get('_ability'):
            sec_ = ability_section(x['title'], x['book'], x['line'])
            p = ('basics', 'Abilities', sec_) if sec_ else ('magic', 'Supernatural Abilities', None if x['book'] == 'DE' else BOOK_BY_ID[x['book']][2])
        if p is None:
            unplaced.append(x)
            continue
        x['_area'], topic, x['_section'] = p
        if topic:
            x['_topic'] = topic
        x['_placed'] = True
        for k, v in override(x).items():
            if k in ('title', 'summary', 'prevalence', 'requires', 'audience', 'creation'):
                x[k] = v
            elif k == 'section':
                # a section of its own within the topic the rules chose
                x['_section'] = v
    dropped_by_hand = [x for x in entries if override(x).get('drop')]
    entries[:] = [x for x in entries if not override(x).get('drop')]

    merged = fold_duplicates(entries)

    def sort_entries(es):
        return sorted(es, key=lambda x: (x['prevalence'], order.get(x['book'], 99), x['line']))

    def public(x, section=None):
        return {**{k: v for k, v in x.items() if not k.startswith('_')}, **({'section': section} if section else {})}

    def grouped(es, key, sections=False):
        g = defaultdict(list)
        for x in es:
            g[key(x)].append(x)
        out = []
        for title, xs in g.items():
            if sections:
                # a big group is split by topic, in the order the books present them (the core rules first)
                by = defaultdict(list)
                for x in xs:
                    by[x['_topic']].append(x)
                tops = sorted(by, key=lambda t: min((order.get(x['book'], 99), x['line']) for x in by[t]))
                es_ = [public(x, t if len(by) > 1 else None) for t in tops for x in sort_entries(by[t])]
            else:
                es_ = [public(x) for x in sort_entries(xs)]
            out.append({'id': slug(title), 'title': title, 'entries': es_})
        # most used first: the commonest prevalence, then the biggest groups
        out.sort(key=lambda g: (min(x['prevalence'] for x in g['entries']), -len(g['entries']), g['title']))
        return out

    def curated(es, topics):
        """The area's topics in their own order, each with its sections; topics the curation does not know follow."""
        by = defaultdict(list)
        known = {t['title']: t for t in topics}
        same = {slug(t): t for t in known}
        for x in es:
            x['_topic'] = same.get(slug(x['_topic']), x['_topic'])
            by[x['_topic']].append(x)
        names = [t['title'] for t in topics if t['title'] in by] + sorted((t for t in by if t not in known), key=lambda t: -len(by[t]))
        out = []
        for name in names:
            t = known.get(name, {})
            xs = by[name]
            want = t.get('sections', [])
            secs = defaultdict(list)
            for x in xs:
                secs[x.get('_section') or ''].append(x)
            first = lambda k: min((order.get(x['book'], 99), x['line']) for x in secs[k])
            sec_order = [k for k in want if k in secs] + sorted((k for k in secs if k not in want), key=lambda k: (k != '', first(k)))
            split = len(secs) > 1
            # entries the rules put in no section: the core rules, or the topic's general rules
            label = lambda k: k or ('Core rules' if all(x['book'] == 'DE' for x in secs[k]) else 'General')
            es_ = [public(x, label(k) if split else None) for k in sec_order for x in sort_entries(secs[k])]
            gated = t.get('gated') or all(x['prevalence'] == 4 for x in xs)
            out.append({'id': slug(name), 'title': name, **({'intro': t['intro']} if t.get('intro') else {}), 'entries': es_, '_gated': gated, '_known': name in known})
        return out

    # entries the curation does not place: a topic with a mechanic or two in one area and many in another is read there
    per_area = defaultdict(lambda: defaultdict(int))
    for x in unplaced:
        per_area[x['_topic']][x['_area']] += 1
    for x in unplaced:
        counts = per_area[x['_topic']]
        home = max(counts, key=counts.get)
        if x['_area'] != home and x['_area'] != 'creation' and home != 'creation' and counts[x['_area']] <= 2 and counts[home] >= 3:
            x['_area'] = home

    stray = []
    areas = []
    for aid, title, icon, intro in AREAS:
        mine = [x for x in entries if x['_area'] == aid]
        if aid == 'creation':
            # every rule for making a character, from any area, by the kind of character it makes
            def kind(x):
                if x['_area'] == 'creation' and x.get('_placed') and x['_topic'] in KIND_ORDER:
                    return x['_topic']
                # where the curation put it says what it makes, before its words do
                home = KIND_BY_TOPIC.get((x['_area'], x['_topic'])) or KIND_BY_AREA.get(x['_area'])
                if home:
                    return home
                hay = f"{x['_raw_topic']} {x['title']} {x.get('requires', '')}".lower()
                for name, pat in CREATION_KINDS:
                    if re.search(pat, hay):
                        return name
                return 'Making any character'
            # covenant and laboratory set-up have their own areas
            # and the rules for founding covenants, churches and tombs, or for arms and auras, are not about characters
            pool = [x for x in entries if x['_area'] == 'creation' or (
                x.get('creation') and x['_area'] not in NOT_CREATION_AREAS and (x['_area'], x['_topic']) not in NOT_CREATION_TOPICS
                and not NOT_CREATION.search(x['title']))]
            # in the order a troupe meets them: the core character types, then the beings of the other books
            rank = {n: i for i, n in enumerate(KIND_ORDER)}
            open_ = sorted(grouped([x for x in pool if x['prevalence'] < 4], kind, sections=True), key=lambda g: rank.get(g['title'], 99))
            gated = sorted(grouped([x for x in pool if x['prevalence'] == 4], kind, sections=True), key=lambda g: rank.get(g['title'], 99))
        else:
            topics = curated(mine, TOPICS.get(aid, []))
            open_ = [g for g in topics if not g['_gated']]
            gated = [g for g in topics if g['_gated']]
            for g in topics:
                if not g['_known']:
                    stray.append(f"{aid}/{g['title']} ({len(g['entries'])})")
                del g['_gated'], g['_known']
        # a topic can have open and gated mechanics; each list gets its own page
        taken = {g['id'] for g in open_}
        for g in gated:
            if g['id'] in taken:
                g['id'] += '-gated'
        assert len({g['id'] for g in open_ + gated}) == len(open_ + gated), f'two topics with one id in {aid}'
        areas.append({'id': aid, 'title': title, 'icon': icon, 'intro': intro, 'groups': open_, 'gated': gated})

    # "see also" notes that name another mechanic link to it, preferring one in the same book
    where, by_title = {}, defaultdict(list)
    for a in sorted(areas, key=lambda a: a['id'] == 'creation'):
        for g in a['groups'] + a['gated']:
            for x in g['entries']:
                if x['id'] not in where:
                    where[x['id']] = f"/mechanics/{a['id']}/{g['id']}#{x['id']}"
                    by_title[title_key(x['title'])].append(x)
                    for v in x.get('versions', []):
                        by_title[title_key(v['title'])].append(x)
    linked = 0
    for a in areas:
        for g in a['groups'] + a['gated']:
            for x in g['entries']:
                if not x.get('related'):
                    continue
                rel = []
                for r in x['related']:
                    hits = [y for y in by_title.get(title_key(r), []) if y['id'] != x['id']]
                    hits.sort(key=lambda y: (y['book'] != x['book'], y['prevalence']))
                    rel.append({'text': r, **({'to': where[hits[0]['id']]} if hits else {})})
                    linked += bool(hits)
                x['related'] = rel

    def summary(g):
        es = g['entries']
        return {
            'id': g['id'], 'title': g['title'], **({'intro': g['intro']} if g.get('intro') else {}),
            'counts': [sum(for_audience(x, f) for x in es) for f in FILTERS],
            'books': list(dict.fromkeys(x['book'] for x in es))[:6],
            'sample': [x['title'] for x in es[:4]],
            'requires': list(dict.fromkeys(x['requires'] for x in es if x.get('requires')))[:3],
        }

    os.makedirs(OUT, exist_ok=True)
    for old in glob.glob(os.path.join(OUT, '*.json')):
        os.remove(old)
    total = len(entries)
    index = {'total': total, 'areas': [
        {'id': a['id'], 'title': a['title'], 'icon': a['icon'], 'intro': a['intro'],
         'groups': [summary(g) for g in a['groups']], 'gated': [summary(g) for g in a['gated']]}
        for a in areas]}
    with open(os.path.join(OUT, 'index.json'), 'w', encoding='utf-8') as fh:
        json.dump(index, fh, ensure_ascii=False, separators=(',', ':'))
    for a in areas:
        with open(os.path.join(OUT, f"{a['id']}.json"), 'w', encoding='utf-8') as fh:
            json.dump({'id': a['id'], 'groups': a['groups'], 'gated': a['gated']}, fh, ensure_ascii=False, separators=(',', ':'))
    print(f'wrote {OUT}: {total} mechanics in {len(areas)} areas ({moved} headings moved to their line, {len(dropped)} dropped, {bad_quotes} quotes not found, {len(number_flags)} summaries with numbers not in the text)')
    for a in areas:
        print(f"  {a['title']}: {sum(len(g['entries']) for g in a['groups'])} in {len(a['groups'])} groups, {sum(len(g['entries']) for g in a['gated'])} gated in {len(a['gated'])}")
    print(f'  {linked} "see also" notes link to another mechanic; {merged} repeated in another book were folded into one')
    print(f'  {added_abilities} Abilities added from the Ability list; {len(entries) - len(unplaced)} placed by the curation, {len(unplaced)} by the indexes\' topics; {len(dropped_by_hand)} dropped by hand')
    print(f'  topics the curation does not list: {len(stray)}')
    if '--stray' in sys.argv:
        print('\n'.join(stray))
    if report:
        print('\nDropped:'); print('\n'.join(dropped))
        print('\nSummaries to check:'); print('\n'.join(number_flags))


if __name__ == '__main__':
    main()
