// Hand-coded mechanics for Virtues and Flaws, keyed by the id produced by the
// extractor (slug of the name, with "-flaw" appended for Flaws). Each entry was
// written against the Definitive Edition text of that Virtue/Flaw. Anything that
// is purely narrative is left without effects and simply shown on the sheet.
//
// Saga house rules can override any of this at runtime (see engine/houseRules.ts).

import type { AbilityType, CharType, Effect, ParamSpec, VirtueFlawDef } from './types';

export interface Mechanics {
  param?: ParamSpec;
  repeatable?: boolean;
  effects?: Effect[];
  tags?: string[];
  forTypes?: CharType[];
  requiresGift?: boolean;
  maleOnly?: boolean;
  femaleOnly?: boolean;
  requires?: string[];
  excludes?: string[];
  compatibleStatuses?: string[];
  creatureOnly?: boolean;
  house?: string;
  houses?: VirtueFlawDef['houses'];
  houseSeverity?: VirtueFlawDef['houseSeverity'];
  notForTypes?: CharType[];
  needs?: VirtueFlawDef['needs'];
  noGift?: boolean;
  minChar?: VirtueFlawDef['minChar'];
  maxChar?: VirtueFlawDef['maxChar'];
  minAge?: number;
  beings?: string;
  tradition?: string;
  region?: string;
  paramEffects?: VirtueFlawDef['paramEffects'];
  restrictionText?: string;
}

const P = {
  ability: (label = 'Ability', abilityTypes?: AbilityType[]): ParamSpec => ({ kind: 'ability', label, abilityTypes }),
  art: (label = 'Art'): ParamSpec => ({ kind: 'art', label }),
  tech: (label = 'Technique'): ParamSpec => ({ kind: 'technique', label }),
  form: (label = 'Form'): ParamSpec => ({ kind: 'form', label }),
  char: (label = 'Characteristic'): ParamSpec => ({ kind: 'characteristic', label }),
  text: (label: string, options?: string[]): ParamSpec => ({ kind: 'text', label, options }),
  realm: (label = 'Realm'): ParamSpec => ({ kind: 'realm', label, options: ['Magic', 'Faerie', 'Divine', 'Infernal'] }),
};

// Faerie Blood heritages: the Definitive Edition list, then the extra ones in Realms of Power: Faerie.
const FAERIE_HERITAGE: ParamSpec = {
  kind: 'text',
  label: 'Faerie heritage',
  groups: [
    { label: 'Definitive Edition', options: ['Bee King', 'Dwarf', 'Goblin', 'Satyr', 'Sidhe', 'Spinnen', 'Undine'] },
    { label: 'Realms of Power: Faerie', options: ['Bloodcap', 'Brownie', 'Ettin', 'Faerie God', 'Ghul', 'Huldra', 'Nymph', 'Padfoot', 'Selkie'] },
  ],
};
const FAERIE_HERITAGE_EFFECTS: Record<string, Effect[]> = {
  'Bee King': [{ type: 'note', text: 'Bee King: may give simple instructions to bees touched and understand the thoughts of hives (Penetration 25 for warrior bees).' }],
  Dwarf: [{ type: 'note', text: 'Dwarf Blood: +1 to any total including a Craft Ability.' }],
  Goblin: [{ type: 'note', text: 'Goblin Blood: +1 on all totals involving stealth.' }],
  Satyr: [{ type: 'note', text: 'Satyr Blood: +1 to Communication and Presence totals with sexually compatible characters.' }],
  Sidhe: [{ type: 'charBonus', char: 'Pre', amount: 1, max: 3 }],
  Spinnen: [{ type: 'note', text: 'Spinnen Blood: converts own body weight of fiber into cloth per day by touch.' }],
  Undine: [{ type: 'note', text: 'Undine Blood: +2 to any action taken underwater (partially offsets the penalty).' }],
};

const ACADEMIC: Effect = { type: 'abilityAccess', abilityTypes: ['Academic'] };
const MARTIAL: Effect = { type: 'abilityAccess', abilityTypes: ['Martial'] };
const ARCANE: Effect = { type: 'abilityAccess', abilityTypes: ['Arcane'] };
const note = (text: string): Effect => ({ type: 'note', text });
const rep = (score: number, label: string, kind: 'good' | 'bad' = 'good', scope?: string): Effect => ({ type: 'reputation', score, label, kind, scope });

export const MECHANICS: Record<string, Mechanics> = {
  // ------------------------------------------------------------------ The Gift & status
  'the-gift': { effects: [{ type: 'gift', kind: 'normal' }], tags: ['magic'] },
  'gentle-gift': { requiresGift: true, effects: [{ type: 'gift', kind: 'gentle' }], tags: ['social'], excludes: ['blatant-gift-flaw'] },
  'blatant-gift-flaw': { requiresGift: true, effects: [{ type: 'gift', kind: 'blatant' }], excludes: ['gentle-gift'] },
  'suppressed-gift-flaw': { requiresGift: true, effects: [{ type: 'gift', kind: 'suppressed' }] },
  'hermetic-magus': { forTypes: ['magus'], requiresGift: true },
  apprentice: { requiresGift: true },
  redcap: {
    forTypes: ['companion', 'mythic'],
    effects: [
      { type: 'abilityAccess', abilityTypes: ['Academic', 'Arcane', 'Martial'] },
      { type: 'apprenticeshipTotalXp', amount: 300 },
      { type: 'implies', virtue: 'well-traveled', note: 'Well-Traveled at no cost' },
      note('Enchanted devices with 50 levels of effects (+2 levels/year of service); free Longevity Ritual from a Lab Total 50 magus.'),
    ],
    tags: ['travel', 'hermetic'],
  },
  'lone-redcap': {
    effects: [
      { type: 'abilityAccess', abilityTypes: ['Academic', 'Arcane', 'Martial'] },
      { type: 'apprenticeshipTotalXp', amount: 300 },
      { type: 'implies', virtue: 'well-traveled' },
      rep(2, 'Lone Redcap', 'bad', 'House Mercere'),
    ],
    tags: ['travel'],
  },
  'magic-items': { requires: ['redcap'], repeatable: true, effects: [note('+25 levels of Redcap magic items; +1 level/year improvement. No effect over level 30.')] },

  // ------------------------------------------------------------------ Ability access & XP pools
  educated: { effects: [ACADEMIC, { type: 'xpPool', amount: 50, label: 'Educated', abilities: ['latin', 'artes-liberales'] }], tags: ['scholar'] },
  'educated-bardic': { effects: [ACADEMIC, { type: 'xpPool', amount: 50, label: 'Educated (Bardic)', abilities: ['art-of-memory', 'profession-storyteller', 'profession-poet', 'area-lore', 'organization-lore'] }], tags: ['scholar'] },
  'educated-islamic': { effects: [ACADEMIC, { type: 'xpPool', amount: 50, label: 'Educated (Islamic)', abilities: ['arabic', 'persian', 'greek', 'latin', 'theology-islam', 'islamic-law', 'artes-liberales'] }], tags: ['scholar'] },
  'educated-hebrew': { effects: [ACADEMIC, { type: 'xpPool', amount: 50, label: 'Educated (Hebrew)', abilities: ['hebrew', 'aramaic', 'theology-judaism', 'judaic-lore', 'arabic'] }], tags: ['scholar'] },
  'educated-vernacular': { effects: [ACADEMIC, { type: 'xpPool', amount: 50, label: 'Educated (Vernacular)', abilityTypes: ['Academic'], abilities: ['bargain', 'organization-lore', 'profession-merchant', 'latin', 'greek', 'arabic'] }], tags: ['scholar', 'wealth'] },
  warrior: { effects: [MARTIAL, { type: 'xpPool', amount: 50, label: 'Warrior', abilityTypes: ['Martial'] }], tags: ['combat'] },
  'arcane-lore': { effects: [ARCANE, { type: 'xpPool', amount: 50, label: 'Arcane Lore', abilityTypes: ['Arcane'] }, note('Cannot learn Parma Magica without The Gift.')], tags: ['supernatural', 'scholar'] },
  'privileged-upbringing': { effects: [{ type: 'xpPool', amount: 50, label: 'Privileged Upbringing', abilityTypes: ['General', 'Academic', 'Martial'] }], tags: ['wealth', 'social'] },
  'well-traveled': { effects: [{ type: 'xpPool', amount: 50, label: 'Well-Traveled', abilities: ['living-language', 'area-lore', 'bargain', 'carouse', 'charm', 'etiquette', 'folk-ken', 'guile'] }], tags: ['travel', 'social'] },
  'hermetic-experience': { effects: [{ type: 'xpPool', amount: 50, label: 'Hermetic Experience', abilities: ['organization-lore', 'magic-lore', 'latin'] }, { type: 'abilityAccess', abilities: ['magic-lore', 'latin'] }], tags: ['hermetic'] },
  'craft-guild-training': { effects: [{ type: 'xpPool', amount: 50, label: 'Craft Guild Training', abilities: ['craft', 'profession', 'bargain', 'organization-lore'] }], tags: ['craft'] },
  'schooled-in-crime': { effects: [{ type: 'xpPool', amount: 50, label: 'Schooled in Crime', abilities: ['area-lore', 'athletics', 'awareness', 'bargain', 'brawl', 'charm', 'guile', 'legerdemain', 'stealth'] }], tags: ['stealth'] },
  'trained-assassin': { effects: [MARTIAL, { type: 'xpPool', amount: 50, label: 'Trained Assassin', abilityTypes: ['Martial'], abilities: ['athletics', 'guile', 'stealth'] }], tags: ['combat', 'stealth'] },
  'physician-of-salerno': { effects: [{ type: 'xpPool', amount: 50, label: 'Physician of Salerno', abilities: ['medicine', 'philosophiae'] }, rep(2, 'Physician of Salerno')], tags: ['healing', 'scholar'] },
  'clan-ilfetu': { house: 'bjornaer', requiresGift: true, effects: [{ type: 'xpPool', amount: 50, label: 'Clan Ilfetu', abilities: ['organization-lore', 'magic-lore', 'dead-language'] }] },
  venditor: { effects: [ACADEMIC, { type: 'xpPool', amount: 50, label: 'Venditor', abilities: ['bargain', 'charm', 'folk-ken', 'guile', 'intrigue', 'living-language'] }], tags: ['social', 'wealth'] },
  'forge-companion': { effects: [{ type: 'xpPool', amount: 50, label: 'Forge-Companion', abilities: ['craft'] }], tags: ['craft'] },
  ineslemen: { effects: [{ type: 'abilityAccess', abilities: ['theology-islam', 'islamic-law', 'faerie-lore', 'magic-lore', 'dominion-lore', 'infernal-lore'] }, { type: 'xpPool', amount: 50, label: 'Ineslemen', abilities: ['theology-islam', 'islamic-law', 'faerie-lore', 'magic-lore', 'dominion-lore', 'infernal-lore'] }] },
  'senior-bard': { effects: [{ type: 'abilityAccess', abilities: ['faerie-lore', 'magic-lore', 'dominion-lore', 'infernal-lore'] }, { type: 'xpPool', amount: 90, label: 'Senior Bard', abilities: ['art-of-memory', 'profession-storyteller', 'profession-poet', 'area-lore', 'organization-lore', 'faerie-lore', 'magic-lore'] }, rep(2, 'Storyteller', 'good', 'Local')] },
  'master-bard': { effects: [ARCANE, { type: 'xpPool', amount: 240, label: 'Master Bard', abilities: ['art-of-memory', 'profession-storyteller', 'profession-poet', 'area-lore', 'organization-lore', 'faerie-lore', 'magic-lore'] }, rep(3, 'Master Bard', 'good', 'Local')] },
  bard: { effects: [rep(1, 'Bard', 'good', 'Local (Irish)')] },
  'magister-in-artibus': { maleOnly: true, effects: [ACADEMIC, { type: 'xpPool', amount: 240, label: 'Magister in Artibus', abilityTypes: ['Academic'], abilities: ['teaching'] }, rep(2, 'Magister', 'good', 'Academic'), note('At least (25 – Int) years old; Latin 5 and Artes Liberales 5 required.')], tags: ['scholar'] },
  'doctor-in-faculty': { maleOnly: true, param: P.text('Faculty', ['Medicine', 'Civil and Canon Law', 'Theology']), effects: [ACADEMIC, { type: 'xpPool', amount: 300, label: 'Doctor', abilityTypes: ['Academic'], abilities: ['latin'] }, rep(3, 'Doctor', 'good', 'Academic'), note('At least (27 – Int) years old; Latin, Artes Liberales, and faculty Ability at 5.')], tags: ['scholar'] },
  'magister-in-medicina': { effects: [ACADEMIC, { type: 'xpPool', amount: 300, label: 'Magister in Medicina', abilityTypes: ['Academic'], abilities: ['latin'] }, rep(3, 'Doctor of Medicine', 'good', 'Academic')], tags: ['scholar', 'healing'] },
  'cathedral-school-master': { maleOnly: true, effects: [ACADEMIC, { type: 'xpPool', amount: 240, label: 'Cathedral School Master', abilityTypes: ['Academic'], abilities: ['teaching'] }, rep(2, 'Master', 'good', 'Academic')], tags: ['scholar'] },
  baccalaureus: { maleOnly: true, effects: [ACADEMIC, { type: 'xpPool', amount: 90, label: 'Baccalaureus', abilities: ['latin', 'artes-liberales'] }], tags: ['scholar'] },
  'simple-student': { effects: [ACADEMIC, note('30 xp per finished year of study on Latin or Artes Liberales (add as a custom pool).')], tags: ['scholar'] },
  'rosh-beth-din': { maleOnly: true, effects: [ACADEMIC, { type: 'xpPool', amount: 50, label: 'Rosh Beth Din', abilities: ['hebrew', 'rabbinic-law', 'theology-judaism'] }, rep(2, 'Rosh Beth Din')] },
  'university-grammar-teacher': { effects: [{ type: 'abilityAccess', abilities: ['latin', 'artes-liberales'] }] },
  'lupus-the-wolf': { effects: [{ type: 'abilityAccess', abilities: ['latin', 'artes-liberales'] }] },
  jurist: { effects: [{ type: 'abilityAccess', abilities: ['latin', 'artes-liberales', 'civil-and-canon-law'] }] },
  // Social statuses that open Academic abilities
  alim: { maleOnly: true, effects: [ACADEMIC] },
  archieunuch: { maleOnly: true, effects: [ACADEMIC] },
  beadle: { maleOnly: true, effects: [ACADEMIC] },
  'brother-chaplain': { maleOnly: true, effects: [ACADEMIC] },
  'brother-knight': { effects: [ACADEMIC, MARTIAL], tags: ['combat'] },
  'brother-sergeant': { effects: [MARTIAL], tags: ['combat'] },
  bureaucrat: { maleOnly: true, effects: [ACADEMIC] },
  clerk: { effects: [ACADEMIC], tags: ['scholar'] },
  eunuch: { maleOnly: true, effects: [ACADEMIC] },
  'guild-dean': { effects: [ACADEMIC] },
  'guild-master': { effects: [ACADEMIC] },
  'mendicant-friar': { effects: [ACADEMIC] },
  notary: { effects: [ACADEMIC] },
  priest: { maleOnly: true, effects: [ACADEMIC] },
  religious: { effects: [ACADEMIC] },
  'senior-master': { effects: [ACADEMIC] },
  'templar-administrator': { effects: [ACADEMIC] },
  'town-magistrate': { effects: [ACADEMIC] },
  'troubadour-trobairitz': { effects: [ACADEMIC], tags: ['social'] },
  'failed-monk-flaw': { effects: [ACADEMIC, rep(2, 'Failed Monk', 'bad', 'Local & Church')] },
  'failed-apprentice': { effects: [{ type: 'abilityAccess', abilityTypes: ['Academic', 'Arcane', 'Martial'] }], tags: ['hermetic'] },
  custos: { effects: [{ type: 'abilityAccess', abilityTypes: ['Martial', 'Academic', 'Arcane'], note: 'Choose ONE group: Martial, Academic, or Arcane' }], param: P.text('Ability group', ['Martial', 'Academic', 'Arcane']) },
  'templar-specialist': { effects: [{ type: 'abilityAccess', abilityTypes: ['Academic', 'Martial'], note: 'Choose one restricted group' }], param: P.text('Ability group', ['Martial', 'Academic']) },
  'wise-one': { effects: [{ type: 'abilityAccess', abilityTypes: ['Arcane', 'Academic'], note: 'Arcane OR Academic, not both' }], param: P.text('Ability group', ['Arcane', 'Academic']), tags: ['supernatural'] },
  knight: { maleOnly: true, effects: [MARTIAL], tags: ['combat', 'social'] },
  emir: { effects: [MARTIAL], tags: ['combat', 'social'] },
  mamluk: { effects: [MARTIAL], tags: ['combat'] },
  fidai: { effects: [MARTIAL], tags: ['combat', 'stealth'] },
  lasiq: { effects: [MARTIAL], tags: ['combat', 'stealth'] },
  almogavar: { effects: [MARTIAL], tags: ['combat'] },
  almogaten: { effects: [MARTIAL], tags: ['combat', 'leadership'] },
  'mercenary-captain': { effects: [MARTIAL], tags: ['combat', 'leadership'] },
  'turb-trained': { effects: [MARTIAL, note('May learn the single dead language the magi speak.')], tags: ['combat'] },
  'branded-criminal-flaw': { effects: [MARTIAL] },
  'outlaw-flaw': { effects: [MARTIAL, rep(2, 'Outlaw', 'bad')] },
  'outlaw-leader-flaw': { effects: [MARTIAL, rep(3, 'Outlaw', 'bad', 'Local')] },
  'student-of-realm': { repeatable: true, param: P.realm(), effects: [{ type: 'abilityAccess', note: 'The chosen (Realm) Lore' }, note('+2 on all uses of the chosen Realm Lore')], tags: ['supernatural', 'scholar'] },
  'faerie-blood': { effects: [{ type: 'abilityAccess', abilities: ['faerie-lore'] }, { type: 'agingRoll', amount: -1 }], param: FAERIE_HERITAGE, paramEffects: FAERIE_HERITAGE_EFFECTS, tags: ['faerie'], excludes: ['strong-faerie-blood'] },
  'strong-faerie-blood': { effects: [{ type: 'abilityAccess', abilities: ['faerie-lore'] }, { type: 'agingRoll', amount: -3 }, { type: 'agingStartAge', age: 50 }, { type: 'implies', virtue: 'second-sight', note: 'Second Sight free' }], param: FAERIE_HERITAGE, paramEffects: FAERIE_HERITAGE_EFFECTS, tags: ['faerie'], excludes: ['faerie-blood'] },
  'blood-of-the-nephilim': { effects: [{ type: 'abilityAccess', abilities: ['dominion-lore'] }, { type: 'size', amount: 1 }, { type: 'agingRoll', amount: -5 }], tags: ['divine'] },

  // ------------------------------------------------------------------ Later-life XP
  wealthy: { forTypes: ['companion', 'mythic'], effects: [{ type: 'laterLifeXpPerYear', amount: 20 }, { type: 'freeSeasons', amount: 3 }, { type: 'livingConditions', amount: 2 }], tags: ['wealth'], excludes: ['poor-flaw'] },
  'poor-flaw': { forTypes: ['companion', 'mythic'], effects: [{ type: 'laterLifeXpPerYear', amount: 10 }, { type: 'freeSeasons', amount: 1 }, { type: 'livingConditions', amount: -2 }], excludes: ['wealthy'] },
  'license-of-absence': { effects: [{ type: 'freeSeasons', amount: 1 }] },
  'regular-flaw': { effects: [note('One free season per year must be spent in Worship.')] },
  savantism: {},
  'savantism-flaw': { effects: [{ type: 'advancementMultiplier', multiplier: 0.5, when: 'all' }, note('Half standard experience at creation; no Ability above 3 except the favored Ability (max 6, +3 to rolls).')] },

  // ------------------------------------------------------------------ Characteristics
  'improved-characteristics': { repeatable: true, effects: [{ type: 'charPoints', amount: 3 }], tags: ['physical'] },
  'weak-characteristics-flaw': { repeatable: true, effects: [{ type: 'charPoints', amount: -3 }] },
  'great-characteristic': { repeatable: true, param: P.char(), effects: [{ type: 'greatChar', char: '$param', amount: 1 }] },
  'poor-characteristic-flaw': { repeatable: true, param: P.char(), effects: [{ type: 'greatChar', char: '$param', amount: -1 }] },
  'giant-blood': { effects: [{ type: 'size', amount: 2 }, { type: 'charBonus', char: 'Str', amount: 1, max: 6 }, { type: 'charBonus', char: 'Sta', amount: 1, max: 6 }], excludes: ['large', 'small-frame-flaw', 'dwarf-flaw'], tags: ['combat', 'physical'] },
  large: { effects: [{ type: 'size', amount: 1 }], excludes: ['giant-blood', 'small-frame-flaw', 'dwarf-flaw'], tags: ['combat', 'physical'] },
  'small-frame-flaw': { effects: [{ type: 'size', amount: -1 }], excludes: ['giant-blood', 'large', 'dwarf-flaw'] },
  'dwarf-flaw': { effects: [{ type: 'size', amount: -2 }, { type: 'charBonus', char: 'Str', amount: -1, min: -6 }, { type: 'charBonus', char: 'Sta', amount: -1, min: -6 }], excludes: ['giant-blood', 'large', 'small-frame-flaw'] },

  // ------------------------------------------------------------------ Ability & Art bonuses
  'puissant-ability': { repeatable: true, param: P.ability(), effects: [{ type: 'abilityBonus', ability: '$param', amount: 2 }] },
  'affinity-with-ability': { repeatable: true, param: P.ability(), effects: [{ type: 'abilityAffinity', ability: '$param' }, { type: 'abilityCapBonus', ability: '$param', amount: 2 }] },
  'puissant-art': { repeatable: true, param: P.art(), requiresGift: true, effects: [{ type: 'artBonus', art: '$param', amount: 3 }] },
  'affinity-with-art': { repeatable: true, param: P.art(), requiresGift: true, effects: [{ type: 'artAffinity', art: '$param' }] },
  linguist: { effects: [{ type: 'languageAffinity', multiplier: 1.25 }], tags: ['scholar', 'travel'] },
  'academic-concentration-subject': { param: P.text('Subject', ['grammar', 'logic', 'rhetoric', 'arithmetic', 'geometry', 'astronomy', 'music']), effects: [note('+3 Artes Liberales for the chosen subject, –1 for the others.')], excludes: [] },
  'deficient-technique-flaw': { param: P.tech(), requiresGift: true, effects: [{ type: 'deficientArt', art: '$param', scope: 'all' }] },
  'deficient-form-flaw': { repeatable: true, param: P.form(), requiresGift: true, effects: [{ type: 'deficientArt', art: '$param', scope: 'notMR' }] },
  'major-magical-focus': { requiresGift: true, param: P.text('Focus (e.g. weather, necromancy, birds)'), effects: [{ type: 'magicalFocus', scope: 'major' }], excludes: ['minor-magical-focus'] },
  'minor-magical-focus': { requiresGift: true, param: P.text('Focus (e.g. healing, self-transformation)'), effects: [{ type: 'magicalFocus', scope: 'minor' }], excludes: ['major-magical-focus'] },
  'potent-magic': { requiresGift: true, repeatable: true, param: P.text('Field of Potent Magic'), effects: [note('Minor: +3 to Lab Totals and Casting Score in field. Major: +6.')] },

  // ------------------------------------------------------------------ Study & teaching
  'apt-student': { effects: [{ type: 'sourceQuality', amount: 5, when: ['teaching', 'training'] }], tags: ['study'] },
  'book-learner': { effects: [{ type: 'sourceQuality', amount: 3, when: ['book'] }], tags: ['study', 'scholar'] },
  'independent-study': { effects: [{ type: 'sourceQuality', amount: 2, when: ['practice'] }, { type: 'sourceQuality', amount: 3, when: ['adventure'] }], tags: ['study'] },
  'free-study': { requiresGift: true, effects: [{ type: 'sourceQuality', amount: 3, when: ['vis'] }], tags: ['study'] },
  'unimaginative-learner-flaw': { requiresGift: true, effects: [{ type: 'sourceQuality', amount: -3, when: ['vis'] }] },
  'study-bonus': { requiresGift: true, effects: [{ type: 'sourceQuality', amount: 2, when: ['book', 'vis'] }, note('Only when studying in the presence of the Art.')], tags: ['study'] },
  'poor-student-flaw': { effects: [{ type: 'sourceQuality', amount: -3, when: ['teaching', 'book'] }] },
  'good-teacher': { effects: [{ type: 'teachingQuality', amount: 5 }, { type: 'bookWritingQuality', amount: 3 }], tags: ['scholar'] },
  'incomprehensible-flaw': { effects: [note('Anyone learning from you or your books halves their Advancement Total (or Lab Total for your Lab Texts).')] },
  'secondary-insight': { requiresGift: true, effects: [{ type: 'secondaryInsight' }], tags: ['study'] },
  'elemental-magic': { requiresGift: true, effects: [{ type: 'elementalMagic' }], tags: ['elemental'] },
  'skilled-parens': { requiresGift: true, forTypes: ['magus'], effects: [{ type: 'apprenticeXp', amount: 60 }, { type: 'apprenticeSpellLevels', amount: 30 }], excludes: ['weak-parens-flaw'] },
  'weak-parens-flaw': { requiresGift: true, forTypes: ['magus'], effects: [{ type: 'apprenticeXp', amount: -60 }, { type: 'apprenticeSpellLevels', amount: -30 }], excludes: ['skilled-parens'] },
  'mastered-spells': { requiresGift: true, repeatable: true, effects: [{ type: 'masteryXp', amount: 50 }] },
  'flawless-magic': { requiresGift: true, effects: [{ type: 'flawlessMagic' }, { type: 'spellMasteryMultiplier', multiplier: 2 }], tags: ['casting', 'combat'] },
  'loose-magic-flaw': { requiresGift: true, effects: [{ type: 'spellMasteryMultiplier', multiplier: 0.5 }] },

  // ------------------------------------------------------------------ Lab
  'inventive-genius': { requiresGift: true, effects: [{ type: 'labTotal', amount: 3, when: 'notFromText' }, { type: 'labTotal', amount: 3, when: 'experimenting' }], tags: ['lab'] },
  'creative-block-flaw': { requiresGift: true, effects: [{ type: 'labTotal', amount: -3, when: 'notFromText' }] },
  'adept-laboratory-student': { requiresGift: true, effects: [{ type: 'labTotal', amount: 6, when: 'fromText' }], tags: ['lab'] },
  'weak-scholar-flaw': { requiresGift: true, effects: [{ type: 'labTotal', amount: -6, when: 'fromText' }] },
  'weak-enchanter-flaw': { requiresGift: true, effects: [{ type: 'labTotalMultiplier', multiplier: 0.5, when: 'items' }] },
  'difficult-longevity-ritual-flaw': { requiresGift: true, effects: [{ type: 'labTotalMultiplier', multiplier: 0.5, when: 'longevityForSelf' }] },
  'short-ranged-magic-flaw': { requiresGift: true, effects: [{ type: 'labTotalMultiplier', multiplier: 0.5, when: 'rangeBeyondTouch' }, note('Casting Totals halved when not touching the target.')] },
  'magical-memory': { requiresGift: true, tags: ['lab'] },
  'cautious-sorcerer': { requiresGift: true, effects: [{ type: 'botchDice', amount: -3, when: 'spellsAndLab' }], tags: ['casting', 'lab'] },
  'careless-sorcerer-flaw': { requiresGift: true, effects: [{ type: 'botchDice', amount: 2, when: 'spells' }] },
  'weird-magic-flaw': { requiresGift: true, effects: [{ type: 'botchDice', amount: 1, when: 'spells' }] },
  'extractor-of-form-vis': { requiresGift: true, repeatable: true, param: P.form(), tags: ['lab', 'vis'] },
  'personal-vis-source': { requiresGift: true, tags: ['vis'] },
  masterpiece: { requiresGift: true, tags: ['enchanting'] },
  'waster-of-vis-flaw': { requiresGift: true },

  // ------------------------------------------------------------------ Casting
  'method-caster': { requiresGift: true, effects: [{ type: 'castingTotal', amount: 3, when: 'formulaicAndRitual' }], tags: ['casting'] },
  'poor-formulaic-magic-flaw': { requiresGift: true, effects: [{ type: 'castingTotal', amount: -5, when: 'formulaic' }] },
  'fast-caster': { requiresGift: true, effects: [{ type: 'spellInitiative', amount: 3 }], tags: ['casting', 'combat'] },
  'special-circumstances': { requiresGift: true, repeatable: true, param: P.text('Circumstance'), effects: [{ type: 'castingScore', amount: 3, when: 'circumstance' }], tags: ['casting'] },
  'cyclic-magic-positive': { requiresGift: true, param: P.text('Cycle'), effects: [{ type: 'castingScore', amount: 3, when: 'circumstance' }, { type: 'labTotal', amount: 3, when: 'circumstance' }] },
  'cyclic-magic-negative-flaw': { requiresGift: true, param: P.text('Cycle'), effects: [{ type: 'castingScore', amount: -3, when: 'circumstance' }, { type: 'labTotal', amount: -3, when: 'circumstance' }] },
  'life-boost': { requiresGift: true, tags: ['casting', 'penetration'] },
  'mercurian-magic': { requiresGift: true, effects: [{ type: 'ritualVisMultiplier', multiplier: 0.5 }], tags: ['ritual'] },
  'weak-magic-flaw': { requiresGift: true, effects: [{ type: 'penetrationMultiplier', multiplier: 0.5 }] },
  'mythic-blood': { requiresGift: true, effects: [{ type: 'implies', virtue: 'minor-magical-focus', note: 'Includes a Minor Magical Focus' }], tags: ['casting'] },
  'diedne-magic': { requiresGift: true, tags: ['spontaneous'] },
  'gorgiastic': { requiresGift: true },
  'leper-magus': { requiresGift: true, requires: ['leprosy-flaw'], house: 'tytalus', effects: [{ type: 'implies', virtue: 'life-boost' }] },
  'imbued-with-the-spirit-of-form': { requiresGift: true, param: P.form() },

  // ------------------------------------------------------------------ House mystery virtues
  heartbeast: { requiresGift: true, house: 'bjornaer', effects: [{ type: 'grantAbility', ability: 'heartbeast', score: 1 }] },
  'the-enigma': { requiresGift: true, house: 'criamon', effects: [{ type: 'grantAbility', ability: 'enigmatic-wisdom', score: 1 }] },
  'faerie-magic': { requiresGift: true, house: 'merinita', effects: [{ type: 'grantAbility', ability: 'faerie-magic', score: 1 }] },
  'verditius-magic': { requiresGift: true, house: 'verditius' },

  // ------------------------------------------------------------------ Social penalties / reputations
  'hermetic-prestige': { requiresGift: true, effects: [rep(4, 'Hermetic Prestige', 'good', 'Order of Hermes')], tags: ['hermetic', 'social'] },
  'hedge-wizard-flaw': { requiresGift: true, effects: [rep(3, 'Hedge Wizard', 'bad', 'Order of Hermes')] },
  'infamous-master-flaw': { requiresGift: true, effects: [rep(3, 'Infamous Master', 'bad', 'Order of Hermes')] },
  famous: { effects: [rep(4, 'Famous')], tags: ['social'] },
  'infamous-flaw': { effects: [rep(4, 'Infamous', 'bad')] },
  protection: { effects: [rep(3, 'Protected')] },
  'templar-prestige': { effects: [rep(4, 'Templar Prestige', 'good', 'Templars')] },
  'templar-office-holder': { effects: [rep(2, 'Templar Officer', 'good', 'Regional')] },
  'apostate-flaw': { effects: [rep(4, 'Apostate', 'bad', 'Former faith')] },
  'failed-student-flaw': { effects: [rep(2, 'Failed Student', 'bad', 'Academic')] },
  'failed-journeyman-flaw': { effects: [rep(2, 'Failed Journeyman', 'bad', 'Town')] },
  'failed-master-flaw': { effects: [rep(4, 'Failed Master', 'bad', 'Town')] },
  'gabai-flaw': { effects: [rep(2, 'Tax Collector', 'bad', 'Community')] },
  'feral-scent-flaw': { effects: [rep(2, 'Unclean', 'bad')] },

  // ------------------------------------------------------------------ Confidence
  'self-confident': { effects: [{ type: 'confidence', score: 2, points: 5 }], tags: ['social'] },
  'low-self-esteem-flaw': { effects: [{ type: 'confidence', score: 0, points: 0 }] },

  // ------------------------------------------------------------------ Combat & body
  tough: { effects: [{ type: 'soak', amount: 3 }], tags: ['combat'] },
  'frail-flaw': { effects: [{ type: 'soak', amount: -3 }] },
  'enduring-constitution': { effects: [{ type: 'woundPenalty', amount: -1 }, { type: 'fatiguePenalty', amount: -1 }], tags: ['combat'] },
  'low-tolerance-flaw': { effects: [{ type: 'woundPenalty', amount: 1 }, { type: 'fatiguePenalty', amount: 1 }] },
  'lightning-reflexes': { tags: ['combat'] },
  'slow-reflexes-flaw': { effects: [note('–3 Initiative in situations warranting a quick response.')] },
  'lame-flaw': { effects: [note('–6 moving quickly, –3 Dodge, –1 other combat scores.')] },
  'missing-eye-flaw': { effects: [note('–3 missile attacks & spell targeting; –1 melee attack.')] },
  'afflicted-tongue-flaw': { effects: [{ type: 'castingScore', amount: -2, when: 'all' }, note('–2 voice rolls; magi roll an extra botch die when casting with words.')] },
  'mute-flaw': { effects: [{ type: 'castingScore', amount: -10, when: 'all' }] },
  'no-hands-flaw': { effects: [{ type: 'castingScore', amount: -5, when: 'all' }] },
  'palsied-hands-flaw': { effects: [{ type: 'botchDice', amount: 1, when: 'spells' }, note('–2 to rolls involving holding or wielding an object.')] },
  'deaf-flaw': { effects: [{ type: 'botchDice', amount: 2, when: 'spells' }] },
  'clumsy-flaw': { effects: [{ type: 'botchDice', amount: 1, when: 'dexterity' }] },
  'enfeebled-flaw': { effects: [note('Cannot learn Martial Abilities; magi lose double Fatigue from casting.')] },
  'ability-block-flaw': { param: P.text('Blocked Abilities') },
  'unspecialized-flaw': { effects: [note('No specialties for any Ability.')] },

  // ------------------------------------------------------------------ Aging & living conditions
  'mild-aging': { effects: [{ type: 'livingConditions', amount: 1 }] },
  'poor-living-conditions-flaw': { effects: [{ type: 'livingConditions', amount: -1 }] },
  'leprosy-flaw': { effects: [{ type: 'livingConditions', amount: -2 }] },
  unaging: { tags: ['supernatural'] },
  'age-quickly-flaw': {},
  'magian-lineage': { effects: [note('Minor: –1 aging rolls. Major: see text.')] },

  // ------------------------------------------------------------------ Warping
  'warped-by-magic-flaw': { effects: [{ type: 'warpingPoints', amount: 5 }] },
  'raised-from-the-dead-flaw': { effects: [{ type: 'warpingPoints', amount: 3 }] },

  // ------------------------------------------------------------------ Supernatural (abilities auto-granted where the text says so)
  'animal-ken': { effects: [{ type: 'grantAbility', ability: 'animal-ken', score: 1 }], tags: ['animals', 'supernatural'] },
  dowsing: { effects: [{ type: 'grantAbility', ability: 'dowsing', score: 1 }], tags: ['supernatural'] },
  'magic-sensitivity': { effects: [{ type: 'grantAbility', ability: 'magic-sensitivity', score: 1 }], tags: ['supernatural'] },
  premonitions: { effects: [{ type: 'grantAbility', ability: 'premonitions', score: 1 }], tags: ['supernatural', 'combat'] },
  'second-sight': { effects: [{ type: 'grantAbility', ability: 'second-sight', score: 1 }], tags: ['supernatural'] },
  'sense-holiness-and-unholiness': { effects: [{ type: 'grantAbility', ability: 'sense-holiness-and-unholiness', score: 1 }], tags: ['supernatural', 'divine'] },
  'wilderness-sense': { effects: [{ type: 'grantAbility', ability: 'wilderness-sense', score: 1 }], tags: ['supernatural', 'wilderness'] },
  entrancement: { effects: [{ type: 'grantAbility', ability: 'entrancement', score: 1 }], tags: ['supernatural', 'social'] },
  shapeshifter: { effects: [{ type: 'grantAbility', ability: 'shapeshifter', score: 1 }], tags: ['supernatural', 'animals'] },
  'curse-throwing': { effects: [{ type: 'grantAbility', ability: 'curse-throwing', score: 1 }], tags: ['supernatural', 'healing'] },
  embitterment: { effects: [{ type: 'grantAbility', ability: 'embitterment', score: 1 }], tags: ['supernatural', 'social'] },
  persona: { effects: [{ type: 'grantAbility', ability: 'persona', score: 1 }], tags: ['supernatural', 'stealth'] },
  'font-of-knowledge': { effects: [{ type: 'grantAbility', ability: 'font-of-knowledge', score: 1 }], tags: ['supernatural', 'scholar'] },
  'corpse-magic': { effects: [{ type: 'grantAbility', ability: 'corpse-magic', score: 1 }], tags: ['supernatural'] },
  induction: { effects: [{ type: 'grantAbility', ability: 'induction', score: 1 }], tags: ['supernatural'] },
  hex: { effects: [{ type: 'grantAbility', ability: 'hex', score: 1 }], tags: ['supernatural'] },
  'sense-passions': { effects: [{ type: 'grantAbility', ability: 'sense-passions', score: 1 }], tags: ['supernatural', 'social'] },
  'summon-animals': { effects: [{ type: 'grantAbility', ability: 'summon-animals', score: 1 }], tags: ['supernatural', 'animals'] },
  'whistle-up-the-wind': { effects: [{ type: 'grantAbility', ability: 'whistle-up-the-wind', score: 1 }], tags: ['supernatural', 'weather'] },
  'crafters-healing': { effects: [{ type: 'grantAbility', ability: 'crafters-healing', score: 1 }], tags: ['supernatural', 'healing', 'craft'] },
  'enchanting-ability': { param: P.text('Artistic ability (e.g. Music)'), effects: [{ type: 'grantAbility', ability: 'enchanting-ability', score: 1 }], tags: ['supernatural', 'social'] },
  'true-faith': { effects: [note('True Faith score 1.')], tags: ['divine'] },
  relic: { effects: [note('Relic with True Faith 1.')], tags: ['divine'] },
  'powerful-relic': { effects: [note('Relic with True Faith 3 and one power.')], tags: ['divine'] },
  'demonic-blood': { effects: [{ type: 'mightScore', realm: 'Infernal', score: 5 }], tags: ['infernal'] },
  'strong-angelic-heritage': { requires: ['blood-of-the-nephilim'], tags: ['divine'] },

  // ------------------------------------------------------------------ Mythic companions
  'devil-child': { forTypes: ['mythic'], effects: [{ type: 'implies', virtue: 'demonic-might', note: 'Demonic Might or Demonic Powers free' }], requires: ['demonic-blood'] },
  'faerie-doctor': { forTypes: ['mythic', 'companion'], effects: [{ type: 'implies', virtue: 'dowsing', note: 'Dowsing free' }] },
  nephilim: { forTypes: ['mythic'], effects: [{ type: 'implies', virtue: 'strong-angelic-heritage', note: 'Strong Angelic Heritage free' }], requires: ['blood-of-the-nephilim'] },
  'spirit-votary': { forTypes: ['mythic'], effects: [{ type: 'implies', virtue: 'second-sight', note: 'Second Sight free' }] },

  // ------------------------------------------------------------------ Misc parameterized
  'alluring-to-beings': { param: P.text('Beings', ['mundane animals', 'faeries', 'magical beings']) },
  'inoffensive-to-beings': { param: P.text('Beings', ['animals', 'divine beings', 'faeries', 'demons', 'magical creatures']) },
  'offensive-to-beings-flaw': { param: P.text('Beings', ['animals', 'mundane humans', 'divine beings', 'faeries', 'demons', 'magical creatures']) },
  'unbearable-to-beings-flaw': { param: P.text('Beings', ['mundane humans', 'demons', 'divine beings']) },
  'cautious-with-ability': { repeatable: true, param: P.ability() },
  'careless-with-ability-flaw': { repeatable: true, param: P.ability() },
  'learn-ability-from-mistakes': { repeatable: true, param: P.ability() },
  'perfect-eye-for-commodity': { param: P.text('Commodity') },
  'aptitude-for-sin': { param: P.text('Sin') },
  'ways-of-the-land': { param: P.text('Terrain (Forest, Mountain, Steppe, Town...)') },
  'voice-of-the-land': { param: P.text('Environment') },
  'anchored-to-the-land-flaw': { param: P.text('Environment') },
  'fish-out-of-water-terrain-flaw': { param: P.text('Terrain') },
  'bound-to-realm-flaw': { param: P.realm() },
  'realm-stigmatic-flaw': { param: P.realm() },
  'master-of-form-creatures': { param: P.form() },
  'form-monstrosity-flaw': { param: P.form() },
  'hunger-for-form-magic-flaw': { param: P.form() },
  'incompatible-arts-flaw': { repeatable: true, param: P.text('Two Te+Fo combinations (e.g. InHe & InAn)') },
  'flawed-parma-magica-flaw': { repeatable: true, param: P.form() },
  'limited-magic-resistance-flaw': { repeatable: true, param: P.form() },
  'deleterious-circumstances-flaw': { param: P.text('Circumstance') },
  'restriction-flaw': { param: P.text('Restriction') },
  'necessary-condition-flaw': { param: P.text('Condition') },
  'vulnerable-magic-flaw': { repeatable: true, param: P.text('Condition') },
  'deft-form': { param: P.form() },
  'performance-magic': { param: P.ability('Performance Ability') },
  'skinchanger': { param: P.text('Animal') },
  'greater-immunity': { param: P.text('Hazard') },
  'lesser-immunity': { param: P.text('Hazard') },
  'dark-secret-flaw': { param: P.text('Secret') },
  'enemies-flaw': { param: P.text('Enemies') },
  'driven-flaw': { param: P.text('Goal') },
  'dutybound-flaw': { param: P.text('Duty') },
  'hatred-flaw': { param: P.text('Object of hatred') },
  'fear-flaw': { param: P.text('Fear') },
  'compulsion-flaw': { param: P.text('Compulsion') },
  'vow-flaw': { param: P.text('Vow') },
  'obsessed-flaw': { param: P.text('Obsession') },
  'true-love-pc': { param: P.text('Beloved') },
  'true-love-flaw': { param: P.text('Beloved') },
  'mentor-flaw': { param: P.text('Mentor') },
  'feud-flaw': { param: P.text('Feud with') },
  'grudge-flaw': { param: P.text('Grudge against') },
  'magical-being-companion-flaw': { param: P.text('Companion') },
  'prohibition-flaw': { param: P.text('Prohibition') },
  'necessary-realm-aura-for-ability-flaw': { param: P.text('Realm & Ability') },
  'land-regio-network': { param: P.text('Land') },
  'servant-of-the-land-flaw': { param: P.text('Land') },
  'imagined-folk-tradition-vulnerability-flaw': {},
};

/** Personality Flaws may be Major or Minor; Story Flaws etc. are covered by the data. */
export const PERSONALITY_TRAIT_FOR_FLAW = { Major: 6, Minor: 3 } as const;
