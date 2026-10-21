"""Broader topics for the mechanics reference.

The reading agents named a topic for each mechanic as they went, which left about a thousand
topics, many with one mechanic each. These rules gather them into the topics a player would look
under. They are tried in order and the first that matches the agent's topic (lower case) wins; a
topic no rule matches is kept as it is.
"""
import re

TOPIC_RULES = [
    # the Houses, wherever their rules are filed
    (r'heartbeast|bjornaer', 'House Bjornaer'),
    (r'house bonisagus', 'House Bonisagus'),
    (r'criamon|enigma|path of (seeming|strife|walking backwards|the body)', 'House Criamon'),
    (r'house flambeau', 'House Flambeau'),
    (r'house guernicus', 'House Guernicus'),
    (r'house jerbiton|jerbiton leagues', 'House Jerbiton'),
    (r'house mercere|mercere societies|^redcaps|mercere.s portals', 'House Mercere'),
    (r'house merinita', 'House Merinita'),
    (r'house tremere', 'House Tremere'),
    (r'house tytalus|titanoi|leper magi', 'House Tytalus'),
    (r'verditius', 'House Verditius'),
    (r'house acclaim|house lore|house virtues|^hermetic houses', 'Hermetic Houses'),
    # the basics
    (r'^dice|^ability rolls|^botches', 'Dice and rolls'),
    (r'^personality traits', 'Personality Traits'),
    (r'^confidence', 'Confidence'),
    # combat and hazards
    (r'medicin|chirurg|regimen|humors|apothecar|theriac|healing baths|childbirth|malformation|^healing', 'Medicine and healing'),
    (r'^disease|plant disease|poison', 'Disease and poison'),
    (r'wound|injury|non-combat damage', 'Wounds and recovery'),
    (r'armor|weapon|combat statistics', 'Arms and armor'),
    (r'mass combat|siege|battlefield', 'Mass combat and sieges'),
    (r'group combat|trained group|grog teams', 'Group combat and trained groups'),
    (r'mounted|charging|engagement|tactical movement|combat actions|combat options|^dodge|invisibility in combat|non-lethal', 'Combat actions and options'),
    (r'tournament', 'Tournaments'),
    (r'hunting|hawking|falconry|kennels', 'Hunting, hawking and kennels'),
    (r'taming|animal training|training animals|training creatures', 'Taming and training animals'),
    (r'mundane beasts', 'Mundane beasts'),
    (r'^travel|boats|sailing|ship combat|underwater', 'Travel'),
    (r'encumbrance', 'Encumbrance and equipment'),
    (r'deprivation|environmental temperatures|fire and hellfire', 'Deprivation and the elements'),
    (r'^warping|infernal warping|faerie warping|warping of|warping from', 'Warping'),
    # seasons
    (r'writing books|book copying|^books|books and|libraries|library|book quality|alternatives to books|translations|^folios|study sources|research from books', 'Books and libraries'),
    (r'^advancement|non-magus advancement|^study$|vis study|experience and advancement|academic learning', 'Advancement and study'),
    (r'craftsm|craft workshops|craft abilities|labor points|item damage and repair|locks and keys', 'Craftsmen and workshops'),
    (r'^artists?$|artist reputation|artist sponsors|legendary artists|^muses', 'Artists'),
    (r'universit|institutional education|disputatio|theological debate', 'Universities and learning'),
    (r'living conditions|longevity rituals|^aging|random lifespan', 'Aging and living conditions'),
    # society
    (r'church|ordination|benefice|canon law|preaching|tithes|indulgences|monastic|excommunication', 'The Church'),
    (r'noble|feudal|wardship|mesnie|^affinity', 'Nobility and feudal life'),
    (r'manor|fief|peasant|manumission|farming', 'Manors and peasants'),
    (r'merchant|^trade|money|prices|wealth|banking|bargain|^fairs|weights and measures|income bands|novelties|vis trade', 'Trade, money and wealth'),
    (r'^agen|agents and|criminals and agents|covenant agents', 'Agents and agencies'),
    (r'reputation', 'Reputations'),
    (r'intrigue|skullduggery|disguises|criminals', 'Intrigue and disguise'),
    (r'polemic|fourth estate|tribunal debate|^debate', 'Debate and polemics'),
    (r'courts|trials|legal', 'Courts and trials'),
    (r'famil|inheritance|marriage|dowr|heirs', 'Family, marriage and inheritance'),
    (r'feast|hospitality|leisure|courtly love|patronage|etiquette', 'Courtly life and hospitality'),
    # covenants
    (r'loyalty', 'Loyalty'),
    (r'covenant finances|covenant expenditure|covenant income|covenant upkeep|covenant bookkeeping|lab supplies shortage', 'Covenant finances'),
    (r'covenfolk|covenant grogs|covenant staffing|covenant officers|watch duty|rewards and punishments|death and burial', 'Covenfolk'),
    (r'governance|covenant charter|covenant organization|covenant rolls', 'Covenant governance and charters'),
    (r'boons and hooks|covenant situations|covenant sites|covenant boons', 'Boons and Hooks'),
    (r'covenant creation|covenant seasons|saga resources', 'Covenant creation'),
    (r'fortification', 'Fortifications'),
    (r'sanctum', 'Sanctum'),
    (r'(^|\b)vis\b(?! study)', 'Vis'),
    # Hermetic magic
    (r'spell mastery|mastery abilities', 'Spell Mastery'),
    (r'^penetration|arcane connection', 'Penetration and Arcane Connections'),
    (r'magic resistance|parma|mundane protection', 'Magic Resistance and Parma Magica'),
    (r'limits of magic|hermetic limits', 'Limits of Magic'),
    (r'spell parameters|targets and sizes|container targets|targeting', 'Range, Duration and Target'),
    (r'spell design|requisites|spell damage', 'Spell design and requisites'),
    (r'sigil|spell traces', 'Sigils and spell traces'),
    (r'certamen|dimicatio|wizards. melee', 'Certamen'),
    (r'cantations|forceless casting|ceremonial casting|group casting|casting tablets|casting in other languages|fatigue from casting|spell timing|casting tools', 'Casting options'),
    (r'^(animal|aquam|auram|corpus|herbam|ignem|imaginem|mentem|terram|vim) magic$|mentem and the inner|memory magic|species and perception', 'Magic by Form'),
    (r'medical magic', 'Medicine and healing'),
    (r'craft magic|magical craft|rego projectiles', 'Craft magic'),
    (r'^(aura|spirit|mentem magic) .*guidelines|^spell guidelines', 'New spell guidelines'),
    (r'ward', 'Wards'),
    (r'spirit magic|summoning spirits', 'Spirits and summoning'),
    (r'instant transportation|scrying|flight and fast', 'Travel and scrying magic'),
    (r'aura manipulation|aura and regio manipulation', 'Changing auras'),
    (r'breakthrough|original research|insight|integrat', 'Original research and integration'),
    (r'familiar', 'Familiars'),
    # the laboratory
    (r'laboratory personalization|laboratory virtues|laboratory design', 'Laboratory personalization'),
    (r'lab totals|lab activities|lab routines|^laboratory$', 'Lab Totals and activities'),
    (r'lab assistants|^apprentices$', 'Assistants and apprentices'),
    (r'shape and material|material bonuses|enchanting materials', 'Shape and Material bonuses'),
    (r'enchant|talisman|items of quality|attuned items|wondrous items', 'Enchanted items'),
    (r'lab(oratory)? texts', 'Lab texts'),
    (r'spell invention|spell learning', 'Inventing and learning spells'),
    (r'arcane experimentation|arcane discovery', 'Experimentation'),
    (r'alchemical reagents|astrological inceptions|^formulae|ligatures|experimental philosophy|pharmaceutical', 'Experimental philosophy'),
    # the Order
    (r'code of hermes|peripheral code|penalties|interference|tribunal law|sanctum law|selling magic|selling enchanted|selling magic items|apprentices and the code', 'Code of Hermes'),
    (r'tribunal|charters', 'Tribunals'),
    (r'quaesitor|researching magi', 'Quaesitores'),
    (r'wizard.?s.? war|wizard.?s march', "Wizards' War and the March"),
    # the realms
    (r'^(magic |infernal |divine |faerie |aligned |local )?auras?$|aura variation|auras and festivals|changing auras', 'Auras'),
    (r'regio', 'Regiones'),
    (r'entering faerie|faerie creativity|running faerie|faerie realm|faerie time|fable points|faerie sympathy|faerie calling|faerie arcane', 'The Faerie realm'),
    (r'magic realm|elysium|eudokia', 'The Magic realm'),
    (r'infernal realm|infernal influence|infernalists|corrupt orders|infernal corruption|infernal possession|infernal rites|infernal artifacts|vituperation|profaning|sin and redemption', 'The Infernal realm'),
    (r'dominion|divine realm|magic and the divine|holy influence|^saints|^relics', 'The Divine realm'),
    (r'miracle|god.s aid|holy figures|devotion|faith|divine ascent|holy powers|holy methods', 'Miracles and True Faith'),
    (r'sacrament|baptism|confession|exorcism|christian rites|pillars of islam|muslim religious', 'Sacraments and rites'),
    (r'realm interaction|^realms$|realm affiliation', 'The Realms and their interaction'),
    # beings
    (r'^faerie (characters|powers|taboos|advancement|glamour|pretenses|cognizance|vitality)|changelings|faerie blood', 'Faeries'),
    (r'^creature|creature creation', 'Creatures with Might'),
    (r'magic characters|magic kin|magic humans|magic spirits|magic qualities|magic character advancement|acclimation|^animae$|characters with might|magic(al)? creatures|magic powers|abilities for magical beings|essential traits', 'Magic characters and creatures'),
    (r'demon|infernal beings|tainted characters', 'Demons'),
    (r'spirit powers|airy spirits|daimon|spirits of place|underworld spirits|ghost|walking dead|revenants|spirit votaries', 'Spirits, daimons and ghosts'),
    (r'angels|divine beings|divine creatures|nephilim', 'Angels and divine beings'),
    # mysteries and traditions
    (r'mystery initiation|^initiation|self-initiation|mystery cults?$|mystery cult membership|founding a mystery|mystery cult lore|cult lore abilities', 'Mystery Cults and Initiation'),
    (r'dream magic|dream grimoire', 'Dream Magic'),
    (r'folk witch|witch bottles|^hex$|curse-throwing', 'Folk witches'),
    (r'nightwalker|fertility battles', 'Nightwalkers'),
    (r'vitkir|^rune magic', 'Vitkir rune magic'),
    (r'elementalist', 'Elementalists'),
    (r'learned magician|amulets and chartae|cunning-folk|mythic alchem|mythic herbalism', 'Learned Magicians'),
    (r'gruagach|geas and limit|trollsynir|kolduni', 'Gruagachan'),
    (r'hedge magic|hedge magical|opening the gift|hedge abilities|hedge character|favored abilities|designing supernatural|supernatural abilities \(ex misc', 'Hedge magic'),
    (r'faerie (bargaining|methods|traditions|charms|rites|ceremony|supernatural|wizardry)', 'Faerie wizards'),
    (r'holy tradition|holy magic|banishing|demon-hunters|merkavah|kabbalistic|jewish magical', 'Holy traditions'),
    (r'infernal traditions|goetia|goetic|infernal blessings|infernal ceremony|infernal sacrifice|summoning arts', 'Infernal traditions'),
]
_RULES = [(re.compile(p), name) for p, name in TOPIC_RULES]


def broad_topic(topic):
    t = topic.lower()
    for rx, name in _RULES:
        if rx.search(t):
            return name
    return topic
