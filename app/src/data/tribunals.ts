// Virtues, Flaws and Abilities the Tribunal books add that the extracted lists lack: the Rhine's
// (Gild) Trained and (Gild) Enmity, and Forest Lore (Guardians of the Forests).

import type { AbilityDef, VirtueFlawDef } from './types';

const GILDS = ['Oak Gild', 'Hawthorn Gild', 'Ash Gild', 'Elder Gild', 'Linden Gild', 'Apple Gild'];

const TRIBUNAL_VF: VirtueFlawDef[] = [
  {
    id: 'gild-trained', name: '(Gild) Trained', kind: 'virtue', sizes: ['Minor'], categories: ['Hermetic'], tainted: false,
    notes: 'Rhine Tribunal', source: { book: 'GotF', line: 562 },
    text: "You have been trained for a number of seasons at the covenant of Durenmar during the end of your apprenticeship in the Rhine Tribunal. In addition to a season of training by a magus of House Bonisagus, you have also been inducted into one of the Rhine’s political gilds, receiving two or more seasons of training by one of its masters. You gain an additional 30 experience points, which may be spent on Order of Hermes Lore, Intrigue, and Durenmar Lore (or, rarely, the Lore of another covenant where you were trained by your gild). You gain a further 60 experience points that may be spent on any General or Arcane Abilities, Arts, and spells (one point per level) that are appropriate to your gild. For example, the Ash Gild Trained Virtue can confer Hunt, Penetration, and battle magics, whereas Elder Gild Trained might grant Etiquette, Faerie Lore, and faerie spells. This extra training may negate the effect of the Weak Parens Flaw, in which case the Virtue and Flaw cancel out and both can be dropped. With the approval of the storyguide, it may be combined with the Skilled Parens Virtue.\n\nThis Virtue is not compulsory for Rhine magi — not all magi apprenticed here opt to receive this training and join a gild immediately, although many do. A magus who joins a gild post-apprenticeship usually still receives gild training, but in this case the Virtue should not be taken — instead the magus must spend seasons of time to be trained, for which experience points are gained as usual according to the Long Term Events chapter of **Ars Magica** 5th Edition.",
    param: { kind: 'text', label: 'Gild', options: GILDS },
    effects: [
      { type: 'xpPool', amount: 30, label: 'Gild training (lore)', abilities: ['organization-lore', 'intrigue', 'area-lore'] },
      { type: 'xpPool', amount: 60, label: 'Gild training', abilityTypes: ['General', 'Arcane'], arts: true, spellLevels: true, note: 'suited to the gild' },
    ],
  },
  {
    id: 'gild-enmity', name: '(Gild) Enmity', kind: 'flaw', sizes: ['Minor'], categories: ['Hermetic'], tainted: false,
    notes: 'Rhine Tribunal', source: { book: 'GotF', line: 580 },
    text: "Either you or your master has done something notable to anger one of the Rhine Tribunal’s political gilds, or a prominent member thereof, and that gild now actively seeks to thwart you, through political means, or possibly otherwise. Magi from this gild will be unlikely to sponsor any prospective covenant you are involved in, or to sponsor you as a master, and this gild will be inclined to vote against you at Tribunal on any issues that concern you directly. Naturally, you may not join this gild.",
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
