// Virtues, Flaws and Abilities the Tribunal books add that the extracted lists lack: the Rhine's
// (Gild) Trained and (Gild) Enmity, and Forest Lore (Guardians of the Forests).

import type { AbilityDef, VirtueFlawDef } from './types';

const GILDS = ['Oak Gild', 'Hawthorn Gild', 'Ash Gild', 'Elder Gild', 'Linden Gild', 'Apple Gild'];

const TRIBUNAL_VF: VirtueFlawDef[] = [
  {
    id: 'gild-trained', name: '(Gild) Trained', kind: 'virtue', sizes: ['Minor'], categories: ['Hermetic'], tainted: false,
    notes: 'Rhine Tribunal', source: { book: 'GotF', line: 572 },
    text: 'Trained at Durenmar at the end of apprenticeship and inducted into one of the Rhine’s political gilds. 30 experience points in Order of Hermes Lore, Intrigue and Durenmar Lore, and 60 more in General or Arcane Abilities, Arts and spells suited to the gild. May cancel the Weak Parens Flaw.',
    param: { kind: 'text', label: 'Gild', options: GILDS },
    effects: [
      { type: 'xpPool', amount: 30, label: 'Gild training (lore)', abilities: ['organization-lore', 'intrigue', 'area-lore'] },
      { type: 'xpPool', amount: 60, label: 'Gild training', abilityTypes: ['General', 'Arcane'], arts: true, spellLevels: true, note: 'suited to the gild' },
    ],
  },
  {
    id: 'gild-enmity', name: '(Gild) Enmity', kind: 'flaw', sizes: ['Minor'], categories: ['Hermetic'], tainted: false,
    notes: 'Rhine Tribunal', source: { book: 'GotF', line: 580 },
    text: 'You or your master angered one of the Rhine’s gilds. It works against you politically: its magi will not sponsor your covenant or your mastery, and it votes against you at Tribunal. You may not join it.',
    param: { kind: 'text', label: 'Gild', options: GILDS },
  },
];

const TRIBUNAL_ABILITIES: AbilityDef[] = [
  {
    id: 'forest-lore', name: 'Forest Lore', type: 'Arcane', restricted: false, specialties: ['a forest', 'its spirit', 'its vis'],
    text: 'Knowledge of a supernatural forest, its beings and places, and the spirit that rules it. Raised only by practice in the forest (Source Quality: its aura). Applies to the home forest; a foreign forest needs three more.',
    source: { book: 'GotF', line: 1099 },
  },
];

export function tribunalVirtueDefs(existing: Set<string>): VirtueFlawDef[] {
  return TRIBUNAL_VF.filter((v) => !existing.has(v.id));
}

export function tribunalAbilityDefs(existing: Set<string>): AbilityDef[] {
  return TRIBUNAL_ABILITIES.filter((a) => !existing.has(a.id));
}
