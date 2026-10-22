// Where the app does what a mechanics topic describes, so a reader of the rules can go and use them.
// Keyed by the topic ids of the mechanics reference; a `page` is linked (for the active saga), the
// rest name a tab or card of a character or covenant sheet.

export type AppPage = 'saga' | 'seasons' | 'market' | 'spells' | 'enchant' | 'rules' | 'dice';

export interface AppPlace {
  text: string;
  page?: AppPage;
}

const SHEET = 'Character sheet';
const COV = 'Covenant';

export const APP_PLACES: Record<string, AppPlace[]> = {
  // the basics and creation
  'dice-and-rolls': [{ text: 'Dice roller', page: 'dice' }],
  characteristics: [{ text: 'Character wizard → Characteristics' }],
  abilities: [{ text: 'Character wizard → Abilities' }, { text: `${SHEET} → Abilities` }],
  'personality-traits': [{ text: 'Character wizard → Personality & Gear' }],
  reputations: [{ text: 'Character wizard → Personality & Gear' }],
  confidence: [{ text: `${SHEET} → Overview → Standing` }],
  'virtues-and-flaws': [{ text: 'Character wizard → Virtues & Flaws' }],
  'kinds-of-characters': [{ text: 'Saga page → Create a character', page: 'saga' }],
  'making-any-character': [{ text: 'Saga page → Create a character', page: 'saga' }],
  magi: [{ text: 'Saga page → Create a character → Magus', page: 'saga' }],
  companions: [{ text: 'Saga page → Create a character → Companion', page: 'saga' }],
  grogs: [{ text: 'Saga page → Create a character → Grog', page: 'saga' }],
  'mythic-companions': [{ text: 'Saga page → Create a character → Mythic Companion', page: 'saga' }],
  'magic-characters-creatures': [{ text: `${SHEET} → Overview → Creature (Realms of Power: Magic)` }],
  'magic-characters-creatures-gated': [{ text: `${SHEET} → Overview → Creature (Realms of Power: Magic)` }],
  'magic-characters-and-creatures': [{ text: `${SHEET} → Overview → Creature (Realms of Power: Magic)` }],
  'the-houses-of-hermes': [{ text: 'Character wizard → House' }],
  'ex-miscellanea-traditions': [{ text: 'Character wizard → House → Ex Miscellanea' }],
  // combat
  combat: [{ text: `${SHEET} → Combat & Health` }],
  'combat-options': [{ text: `${SHEET} → Combat & Health → Combat rolls` }],
  'group-combat': [{ text: `${SHEET} → Combat & Health → Fighting as a group` }],
  'arms-and-armor': [{ text: 'Character wizard → Personality & Gear' }],
  'wounds-and-recovery': [{ text: `${SHEET} → Combat & Health → Wounds` }],
  fatigue: [{ text: `${SHEET} → Combat & Health → Fatigue` }],
  'disease-and-poison': [{ text: `${SHEET} → Combat & Health → Illness` }],
  'medicine-and-healing': [{ text: `${SHEET} → Combat & Health → Illness and Wounds` }],
  // seasons
  'experience-and-advancement': [{ text: `${SHEET} → Seasons & Aging → Plan a season` }, { text: 'Seasons page', page: 'seasons' }],
  'books-and-reading': [{ text: `${SHEET} → Seasons & Aging → Plan a season; Write a book` }],
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
  'raw-vis': [{ text: `${SHEET} → Magic → Circumstances (raw vis)` }, { text: 'Market & treasury', page: 'market' }],
  // the laboratory
  'lab-totals-and-activities': [{ text: `${SHEET} → Magic → Casting Scores and Lab Totals` }, { text: `${SHEET} → Lab, Items & Familiar → Lab projects` }],
  'inventing-and-learning-spells': [{ text: `${SHEET} → Lab, Items & Familiar → Lab projects` }],
  'enchanted-items': [{ text: 'Enchantments', page: 'enchant' }, { text: `${SHEET} → Lab, Items & Familiar` }],
  talismans: [{ text: `${SHEET} → Lab, Items & Familiar → Enchanted items and Lab projects` }],
  'shape-and-material-bonuses': [{ text: 'Enchantments', page: 'enchant' }],
  familiars: [{ text: `${SHEET} → Lab, Items & Familiar → Familiar` }],
  'longevity-rituals': [{ text: `${SHEET} → Lab, Items & Familiar → Longevity Ritual` }],
  'vis-extraction': [{ text: `${SHEET} → Lab, Items & Familiar → Lab projects (Extract vis)` }],
  experimentation: [{ text: `${SHEET} → Lab, Items & Familiar → Experimentation` }],
  'original-research': [{ text: `${SHEET} → Lab, Items & Familiar → Original research` }],
  'laboratory-personalization': [{ text: `${COV} → Laboratories` }],
  // covenants
  'founding-a-covenant': [{ text: 'Saga page → Found a covenant', page: 'saga' }],
  'boons-and-hooks': [{ text: `${COV} → Hooks & Boons` }],
  finances: [{ text: `${COV} → Covenfolk, Finances & Loyalty` }, { text: 'Market & treasury', page: 'market' }],
  covenfolk: [{ text: `${COV} → Covenfolk, Finances & Loyalty` }],
  loyalty: [{ text: `${COV} → Covenfolk, Finances & Loyalty → Loyalty` }],
  'vis-sources-and-stocks': [{ text: `${COV} → Library & Vis` }],
  libraries: [{ text: `${COV} → Library & Vis` }],
  'the-aegis-of-the-hearth': [{ text: `${COV} → Overview → Magic on the covenant` }],
  // the Order and the Tribunals
  tribunals: [{ text: 'Saga page → Tribunal, and its customs', page: 'saga' }],
  'the-rhine-tribunal': [{ text: 'Saga page → Tribunal: Rhine → its customs', page: 'saga' }],
  'the-normandy-tribunal': [{ text: 'Saga page → Tribunal: Normandy → its customs', page: 'saga' }],
  'the-theban-tribunal': [{ text: 'Saga page → Tribunal: Theban → its customs', page: 'saga' }],
  'the-transylvanian-tribunal': [{ text: 'Saga page → Tribunal: Transylvanian → its customs', page: 'saga' }],
  // society
  'towns-and-guilds': [{ text: `${SHEET} → Seasons & Aging → Guild` }],
  'crafts-and-workshops': [{ text: `${SHEET} → Seasons & Aging → Workshop` }],
  'trade-money-and-wealth': [{ text: 'Market & treasury', page: 'market' }],
  'intrigue-and-agents': [{ text: `${SHEET} → Overview → Agents` }],
  'debate-and-influence': [{ text: `${SHEET} → Overview → Society → Debate` }],
  'the-church': [{ text: `${SHEET} → Overview → Society → Petition the Church` }],
  'courts-law-and-crime': [{ text: `${SHEET} → Overview → Society → A quick trial` }],
  // realms and mysteries
  auras: [{ text: `${SHEET} → Magic → Circumstances (aura)` }, { text: `${COV} → Overview` }],
  'mystery-cults-and-initiation': [{ text: `${SHEET} → Seasons & Aging → Mysteries & Initiation` }],
  'bjornaer-mysteries': [{ text: `${SHEET} → Seasons & Aging → Mysteries & Initiation` }],
  'criamon-mysteries': [{ text: `${SHEET} → Seasons & Aging → Mysteries & Initiation (the Paths)` }],
  'merinita-mysteries': [{ text: `${SHEET} → Seasons & Aging → Mysteries & Initiation` }],
  'verditius-mysteries': [{ text: `${SHEET} → Seasons & Aging → Mysteries & Initiation` }],
  'the-paths-through-the-forest': [{ text: `${SHEET} → Overview → Rhine Tribunal customs` }],
};
