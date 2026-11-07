// Boons and Hooks (Covenants ch.2) whose text gives the covenant, its people or its magi something the
// toolkit can apply: the covenfolk's nature (Inhuman Residents, Inhuman Covenfolk, Useful Curse), what
// they can do (Literate Covenfolk, Local Language) or lack (Incompetent, Distorted Covenfolk), their
// loyalty (Loyal and Rebellious Covenfolk, and the living conditions the Healthy Feature, Unhealthy
// Environment and Vivid Environment give), an Immunity within the aura, a regio of another realm, the
// covenant's Reputations (Prestige, Infamous) and its Edifices' Great Works.

import type { GameData } from '../data';
import { paramChoices } from './generate/paramChoices';
import type { CharVirtue, Character, Covenant, CovenantHookBoon, ImmunityKind, InhumanNature, Specialist } from './types';
import { uid } from '../util/id';

const named = (re: RegExp, kind?: 'hook' | 'boon') => (h: CovenantHookBoon) => re.test(h.name.trim()) && (!kind || h.kind === kind);
export const isRegioHook = named(/^regio$/i, 'hook');
export const isImmunity = named(/^immunity$/i, 'boon');
export const isInhuman = (h: CovenantHookBoon) => named(/^inhuman residents$/i, 'boon')(h) || named(/^inhuman covenfolk$/i, 'hook')(h);
export const isUsefulCurse = named(/^useful curse$/i, 'boon');
export const isLocalLanguage = named(/^local language$/i, 'boon');
export const isEdifice = named(/^edifices?$/i, 'boon');
const count = (cov: Covenant, re: RegExp, kind: 'hook' | 'boon') => cov.hooksBoons.filter(named(re, kind)).length;

// ------------------------------------------------------------------------------ Inhuman covenfolk

/** What each kind of inhuman covenfolk is spared, and the rules it lives under. */
export const INHUMAN: Record<InhumanNature, { label: string; one: string; noFood: boolean; noShelter: boolean; sleepless: boolean; ageless: boolean; learns: string; rules: string; ref: string }> = {
  faerie: {
    label: 'Faeries', one: 'a faerie',
    noFood: true, noShelter: false, sleepless: true, ageless: true,
    learns: 'By RoP: Faerie a faerie’s Pretenses grow by copying people rather than by study; the toolkit lets one learn from its seasons as the other kinds do, less its Might Score from each season’s Advancement Total, so a faerie of little or no Might learns nearly as a person does. It never ages, so never retires by age.',
    rules: 'Faeries do not age and need no food or air unless their role demands it; they live by faerie rules: an Aegis keeps out those with Might unless the magi let them in, a Divine aura weakens them, and many fear cold iron.',
    ref: 'RoP: Faerie (Susceptible to Deprivation: the faerie is otherwise "immune to aging")',
  },
  magic: {
    label: 'Beings of Magic', one: 'a being of Magic',
    noFood: true, noShelter: true, sleepless: true, ageless: true,
    learns: 'A being of Magic takes its Might Score off every Advancement Total (RoP: Magic): with a Might of 0, as most mere covenfolk have, it learns from work and practice as a person does; with a Might of 4 or more a season teaches it nothing. It never ages, so never retires by age.',
    rules: 'Magic characters "do not need to eat, drink, or sleep; they do not age, they have no need for shelter"; deprived of what their nature needs, they cannot recover Might.',
    ref: 'RoP: Magic, Magic Characters',
  },
  spirit: {
    label: 'Spirits and ghosts', one: 'a spirit or ghost',
    noFood: true, noShelter: true, sleepless: true, ageless: true,
    learns: 'A spirit or ghost takes its Might Score off every Advancement Total as a being of Magic does: one of little or no Might learns from its seasons, a stronger one nothing. It never ages, so never retires by age.',
    rules: 'Spirits and ghosts eat nothing, need no shelter and do not age; most are immaterial, so they watch, warn and carry messages rather than labor.',
    ref: 'RoP: Magic, Spirits; DE, Ghosts',
  },
  animal: {
    label: 'Awakened animals', one: 'an awakened animal',
    noFood: false, noShelter: false, sleepless: false, ageless: true,
    learns: 'An awakened beast takes its Magic Might off every Advancement Total (RoP: Magic): with little or none it learns from the work as a person does. It never ages, so never retires by age.',
    rules: 'Awakened beasts of Magic Might keep a beast’s keen senses with a person’s wits; as magic creatures they do not age, though most still hunt or forage as their kind does.',
    ref: 'Covenants ch.4, Fantastical Covenfolk; RoP: Magic',
  },
};
export const INHUMAN_NATURES = Object.keys(INHUMAN) as InhumanNature[];

/** Creatures with a Might score are absolutely immune to Warping (DE, Warping and Non-Humans). */
export const WARP_IMMUNE_NOTE = 'immune to Warping: beings with a Might score "are already fully part of one of the supernatural realms" (DE, Warping)';

export interface InhumanGroup {
  nature: InhumanNature;
  share: number;
  /** their usual Might Score (0 unless set: mere covenfolk have little or none) */
  might: number;
  from: string;
  /** the Boon or Hook it comes from */
  uid: string;
}

/** The default share of one Inhuman Residents Boon or Inhuman Covenfolk Hook: the majority for the first Boon, a part for each one more. */
export function inhumanDefaultShare(h: CovenantHookBoon, first: boolean): number {
  return h.kind === 'boon' ? (first ? 0.6 : 0.2) : 0.25;
}

/**
 * The covenant's inhuman covenfolk, a group for each Inhuman Residents Boon or Inhuman Covenfolk Hook
 * taken: the Boon taken more than once (Calebais is the book's example) brings more than one kind to
 * live side by side. Their shares add up, never past the whole of the covenfolk.
 */
export function inhumanGroups(cov: Covenant): InhumanGroup[] {
  const all = cov.hooksBoons.filter(isInhuman);
  let left = 1;
  let firstBoon = true;
  const out: InhumanGroup[] = [];
  for (const h of all) {
    const want = Math.max(0, Math.min(1, h.inhuman?.share ?? inhumanDefaultShare(h, firstBoon && h.kind === 'boon')));
    if (h.kind === 'boon') firstBoon = false;
    const share = Math.min(want, left);
    left -= share;
    out.push({ nature: h.inhuman?.nature ?? 'faerie', share, might: Math.max(0, h.inhuman?.might ?? 0), from: h.name, uid: h.uid });
  }
  return out;
}

/** The inhuman covenfolk in all: their share together, the most numerous kind, and where it comes from. */
export function inhumanCovenfolk(cov: Covenant): { nature: InhumanNature; share: number; from: string; groups: InhumanGroup[] } | undefined {
  const groups = inhumanGroups(cov);
  if (!groups.length) return undefined;
  const top = [...groups].sort((a, b) => b.share - a.share)[0];
  return { nature: top.nature, share: groups.reduce((t, g) => t + g.share, 0), from: groups.length > 1 ? groups.map((g) => g.from).join(', ') : top.from, groups };
}

/** A new covenfolk's nature, drawn at the groups' shares (none, most likely, when they are a minority). */
function drawNature(groups: InhumanGroup[], rng: () => number): InhumanGroup | undefined {
  let r = rng();
  for (const g of groups) {
    if (r < g.share) return g;
    r -= g.share;
  }
  return undefined;
}

/** A character or specialist's nature, set by hand or by the covenant's Boon when it was made there. */
export const natureOf = (x: Pick<Character, 'inhuman'> | Pick<Specialist, 'nature'>): InhumanNature | undefined => ('inhuman' in x ? x.inhuman : 'nature' in x ? x.nature : undefined);

// ------------------------------------------------------------------------------ What the covenfolk Boons give

export interface CovenfolkBoons {
  /** Literate Covenfolk: Artes Liberales 1, so they read and write their language (DE, Artes Liberales) */
  literate: boolean;
  /** Local Language: the language they speak */
  language?: string;
  /** Incompetent Covenfolk: dim-witted, unskilled or accident-prone (−1 to the work they do, the toolkit's reading) */
  incompetent: boolean;
  /** Distorted Covenfolk: distorted by the aura (a Warping Score of 1 and its Minor Flaw, the toolkit's reading) */
  distorted: boolean;
  curse?: NonNullable<CovenantHookBoon['curse']> & { name: string };
  inhuman?: ReturnType<typeof inhumanCovenfolk>;
}

export function covenfolkBoons(cov: Covenant): CovenfolkBoons {
  const curseHb = cov.hooksBoons.find(isUsefulCurse);
  return {
    literate: count(cov, /^literate covenfolk$/i, 'boon') > 0,
    language: cov.hooksBoons.find(isLocalLanguage)?.language,
    incompetent: count(cov, /^incompetent covenfolk$/i, 'hook') > 0,
    distorted: count(cov, /^distorted covenfolk$/i, 'hook') > 0,
    curse: curseHb ? { what: curseHb.curse?.what ?? curseHb.note ?? '', ability: curseHb.curse?.ability, bonus: curseHb.curse?.bonus ?? 2, share: curseHb.curse?.share ?? 0.25, name: curseHb.name } : undefined,
    inhuman: inhumanCovenfolk(cov),
  };
}

/** What the covenant's Boons and Hooks make of its covenfolk, in lines for the Covenfolk tab. */
export function covenfolkBoonLines(cov: Covenant, data?: GameData): string[] {
  const b = covenfolkBoons(cov);
  const out: string[] = [];
  const pct = (x: number) => `${Math.round(x * 100)}%`;
  if (b.inhuman) {
    for (const g of b.inhuman.groups) {
      const n = INHUMAN[g.nature];
      const spared = [n.noFood && 'no food (no Provisions for them)', n.noShelter && 'no shelter (no Buildings for them)', n.sleepless && 'no sleep', n.ageless && 'no aging'].filter(Boolean).join(', ');
      out.push(`${g.from}: about ${pct(g.share)} of the covenfolk are ${n.label.toLowerCase()}. They need ${spared}, and are ${WARP_IMMUNE_NOTE.split(':')[0]}. ${n.learns} ${n.rules} (${n.ref}).`);
    }
    if (b.inhuman.groups.length > 1) out.push(`In all, about ${pct(b.inhuman.share)} of the covenfolk are not human: ${b.inhuman.groups.map((g) => `${pct(g.share)} ${INHUMAN[g.nature].label.toLowerCase()}`).join(', ')}.`);
  }
  if (b.literate) out.push('Literate Covenfolk: they read and write their own language: Artes Liberales 1 on those made here (DE, Artes Liberales: a point for each writing system).');
  if (b.language) out.push(`Local Language: they speak ${b.language}, which those made here are given at 4.`);
  if (b.curse) {
    const ab = b.curse.ability ? data?.abilityById.get(b.curse.ability)?.name ?? b.curse.ability : undefined;
    out.push(`${b.curse.name}${b.curse.what ? ` (${b.curse.what})` : ''}: about ${pct(b.curse.share)} of the covenfolk suffer it${ab ? `, and it makes them better at ${ab} (+${b.curse.bonus} on those made here)` : ''}.`);
  }
  if (b.incompetent) out.push('Incompetent Covenfolk: those made here are a point worse at their work (the toolkit’s reading of "dim-witted, unskilled, or accident-prone").');
  if (b.distorted) out.push('Distorted Covenfolk: those made here start with a Warping Score of 1 and the Minor Flaw it brings (the toolkit’s reading).');
  const im = immunityFlaw(cov);
  if (im) {
    const name = data?.vfById.get(im.defId)?.name ?? im.defId;
    out.push(
      `Immunity to ${name}: about ${pct(im.share)} of those made for the covenant (grogs, companions, magi) have the Flaw, and spend the Virtue points it gives. It is held off while they live in the aura and is back when they leave (Covenants ch.2). Specialists and craftsmen have it noted.`,
    );
  }
  return out;
}

/** The share of the covenfolk that need no food, and that need no shelter (for the Provisions and Buildings bills). */
export function inhumanUpkeep(cov: Covenant): { noFood: number; noShelter: number } {
  const groups = inhumanGroups(cov);
  return {
    noFood: groups.reduce((t, g) => t + (INHUMAN[g.nature].noFood ? g.share : 0), 0),
    noShelter: groups.reduce((t, g) => t + (INHUMAN[g.nature].noShelter ? g.share : 0), 0),
  };
}

const abilityXp = (score: number) => (5 * score * (score + 1)) / 2;
const xpOf = (xp: Record<string, number | undefined>) => Object.values(xp).reduce<number>((t, n) => t + (n ?? 0), 0);

/**
 * Give a character made as one of the covenant's covenfolk what the covenant's Boons and Hooks give its
 * people: reading, the local language, the curse's Ability, a point less at its work, the aura's
 * distortion, and (by chance, at the Boon's share) an inhuman nature. Granted experience is free, so
 * it needs no Virtue. What was given, for the log.
 */
export function applyCovenfolkBoons(c: Character, cov: Covenant, data: GameData, rng: () => number, workAbility?: string): string[] {
  const b = covenfolkBoons(cov);
  const notes: string[] = [];
  const give = (abilityId: string, score: number, param?: string, why?: string) => {
    const has = c.abilities.find((a) => a.abilityId === abilityId && (param === undefined || a.param === param));
    const xp = abilityXp(score);
    if (has) {
      const total = xpOf(has.xp);
      if (total >= xp) return false;
      has.xp.free = (has.xp.free ?? 0) + xp - total;
    } else c.abilities.push({ uid: Math.random().toString(16).slice(2, 14), abilityId, param, xp: { free: xp }, why });
    return true;
  };
  if (b.literate && data.abilityById.get('artes-liberales') && give('artes-liberales', 1, undefined, 'Literate Covenfolk (covenant Boon)')) notes.push('Artes Liberales 1 (Literate Covenfolk)');
  if (b.language) {
    const dead = /latin|greek|hebrew|aramaic|syriac/i.test(b.language) && !/vulgar/i.test(b.language);
    if (give(dead ? 'dead-language' : 'living-language', 4, b.language, 'Local Language (covenant Boon)')) notes.push(`${b.language} 4 (Local Language)`);
  }
  if (b.curse?.ability && rng() < b.curse.share) {
    const ab = c.abilities.find((a) => a.abilityId === b.curse!.ability);
    const now = ab ? xpOf(ab.xp) : 0;
    let score = 0;
    while (abilityXp(score + 1) <= now) score++;
    if (give(b.curse.ability, score + b.curse.bonus, undefined, `${b.curse.name} (covenant Boon)`)) notes.push(`${data.abilityById.get(b.curse.ability)?.name ?? b.curse.ability} +${b.curse.bonus} (${b.curse.name}${b.curse.what ? `: ${b.curse.what}` : ''})`);
  }
  if (b.incompetent && workAbility) {
    const ab = c.abilities.find((a) => a.abilityId === workAbility);
    if (ab) {
      const total = xpOf(ab.xp);
      let score = 0;
      while (abilityXp(score + 1) <= total) score++;
      if (score > 1) {
        ab.xp.adjust = (ab.xp.adjust ?? 0) - (total - abilityXp(score - 1));
        notes.push(`${data.abilityById.get(workAbility)?.name ?? workAbility} a point lower (Incompetent Covenfolk)`);
      }
    }
  }
  if (b.distorted && (c.warpingPoints ?? 0) < 5) {
    c.warpingPoints = 5;
    notes.push('Warping Score 1 (Distorted Covenfolk): give it the Minor Flaw the aura suggests');
  }
  const g = b.inhuman && !c.inhuman ? drawNature(b.inhuman.groups, rng) : undefined;
  if (g) {
    c.inhuman = g.nature;
    if (INHUMAN[g.nature].sleepless) c.seasons = { ...(c.seasons ?? {}), sleepless: true };
    notes.push(`one of the ${INHUMAN[g.nature].label.toLowerCase()} (${g.from})`);
  }
  return notes;
}

/** The same for a specialist or craftsman: reading, the curse's Ability, a point less at the job, and an inhuman nature. */
export function applyCovenfolkBoonsToSpecialist(s: Specialist, cov: Covenant, rng: () => number, data?: GameData): string[] {
  const b = covenfolkBoons(cov);
  const notes: string[] = [];
  const abilities = (s.abilities ??= [{ id: s.ability, score: s.score }]);
  const give = (id: string, score: number, param?: string) => {
    const has = abilities.find((a) => a.id === id && (param === undefined || a.param === param));
    if (has) {
      if (has.score >= score) return false;
      has.score = score;
    } else abilities.push({ id, param, score });
    return true;
  };
  if (b.literate && give('artes-liberales', 1)) notes.push('Artes Liberales 1');
  if (b.language && give(/latin|greek|hebrew/i.test(b.language) ? 'dead-language' : 'living-language', 4, b.language)) notes.push(`${b.language} 4`);
  if (b.curse?.ability && rng() < b.curse.share) {
    const now = abilities.find((a) => a.id === b.curse!.ability)?.score ?? 0;
    if (give(b.curse.ability, now + b.curse.bonus)) notes.push(`+${b.curse.bonus} ${b.curse.ability} (${b.curse.name})`);
  }
  if (b.incompetent) {
    const job = abilities.find((a) => a.id === s.ability);
    if (job && job.score > 1) {
      job.score -= 1;
      notes.push('a point lower at the job (Incompetent Covenfolk)');
    }
  }
  if (b.distorted && (s.warpingPoints ?? 0) < 5) s.warpingPoints = 5;
  const g = b.inhuman && !s.nature ? drawNature(b.inhuman.groups, rng) : undefined;
  if (g) {
    s.nature = g.nature;
    notes.push(INHUMAN[g.nature].label.toLowerCase());
  }
  // a specialist has no Virtues and Flaws on the toolkit's sheet: the Immunity's Flaw is noted
  const im = immunityFlaw(cov);
  const name = im ? data?.vfById.get(im.defId)?.name ?? im.defId : '';
  if (im && !(s.notes ?? '').includes(`${name} (held off`) && rng() < im.share) {
    s.notes = [s.notes, `${name} (held off within the aura by the covenant's Immunity; back if they leave).`].filter(Boolean).join(' ');
    notes.push(name);
  }
  const top = [...abilities].sort((x, y) => y.score - x.score)[0];
  if (top && abilities.length) ((s.ability = top.id), (s.score = top.score));
  return notes;
}

// ------------------------------------------------------------------------------ Loyalty and living conditions

/** Healthy Feature (+1 a time, up to three) and Unhealthy Environment (−1 a time, up to three; not for those with a longevity ritual) on aging rolls. */
export function environmentAging(cov: Covenant | undefined, hasLongevity = false): { label: string; value: number }[] {
  if (!cov) return [];
  const healthy = Math.min(3, count(cov, /^healthy feature$/i, 'boon'));
  const unhealthy = hasLongevity ? 0 : Math.min(3, count(cov, /^unhealthy environment$/i, 'hook'));
  return [...(healthy ? [{ label: `Healthy Feature${healthy > 1 ? ` ×${healthy}` : ''}`, value: healthy }] : []), ...(unhealthy ? [{ label: `Unhealthy Environment${unhealthy > 1 ? ` ×${unhealthy}` : ''}`, value: -unhealthy }] : [])];
}

/**
 * The loyalty points the covenant's Boons and Hooks give (Covenants ch.2 and ch.3): its living
 * conditions from the Healthy Feature and Unhealthy Environment (10 a point of the covenfolk's Aging
 * modifier), the Vivid Environment (a step of living conditions, the toolkit's reading of "bonuses
 * for the calculations given in the Governance chapter"), and Loyal or Rebellious Covenfolk, which set
 * the points after the Base Loyalty to 30 (Prevailing Loyalty +3) or −75 (−5).
 */
export function boonLoyalty(cov: Covenant, base: number): { label: string; value: number }[] {
  const parts: { label: string; value: number }[] = [];
  for (const p of environmentAging(cov)) parts.push({ label: `${p.label} (living conditions)`, value: p.value * 10 });
  if (count(cov, /^vivid environment$/i, 'boon')) parts.push({ label: 'Vivid Environment', value: 10 });
  if (count(cov, /^loyal covenfolk$/i, 'boon') && base < 30) parts.push({ label: 'Loyal Covenfolk (to 30 points)', value: 30 - base });
  if (count(cov, /^rebellious covenfolk$/i, 'hook')) parts.push({ label: 'Rebellious Covenfolk (to −75 points)', value: -75 - base });
  return parts;
}

// ------------------------------------------------------------------------------ Immunity

/** What an Immunity can cover, as the Greater and Lesser Immunity Virtues do (DE): common, deadly hazards for the Major Boon, rare or lesser ones for the Minor. */
export const IMMUNITY_HAZARDS = ['fire', 'cold', 'drowning', 'falling', 'iron weapons', 'poison', 'lightning', 'suffocation'];
export const IMMUNITY_INFLUENCES = ['Warping', 'mind control (Mentem)', 'Infernal temptation and possession', 'faerie glamour', 'curses'];

export function immunities(cov: Covenant | undefined): { hb: CovenantHookBoon; kind: ImmunityKind; value: string }[] {
  if (!cov) return [];
  return cov.hooksBoons.filter(isImmunity).filter((h) => h.immunity?.value).map((h) => ({ hb: h, kind: h.immunity!.kind, value: h.immunity!.value }));
}

/** Whether the covenant's aura makes everyone in it immune to this disease (or to all disease). */
export function immuneToDisease(cov: Covenant | undefined, diseaseName: string): boolean {
  return immunities(cov).some((i) => i.kind === 'disease' && (i.value === 'all' || i.value.toLowerCase() === diseaseName.toLowerCase()));
}
export const immuneToWarping = (cov: Covenant | undefined) => immunities(cov).some((i) => i.kind === 'influence' && /warping/i.test(i.value));

/**
 * The Immunity to a Flaw (Covenants ch.2: "all people and objects are immune to a form of damage,
 * influence, or Flaw"): the Major Boon's, or (the troupe's ruling) a Minor Boon's to a Minor Flaw. A
 * Flaw with a choice in it (Hunger for (Form) Magic) is held off whatever the choice. With the share of
 * those made for the covenant who have it.
 */
export function immunityFlaw(cov: Covenant | undefined): { hb: CovenantHookBoon; defId: string; share: number; size: 'Major' | 'Minor' } | undefined {
  const all = immunities(cov).filter((x) => x.kind === 'flaw');
  const i = all.find((x) => x.hb.size === 'Major') ?? all[0];
  return i ? { hb: i.hb, defId: i.value, share: Math.max(0, Math.min(1, i.hb.immunity?.share ?? 1)), size: i.hb.size === 'Major' ? 'Major' : 'Minor' } : undefined;
}

/** Whether a paired Flaw is held off now: the character lives in the covenant's aura and is not away from it. */
export const flawHeld = (c: Character, cv: CharVirtue) => !!cv.heldBy && !c.awayFromCovenant && c.auraTime !== 'away';

/**
 * How a character's Flaws stand with the covenant's Immunity: paired and held off, the Immunity's Flaw
 * not yet paired with it, and pairings with an Immunity the covenant no longer has.
 */
export function immunityFlawState(cov: Covenant | undefined, c: Character): { paired: CharVirtue[]; unpaired: CharVirtue[]; stale: CharVirtue[] } {
  const im = immunityFlaw(cov);
  const flaws = c.virtues.filter((v) => v.heldBy || v.defId === im?.defId);
  return {
    paired: flaws.filter((v) => im && v.heldBy === im.hb.uid && v.defId === im.defId),
    unpaired: flaws.filter((v) => im && v.defId === im.defId && v.heldBy !== im.hb.uid),
    stale: flaws.filter((v) => v.heldBy && (!im || v.heldBy !== im.hb.uid || v.defId !== im.defId)),
  };
}

/**
 * Give a character made for the covenant the Flaw its Immunity holds off, paired with it, at the
 * Immunity's share: its Virtue points are theirs to spend, and it troubles them only away from the
 * aura. Not if they have it already, or the rules do not let them take it (a Hermetic Flaw on a
 * grog). Returns what was done, for the log.
 */
export function takeImmunityFlaw(c: Character, cov: Covenant | undefined, data: GameData, rng: () => number, o: { roll?: boolean } = {}): string | undefined {
  const im = immunityFlaw(cov);
  if (!im) return undefined;
  const def = data.vfById.get(im.defId);
  if (!def || def.kind !== 'flaw') return undefined;
  const has = c.virtues.find((v) => v.defId === im.defId);
  if (has) {
    if (has.heldBy === im.hb.uid) return undefined;
    has.heldBy = im.hb.uid;
    return `${def.name} paired with ${cov!.name || 'the covenant'}'s Immunity`;
  }
  if (o.roll !== false && rng() >= im.share) return undefined;
  if (def.categories.includes('Hermetic') && c.type !== 'magus') return undefined;
  // the Minor Immunity's Flaw is Minor; the Major's as the Flaw comes, a grog's Minor where it can be
  const size = im.size === 'Minor' && def.sizes.includes('Minor') ? 'Minor' : c.type === 'grog' && def.sizes.includes('Minor') ? 'Minor' : def.sizes.includes('Major') ? 'Major' : def.sizes[0];
  // within the Flaw limits (DE p.61, p.63: a grog 3 points, others 10 points and five Minor Flaws) it
  // gives its Virtue points to spend; past them (a grog's Major Flaw) it is taken all the same, for no points
  const POINTS: Record<string, number> = { Major: 3, Minor: 1 };
  const paid = c.virtues.filter((v) => data.vfById.get(v.defId)?.kind === 'flaw' && !v.free && !v.noPoints);
  const points = paid.reduce((t, v) => t + (POINTS[v.size] ?? 0), 0) + (POINTS[size] ?? 0);
  const minors = paid.filter((v) => v.size === 'Minor').length + (size === 'Minor' ? 1 : 0);
  const within = points <= (c.type === 'grog' ? 3 : 10) && (c.type === 'grog' || minors <= 5);
  const cv: CharVirtue = {
    uid: uid(),
    defId: im.defId,
    size,
    heldBy: im.hb.uid,
    ...(within ? {} : { free: true, noPoints: true, freeReason: 'the covenant’s Immunity: taken past the Flaw limits, for no points' }),
    why: `${cov!.name || 'the covenant'}'s Immunity holds it off within the aura (Covenants ch.2)`,
  };
  // a Flaw with a choice in it (a Form, a Characteristic) takes one at random: the aura holds off any of them, and
  // those who came to live in it came for that
  const choices = paramChoices(c, data, cv);
  const param = choices ? choices[Math.floor(rng() * choices.length)] : undefined;
  if (param) cv.param = param;
  c.virtues.push(cv);
  return `${def.name}${param ? ` (${param})` : ''}, held off within ${cov!.name || 'the covenant'}'s aura by its Immunity${within ? '' : ' (past the Flaw limits, so for no points)'}`;
}

/**
 * A Boon's or Hook's points (Covenants ch.2): Major 3, Minor 1, an Unknown Hook 3; a Regio Hook whose
 * regio is not magical is an additional Minor Hook; a Major Immunity that a member's Flaw is paired
 * with "becomes a Major Hook".
 */
export function hookBoonPoints(hb: CovenantHookBoon, members: Character[]): { hook: number; boon: number; note?: string } {
  const pts = hb.size === 'Major' || (hb.kind === 'hook' && hb.unknown) ? 3 : 1;
  if (hb.kind === 'hook') return isRegioHook(hb) && hb.regioRealm ? { hook: pts + 1, boon: 0, note: `a ${hb.regioRealm} regio: an additional Minor Hook` } : { hook: pts, boon: 0 };
  if (isImmunity(hb) && hb.immunity?.kind === 'flaw') {
    const paired = members.filter((m) => m.virtues.some((v) => v.defId === hb.immunity!.value));
    if (paired.length) return { hook: pts, boon: 0, note: `paired with ${paired.map((m) => m.name || 'a member').join(', ')}'s Flaw: it becomes a ${hb.size === 'Major' ? 'Major' : 'Minor'} Hook` };
  }
  return { hook: 0, boon: pts };
}

// ------------------------------------------------------------------------------ Reputations

/** The covenant's Reputations from its Boons and Hooks: Prestige 9 (Major) or 3 (Minor), Infamous 3 (as the Minor Prestige, ill). */
export function covenantReputations(cov: Covenant): { text: string; scope: string; score: number; bad: boolean }[] {
  return cov.hooksBoons
    .filter((h) => (h.kind === 'boon' && /^prestige$/i.test(h.name.trim())) || (h.kind === 'hook' && /^infamous$/i.test(h.name.trim())))
    .map((h) => ({ text: h.kind === 'hook' ? 'Infamous' : 'Prestigious', scope: h.note || (h.size === 'Major' ? 'the Order' : 'local'), score: h.kind === 'boon' && h.size === 'Major' ? 9 : 3, bad: h.kind === 'hook' }));
}
