// The turn of the year, and what passes with it: each character ages and gains the year's Warping, each
// covenant's hooks come round, its wards are renewed and its aura has its year, and the covenfolk in a
// strong aura are warped. The saga's clock (time.ts) calls these.

import { ART_NAMES, type Art, type Characteristic } from '../data';
import { type DerivedCharacter } from './character/derive';
import { covenantAura, type CharacterContext } from './context';
import { countOf, specAbilities, specChar } from './covenantRules';
import { stressDie, type Rng } from './dice';
import { constantWarping, effectExpiry, seasonIndex } from './effects';
import { hazardPenalty } from './disease';
import { agingRoll, applyAgingPoint, crisisRoll, decrepitudeScore, lapseLongevity, neverAges, sparestCharacteristic } from './longterm';
import { routineYear } from './labRoutines';
import { auraOf, changeAura, dominionYearEnd, newAuraTrack, noteVisRitual, rollAuraYear, yearlyAuraModifier } from './aura';
import { optionOn } from './optional';
import type { ActiveEffect, Character, Covenant, Owed, Saga, Season, TimeReport } from './types';
import { rationsModifier } from './turb';
import { purseOf, takeVis, visText } from './vis';
import { abilityXpForScore, warpingScoreFromPoints } from './xp';
import { divineAuraWarps, isHolyMagus } from './holy';
import { gainWarping, warpingReaction } from './warping';
import { uid } from '../util/id';
import { environmentAging, flawHeld, immuneToWarping } from './covenantBoons';
import { longevityModifier } from './hermeticMysteries';

type Line = TimeReport['lines'][number];

/** Characters the clock moves: finished, alive. */
export function inPlay(c: Character): boolean {
  return c.creation.finalized && !c.wounds.dead;
}

/** Living Conditions for the aging roll (DE p.391 with the covenant's finances, Virtues and half the lab's Health). */
export function livingConditions(d: DerivedCharacter, ctx: CharacterContext): number {
  const cov = ctx.covenant;
  const base = cov ? (cov.season === 'Summer' || cov.season === 'Autumn' ? (d.isMagus ? 2 : 1) : d.isMagus ? 1 : 0) : 0;
  const labHealth = ctx.lab ? Math.floor(ctx.lab.characteristics.Health / 2) : 0;
  // a Healthy Feature (+1) or Unhealthy Environment (−1, not with a longevity ritual) at the covenant (Covenants ch.2)
  const site = environmentAging(cov, !!d.char.longevity).reduce((t, p) => t + p.value, 0);
  return base + (cov?.finances.livingConditions ?? 0) + d.livingConditionsMod + labHealth + site - hazardPenalty(d.char);
}

/** Someone who can tend a character through an aging crisis (DE, Aging: Int + Medicine against 6 adds their Medicine to the survival roll). */
export interface Attendant {
  id?: string;
  name: string;
  int: number;
  medicine: number;
}

/** The covenant's specialists and living members with Medicine, the best first. */
export function covenantAttendants(cov: Covenant, chars: Character[], derive: (c: Character) => DerivedCharacter): Attendant[] {
  const fromSpecs = cov.specialists.map((sp) => ({
    name: sp.name || 'the covenant’s physician',
    int: specChar(sp, 'Int'),
    medicine: Math.max(0, ...specAbilities(sp).filter((a) => a.id === 'medicine' || /medicine/i.test(a.label ?? '')).map((a) => a.score)),
  }));
  const fromMembers = chars
    .filter((m) => inPlay(m) && cov.memberIds.includes(m.id) && m.abilities.some((a) => a.abilityId === 'medicine'))
    .map((m) => ({ id: m.id, name: m.name || 'a companion', int: m.characteristics.Int, medicine: Math.max(0, ...derive(m).abilities.filter((a) => a.abilityId === 'medicine').map((a) => a.total)) }));
  return [...fromSpecs, ...fromMembers].filter((a) => a.medicine > 0).sort((a, b) => b.medicine - a.medicine || b.int - a.int);
}

/**
 * Hunger for (Form) Magic (DE): a pawn of the Form's vis each season, from the character's own stores;
 * a season without one costs a Long-Term Fatigue level that does not come back until a pawn is eaten,
 * and a pawn more each season gives one back. Nothing while the covenant's Immunity holds it off.
 */
export function hungerSeason(c: Character): string[] {
  const out: string[] = [];
  for (const cv of c.virtues.filter((v) => v.defId === 'hunger-for-form-magic-flaw')) {
    if (flawHeld(c, cv)) continue;
    const form = cv.param as Art | undefined;
    if (!form) continue;
    const purse = purseOf(c).vis;
    const name = ART_NAMES[form] ?? form;
    if (takeVis(purse, [form], 1).ok) {
      let back = 0;
      while ((c.hungerLost ?? 0) > 0 && takeVis(purse, [form], 1).ok) {
        c.hungerLost = (c.hungerLost ?? 0) - 1;
        back++;
      }
      out.push(`Hunger for ${name} Magic: ate a pawn of ${name} vis${back ? `, and ${back} more to win back ${back} Fatigue level${back > 1 ? 's' : ''}` : ''}.`);
      if (!c.hungerLost) delete c.hungerLost;
    } else {
      c.hungerLost = Math.min(5, (c.hungerLost ?? 0) + 1);
      out.push(`Hunger for ${name} Magic: no pawn of ${name} vis this season: a Long-Term Fatigue level is lost (${c.hungerLost} in all), back only as vis is eaten.`);
    }
  }
  return out;
}

/** Hunger for (Form) Magic's lost levels won back now, a pawn of the Form from the purse for each (DE). */
export function feedHunger(c: Character): string {
  const lost = c.hungerLost ?? 0;
  if (!lost) return '';
  const forms = c.virtues.filter((v) => v.defId === 'hunger-for-form-magic-flaw' && v.param).map((v) => v.param as Art);
  const purse = purseOf(c).vis;
  let back = 0;
  while (back < lost && takeVis(purse, forms, 1).ok) back++;
  c.hungerLost = lost - back;
  if (!c.hungerLost) delete c.hungerLost;
  const names = forms.map((f) => ART_NAMES[f] ?? f).join(' or ');
  return back ? `Ate ${back} pawn${back > 1 ? 's' : ''} of ${names} vis: ${back} Fatigue level${back > 1 ? 's' : ''} back${c.hungerLost ? `, ${c.hungerLost} still lost` : ''}.` : `No ${names} vis in ${c.name || 'their'} purse to eat.`;
}

/** A choice left for the troupe, kept on the character until it is made (the Seasons page's Resolve). */
export function owe(c: Character, year: number, season: Season, kind: Owed['kind'], text: string, want?: Owed['want']): void {
  (c.owed ??= []).push({ uid: uid(), year, season, kind, text, ...(want ? { want } : {}) });
}

/** A character's year: a year older, the aging roll, and the year's Warping. */
export function ageCharacter(c: Character, d: DerivedCharacter, ctx: CharacterContext, year: number, rng: Rng, roll: boolean, attendant?: Attendant): Line[] {
  const who = c.name || 'Unnamed';
  const lines: Line[] = [];
  // a magic character, and one of the inhuman covenfolk, does not age (RoP: Magic, RoP: Faerie)
  if (!c.creature?.magicCharacter && !c.inhuman) c.age += 1;
  // a magic character does not age (RoP: Magic); others roll from 35, or earlier with a Longevity Ritual
  // lab routines (Covenants) worsen the year's Living Conditions, and overtime can add Aging rolls; a
  // character under 35 then rolls too
  const routine = routineYear(c, year);
  // an immortal of the Great Elixir no longer ages (The Mysteries)
  const ages = !neverAges(c) && (c.age >= d.agingStartAge || !!c.longevity || routine.living < 0 || routine.extraRolls > 0);
  const due = roll && ages && c.lastAgedYear !== year;
  if (due) {
    if (routine.from.length) lines.push({ who, kind: 'aging', text: `Lab routines this year (${routine.from.join(', ')}): Living Conditions ${routine.living}${routine.extraRolls ? `, ${routine.extraRolls} extra Aging roll${routine.extraRolls > 1 ? 's' : ''}` : ''}.` });
    for (let i = 0; i < 1 + routine.extraRolls && !c.wounds.dead; i++) ageOnce(c, d, ctx, rng, routine.living, who, lines, year, attendant);
    c.lastAgedYear = year;
  }
  // Warping: constant effects (and a Longevity Ritual), and living in a strong aura not of one's own realm
  const cw = c.inhuman ? { points: 0, from: [] as string[] } : constantWarping(c);
  const aura = auraWarping(c, d, ctx, year);
  const wp = cw.points + aura;
  // prolonged exposure: of the traditions' reactions only the Witch Moon follows (warping.ts)
  const reaction = d.isMagus || c.inhuman ? undefined : warpingReaction(c, d);
  if (wp) {
    if (ctx.covenant?.living) c.warpingPoints += wp;
    else gainWarping(c, d, { points: wp, why: 'for the year', year, season: 'Winter', prolonged: true });
    const where = `${{ always: 'living in', half: 'half the time in', visits: 'frequent visits to', away: '' }[c.auraTime ?? 'always']} a ${ctx.aura.realm} aura of ${ctx.aura.strength}`;
    lines.push({ who, kind: 'warping', text: `+${wp} Warping Point${wp > 1 ? 's' : ''} for the year (${[...cw.from, ...(aura ? [where] : [])].join(', ')}).` });
  }
  // a non-magus changes as its Warping Score rises; Hermetic magi are drawn to Twilight instead (DE, Effects of
  // Warping), a folk witch suffers the Witch Moon instead (HMRE line 2071), and one with Sympathy Traits Faerie
  // Calling (RoP: Faerie line 6685)
  if (reaction === 'witch-moon' || reaction === 'calling') c.warpingNoted = warpingScoreFromPoints(c.warpingPoints);
  else if (!d.isMagus && !d.might) {
    const now = warpingScoreFromPoints(c.warpingPoints);
    const noted = c.warpingNoted ?? warpingScoreFromPoints(c.warpingPoints - wp);
    const from = aura ? `the ${ctx.aura.realm} aura` : cw.from.length ? cw.from.join(', ') : 'the magic that warped it';
    for (let n = noted + 1; n <= now; n++) {
      const what =
        n === 1 ? `a Minor Flaw that reflects ${from}` :
        n === 3 ? `a second Minor Flaw, again from ${from}` :
        n === 5 ? `a supernatural Minor Virtue attuned to ${from}${aura ? `; an aura of ${ctx.aura.realm} no longer warps it` : ''}` :
        n >= 6 ? `a Major Flaw fitting ${from}` : '';
      if (what) {
        lines.push({ who, kind: 'warping', text: `Warping Score ${n}: the character gains ${what}. The storyguide picks it: settle it on the Seasons page (DE, Effects of Warping).` });
        if (!ctx.covenant?.living) owe(c, year, 'Winter', 'warping', `Warping Score ${n}: ${what}.`, n === 5 ? { kind: 'virtue', size: 'Minor', supernatural: true } : { kind: 'flaw', size: n >= 6 ? 'Major' : 'Minor' });
      }
      if (n === 5 && aura && ctx.aura.realm !== 'None') c.warpingAttuned = ctx.aura.realm;
    }
    c.warpingNoted = Math.max(noted, now);
  }
  return lines;
}

/** One Aging roll and what it brings (DE, Aging). */
function ageOnce(c: Character, d: DerivedCharacter, ctx: CharacterContext, rng: Rng, livingMod: number, who: string, lines: Line[], year: number, attendant?: Attendant): void {
  const lr = longevityModifier(c.longevity);
  const r = agingRoll(c.age, livingConditions(d, ctx) + livingMod + rationsModifier(c, year), lr, d.agingRollParts, rng, !!c.longevity && c.age < 35);
  const notes: string[] = [];
  if (r.apparentAging) c.apparentAge = (c.apparentAge ?? c.age - 1) + 1;
  for (const p of r.agingPoints) notes.push(applyAgingPoint(c, p.char as Characteristic, p.points));
  if (r.anyChar) {
    const ch = sparestCharacteristic(c);
    notes.push(applyAgingPoint(c, ch, r.anyChar));
  }
  // Shinnui Shem's protection ends with the next Aging Point (RoP: The Divine)
  if (c.holy?.shinnui && (r.agingPoints.length || r.anyChar || r.crisis)) {
    c.holy.shinnui = undefined;
    notes.push('Shinnui Shem no longer protects.');
  }
  lines.push({ who, kind: 'aging', text: `Aging roll ${r.roll}: ${r.text}${notes.length ? ' ' + notes.join(' ') : ''}` });
  if (r.crisis) {
    const need = Math.max(1, abilityXpForScore(decrepitudeScore(c.decrepitudePoints) + 1) - c.decrepitudePoints);
    for (let i = 0; i < need; i++) applyAgingPoint(c, sparestCharacteristic(c), 1);
    const crisis = crisisRoll(c.age, decrepitudeScore(c.decrepitudePoints), rng);
    let text = `Crisis ${crisis.roll}: ${crisis.text}`;
    // a leper takes a Heavy Wound in every aging crisis (Leprosy Flaw)
    if (c.virtues.some((v) => v.defId === 'leprosy-flaw' && !flawHeld(c, v))) ((c.wounds.heavy += 1), (text += ' Leprosy: a Heavy Wound as well.'));
    // a failed roll, or a terminal illness, kills unless magic saves them: marked dead, to be brought back if it does (DE, Aging)
    const saved = ' Marked dead: settle it on the Seasons page (saved by magic, or not).';
    const dying = () => !ctx.covenant?.living && owe(c, year, 'Winter', 'dying', `An aging crisis: ${who} dies unless magic saves them (a Creo Corpus ritual).`);
    if (crisis.ease !== undefined) {
      // one attendant's care: Int + Medicine against 6 adds their Medicine; a botch takes 3 off (DE, Aging)
      let care = 0;
      if (attendant) {
        const r = stressDie(1, rng);
        const t = r.value + attendant.int + attendant.medicine;
        care = r.botches ? -3 : t >= 6 ? attendant.medicine : 0;
        text += r.botches ? ` ${attendant.name} botches the care (−3).` : t >= 6 ? ` ${attendant.name} tends them (Int + Medicine ${t}): +${care}.` : ` ${attendant.name}'s care does not help (Int + Medicine ${t}).`;
      }
      const save = stressDie(0, rng).value + (c.characteristics.Sta ?? 0) + care;
      if (save >= crisis.ease) text += ` Survived (Stamina roll ${save} against ${crisis.ease}).`;
      else {
        text += ` Stamina roll ${save} against ${crisis.ease}: the character dies unless a Creo Corpus ${crisis.crco} ritual saves them.${saved}`;
        c.wounds.dead = true;
        dying();
      }
    } else if (crisis.roll >= 19) {
      text += ` The character dies unless magic saves them.${saved}`;
      c.wounds.dead = true;
      dying();
    }
    if (c.longevity) {
      lapseLongevity(c, year);
      text += ' The crisis ends the Longevity Ritual; it can be performed again from its Laboratory Text (Lab & items).';
    }
    lines.push({ who, kind: 'crisis', text });
  }
  // Decrepitude 5: bedridden, and dead within a few months; no mortal help saves them (DE, Aging)
  if (decrepitudeScore(c.decrepitudePoints) >= 5 && !c.wounds.dead) {
    c.wounds.dead = true;
    lines.push({ who, kind: 'crisis', text: 'Decrepitude 5: bedridden, the character dies of old age within a few months. Marked dead.' });
  }
}

/** Warping Points a year from an aura of 6 to 10 by time spent in it: always within, half time, frequent visits (DE table). */
const AURA_WARPING: Record<number, [number, number, number]> = { 6: [1, 0, 0], 7: [1, 0.5, 0], 8: [2, 1, 0], 9: [4, 2, 1], 10: [12, 4, 2] };

/**
 * DE, Living in Strong Auras: an aura over 5 warps those who live in it, by its strength and the time
 * spent there (half a point a year is one every other year); magi in a Magic aura (and beings of its
 * realm) are spared.
 */
export function auraWarping(c: Character, d: DerivedCharacter, ctx: CharacterContext, year = 0): number {
  if (!ctx.covenant) return 0;
  // one of the inhuman covenfolk has a Might and is "absolutely immune to warping" (DE); an Immunity to Warping covers all in the aura
  if (c.inhuman || immuneToWarping(ctx.covenant)) return 0;
  const { realm, strength } = ctx.aura;
  const time = c.auraTime ?? 'always';
  if (strength < 6 || time === 'away' || c.warpingAttuned === realm) return 0;
  // a holy magus lives in the Dominion as in a Magic aura; holy characters and the faithful are not warped by the Divine (RoP: The Divine)
  const sameRealm = ((d.isMagus || isHolyMagus(d)) && realm === 'Magic') || d.might?.realm === realm || (c.creature && c.creature.realm === realm) || (realm === 'Divine' && !divineAuraWarps(c, d));
  if (sameRealm) return 0;
  const n = AURA_WARPING[Math.min(10, strength)][time === 'always' ? 0 : time === 'half' ? 1 : 2];
  return n === 0.5 ? (year % 2 === 0 ? 1 : 0) : n;
}

export const AURA_TIME: Record<NonNullable<Character['auraTime']>, string> = {
  always: 'lives, works and sleeps there',
  half: 'half the time (sleeps there, works elsewhere)',
  visits: 'frequent visits (a quarter of the time)',
  away: 'rarely there',
};

/** Hooks whose stories come round with the years (Covenants ch.2). */
export const HOOK_REMINDERS: { match: RegExp; every: number; text: string }[] = [
  { match: /indiscreet resource/i, every: 5, text: 'a story to keep the resource quiet (one every five years or so), or it is lost' },
  { match: /dark secret/i, every: 3, text: 'the secret crops up again as a potential problem' },
  { match: /itinerants/i, every: 1, text: 'the mobile community visits this year' },
  { match: /flickering aura/i, every: 1, text: "the yearly task, or the aura falls by one for the rest of the year" },
  { match: /faerie aura/i, every: 1, text: 'the faerie courts play their game twice a year' },
  { match: /contested resource/i, every: 1, text: 'getting the contested resource takes a story' },
];

export function hookReminders(cov: Covenant, year: number): Line[] {
  const lines: Line[] = [];
  for (const h of cov.hooksBoons) {
    if (h.kind !== 'hook') continue;
    const r = HOOK_REMINDERS.find((x) => x.match.test(h.name));
    if (!r) continue;
    const last = cov.hookStories?.[h.uid] ?? cov.foundedYear ?? year;
    if (year + 1 - last >= r.every) lines.push({ who: cov.name, kind: 'reminder', text: `${h.name}: ${r.text}. Mark the story played on the Seasons page.` });
  }
  // Dwindling Resource: a tenth of the original value a year
  for (const h of cov.hooksBoons) {
    if (h.kind !== 'hook' || !/dwindling resource/i.test(h.name) || !h.target) continue;
    const inc = cov.income.find((s) => s.uid === h.target);
    const vis = cov.visSources.find((s) => s.uid === h.target);
    if (inc) {
      inc.factor = Math.max(0, Math.round(((inc.factor ?? 1) - 0.1) * 1000) / 1000);
      lines.push({ who: cov.name, kind: 'covenant', text: `Dwindling Resource: ${inc.name} falls to ${Math.round((inc.factor ?? 0) * 100)}% of its value.` });
    } else if (vis) {
      const orig = (h as { original?: number }).original ?? vis.pawnsPerYear;
      (h as { original?: number }).original = orig;
      const years = ((h as { years?: number }).years ?? 0) + 1;
      (h as { years?: number }).years = years;
      vis.pawnsPerYear = Math.max(0, Math.round(orig * (1 - 0.1 * years)));
      lines.push({ who: cov.name, kind: 'covenant', text: `Dwindling Resource: ${vis.name} now gives ${vis.pawnsPerYear} pawns a year.` });
    }
  }
  return lines;
}

/** Wards and other covenant effects whose Year runs out: cast again from the covenant's vis when set to renew. */
export function renewCovenantEffects(cov: Covenant, chars: Character[], year: number, season: Season): Line[] {
  const lines: Line[] = [];
  const now = seasonIndex(year, season);
  for (const e of [...(cov.effects ?? [])]) {
    const end = effectExpiry(e);
    if (!end || seasonIndex(end.year, end.season) > now) continue;
    cov.effects = (cov.effects ?? []).filter((x) => x.uid !== e.uid);
    if (!e.renew) {
      lines.push({ who: cov.name, kind: 'effect', text: `${e.name} ends.` });
      continue;
    }
    const caster = chars.find((c) => c.id === e.renew!.casterId);
    const pawns = Math.max(1, Math.ceil(e.renew.level / 5));
    const arts: Art[] = e.renew.art ? [e.renew.art] : ['Re', 'Vi'];
    const paid = takeVis(cov.visStocks, arts, pawns);
    if (!paid.ok || (e.renew.casterId && !caster)) {
      lines.push({ who: cov.name, kind: 'reminder', text: `${e.name} ends and could not be cast again: ${!paid.ok ? `it needs ${pawns} pawns of ${arts.map((a) => ART_NAMES[a]).join(' or ')} vis` : 'its caster is gone'}.${/aegis/i.test(e.name) ? ' Until it is cast, spirits, faeries and others’ magic come and go freely, and the magi’s sanctums lie open to scrying.' : ''}` });
      continue;
    }
    const next: ActiveEffect = { ...e, uid: uid(), year, season };
    cov.effects = [...(cov.effects ?? []), next];
    noteVisRitual(cov, year, pawns);
    lines.push({ who: cov.name, kind: 'effect', text: `${e.name} cast again${caster ? ` by ${caster.name}` : ''} (${visText(paid.taken)} vis).` });
  }
  return lines;
}

/**
 * The aura at the year's end: a Flickering Aura's missed year is over, and with aura variation on
 * (RoP: Magic) a Magic aura's yearly modifier, and its roll if one is called for, with the Warping a
 * fracturing regio gives everyone living in it.
 */
export function auraYearEnd(cov: Covenant, members: Character[], saga: Saga, year: number, rng: Rng, derive: (c: Character) => DerivedCharacter): Line[] {
  const lines: Line[] = [];
  const t = cov.auraTrack;
  if (t?.flickerYear !== undefined && t.flickerYear <= year) {
    t.flickerYear = undefined;
    lines.push({ who: cov.name, kind: 'covenant', text: 'Flickering Aura: the year is over, and the aura is back to its strength.' });
  }
  const dominion = dominionYearEnd(cov, year);
  if (dominion) lines.push({ who: cov.name, kind: 'covenant', text: dominion });
  if (!optionOn(saga, 'auraVariation') || auraOf(cov).realm !== 'Magic') return lines;
  cov.auraTrack ??= newAuraTrack(cov);
  const mod = yearlyAuraModifier(cov, members, year);
  const r = rollAuraYear(cov, mod.total, year, rng);
  const why = mod.parts.map((p) => `${p.label} ${p.value >= 0 ? '+' : ''}${p.value}`).join(', ');
  lines.push({ who: cov.name, kind: 'covenant', text: `Aura: the year's modifier is ${mod.total >= 0 ? '+' : ''}${mod.total} (${why}). ${r.lines.join(' ')}` });
  if (Math.abs(mod.total) >= 4) changeAura(cov, r.delta, r.lines.join(' '), year, 'Winter');
  if (r.warping) {
    // a single event, so each tradition's reaction follows (warping.ts): Twilight, Nátt-thel, Faerie Calling
    // a living covenant's magi roll for Twilight as the season ends (livingTwilight.ts)
    for (const m of members.filter((x) => inPlay(x) && x.auraTime !== 'away')) gainWarping(m, derive(m), { points: r.warping, why: 'at once from the aura’s surge', year, season: 'Winter', living: !!cov.living });
    lines.push({ who: cov.name, kind: 'covenant', text: `${r.warping} Warping Points for everyone living in the aura; magi roll for Twilight${cov.living ? '' : ' (Seasons › Resolve)'}.` });
  }
  cov.auraTrack.notes = cov.auraTrack.notes.filter((n) => n.year > year);
  return lines;
}

/** What a Warping Score brings a mundane character, as the covenfolk's (DE, Effects of Warping). */
function warpingMark(n: number, from: string): string {
  return n === 1 ? `a Minor Flaw that reflects ${from}` : n === 3 ? `a second Minor Flaw from ${from}` : n === 5 ? `a supernatural Minor Virtue attuned to ${from}` : n >= 6 ? `a Major Flaw fitting ${from}` : '';
}

/**
 * The covenfolk in a strong aura (6 or more) are warped like anyone who lives, works and sleeps there
 * (DE, Living in Strong Auras): each specialist and craftsman by name, and the counted covenfolk as one
 * who has lived here all along. None warp in a covenant Immune to Warping, nor any of its inhuman folk
 * (a Might is immune). Returns the year's lines: the marks that show, for the storyguide to describe.
 */
export function covenfolkWarpingYearEnd(cov: Covenant, year: number): string[] {
  const aura = covenantAura(cov);
  if (aura.realm === 'None' || aura.strength < 6 || immuneToWarping(cov)) return [];
  const n = AURA_WARPING[Math.min(10, aura.strength)][0];
  const points = n === 0.5 ? (year % 2 === 0 ? 1 : 0) : n;
  if (!points) return [];
  const from = `the ${aura.realm} aura`;
  const out: string[] = [];
  for (const s of cov.specialists) {
    if (s.nature || s.characterId || countOf(s) === 0) continue;
    const was = warpingScoreFromPoints(s.warpingPoints ?? 0);
    s.warpingPoints = (s.warpingPoints ?? 0) + points;
    const now = warpingScoreFromPoints(s.warpingPoints);
    for (let k = was + 1; k <= now; k++) {
      const mark = warpingMark(k, from);
      if (!mark) continue;
      const text = `Warping Score ${k} from living in ${from}: ${s.name || 'they'} gain${s.name ? 's' : ''} ${mark} (the storyguide describes it).`;
      s.history = [...(s.history ?? []), { year, season: 'Winter', text }];
      out.push(`${s.name || 'A specialist'}: ${text}`);
    }
  }
  const was = warpingScoreFromPoints(cov.folkWarping ?? 0);
  cov.folkWarping = (cov.folkWarping ?? 0) + points;
  const now = warpingScoreFromPoints(cov.folkWarping);
  for (let k = was + 1; k <= now; k++) {
    const mark = warpingMark(k, from);
    if (mark) out.push(`The covenfolk who have lived here all along reach a Warping Score of ${k}: most bear ${mark}, and newcomers will in time.`);
  }
  return out;
}
