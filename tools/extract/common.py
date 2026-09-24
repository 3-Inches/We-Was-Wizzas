"""Shared helpers for the markdown extractors."""
import json
import os
import re
import unicodedata

from books import ROOT

OUT_DIR = os.path.join(ROOT, "app", "src", "data", "generated")


def slug(text):
    text = unicodedata.normalize("NFKD", text)
    text = "".join(c for c in text if not unicodedata.combining(c))
    text = text.lower().replace("&", " and ")
    text = re.sub(r"[’'`ʿʾ]", "", text)
    text = re.sub(r"[^a-z0-9]+", "-", text).strip("-")
    return text


def github_anchor(heading_text):
    """Approximate the anchor GitHub/markdown renderers generate for a heading."""
    t = heading_text.strip().lower()
    t = re.sub(r"[^\w\- ]", "", t, flags=re.UNICODE)
    return t.replace(" ", "-")


def strip_quote(line):
    s = line
    while True:
        m = re.match(r"^\s*>\s?", s)
        if not m:
            return s
        s = s[m.end():]


def clean_inline(text):
    """Remove markdown decoration from a short label (heading/name)."""
    t = strip_quote(text).strip()
    t = re.sub(r"^#+\s*", "", t)
    t = re.sub(r"<br\s*/?>", "", t)
    t = t.replace("\\*", "*")
    t = re.sub(r"\*\*|__", "", t)
    t = t.strip().strip("*").strip()
    t = re.sub(r"\s+", " ", t)
    return t


def title_case_if_shouting(name):
    letters = [c for c in name if c.isalpha()]
    if letters and sum(1 for c in letters if c.isupper()) / len(letters) > 0.8:
        small = {"of", "the", "a", "an", "and", "or", "to", "in", "with", "for", "on", "at", "by", "from"}
        words = name.lower().split(" ")
        out = []
        for i, w in enumerate(words):
            if i > 0 and w in small:
                out.append(w)
            else:
                out.append(w[:1].upper() + w[1:])
        return " ".join(out)
    return name


def clean_body(lines):
    out = []
    for l in lines:
        s = strip_quote(l).rstrip()
        s = re.sub(r"<br\s*/?>\s*$", "", s)
        out.append(s)
    # trim blank lines at both ends and collapse runs
    text = "\n".join(out).strip()
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text


def write_json(name, data):
    os.makedirs(OUT_DIR, exist_ok=True)
    path = os.path.join(OUT_DIR, name)
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(data, fh, ensure_ascii=False, indent=1)
    print(f"wrote {path} ({len(data) if hasattr(data, '__len__') else ''})")


HEADING_RE = re.compile(r"^\s*(?:>\s*)*(#{1,6})\s+(.*)$")


def heading_of(line):
    m = HEADING_RE.match(line)
    if not m:
        return None
    return len(m.group(1)), m.group(2).strip()
