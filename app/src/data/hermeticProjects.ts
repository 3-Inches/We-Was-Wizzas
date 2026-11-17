// Hermetic Projects: what its chapters add to the lab and the bestiary's ailments that the extracted
// lists lack: the volcanic laboratory's Features, Virtues and Flaws (Chapter Two), two shape and
// material bonuses, and the diseases of a menagerie's beasts (Chapter Seven).

import type { LabFeatureDef, LabVFDef, ShapeMaterialDef } from './types';

const src = (line: number, anchor: string) => ({ book: 'HP', line, anchor });

const lab = (id: string, name: string, kind: 'virtue' | 'flaw', size: LabVFDef['size'], group: LabVFDef['group'], line: number, text: string, modText: string, characteristics: LabVFDef['mods']['characteristics'], specializations: Record<string, number> = {}): LabVFDef => ({
  id, name, kind, size, group, repeatable: false, text, modText, mods: { characteristics, specializations, choicePoints: null, choice: null }, source: src(line, id),
});

export const HP_LAB_VF: LabVFDef[] = [
  lab('dormant-volcano', 'Dormant Volcano', 'virtue', 'Free', 'Structure', 1185, 'The laboratory is in a dormant volcano’s crater.', '+1 Aesthetics; +1 Ig.', { Aesthetics: 1 }, { Ig: 1 }),
  lab('active-volcano', 'Active Volcano', 'flaw', 'Major', 'Structure', 1189, 'The laboratory is in an active volcano’s crater (the lab and the magus somehow protected from its catastrophic hazards).', '+2 Upkeep, −2 Safety, −1 Health; +1 Experimentation, +3 Ig.', { Upkeep: 2, Safety: -2, Health: -1 }, { Experimentation: 1, Ig: 3 }),
  lab('mineral-bath', 'Mineral Bath', 'virtue', 'Minor', 'Outfittings', 1193, 'A mineral bath heated by a volcanic source; the magus takes frequent baths while contemplating the work.', '+2 Health, −1 Safety; +1 Aq, +1 Longevity Rituals.', { Health: 2, Safety: -1 }, { Aq: 1, 'Longevity Rituals': 1 }),
  lab('volcanic-spirit-forge', 'Volcanic Spirit Forge', 'virtue', 'Minor', 'Supernatural', 1197, 'A forge heated by a volcanic spirit.', '−1 Upkeep, −1 Safety; +1 Experimentation, +1 Re, +1 Ig.', { Upkeep: -1, Safety: -1 }, { Experimentation: 1, Re: 1, Ig: 1 }),
  lab('hell-portal', 'Hell Portal', 'flaw', 'Major', 'Supernatural', 1201, 'The laboratory holds a fiery portal to Hell.', '−2 Safety, +2 Warping; +1 Re, +3 Vi.', { Safety: -2, Warping: 2 }, { Re: 1, Vi: 3 }),
];

const feature = (id: string, name: string, line: number, text: string, specializations: string[]): LabFeatureDef => ({ id, name, text, specializations, source: src(line, id) });

/** Greater (Major) or Lesser (Minor) Features: a volcanic laboratory’s. */
export const HP_LAB_FEATURES: LabFeatureDef[] = [
  feature('fumes', 'Fumes', 1175, 'A glass sphere on a plinth, swirling with noxious vapors captured from a volcanic vent.', ['Pe', 'Au', 'Ig']),
  feature('pool-of-lava', 'Pool of Lava', 1177, 'The lab encloses a pool of lava, or a cauldron keeps a sample of lava hot and molten.', ['Ig', 'Te']),
  feature('thermal-spring', 'Thermal Spring', 1181, 'A volcanically heated spring bubbles up from the center of the lab.', ['Cr', 'Aq', 'Ig']),
  feature('volcanic-rock', 'Volcanic Rock', 1183, 'A huge slab of volcanic rock at the center of the lab.', ['Mu', 'Ig', 'Te']),
];

export const HP_SHAPE_MATERIAL: ShapeMaterialDef[] = [
  { id: 'volcano', name: 'Volcano', bonuses: [{ bonus: 5, effect: 'volcanoes' }] },
  { id: 'manticore-teeth', name: 'Manticore Teeth', bonuses: [{ bonus: 4, effect: 'ferocity' }, { bonus: 5, effect: 'swiftness' }] },
];

/** The diseases of a menagerie's beasts (treated with Animal Handling, not Medicine). Rabies is in Art & Academe already. */
export const HP_DISEASES = [
  { id: 'hp-gingivitis', name: 'Gingivitis (animals)', stage: 'Minor' as const, humor: 'Sanguine', severity: 7, stable: 6, improve: 12, interval: 'Month' as const, cause: 'Too much stored grain and not enough living grass, common in large herbivores. Untreated, the teeth are lost.', symptoms: 'Swollen gums, odorous breath, loose teeth.', source: { book: 'HP', line: 5732 } },
  { id: 'hp-hoof-and-mouth', name: 'Hoof and Mouth (animals)', stage: 'Minor' as const, humor: 'Phlegmatic', severity: 9, stable: 4, improve: 18, interval: 'Week' as const, cause: 'Spreads quickly through a herd, mostly cows, sheep and goats; not fatal, but hard to cure, and it lowers milk.', symptoms: 'Lesions on the hoof and ulcers in the mouth.', source: { book: 'HP', line: 5741 } },
  { id: 'hp-spavin', name: 'Spavin (animals)', stage: 'Minor' as const, humor: 'Melancholic', severity: 12, stable: 12, improve: 18, interval: 'Season' as const, cause: 'The cartilage of a quadruped’s joints hardens.', symptoms: 'Hard to diagnose: at most a joint swells, over a long time.', source: { book: 'HP', line: 5757 } },
];
