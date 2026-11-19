// Where the app does what a mechanics topic describes, so a reader of the rules can go and use them.
// Keyed by the topic ids of the mechanics reference; a `page` is linked (for the active saga), the
// rest name a tab or card of a character or covenant sheet.

export type AppPage = 'saga' | 'seasons' | 'market' | 'spells' | 'enchant' | 'build' | 'dice' | 'table' | 'guild' | 'people' | 'covenants' | 'tribunal';

export interface AppPlace {
  text: string;
  page?: AppPage;
  /** the page's tab to open */
  tab?: string;
}

const SHEET = 'Character sheet';
const COV = 'Covenant';
const CREATURES: AppPlace = { text: 'Quick build → Creatures & encounters', page: 'build', tab: 'creatures' };
const HOUSE: AppPlace = { text: 'Character wizard → House' };
const MYSTERIES: AppPlace = { text: `${SHEET} → Seasons & Aging → Mysteries & Initiation` };
const HEDGE: AppPlace = { text: 'Game Table › Dice › Hedge magic: the tradition’s rolls', page: 'dice', tab: 'hedge' };
const HEDGE_SEASONS: AppPlace = { text: 'Game Table › Seasons → a season in full: the tradition’s seasons of work, their vis from the stores', page: 'seasons' };
const HEDGE_SHEET = (what: string): AppPlace => ({ text: `${SHEET} → Overview → ${what} (the apprenticeship, and what is known)` });
const FAERIE: AppPlace = { text: 'Game Table › Dice › Faerie: rites, bargaining with faeries, Faerie Calling', page: 'dice', tab: 'faerie' };
const MYSTERY_TABLE = (what: string): AppPlace => ({ text: `Game Table › Dice › Mysteries: ${what}`, page: 'dice', tab: 'mysteries' });
const HOLY_PAGE: AppPlace = { text: 'Game Table › Dice › Faith & miracles', page: 'dice', tab: 'holy' };
const LAB = (what: string): AppPlace => ({ text: `Game Table › Seasons → Lab projects: ${what}`, page: 'seasons' });

export const APP_PLACES: Record<string, AppPlace[]> = {
  // the basics and creation
  'dice-and-rolls': [{ text: 'Game Table → Dice', page: 'dice' }],
  characteristics: [{ text: 'Character wizard → Characteristics' }],
  abilities: [{ text: 'Character wizard → Abilities' }, { text: `${SHEET} → Abilities` }],
  'personality-traits': [{ text: 'Character wizard → Personality & Gear' }],
  reputations: [{ text: 'Character wizard → Personality & Gear' }],
  confidence: [{ text: `${SHEET} → Overview → Standing` }],
  'virtues-and-flaws': [{ text: 'Character wizard → Virtues & Flaws' }],
  size: [{ text: 'Character wizard → Characteristics (Size)' }, { text: `${SHEET} → Stat block` }],
  'the-character-sheet': [{ text: `${SHEET}: its tabs, and the Stat block` }],
  'kinds-of-characters': [{ text: 'People → Create a character', page: 'people' }],
  'making-any-character': [{ text: 'People → Create a character', page: 'people' }],
  magi: [{ text: 'People → Create a character → Magus', page: 'people' }],
  companions: [{ text: 'People → Create a character → Companion', page: 'people' }],
  grogs: [{ text: 'People → Create a character → Grog', page: 'people' }, { text: `${COV} → Covenfolk, Finances & Loyalty → The turb's day` }],
  'mythic-companions': [{ text: 'People → Create a character → Mythic Companion', page: 'people' }],
  'making-any-character-gated': [{ text: 'Character wizard → Virtues & Flaws (the Virtues and Flaws these books add)' }],
  'magi-gated': [HOUSE, MYSTERIES, { text: 'Game Table › Seasons → a season in full → Spell Mastery', page: 'seasons' }],
  'nobles-and-clergy': [{ text: 'Character wizard → Virtues & Flaws (Social Status for nobles and clergy, and Monastic Vows)' }],
  'nobles-and-clergy-gated': [{ text: 'Character wizard → Virtues & Flaws (Social Status: nobles, knights, clergy)' }],
  'apprentices-young-characters': [{ text: `${SHEET} → Overview → Apprentice (finding one, opening the Arts, teaching)` }, { text: 'Game Table › Seasons → a season in full: teaching the apprentice', page: 'seasons' }],
  'apprentices-young-characters-gated': [{ text: `${SHEET} → Overview → Apprentice` }, { text: `${COV} → Covenfolk, Finances & Loyalty: a craftsman’s guild rank, from apprentice up` }],
  'infernal-tainted-characters': [{ text: 'Character wizard → Virtues & Flaws (Tainted Virtues and Flaws are marked)' }, CREATURES],
  'infernal-tainted-characters-gated': [{ text: 'Character wizard → Virtues & Flaws (Tainted Virtues and Flaws are marked)' }, CREATURES],
  'careers-craftsmen-merchants-scholars-physicians': [{ text: 'Game Table → City & Guild → A character’s livelihood', page: 'guild' }],
  'careers-craftsmen-merchants-scholars-physicians-gated': [{ text: 'Game Table → City & Guild → A character’s livelihood: the workshop and the guild', page: 'guild' }],
  'animals-beasts': [CREATURES],
  'divine-holy-characters': [{ text: `${SHEET} → Overview → True Faith` }],
  'divine-holy-characters-gated': [{ text: `${SHEET} → Overview → True Faith` }, { text: 'Supernatural powers (holy powers)' }],
  'magic-characters-creatures': [{ text: `${SHEET} → Overview → Creature (Realms of Power: Magic)` }],
  'magic-characters-creatures-gated': [{ text: `${SHEET} → Overview → Creature (Realms of Power: Magic)` }],
  'magic-characters-and-creatures': [{ text: `${SHEET} → Overview → Creature (Realms of Power: Magic)` }],
  'the-houses-of-hermes': [HOUSE],
  'house-bjornaer': [HOUSE, MYSTERIES],
  'house-bonisagus': [HOUSE],
  'house-criamon': [HOUSE, { text: `${SHEET} → Seasons & Aging → Mysteries & Initiation (the Paths)` }],
  'house-flambeau': [HOUSE],
  'house-guernicus': [HOUSE],
  'house-jerbiton': [HOUSE],
  'house-mercere': [HOUSE],
  'house-tremere': [HOUSE],
  'house-tytalus': [HOUSE],
  'house-verditius': [HOUSE, MYSTERIES],
  'ex-miscellanea-traditions': [{ text: 'Character wizard → House → Ex Miscellanea' }],
  'schools-of-magical-combat': [{ text: 'Character wizard → House → Flambeau: a school’s Virtue (an optional rule)' }, { text: `${SHEET} → Magic → Penetration` }],
  'sigils-and-spell-traces': [{ text: 'Character wizard → Personality & Gear (Wizard’s sigil)' }, { text: `${SHEET} → Overview` }],
  // combat
  combat: [{ text: `${SHEET} → Combat & Health` }],
  'combat-options': [{ text: `${SHEET} → Combat & Health → Combat rolls` }],
  'group-combat': [{ text: `${SHEET} → Combat & Health → Fighting as a group` }],
  'arms-and-armor': [{ text: 'Character wizard → Personality & Gear' }],
  'wounds-and-recovery': [{ text: `${SHEET} → Combat & Health → Wounds (and the covenant's aura, if it heals or festers)` }],
  fatigue: [{ text: `${SHEET} → Combat & Health → Fatigue` }],
  'encumbrance-and-carrying': [{ text: 'Character wizard → Personality & Gear' }, { text: `${SHEET} → Combat & Health → Weapons, armor & combat` }],
  'other-hazards': [{ text: 'Game Table › Dice › Combat & perils → Perils: falls, fire, poison, going without', page: 'dice', tab: 'combat' }],
  travel: [{ text: 'Game Table → City & Guild → Travel, trade and intrigue: a journey’s days and cost, cargo, Area Lore, ships in a fight', page: 'guild' }, { text: 'Game Table → Market & Treasury → Services and hospitality (travel and lodging)', page: 'market' }],
  'disease-and-poison': [{ text: `${SHEET} → Combat & Health → Illness (and disease in a town)` }, { text: `${SHEET} → Seasons & Aging → aging: bad-air trades, mines, leper colonies` }],
  'medicine-and-healing': [{ text: `${SHEET} → Combat & Health → Illness and Wounds` }],
  // seasons
  'experience-and-advancement': [
    { text: `${SHEET} → Seasons & Aging → Plan a season` },
    { text: `${SHEET} → Seasons & Aging → When nothing is planned (free and working seasons)` },
    { text: 'Game Table → Seasons', page: 'seasons' },
  ],
  'books-and-reading': [{ text: `${SHEET} → Seasons & Aging → Plan a season; Writing and copying` }, { text: `${COV} → Library & Vis (the scriptorium)` }],
  'training-animals-and-creatures': [{ text: `${SHEET} → Lab, Items & Familiar → Lab projects (Tame)` }],
  'aging-and-living-conditions': [{ text: `${SHEET} → Seasons & Aging → Aging` }, { text: 'Game Table → Seasons (the year’s end)', page: 'seasons' }],
  warping: [{ text: `${SHEET} → Seasons & Aging → Warping & Twilight` }],
  // magic
  'the-gift-and-the-hermetic-arts': [{ text: `${SHEET} → Magic → Arts` }],
  'casting-spells': [{ text: `${SHEET} → Magic → Spells` }],
  'casting-options': [{ text: `${SHEET} → Magic → Circumstances` }],
  'penetration-and-arcane-connections': [{ text: `${SHEET} → Magic → Penetration` }],
  'magic-resistance-and-parma-magica': [{ text: `${SHEET} → Magic → Arts (Magic Resistance)` }],
  'range-duration-and-target': [{ text: 'Spells & design → Design a spell', page: 'spells' }],
  'spell-design': [{ text: 'Spells & design → Design a spell', page: 'spells' }],
  'spells-by-form': [{ text: 'Spells & design → Browse spells', page: 'spells' }],
  'spell-guidelines-from-other-books': [{ text: 'Spells & design → Guidelines', page: 'spells' }],
  'spell-mastery': [{ text: 'Game Table → Seasons → a season in full → Spell Mastery', page: 'seasons' }, { text: `${SHEET} → Magic → Spells (the score and abilities)` }],
  certamen: [{ text: `${SHEET} → Magic → Certamen` }],
  'wizard-s-twilight': [{ text: `${SHEET} → Seasons & Aging → Warping & Twilight` }],
  'supernatural-abilities': [{ text: `${SHEET} → Abilities` }, { text: 'Character wizard → Virtues & Flaws (Supernatural powers)' }],
  'raw-vis': [{ text: `${SHEET} → Magic → Circumstances (raw vis)` }, { text: 'Game Table → Market & Treasury', page: 'market' }],
  'limits-of-magic': [{ text: `${SHEET} → Lab, Items & Familiar → Original research (a Breakthrough past a Lesser Limit)` }],
  'transforming-mythic-europe': [{ text: 'Spells & design → Browse spells (great works are Rituals designed from the guidelines)', page: 'spells' }],
  'magic-in-practice': [{ text: `${COV} → Covenfolk, Finances & Loyalty: craft magic` }, { text: 'Spells & design → Browse spells', page: 'spells' }],
  'integrating-other-magic': [{ text: `${SHEET} → Lab, Items & Familiar → Original research (the Breakthrough sought: integrating a tradition)` }],
  // the laboratory
  'lab-totals-and-activities': [{ text: `${SHEET} → Magic → Casting Scores and Lab Totals` }, { text: `${SHEET} → Lab, Items & Familiar → Lab projects` }],
  'inventing-and-learning-spells': [{ text: `${SHEET} → Lab, Items & Familiar → Lab projects (Invent a spell; several of one Technique and Form at once)` }],
  'lab-texts': [
    { text: `${SHEET} → Lab, Items & Familiar → Lab projects (from a Laboratory Text)` },
    { text: `${COV} → Library & Vis (lab texts)` },
    { text: 'Enchantments → Writing (copying)', page: 'enchant', tab: 'writing' },
  ],
  'enchanted-items': [{ text: 'Enchantments', page: 'enchant' }, { text: `${SHEET} → Lab, Items & Familiar` }],
  talismans: [{ text: `${SHEET} → Lab, Items & Familiar → Enchanted items and Lab projects` }],
  'shape-and-material-bonuses': [{ text: 'Enchantments', page: 'enchant' }],
  familiars: [{ text: `${SHEET} → Lab, Items & Familiar → Familiar` }],
  'longevity-rituals': [{ text: `${SHEET} → Lab, Items & Familiar → Longevity Ritual` }],
  'vis-extraction': [{ text: `${SHEET} → Lab, Items & Familiar → Lab projects (Extract vis)` }],
  experimentation: [{ text: `${SHEET} → Lab, Items & Familiar → Experimentation` }],
  'original-research': [{ text: `${SHEET} → Lab, Items & Familiar → Original research` }],
  'assistants-and-apprentices': [{ text: `${SHEET} → Overview → Apprentice` }, { text: `${SHEET} → Seasons & Aging → Plan a season (help in the lab)` }],
  'laboratory-personalization': [
    { text: `${COV} → Laboratories` },
    { text: `${SHEET} → Lab, Items & Familiar → Lab projects (raise the Refinement, install a Virtue, put a Flaw right; lab routines)` },
  ],
  // covenants
  'founding-a-covenant': [{ text: 'Covenants → Found a covenant', page: 'covenants' }],
  'boons-and-hooks': [{ text: `${COV} → Hooks & Boons` }],
  finances: [{ text: `${COV} → Covenfolk, Finances & Loyalty (and Each year: Redcap visits, feast days, guests)` }, { text: 'Game Table → Market & Treasury', page: 'market' }],
  covenfolk: [
    { text: `${COV} → Covenfolk, Finances & Loyalty: specialists and craftsmen (guild ranks, Labor Points), soldiers, the turb's day (watches, sentries, drill, rewards and punishments, retirement), how the covenfolk live, craft magic` },
    { text: 'Quick build → Fill out the covenant', page: 'build', tab: 'covenant' },
  ],
  loyalty: [{ text: `${COV} → Covenfolk, Finances & Loyalty → Loyalty` }],
  'vis-sources-and-stocks': [{ text: `${COV} → Library & Vis` }],
  libraries: [{ text: `${COV} → Library & Vis (the covenant rolls and the scriptorium)` }, { text: `${SHEET} → Seasons & Aging → Writing and copying` }, { text: 'Quick build → Fill out the covenant (books for the magi)', page: 'build', tab: 'covenant' }],
  'the-aegis-of-the-hearth': [{ text: `${COV} → Overview → Magic on the covenant` }],
  'governance-and-charters': [{ text: `${COV} → Covenfolk, Finances & Loyalty → The year: the allowance to members (the charter’s division of resources)` }],
  'fortifications-and-defenses': [{ text: `${COV} → Hooks & Boons (Fortifications)` }],
  // the Order and the Tribunals
  tribunals: [{ text: 'Saga Overview → Optional rules (the saga’s Tribunal and its customs come first)', page: 'saga', tab: 'optional' }, { text: 'The Tribunal: its other covenants as living covenants, and its gatherings', page: 'tribunal' }],
  'the-rhine-tribunal': [{ text: 'Saga Overview → Optional rules: the Rhine Tribunal’s customs, in a saga set there', page: 'saga', tab: 'optional' }, { text: 'The Tribunal: the Rhine’s covenants from Guardians of the Forests, living; the gatherings at Durenmar; the Great Library', page: 'tribunal' }],
  'the-normandy-tribunal': [{ text: 'Saga Overview → Optional rules: the Normandy Tribunal’s customs, in a saga set there', page: 'saga', tab: 'optional' }],
  'the-theban-tribunal': [{ text: 'Saga Overview → Optional rules: the Theban Tribunal’s customs, in a saga set there', page: 'saga', tab: 'optional' }],
  'the-transylvanian-tribunal': [{ text: 'Saga Overview → Optional rules: the Transylvanian Tribunal’s customs, in a saga set there', page: 'saga', tab: 'optional' }],
  'troupe-play-and-sagas': [{ text: 'Saga Overview → Guided build (storyguide): the saga’s speed', page: 'saga' }],
  'quaesitores-and-hermetic-justice': [{ text: `${SHEET} → Overview → Society → Debate (testimony a Quaesitor endorses)` }],
  // society
  'towns-and-guilds': [{ text: `${SHEET} → Seasons & Aging → Guild` }, { text: `${COV} → Covenfolk, Finances & Loyalty → Craftsmen (guild ranks and Labor Points)` }],
  'crafts-and-workshops': [{ text: 'Game Table → City & Guild: a character’s workshop, the covenant’s craftsmen at work, damaged goods', page: 'guild' }, { text: `${COV} → Covenfolk, Finances & Loyalty → Craftsmen (hiring them, and what they save)` }, { text: `${COV} → Overview → Great buildings: a building's height, damage and stress check` }, { text: 'Game Table › Seasons → a season in full: a mason’s season, Build or Repair', page: 'seasons' }],
  'trade-money-and-wealth': [{ text: 'Game Table → City & Guild: haggling and bribes; a character’s workshop → Stories and investments (merchants’ story seeds and investments of time); travel, trade and intrigue: a house’s Reputation, largesse, warehouses, dowries', page: 'guild' }, { text: 'Game Table → Market & Treasury', page: 'market' }],
  'intrigue-and-agents': [{ text: `${SHEET} → Overview → Agents` }, { text: 'Game Table → City & Guild → Travel, trade and intrigue: bribes, hired criminals, sabotage, intrigue against the powerful', page: 'guild' }],
  'debate-and-influence': [{ text: `${SHEET} → Overview → Society → Debate` }],
  'the-church': [
    { text: 'Game Table › Dice › Faith & miracles: devotion to the saints, pilgrimages, the mystic’s path', page: 'dice', tab: 'holy' },
    { text: 'Game Table › Seasons → a season in full → Seasons of devotion: a season at a shrine, a hagiography, the mystic’s path', page: 'seasons' },
    { text: 'Game Table › Society & the Tribunal → Debates, petitions & customs (petition the Church)', page: 'table', tab: 'society' },
    { text: 'Game Table › Seasons: a season of Worship', page: 'seasons' },
  ],
  pilgrimage: [{ text: 'Game Table › Dice › Faith & miracles → A pilgrimage', page: 'dice', tab: 'holy' }],
  'social-standing': [{ text: 'Character wizard → Virtues & Flaws (Social Status)' }, { text: `${SHEET} → Seasons & Aging → When nothing is planned (free and working seasons)` }],
  'courtly-life-and-leisure': [{ text: `${SHEET} → Overview → Society → Etiquette` }],
  'hermetic-politics': [{ text: `${SHEET} → Overview → Society → Debate (at Tribunal)` }, { text: 'The Tribunal: the living covenants, their gilds and neighbors, and the gatherings', page: 'tribunal' }],
  'courts-law-and-crime': [{ text: `${SHEET} → Overview → Society → A quick trial` }, { text: 'Game Table → City & Guild → Travel, trade and intrigue: bribes, hired criminals, sabotage', page: 'guild' }],
  'family-and-women': [{ text: 'Game Table → City & Guild → Travel, trade and intrigue: dowries', page: 'guild' }],
  // realms and mysteries
  auras: [
    { text: `${SHEET} → Magic → Circumstances (aura, time of day, alignment)` },
    { text: `${COV} → Overview → Aura (its Boons and Hooks, alignment, changes, aura variation, a congregation's Dominion)` },
  ],
  'the-realms': [{ text: `${SHEET} → Magic → Circumstances (the aura's realm)` }, { text: `${COV} → Overview → Aura` }],
  regiones: [{ text: `${SHEET} → Magic → Circumstances (regio)` }, { text: `${COV} → Overview → Aura (a regio forms under aura variation)` }],
  'the-divine-realm': [{ text: `${COV} → Overview → Aura (a congregation's Dominion)` }, { text: `${SHEET} → Magic → Circumstances (the Dominion by night and on holy days)` }],
  'the-infernal-realm': [{ text: `${SHEET} → Combat & Health → Wounds and Illness (an Infernal aura hinders recovery)` }, { text: `${SHEET} → Magic → Circumstances (stronger at night)` }],
  'true-faith-and-miracles': [{ text: `${SHEET} → Overview → True Faith` }, { text: `${SHEET} → Magic → Magic Resistance (True Faith)` }],
  'sacraments-and-rites': [{ ...HOLY_PAGE, text: 'Game Table › Dice › Faith & miracles: Here and now (a sacrament’s Faith Point, the hajj); the saints (a Muslim holy forbear)' }],
  'divine-and-infernal-warping': [{ ...HOLY_PAGE, text: 'Game Table › Dice › Faith & miracles → The Divine Ascent' }],
  'holy-traditions': [
    { ...HOLY_PAGE, text: 'Game Table › Dice › Faith & miracles → Holy standing (a holy tradition); the Rings of Solomon (the Ars Notoria)' },
    { text: `${SHEET} → Magic (holy magic)` },
  ],
  'the-magic-realm': [{ text: `${COV} → Overview → Aura` }, { text: `${SHEET} → Overview → Creature (Realms of Power: Magic)` }],
  'the-faerie-realm': [FAERIE, { text: `${COV} → Library & Vis (faerie vis)` }],
  'creatures-with-might': [CREATURES],
  'mundane-beasts': [CREATURES],
  'magic-animals': [CREATURES],
  'magic-humans': [CREATURES],
  'spirits-and-ghosts': [CREATURES],
  elementals: [CREATURES],
  faeries: [CREATURES],
  'angels-and-divine-beings': [CREATURES],
  demons: [CREATURES],
  'other-creatures': [CREATURES],
  'mystery-cults-of-the-order': [{ text: `${SHEET} → Seasons & Aging → Mysteries & Initiation (cult Lores)` }],
  'mystery-cults-and-initiation': [MYSTERIES],
  'curious-common-magics': [{ text: `${SHEET} → Magic (Potent Magic, Withstand Casting, ceremonial casting)` }, LAB('Laboratory Horoscopes (Planetary Magic)'), MYSTERIES],
  'hermetic-spirit-magic': [MYSTERY_TABLE('Hermetic Empowerment'), MYSTERIES],
  'the-great-talisman': [MYSTERIES, { text: `${SHEET} → Lab, Items & Familiar → Enchanted items (the talisman)` }],
  'the-mysteries-of-dreams': [MYSTERIES],
  'mercurian-magic': [MYSTERIES, { text: `${SHEET} → Magic → Circumstances (ceremonial casting)` }],
  'immortal-magi': [MYSTERY_TABLE('the Great Elixir, and the immortality it brings')],
  'bjornaer-mysteries': [MYSTERIES],
  'criamon-mysteries': [{ text: `${SHEET} → Seasons & Aging → Mysteries & Initiation (the Paths)` }],
  'merinita-mysteries': [MYSTERIES],
  'verditius-mysteries': [MYSTERIES],
  'the-paths-through-the-forest': [{ text: `${SHEET} → Overview → Rhine Tribunal customs` }],
  // the Mysteries at the table
  'hermetic-alchemy': [MYSTERY_TABLE('the Great Elixir'), LAB('the Lesser Elixir and alchemical reagents')],
  'hermetic-astrology': [MYSTERY_TABLE('Celestial Magic (a favorable hour, astrological Durations)'), LAB('Laboratory Horoscopes')],
  'divination-and-augury': [MYSTERY_TABLE('Hermetic Divination, and dream interpretation')],
  'hermetic-theurgy': [MYSTERY_TABLE('invoked daimons, Hermetic Empowerment, Synthemata')],
  'arithmetic-magic': [MYSTERY_TABLE('the numerologist’s rotes')],
  // hedge magic and faerie wizardry
  'hedge-magic': [HEDGE, HEDGE_SEASONS],
  'hedge-wizards-other-traditions': [HEDGE, HEDGE_SEASONS],
  elementalists: [HEDGE, HEDGE_SEASONS, { text: `${SHEET} → Overview → Elemental Traits` }],
  'folk-witches': [HEDGE, HEDGE_SEASONS, HEDGE_SHEET('Folk witch')],
  gruagachan: [HEDGE, HEDGE_SEASONS, HEDGE_SHEET('Gruagach')],
  'learned-magicians': [HEDGE, HEDGE_SEASONS, HEDGE_SHEET('Learned magic')],
  nightwalkers: [HEDGE],
  vitkir: [HEDGE, HEDGE_SEASONS, HEDGE_SHEET('Vitki')],
  'faerie-wizards': [FAERIE, { text: `${SHEET} → Overview → Sympathy Traits` }],
  'faerie-characters': [{ text: 'People → a faerie companion, or a faerie in place of a magus', page: 'people' }, { ...FAERIE, text: 'Game Table › Dice › Faerie: change through a creative human' }],
};
