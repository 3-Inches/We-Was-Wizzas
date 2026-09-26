// Tags on Virtues and Flaws, built from the same data the rules check uses, so what a tag says
// is always what the rules enforce. They are shown as badges, searched, and used as filters.

import { HOUSES, HOUSE_BY_ID, HOUSE_SUGGESTED_VF } from './houses';
import { CHAR_NAMES } from './constants';
import type { Characteristic, CharType, VirtueFlawDef } from './types';

export type VFTagKind = 'type' | 'gift' | 'house' | 'adds' | 'needs' | 'not-with' | 'gender' | 'being' | 'tradition' | 'region' | 'limit' | 'xp';

export interface VFTag {
  /** stable id, used by filters (e.g. "house:merinita", "gift:needs") */
  id: string;
  label: string;
  kind: VFTagKind;
  /** a longer explanation, shown on hover */
  title?: string;
}

const TYPE_NAME: Record<CharType, string> = { grog: 'Grogs', companion: 'Companions', mythic: 'Mythic Companions', magus: 'Magi' };

function list(xs: string[]) {
  return xs.length <= 2 ? xs.join(' & ') : `${xs.slice(0, -1).join(', ')} & ${xs[xs.length - 1]}`;
}

/** Houses a Virtue/Flaw is tied to or suits: restricted to it, its House Virtue, suggested, or on-topic. */
export function vfHouses(def: VirtueFlawDef): string[] {
  const out = new Set<string>(def.houses ?? []);
  if (def.house) out.add(def.house);
  for (const h of HOUSES) {
    if (h.benefitOptions.some((b) => b.virtueId === def.id)) out.add(h.id);
    if (HOUSE_SUGGESTED_VF[h.id]?.some(([id]) => id === def.id)) out.add(h.id);
    if (h.tags.some((t) => def.tags?.includes(t))) out.add(h.id);
  }
  return [...out];
}

export function buildVfTags(def: VirtueFlawDef, nameOf: (id: string) => string): VFTag[] {
  const tags: VFTag[] = [];
  const t = (id: string, label: string, kind: VFTagKind, title?: string) => tags.push({ id, label, kind, title });

  // who may take it
  if (def.forTypes) t(`type:only:${def.forTypes.join('+')}`, `${list(def.forTypes.map((x) => TYPE_NAME[x]))} only`, 'type');
  if (def.categories.includes('Mythic Companion') && !def.forTypes) t('type:only:mythic', 'Mythic Companions only', 'type');
  for (const x of def.notForTypes ?? []) t(`type:not:${x}`, `Not for ${TYPE_NAME[x].toLowerCase()}`, 'type');
  const grogIllegal = (!def.sizes.includes('Minor') && !def.sizes.includes('Free')) || def.categories.includes('Hermetic');
  if (grogIllegal && !def.notForTypes?.includes('grog') && !def.forTypes) t('type:not:grog', 'Not for grogs', 'type', 'Grogs take only Minor, non-Hermetic Virtues and Flaws');
  if (def.requiresGift || (def.categories.includes('Hermetic') && !def.categories.includes('General'))) t('gift:needs', 'Needs The Gift', 'gift');
  if (def.noGift) t('gift:not', 'Not with The Gift', 'gift');

  // Houses
  for (const h of def.houses ?? []) t(`house:${h}`, `House ${HOUSE_BY_ID[h]?.name ?? h} only`, 'house');
  // a House's own Virtue (Heartbeast, Faerie Magic...) or one it can take as its free Virtue
  for (const h of HOUSES) if (h.benefitOptions.some((b) => b.virtueId === def.id)) t(`house:${h.id}`, `${h.name} House Virtue`, 'house');
  if (def.house && !def.houses?.includes(def.house) && !tags.some((x) => x.id === `house:${def.house}`)) t(`house:${def.house}`, `House ${HOUSE_BY_ID[def.house]?.name ?? def.house}`, 'house');

  // what it brings with it
  for (const e of def.effects ?? []) {
    if (e.type === 'implies') t(`adds:${e.virtue}`, `Adds ${nameOf(e.virtue)} (free)`, 'adds', e.note);
    if (e.type === 'grantAbility' && e.ability !== '$param') t(`grants:${e.ability}`, `Gives ${e.ability.replace(/-/g, ' ')} ${e.score}`, 'adds');
  }
  for (const n of def.needs ?? []) {
    if (n.auto) {
      const how = n.auto.noPoints ? 'no Virtue points' : 'counts as a normal Flaw';
      t(`adds:${n.auto.id}`, `Adds ${nameOf(n.auto.id)} (${how})`, 'adds', n.quote);
    } else {
      const gift = n.anyOf?.includes('$gift');
      t(gift ? 'gift:needs-or' : `needs:${(n.anyOf ?? []).join('|')}`, `Needs ${n.label.replace(/^(the|a|an) /i, '')}`, gift ? 'gift' : 'needs', n.quote);
    }
  }
  for (const r of def.requires ?? []) t(`needs:${r}`, `Needs ${nameOf(r)}`, 'needs');
  for (const x of def.excludes ?? []) t(`not-with:${x}`, `Not with ${nameOf(x)}`, 'not-with');

  // other limits
  if (def.maleOnly) t('gender:male', 'Male characters', 'gender', 'A status only available to characters society sees as male (see Paid Rights)');
  if (def.femaleOnly) t('gender:female', 'Female characters', 'gender');
  if (def.beings) t(`being:${def.beings}`, `For ${def.beings.replace(/ \(.*\)$/, '')}`, 'being', def.beings);
  if (def.tradition) t(`tradition:${def.tradition}`, def.tradition.replace(/ \(.*\)$/, ''), 'tradition', `${def.tradition} tradition`);
  if (def.region) t(`region:${def.region}`, `Only in ${def.region}`, 'region');
  for (const [ch, v] of Object.entries(def.minChar ?? {})) t(`limit:${ch}`, `${CHAR_NAMES[ch as Characteristic]} ${v === 1 ? '> 0' : `≥ ${v}`}`, 'limit');
  for (const [ch, v] of Object.entries(def.maxChar ?? {})) t(`limit:${ch}`, `${CHAR_NAMES[ch as Characteristic]} ≤ ${v}`, 'limit');
  if (def.minAge) t('limit:age', `Age ${def.minAge}+`, 'limit');

  // experience
  for (const e of def.effects ?? []) {
    if (e.type === 'xpPool') t('xp', `+${e.amount} xp (${e.label})`, 'xp');
    if (e.type === 'laterLifeXpPerYear') t('xp', `Later Life ${e.amount} xp/year`, 'xp');
    if (e.type === 'apprenticeXp') t('xp', `Apprenticeship ${e.amount > 0 ? '+' : ''}${e.amount} xp`, 'xp');
    if (e.type === 'apprenticeshipTotalXp') t('xp', `Apprenticeship ${e.amount} xp`, 'xp');
    if (e.type === 'apprenticeSpellLevels') t('xp', `Spell levels ${e.amount > 0 ? '+' : ''}${e.amount}`, 'xp');
    if (e.type === 'artAffinity' || e.type === 'abilityAffinity' || e.type === 'languageAffinity') t('xp', 'Affinity (xp × 1½)', 'xp');
    if (e.type === 'abilityAccess' && e.abilityTypes?.length) t('xp', `Can learn ${e.abilityTypes.join(', ')}`, 'xp');
  }
  // de-duplicate by label
  const seen = new Set<string>();
  return tags.filter((x) => (seen.has(x.label) ? false : (seen.add(x.label), true)));
}
