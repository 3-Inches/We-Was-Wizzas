// Spells and familiars for generated magi. Spells: the apprenticeship's spell levels spent on the
// book spells a storyguide or player asks for (some Arts, a level range, rituals or not) within the
// creation limits (DE p.37: no spell above the Lab Total less the aura). Familiars: a creature of the
// kind that suits the magus's best Arts (DE, Suggested Familiars by Art), bound before play when
// the magus's Lab Total reaches its level, with the cords bought from that Lab Total.

import { ARTS, ART_NAMES, FORMS, TECHNIQUES, type Art, type Form, type GameData, type Technique } from '../../data';
import { deriveCharacter, type DerivedCharacter } from '../character/derive';
import { bestCords, familiarBindingLevel, familiarBindingVis } from '../enchant';
import { creationSpellLimit, labTotal, type AuraState, type LabContext } from '../magic';
import type { Character, Familiar, HouseRules } from '../types';
import type { Rng } from '../dice';
import { uid } from '../../util/id';
import { between, pick, sample } from './random';

export interface SpellPick {
  /** only spells of these Arts (Technique or Form); the magus's best if none */
  arts?: Art[];
  minLevel?: number;
  maxLevel?: number;
  rituals?: boolean;
}

/** Spend the apprenticeship's spell levels again on the spells asked for. Returns what was chosen. */
export function pickSpells(c: Character, data: GameData, rules: HouseRules, o: SpellPick, rng: Rng): string[] {
  const budget = () => deriveCharacter(c, data, rules).budgets.find((b) => b.id === 'apprenticeship')?.spellLevels;
  if (!budget()) return [];
  c.spells = c.spells.filter((s) => s.source !== 'apprenticeship');
  const d = deriveCharacter(c, data, rules);
  const best = [...ARTS].sort((a, b) => d.arts[b].score - d.arts[a].score);
  const wanted = o.arts?.length ? o.arts : [...best.filter((a) => (TECHNIQUES as readonly string[]).includes(a)).slice(0, 2), ...best.filter((a) => !(TECHNIQUES as readonly string[]).includes(a)).slice(0, 3)];
  const fits = (a: Art) => wanted.includes(a);
  const picked: string[] = [];
  const pool = data.spells.filter(
    (s) =>
      s.level !== null && !s.general && (fits(s.technique as Art) || fits(s.form as Art)) && (o.rituals || !s.ritual) && s.level >= (o.minLevel ?? 0) && s.level <= (o.maxLevel ?? 999) && !s.requisites.length && data.isBookEnabled(s.source.book),
  );
  for (const s of sample(rng, pool, pool.length)) {
    const b = budget()!;
    const left = b.total - b.spent;
    if (left < (o.minLevel ?? 1)) break;
    const limit = creationSpellLimit(deriveCharacter(c, data, rules), { technique: s.technique as Technique, form: s.form as Form }, rules.spellLevelLimitBonus).total;
    if (s.level! > Math.min(left, limit) || c.spells.some((x) => x.spellId === s.id)) continue;
    c.spells.push({ uid: uid(), spellId: s.id, spell: structuredClone(s), masteryXp: {}, masteryAbilities: [], source: 'apprenticeship', why: `asked for: ${wanted.map((a) => ART_NAMES[a]).join(', ')}` });
    picked.push(`${s.name} (${s.technique}${s.form} ${s.level})`);
  }
  return picked;
}

/** Creatures that suit a binding Art (DE, Suggested Familiars by Art), with a Size for each. */
const SUITED: Record<string, [string, number][]> = {
  Cr: [['beaver', -2], ['eagle', -2], ['lizard', -5], ['pelican', -2], ['weasel', -4]],
  In: [['tortoiseshell cat', -2], ['crow', -3], ['goat', -1], ['raven', -3], ['woodpecker', -4], ['toad', -5]],
  Mu: [['white cat', -2], ['fox', -2], ['hare', -3], ['moth', -8], ['toad', -5]],
  Pe: [['asp', -4], ['hedgehog', -4], ['salamander', -4], ['shrew', -6], ['weasel', -4]],
  Re: [['badger', -2], ['black cat', -2], ['cockerel', -3], ['dog', -1], ['lion', 1], ['owl', -3], ['wolf', 0]],
  An: [['hound', -1], ['horse', 2], ['stag', 1], ['bear', 2], ['boar', 0]],
  Aq: [['coot', -3], ['duck', -3], ['frog', -5], ['kingfisher', -4], ['otter', -2], ['swan', -2]],
  Au: [['crow', -3], ['kingfisher', -4], ['spider', -8], ['bat', -4], ['hawk', -3]],
  Co: [['caladrius', -3], ['cat', -2], ['dog', -1], ['goose', -2]],
  He: [['beaver', -2], ['monkey', -2], ['squirrel', -4], ['woodpecker', -4]],
  Ig: [['eagle', -2], ['salamander', -4], ['scitalis', -3]],
  Im: [['chameleon', -5], ['cricket', -8], ['magpie', -3], ['partridge', -3], ['peacock', -2]],
  Me: [['ape', -1], ['black cat', -2], ['fox', -2], ['owl', -3], ['wolf', 0]],
  Te: [['badger', -2], ['hedgehog', -4], ['ferret', -4], ['frog', -5], ['fox', -2], ['mole', -5], ['mouse', -6]],
  Vi: [['hoopoe', -3], ['magical hare', -3], ['magical raven', -3]],
};

/**
 * A familiar for a magus: a creature that suits the best Technique or Form, with Magic Might, bound
 * with those Arts. Bound before play when `bind` and the Lab Total reaches its level: the vis
 * spent, and the cords bought from the Lab Total (golden, bronze and silver in turn, each as far as
 * the points allow).
 */
export function generateFamiliar(d: DerivedCharacter, rng: Rng, o: { bind: boolean; aura?: AuraState; lab?: LabContext }): { familiar: Familiar; log: string }  {
  const te = [...TECHNIQUES].sort((a, b) => d.arts[b].score - d.arts[a].score)[0] as Technique;
  const fo = [...FORMS].sort((a, b) => d.arts[b].score - d.arts[a].score)[0] as Form;
  const lt = labTotal(d, { technique: te, form: fo }, { activity: 'familiar', aura: o.aura ?? { realm: 'Magic', strength: 3 }, lab: o.lab }).total;
  // a creature the magus can bind now when asked to (the smallest Might still has to fit), else any that suits
  const suited = [...(SUITED[fo] ?? []), ...(SUITED[te] ?? []), ...SUITED.An];
  const bindable = suited.filter(([, s]) => familiarBindingLevel(1, s) <= lt);
  const [species, size] = pick(rng, o.bind && bindable.length ? bindable : suited);
  // Might from 5 to 15, no more than the magus's Lab Total can bind
  let might = 5 * between(rng, 1, 3);
  while (might > 1 && familiarBindingLevel(might, size) > lt) might -= 1;
  const f: Familiar = {
    name: '', species, might, size, realm: 'Magic', bindingTechnique: te, bindingForm: fo, bindingLabTotal: 0, golden: 0, silver: 0, bronze: 0, pawnsSpent: 0, powers: [],
    notes: `A ${species} with Magic Might ${might}, suited to ${ART_NAMES[te]} ${ART_NAMES[fo]} (DE, Suggested Familiars by Art).`,
  };
  const level = familiarBindingLevel(might, size);
  if (!o.bind || lt < level) return { familiar: f, log: `Familiar: a ${species} (Might ${might}, Size ${size}); binding level ${level}${o.bind ? `, beyond the Lab Total ${lt} for now` : ''}.` };
  f.bindingLabTotal = lt;
  f.pawnsSpent = familiarBindingVis(lt);
  Object.assign(f, bestCords(lt));
  return { familiar: f, log: `Familiar: a ${species} (Might ${might}, Size ${size}), bound before play with ${ART_NAMES[te]} ${ART_NAMES[fo]} (Lab Total ${lt}, ${f.pawnsSpent} pawns): golden ${f.golden}, silver ${f.silver}, bronze ${f.bronze}.` };
}
