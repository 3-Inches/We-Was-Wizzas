"""Extract Hermetic spells and spell guidelines.

DE layout:
    ### Creo Animal Guidelines      (prose + | Level | guideline | table)
    ### Creo Animal Spells
    #### LEVEL 20
    ##### Soothe Pains of the Beast
    R: Touch, D: Mom, T: Ind, Ritual<br>
    Req: Rego<br>
    description...
    (Base level 15, +1 Touch)

Supplement layout (heuristic):
    #### Name
    MuAq(An) 20            or "MuAn Level 40" / "ReVi General"
    R: Touch, D: Moon, T: Ind
    description...
    (Base 5, +1 Touch)
"""
import re
from collections import Counter

from books import BOOKS, read_book
from common import clean_body, clean_inline, github_anchor, heading_of, slug, strip_quote, write_json

TECH = {"creo": "Cr", "intellego": "In", "muto": "Mu", "perdo": "Pe", "rego": "Re"}
FORM = {"animal": "An", "aquam": "Aq", "auram": "Au", "corpus": "Co", "herbam": "He", "ignem": "Ig",
        "imaginem": "Im", "mentem": "Me", "terram": "Te", "vim": "Vi"}
ALL_ARTS = {**TECH, **FORM}
ABBR = set(ALL_ARTS.values())

RDT_RE = re.compile(r"^R\s*:\s*(?P<r>.+?)\s*[,.;]?\s*\bD\s*:?\s*(?P<d>.+?)\s*[,.;]?\s*\bT\s*:\s*(?P<t>[^,<]+)(?P<rit>,\s*Ritual)?\s*(?:<br\s*/?>)?\s*(?P<tail>.*)$", re.I)

RANGE_NORM = {"pers": "Personal", "eve": "Eye", "per": "Personal", "personal": "Personal", "touch": "Touch", "eye": "Eye", "voice": "Voice",
              "sight": "Sight", "arc": "Arcane Connection", "arcane connection": "Arcane Connection",
              "arcane": "Arcane Connection", "road": "Road", "water-way": "Water-way"}
DUR_NORM = {"con": "Concentration", "const": "Constant", "dia": "Diameter", "spec": "Special", "mom": "Momentary", "momentary": "Momentary", "conc": "Concentration", "concentration": "Concentration",
            "diam": "Diameter", "diameter": "Diameter", "sun": "Sun", "ring": "Ring", "moon": "Moon",
            "year": "Year", "fire": "Fire", "bargain": "Bargain", "year+1": "Year + 1", "year + 1": "Year + 1",
            "special": "Special"}
TGT_NORM = {"str": "Structure", "circ": "Circle", "indi-": "Individual", "ind.": "Individual", "indiv": "Individual", "grp": "Group", "ind": "Individual", "individual": "Individual", "part": "Part", "group": "Group", "room": "Room",
            "struct": "Structure", "structure": "Structure", "bound": "Boundary", "boundary": "Boundary",
            "circle": "Circle", "taste": "Taste", "touch": "Touch", "smell": "Smell", "hearing": "Hearing",
            "vision": "Vision", "sight": "Vision", "bloodline": "Bloodline", "special": "Special"}


def norm(v, table):
    v = v.replace("*", "").strip().strip(",").strip()
    v = re.sub(r"\s+(Pen\s*[+-]?\d+|Req\s*:).*$", "", v)
    k = v.strip().strip(".").lower()
    return table.get(k, v.strip().strip("."))


def parse_req_names(text):
    out = []
    for w in re.split(r"[,/&]|\band\b", text):
        w = w.strip().strip(".").lower()
        w = re.sub(r"\(.*?\)", "", w).strip()
        if w in ALL_ARTS:
            out.append(ALL_ARTS[w])
        elif w.capitalize() in ABBR:
            out.append(w.capitalize())
    return out


ARTS_LINE = re.compile(
    r"^(?P<t>Cr|In|Mu|Pe|Re)\s*(?P<treq>\((?:[A-Za-z]{2}(?:\s*,\s*)?)+\))?\s*(?P<f>An|Aq|Au|Co|He|Ig|Im|Me|Te|Vi)"
    r"\s*(?P<freq>\([A-Za-z ,]+\))?\s*(?:Level\s*)?(?P<level>\d+|General|Gen)\b(?P<rest>.*)$")


def parse_arts_line(s):
    s = clean_inline(s)
    m = ARTS_LINE.match(s)
    if not m:
        return None
    rest = m.group("rest") or ""
    if re.search(r"/day|Pen\s*[+-]|\bpoints?\b|Init|Might cost|\bPersonal Power", rest):
        return None  # enchanted-item effect or creature power
    reqs = []
    for g in ("treq", "freq"):
        if m.group(g):
            inner = m.group(g).strip("()")
            for part in re.split(r"[,\s]+", inner):
                part = part.strip()
                if not part:
                    continue
                if part in ABBR:
                    reqs.append(part)
                elif part.lower() in ALL_ARTS:
                    reqs.append(ALL_ARTS[part.lower()])
    lvl = m.group("level")
    return {"technique": m.group("t"), "form": m.group("f"), "requisites": reqs,
            "level": None if lvl.lower().startswith("gen") else int(lvl), "general": lvl.lower().startswith("gen")}


# ---------------------------------------------------------------- enchanted-item effects
# Books set an item's effect out like a spell, with its Penetration and uses on a line of their own:
#     ReVi 53 / Pen +30, 6/day / R: Arcane Connection, D: Concentration, T: Individual
# That line may stand above the Arts line, between the Arts and R/D/T, at the end of R/D/T, or just
# after it; some books write only "Constant effect" or "Unlimited uses", or give the uses in the design
# alone ("Base 5, +1 Touch, +2 Sun; +1 for 2/day, +3 triggered at sunrise/set"). Such an effect is
# not a spell a magus can learn: it goes to enchantments.json, not the spell catalog.

PEN_MARK = re.compile(r"(?:^|\s)(?:\**Pen(?:etration)?\**\s*:?\**\s*(?:[+-]?\d+|n/a)|[+-]?\d+\s+Pen\b)", re.I)
USE_LINE = re.compile(r"^(?:constant effect|unlimited use[sd]?|\d+\s*(?:uses?\s*(?:/|per\s*)day|/\s*day))\.?$", re.I)
ITEM_DESIGN = re.compile(r";[^;]*(?:\d\s*/\s*day|uses? (?:per|/|a) ?day|\btriggered\b|environmental trigger|unlimited use|maintains? concentration)"
                         r"|;\s*Modifications\b|\blevels?\s+(?:\d+\s+)?Penetration\b", re.I)
USES = [(r"unlimited", "unlimited"), (r"\b50\b", "50"), (r"\b24\b", "24"), (r"\b12\b", "12"), (r"\bsix\b|\b6\b", "6"),
        (r"\btwelve\b", "12"), (r"\bthree\b|\b3\b", "3"), (r"\btwo\b|\b2\b", "2"), (r"\bonce\b|\bone\b|\b1\b", "1")]


def item_mark(line):
    """The item's Penetration-and-uses text, when this line is one; else None."""
    s = re.sub(r"<br\s*/?>", "", strip_quote(line)).replace("*", "").strip()
    if USE_LINE.match(s):
        return s.rstrip(".")
    m = PEN_MARK.search(s)
    if m and (m.start() == 0 or s[:m.start()].strip() == ""):
        return re.sub(r"^Pen(?:etration)?\s*:?\s*", "", s, flags=re.I).strip().rstrip(".,")
    return None


def item_terms(notes):
    """(Penetration, uses) from an item's notes: '+30, 6/day', '0 Pen, constant effect', 'n/a, unlimited'."""
    p = None if USE_LINE.match(notes) else re.match(r"^[+]?(\d+)", notes)  # "50/day" gives uses, not Penetration
    if re.search(r"constant", notes, re.I):
        uses = "constant"
    elif re.search(r"unlimited", notes, re.I):
        uses = "unlimited"
    else:
        um = re.search(r"(\d+)\s*(/\s*day|uses?|times|x)", notes) or re.search(r",\s*(\d+)\s*$", notes)
        uses = um.group(1) if um else next((v for pat, v in USES if re.search(pat, notes, re.I)), None)
    return (int(p.group(1)) if p else 0), uses


def parse_design(text):
    m = re.search(r"\((?:Effect:\s*)?(?:Base|base)\s*(?:level|effect)?\s*[:]?\s*(\d+|General|Gen)?[^()]*(?:\([^()]*\)[^()]*)*\)\s*$", text.strip())
    if not m:
        return None, text
    design = m.group(0).strip()
    base = None
    bm = re.search(r"[Bb]ase(?:\s+level|\s+effect)?\s*:?\s*(\d+)", design)
    if bm:
        base = int(bm.group(1))
    return {"text": re.sub(r"^Effect:\s*", "", design.strip("()")), "base": base}, text[:m.start()].rstrip()


def extract_de():
    text = read_book("DE")
    lines = text.split("\n")
    start = next(i for i, l in enumerate(lines) if l.strip() == "## Animal Spells")
    end = next(i for i in range(start, len(lines)) if lines[i].startswith("# Chapter 10"))
    spells, guidelines, notes = [], [], {}
    tech = form = None
    mode = None
    level = None
    general = False
    i = start
    while i < end:
        line = lines[i]
        h = heading_of(line)
        if h and not line.lstrip().startswith(">"):
            lvl, t = h
            m = re.match(r"^(Creo|Intellego|Muto|Perdo|Rego)\s+(\w+)\s+(Spells|Guidelines)$", t)
            if lvl == 3 and m:
                tech = TECH[m.group(1).lower()]
                form = FORM.get(m.group(2).lower())
                mode = m.group(3).lower()
                if mode == "guidelines":
                    # capture prose notes + table
                    j = i + 1
                    prose = []
                    while j < end and not lines[j].lstrip().startswith("|"):
                        if heading_of(lines[j]) and heading_of(lines[j])[0] <= 3:
                            break
                        prose.append(lines[j])
                        j += 1
                    notes[f"{tech}{form}"] = {"text": clean_body(prose), "source": {"book": "DE", "line": i + 1, "anchor": github_anchor(t)}}
                    while j < end and lines[j].lstrip().startswith("|"):
                        row = [c.strip() for c in lines[j].strip().strip("|").split("|")]
                        if len(row) >= 2 and re.match(r"^(\d+|General|Gen)$", row[0]):
                            items = [x.strip().lstrip("•").strip() for x in re.split(r"<br\s*/?>", row[1]) if x.strip()]
                            for it in items:
                                guidelines.append({"technique": tech, "form": form,
                                                   "level": None if not row[0].isdigit() else int(row[0]),
                                                   "general": not row[0].isdigit(), "text": it,
                                                   "source": {"book": "DE", "line": j + 1, "anchor": github_anchor(t)}})
                        j += 1
                    i = j
                    continue
                i += 1
                continue
            if lvl == 2 and re.match(r"^\w+ Spells$", t):
                i += 1
                continue
            if lvl == 4 and mode == "spells":
                lm = re.match(r"^LEVEL\s+(\d+)|^GENERAL", t, re.I)
                if lm:
                    level = int(lm.group(1)) if lm.group(1) else None
                    general = lm.group(1) is None
                i += 1
                continue
            if lvl == 5 and mode == "spells":
                name = clean_inline(t)
                # body until next heading level <=5
                j = i + 1
                body = []
                while j < end:
                    hh = heading_of(lines[j])
                    if hh and hh[0] <= 5 and not lines[j].lstrip().startswith(">"):
                        break
                    if lines[j].strip() == "---":
                        break
                    body.append(lines[j])
                    j += 1
                spell = parse_spell_body(name, body, tech, form, level, general, "DE", i)
                if spell:
                    spells.append(spell)
                i = j
                continue
        i += 1
    return spells, guidelines, notes


def parse_spell_body(name, body_lines, tech, form, level, general, book, line_no):
    # first non-empty line should be R/D/T
    k = 0
    while k < len(body_lines) and not body_lines[k].strip():
        k += 1
    if k >= len(body_lines):
        return None
    m = RDT_RE.match(strip_quote(body_lines[k]).strip())
    if not m:
        return None
    reqs = []
    k += 1
    # optional Req line(s)
    while k < len(body_lines):
        s = strip_quote(body_lines[k]).strip()
        rm = re.match(r"^(?:Req|Requisites?)\s*:?\s*(.*?)(?:<br\s*/?>)?$", s, re.I)
        if rm:
            reqs += parse_req_names(rm.group(1))
            k += 1
            continue
        break
    tail = (m.group("tail") or "").strip()
    rest = ([tail] if tail else []) + body_lines[k:]
    body = clean_body(rest)
    design, desc = parse_design(body)
    return {
        "id": slug(f"{name}-{tech}{form}-{level if level is not None else 'gen'}"),
        "name": name,
        "technique": tech,
        "form": form,
        "level": level,
        "general": general,
        "range": norm(m.group("r"), RANGE_NORM),
        "duration": norm(m.group("d"), DUR_NORM),
        "target": norm(m.group("t"), TGT_NORM),
        "ritual": bool(m.group("rit")),
        "requisites": reqs,
        "text": desc,
        "design": design["text"] if design else None,
        "base": design["base"] if design else None,
        "source": {"book": book, "line": line_no + 1, "anchor": github_anchor(name)},
    }


def is_note(s):
    """A line of notes, not a name: a sentence, or what an item cost to make."""
    return bool(re.match(r"^(Enchanted Item|Invested\b)", s, re.I)) or s.endswith(".") and len(s.split()) > 2 or len(s.split()) > 8


def extract_supplement(book_id):
    lines = read_book(book_id).split("\n")
    out = []
    n = len(lines)
    for i, line in enumerate(lines):
        s = strip_quote(line).strip()
        if not RDT_RE.match(s):
            continue
        # look back for arts line
        j = i - 1
        seen = 0
        arts = None
        arts_idx = None
        while j >= 0 and seen < 3:
            t = strip_quote(lines[j]).strip()
            if t:
                seen += 1
                a = parse_arts_line(re.sub(r"<br\s*/?>", "", t))
                if a:
                    arts, arts_idx = a, j
                    break
            j -= 1
        if not arts:
            continue
        # the item's marks: a line between the Arts and R/D/T, the end of R/D/T, the line after it,
        # or a line above the Arts (where it is not the name)
        notes = None
        # on the Arts line itself: "InMe 35, 0 penetration"
        am = re.search(r"\b\d+\s*,\s*([+-]?\d+\s+pen(?:etration)?\b.*)$", re.sub(r"<br\s*/?>", "", strip_quote(lines[arts_idx])), re.I)
        if am:
            notes = am.group(1).strip().rstrip(".")
        for k in range(arts_idx + 1, i):
            notes = notes or item_mark(lines[k])
        rdt_line = strip_quote(lines[i]).strip()
        pm = re.search(r"\s\bPen\b.*$", rdt_line)
        if pm and notes is None:
            notes = item_mark(pm.group(0).strip())
        after = i + 1
        while after < n and not strip_quote(lines[after]).strip():
            after += 1
        if after < n and notes is None and after - i <= 2:
            notes = item_mark(lines[after])
        # name above arts line, past an item's marks
        j = arts_idx - 1
        while j >= 0 and (not strip_quote(lines[j]).strip() or item_mark(lines[j])):
            if notes is None and strip_quote(lines[j]).strip():
                notes = item_mark(lines[j])
            j -= 1
        if j < 0:
            continue
        raw = strip_quote(lines[j]).strip()
        name = clean_inline(raw)
        # the name may end a line of notes: "This device costs 12 Build Points. Finding the Fleet",
        # "These are: Neptune's Imprisoning Arms"
        tail = re.search(r"[.:]\s+([A-Z][^.:]{2,60})$", name)
        if tail and len(tail.group(1).split()) <= 6:
            name = tail.group(1)
        elif is_note(name) and not heading_of(raw) and not re.match(r"^\*\*[^*]+\*\*", raw):
            # a note between the name and the Arts ("Enchanted Item, 3 pawns of Herbam vis, 1 Season
            # spent to invest", "-6 longevity ritual."): the name is the line above it, short of a
            # chapter's heading
            k = j - 1
            while k >= 0 and not strip_quote(lines[k]).strip():
                k -= 1
            above_raw = strip_quote(lines[k]).strip() if k >= 0 else ""
            above = clean_inline(above_raw)
            h = heading_of(above_raw)
            if above and not is_note(above) and len(above) <= 80 and not RDT_RE.match(above) and not (h and h[0] <= 2):
                name = above
        if re.search(r"\bpoints?\b.*\bInit\b", name):
            continue  # a creature's power, not a spell
        if not name or len(name) > 80 or re.match(r"^\(Base", name, re.I) or RDT_RE.match(name):
            continue
        name = re.sub(r"\s*\((Cr|In|Mu|Pe|Re)\w*\s*\d*\)\s*$", "", name)
        # "New Spell: The Twisted Spine", "Example Spell: …", "Talisman powers: Tongue of Beasts"
        name = re.sub(r"^(?:New|Example) (?:Spell|Ritual|Enchantment)\s*:\s*|^Talisman powers?\s*:\s*", "", name, flags=re.I)
        # body until design line or next heading / next spell
        body = []
        k = i
        while k < n:
            t = lines[k]
            if k > i:
                hh = heading_of(t)
                if hh:
                    break
                if parse_arts_line(re.sub(r"<br\s*/?>", "", strip_quote(t).strip())) and k + 2 < n:
                    # the next spell's name, in bold on the line above its Arts, is not this spell's text
                    while len(body) > 1 and not strip_quote(body[-1]).strip():
                        body.pop()
                    if len(body) > 1 and re.match(r"^\*\*[^*]{2,80}?(<br\s*/?>)?\*\*\s*(<br\s*/?>)?$", strip_quote(body[-1]).strip()):
                        body.pop()
                    break
            body.append(t)
            if k > i and re.match(r"^\s*(>\s*)?\((Effect:\s*)?(Base|base)\b", t):
                break
            k += 1
        if pm:
            body[0] = re.sub(r"\s\bPen\b.*$", "", body[0])
        body = [l for l in body if not item_mark(l)]
        spell = parse_spell_body(name, body, arts["technique"], arts["form"], arts["level"], arts["general"], book_id, j)
        if spell:
            spell["requisites"] = sorted(set(spell["requisites"] + arts["requisites"]))
            if notes is None and spell["design"] and ITEM_DESIGN.search(spell["design"]):
                # an item known only by its design: its modifiers are what follows the ";", or else
                # the Penetration counted in levels
                d = spell["design"]
                notes = d.split(";", 1)[1].strip() if ";" in d else re.search(r"[+]?\d+\s+levels?\s+(?:\d+\s+)?Penetration", d, re.I).group(0)
                spell["_from_design"] = True
            if notes is not None:
                spell["_item"] = notes
            out.append(spell)
    return out


def as_item(sp):
    """A spell-shaped record, made an enchantment as enchantments.json holds them."""
    notes = sp.pop("_item")
    pen, uses = item_terms(notes)
    if sp.pop("_from_design", False):
        # notes taken from the design: their numbers are levels, not Penetration. The Penetration is
        # there only when counted in levels: "+16 levels 32 Penetration", or "+11 levels Penetration"
        # (a level buys 2 points of Penetration).
        pm = re.search(r"\+(\d+)\s+levels?\s+(?:(\d+)\s+)?Penetration", notes, re.I)
        pen = int(pm.group(2) or 2 * int(pm.group(1))) if pm else 0
        um = re.search(r"(\d+)\s*/\s*day|(\w+)\s+uses?\s+(?:per|a|/)\s*day", notes, re.I)
        uses = (um.group(1) or item_terms(um.group(2))[1]) if um else None
    if uses is None and ";" in (sp.get("design") or "") or uses is None and "levels" in (sp.get("design") or ""):
        # the uses in the design's item modifiers, when the notes do not give them
        mods = (sp.get("design") or "").split(";")[-1]
        um = re.search(r"unlimited|(\d+)\s*/\s*day|(\w+)\s+uses?\s+(?:per|a|/)\s*day", mods, re.I)
        if um:
            uses = "unlimited" if um.group(0).lower().startswith("unlimited") else (um.group(1) or item_terms(um.group(2))[1])
    rec = {k: v for k, v in sp.items() if k not in ("id", "base")}
    rec.update({"id": slug(f"{sp['name']}-{sp['technique']}{sp['form']}-item"), "penetration": pen, "uses": uses, "itemNotes": notes})
    return rec


def main():
    spells, guidelines, notes = extract_de()
    print("DE spells", len(spells), "guidelines", len(guidelines))
    seen = {(s["name"].lower(), s["technique"], s["form"]) for s in spells}
    by_key = {(s["name"].lower(), s["technique"], s["form"]): s for s in spells}
    items = []
    for book in BOOKS:
        if not book[5] or book[0] == "DE":
            continue
        if book[0] == "HP":
            # Hermetic Projects sets a device out like a spell, with a "Pen:" line added: the
            # general pass would take every device for a spell (see extract_hp.py)
            from extract_hp import extract as extract_hp
            found, hp_items = extract_hp()
            items += hp_items
        else:
            found = extract_supplement(book[0])
            book_items = [sp for sp in found if "_item" in sp]
            found = [sp for sp in found if "_item" not in sp]
            # an item effect of no fixed level ("CrMe Gen") cannot go on an item as it is
            items += [as_item(sp) for sp in book_items if sp["level"] is not None]
        added = 0
        for sp in found:
            key = (sp["name"].lower(), sp["technique"], sp["form"])
            if key in seen:
                ex = by_key[key]
                if ex["source"]["book"] != sp["source"]["book"]:
                    ex.setdefault("alsoIn", [])
                    if sp["source"]["book"] not in [a["book"] for a in ex["alsoIn"]]:
                        ex["alsoIn"].append(sp["source"])
                continue
            seen.add(key)
            by_key[key] = sp
            base_id = sp["id"]
            sp["id"] = base_id
            spells.append(sp)
            added += 1
        print(f"{book[0]:7s} found {len(found):4d} added {added:4d}")
    ids = set()
    for it in items:
        base, k = it["id"], 2
        while it["id"] in ids:
            it["id"] = f"{base}-{k}"
            k += 1
        ids.add(it["id"])
    write_json("enchantments.json", items)
    print("enchantments", len(items), dict(Counter(it["source"]["book"] for it in items)))
    ids = set()
    for sp in spells:
        base = sp["id"]
        k = 2
        while sp["id"] in ids:
            sp["id"] = f"{base}-{k}"
            k += 1
        ids.add(sp["id"])
    write_json("spells.json", spells)
    write_json("guidelines.json", guidelines)
    write_json("guidelineNotes.json", notes)


if __name__ == "__main__":
    main()
