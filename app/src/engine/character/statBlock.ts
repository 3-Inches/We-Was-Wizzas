// A character from a stat block in the books' own layout (DE's sample characters, and every Tribunal
// book's): Characteristics with their Aging Points, Virtues and Flaws in their groups (Major Virtues,
// Minor Virtues, Major Flaws, Minor Flaws), Abilities with specialties, Arts, spells with Mastery,
// Warping, Decrepitude, Confidence and Reputations. The Tribunal books' magi are kept this way
// (data/livingCovenants), so the toolkit builds them as the book wrote them. A name it does not know
// is reported, never guessed at; the test over every book magus keeps the list empty.

import { ARTS, ART_NAMES, FORMS, TECHNIQUES, type Art, type Characteristic, type Form, type GameData, type SpellDef, type Technique, type VFSize, type VirtueFlawDef } from '../../data';
import { HOUSE_BY_ID } from '../../data/houses';
import type { StatBlock } from '../../data/livingCovenants/types';
import type { CharSpell, Character, HouseRules } from '../types';
import { creationSpellLimit } from '../magic';
import { abilityXpForScore, artXpForScore } from '../xp';
import { uid } from '../../util/id';
import { deriveCharacter } from './derive';
import { addVirtue, ensureAbility, setHouse } from './factory';


export type { StatBlock };

export interface StatBlockResult {
  /** names the toolkit could not place */
  problems: string[];
}

const CHAR_NAMES: Record<string, Characteristic> = {
  intelligence: 'Int', perception: 'Per', presence: 'Pre', communication: 'Com', strength: 'Str', stamina: 'Sta', dexterity: 'Dex', quickness: 'Qik',
};
const ART_BY_NAME = new Map<string, Art>(ARTS.flatMap((a) => [[ART_NAMES[a].toLowerCase(), a] as [string, Art], [a.toLowerCase(), a] as [string, Art]]));
/** Spoken languages a book names as Abilities (a Living Language each); Latin and the like are dead. */
const LIVING_LANGUAGES = [
  'German', 'High German', 'Low German', 'Swabian', 'Saxon', 'Bavarian', 'Franconian', 'Frisian', 'Dutch', 'Flemish', 'East Norse', 'West Norse', 'Old Norse', 'Norse', 'Danish', 'Swedish',
  'Italian', 'French', 'Occitan', 'Provençal', 'English', 'Polish', 'Czech', 'Bohemian', 'Russian', 'Hungarian', 'Magyar', 'Greek', 'Arabic', 'Hebrew', 'Romansch', 'Slavonic', 'Wendish',
  'Sorbian', 'Lithuanian', 'Prussian', 'Old Prussian', 'Estonian', 'Livonian', 'Finnish', 'Castilian', 'Catalan', 'Gaelic', 'Irish', 'Welsh', 'Breton', 'Basque', 'Turkish', 'Persian',
  'Cuman', 'West Slavonic', 'East Slavonic', 'Romanian', 'Vlach', 'Croatian', 'Serbian', 'Bulgarian', 'Lombard', 'Latvian', 'Pomeranian', 'Silesian', 'Moravian', 'Berber', 'Aramaic', 'Armenian', 'Slovak',
];
const DEAD_LANGUAGES = ['Latin', 'Classical Greek', 'Ancient Greek', 'Biblical Hebrew', 'Syriac', 'Gothic'];
/** Ability names the books use for the toolkit's own (an Organization's or an Area's Lore, a Theology). */
const ABILITY_ALIASES: Record<string, [string, string?]> = {
  theology: ['theology-christian'], 'order of hermes lore': ['organization-lore', 'Order of Hermes'], 'church lore': ['organization-lore', 'Church'], 'civil & canon law': ['civil-and-canon-law'],
  'canon law': ['civil-and-canon-law'], 'heartbeast': ['heartbeast'], 'heart beast': ['heartbeast'], 'hermes lore': ['organization-lore', 'Order of Hermes'],
};

/** Split at the separators that are not inside brackets. */
export function splitTop(s: string, sep: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = '';
  for (const ch of s) {
    if (ch === '(' || ch === '[') depth++;
    if (ch === ')' || ch === ']') depth = Math.max(0, depth - 1);
    if (depth === 0 && ch === sep) {
      out.push(cur);
      cur = '';
    } else cur += ch;
  }
  out.push(cur);
  return out.map((x) => x.trim()).filter(Boolean);
}

const tidy = (s: string) => s.replace(/[’‘`]/g, "'").replace(/[–—−]/g, '-').replace(/\s+/g, ' ').trim();
const norm = (s: string) => tidy(s).toLowerCase();
/** A name as a key that ignores case, hyphens and apostrophes (Self Confident, Self-Confident). */
const loose = (s: string) => norm(s).replace(/[-']/g, ' ').replace(/\s+/g, ' ');
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const num = (s: string) => Number(s.replace(/[–—−]/g, '-'));

/** Each Virtue and Flaw by name, and the names with a placeholder (Offensive to (Beings)) as patterns. */
function vfIndex(data: GameData) {
  const exact = new Map<string, VirtueFlawDef>();
  const patterns: { re: RegExp; def: VirtueFlawDef }[] = [];
  for (const def of data.virtuesFlaws) {
    const n = loose(def.name);
    // the core book's entry wins a name two books share
    if (!exact.has(n) || def.source.book === 'DE') exact.set(n, def);
    // a placeholder in the name stands for the choice: Offensive to (Beings) is Offensive to Animals
    if (/\(.+\)/.test(def.name)) patterns.push({ re: new RegExp(`^${tidy(def.name).split(/\([^()]*\)/).map(escape).join('(.+?)')}$`, 'i'), def });
  }
  return { exact, patterns };
}

interface VFItem {
  def: VirtueFlawDef;
  param?: string;
  size?: VFSize;
  /** the size the stat block gives ([Major]), where the option comes in both */
  fixed?: VFSize;
  free?: string;
  count: number;
  house: boolean;
}

/** The option a name means, with its choice: 'Puissant Perdo', 'Great Intelligence', 'Hawthorn Gild Enmity', 'Deficient Form (Animal)'. */
function resolveVF(raw: string, data: GameData, idx: ReturnType<typeof vfIndex>): Omit<VFItem, 'size' | 'house'> | string {
  const isArt = (d: VirtueFlawDef) => ['art', 'technique', 'form'].includes(d.param?.kind ?? '');
  let s = raw.replace(/\\\*/g, '*').replace(/\*+$/, '').trim();
  let fixed: VFSize | undefined;
  const sized = s.match(/\s*\[(Major|Minor)\]$/i);
  if (sized) {
    fixed = (sized[1][0].toUpperCase() + sized[1].slice(1).toLowerCase()) as VFSize;
    s = s.slice(0, sized.index).replace(/\*+$/, '').trim();
  }
  let count = 1;
  let free: string | undefined;
  const times = s.match(/\s*\(?x\s*(\d)\)?$/i);
  if (times) {
    count = Number(times[1]);
    s = s.slice(0, times.index).trim();
  }
  // a note after a dash is the choice: Cyclic Magic (Positive) — Winter months
  let tail: string | undefined;
  const dash = s.match(/\s+[—–-]\s+(.+)$/);
  if (dash) {
    tail = dash[1].trim();
    s = s.slice(0, dash.index).trim();
  }
  // "(…, with Mythic Blood)", "(gained from Twilight)": how it was had, not a choice
  let paren: string | undefined;
  const p = s.match(/\s*\(([^()]*)\)\s*$/);
  if (p) {
    paren = p[1].trim();
    const via = paren.match(/(?:^|,\s*)(?:with|from|gained from|gained upon) (.+)$/i);
    if (via) {
      free = via[1].trim();
      paren = paren.slice(0, via.index).replace(/,\s*$/, '').trim() || undefined;
    }
  }
  const base = (p ? s.slice(0, p.index).trim() : s).replace(/^Deft Art$/i, 'Deft Form');
  const n = loose(base);
  const def = (id: string) => data.vfById.get(id);
  const art = (x: string) => ART_BY_NAME.get(norm(x));
  const ability = (x: string) => abilityFor(x, data)?.[0];
  const out = (d: VirtueFlawDef | undefined, param?: string) => (d ? { def: d, param, count, free, fixed } : `Virtue or Flaw “${raw}”`);
  // the Rhine's gilds
  const gild = base.match(/^(Oak|Hawthorn|Ash|Elder|Linden|Apple) Gild (Trained|Enmity)$/i);
  if (gild) return out(def(gild[2].toLowerCase() === 'trained' ? 'gild-trained' : 'gild-enmity'), `${gild[1][0].toUpperCase()}${gild[1].slice(1).toLowerCase()} Gild`);
  const pa = base.match(/^(Puissant|Affinity with) (.+)$/i);
  if (pa && !paren) {
    const kind = pa[1].toLowerCase() === 'puissant' ? 'puissant' : 'affinity-with';
    const a = art(pa[2]);
    if (a) return out(def(`${kind}-art`), a);
    const ab = ability(pa[2]);
    if (ab) return out(def(`${kind}-ability`), ab);
  }
  const gp = base.match(/^(Great|Poor) (\w+)$/i);
  if (gp && CHAR_NAMES[gp[2].toLowerCase()]) return out(def(gp[1].toLowerCase() === 'great' ? 'great-characteristic' : 'poor-characteristic-flaw'), CHAR_NAMES[gp[2].toLowerCase()]);
  const df = base.match(/^Deficient (Form|Technique)$/i);
  if (df && paren && art(paren)) return out(def(df[1].toLowerCase() === 'form' ? 'deficient-form-flaw' : 'deficient-technique-flaw'), art(paren));
  if (/^(Major|Minor) Magical Focus$/i.test(base)) return out(def(base.toLowerCase().startsWith('major') ? 'major-magical-focus' : 'minor-magical-focus'), paren ?? tail);
  // the full name with its bracket (Cyclic Magic (Positive)), then the name with the bracket as its choice
  const whole = p ? idx.exact.get(loose(`${base} (${paren})`)) : undefined;
  if (whole) return out(whole, tail);
  const named = idx.exact.get(n);
  if (named) {
    if (!named.param) return out(named);
    const choice = paren ?? tail;
    if (choice && named.param.kind === 'art') return out(named, art(choice) ?? choice);
    if (choice && named.param.kind === 'ability') return out(named, ability(choice) ?? choice);
    return out(named, choice);
  }
  for (const { re, def: d } of idx.patterns) {
    const m = tidy(base).match(re);
    if (m) {
      const choice = [...m.slice(1), paren].filter(Boolean).join(', ');
      return out(d, isArt(d) ? (art(choice) ?? choice) : choice);
    }
  }
  return out(undefined);
}

/** An Ability by the name a book gives it, with the choice it carries (a language, an area, a craft). */
export function abilityFor(name: string, data: GameData): [string, string?] | undefined {
  const n = norm(name);
  const alias = ABILITY_ALIASES[n];
  if (alias) return alias;
  const exact = data.abilities.find((a) => norm(a.name) === n);
  if (exact) return [exact.id];
  const typed = name.match(/^(Craft|Profession)\s*[:(]\s*([^)]+)\)?$/i);
  if (typed) return [`${typed[1].toLowerCase()}-type`, typed[2].trim()];
  const org = name.match(/^Organization Lore\s*[:(]\s*([^)]+)\)?$/i);
  if (org) return ['organization-lore', org[1].trim()];
  if (DEAD_LANGUAGES.some((l) => norm(l) === n)) return ['dead-language', name.trim()];
  if (LIVING_LANGUAGES.some((l) => norm(l) === n)) return ['living-language', name.trim()];
  const lore = name.match(/^(.+) Lore$/i);
  if (lore) return ['area-lore', lore[1].trim()];
  return undefined;
}

/** Virtue and Flaw groups as stat blocks list them: the Gift; the status; Major Virtues; Minor Virtues; Major Flaws; Minor Flaws, those empty left out. */
function parseVirtues(s: string, data: GameData, problems: string[]): VFItem[] {
  const idx = vfIndex(data);
  const groups = splitTop(s.replace(/<br>/g, ''), ';').map((g) =>
    splitTop(g, ',').map((raw) => ({ raw, r: /^(the gift|hermetic magus|journeyman|master|archmage|apprentice)$/i.test(raw.trim()) ? undefined : resolveVF(raw, data, idx) })),
  );
  const resolved = groups.map((g) => g.filter((x): x is { raw: string; r: Omit<VFItem, 'size' | 'house'> } => !!x.r && typeof x.r !== 'string' || (typeof x.r === 'string' && (problems.push(x.r), false))));
  const items: VFItem[] = resolved.flat().map((x) => ({
    ...x.r,
    size: x.r.fixed && x.r.def.sizes.includes(x.r.fixed) ? x.r.fixed : x.r.def.sizes.includes('Minor') ? 'Minor' : x.r.def.sizes[0],
    house: /\*\s*(\[(Major|Minor)\])?\s*$/i.test(x.raw.replace(/\\\*/g, '*')),
  }));
  // an option that comes Major or Minor: the size that balances the Virtues against the Flaws, as
  // the books' characters are built (the groups do not say which: they follow the book's own order)
  const points = (kind: 'virtue' | 'flaw') => items.filter((x) => x.def.kind === kind && !x.free && !x.house).reduce((t, x) => t + (x.size === 'Major' ? 3 : x.size === 'Minor' ? 1 : 0) * x.count, 0);
  for (let guard = 0; guard < 8; guard++) {
    const gap = points('virtue') - points('flaw');
    const kind = gap >= 2 ? 'flaw' : gap <= -2 ? 'virtue' : undefined;
    const x = kind && items.find((y) => y.def.kind === kind && y.size === 'Minor' && y.def.sizes.includes('Major') && !y.free && !y.house && !y.fixed);
    if (!x) break;
    x.size = 'Major';
  }
  return items;
}

/** A spell line: 'Name (TeFo[Req] Level[ & 50]) +total, Mastery n (abilities)'. */
function parseSpell(line: string): { name: string; tech?: Technique; form?: Form; requisites?: Art[]; level?: number; mastery: number; masteries: string[]; note?: string } {
  const s = line.replace(/^\s*\*|\*(?=\s*\()/g, '').replace(/\*/g, '').trim();
  // Technique and Form, with requisites after either in brackets or run on: Cr(Re)Me 20, MuVi(Me) 20, InCoMe 15
  const m = s.match(/^(.+?)\s*\(([A-Z][a-z])(?:\(([A-Z][a-z])\))?([A-Z][a-z])((?:\(?[A-Z][a-z]\)?)*)\s+(\d+)[^)]*\)/);
  const mastery = s.match(/Mastery\s+(\d+)\s*(?:\(([^)]*)\))?/i);
  const masteries = mastery?.[2] ? splitTop(mastery[2], ',') : [];
  const note = /gained from Twilight/i.test(s) ? 'Gained from Twilight.' : undefined;
  if (!m) return { name: s.replace(/\s*[+,].*$/, '').trim(), mastery: Number(mastery?.[1] ?? 0), masteries, note };
  const requisites = [m[3], ...(m[5].match(/[A-Z][a-z]/g) ?? [])].filter(Boolean) as Art[];
  return { name: m[1].trim(), tech: m[2] as Technique, form: m[4] as Form, requisites, level: Number(m[6]), mastery: Number(mastery?.[1] ?? 0), masteries, note };
}

const spellKey = (s: string) => norm(s).replace(/[^a-z0-9 ]/g, '').replace(/^the /, '');

/** Build the stat block onto a magus, companion or grog already given a type, name, age and House. */
export function applyStatBlock(c: Character, sb: StatBlock, data: GameData, rules: HouseRules): StatBlockResult {
  const problems: string[] = [];
  // Characteristics, with the Aging Points the brackets give
  for (const m of sb.characteristics.matchAll(/(Int|Per|Pre|Com|Str|Sta|Dex|Qik)\s*([+\-–−]?\s*\d+)(?:\s*\((\d+)\))?/g)) {
    const k = m[1] as Characteristic;
    c.characteristics[k] = num(m[2].replace(/\s/g, ''));
    if (m[3] && Number(m[3])) c.agingPoints[k] = Number(m[3]);
  }
  // Virtues and Flaws: the House's own (starred) as its benefit, the rest as listed
  const items = parseVirtues(sb.virtues, data, problems);
  const house = c.house ? HOUSE_BY_ID[c.house] : undefined;
  if (house && c.house) {
    const starred = items.filter((x) => x.house);
    const i = house.benefitOptions.findIndex((b) => starred.some((x) => x.def.id === b.virtueId && (!b.param || b.param === x.param)));
    // Jerbiton's free Minor Virtue from the House's list
    const free = house.freeChoiceFrom ? starred.find((x) => house.freeChoiceFrom!.includes(x.def.id)) : undefined;
    setHouse(c, data, c.house, Math.max(0, i), free ? { defId: free.def.id, param: free.param } : undefined);
  }
  for (const x of items) {
    for (let k = 0; k < x.count; k++) {
      const have = c.virtues.filter((v) => v.defId === x.def.id && (v.param ?? '') === (x.param ?? '')).length;
      if (have > k) continue;
      // one that came with another (Mythic Blood's Minor Magical Focus): its choice, not a second
      const came = x.free ? c.virtues.find((v) => v.defId === x.def.id && !v.param && v.free) : undefined;
      if (came) {
        came.param = x.param;
        continue;
      }
      addVirtue(c, data, x.def.id, x.size, x.param, x.free ? { free: true, freeReason: x.free } : {});
    }
  }
  // a stat block gives a Characteristic after Great and Poor (Characteristic): the toolkit keeps the
  // value bought and adds those itself, so take them back off (Philippus's Intelligence +5 is +3 bought)
  for (const k of Object.keys(c.characteristics) as Characteristic[]) {
    for (const v of c.virtues) {
      for (const e of data.vfById.get(v.defId)?.effects ?? []) {
        if (e.type === 'greatChar' && (e.char === k || (e.char === '$param' && v.param === k))) c.characteristics[k] -= e.amount;
      }
    }
  }
  // Abilities, at the scores the book gives (a correction outside the creation budgets)
  let native = false;
  for (const raw of splitTop(sb.abilities.replace(/<br>/g, ''), ',')) {
    const m = raw.match(/^(.+?)\s+(\d+)(?:\s*\+\s*\d+)?\s*(?:\((.+)\))?\s*$/);
    if (!m) {
      problems.push(`Ability “${raw}”`);
      continue;
    }
    const found = abilityFor(m[1], data);
    if (!found || !data.abilityById.has(found[0])) {
      problems.push(`Ability “${m[1]}”`);
      continue;
    }
    const ab = ensureAbility(c, found[0], {}, found[1]);
    ab.xp = { adjust: abilityXpForScore(Number(m[2])) };
    if (m[3]) ab.specialty = m[3].trim();
    // the first spoken language with a score of 5 or more is the native one
    if (!native && found[0] === 'living-language' && Number(m[2]) >= 5) {
      ab.native = true;
      native = true;
    }
  }
  // Arts at their scores (the Puissant bonus is the Virtue's)
  if (sb.arts) {
    for (const m of sb.arts.matchAll(/\b(Cr|In|Mu|Pe|Re|An|Aq|Au|Co|He|Ig|Im|Me|Te|Vi)\s+(\d+)/g)) c.arts[m[1] as Art] = { adjust: artXpForScore(Number(m[2])) };
  }
  // spells by name, from the toolkit's lists where they are there, as the book gives them where not
  const byName = new Map(data.spells.map((s) => [spellKey(s.name), s]));
  for (const line of sb.spells ?? []) {
    const p = parseSpell(line);
    const known = byName.get(spellKey(p.name));
    const spell: SpellDef | undefined = known
      ? structuredClone(known)
      : p.tech && p.form && p.level !== undefined
        ? { id: `book-${spellKey(p.name).replace(/ /g, '-')}`, name: p.name, technique: p.tech, form: p.form, level: p.level, general: false, range: '', duration: '', target: '', ritual: false, requisites: p.requisites ?? [], text: 'A spell the book gives without the toolkit’s lists having it: see the book for its parameters.', design: null, base: null, source: { book: 'custom', line: 0 }, custom: true }
        : undefined;
    if (!spell) {
      problems.push(`Spell “${p.name}”`);
      continue;
    }
    // a general spell at the level the magus knows it
    if (spell.level === null && p.level !== undefined) spell.level = p.level;
    c.spells.push({ uid: uid(), spellId: known?.id, spell, masteryXp: p.mastery ? { adjust: abilityXpForScore(p.mastery) } : {}, masteryAbilities: p.masteries, source: 'free', notes: p.note });
  }
  if (sb.moreSpells) addSpells(c, sb.moreSpells, data, rules);
  // Warping, Decrepitude and Confidence: a score, and the points toward the next
  const score = (s?: string) => {
    const m = s?.match(/(\d+)(?:\s*\((\d+)\))?/);
    return m ? { score: Number(m[1]), extra: Number(m[2] ?? 0) } : undefined;
  };
  const w = score(sb.warping);
  if (w) c.warpingPoints = abilityXpForScore(w.score) + Math.min(w.extra, 5 * (w.score + 1) - 1);
  const dp = score(sb.decrepitude);
  if (dp) c.decrepitudePoints = abilityXpForScore(dp.score) + Math.min(dp.extra, 5 * (dp.score + 1) - 1);
  const cf = score(sb.confidence);
  if (cf) c.confidence = { score: cf.score, points: cf.extra };
  for (const raw of sb.reputations && !/^none$/i.test(sb.reputations.trim()) ? splitTop(sb.reputations, ',') : []) {
    const m = raw.match(/^(.+?)\s+(\d+)\s*\(([^)]+)\)$/);
    if (m) c.reputations.push({ uid: uid(), text: m[1].trim(), score: Number(m[2]), scope: m[3].trim() });
    else problems.push(`Reputation “${raw}”`);
  }
  if (sb.longevity) c.longevity = { labTotal: sb.longevity * 5, bonus: sb.longevity, extraVis: 0, createdYear: c.birthYear + 35 };
  if (sb.equipment) c.equipment.other = sb.equipment;
  return { problems };
}

/** More spells, from the magus's strongest Arts, to a number of levels: for an entry that names few. */
function addSpells(c: Character, levels: number, data: GameData, rules: HouseRules) {
  const d = deriveCharacter(c, data, rules);
  const arts = [...ARTS].sort((a, b) => d.arts[b].score - d.arts[a].score);
  const techs = arts.filter((a) => (TECHNIQUES as readonly string[]).includes(a)).slice(0, 3) as Technique[];
  const forms = arts.filter((a) => (FORMS as readonly string[]).includes(a)).slice(0, 4) as Form[];
  const combos = techs.flatMap((t) => forms.map((f) => ({ t, f, s: d.arts[t].score + d.arts[f].score }))).sort((a, b) => b.s - a.s);
  let left = levels;
  for (let round = 0; round < 3 && left > 0; round++) {
    for (const cb of combos) {
      if (left <= 0) break;
      const limit = creationSpellLimit(d, { technique: cb.t, form: cb.f }, rules.spellLevelLimitBonus).total;
      const s = data.spells
        .filter((x) => x.technique === cb.t && x.form === cb.f && x.level !== null && !x.general && !x.ritual && !x.requisites.length && x.level <= Math.min(limit, left) && x.source.book === 'DE')
        .filter((x) => !c.spells.some((y) => y.spell.name === x.name))
        .sort((a, b) => (b.level ?? 0) - (a.level ?? 0))[round];
      if (!s) continue;
      const cs: CharSpell = { uid: uid(), spellId: s.id, spell: structuredClone(s), masteryXp: {}, masteryAbilities: [], source: 'free' };
      c.spells.push(cs);
      left -= s.level ?? 0;
    }
  }
}
