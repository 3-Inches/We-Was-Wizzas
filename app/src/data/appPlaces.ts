// Where the app does what a mechanics topic describes, so a reader of the rules can go and use them.
// Keyed by the topic ids of the mechanics reference; a `page` is linked (for the active saga), the
// rest name a tab or card of a character or covenant sheet.

export type AppPage = 'saga' | 'seasons' | 'market' | 'spells' | 'enchant' | 'rules' | 'build' | 'dice';

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

export const APP_PLACES: Record<string, AppPlace[]> = {
  // the basics and creation
  'dice-and-rolls': [{ text: 'Dice roller', page: 'dice' }],
  characteristics: [{ text: 'Character wizard → Characteristics' }],
  abilities: [{ text: 'Character wizard → Abilities' }, { text: `${SHEET} → Abilities` }],
  'personality-traits': [{ text: 'Character wizard → Personality & Gear' }],
  reputations: [{ text: 'Character wizard → Personality & Gear' }],
  confidence: [{ text: `${SHEET} → Overview → Standing` }],
  'virtues-and-flaws': [{ text: 'Character wizard → Virtues & Flaws' }],
  size: [{ text: 'Character wizard → Characteristics (Size)' }, { text: `${SHEET} → Stat block` }],
  'the-character-sheet': [{ text: `${SHEET}: its tabs, and the Stat block` }],
  'kinds-of-characters': [{ text: 'Saga page → Create a character', page: 'saga' }],
  'making-any-character': [{ text: 'Saga page → Create a character', page: 'saga' }],
  magi: [{ text: 'Saga page → Create a character → Magus', page: 'saga' }],
  companions: [{ text: 'Saga page → Create a character → Companion', page: 'saga' }],
  grogs: [{ text: 'Saga page → Create a character → Grog', page: 'saga' }, { text: `${COV} → Covenfolk, Finances & Loyalty → The turb's day` }],
  'mythic-companions': [{ text: 'Saga page → Create a character → Mythic Companion', page: 'saga' }],
  'careers-craftsmen-merchants-scholars-physicians': [{ text: `${SHEET} → Seasons & Aging → Workshop` }],
  'careers-craftsmen-merchants-scholars-physicians-gated': [{ text: `${SHEET} → Seasons & Aging → Workshop and Guild` }],
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
  // combat
  combat: [{ text: `${SHEET} → Combat & Health` }],
  'combat-options': [{ text: `${SHEET} → Combat & Health → Combat rolls` }],
  'group-combat': [{ text: `${SHEET} → Combat & Health → Fighting as a group` }],
  'arms-and-armor': [{ text: 'Character wizard → Personality & Gear' }],
  'wounds-and-recovery': [{ text: `${SHEET} → Combat & Health → Wounds (and the covenant's aura, if it heals or festers)` }],
  fatigue: [{ text: `${SHEET} → Combat & Health → Fatigue` }],
  'encumbrance-and-carrying': [{ text: 'Character wizard → Personality & Gear' }, { text: `${SHEET} → Combat & Health → Weapons, armor & combat` }],
  travel: [{ text: 'Market & treasury → Services and hospitality (travel and lodging)', page: 'market' }],
  'disease-and-poison': [{ text: `${SHEET} → Combat & Health → Illness` }],
  'medicine-and-healing': [{ text: `${SHEET} → Combat & Health → Illness and Wounds` }],
  // seasons
  'experience-and-advancement': [
    { text: `${SHEET} → Seasons & Aging → Plan a season` },
    { text: `${SHEET} → Seasons & Aging → When nothing is planned (free and working seasons)` },
    { text: 'Seasons page', page: 'seasons' },
  ],
  'books-and-reading': [{ text: `${SHEET} → Seasons & Aging → Plan a season; Writing and copying` }, { text: `${COV} → Library & Vis (the scriptorium)` }],
  'training-animals-and-creatures': [{ text: `${SHEET} → Lab, Items & Familiar → Lab projects (Tame)` }],
  'aging-and-living-conditions': [{ text: `${SHEET} → Seasons & Aging → Aging` }, { text: 'Seasons page (the year’s end)', page: 'seasons' }],
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
  'spell-mastery': [{ text: `${SHEET} → Magic → Spells` }],
  certamen: [{ text: `${SHEET} → Magic → Certamen` }],
  'wizard-s-twilight': [{ text: `${SHEET} → Seasons & Aging → Warping & Twilight` }],
  'supernatural-abilities': [{ text: `${SHEET} → Abilities` }, { text: 'Character wizard → Virtues & Flaws (Supernatural powers)' }],
  'raw-vis': [{ text: `${SHEET} → Magic → Circumstances (raw vis)` }, { text: 'Market & treasury', page: 'market' }],
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
  'laboratory-personalization': [
    { text: `${COV} → Laboratories` },
    { text: `${SHEET} → Lab, Items & Familiar → Lab projects (raise the Refinement, install a Virtue, put a Flaw right; lab routines)` },
  ],
  // covenants
  'founding-a-covenant': [{ text: 'Saga page → Found a covenant', page: 'saga' }],
  'boons-and-hooks': [{ text: `${COV} → Hooks & Boons` }],
  finances: [{ text: `${COV} → Covenfolk, Finances & Loyalty (and Each year: Redcap visits, feast days, guests)` }, { text: 'Market & treasury', page: 'market' }],
  covenfolk: [
    { text: `${COV} → Covenfolk, Finances & Loyalty: specialists and craftsmen (guild ranks, Labor Points), soldiers, the turb's day (watches, sentries, drill, rewards and punishments, retirement), how the covenfolk live, craft magic` },
    { text: 'Quick build → Fill out the covenant', page: 'build', tab: 'covenant' },
  ],
  loyalty: [{ text: `${COV} → Covenfolk, Finances & Loyalty → Loyalty` }],
  'vis-sources-and-stocks': [{ text: `${COV} → Library & Vis` }],
  libraries: [{ text: `${COV} → Library & Vis (the covenant rolls and the scriptorium)` }, { text: `${SHEET} → Seasons & Aging → Writing and copying` }, { text: 'Quick build → Fill out the covenant (books for the magi)', page: 'build', tab: 'covenant' }],
  'the-aegis-of-the-hearth': [{ text: `${COV} → Overview → Magic on the covenant` }],
  // the Order and the Tribunals
  tribunals: [{ text: 'Saga page → Tribunal, and its customs', page: 'saga' }],
  'the-rhine-tribunal': [{ text: 'Saga page → Tribunal: Rhine → its customs', page: 'saga' }],
  'the-normandy-tribunal': [{ text: 'Saga page → Tribunal: Normandy → its customs', page: 'saga' }],
  'the-theban-tribunal': [{ text: 'Saga page → Tribunal: Theban → its customs', page: 'saga' }],
  'the-transylvanian-tribunal': [{ text: 'Saga page → Tribunal: Transylvanian → its customs', page: 'saga' }],
  // society
  'towns-and-guilds': [{ text: `${SHEET} → Seasons & Aging → Guild` }, { text: `${COV} → Covenfolk, Finances & Loyalty → Craftsmen (guild ranks and Labor Points)` }],
  'crafts-and-workshops': [{ text: `${SHEET} → Seasons & Aging → Workshop` }, { text: 'Dice roller → Item stress check', page: 'dice' }, { text: `${COV} → Covenfolk, Finances & Loyalty → Craftsmen` }],
  'trade-money-and-wealth': [{ text: 'Market & treasury (haggling and bribes)', page: 'market' }, { text: `${SHEET} → Seasons & Aging → Workshop → Stories and investments` }],
  'intrigue-and-agents': [{ text: `${SHEET} → Overview → Agents` }],
  'debate-and-influence': [{ text: `${SHEET} → Overview → Society → Debate` }],
  'the-church': [{ text: `${SHEET} → Overview → Society → Petition the Church` }, { text: `${SHEET} → Seasons & Aging → Plan a season (Worship)` }],
  'social-standing': [{ text: 'Character wizard → Virtues & Flaws (Social Status)' }, { text: `${SHEET} → Seasons & Aging → When nothing is planned (free and working seasons)` }],
  'courtly-life-and-leisure': [{ text: `${SHEET} → Overview → Society → Etiquette` }],
  'hermetic-politics': [{ text: `${SHEET} → Overview → Society → Debate (at Tribunal)` }],
  'courts-law-and-crime': [{ text: `${SHEET} → Overview → Society → A quick trial` }],
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
  'bjornaer-mysteries': [MYSTERIES],
  'criamon-mysteries': [{ text: `${SHEET} → Seasons & Aging → Mysteries & Initiation (the Paths)` }],
  'merinita-mysteries': [MYSTERIES],
  'verditius-mysteries': [MYSTERIES],
  'the-paths-through-the-forest': [{ text: `${SHEET} → Overview → Rhine Tribunal customs` }],
};
