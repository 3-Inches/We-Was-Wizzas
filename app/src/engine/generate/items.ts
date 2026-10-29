// Enchanted things a character comes with: a Redcap's devices from the Mercer House (DE, Redcap:
// fifty levels of effects for carrying messages at the Gauntlet, two more a year of good service,
// never anything to kill, wound or ensorcel many; Magic Items: 25 more and one more a year, no
// effect over 30), kept up year by year; and a magus's talisman, attuned with the Shape and Material
// bonuses that suit the magus's best Arts.

import { FORMS, TECHNIQUES, type Art, type GameData, type SpellDef } from '../../data';
import type { DerivedCharacter } from '../character/derive';
import { FREQUENCY, longevityBonus, talismanCapacity } from '../enchant';
import type { Rng } from '../dice';
import type { Character, EnchantedEffectRecord, EnchantedItem } from '../types';
import { uid } from '../../util/id';

// ---------------------------------------------------------------- a Redcap's devices

/** Effects useful for carrying messages, the first ones most often given. */
const COURIER_SPELLS = [
  'Seven-League Stride', 'Endurance of the Berserkers', 'Chamber of Spring Breezes', 'Ward Against Rain', 'Wizard’s Sidestep', 'Disguise of the Transformed Image', 'Bind Wound',
  'Eyes of the Cat', 'Comfort of the Drenched Traveler', 'Lamp Without Flame', 'Rise of the Feathery Body', 'Veil of Invisibility', 'The Chirurgeon’s Healing Touch',
  'Ward Against Heat and Flames', 'Gift of the Bear’s Fortitude', 'The Leap of Homecoming',
];
const COURIER_THINGS: { noun: string; material: string; size: EnchantedItem['size'] }[] = [
  { noun: 'red cap', material: 'cloth', size: 'small' },
  { noun: 'walking staff', material: 'wood', size: 'large' },
  { noun: 'message satchel', material: 'leather', size: 'medium' },
  { noun: 'boots', material: 'leather', size: 'medium' },
  { noun: 'brooch', material: 'silver', size: 'tiny' },
  { noun: 'belt', material: 'leather', size: 'small' },
  { noun: 'cloak', material: 'cloth', size: 'large' },
  { noun: 'ring', material: 'base metal', size: 'tiny' },
];

const norm = (s: string) => s.replace(/[’']/g, "'").toLowerCase();

/** A Redcap's levels from the House: fifty at the Gauntlet and two a year since (Magic Items: 25 more and one more a year each). */
export function redcapLevels(c: Character, yearsOfService: number): number {
  const extra = c.virtues.filter((v) => v.defId === 'magic-items').length;
  return 50 + 25 * extra + (2 + extra) * Math.max(0, yearsOfService);
}

/** Does the House keep this Redcap's devices up (a Redcap, not a Lone Redcap)? */
export function servedByMercerHouse(c: Character): boolean {
  return c.virtues.some((v) => v.defId === 'redcap') && !c.virtues.some((v) => v.defId === 'lone-redcap');
}

function effectOf(sp: SpellDef, uses: string): EnchantedEffectRecord {
  const mod = FREQUENCY.find((f) => f.value === uses)?.mod ?? 0;
  return {
    uid: uid(), name: sp.name, technique: sp.technique, form: sp.form, requisites: sp.requisites ?? [], baseLevel: sp.level ?? 0, range: sp.range, duration: sp.duration, target: sp.target,
    usesPerDay: uses, penetration: 0, concentration: false, effectUse: false, environmentalTrigger: false, fastTrigger: false, linkedTrigger: false, expiry: 'none', modifiedLevel: (sp.level ?? 0) + mod,
    investedPawns: Math.ceil(((sp.level ?? 0) + mod) / 10),
  };
}

/**
 * Spend a Redcap's unspent levels on new devices: effects for carrying messages they do not have yet,
 * once a day, the most useful first (no effect over 30 with Magic Items), each in a thing of its own.
 * Returns the names of what was added.
 */
export function issueRedcapDevices(c: Character, data: GameData, rng: Rng): string[] {
  const r = (c.redcap ??= { levels: 0, spent: 0 });
  const have = new Set(c.items.flatMap((i) => i.effects.map((e) => norm(e.name))));
  const cap = c.virtues.some((v) => v.defId === 'magic-items') ? 30 : Infinity;
  const spells = COURIER_SPELLS.map((n) => data.spells.find((s) => norm(s.name) === norm(n))).filter((s): s is SpellDef & { level: number } => !!s && !!s.level && s.level <= cap);
  const added: string[] = [];
  for (;;) {
    const left = r.levels - r.spent;
    // the first few still missing that fit, one of them at random
    const fits = spells.filter((s) => !have.has(norm(s.name)) && s.level <= left).slice(0, 3);
    if (!fits.length) break;
    const sp = fits[Math.floor(rng() * fits.length)];
    const thing = COURIER_THINGS[(c.items.length + added.length) % COURIER_THINGS.length];
    const item: EnchantedItem = {
      uid: uid(), name: `${thing.noun.replace(/^./, (x) => x.toUpperCase())} of ${sp.name}`, kind: 'lesser', material: thing.material, size: thing.size, shapeMaterialIds: [], openedPawns: 0,
      effects: [effectOf(sp, '1')], attunements: [], notes: 'A Redcap’s device from the Mercer House (DE, Redcap).',
    };
    c.items.push(item);
    have.add(norm(sp.name));
    r.spent += sp.level;
    added.push(item.name);
  }
  return added;
}

/**
 * A Redcap's turn of the year: two more levels from the House for good service (three or more with
 * Magic Items), spent on a new device when they reach one; and, from 35, a Longevity Ritual a magus
 * with a Lab Total of fifty devises for them free.
 */
export function redcapYearEnd(c: Character, data: GameData, rng: Rng): string[] {
  if (!servedByMercerHouse(c) || !c.redcap) return [];
  const out: string[] = [];
  const extra = c.virtues.filter((v) => v.defId === 'magic-items').length;
  c.redcap.levels += 2 + extra;
  const added = issueRedcapDevices(c, data, rng);
  if (added.length) out.push(`The Mercer House replaces and adds to ${c.name}’s devices for good service: ${added.join(', ')}.`);
  if (!c.longevity && c.age >= 35) {
    const bonus = longevityBonus(50, 0, true);
    c.longevity = { labTotal: 50, bonus, extraVis: 0, createdYear: c.birthYear + c.age };
    out.push(`A magus of the Mercer House devises ${c.name}’s Longevity Ritual (Lab Total 50: −${bonus} to aging rolls).`);
  }
  return out;
}

// ---------------------------------------------------------------- a magus's talisman

/** What a Shape or Material bonus helps, read for each Art. */
const ART_WORDS: Record<Art, RegExp> = {
  Cr: /\bcreo\b|creat|heal|restor|longevity|regenerat|fertil/i,
  In: /intellego|detect|seeing|sight|hearing|knowledge|astrolog|measure|divin|find/i,
  Mu: /\bmuto\b|transform|change|shape|disguis/i,
  Pe: /\bperdo\b|destroy|harm|kill|decay|disease|damage/i,
  Re: /\brego\b|control|movement|ward|bind|prevent|protect|immobil|manipulat/i,
  An: /animal|beast|snake|creature|horse|bird/i,
  Aq: /aquam|water|\bsea\b|sail|liquid/i,
  Au: /auram|\bair\b|wind|weather|storm|lightning/i,
  Co: /corpus|body|bodies|human|wound|healing|blood|strength/i,
  He: /herbam|wood|plant|tree|harvest/i,
  Ig: /ignem|fire|light|burn|heat/i,
  Im: /imaginem|invisib|illusion|silence|sound|song|image/i,
  Me: /mentem|mind|memor|emotion|courage|fear|love|deception|leadership/i,
  Te: /terram|stone|earth|metal|build/i,
  Vi: /\bvim\b|magic|demon|supernatural|faerie/i,
};

/**
 * A talisman for a magus who has none: a thing opened to as many pawns as the highest Technique and
 * Form allow, attuned with up to three Shape and Material bonuses (DE, Talisman Attunement) for
 * the magus's best Technique and Form, the bonus an Art names before one it only touches on.
 */
export function makeTalisman(c: Character, d: DerivedCharacter, data: GameData, rng: Rng): EnchantedItem {
  const best = (xs: readonly Art[]) => [...xs].sort((a, b) => d.arts[b].score - d.arts[a].score || d.arts[b].effectiveXp - d.arts[a].effectiveXp)[0];
  const t = best(TECHNIQUES);
  const f = best(FORMS);
  const fullName: Record<Art, string> = { Cr: 'Creo', In: 'Intellego', Mu: 'Muto', Pe: 'Perdo', Re: 'Rego', An: 'Animal', Aq: 'Aquam', Au: 'Auram', Co: 'Corpus', He: 'Herbam', Ig: 'Ignem', Im: 'Imaginem', Me: 'Mentem', Te: 'Terram', Vi: 'Vim' };
  const scored = data.shapeMaterial.flatMap((sm) =>
    sm.bonuses.map((b) => {
      const named = [t, f].some((a) => b.effect.trim().toLowerCase() === fullName[a].toLowerCase());
      const touches = ART_WORDS[f].test(b.effect) || ART_WORDS[t].test(b.effect);
      return { sm, b, score: named ? b.bonus * 2 : touches ? b.bonus : 0 };
    }),
  ).filter((x) => x.score > 0);
  // among the stronger fits, a few at random, no two from one Shape or Material
  const pool = scored.sort((a, b) => b.score - a.score).slice(0, 12);
  const chosen: typeof pool = [];
  while (chosen.length < 3 && pool.length) {
    const i = Math.floor(rng() * Math.min(pool.length, 5));
    const x = pool.splice(i, 1)[0];
    if (!chosen.some((y) => y.sm.id === x.sm.id)) chosen.push(x);
  }
  const first = chosen[0]?.sm.name ?? 'oak';
  const material = /wood/i.test(first) ? 'wood' : /bone|tooth|teeth|horn/i.test(first) ? 'bone' : /silver/i.test(first) ? 'silver' : /gold/i.test(first) ? 'gold' : /glass/i.test(first) ? 'glass' : /stone|marble|obsidian|jasper|crystal|ruby|emerald|diamond|sapphire|amber/i.test(first) ? 'semi-precious gem' : 'wood';
  const noun = ['staff', 'wand', 'ring', 'amulet', 'rod', 'circlet'][Math.floor(rng() * 6)];
  return {
    uid: uid(), name: `Talisman: ${noun} of ${chosen.map((x) => x.sm.name.toLowerCase()).join(' and ') || first.toLowerCase()}`, kind: 'talisman', material, size: noun === 'staff' ? 'large' : noun === 'ring' ? 'tiny' : 'small',
    shapeMaterialIds: chosen.map((x) => x.sm.id), openedPawns: talismanCapacity(d.arts[best(TECHNIQUES)].score, d.arts[best(FORMS)].score), effects: [],
    attunements: chosen.map((x) => ({ label: `${x.sm.name}: ${x.b.effect}`, bonus: x.b.bonus })), creatorId: c.id, attuned: true,
    notes: `Opened and attuned over the years; its attunements suit ${fullName[t]} and ${fullName[f]}.`,
  };
}
