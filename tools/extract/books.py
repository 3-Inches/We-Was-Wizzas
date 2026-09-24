"""Registry of Ars Magica 5th Edition books in this repository.

Each entry maps a short id (used everywhere in the app as a source key) to the
markdown file, a display title, the common community abbreviation, a category,
and whether the markdown has been fully reviewed ("reviewed") or is still a
work-in-progress extraction ("wip").

The Definitive Edition supersedes the original ArM5 core book, so the older
core book is registered for the reference reader only (extract=False).
"""
import os

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))

BOOKS = [
    # id, file (relative to repo root), title, abbreviation, category, extract?
    ("DE", "reviewed/Ars Magica - Definitive Edition (Core Rules).md", "Ars Magica Definitive Edition", "DE", "core", True),
    ("ArM5", "wip/Ars Magica 5e - Core Rules.md", "Ars Magica 5th Edition (original core)", "ArM5", "core", False),
    ("AA", "reviewed/Ars Magica 5e - Art & Academe.md", "Art & Academe", "A&A", "social", True),
    ("CG", "reviewed/Ars Magica 5e - City & Guild.md", "City & Guild", "C&G", "social", True),
    ("Cov", "reviewed/Ars Magica 5e - Covenants.md", "Covenants", "Cov", "covenant", True),
    ("Grogs", "reviewed/Ars Magica 5e - Social - Grogs.md", "Grogs", "Grogs", "social", True),
    ("LoM", "reviewed/Ars Magica 5e - Lords of Men.md", "Lords of Men", "LoM", "social", True),
    ("Church", "reviewed/Ars Magica 5e - The Church.md", "The Church", "TC", "social", True),
    ("HoH_TL", "reviewed/Ars Magica 5e - Houses of Hermes - True Lineages.md", "Houses of Hermes: True Lineages", "HoH:TL", "houses", True),
    ("HoH_MC", "reviewed/Ars Magica 5e - Houses of Hermes - Mystery Cults.md", "Houses of Hermes: Mystery Cults", "HoH:MC", "houses", True),
    ("HoH_S", "reviewed/Ars Magica 5e - Houses of Hermes - Societates.md", "Houses of Hermes: Societates", "HoH:S", "houses", True),
    ("TMRE", "reviewed/Ars Magica 5e - The Mysteries (Revised).md", "The Mysteries (Revised Edition)", "TMRE", "magic", True),
    ("AM", "reviewed/Ars Magica 5e - Magic - Ancient Magic.md", "Ancient Magic", "AM", "magic", True),
    ("HMRE", "reviewed/Ars Magica 5e - Magic - Hedge Magic (Revised).md", "Hedge Magic (Revised Edition)", "HMRE", "magic", True),
    ("App", "reviewed/Ars Magica 5e - Magic - Apprentices.md", "Apprentices", "App", "magic", True),
    ("RM", "wip/Ars Magica 5e - Magic - Rival Magic.md", "Rival Magic", "RM", "magic", True),
    ("CC", "wip/Ars Magica 5e - Magic - The Cradle & the Crescent.md", "The Cradle & the Crescent", "C&C", "magic", True),
    ("HP", "wip/Ars Magica 5e - Magic - Hermetic Projects.md", "Hermetic Projects", "HP", "magic", True),
    ("MoH", "wip/Ars Magica 5e - Magi of Hermes.md", "Magi of Hermes", "MoH", "magic", True),
    ("LoH", "reviewed/Ars Magica 5e - Legends of Hermes.md", "Legends of Hermes", "LoH", "magic", True),
    ("RoP_M", "reviewed/Ars Magica 5e - Realms of Power - Magic.md", "Realms of Power: Magic", "RoP:M", "realms", True),
    ("RoP_F", "reviewed/Ars Magica 5e - Realms of Power - Faerie.md", "Realms of Power: Faerie", "RoP:F", "realms", True),
    ("RoP_D", "reviewed/Ars Magica 5e - Realms of Power - The Divine (Revised).md", "Realms of Power: The Divine (Revised)", "RoP:D", "realms", True),
    ("RoP_I", "reviewed/Ars Magica 5e - Realms of Power - The Infernal.md", "Realms of Power: The Infernal", "RoP:I", "realms", True),
    ("ML", "reviewed/Ars Magica 5e - Mythic Locations.md", "Mythic Locations", "ML", "setting", True),
    ("TME", "reviewed/Ars Magica 5e - Transforming Mythic Europe.md", "Transforming Mythic Europe", "TME", "setting", True),
    ("Hooks", "reviewed/Ars Magica 5e - Hooks.md", "Hooks", "Hooks", "setting", True),
    ("DI", "reviewed/Ars Magica 5e - Dies Irae - A Book of Wrathful Days.md", "Dies Irae", "DI", "setting", True),
    ("TtA", "wip/Ars Magica 5e - Through the Aegis - Developed Covenants.md", "Through the Aegis", "TtA", "covenant", True),
    ("LC", "wip/Ars Magica 5e - Living Covenant.md", "The Living Covenant", "LC", "covenant", True),
    ("Antag", "wip/Ars Magica 5e - Antagonists.md", "Antagonists", "Antag", "setting", True),
    ("MB", "wip/Ars Magica 5e - Mundane Beasts.md", "Mundane Beasts", "MB", "setting", True),
    ("ToP", "wip/Ars Magica 5e - Tales of Power.md", "Tales of Power", "ToP", "adventure", True),
    ("ToME", "wip/Ars Magica 5e - Tales of Mythic Europe.md", "Tales of Mythic Europe", "ToME", "adventure", True),
    ("TTT", "wip/Ars Magica 5e - Thrice-Told Tales.md", "Thrice-Told Tales", "TTT", "adventure", True),
    ("BCoC", "wip/Ars Magica 5e - Adventure - Broken Covenant of Calebais.md", "The Broken Covenant of Calebais", "BCoC", "adventure", True),
    # Tribunal books
    ("AtD", "reviewed/Ars Magica 5e - Against the Dark - The Transylvanian Tribunal.md", "Against the Dark (Transylvanian Tribunal)", "AtD", "tribunal", True),
    ("GotF", "reviewed/Ars Magica 5e - Guardians of the Forests - The Rhine Tribunal.md", "Guardians of the Forests (Rhine Tribunal)", "GotF", "tribunal", True),
    ("LaL", "reviewed/Ars Magica 5e - The Lion and the Lily - The Normandy Tribunal.md", "The Lion and the Lily (Normandy Tribunal)", "L&L", "tribunal", True),
    ("SE", "reviewed/Ars Magica 5e - The Sundered Eagle - The Theban Tribunal.md", "The Sundered Eagle (Theban Tribunal)", "SE", "tribunal", True),
    ("LotN", "reviewed/Ars Magica 5e - Lands of the Nile - Egypt, Ethiopia & Nubia.md", "Lands of the Nile", "LotN", "tribunal", True),
    ("FF", "wip/Ars Magica 5e - Faith & Flame - The Provencal Tribunal.md", "Faith & Flame (Provençal Tribunal)", "F&F", "tribunal", True),
    ("CI", "wip/Ars Magica 5e - The Contested Isle - The Hibernian Tribunal.md", "The Contested Isle (Hibernian Tribunal)", "CI", "tribunal", True),
    ("BSS", "wip/Ars Magica 5e - Between Sand & Sea - Mythic Africa.md", "Between Sand & Sea (Mythic Africa)", "BS&S", "tribunal", True),
]

BOOK_BY_ID = {b[0]: b for b in BOOKS}


def book_path(book_id):
    return os.path.join(ROOT, BOOK_BY_ID[book_id][1])


def read_book(book_id):
    with open(book_path(book_id), encoding="utf-8") as fh:
        return fh.read()
