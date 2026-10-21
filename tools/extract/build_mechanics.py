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
from collections import defaultdict

from books import BOOK_BY_ID, ROOT, book_path
from mechanics_topics import broad_topic

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
    ('Companions', r'companion'),
]
KIND_ORDER = [
    'Making any character', 'Magi', 'Companions', 'Grogs', 'Mythic Companions', 'Apprentices & young characters',
    'Careers: craftsmen, merchants, scholars & physicians', 'Animals & beasts', 'Magic characters & creatures',
    'Faerie characters', 'Divine & holy characters', 'Infernal & tainted characters', 'Hedge wizards & other traditions',
]
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


def main():
    report = '--report' in sys.argv
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
            start = line - 1
            end = section_end(lines, start, end_line)
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
                'book': book, 'line': line, **({'endLine': end_line} if end_line else {}),
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
            })

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

    # a topic with a mechanic or two in one area and many in another is read in that other area
    per_area = defaultdict(lambda: defaultdict(int))
    for x in entries:
        per_area[x['_topic']][x['_area']] += 1
    for x in entries:
        counts = per_area[x['_topic']]
        home = max(counts, key=counts.get)
        if x['_area'] != home and x['_area'] != 'creation' and home != 'creation' and counts[x['_area']] <= 2 and counts[home] >= 3:
            x['_area'] = home

    areas = []
    for aid, title, icon, intro in AREAS:
        mine = [x for x in entries if x['_area'] == aid]
        if aid == 'creation':
            # every rule for making a character, from any area, by the kind of character it makes
            def kind(x):
                hay = f"{x['_raw_topic']} {x['title']} {x.get('requires', '')}".lower()
                for name, pat in CREATION_KINDS:
                    if re.search(pat, hay):
                        return name
                return 'Making any character'
            # covenant and laboratory set-up have their own areas
            pool = [x for x in entries if x['_area'] == 'creation' or (x.get('creation') and x['_area'] not in ('covenant', 'lab'))]
            # in the order a troupe meets them: the core character types, then the beings of the other books
            rank = {n: i for i, n in enumerate(KIND_ORDER)}
            open_ = sorted(grouped([x for x in pool if x['prevalence'] < 4], kind, sections=True), key=lambda g: rank.get(g['title'], 99))
            gated = sorted(grouped([x for x in pool if x['prevalence'] == 4], kind, sections=True), key=lambda g: rank.get(g['title'], 99))
        else:
            open_ = grouped([x for x in mine if x['prevalence'] < 4], lambda x: x['_topic'])
            gated = grouped([x for x in mine if x['prevalence'] == 4], lambda x: x['_topic'])
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
    print(f'  {linked} "see also" notes link to another mechanic')
    if report:
        print('\nDropped:'); print('\n'.join(dropped))
        print('\nSummaries to check:'); print('\n'.join(number_flags))


if __name__ == '__main__':
    main()
