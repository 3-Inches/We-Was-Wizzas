"""Extract covenant Hooks & Boons, laboratory Virtues/Flaws/Features, the Shape
and Material bonuses table, and weapon/armor tables."""
import re

from books import read_book
from common import clean_body, clean_inline, github_anchor, heading_of, slug, strip_quote, write_json

LAB_CHARS = ["Size", "Refinement", "General Quality", "Upkeep", "Safety", "Warping", "Health", "Aesthetics"]
SPEC_NAMES = {
    "cr": "Cr", "in": "In", "mu": "Mu", "pe": "Pe", "re": "Re", "an": "An", "aq": "Aq", "au": "Au", "co": "Co",
    "he": "He", "ig": "Ig", "im": "Im", "me": "Me", "te": "Te", "vi": "Vi",
    "creo": "Cr", "intellego": "In", "muto": "Mu", "perdo": "Pe", "rego": "Re", "animal": "An", "aquam": "Aq",
    "auram": "Au", "corpus": "Co", "herbam": "He", "ignem": "Ig", "imaginem": "Im", "mentem": "Me",
    "terram": "Te", "vim": "Vi",
    "experimentation": "Experimentation", "familiar": "Familiar", "items": "Items",
    "longevity rituals": "Longevity Rituals", "spells": "Spells", "teaching": "Teaching", "texts": "Texts",
    "vis extraction": "Vis Extraction",
}


def parse_lab_mods(text):
    """Parse '+1 Upkeep, -1 Health, -1 Aesthetics; +1 Te' into structured modifiers."""
    t = text.replace("–", "-").replace("—", "-").replace("−", "-")
    chars = {}
    for m in re.finditer(r"([+-]\s*\d+)\s+(" + "|".join(LAB_CHARS) + r")\b", t):
        chars[m.group(2)] = chars.get(m.group(2), 0) + int(m.group(1).replace(" ", ""))
    specs = {}
    spec_alts = "|".join(sorted(SPEC_NAMES, key=len, reverse=True))
    for m in re.finditer(r"([+-]\s*\d+)\s+(" + spec_alts + r")\b(?!\s+(?:or|and)\b)", t, re.I):
        key = SPEC_NAMES[m.group(2).lower()]
        if key in chars:
            continue
        specs[key] = specs.get(key, 0) + int(m.group(1).replace(" ", ""))
    free_points = None
    fm = re.search(r"(\d+)\s+points?\s+(?:on|among)\s+([^.;*]+)", t)
    choice = None
    if fm:
        free_points = int(fm.group(1))
        choice = fm.group(2).strip()
    om = re.search(r"([+-]\d+)\s+((?:\w+\s+or\s+)+\w+)\b", t)
    if om and not fm:
        choice = om.group(2)
        free_points = int(om.group(1))
    return {"characteristics": chars, "specializations": specs, "choicePoints": free_points,
            "choice": choice}


LAB_SECTION = re.compile(r"^(Major|Minor|Free)\s+(Structure|Outfittings|Supernatural)\s+(Virtues?|Flaws?)$")
DE_LAB_SECTION = re.compile(r"^(Virtues|Flaws)\s+\((Major|Minor|Free)\)$")


def extract_lab_vf(book_id, lines, start, end):
    out = []
    group = None
    size = kind = None
    for i in range(start, end):
        h = heading_of(lines[i])
        if h and not lines[i].lstrip().startswith(">"):
            t = clean_inline(h[1])
            m = LAB_SECTION.match(t)
            if m:
                size, group, kind = m.group(1), m.group(2), "virtue" if m.group(3).startswith("V") else "flaw"
                continue
            m2 = re.match(r"^(Structure|Outfittings|Supernatural) Virtues and Flaws$", t)
            if m2:
                group = m2.group(1)
                size = kind = None
                continue
            m3 = DE_LAB_SECTION.match(t)
            if m3:
                kind = "virtue" if m3.group(1).startswith("V") else "flaw"
                size = m3.group(2)
                continue
            if h[0] <= 3 and not m2:
                size = kind = None
            continue
        if not (size and kind and group):
            continue
        s = strip_quote(lines[i]).strip()
        em = re.match(r"^\*\*(.+?)\*\*\s*:?\s*(.*)$", s)
        if not em:
            continue
        raw_name = em.group(1).strip().rstrip(":").strip()
        rest = em.group(2).lstrip(":").strip()
        repeatable = raw_name.endswith("\\*") or raw_name.endswith("*")
        name = raw_name.replace("\\*", "").rstrip("*").strip()
        # modifiers are usually the trailing italic block, or the last sentence
        mods_txt = ""
        mm = re.search(r"\*([^*]*(?:[+–—-]\s*\d|points? (?:on|among))[^*]*)\*\.?\s*$", rest)
        if mm:
            mods_txt = mm.group(1)
            desc = rest[:mm.start()].strip()
        else:
            parts = re.split(r"(?<=\.)\s+(?=[+–—-]\d|\d+ points?|\+\()", rest)
            desc = parts[0].strip()
            mods_txt = " ".join(parts[1:]) if len(parts) > 1 else ""
            if not mods_txt:
                mm2 = re.search(r"((?:[+–—-]\s*\d+\s+[A-Z][\w ]+[,;]?\s*)+(?:\d+ points?[^.]*)?)\.?$", rest)
                if mm2:
                    mods_txt = mm2.group(1)
                    desc = rest[:mm2.start()].strip()
        mods = parse_lab_mods(mods_txt)
        out.append({
            "id": slug(name) + ("" if kind == "virtue" else "-flaw"),
            "name": name,
            "kind": kind,
            "size": size,
            "group": group,
            "repeatable": repeatable,
            "text": desc,
            "modText": mods_txt.strip().strip("*").strip(),
            "mods": mods,
            "source": {"book": book_id, "line": i + 1, "anchor": github_anchor(name)},
        })
    return out


def extract_features(book_id, lines, start, end):
    out = []
    for i in range(start, end):
        s = strip_quote(lines[i]).strip()
        m = re.match(r"^\*\*(.+?)\*\*\s*:?\s*(.*?)\s*Specializations?\s*:\s*(.+?)\.?\s*\*?$", s)
        if not m:
            continue
        name = m.group(1).strip().rstrip(":")
        specs = [SPEC_NAMES.get(x.strip().lower().strip("*. "), x.strip().strip("*. ")) for x in re.split(r",|\bor\b", m.group(3)) if x.strip()]
        out.append({"id": slug(name), "name": name, "text": m.group(2).strip().rstrip(".").strip("*").strip() + ".",
                    "specializations": [x for x in specs if x],
                    "source": {"book": book_id, "line": i + 1, "anchor": github_anchor(name)}})
    return out


def find_line(lines, pattern, start=0):
    for i in range(start, len(lines)):
        if re.match(pattern, lines[i]):
            return i
    raise ValueError(pattern)


def lab_data():
    de = read_book("DE").split("\n")
    s = find_line(de, r"^### Laboratory Virtues and Flaws")
    f = find_line(de, r"^### Laboratory Features", s)
    e = find_line(de, r"^### Magic Items for Laboratories", f)
    de_vf = extract_lab_vf("DE", de, s, f)
    de_feat = extract_features("DE", de, f, e)
    cov = read_book("Cov").split("\n")
    cs = find_line(cov, r"^### Laboratory Virtues and Flaws")
    cf = find_line(cov, r"^### Laboratory Features", cs)
    ce = find_line(cov, r"^### Magic Items for Laboratories", cf)
    cov_vf = extract_lab_vf("Cov", cov, cs, cf)
    cov_feat = extract_features("Cov", cov, cf, ce)
    vf = {x["id"]: x for x in de_vf}
    for x in cov_vf:
        if x["id"] in vf:
            vf[x["id"]].setdefault("alsoIn", []).append(x["source"])
        else:
            vf[x["id"]] = x
    feats = {x["id"]: x for x in de_feat}
    for x in cov_feat:
        if x["id"] not in feats:
            feats[x["id"]] = x
    print("lab V&F", len(vf), "features", len(feats))
    write_json("labVirtuesFlaws.json", list(vf.values()))
    write_json("labFeatures.json", list(feats.values()))


HB_SECTION = re.compile(r"^(Major|Minor)\s+(Site|Fortifications?|Resources?|Residents?|External Relations|Surroundings)\s+(Boons?|Hooks?)$")


def hooks_boons():
    out = {}
    # Covenants chapter 2
    cov = read_book("Cov").split("\n")
    s = find_line(cov, r"^# Chapter Two")
    e = find_line(cov, r"^# Chapter Three", s)
    size = kind = cat = None
    cur = None
    for i in range(s, e):
        line = cov[i]
        h = heading_of(line)
        if h and not line.lstrip().startswith(">"):
            t = clean_inline(h[1])
            m = HB_SECTION.match(t)
            if m:
                size, cat, kind = m.group(1), m.group(2), "boon" if m.group(3).startswith("B") else "hook"
                cat = {"Fortification": "Fortifications", "Resource": "Resources", "Resident": "Residents"}.get(cat, cat)
            elif h[0] <= 3:
                size = kind = None
            cur = None
            continue
        if not size:
            continue
        st = strip_quote(line).strip()
        if line.lstrip().startswith(">"):
            continue
        m = re.match(r"^\*\*(.+?)\*\*\s*:?\s*(.*)$", st)
        if m and len(m.group(1)) < 70:
            name = clean_inline(m.group(1)).rstrip(":").strip()
            req = None
            rm = re.search(r"\((?:requires?|prerequisite:?)\s+([^)]+)\)", name, re.I)
            if rm:
                req = rm.group(1)
                name = name[:rm.start()].strip()
            key = f"{kind}:{size}:{slug(name)}"
            cur = {"id": key.replace(":", "-"), "name": name, "kind": kind, "size": size, "category": cat,
                   "requires": req, "text": m.group(2).lstrip(":").strip(),
                   "source": {"book": "Cov", "line": i + 1, "anchor": github_anchor(name)}}
            out[key] = cur
        elif cur and st and not st.startswith("|"):
            cur["text"] += "\n\n" + st
    # DE list
    de = read_book("DE").split("\n")
    s = find_line(de, r"^### Hooks\s*$")
    e = find_line(de, r"^### Covenant Loyalty", s)
    size = kind = None
    cur = None
    for i in range(s, e):
        line = de[i]
        h = heading_of(line)
        if h and not line.lstrip().startswith(">"):
            t = clean_inline(h[1])
            m = re.match(r"^(Major|Minor) (Hooks|Boons)$", t)
            if m:
                size, kind = m.group(1), "boon" if m.group(2) == "Boons" else "hook"
            cur = None
            continue
        if not size:
            continue
        st = strip_quote(line).strip()
        m = re.match(r"^(?:\*\*)?([A-Z][\w' ]+?(?:\s*\((?:requires?)[^)]*\))?)(?:\*\*)?\s*:\s*(?:\*\*)?\s*(.*)$", st)
        if m and len(m.group(1)) < 60:
            name = m.group(1).strip()
            req = None
            rm = re.search(r"\((?:requires?)\s+([^)]+)\)", name, re.I)
            if rm:
                req = rm.group(1)
                name = name[:rm.start()].strip()
            key = f"{kind}:{size}:{slug(name)}"
            if key in out:
                # DE text is authoritative for rules text; keep Cov as alternate
                out[key]["deText"] = m.group(2)
                out[key].setdefault("alsoIn", []).append({"book": "DE", "line": i + 1, "anchor": github_anchor(name)})
                cur = None
            else:
                cur = {"id": key.replace(":", "-"), "name": name, "kind": kind, "size": size, "category": None,
                       "requires": req, "text": m.group(2),
                       "source": {"book": "DE", "line": i + 1, "anchor": github_anchor(name)}}
                out[key] = cur
        elif cur and st:
            cur["text"] += "\n\n" + st
    print("hooks & boons", len(out))
    write_json("hooksBoons.json", list(out.values()))


def shape_material():
    de = read_book("DE").split("\n")
    s = find_line(de, r"^### Shape and Material Bonuses Table")
    out = []
    i = s + 1
    while i < len(de) and not de[i].startswith("## "):
        row = de[i].strip()
        if row.startswith("|") and not re.match(r"^\|\s*-", row):
            cells = [c.strip() for c in row.strip("|").split("|")]
            if len(cells) >= 2 and cells[0] and cells[1]:
                name = re.sub(r"<br\s*/?>", " ", cells[0]).strip()
                bonuses = []
                for b in re.split(r"<br\s*/?>", cells[1]):
                    bm = re.match(r"^\s*\+?\s*(\d+)\s+(.+?)\s*$", b)
                    if bm:
                        bonuses.append({"bonus": int(bm.group(1)), "effect": bm.group(2)})
                if bonuses:
                    out.append({"id": slug(name), "name": name, "bonuses": bonuses})
        elif re.match(r"^#{2,3} ", de[i]) and i > s + 3 and not de[i].startswith("### Shape"):
            if de[i].startswith("## "):
                break
        i += 1
    print("shape/material", len(out))
    write_json("shapeMaterial.json", out)


def parse_table(lines, start):
    rows = []
    i = start
    while i < len(lines) and not lines[i].strip().startswith("|"):
        i += 1
    header = [c.strip() for c in lines[i].strip().strip("|").split("|")]
    i += 2
    while i < len(lines) and lines[i].strip().startswith("|"):
        rows.append([c.strip() for c in lines[i].strip().strip("|").split("|")])
        i += 1
    return header, rows


def to_num(v):
    v = v.replace("–", "-").replace("—", "-").strip()
    if v in ("n/a", "—", "-", ""):
        return None
    try:
        return int(v.replace("+", ""))
    except ValueError:
        return v


def weapons():
    de = read_book("DE").split("\n")
    ref = find_line(de, r"^## Combat Rules")
    ms = find_line(de, r"^### Missile Weapon Statistics", ref)
    ar = find_line(de, r"^### Armor Table", ref)
    me = find_line(de, r"^### Melee Weapon Statistics", ref)
    out = []
    _, rows = parse_table(de, me)
    for r in rows:
        name = r[0].replace("\\*", "").replace("*", "").strip()
        out.append({"id": slug(name), "name": name, "kind": "melee", "ability": r[1],
                    "init": to_num(r[2]), "atk": to_num(r[3]), "dfn": to_num(r[4]), "dam": to_num(r[5]),
                    "str": to_num(r[6]), "load": to_num(r[7]), "cost": r[8]})
    _, rows = parse_table(de, ms)
    for r in rows:
        name = r[0].replace("\\*", "").replace("*", "").strip()
        out.append({"id": slug(name) + "-missile", "name": name, "kind": "missile", "ability": r[1],
                    "init": to_num(r[2]), "atk": to_num(r[3]), "dfn": to_num(r[4]), "dam": to_num(r[5]),
                    "range": to_num(r[6]), "str": to_num(r[7]), "load": to_num(r[8]), "cost": r[9]})
    armor = []
    _, rows = parse_table(de, ar)
    for r in rows:
        armor.append({"id": slug(r[0]), "name": r[0], "partialProt": to_num(r[1]), "partialLoad": to_num(r[2]),
                      "fullProt": to_num(r[3]), "fullLoad": to_num(r[4]), "cost": r[5]})
    for w in out:
        w["ability"] = {"Single": "Single Weapon", "Great": "Great Weapon", "Thrown": "Thrown Weapon",
                        "Bow": "Bows"}.get(w["ability"], w["ability"])
    print("weapons", len(out), "armor", len(armor))
    write_json("weapons.json", out)
    write_json("armor.json", armor)


if __name__ == "__main__":
    lab_data()
    hooks_boons()
    shape_material()
    weapons()
