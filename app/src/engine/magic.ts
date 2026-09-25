// Hermetic magic totals: Casting Scores, Lab Totals, Penetration, Magic Resistance.
// Every result carries a breakdown ("parts") so the UI can show *why* a number is what it is.

import { isForm, isTechnique, type Art, type Form, type Technique } from '../data';
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

function effectsOf(d: DerivedCharacter, type: string) {
  return d.effects.filter((e) => e.type === type) as Array<Record<string, unknown> & { amount: number; when?: string; fromName: string; multiplier?: number }>;
}

export interface CastingOptions {
  kind: 'formulaic' | 'ritual' | 'spontaneous';
  aura?: AuraState;
  inFocus?: boolean;
  talismanBonus?: number;
  wordsGestures?: number; // e.g. loud+exaggerated = +2
  circumstance?: boolean; // Special Circumstances / Cyclic Magic applies
  ceremonial?: boolean;
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
  if (o.wordsGestures) parts.push({ label: 'Words & gestures', value: o.wordsGestures });
  if (o.talismanBonus) parts.push({ label: 'Talisman attunement', value: o.talismanBonus });
  if (o.visPawns) parts.push({ label: `Raw vis (${o.visPawns} pawns)`, value: 2 * o.visPawns });
  for (const e of effectsOf(d, 'castingScore')) {
    if (e.when === 'all' || (e.when === 'circumstance' && o.circumstance)) parts.push({ label: e.fromName, value: e.amount });
  }
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

/** Spontaneous Casting Total from a Casting Score. */
export function spontaneousTotal(score: number, fatiguing: boolean, die = 0, diedne = false): number {
  if (!fatiguing) return diedne ? Math.max(score / 5, (score + die) / 2) : score / 5;
  return (score + die) / 2;
}

export type LabActivity = 'spells' | 'items' | 'familiar' | 'longevity' | 'texts' | 'visExtraction' | 'experimentation' | 'teaching' | 'other';

export interface LabContext {
  generalQuality: number;
  specializations: Record<string, number>;
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
  circumstance?: boolean;
  similarSpellMagnitude?: number;
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
}

/** Lab Total = Technique + Form + Intelligence + Magic Theory + Aura + lab & other modifiers. */
export function labTotal(d: DerivedCharacter, arts: ArtsUsed, o: LabOptions): TotalResult {
  const parts: Part[] = [];
  const notes: string[] = [];
  const hasFM = d.virtues.some((v) => v.cv.defId === 'faerie-magic');
  const { tech, form, deficient } = effectiveArts(d, arts, { elementalMagic: d.effects.some((e) => e.type === 'elementalMagic') });
  const mt = d.abilities.find((a) => a.abilityId === 'magic-theory');
  parts.push({ label: `Technique (${arts.technique})`, value: tech });
  parts.push({ label: `Form (${arts.form})`, value: form });
  parts.push({ label: 'Intelligence', value: d.characteristics.Int.value });
  parts.push({ label: 'Magic Theory', value: mt?.total ?? 0 });
  const spec = (mt?.specialty ?? '').toLowerCase();
  const specHit =
    (o.activity === 'spells' && /spell/.test(spec)) ||
    (o.activity === 'items' && /(item|enchant)/.test(spec)) ||
    (o.activity === 'familiar' && /familiar/.test(spec)) ||
    (o.activity === 'longevity' && /longevity/.test(spec)) ||
    (o.activity === 'experimentation' && /experiment/.test(spec)) ||
    (spec && [arts.technique, arts.form].some((a) => spec.includes(artName(a).toLowerCase())));
  if (specHit) parts.push({ label: `Magic Theory specialty (${mt?.specialty})`, value: 1 });
  if (o.inFocus && d.magicalFocus !== 'none') parts.push({ label: 'Magical Focus', value: Math.min(tech, form) });
  const aura = auraModifier('Magic', o.aura, { faerieMagic: hasFM });
  if (aura.mod) parts.push({ label: `Aura (${o.aura?.realm} ${o.aura?.strength})`, value: aura.mod });
  if (o.lab) {
    if (o.lab.generalQuality) parts.push({ label: 'Lab General Quality', value: o.lab.generalQuality });
    const actKey: Record<LabActivity, string | null> = {
      spells: 'Spells', items: 'Items', familiar: 'Familiar', longevity: 'Longevity Rituals', texts: 'Texts',
      visExtraction: 'Vis Extraction', experimentation: 'Experimentation', teaching: 'Teaching', other: null,
    };
    const ak = actKey[o.activity];
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
    const ok = w === 'all' || (w === 'notFromText' && !o.fromText) || (w === 'fromText' && o.fromText) || (w === 'experimenting' && o.experimenting) || (w === 'circumstance' && o.circumstance);
    if (ok) parts.push({ label: e.fromName, value: e.amount });
  }
  if (o.similarSpellMagnitude) parts.push({ label: 'Similar spell known', value: o.similarSpellMagnitude });
  if (o.shapeMaterialBonus || o.verditiusRunes) {
    const raw = (o.shapeMaterialBonus ?? 0) + (o.verditiusRunes ?? 0);
    const cap = mt?.total ?? 0;
    const v = Math.min(raw, cap);
    parts.push({ label: `Shape & Material${o.verditiusRunes ? ' + Verditius runes' : ''}${raw > cap ? ` (capped at Magic Theory ${cap})` : ''}`, value: v });
  }
  if (o.craftBonus) parts.push({ label: 'Verditius craft', value: o.craftBonus });
  if (o.talisman) parts.push({ label: 'Own talisman', value: 5 });
  if (o.familiarBond === 'one') parts.push({ label: 'Familiar bond (matches Te or Fo)', value: 5 });
  if (o.familiarBond === 'both') parts.push({ label: 'Familiar bond (matches Te and Fo)', value: 10 });
  if (o.sameArtEffects) parts.push({ label: 'Existing effects sharing Te/Fo', value: o.sameArtEffects });
  for (const a of o.assistants ?? []) parts.push({ label: `Assistant: ${a.name}`, value: a.int + a.mt });
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
  return { total, parts, halved, notes, botchDice: aura.botch + botchDiceFor(d, 'lab') };
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
  for (const e of effectsOf(d, 'magicResistance')) parts.push({ label: e.fromName, value: e.amount });
  let total = parts.reduce((s, p) => s + p.value, 0);
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
