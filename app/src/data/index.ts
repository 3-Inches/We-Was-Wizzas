// Assembles the reference data: extracted JSON + hand-coded mechanics + saga-level
// customizations (custom content, disabled books, edited mechanics).

import vfJson from './generated/virtuesFlaws.json';
import abilitiesJson from './generated/abilities.json';
import spellsJson from './generated/spells.json';
import guidelinesJson from './generated/guidelines.json';
import guidelineNotesJson from './generated/guidelineNotes.json';
import labVFJson from './generated/labVirtuesFlaws.json';
import labFeaturesJson from './generated/labFeatures.json';
import hooksBoonsJson from './generated/hooksBoons.json';
import shapeMaterialJson from './generated/shapeMaterial.json';
import weaponsJson from './generated/weapons.json';
import armorJson from './generated/armor.json';
import { MECHANICS, type Mechanics } from './mechanics';
import { NOT_REAL_VF, RESTRICTIONS } from './restrictions';
import { buildVfTags, vfHouses } from './vfTags';
import type {
  AbilityDef, ArmorDef, GuidelineDef, HookBoonDef, LabFeatureDef, LabVFDef, ShapeMaterialDef,
  SpellDef, VirtueFlawDef, WeaponDef, Effect, AbilityType,
} from './types';

export * from './types';
export * from './constants';

const RAW_VF = (vfJson as unknown as VirtueFlawDef[]).filter((v) => !NOT_REAL_VF.has(v.id));
const RAW_ABILITIES = abilitiesJson as unknown as AbilityDef[];
const RAW_SPELLS = spellsJson as unknown as SpellDef[];

// --------------------------------------------------------------------------------------
// Language & parameterized abilities

export const LANGUAGE_NAMES = [
  'Latin', 'Greek', 'Hebrew', 'Aramaic', 'Arabic', 'Persian', 'Gothic', 'Avestan', 'Old Norse', 'Coptic',
];
export const DEAD_LANGUAGES = ['Latin', 'Classical Greek', 'Hebrew', 'Aramaic', 'Gothic', 'Avestan', 'Coptic', 'Syriac', 'Old Irish'];
export const LIVING_LANGUAGES = [
  'French', 'Occitan', 'German', 'English', 'Norse', 'Italian', 'Castilian', 'Catalan', 'Portuguese', 'Irish Gaelic',
  'Scots Gaelic', 'Welsh', 'Breton', 'Flemish', 'Frisian', 'Polish', 'Hungarian', 'Czech', 'Russian', 'Greek',
  'Arabic', 'Persian', 'Turkish', 'Armenian', 'Hebrew (vernacular)', 'Basque', 'Danish', 'Swedish',
];

/** Abilities that take a free-text parameter (area, language, craft...). */
export const PARAMETERIZED_ABILITIES: Record<string, string> = {
  'area-lore': 'Area',
  'living-language': 'Language',
  'dead-language': 'Language',
  'craft-type': 'Craft',
  'profession-type': 'Profession',
  'organization-lore': 'Organization',
  'mystery-cult-lore': 'Mystery Cult',
  'form-resistance': 'Form',
};

export function isLanguageAbility(abilityId: string): boolean {
  return abilityId === 'living-language' || abilityId === 'dead-language' || abilityId.startsWith('dead-language-');
}

/**
 * Does a character's ability instance match an ability reference used in rules data?
 * Rules data refers to e.g. 'latin', 'area-lore', 'profession-storyteller', 'craft'.
 */
export function abilityMatches(ref: string, abilityId: string, param?: string): boolean {
  const p = (param ?? '').toLowerCase().trim();
  if (ref === abilityId) return true;
  const langs: Record<string, string[]> = {
    latin: ['latin'], greek: ['greek', 'classical greek'], hebrew: ['hebrew', 'hebrew (vernacular)'], aramaic: ['aramaic'],
    arabic: ['arabic'], persian: ['persian'],
  };
  if (ref in langs && isLanguageAbility(abilityId)) return langs[ref].includes(p);
  if (ref === 'living-language') return abilityId === 'living-language';
  if (ref === 'dead-language') return abilityId === 'dead-language' || abilityId.startsWith('dead-language-');
  if (ref === 'craft') return abilityId === 'craft-type';
  if (ref === 'profession') return abilityId === 'profession-type';
  if (ref.startsWith('profession-')) {
    const want = ref.slice('profession-'.length).replace(/-/g, ' ');
    return (abilityId === 'profession-type' && p === want) || abilityId === ref;
  }
  if (ref === 'organization-lore') return abilityId.startsWith('organization-lore');
  if (ref === 'area-lore') return abilityId === 'area-lore';
  return false;
}

// --------------------------------------------------------------------------------------
// Heuristics

const CREATURE_NOTE = /animals only|beasts only|corrupted beasts/i;
const CREATURE_TEXT = /^(The|This) (creature|beast|faerie|demon|spirit|animal)\b/i;

function inferGrant(v: VirtueFlawDef, abilityIds: Set<string>): Effect[] {
  if (v.kind !== 'virtue' || !v.categories.includes('Supernatural')) return [];
  const t = v.text.replace(/\s+/g, ' ');
  const m = t.match(/(?:confers|gives?|grants?|provides?|has|have|gain|gains|start(?:s)? with|begin(?:s)? with)[^.]{0,40}?(?:the )?(?:Supernatural )?Ability (?:of )?([A-Z][\w'’ -]+?)(?:,)? (?:at (?:a score of )?1|1\b|at a score|with a score of 1)/);
  const nameSlug = v.name.toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  if (m) {
    const s = m[1].toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return [{ type: 'grantAbility', ability: s, score: 1 }];
  }
  if (abilityIds.has(nameSlug)) return [{ type: 'grantAbility', ability: nameSlug, score: 1 }];
  return [];
}

function autoTags(v: VirtueFlawDef): string[] {
  const t = (v.name + ' ' + v.text).toLowerCase();
  const tags = new Set<string>();
  const rules: [RegExp, string][] = [
    [/\b(combat|attack|soak|weapon|wound|martial|initiative)\b/, 'combat'],
    [/\b(lab total|laboratory)\b/, 'lab'],
    [/\b(casting total|casting score|spontaneous|formulaic)\b/, 'casting'],
    [/\bpenetration\b/, 'penetration'],
    [/\b(presence|communication|charm|social|reputation)\b/, 'social'],
    [/\b(faerie|fae|fay)\b/, 'faerie'],
    [/\b(divine|holy|angel|saint|faith)\b/, 'divine'],
    [/\b(infernal|demon|devil|tainted)\b/, 'infernal'],
    [/\b(study|advancement total|source quality|experience points)\b/, 'study'],
    [/\b(academic|latin|artes liberales|scholar|university)\b/, 'scholar'],
    [/\b(animal|beast)\b/, 'animals'],
    [/\b(stealth|hide|sneak|disguise)\b/, 'stealth'],
    [/\b(wealth|money|rich|silver)\b/, 'wealth'],
    [/\b(heal|disease|wound)\b/, 'healing'],
    [/\b(enchant|item|talisman)\b/, 'enchanting'],
    [/\b(craft|smith)\b/, 'craft'],
    [/\b(travel|journey|language)\b/, 'travel'],
    [/\b(aging|longevity)\b/, 'longevity'],
  ];
  for (const [re, tag] of rules) if (re.test(t)) tags.add(tag);
  return [...tags];
}

/**
 * Combine the restriction data, the hand-written mechanics and a saga's override for one
 * Virtue/Flaw. Later layers win, except that the lists of prerequisites and incompatibilities
 * from the first two layers are combined (an override replaces them outright).
 */
export function mergeMechanics(restr: Mechanics = {}, mech: Mechanics = {}, override: Partial<Mechanics> = {}): Mechanics {
  const union = (a?: string[], b?: string[]) => (a || b ? [...new Set([...(a ?? []), ...(b ?? [])])] : undefined);
  const out: Mechanics = { ...restr, ...mech };
  const excludes = union(restr.excludes, mech.excludes);
  const requires = union(restr.requires, mech.requires);
  const needs = restr.needs || mech.needs ? [...(restr.needs ?? []), ...(mech.needs ?? [])] : undefined;
  if (excludes) out.excludes = excludes;
  if (requires) out.requires = requires;
  if (needs) out.needs = needs;
  return { ...out, ...override };
}

// --------------------------------------------------------------------------------------
// Saga customization

export interface CustomContent {
  virtuesFlaws: VirtueFlawDef[];
  abilities: AbilityDef[];
  spells: SpellDef[];
  labVirtuesFlaws: LabVFDef[];
  hooksBoons: HookBoonDef[];
  shapeMaterial: ShapeMaterialDef[];
  weapons: WeaponDef[];
}

export const emptyCustomContent = (): CustomContent => ({
  virtuesFlaws: [], abilities: [], spells: [], labVirtuesFlaws: [], hooksBoons: [], shapeMaterial: [], weapons: [],
});

export interface DataOptions {
  /** book ids that are allowed in this saga; undefined = all */
  enabledBooks?: string[];
  /** per-V&F mechanics overrides from house rules */
  mechanicsOverrides?: Record<string, Partial<Mechanics>>;
  custom?: CustomContent;
}

export interface GameData {
  virtuesFlaws: VirtueFlawDef[];
  vfById: Map<string, VirtueFlawDef>;
  abilities: AbilityDef[];
  abilityById: Map<string, AbilityDef>;
  spells: SpellDef[];
  spellById: Map<string, SpellDef>;
  guidelines: GuidelineDef[];
  guidelineNotes: Record<string, { text: string; source: { book: string; line: number; anchor: string } }>;
  labVirtuesFlaws: LabVFDef[];
  labVFById: Map<string, LabVFDef>;
  labFeatures: LabFeatureDef[];
  hooksBoons: HookBoonDef[];
  hookBoonById: Map<string, HookBoonDef>;
  shapeMaterial: ShapeMaterialDef[];
  weapons: WeaponDef[];
  weaponById: Map<string, WeaponDef>;
  armor: ArmorDef[];
  armorById: Map<string, ArmorDef>;
  isBookEnabled: (book: string) => boolean;
}

const cache = new Map<string, GameData>();

export function buildGameData(opts: DataOptions = {}): GameData {
  const key = JSON.stringify(opts);
  const hit = cache.get(key);
  if (hit) return hit;
  const enabled = opts.enabledBooks ? new Set([...opts.enabledBooks, 'DE', 'custom']) : null;
  const isBookEnabled = (b: string) => !enabled || enabled.has(b);
  const custom = opts.custom ?? emptyCustomContent();

  const abilities: AbilityDef[] = [...RAW_ABILITIES, ...custom.abilities].map((a) => ({
    ...a,
    parameterized: a.id in PARAMETERIZED_ABILITIES,
    isLanguage: isLanguageAbility(a.id),
  }));
  const abilityIds = new Set(abilities.map((a) => a.id));

  const vfs: VirtueFlawDef[] = [...RAW_VF, ...custom.virtuesFlaws].map((v) => {
    const mech = mergeMechanics(RESTRICTIONS[v.id], MECHANICS[v.id], opts.mechanicsOverrides?.[v.id]);
    const effects = mech.effects ?? inferGrant(v, abilityIds);
    const creatureOnly = mech.creatureOnly ?? (CREATURE_NOTE.test(v.notes ?? '') || (v.source.book.startsWith('RoP') && CREATURE_TEXT.test(v.text)));
    return {
      ...v,
      ...mech,
      effects,
      creatureOnly,
      tags: [...new Set([...(mech.tags ?? []), ...autoTags(v)])],
      requiresGift: mech.requiresGift ?? (v.categories.includes('Hermetic') ? true : undefined),
    };
  });
  // "A cannot be taken with B" works both ways.
  const byId = new Map(vfs.map((v) => [v.id, v]));
  for (const v of vfs) {
    for (const ex of v.excludes ?? []) {
      const other = byId.get(ex);
      if (other && !(other.excludes ?? []).includes(v.id)) other.excludes = [...(other.excludes ?? []), v.id];
    }
  }
  for (const v of vfs) {
    v.ruleTags = buildVfTags(v, (id) => byId.get(id)?.name ?? id);
    v.houseIds = vfHouses(v);
  }

  const spells = [...RAW_SPELLS, ...custom.spells];
  const labVF = [...(labVFJson as unknown as LabVFDef[]), ...custom.labVirtuesFlaws];
  const hb = [...(hooksBoonsJson as unknown as HookBoonDef[]), ...custom.hooksBoons].map((h) => ({
    ...h,
    requires: h.requires ?? (/shell keep|tower keep|curtain walls/i.test(h.name) ? 'Castle' : null),
  }));
  const weapons = [...(weaponsJson as unknown as WeaponDef[]), ...custom.weapons];
  const armor = armorJson as unknown as ArmorDef[];

  const data: GameData = {
    virtuesFlaws: vfs,
    vfById: new Map(vfs.map((v) => [v.id, v])),
    abilities,
    abilityById: new Map(abilities.map((a) => [a.id, a])),
    spells,
    spellById: new Map(spells.map((s) => [s.id, s])),
    guidelines: guidelinesJson as unknown as GuidelineDef[],
    guidelineNotes: guidelineNotesJson as GameData['guidelineNotes'],
    labVirtuesFlaws: labVF,
    labVFById: new Map(labVF.map((l) => [l.id, l])),
    labFeatures: labFeaturesJson as unknown as LabFeatureDef[],
    hooksBoons: hb,
    hookBoonById: new Map(hb.map((h) => [h.id, h])),
    shapeMaterial: [...(shapeMaterialJson as unknown as ShapeMaterialDef[]), ...custom.shapeMaterial],
    weapons,
    weaponById: new Map(weapons.map((w) => [w.id, w])),
    armor,
    armorById: new Map(armor.map((a) => [a.id, a])),
    isBookEnabled,
  };
  cache.set(key, data);
  return data;
}

export function abilityTypeOf(data: GameData, abilityId: string): AbilityType {
  if (isLanguageAbility(abilityId)) return abilityId === 'dead-language' ? 'Academic' : 'General';
  return data.abilityById.get(abilityId)?.type ?? 'General';
}
