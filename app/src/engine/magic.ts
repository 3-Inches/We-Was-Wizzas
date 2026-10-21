// Hermetic magic totals: Casting Scores, Lab Totals, Penetration, Magic Resistance.
// Every result carries a breakdown ("parts") so the UI can show *why* a number is what it is.

import { ART_NAMES, CHAR_NAMES, isForm, isTechnique, type Art, type Form, type Technique } from '../data';
import type { DerivedCharacter } from './character/derive';

export type Realm = 'Magic' | 'Faerie' | 'Divine' | 'Infernal' | 'None';

export interface AuraState {
  strength: number;
  realm: Realm;
  regio?: boolean;
}

export interface Part {
  label: string;
  value: number;
}

export interface TotalResult {
  total: number;
  parts: Part[];
  halved: boolean;
  notes: string[];
  botchDice?: number;
  /** the lab cannot be used for this work (Missing Equipment) */
  impossible?: boolean;
}

/** DE Realm Interaction Table (p.410). */
export function auraModifier(power: Realm, aura: AuraState | undefined, opts: { faerieMagic?: boolean } = {}): { mod: number; botch: number; note?: string } {
  if (!aura || aura.realm === 'None' || aura.strength <= 0) return { mod: 0, botch: 0 };
  const n = aura.strength;
  const table: Record<Exclude<Realm, 'None'>, Record<Exclude<Realm, 'None'>, number>> = {
    Magic: { Magic: n, Divine: 0, Faerie: Math.floor(n / 2), Infernal: -n },
    Divine: { Magic: -3 * n, Divine: n, Faerie: -4 * n, Infernal: -5 * n },
    Faerie: { Magic: Math.floor(n / 2), Divine: 0, Faerie: n, Infernal: -n },
    Infernal: { Magic: -n, Divine: 0, Faerie: -2 * n, Infernal: n },
  };
  if (power === 'None') return { mod: 0, botch: 0 };
  let mod = table[aura.realm][power];
  let foreign = aura.realm !== power;
  if (opts.faerieMagic && power === 'Magic' && aura.realm === 'Faerie') {
    mod = n;
    foreign = false;
  }
  const botch = foreign ? n * (aura.regio ? 2 : 1) : 0;
  return { mod, botch, note: foreign ? `${aura.realm} aura ${n}` : undefined };
}

export interface ArtsUsed {
  technique: Technique;
  form: Form;
  requisites?: Art[];
}

/** Effective Technique and Form values after requisites (lowest applies), Puissant, and deficiency flags. */
export function effectiveArts(d: DerivedCharacter, a: ArtsUsed, opts: { elementalMagic?: boolean } = {}) {
  const reqs = a.requisites ?? [];
  const ELEM: Art[] = ['Aq', 'Au', 'Ig', 'Te'];
  // Elemental Magic (DE): an elemental primary Form ignores other elements used as requisites.
  const ignoreElementalReq = opts.elementalMagic && ELEM.includes(a.form);
  const techs: Technique[] = [a.technique, ...reqs.filter(isTechnique)];
  const forms: Form[] = [a.form, ...reqs.filter(isForm).filter((f) => !(ignoreElementalReq && ELEM.includes(f)))];
  const val = (x: Art) => d.arts[x].value;
  let tech = techs.reduce((m, x) => Math.min(m, val(x)), Infinity);
  let form = forms.reduce((m, x) => Math.min(m, val(x)), Infinity);
  if (!isFinite(tech)) tech = 0;
  if (!isFinite(form)) form = 0;
  const used: Art[] = [...techs, ...forms];
  const deficientAll = used.some((x) => d.arts[x].deficient === 'all' || d.arts[x].deficient === 'notMR');
  const deficientCount = used.filter((x) => d.arts[x].deficient !== 'none').length;
  return { tech, form, used, deficient: deficientAll, deficientCount };
}

/** Whether a "circumstance" bonus applies: all of them (true) or only the chosen ones (by Virtue uid). */
function circumstanceApplies(c: boolean | string[] | undefined, e: Record<string, unknown>): boolean {
  return Array.isArray(c) ? c.includes(String(e.fromUid)) : !!c;
}

/** Bonuses that apply only sometimes, for the player to switch on with one click. */
export function conditionalBonuses(d: DerivedCharacter): { uid: string; label: string; casting?: number; lab?: number }[] {
  const out = new Map<string, { uid: string; label: string; casting?: number; lab?: number }>();
  for (const e of d.effects) {
    const r = e as unknown as { type: string; when?: string; amount?: number; fromUid: string; fromName: string; param?: string };
    if (r.when !== 'circumstance' || (r.type !== 'castingScore' && r.type !== 'labTotal')) continue;
    const x = out.get(r.fromUid) ?? { uid: r.fromUid, label: `${r.fromName}${r.param ? ` (${r.param})` : ''}` };
    if (r.type === 'castingScore') x.casting = (x.casting ?? 0) + (r.amount ?? 0);
    else x.lab = (x.lab ?? 0) + (r.amount ?? 0);
    out.set(r.fromUid, x);
  }
  return [...out.values()];
}

function effectsOf(d: DerivedCharacter, type: string) {
  return d.effects.filter((e) => e.type === type) as Array<Record<string, unknown> & { amount: number; when?: string; fromName: string; multiplier?: number }>;
}

export interface CastingOptions {
  kind: 'formulaic' | 'ritual' | 'spontaneous';
  aura?: AuraState;
  inFocus?: boolean;
  talismanBonus?: number;
  wordsGestures?: number; // e.g. loud+exaggerated = +2
  /** Special Circumstances / Cyclic Magic applies: all of them, or those from these Virtue uids */
  circumstance?: boolean | string[];
  ceremonial?: boolean;
  /** Diedne Magic, exerting oneself on a spontaneous spell: the lowest Art counts twice */
  diedneExerted?: boolean;
  /** Life Boost: Fatigue levels spent, +5 each on a Formulaic or Ritual Casting Total */
  lifeBoost?: number;
  /** Spell Improvisation: a similar Formulaic spell's magnitude, for spontaneous casting */
  similarSpell?: { name: string; magnitude: number };
  /** anything else that applies now (a temporary or obscure bonus) */
  other?: number;
  extra?: Part[];
  masteryScore?: number; // added to casting total for mastered spells? (not by default)
  visPawns?: number; // +2 casting score per pawn
  notTouching?: boolean; // Short-Ranged Magic
}

/** Casting Score (no die). Formulaic Casting Total = Casting Score + die. */
export function castingScore(d: DerivedCharacter, arts: ArtsUsed, o: CastingOptions): TotalResult {
  const parts: Part[] = [];
  const notes: string[] = [];
  const hasFM = d.virtues.some((v) => v.cv.defId === 'faerie-magic');
  const { tech, form, deficient } = effectiveArts(d, arts, { elementalMagic: d.effects.some((e) => e.type === 'elementalMagic') });
  parts.push({ label: `Technique (${arts.technique}${arts.requisites?.filter(isTechnique).length ? ' + req.' : ''})`, value: tech });
  parts.push({ label: `Form (${arts.form}${arts.requisites?.filter(isForm).length ? ' + req.' : ''})`, value: form });
  parts.push({ label: 'Stamina', value: d.characteristics.Sta.value });
  if (o.inFocus && d.magicalFocus !== 'none') parts.push({ label: `Magical Focus (${d.focusText ?? d.magicalFocus})`, value: Math.min(tech, form) });
  const aura = auraModifier('Magic', o.aura, { faerieMagic: hasFM });
  if (aura.mod) parts.push({ label: `Aura (${o.aura?.realm} ${o.aura?.strength})`, value: aura.mod });
  if (d.encumbrance) parts.push({ label: 'Encumbrance', value: -d.encumbrance });
  if (o.wordsGestures) {
    // Deft Form: no penalty for non-standard voice or gestures in that Form (DE)
    const deft = o.wordsGestures < 0 && d.virtues.some((v) => v.cv.defId === 'deft-form' && v.cv.param === arts.form);
    if (deft) notes.push(`Deft Form (${arts.form}): no penalty for the words and gestures.`);
    else parts.push({ label: 'Words & gestures', value: o.wordsGestures });
  }
  if (o.talismanBonus) parts.push({ label: 'Talisman attunement', value: o.talismanBonus });
  if (o.visPawns) parts.push({ label: `Raw vis (${o.visPawns} pawns)`, value: 2 * o.visPawns });
  for (const e of effectsOf(d, 'castingScore')) {
    if (e.when === 'all' || (e.when === 'circumstance' && circumstanceApplies(o.circumstance, e))) parts.push({ label: e.fromName, value: e.amount });
  }
  if (o.diedneExerted && o.kind === 'spontaneous' && d.virtues.some((v) => v.cv.defId === 'diedne-magic')) parts.push({ label: 'Diedne Magic (lowest Art doubled)', value: Math.min(tech, form) });
  if (o.lifeBoost && o.kind !== 'spontaneous' && d.virtues.some((v) => v.cv.defId === 'life-boost')) parts.push({ label: `Life Boost (${o.lifeBoost} Fatigue level${o.lifeBoost > 1 ? 's' : ''})`, value: 5 * o.lifeBoost });
  if (o.similarSpell && o.kind === 'spontaneous' && d.virtues.some((v) => v.cv.defId === 'spell-improvisation')) parts.push({ label: `Spell Improvisation (${o.similarSpell.name})`, value: o.similarSpell.magnitude });
  if (o.other) parts.push({ label: 'Other modifier', value: o.other });
  for (const e of effectsOf(d, 'castingTotal')) {
    const w = e.when;
    const ok = w === 'all' || w === o.kind || (w === 'formulaicAndRitual' && o.kind !== 'spontaneous');
    if (ok) parts.push({ label: e.fromName, value: e.amount });
  }
  if (o.kind === 'ritual' || o.ceremonial) {
    const al = d.abilities.find((a) => a.abilityId === 'artes-liberales');
    const ph = d.abilities.find((a) => a.abilityId === 'philosophiae');
    parts.push({ label: 'Artes Liberales', value: al?.total ?? 0 });
    parts.push({ label: 'Philosophiae', value: ph?.total ?? 0 });
  }
  if (d.currentWoundPenalty) parts.push({ label: 'Wounds', value: d.currentWoundPenalty });
  if (d.currentFatiguePenalty) parts.push({ label: 'Fatigue', value: d.currentFatiguePenalty });
  for (const x of o.extra ?? []) parts.push(x);
  let total = parts.reduce((s, p) => s + p.value, 0);
  let halved = false;
  if (deficient) {
    halved = true;
    notes.push('Deficient Art: the Casting Total (including the die roll) is halved.');
  }
  if (o.notTouching && d.virtues.some((v) => v.cv.defId === 'short-ranged-magic-flaw')) {
    halved = true;
    notes.push('Short-Ranged Magic: halved when not touching the target.');
  }
  if (aura.note) notes.push(`${aura.note}: +${aura.botch} botch dice`);
  const golden = d.char.familiar?.golden ?? 0;
  if (golden) notes.push(`Familiar's golden cord: ${golden} fewer botch dice (never down to none).`);
  if (halved) total = Math.ceil(total / 2);
  return { total, parts, halved, notes, botchDice: aura.botch + botchDiceFor(d, 'spells') };
}

export function botchDiceFor(d: DerivedCharacter, when: 'spells' | 'lab'): number {
  let n = 0;
  for (const e of d.effects) {
    if (e.type !== 'botchDice') continue;
    if (e.when === when || e.when === 'spellsAndLab') n += e.amount;
  }
  return n;
}

/**
 * Botch dice on a stress roll for magic: one, plus the extra dice (aura, vis, Virtues and Flaws), less a
 * familiar's golden cord, never below one, and then Spell Mastery, which may reach none (DE, Sources of
 * Botch Dice, Cautious Sorcerer and The Three Cords).
 */
export function magicBotchDice(extra: number, golden = 0, mastery = 0): number {
  // Cautious Sorcerer and the like never take it below one; only Spell Mastery can reach zero
  const n = Math.max(1, 1 + extra);
  const corded = Math.max(1, n - golden);
  return Math.max(0, corded - mastery);
}

/** Spontaneous Casting Total from a Casting Score: ÷5 calm, (score + stress die) ÷ 2 exerted (or Diedne Magic's calm option). */
export function spontaneousTotal(score: number, fatiguing: boolean, die = 0): number {
  return fatiguing ? (score + die) / 2 : score / 5;
}

export type LabActivity = 'spells' | 'items' | 'familiar' | 'longevity' | 'texts' | 'visExtraction' | 'experimentation' | 'teaching' | 'other';

/** The activity Specialization each kind of lab work uses (DE Laboratory). */
export const LAB_ACTIVITY_SPEC: Record<LabActivity, string | null> = {
  spells: 'Spells', items: 'Items', familiar: 'Familiar', longevity: 'Longevity Rituals', texts: 'Texts',
  visExtraction: 'Vis Extraction', experimentation: 'Experimentation', teaching: 'Teaching', other: null,
};

export interface LabContext {
  generalQuality: number;
  specializations: Record<string, number>;
  /** activities that cannot be done in this lab (Missing Equipment) */
  impossible?: string[];
  safety?: number;
  auraOverride?: AuraState;
}

export interface LabOptions {
  activity: LabActivity;
  aura?: AuraState;
  lab?: LabContext;
  inFocus?: boolean;
  fromText?: boolean;
  experimenting?: boolean;
  circumstance?: boolean | string[];
  similarSpellMagnitude?: number;
  /** anything else that applies now */
  other?: number;
  shapeMaterialBonus?: number; // before MT cap
  verditiusRunes?: number; // Philosophiae added to S&M (still capped by MT)
  craftBonus?: number; // Verditius craft
  talisman?: boolean; // +5 instilling in own talisman
  familiarBond?: 'none' | 'one' | 'both'; // +5 / +10 empowering familiar bond
  sameArtEffects?: number; // +1 per existing effect sharing Te/Fo
  assistants?: { name: string; int: number; mt: number }[];
  extra?: Part[];
  rangeBeyondTouch?: boolean;
  forSelfLongevity?: boolean;
  /** days away from the lab this season (DE, Distractions from Lab Work) */
  daysAway?: number;
}

/** Up to ten days away costs nothing; then −10, and −2 a day past ten, to −30 at twenty; past twenty, no lab work that season. */
export function labDistraction(days: number): { penalty: number; impossible: boolean } {
  if (days <= 10) return { penalty: 0, impossible: false };
  if (days > 20) return { penalty: 0, impossible: true };
  return { penalty: -(10 + 2 * (days - 10)), impossible: false };
}

/** Lab Total = Technique + Form + Intelligence + Magic Theory + Aura + lab & other modifiers. */
export function labTotal(d: DerivedCharacter, arts: ArtsUsed, o: LabOptions): TotalResult {
  const parts: Part[] = [];
  const notes: string[] = [];
  const hasFM = d.virtues.some((v) => v.cv.defId === 'faerie-magic');
  const { tech, form, deficient } = effectiveArts(d, arts, { elementalMagic: d.effects.some((e) => e.type === 'elementalMagic') });
  // Holy magi use Holy Magic wherever Magic Theory would be used (RoP: The Divine)
  const mt = d.abilities.find((a) => a.abilityId === d.theoryAbility);
  const mtName = d.theoryAbility === 'magic-theory' ? 'Magic Theory' : mt?.name ?? d.theoryAbility;
  parts.push({ label: `Technique (${arts.technique})`, value: tech });
  parts.push({ label: `Form (${arts.form})`, value: form });
  parts.push({ label: 'Intelligence', value: d.characteristics.Int.value });
  parts.push({ label: mtName, value: mt?.total ?? 0 });
  const spec = (mt?.specialty ?? '').toLowerCase();
  const specHit =
    (o.activity === 'spells' && /spell/.test(spec)) ||
    (o.activity === 'items' && /(item|enchant)/.test(spec)) ||
    (o.activity === 'familiar' && /familiar/.test(spec)) ||
    (o.activity === 'longevity' && /longevity/.test(spec)) ||
    (o.activity === 'experimentation' && /experiment/.test(spec)) ||
    (spec && [arts.technique, arts.form].some((a) => spec.includes(artName(a).toLowerCase())));
  if (specHit) parts.push({ label: `${mtName} specialty (${mt?.specialty})`, value: 1 });
  if (o.inFocus && d.magicalFocus !== 'none') parts.push({ label: 'Magical Focus', value: Math.min(tech, form) });
  const aura = auraModifier('Magic', o.aura, { faerieMagic: hasFM });
  if (aura.mod) parts.push({ label: `Aura (${o.aura?.realm} ${o.aura?.strength})`, value: aura.mod });
  if (o.lab) {
    if (o.lab.generalQuality) parts.push({ label: 'Lab General Quality', value: o.lab.generalQuality });
    const ak = LAB_ACTIVITY_SPEC[o.activity];
    if (ak && o.lab.specializations[ak]) parts.push({ label: `Lab specialization: ${ak}`, value: o.lab.specializations[ak] });
    if (o.experimenting && o.activity !== 'experimentation' && o.lab.specializations.Experimentation) parts.push({ label: 'Lab specialization: Experimentation', value: o.lab.specializations.Experimentation });
    if (o.fromText && o.activity !== 'texts' && o.lab.specializations.Texts) parts.push({ label: 'Lab specialization: Texts', value: o.lab.specializations.Texts });
    const seen = new Set<string>();
    for (const a of [arts.technique, arts.form, ...(arts.requisites ?? [])]) {
      if (seen.has(a)) continue;
      seen.add(a);
      if (o.lab.specializations[a]) parts.push({ label: `Lab specialization: ${artName(a)}`, value: o.lab.specializations[a] });
    }
  }
  for (const e of effectsOf(d, 'labTotal')) {
    const w = e.when;
    const ok = w === 'all' || (w === 'notFromText' && !o.fromText) || (w === 'fromText' && o.fromText) || (w === 'experimenting' && o.experimenting) || (w === 'circumstance' && circumstanceApplies(o.circumstance, e));
    if (ok) parts.push({ label: e.fromName, value: e.amount });
  }
  if (o.similarSpellMagnitude) parts.push({ label: 'Similar spell known', value: o.similarSpellMagnitude });
  if (o.shapeMaterialBonus || o.verditiusRunes) {
    const raw = (o.shapeMaterialBonus ?? 0) + (o.verditiusRunes ?? 0);
    const cap = mt?.total ?? 0;
    const v = Math.min(raw, cap);
    parts.push({ label: `Shape & Material${o.verditiusRunes ? ' + Verditius runes' : ''}${raw > cap ? ` (capped at ${mtName} ${cap})` : ''}`, value: v });
  }
  if (o.craftBonus) parts.push({ label: 'Verditius craft', value: o.craftBonus });
  if (o.talisman) parts.push({ label: 'Own talisman', value: 5 });
  if (o.familiarBond === 'one') parts.push({ label: 'Familiar bond (matches Te or Fo)', value: 5 });
  if (o.familiarBond === 'both') parts.push({ label: 'Familiar bond (matches Te and Fo)', value: 10 });
  if (o.sameArtEffects) parts.push({ label: 'Existing effects sharing Te/Fo', value: o.sameArtEffects });
  for (const a of o.assistants ?? []) parts.push({ label: `Assistant: ${a.name}`, value: a.int + a.mt });
  if (o.other) parts.push({ label: 'Other modifier', value: o.other });
  if (d.currentWoundPenalty) parts.push({ label: 'Wounds', value: d.currentWoundPenalty });
  if (d.currentFatiguePenalty) parts.push({ label: 'Fatigue', value: d.currentFatiguePenalty });
  for (const x of o.extra ?? []) parts.push(x);
  let total = parts.reduce((s, p) => s + p.value, 0);
  let halved = false;
  if (deficient) {
    total = Math.ceil(total / 2);
    halved = true;
    notes.push('Deficient Art: Lab Total halved.');
  }
  for (const e of effectsOf(d, 'labTotalMultiplier')) {
    const w = e.when;
    const ok = (w === 'items' && o.activity === 'items') || (w === 'longevityForSelf' && o.forSelfLongevity) || (w === 'rangeBeyondTouch' && o.rangeBeyondTouch);
    if (ok) {
      total = Math.ceil(total * (e.multiplier ?? 1));
      halved = true;
      notes.push(`${e.fromName}: Lab Total ×${e.multiplier}`);
    }
  }
  if (aura.note) notes.push(`${aura.note}: extra botch dice ${aura.botch}`);
  const ruledOut = o.lab?.impossible?.find((a) => a === LAB_ACTIVITY_SPEC[o.activity] || (a === 'Experimentation' && o.experimenting) || (a === 'Texts' && o.fromText));
  if (ruledOut) notes.unshift(`This lab cannot be used for ${ruledOut} (Missing Equipment).`);
  const away = labDistraction(o.daysAway ?? 0);
  if (away.penalty) {
    parts.push({ label: `${o.daysAway} days away from the lab`, value: away.penalty });
    total += away.penalty;
  }
  if (away.impossible) notes.unshift(`${o.daysAway} days away from the lab: more than twenty days out of synchronization with the heavens, so no lab work this season.`);
  return { total, parts, halved, notes, botchDice: aura.botch + botchDiceFor(d, 'lab'), impossible: !!ruledOut || away.impossible };
}

function artName(a: Art): string {
  return ({ Cr: 'Creo', In: 'Intellego', Mu: 'Muto', Pe: 'Perdo', Re: 'Rego', An: 'Animal', Aq: 'Aquam', Au: 'Auram', Co: 'Corpus', He: 'Herbam', Ig: 'Ignem', Im: 'Imaginem', Me: 'Mentem', Te: 'Terram', Vi: 'Vim' } as Record<Art, string>)[a];
}

export interface PenetrationOptions {
  arcaneConnection?: 'none' | 'hours' | 'weeks' | 'years' | 'indefinite';
  sympathetic?: number; // sum of sympathetic connection bonuses
  charm?: boolean; // Merinita charm: +2 with an AC
  specialty?: boolean; // Penetration specialty applies
  masteryScore?: number; // Penetration mastery ability adds score
}

export function penetrationBonus(d: DerivedCharacter, o: PenetrationOptions = {}): { bonus: number; multiplier: number; parts: Part[] } {
  const pen = d.abilities.find((a) => a.abilityId === 'penetration');
  let score = (pen?.total ?? 0) + (o.specialty ? 1 : 0) + (o.masteryScore ?? 0);
  const acMult = { none: 0, hours: 1, weeks: 2, years: 3, indefinite: 4 }[o.arcaneConnection ?? 'none'];
  let mult = 1 + acMult + (acMult > 0 ? (o.sympathetic ?? 0) + (o.charm ? 2 : 0) : 0);
  const parts: Part[] = [{ label: 'Penetration Ability', value: pen?.total ?? 0 }];
  if (o.specialty) parts.push({ label: 'Specialty', value: 1 });
  if (o.masteryScore) parts.push({ label: 'Mastery (Penetration)', value: o.masteryScore });
  if (score < 0) score = 0;
  if (mult < 1) mult = 1;
  return { bonus: score * mult, multiplier: mult, parts };
}

/** Penetration Total = Casting Total + Penetration Bonus − spell level (Weak Magic halves). */
export function penetrationTotal(d: DerivedCharacter, castingTotal: number, level: number, o: PenetrationOptions = {}): number {
  const { bonus } = penetrationBonus(d, o);
  let p = castingTotal + bonus - level;
  if (d.effects.some((e) => e.type === 'penetrationMultiplier')) p = Math.floor(p / 2);
  return p;
}

/** Which Art a magus puts into a certamen attack or defense. */
export type CertamenArt = 'technique' | 'form';

export interface CertamenTotals {
  initiative: TotalResult;
  attack: Record<CertamenArt, TotalResult>;
  defense: Record<CertamenArt, TotalResult>;
  weakening: TotalResult;
  resistance: TotalResult;
  /** the most raw vis a round can use, by the Art it is attuned to */
  visLimit: Record<CertamenArt, number>;
}

/**
 * Certamen (DE, Certamen): the six totals without their dice. Initiative = Qik + Finesse;
 * Attack = Pre + Technique or Form; Defense = Per + the other Art; Weakening = Int + Penetration
 * (+ the Attack Advantage); Resistance = Sta + Parma Magica (not ×5). A Minor Magical Focus in
 * Certamen (House Tremere) doubles the lower of the two Arts. Wound and Fatigue penalties apply
 * to Initiative, Attack and Defense, as in the book's example.
 */
export function certamenTotals(d: DerivedCharacter, technique: Technique, form: Form): CertamenTotals {
  const ch = d.characteristics;
  const ability = (id: string) => d.abilities.find((a) => a.abilityId === id)?.total ?? 0;
  const penalties: Part[] = [];
  if (d.currentWoundPenalty) penalties.push({ label: 'Wounds', value: d.currentWoundPenalty });
  if (d.currentFatiguePenalty) penalties.push({ label: 'Fatigue', value: d.currentFatiguePenalty });
  const value = { technique: d.arts[technique].value, form: d.arts[form].value };
  const focus = d.virtues.some((v) => v.cv.defId === 'minor-magical-focus' && /certamen/i.test(`${v.cv.param ?? ''} ${v.cv.note ?? ''}`)) || /certamen/i.test(d.focusText ?? '');
  const lower: CertamenArt = value.technique <= value.form ? 'technique' : 'form';
  const art = (which: CertamenArt): Part[] => {
    const name = which === 'technique' ? ART_NAMES[technique] : ART_NAMES[form];
    const parts: Part[] = [{ label: name, value: value[which] }];
    if (focus && which === lower) parts.push({ label: 'Magical Focus (Certamen): the lower Art doubled', value: value[which] });
    return parts;
  };
  const total = (parts: Part[], notes: string[] = []): TotalResult => ({ total: parts.reduce((s, p) => s + p.value, 0), parts, halved: false, notes });
  const side = (stat: 'Pre' | 'Per', which: CertamenArt) => total([{ label: CHAR_NAMES[stat], value: ch[stat].value }, ...art(which), ...penalties]);
  return {
    initiative: total([{ label: 'Quickness', value: ch.Qik.value }, { label: 'Finesse', value: ability('finesse') }, ...penalties]),
    attack: { technique: side('Pre', 'technique'), form: side('Pre', 'form') },
    defense: { technique: side('Per', 'technique'), form: side('Per', 'form') },
    weakening: total([{ label: 'Intelligence', value: ch.Int.value }, { label: 'Penetration', value: ability('penetration') }], ['Add the Attack Advantage.']),
    resistance: total([{ label: 'Stamina', value: ch.Sta.value }, { label: 'Parma Magica (not ×5)', value: ability('parma-magica') }]),
    visLimit: { technique: d.arts[technique].score, form: d.arts[form].score },
  };
}

/** Fatigue levels lost to a certamen attack: one per five points (or fraction) of Weakening Total over Resistance Total. */
export function certamenFatigue(weakeningTotal: number, resistanceTotal: number): number {
  const over = weakeningTotal - resistanceTotal;
  return over > 0 ? Math.ceil(over / 5) : 0;
}

export function magicResistance(d: DerivedCharacter, form: Form, o: { aura?: AuraState; includeAura?: boolean; sharing?: boolean; vsRealm?: Realm } = {}): TotalResult {
  const parts: Part[] = [];
  const notes: string[] = [];
  const parma = d.abilities.find((a) => a.abilityId === 'parma-magica');
  let parmaScore = parma?.total ?? 0;
  if (parma?.specialty && parma.specialty.toLowerCase().includes(artName(form).toLowerCase())) parmaScore += 1;
  if (o.sharing) parmaScore = Math.max(0, parmaScore - 3);
  const limited = d.virtues.some((v) => v.cv.defId === 'limited-magic-resistance-flaw' && v.cv.param === form);
  const flawed = d.virtues.some((v) => v.cv.defId === 'flawed-parma-magica-flaw' && v.cv.param === form);
  let parmaMR = parmaScore * 5;
  if (flawed) {
    parmaMR = Math.floor(parmaMR / 2);
    notes.push('Flawed Parma Magica: halved vs this Form');
  }
  if (d.isMagus || d.hasGift) {
    parts.push({ label: `Parma Magica (${parmaScore} × 5)`, value: parmaMR });
    if (!limited) parts.push({ label: `Form (${artName(form)})`, value: d.arts[form].value });
    else notes.push('Limited Magic Resistance: no Form bonus');
  }
  if (o.includeAura && o.aura) {
    const a = auraModifier('Magic', o.aura);
    if (a.mod) parts.push({ label: 'Aura', value: a.mod });
  }
  // Magic Resistance from different sources does not stack: use the highest (DE p.55)
  const others: Part[] = [];
  if (d.trueFaith > 0) others.push({ label: `True Faith (${d.trueFaith} × 10)`, value: d.trueFaith * 10 });
  if (d.relicFaith > 0) others.push({ label: `Relic (True Faith ${d.relicFaith} × 10)`, value: d.relicFaith * 10 });
  for (const e of effectsOf(d, 'magicResistance')) others.push({ label: e.fromName, value: e.amount });
  // Might gives Magic Resistance: Might + aura modifier (DE Creature Might); a creature's own, or
  // from a Virtue (Strong Angelic Heritage: Divine Might = age / 20)
  if (d.might && d.might.score > 0) {
    const auraMod = o.aura ? auraModifier(d.might.realm, o.aura).mod : 0;
    others.push({ label: `${d.might.realm} Might ${d.might.score}${d.might.source !== 'creature' ? ` (${d.might.source})` : ''}${auraMod ? ` + aura ${auraMod}` : ''}`, value: d.might.score + auraMod });
  }
  const parmaTotal = parts.reduce((s, p) => s + p.value, 0);
  const best = others.reduce<Part | undefined>((b, p) => (!b || p.value > b.value ? p : b), undefined);
  let total = parmaTotal;
  if (best && best.value > parmaTotal) {
    if (parmaTotal) notes.push(`Parma Magica and Form ${parmaTotal} (not used: a higher source applies)`);
    parts.length = 0;
    parts.push(best);
    total = best.value;
  } else if (best) notes.push(`${best.label} ${best.value} (not added: Magic Resistance from different sources does not stack)`);
  for (const p of others) if (p !== best) notes.push(`${p.label} ${p.value} (not added: only the highest source counts)`);
  if (o.vsRealm && d.virtues.some((v) => v.cv.defId === `susceptibility-to-${o.vsRealm?.toLowerCase()}-power-flaw`)) {
    total = Math.floor(total / 2);
    notes.push(`Susceptibility to ${o.vsRealm} Power: halved`);
  }
  return { total: Math.max(0, total), parts, halved: false, notes };
}

/** Highest spell level learnable at character creation (DE p.49): Te + Fo + Int + MT + 3, Virtues as for Lab Totals. */
export function creationSpellLimit(d: DerivedCharacter, arts: ArtsUsed, bonus: number, inFocus = false): TotalResult {
  const r = labTotal(d, arts, { activity: 'spells', aura: { realm: 'Magic', strength: bonus }, inFocus, fromText: false });
  return r;
}

export function magnitude(level: number): number {
  return Math.max(1, Math.ceil(level / 5));
}

/** What a character's Virtues and Flaws change about casting spells, beyond the Casting Score (DE). */
export interface CastingRules {
  /** Weak Spontaneous Magic: never exerts, always divides by five (a stress die still checks for a botch) */
  weakSpontaneous: boolean;
  /** Difficult Spontaneous Magic: must exert, so no Fatigue-free spontaneous spells */
  difficultSpontaneous: boolean;
  /** Ceremonial Spontaneous Magic: spontaneous spells only by ceremonial casting */
  ceremonialSpontaneous: boolean;
  /** Diedne Magic: a calm spontaneous spell may divide by two with a stress die; exerted, the lowest Art counts twice */
  diedne: boolean;
  /** Unpredictable Magic: always a stress die, and at least one botch die even when mastered */
  unpredictable: boolean;
  /** Life-Linked Spontaneous Magic: declare a level, pay a Fatigue level per 5 (or fraction) short */
  lifeLinked: boolean;
  /** Chaotic Magic: declare a level; more than one level off either way, the storyguide decides what happens */
  chaotic: boolean;
  /** Rigid Magic: no vis when casting, so no Ritual spells */
  rigid: boolean;
  /** Unstructured Caster: Formulaic spells are cast as Rituals, vis and all */
  unstructured: boolean;
  /** Vulnerable Casting: extra Fatigue levels whenever casting costs Fatigue (one per time taken) */
  vulnerable: number;
  /** Withstand Casting: Fatigue levels withstood, never below one (one per time taken) */
  withstand: number;
  /** Mercurian Magic halves Ritual vis */
  ritualVisMultiplier: number;
  /** Waster of Vis: a quarter (rounded up) of the pawns used are lost */
  wasterOfVis: boolean;
  /** reminders the roller can't apply itself, in a line each */
  notes: string[];
}

export function castingRules(d: DerivedCharacter): CastingRules {
  const count = (id: string) => d.virtues.filter((v) => v.cv.defId === id).length;
  const has = (id: string) => count(id) > 0;
  const notes: string[] = [];
  if (has('slow-caster-flaw')) notes.push('Slow Caster: Formulaic and Spontaneous spells take two rounds (one when fast-cast, and for fast-cast Mastered spells).');
  if (has('clumsy-magic-flaw')) notes.push('Clumsy Magic: −3 to Finesse rolls, and an aiming roll of 0 is a botch.');
  if (has('boosted-magic')) notes.push('Boosted Magic: a pawn of vis per magnitude raises a Formulaic spell\'s Range, Duration, Target or size (one botch die each; level, Fatigue and Penetration stay the original).');
  if (has('flexible-formulaic-magic')) notes.push('Flexible Formulaic Magic: raise or lower the casting level one magnitude to move one of Range, Duration, Target or size one step.');
  if (has('enduring-magic')) notes.push('Enduring Magic: the storyguide secretly multiplies a non-Ritual spell\'s Duration by a simple die.');
  if (has('harmless-magic-flaw')) notes.push('Harmless Magic: non-Ritual Perdo spells only disrupt their target for the Duration.');
  if (has('unnatural-magic-flaw')) notes.push('Unnatural Magic: Creo Rituals have no lasting effect.');
  if (has('weak-magic-resistance-flaw')) notes.push('Weak Magic Resistance: under its condition, Penetration is not reduced by the effect\'s level.');
  return {
    weakSpontaneous: has('weak-spontaneous-magic-flaw'),
    difficultSpontaneous: has('difficult-spontaneous-magic-flaw'),
    ceremonialSpontaneous: has('ceremonial-spontaneous-magic-flaw'),
    diedne: has('diedne-magic'),
    unpredictable: has('unpredictable-magic-flaw'),
    lifeLinked: has('life-linked-spontaneous-magic'),
    chaotic: has('chaotic-magic-flaw'),
    rigid: has('rigid-magic-flaw'),
    unstructured: has('unstructured-caster-flaw'),
    vulnerable: count('vulnerable-casting-flaw'),
    withstand: count('withstand-casting'),
    ritualVisMultiplier: effectsOf(d, 'ritualVisMultiplier').reduce((m, e) => m * (e.multiplier ?? 1), 1),
    wasterOfVis: has('waster-of-vis-flaw'),
    notes,
  };
}

/** Fatigue a casting costs after Vulnerable Casting, then Withstand Casting (never below one); a casting that costs none still costs none. */
export function castingFatigue(base: number, r: Pick<CastingRules, 'vulnerable' | 'withstand'>): number {
  if (base <= 0) return 0;
  return Math.max(1, base + r.vulnerable - r.withstand);
}

/** Pawns of vis a casting needs when `needed` must reach the effect, with Waster of Vis losing a quarter (rounded up) of all pawns used. */
export function visWithWaste(needed: number, waster: boolean): { pawns: number; wasted: number } {
  if (!waster || needed <= 0) return { pawns: needed, wasted: 0 };
  let u = needed;
  while (u - Math.ceil(u / 4) < needed) u++;
  return { pawns: u, wasted: u - needed };
}

/** A Ritual's vis: a pawn per magnitude, halved by Mercurian Magic (rounded up here), plus what Waster of Vis loses. */
export function ritualVis(level: number, r: Pick<CastingRules, 'ritualVisMultiplier' | 'wasterOfVis'>): { pawns: number; wasted: number } {
  const base = Math.max(1, Math.ceil(level / 5));
  return visWithWaste(Math.max(1, Math.ceil(base * r.ritualVisMultiplier)), r.wasterOfVis);
}

/** Life-Linked Spontaneous Magic: extra Fatigue levels for falling short of the declared level, one per 5 points or fraction. */
export function lifeLinkedFatigue(result: number, declared: number): number {
  return result >= declared ? 0 : Math.ceil((declared - result) / 5);
}

/** Outcome of a Formulaic or Ritual casting (DE p.213 tables). Fatigue from rituals is long-term. */
export function castingOutcome(kind: 'formulaic' | 'ritual', castingTotal: number, level: number): { cast: boolean; fatigue: number; longTerm: boolean; text: string } {
  const diff = castingTotal - level;
  if (kind === 'formulaic') {
    if (diff >= 0) return { cast: true, fatigue: 0, longTerm: false, text: 'Spell cast.' };
    if (diff >= -10) return { cast: true, fatigue: 1, longTerm: false, text: 'Spell cast; lose one Fatigue level.' };
    return { cast: false, fatigue: 1, longTerm: false, text: 'Spell fails; lose one Fatigue level.' };
  }
  if (diff >= 0) return { cast: true, fatigue: 1, longTerm: true, text: 'Ritual cast; lose one long-term Fatigue level.' };
  if (diff >= -5) return { cast: true, fatigue: 2, longTerm: true, text: 'Ritual cast; lose two long-term Fatigue levels.' };
  if (diff >= -10) return { cast: true, fatigue: 3, longTerm: true, text: 'Ritual cast; lose three long-term Fatigue levels.' };
  if (diff >= -15) return { cast: false, fatigue: 4, longTerm: true, text: 'Ritual fails; lose four long-term Fatigue levels.' };
  return { cast: false, fatigue: 5, longTerm: true, text: 'Ritual fails; lose five long-term Fatigue levels.' };
}
