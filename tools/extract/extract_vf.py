"""Extract Virtues and Flaws from every 5th Edition book.

Recognised entry shapes (the corpus is not uniform):

  A. name line (heading or bold) followed by an italic/bold "type line":
        #### Puissant Ability
        *Minor, General*<br>
  B. a heading that carries both the name and the type:
        ### Spell Binding — Minor Hermetic Virtue
        #### Major Supernatural Virtue: Warding
        #### ALL ACCORDING TO PLAN (MINOR GENERAL VIRTUE)
        #### Major General Flaw: Leprosy

The Definitive Edition is authoritative; supplement entries whose name matches
a DE entry are recorded as alternate sources on the DE entry instead of being
added twice.
"""
import re
from collections import OrderedDict

from books import BOOKS, read_book
from common import (clean_body, clean_inline, github_anchor, heading_of, slug,
                    strip_quote, title_case_if_shouting, write_json)

SIZE = r"(?:Major|Minor|Free)"
CATS = {
    "general": "General",
    "hermetic": "Hermetic",
    "supernatural": "Supernatural",
    "social status": "Social Status",
    "social": "Social Status",
    "status": "Social Status",
    "personality": "Personality",
    "story": "Story",
    "mythic companion": "Mythic Companion",
    "heroic": "Heroic",
    "mystery": "Mystery",
    "special": "Special",
    "structure": "Structure",
}
CAT_WORDS = "|".join(sorted(CATS, key=len, reverse=True))

TYPE_CORE = re.compile(
    rf"^(?P<size>{SIZE}(?:\s*(?:or|/)\s*{SIZE})?)\s*,?\s*(?P<rest>.*)$", re.I)


def parse_type(text):
    """Parse 'Minor, General, Tainted' / 'Major or Minor Supernatural Virtue' etc.

    Returns dict(sizes, categories, kind, tainted, notes) or None.
    """
    t = clean_inline(text)
    t = t.strip("()").strip()
    m = TYPE_CORE.match(t)
    if not m:
        return None
    sizes = []
    for s in re.findall(SIZE, m.group("size"), re.I):
        s = s.capitalize()
        if s not in sizes:
            sizes.append(s)
    rest = m.group("rest")
    kind = None
    if re.search(r"\bvirtues?\b", rest, re.I):
        kind = "virtue"
    if re.search(r"\bflaws?\b", rest, re.I):
        kind = "flaw" if kind is None else kind
    rest_clean = re.sub(r"\b(virtues?|flaws?|new)\b", "", rest, flags=re.I)
    cats = []
    for c in re.findall(rf"\b({CAT_WORDS})\b", rest_clean, re.I):
        norm = CATS[c.lower()]
        if norm not in cats:
            cats.append(norm)
    tainted = bool(re.search(r"tainted", rest, re.I))
    if not cats and not tainted:
        return None
    # Anything left over (e.g. "animals only", "(Divine)", "Power") is kept as a note.
    leftovers = re.sub(rf"\b({CAT_WORDS}|tainted|and|or)\b", "", rest_clean, flags=re.I)
    leftovers = re.sub(r"[,&()/]+", " ", leftovers)
    leftovers = re.sub(r"\s+", " ", leftovers).strip()
    return {
        "sizes": sizes,
        "categories": cats,
        "kind": kind,
        "tainted": tainted,
        "notes": leftovers or None,
    }


def is_type_line(line):
    s = strip_quote(line).strip()
    s = re.sub(r"<br\s*/?>$", "", s).strip()
    if not s or len(s) > 90:
        return None
    # must be wrapped in emphasis (italic or bold), or be a bare short "Minor, Hermetic"
    m = re.match(r"^(\*{1,2}|_)(.+?)(\*{1,2}|_)\.?$", s)
    inner = m.group(2) if m else s
    if not m and not re.match(rf"^{SIZE}\b", s, re.I):
        return None
    if not m and not re.match(rf"^{SIZE}(\s*(or|/)\s*{SIZE})?\s*,", s, re.I):
        return None
    return parse_type(inner)


COMBINED_PATTERNS = [
    # Name — Minor Hermetic Virtue
    re.compile(rf"^(?P<name>.+?)\s+[—–-]+\s+(?P<type>{SIZE}.*?(?:Virtue|Flaw)s?)\s*$", re.I),
    # (New) Major Supernatural Virtue: Name
    re.compile(rf"^(?:New\s+)?(?P<type>{SIZE}[^:]*?(?:Virtue|Flaw))\s*:\s*(?P<name>.+)$", re.I),
    # Name (Minor General Virtue)
    re.compile(rf"^(?P<name>.+?)\s*\((?P<type>{SIZE}[^)]*?(?:Virtue|Flaw))\)\s*$", re.I),
]


def parse_combined_heading(text):
    t = clean_inline(text)
    for pat in COMBINED_PATTERNS:
        m = pat.match(t)
        if m:
            info = parse_type(m.group("type"))
            if info and info["kind"]:
                name = m.group("name").strip().rstrip(":").strip()
                if 1 < len(name) < 70:
                    return title_case_if_shouting(name), info
    return None


def section_kind(heading_stack):
    """Look at enclosing headings for a hint of Virtue vs Flaw."""
    for _, text in reversed(heading_stack):
        low = text.lower()
        has_v = "virtue" in low
        has_f = "flaw" in low
        if has_v and not has_f:
            return "virtue"
        if has_f and not has_v:
            return "flaw"
    return None


def name_from_line(line):
    h = heading_of(line)
    if h:
        return clean_inline(h[1]), h[0]
    s = strip_quote(line).strip()
    m = re.match(r"^\*\*(.+?)\*\*:?\s*(<br\s*/?>)?$", s)
    if m:
        return clean_inline(m.group(1)), 7
    return None, None


BAD_NAMES = re.compile(
    r"^(example|virtues?|flaws?|virtues and flaws|characteristics|abilities|powers?|"
    r"note|notes|design|soak|equipment|personality traits?|reputations?|"
    r"major|minor|free|new virtues?|new flaws?|table of contents)$", re.I)


def extract_book(book_id, text):
    lines = text.split("\n")
    entries = []
    heading_stack = []  # (level, text)
    starts = []  # indices of entry starts for body termination
    i = 0
    n = len(lines)
    while i < n:
        line = lines[i]
        h = heading_of(line)
        if h:
            level, htext = h
            while heading_stack and heading_stack[-1][0] >= level:
                heading_stack.pop()
            heading_stack.append((level, htext))
            combo = parse_combined_heading(htext)
            if combo:
                name, info = combo
                entries.append({"line": i, "name": name, "level": level, "info": info,
                                "body_start": i + 1, "ctx": list(heading_stack[:-1])})
                i += 1
                continue
        info = is_type_line(line)
        if info:
            # previous non-empty line is the name
            j = i - 1
            while j >= 0 and not strip_quote(lines[j]).strip():
                j -= 1
            if j >= 0:
                name, level = name_from_line(lines[j])
                if name and not BAD_NAMES.match(name) and 1 < len(name) < 70 and not name.endswith(":"):
                    entries.append({"line": j, "name": title_case_if_shouting(name), "level": level,
                                    "info": info, "body_start": i + 1,
                                    "ctx": [x for x in heading_stack if not (x[1] == strip_quote(lines[j]).lstrip('#').strip())]})
        i += 1

    # Determine body extents: until the next entry or a heading of level <= entry level.
    entry_lines = sorted(e["line"] for e in entries)
    result = []
    for e in entries:
        start = e["body_start"]
        end = n
        for k in range(start, n):
            if k in entry_lines_set(entry_lines) and k >= start:
                end = k
                break
            hh = heading_of(lines[k])
            if hh and hh[0] <= min(e["level"], 6):
                end = k
                break
            if lines[k].strip() == "---":
                end = k
                break
        body_lines = lines[start:end]
        # Drop a following "name/type" pair that belongs to an unrecognised entry: cap length
        body = clean_body(body_lines)
        if len(body) > 12000:
            body = body[:12000] + "\n\n…"
        info = e["info"]
        kind = info["kind"] or section_kind(e["ctx"])
        if not kind:
            if set(info["categories"]) & {"Story", "Personality"}:
                kind = "flaw"
        result.append({
            "name": e["name"],
            "kind": kind,
            "sizes": info["sizes"],
            "categories": info["categories"],
            "tainted": info["tainted"],
            "notes": info["notes"],
            "text": body,
            "source": {"book": book_id, "line": e["line"] + 1, "anchor": github_anchor(e["name"])},
        })
    return result


_set_cache = {}


def entry_lines_set(lst):
    key = id(lst)
    if key not in _set_cache:
        _set_cache.clear()
        _set_cache[key] = set(lst)
    return _set_cache[key]


def normalize_name(name):
    n = name.lower()
    n = re.sub(r"^(new\s+)?(virtue|flaw)\s*:\s*", "", n)
    n = n.replace("’", "'")
    n = re.sub(r"[^a-z0-9]+", " ", n).strip()
    return n


def main():
    all_entries = OrderedDict()
    by_norm = {}
    stats = {}
    # DE first so it is authoritative
    ordered = sorted([b for b in BOOKS if b[5]], key=lambda b: 0 if b[0] == "DE" else 1)
    for book in ordered:
        book_id = book[0]
        text = read_book(book_id)
        if book_id == "DE":
            # restrict to the Virtues/Flaws chapter plus bestiary "New Virtues and Flaws"
            found = extract_de(text)
        else:
            found = extract_book(book_id, text)
        added = 0
        for e in found:
            if not e["kind"]:
                continue
            pm = re.match(r"^(?:New\s+)?(Virtue|Flaw)\s*:\s*", e["name"], flags=re.I)
            if pm:
                e["kind"] = pm.group(1).lower()
                e["name"] = e["name"][pm.end():].strip()
            if "Structure" in e["categories"] or BAD_NAMES.match(e["name"]) or re.match(r"^forbidden\b", e["name"], re.I):
                continue
            if re.search(r",\s*continued$", e["name"], re.I):
                continue
            norm = (normalize_name(e["name"]), e["kind"])
            if norm in by_norm:
                existing = all_entries[by_norm[norm]]
                if e["source"]["book"] != existing["source"]["book"]:
                    alts = existing.setdefault("alsoIn", [])
                    if e["source"]["book"] not in [a["book"] for a in alts]:
                        alts.append(e["source"])
                continue
            base_id = slug(e["name"]) + ("" if e["kind"] == "virtue" else "-flaw")
            vid = base_id
            k = 2
            while vid in all_entries:
                vid = f"{base_id}-{k}"
                k += 1
            e["id"] = vid
            all_entries[vid] = e
            by_norm[norm] = vid
            added += 1
        stats[book_id] = (len(found), added)
    for k, v in stats.items():
        print(f"{k:8s} found {v[0]:4d} added {v[1]:4d}")
    data = list(all_entries.values())
    # stable key order
    out = []
    for e in data:
        out.append({k: e[k] for k in ["id", "name", "kind", "sizes", "categories", "tainted", "notes",
                                      "text", "source"] if k in e} | ({"alsoIn": e["alsoIn"]} if "alsoIn" in e else {}))
    write_json("virtuesFlaws.json", out)


def extract_de(text):
    lines = text.split("\n")
    # Find chapter boundaries
    def find(pat, start=0):
        for i in range(start, len(lines)):
            if re.match(pat, lines[i]):
                return i
        raise ValueError(pat)
    v_start = find(r"^## Virtues\s*$")
    f_start = find(r"^## Flaws\s*$", v_start)
    f_end = find(r"^# Chapter 5", f_start)
    res = []
    for start, end, kind in [(v_start, f_start, "virtue"), (f_start, f_end, "flaw")]:
        chunk = "\n".join(lines[start:end])
        for e in extract_book("DE", chunk):
            e["kind"] = kind
            e["source"]["line"] += start
            res.append(e)
    # Mythic companion / bestiary virtues elsewhere in DE (e.g. Creatures of Faerie new V&F)
    for e in extract_book("DE", "\n".join(lines[f_end:])):
        if e["kind"]:
            e["source"]["line"] += f_end
            res.append(e)
    for e in extract_book("DE", "\n".join(lines[:v_start])):
        if e["kind"]:
            res.append(e)
    return res


if __name__ == "__main__":
    main()
