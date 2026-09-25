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
    if re.search(r"/day|Pen\s*[+-]|\bpoints?\b|Init", rest):
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


def parse_design(text):
    m = re.search(r"\((?:Base|base)\s*(?:level|effect)?\s*[:]?\s*(\d+|General|Gen)?[^()]*(?:\([^()]*\)[^()]*)*\)\s*$", text.strip())
    if not m:
        return None, text
    design = m.group(0).strip()
    base = None
    bm = re.search(r"[Bb]ase(?:\s+level|\s+effect)?\s*:?\s*(\d+)", design)
    if bm:
        base = int(bm.group(1))
    return {"text": design.strip("()"), "base": base}, text[:m.start()].rstrip()


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
        # name above arts line
        j = arts_idx - 1
        while j >= 0 and not strip_quote(lines[j]).strip():
            j -= 1
        if j < 0:
            continue
        raw = strip_quote(lines[j]).strip()
        name = clean_inline(raw)
        if not name or len(name) > 80 or re.match(r"^\(Base", name, re.I) or RDT_RE.match(name):
            continue
        name = re.sub(r"\s*\((Cr|In|Mu|Pe|Re)\w*\s*\d*\)\s*$", "", name)
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
                    break
            body.append(t)
            if k > i and re.match(r"^\s*(>\s*)?\((Base|base)\b", t):
                break
            k += 1
        spell = parse_spell_body(name, body, arts["technique"], arts["form"], arts["level"], arts["general"], book_id, j)
        if spell:
            spell["requisites"] = sorted(set(spell["requisites"] + arts["requisites"]))
            out.append(spell)
    return out


def main():
    spells, guidelines, notes = extract_de()
    print("DE spells", len(spells), "guidelines", len(guidelines))
    seen = {(s["name"].lower(), s["technique"], s["form"]) for s in spells}
    by_key = {(s["name"].lower(), s["technique"], s["form"]): s for s in spells}
    for book in BOOKS:
        if not book[5] or book[0] == "DE":
            continue
        found = extract_supplement(book[0])
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
