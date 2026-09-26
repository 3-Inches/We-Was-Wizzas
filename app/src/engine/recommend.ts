// Recommendation engine: suggests Virtues, Flaws, Characteristics, Abilities, Arts and
// spells based on the character's type, House, concept archetypes, and existing choices.
// Suggestions always explain *why*, and never override the player.

import { ARTS, ART_NAMES, type Art, type GameData, type VirtueFlawDef } from '../data';
import type { DerivedCharacter } from './character/derive';
import { vfProblems } from './character/restrictions';

export interface Archetype {
  id: string;
  label: string;
  tags: string[];
  description: string;
  forTypes?: string[];
}

export const ARCHETYPES: Archetype[] = [
  { id: 'warrior', label: 'Warrior / Protector', tags: ['combat', 'physical'], description: 'Fights for the covenant: shield grogs, knights, hoplites.' },
  { id: 'scholar', label: 'Scholar', tags: ['scholar', 'study'], description: 'Learning, books, law, theology, medicine.' },
  { id: 'lab', label: 'Laboratory Researcher', tags: ['lab', 'study', 'enchanting'], description: 'Spell invention, enchanted items, breakthroughs.', forTypes: ['magus'] },
  { id: 'enchanter', label: 'Enchanter / Artificer', tags: ['enchanting', 'craft', 'lab'], description: 'Talismans, invested devices, charged items.', forTypes: ['magus'] },
  { id: 'battle-mage', label: 'Battle Mage / Hoplite', tags: ['combat', 'casting', 'penetration'], description: 'Fast, penetrating magic for dangerous situations.', forTypes: ['magus'] },
  { id: 'social', label: 'Diplomat / Courtier', tags: ['social', 'leadership'], description: 'Talks, persuades, negotiates, manipulates.' },
  { id: 'politician', label: 'Hermetic Politician', tags: ['social', 'hermetic'], description: 'Tribunals, Code of Hermes, alliances.' },
  { id: 'explorer', label: 'Explorer / Woodsman', tags: ['wilderness', 'travel', 'animals'], description: 'Scouts, hunters, guides, travelers.' },
  { id: 'rogue', label: 'Rogue / Spy', tags: ['stealth', 'social'], description: 'Thieves, spies, infiltrators.' },
  { id: 'healer', label: 'Healer', tags: ['healing', 'scholar'], description: 'Chirurgeons, physicians, healing magic.' },
  { id: 'faerie', label: 'Faerie-touched', tags: ['faerie', 'supernatural'], description: 'Close to the fae; Merinita, faerie blood, faerie doctors.' },
  { id: 'faith', label: 'Faithful / Holy', tags: ['divine'], description: 'True Faith, clergy, relics, holy powers.' },
  { id: 'demon-hunter', label: 'Demon Hunter', tags: ['infernal', 'divine', 'supernatural'], description: 'Opposes the Infernal.' },
  { id: 'beast', label: 'Beast-friend', tags: ['animals', 'wilderness'], description: 'Animal companions, shapeshifting, Bjornaer.' },
  { id: 'mystic', label: 'Mystic / Seer', tags: ['supernatural', 'twilight'], description: 'Visions, premonitions, enigmas, Twilight.' },
  { id: 'craftsman', label: 'Craftsman / Merchant', tags: ['craft', 'wealth'], description: 'Makes and sells goods.' },
  { id: 'noble', label: 'Noble / Wealthy', tags: ['wealth', 'social', 'leadership'], description: 'Rank, money and influence.' },
  { id: 'elemental', label: 'Elementalist', tags: ['elemental', 'casting'], description: 'Master of Aquam, Auram, Ignem, Terram.', forTypes: ['magus'] },
];

export interface Suggestion {
  kind: 'virtue' | 'flaw' | 'characteristic' | 'ability' | 'art' | 'spell' | 'tip';
  id?: string;
  param?: string;
  title: string;
  reason: string;
  score: number;
  group: 'Synergy' | 'Concept' | 'House' | 'Rules' | 'Tip';
}

const has = (d: DerivedCharacter, id: string, param?: string) => d.char.virtues.some((v) => v.defId === id && (param === undefined || v.param === param));

function allowed(d: DerivedCharacter, v: VirtueFlawDef, data: GameData): boolean {
  const t = d.char.type;
  if (v.creatureOnly) return false;
  if (vfProblems(d, data, v).some((p) => p.severity === 'error' || (p.severity === 'warning' && !p.id.startsWith('char-')))) return false;
  if (v.forTypes && !v.forTypes.includes(t)) return false;
  if (v.requiresGift && !d.hasGift) return false;
  if (t === 'grog' && (v.sizes.every((s) => s === 'Major') || v.categories.includes('Hermetic') || v.categories.includes('Story'))) return false;
  if (v.categories.includes('Mythic Companion') && t !== 'mythic') return false;
  if (v.categories.includes('Social Status')) return false; // statuses are a concept choice, not a recommendation
  if (v.id === 'the-gift' || v.id === 'hermetic-magus') return false;
  if (!v.repeatable && d.char.virtues.some((x) => x.defId === v.id)) return false;
  if ((v.excludes ?? []).some((e) => has(d, e))) return false;
  return true;
}

export function recommend(d: DerivedCharacter, data: GameData, archetypeIds: string[]): Suggestion[] {
  const out: Suggestion[] = [];
  const t = d.char.type;
  const push = (s: Suggestion) => {
    if (s.id && (s.kind === 'virtue' || s.kind === 'flaw')) {
      const def = data.vfById.get(s.id);
      if (!def || !allowed(d, def, data)) return;
      if (!data.isBookEnabled(def.source.book)) return;
      if (has(d, s.id, s.param)) return;
    }
    if (!out.some((o) => o.kind === s.kind && o.id === s.id && o.param === s.param && o.title === s.title)) out.push(s);
  };

  // ------------------------------------------------------------- Synergies with existing choices
  for (const e of d.effects) {
    if (e.type === 'artBonus' && typeof e.art === 'string' && e.art) {
      push({ kind: 'virtue', id: 'affinity-with-art', param: e.art, title: `Affinity with ${ART_NAMES[e.art as Art]}`, reason: `You have ${e.fromName}. Puissant + Affinity in the same Art is the classic specialist combination: faster growth and a higher effective score.`, score: 9, group: 'Synergy' });
    }
    if (e.type === 'artAffinity' && typeof e.art === 'string' && e.art) {
      push({ kind: 'virtue', id: 'puissant-art', param: e.art, title: `Puissant ${ART_NAMES[e.art as Art]}`, reason: `You have ${e.fromName}; Puissant adds +3 to every total using that Art.`, score: 8, group: 'Synergy' });
    }
    if (e.type === 'abilityBonus' && typeof e.ability === 'string' && e.ability) {
      push({ kind: 'virtue', id: 'affinity-with-ability', param: e.ability, title: `Affinity with ${data.abilityById.get(e.ability)?.name ?? e.ability}`, reason: `Pairs with ${e.fromName}; Affinity also raises the creation age cap by 2.`, score: 7, group: 'Synergy' });
    }
    if (e.type === 'abilityAffinity' && typeof e.ability === 'string' && e.ability) {
      push({ kind: 'virtue', id: 'puissant-ability', param: e.ability, title: `Puissant ${data.abilityById.get(e.ability)?.name ?? e.ability}`, reason: `Pairs with ${e.fromName}.`, score: 6, group: 'Synergy' });
    }
    if (e.type === 'magicalFocus') {
      out.push({ kind: 'tip', title: 'Build around your Magical Focus', reason: 'Spells and lab work inside your focus add your lowest applicable Art again. Invest in the Technique and Form that the focus covers, and mark in-focus spells on the sheet.', score: 7, group: 'Synergy' });
    }
  }
  if (has(d, 'flawless-magic')) push({ kind: 'virtue', id: 'mastered-spells', title: 'Mastered Spells', reason: 'Flawless Magic doubles Spell Mastery advancement; Mastered Spells adds 50 more mastery xp.', score: 5, group: 'Synergy' });
  if (has(d, 'wealthy')) out.push({ kind: 'tip', title: 'Wealthy: 20 xp per year of later life', reason: 'Wealthy characters gain 20 rather than 15 xp per year after childhood, and have three free seasons a year.', score: 3, group: 'Rules' });
  if (d.giftType === 'normal' && archetypeIds.some((a) => ['social', 'politician', 'noble'].includes(a))) {
    push({ kind: 'virtue', id: 'gentle-gift', title: 'Gentle Gift', reason: 'Social concepts struggle with the –3 Gift penalty; the Gentle Gift removes it entirely.', score: 9, group: 'Synergy' });
  }
  if (d.giftType === 'blatant') out.push({ kind: 'tip', title: 'Blatant Gift', reason: 'The –6 social penalty is severe; lean into intimidation or reclusiveness, and consider Covenfolk with high loyalty.', score: 2, group: 'Tip' });
  if (has(d, 'educated') && !d.char.abilities.some((a) => a.abilityId === 'dead-language')) {
    out.push({ kind: 'ability', id: 'dead-language', param: 'Latin', title: 'Latin', reason: 'Educated gives 50 xp that must go to Latin and Artes Liberales.', score: 8, group: 'Rules' });
  }
  if (d.char.virtues.some((v) => /faerie/i.test(v.defId)) && !d.char.abilities.some((a) => a.abilityId === 'faerie-lore')) {
    out.push({ kind: 'ability', id: 'faerie-lore', title: 'Faerie Lore', reason: 'Faerie-touched characters may learn Faerie Lore at creation, and it fits the concept.', score: 5, group: 'Synergy' });
  }

  // ------------------------------------------------------------- House packages
  if (t === 'magus' && d.char.house) {
    const houseRecs: Record<string, [string, string?, string?][]> = {
      bonisagus: [['inventive-genius'], ['affinity-with-ability', 'magic-theory'], ['book-learner'], ['good-teacher']],
      flambeau: [['affinity-with-art', 'Ig'], ['affinity-with-art', 'Pe'], ['fast-caster'], ['flawless-magic'], ['puissant-ability', 'penetration'], ['tough']],
      guernicus: [['clear-thinker'], ['puissant-ability', 'code-of-hermes'], ['piercing-gaze'], ['strong-willed']],
      jerbiton: [['gentle-gift'], ['educated'], ['free-expression'], ['social-contacts']],
      mercere: [['well-traveled'], ['affinity-with-art', 'Re'], ['wilderness-sense']],
      merinita: [['faerie-blood'], ['second-sight'], ['affinity-with-art', 'Mu'], ['inoffensive-to-beings', 'faeries']],
      tremere: [['puissant-art', 'Vi'], ['affinity-with-art', 'Vi'], ['self-confident'], ['strong-willed']],
      tytalus: [['puissant-art', 'Me'], ['affinity-with-art', 'Me'], ['strong-willed']],
      verditius: [['inventive-genius'], ['puissant-ability', 'craft-type'], ['affinity-with-ability', 'magic-theory'], ['adept-laboratory-student']],
      bjornaer: [['puissant-ability', 'heartbeast'], ['affinity-with-art', 'An'], ['wilderness-sense']],
      criamon: [['affinity-with-ability', 'enigmatic-wisdom'], ['strong-willed'], ['clear-thinker']],
      'ex-miscellanea': [['cautious-sorcerer'], ['inventive-genius']],
    };
    for (const [id, param] of houseRecs[d.char.house] ?? []) {
      const def = data.vfById.get(id);
      if (!def) continue;
      const label = param ? `${def.name.replace(/\b(Ability|Art)\b/, '').replace(/\(.*\)/, '').trim()} ${ART_NAMES[param as Art] ?? data.abilityById.get(param)?.name ?? param}` : def.name;
      push({ kind: 'virtue', id, param, title: label, reason: `A classic choice for House ${d.char.house[0].toUpperCase()}${d.char.house.slice(1)}.`, score: 6, group: 'House' });
    }
  }

  // ------------------------------------------------------------- Concept archetypes (tag scoring)
  const tags = new Set<string>();
  for (const a of archetypeIds) for (const tg of ARCHETYPES.find((x) => x.id === a)?.tags ?? []) tags.add(tg);
  if (tags.size) {
    const scored: { v: VirtueFlawDef; s: number }[] = [];
    for (const v of data.virtuesFlaws) {
      if (!allowed(d, v, data) || !data.isBookEnabled(v.source.book)) continue;
      const overlap = (v.tags ?? []).filter((x) => tags.has(x)).length;
      if (!overlap) continue;
      let s = overlap * 2;
      if (v.source.book === 'DE') s += 1.5;
      if (v.effects?.length) s += 1;
      scored.push({ v, s });
    }
    scored.sort((a, b) => b.s - a.s);
    const takeV = scored.filter((x) => x.v.kind === 'virtue').slice(0, 14);
    const takeF = scored.filter((x) => x.v.kind === 'flaw' && (x.v.categories.includes('Personality') || x.v.categories.includes('Story'))).slice(0, 6);
    for (const { v, s } of [...takeV, ...takeF]) {
      push({ kind: v.kind, id: v.id, title: v.name, reason: `Fits your concept (${(v.tags ?? []).filter((x) => tags.has(x)).join(', ')}).`, score: s, group: 'Concept' });
    }
  }

  // ------------------------------------------------------------- Ability-access rules helpers
  const archSet = new Set(archetypeIds);
  if ((archSet.has('warrior') || archSet.has('battle-mage')) && t !== 'magus' && !d.abilityAccess.types.has('Martial')) {
    push({ kind: 'virtue', id: 'warrior', title: 'Warrior', reason: 'You need a Virtue to buy Martial Abilities at creation; Warrior also gives 50 xp in them.', score: 10, group: 'Rules' });
  }
  if ((archSet.has('scholar') || archSet.has('healer')) && t !== 'magus' && !d.abilityAccess.types.has('Academic')) {
    push({ kind: 'virtue', id: 'educated', title: 'Educated', reason: 'You need a Virtue to buy Academic Abilities at creation; Educated also gives 50 xp in Latin and Artes Liberales.', score: 10, group: 'Rules' });
  }
  if ((archSet.has('mystic') || archSet.has('demon-hunter') || archSet.has('faerie')) && t !== 'magus' && !d.abilityAccess.types.has('Arcane')) {
    push({ kind: 'virtue', id: 'arcane-lore', title: 'Arcane Lore', reason: 'You need a Virtue to buy Arcane Abilities (Realm Lores) at creation; Arcane Lore also gives 50 xp.', score: 8, group: 'Rules' });
  }

  // ------------------------------------------------------------- Characteristics
  const ch = d.characteristics;
  if (t === 'magus') {
    if (ch.Int.base < 2) out.push({ kind: 'characteristic', id: 'Int', title: 'Raise Intelligence', reason: 'Intelligence adds to every Lab Total.', score: 8, group: 'Rules' });
    if (ch.Sta.base < 1) out.push({ kind: 'characteristic', id: 'Sta', title: 'Raise Stamina', reason: 'Stamina adds to every Casting Total and Concentration roll.', score: 6, group: 'Rules' });
    if (archSet.has('scholar') || archSet.has('lab')) out.push({ kind: 'characteristic', id: 'Com', title: 'Consider Communication', reason: 'Communication determines the quality of the books you write and your teaching.', score: 3, group: 'Tip' });
  }
  if (archSet.has('warrior')) {
    if (ch.Dex.base < 1) out.push({ kind: 'characteristic', id: 'Dex', title: 'Dexterity', reason: 'Adds to Attack.', score: 5, group: 'Concept' });
    if (ch.Qik.base < 1) out.push({ kind: 'characteristic', id: 'Qik', title: 'Quickness', reason: 'Adds to Initiative and Defense.', score: 5, group: 'Concept' });
    if (ch.Sta.base < 1) out.push({ kind: 'characteristic', id: 'Sta', title: 'Stamina', reason: 'Adds to Soak.', score: 4, group: 'Concept' });
    if (ch.Str.base < 1) out.push({ kind: 'characteristic', id: 'Str', title: 'Strength', reason: 'Adds to Damage and reduces Encumbrance.', score: 4, group: 'Concept' });
  }
  if (archSet.has('social') || archSet.has('noble')) {
    if (ch.Pre.base < 1) out.push({ kind: 'characteristic', id: 'Pre', title: 'Presence', reason: 'Used for Charm, Leadership and first impressions.', score: 5, group: 'Concept' });
    if (ch.Com.base < 1) out.push({ kind: 'characteristic', id: 'Com', title: 'Communication', reason: 'Used for Guile, Etiquette, Intrigue and persuasion.', score: 5, group: 'Concept' });
  }

  // ------------------------------------------------------------- Arts & spells (magi)
  if (t === 'magus') {
    const top = [...ARTS].sort((a, b) => d.arts[b].value - d.arts[a].value);
    const techs = top.filter((a) => ['Cr', 'In', 'Mu', 'Pe', 'Re'].includes(a));
    const forms = top.filter((a) => !['Cr', 'In', 'Mu', 'Pe', 'Re'].includes(a));
    if (d.arts[techs[0]].value > 0 && d.arts[forms[0]].value === 0) {
      out.push({ kind: 'tip', title: 'Balance Technique and Form', reason: 'Casting and Lab Totals add a Technique AND a Form; splitting xp between them gives higher totals than putting everything in one.', score: 7, group: 'Rules' });
    }
    if (d.arts.Vi.score < 3) out.push({ kind: 'art', id: 'Vi', title: 'Some Vim', reason: 'Vim underpins wards, Aegis of the Hearth, dispelling and vis extraction; a few points go a long way.', score: 3, group: 'Tip' });
    // Suggest spells castable in best combination
    const bestTe = techs[0];
    const bestFo = forms[0];
    const known = new Set(d.char.spells.map((s) => s.spell.name.toLowerCase()));
    const candidates = data.spells.filter((s) => s.source.book === 'DE' && s.technique === bestTe && s.form === bestFo && !known.has(s.name.toLowerCase()) && (s.level ?? 0) <= d.arts[bestTe].value + d.arts[bestFo].value + d.characteristics.Int.value + 6);
    for (const s of candidates.slice(0, 6)) {
      out.push({ kind: 'spell', id: s.id, title: `${s.name} (${s.technique}${s.form} ${s.level ?? 'Gen'})`, reason: `Uses your strongest combination, ${ART_NAMES[bestTe]} ${ART_NAMES[bestFo]}.`, score: 4, group: 'Concept' });
    }
    // Essential utility spells
    for (const name of ['Aegis of the Hearth', 'The Chirurgeon\'s Healing Touch', 'Wizard\'s Sidestep', 'Eyes of the Cat', 'Demon\'s Eternal Oblivion', 'Sense the Nature of Vis', 'Ward Against Heat and Flames']) {
      const s = data.spells.find((x) => x.name.toLowerCase() === name.toLowerCase() && x.source.book === 'DE');
      if (s && !known.has(s.name.toLowerCase())) out.push({ kind: 'spell', id: s.id, title: `${s.name} (${s.technique}${s.form} ${s.level ?? 'Gen'})`, reason: 'A widely useful spell many magi learn.', score: 2, group: 'Tip' });
    }
  }

  // ------------------------------------------------------------- Flaw guidance
  if (t !== 'grog' && d.tally.storyFlaws === 0) out.push({ kind: 'tip', title: 'Pick a Story Flaw', reason: 'Story Flaws tell the troupe what stories you want your character pulled into (e.g. Enemies, Dark Secret, Mentor, Close Family Ties).', score: 4, group: 'Rules' });
  if (d.tally.personalityFlaws === 0) out.push({ kind: 'tip', title: 'Pick a Personality Flaw', reason: 'A Major Personality Flaw should make the character act (e.g. Driven, Proud, Pious, Compassionate).', score: 3, group: 'Rules' });
  if (t === 'magus' && d.tally.hermeticFlaws === 0) {
    for (const id of ['deficient-form-flaw', 'difficult-spontaneous-magic-flaw', 'weak-spontaneous-magic-flaw', 'restriction-flaw', 'short-lived-magic-flaw', 'warped-magic-flaw']) {
      push({ kind: 'flaw', id, title: data.vfById.get(id)?.name ?? id, reason: 'Magi should take at least one Hermetic Flaw; this one is manageable if chosen carefully.', score: 4, group: 'Rules' });
    }
  }

  return out.sort((a, b) => b.score - a.score);
}
