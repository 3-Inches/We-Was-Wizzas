// Character-creation and sheet validation. Every rule cites where it comes from so
// players/storyguides can decide whether to follow it or acknowledge it as a house ruling.
//
// Severity:
//   error   – breaks a hard rule of the Definitive Edition ("may not", "must")
//   warning – breaks a guideline ("should") or is very likely a mistake
//   info    – reminders and suggestions

import { CHARACTERISTICS, CHAR_NAMES, STATUS_CULTURES, abilityTypeOf, type GameData } from '../../data';
import type { Character, HouseRules } from '../types';
import { canSpend, sumAlloc, type DerivedCharacter } from './derive';
import { creationSpellLimit } from '../magic';
import { HOUSE_BY_ID } from '../../data/houses';
import { vfProblems } from './restrictions';
import { hasFaerieVirtue } from './factory';

export type Severity = 'error' | 'warning' | 'info';
export type Step = 'basics' | 'house' | 'virtues' | 'characteristics' | 'abilities' | 'arts' | 'spells' | 'personality' | 'equipment' | 'sheet';

export interface Issue {
  id: string;
  severity: Severity;
  step: Step;
  message: string;
  ref?: string; // rules reference
  fix?: string;
}

export function validateCharacter(d: DerivedCharacter, data: GameData, rules: HouseRules): Issue[] {
  const c = d.char;
  const issues: Issue[] = [];
  const seenIds = new Set<string>();
  const add = (i: Issue) => {
    if (seenIds.has(i.id)) return;
    seenIds.add(i.id);
    if (!c.acknowledgedIssues.includes(i.id)) issues.push(i);
  };
  const t = d.tally;
  const type = c.type;
  const creating = !c.creation.finalized;

  // --------------------------------------------------------------- basics
  if (!c.name.trim()) add({ id: 'name', severity: 'warning', step: 'basics', message: 'The character has no name yet.' });
  if (type === 'magus' && !c.house) add({ id: 'house', severity: 'error', step: 'house', message: 'A Hermetic magus must belong to a House.', ref: 'DE p.43' });

  // --------------------------------------------------------------- Gift & status
  if (type === 'magus' && !d.hasGift) add({ id: 'magus-gift', severity: 'error', step: 'virtues', message: 'All magi must have The Gift.', ref: 'DE p.63', fix: 'Add The Gift (free).' });
  if (type === 'grog' && d.hasGift) add({ id: 'grog-gift', severity: 'error', step: 'virtues', message: 'Grogs may not have The Gift.', ref: 'DE p.63' });
  if (type === 'magus' && !c.virtues.some((v) => v.defId === 'hermetic-magus')) add({ id: 'magus-status', severity: 'error', step: 'virtues', message: 'Magi must take the Hermetic Magus Social Status.', ref: 'DE p.63', fix: 'Add Hermetic Magus (free).' });
  if (t.socialStatuses.length === 0) add({ id: 'status-none', severity: 'error', step: 'virtues', message: 'Every character must take one Social Status.', ref: 'DE p.63', fix: type === 'grog' ? 'Covenfolk is the usual choice.' : 'Covenfolk, Wanderer or a status fitting the concept.' });
  if (t.socialStatuses.length > 1) {
    const names = t.socialStatuses.map((s) => s.def?.name ?? '');
    const compatible = t.socialStatuses.every((s) => s.def?.text && t.socialStatuses.filter((o) => o !== s).every((o) => new RegExp(`compatible[^.]*${escapeRe(o.def?.name ?? '')}`, 'i').test(s.def!.text) || new RegExp(`compatible[^.]*${escapeRe(s.def?.name ?? '')}`, 'i').test(o.def?.text ?? '') || /Free/.test(o.cv.size)));
    add({ id: 'status-many', severity: compatible ? 'info' : 'warning', step: 'virtues', message: `More than one Social Status (${names.join(', ')}). Only allowed where the descriptions say they are compatible.`, ref: 'DE p.63' });
  }
  for (const s of t.socialStatuses) {
    const cultures = STATUS_CULTURES[s.def?.name ?? ''];
    if (cultures && !cultures.includes('All Cultures') && c.society && !cultures.includes(c.society)) {
      add({ id: `status-culture-${s.cv.uid}`, severity: 'info', step: 'virtues', message: `${s.name} is a ${cultures.join('/')} status; the character's society is ${c.society}.`, ref: 'DE p.64' });
    }
  }

  // --------------------------------------------------------------- point totals
  if (type === 'grog') {
    if (t.flawPoints > rules.grogMaxFlawPoints) add({ id: 'grog-flaws', severity: 'error', step: 'virtues', message: `Grogs may take at most ${rules.grogMaxFlawPoints} points of Flaws (have ${t.flawPoints}).`, ref: 'DE p.63' });
    if (t.personalityFlaws > 1) add({ id: 'grog-personality', severity: 'warning', step: 'virtues', message: 'Grogs should not take more than one Personality Flaw.', ref: 'DE p.63' });
  } else {
    if (t.flawPoints > rules.maxFlawPoints) add({ id: 'max-flaws', severity: 'error', step: 'virtues', message: `At most ${rules.maxFlawPoints} points of Flaws (have ${t.flawPoints}).`, ref: 'DE p.61' });
    if (t.minorFlaws > rules.maxMinorFlaws) add({ id: 'max-minor-flaws', severity: 'error', step: 'virtues', message: `No more than ${rules.maxMinorFlaws} Minor Flaws (have ${t.minorFlaws}).`, ref: 'DE p.61' });
  }
  if (t.virtuePoints > t.allowedVirtuePoints) {
    add({
      id: 'vf-balance', severity: 'error', step: 'virtues',
      message: `Virtues cost ${t.virtuePoints} points but Flaws only provide ${t.allowedVirtuePoints}.`,
      ref: type === 'mythic' ? 'DE p.63 (Mythic Companions: 2 Virtue points per Flaw point)' : 'DE p.61',
      fix: 'Remove Virtues or add Flaws.',
    });
  }
  if (t.virtuePoints < t.allowedVirtuePoints && creating) {
    add({ id: 'vf-unspent', severity: 'info', step: 'virtues', message: `${t.allowedVirtuePoints - t.virtuePoints} Virtue point(s) unspent. You do not have to take the maximum, but Flaws only earn Virtue points if used.` });
  }
  if (t.storyFlaws > rules.maxStoryFlaws) add({ id: 'story-flaws', severity: 'warning', step: 'virtues', message: `Characters should not have more than ${rules.maxStoryFlaws} Story Flaw (have ${t.storyFlaws}). Allowed with the whole troupe's agreement.`, ref: 'DE p.63' });
  if (t.majorPersonalityFlaws > 1) add({ id: 'major-personality', severity: 'error', step: 'virtues', message: 'A character may not have more than one Major Personality Flaw.', ref: 'DE p.63' });
  if (t.personalityFlaws > rules.maxPersonalityFlaws) add({ id: 'personality-flaws', severity: 'warning', step: 'virtues', message: `Characters should not have more than ${rules.maxPersonalityFlaws} Personality Flaws.`, ref: 'DE p.63' });
  const taintedMax = type === 'mythic' ? 10 : 5;
  if (t.taintedVirtuePoints > taintedMax) add({ id: 'tainted-v', severity: 'warning', step: 'virtues', message: `No more than ${taintedMax} points of Tainted Virtues.`, ref: 'DE p.66' });
  if (t.taintedFlawPoints > 5) add({ id: 'tainted-f', severity: 'warning', step: 'virtues', message: 'No more than 5 points of Tainted Flaws.', ref: 'DE p.66' });

  // --------------------------------------------------------------- magus specifics
  if (type === 'magus') {
    if (t.majorHermeticVirtues > rules.maxMajorHermeticVirtues) add({ id: 'major-hermetic', severity: 'error', step: 'virtues', message: `Magi may not have more than ${rules.maxMajorHermeticVirtues} Major Hermetic Virtue.`, ref: 'DE p.63' });
    if (t.hermeticFlaws === 0) add({ id: 'hermetic-flaw', severity: 'warning', step: 'virtues', message: 'Magi should take at least one Hermetic Flaw — nobody fits Hermetic theory perfectly.', ref: 'DE p.63' });
    const house = c.house ? HOUSE_BY_ID[c.house] : undefined;
    if (house && !house.exMiscellanea && !c.virtues.some((v) => v.free && v.freeReason === 'House Virtue')) add({ id: 'house-virtue', severity: 'warning', step: 'house', message: `Choose the free House Virtue for ${house.name}: ${house.benefitText}`, ref: 'DE p.44' });
    if (house?.exMiscellanea) {
      const pkg = c.virtues.filter((v) => v.freeReason === 'Ex Miscellanea');
      const hasMinor = pkg.some((v) => data.vfById.get(v.defId)?.categories.includes('Hermetic') && v.size === 'Minor' && data.vfById.get(v.defId)?.kind === 'virtue');
      const hasMajor = pkg.some((v) => !data.vfById.get(v.defId)?.categories.includes('Hermetic') && v.size === 'Major' && data.vfById.get(v.defId)?.kind === 'virtue');
      const hasFlaw = pkg.some((v) => data.vfById.get(v.defId)?.categories.includes('Hermetic') && v.size === 'Major' && data.vfById.get(v.defId)?.kind === 'flaw');
      if (!hasMinor || !hasMajor || !hasFlaw) add({ id: 'exmisc-package', severity: 'warning', step: 'house', message: 'Ex Miscellanea magi get a free Minor Hermetic Virtue, a free Major non-Hermetic Virtue, and a compulsory Major Hermetic Flaw.', ref: 'DE p.44' });
    }
    if (c.house === 'merinita' && (creating || c.seasonLog.length === 0)) {
      const faerie = hasFaerieVirtue(c, data);
      if (!faerie && c.warpingPoints < 1) add({ id: 'merinita-warping', severity: 'info', step: 'house', message: 'Merinita magi without a faerie-related Virtue or Flaw start with 1 Warping Point.', ref: 'DE p.44', fix: 'Set Warping Points to 1 on the sheet.' });
      if (faerie && c.warpingPoints === 1) add({ id: 'merinita-warping-faerie', severity: 'warning', step: 'house', message: 'This Merinita magus has a faerie-related Virtue or Flaw, so does not take the Warping Point the House gives to magi without one.', ref: 'DE p.44', fix: 'Set Warping Points to 0 (unless another rule gave the point).' });
    }
    if (c.house === 'bjornaer' && c.familiar) add({ id: 'bjornaer-familiar', severity: 'warning', step: 'sheet', message: 'Bjornaer magi cannot bind familiars.', ref: 'DE p.233' });
  }

  // --------------------------------------------------------------- mythic companions
  if (type === 'mythic') {
    const mc = d.virtues.filter((v) => v.def?.categories.includes('Mythic Companion'));
    if (mc.length === 0) add({ id: 'mythic-type', severity: 'error', step: 'virtues', message: 'Mythic Companions must take the Free Virtue defining their type (Devil Child, Faerie Doctor, Nephilim, Spirit Votary, or another agreed with the troupe).', ref: 'DE p.63' });
    if (mc.length > 1) add({ id: 'mythic-type-many', severity: 'error', step: 'virtues', message: 'Mythic Companion Virtues are incompatible with each other.', ref: 'DE p.55' });
    if (d.hasGift) add({ id: 'mythic-gift', severity: 'error', step: 'virtues', message: 'Mythic Companion Virtues are incompatible with The Gift.', ref: 'DE p.55' });
    const freeMinor = c.virtues.filter((v) => v.free && v.freeReason === 'Mythic Companion free Minor Virtue');
    if (freeMinor.length === 0) add({ id: 'mythic-free-minor', severity: 'info', step: 'virtues', message: 'Mythic Companions gain a free Minor Virtue, normally specified by their type.', ref: 'DE p.55' });
  }

  // --------------------------------------------------------------- per virtue checks
  const seen = new Map<string, number>();
  for (const v of d.virtues) {
    const def = v.def;
    if (!def) {
      add({ id: `unknown-${v.cv.uid}`, severity: 'warning', step: 'virtues', message: `Unknown Virtue/Flaw "${v.cv.defId}" (removed from data or custom content?).` });
      continue;
    }
    const key = `${def.id}|${v.cv.param ?? ''}`;
    seen.set(key, (seen.get(key) ?? 0) + 1);
    if (!def.sizes.includes(v.cv.size) && !v.cv.free) add({ id: `size-${v.cv.uid}`, severity: 'warning', step: 'virtues', message: `${def.name} is normally ${def.sizes.join(' or ')}, taken as ${v.cv.size}.` });
    if (def.param && !def.param.optional && !v.cv.param) add({ id: `param-${v.cv.uid}`, severity: 'warning', step: 'virtues', message: `${def.name}: choose the ${def.param.label}.` });
    for (const p of vfProblems(d, data, def, v.cv)) add({ id: p.id, severity: p.severity, step: 'virtues', message: p.message, ref: p.ref, fix: p.fix });
    if (!data.isBookEnabled(def.source.book)) add({ id: `book-${v.cv.uid}`, severity: 'info', step: 'virtues', message: `${def.name} comes from ${def.source.book}, which is not enabled for this saga.` });
    if (def.id === 'great-characteristic' && v.cv.param) {
      const base = c.characteristics[v.cv.param as keyof typeof c.characteristics];
      if (base !== undefined && base < 3) add({ id: `great-${v.cv.uid}`, severity: 'error', step: 'characteristics', message: `Great ${CHAR_NAMES[v.cv.param as keyof typeof CHAR_NAMES]} requires a purchased score of at least +3 (have ${base}).`, ref: 'DE p.83' });
    }
    if (def.id === 'poor-characteristic-flaw' && v.cv.param) {
      const base = c.characteristics[v.cv.param as keyof typeof c.characteristics];
      if (base !== undefined && base > -3) add({ id: `poorchar-${v.cv.uid}`, severity: 'error', step: 'characteristics', message: `Poor ${CHAR_NAMES[v.cv.param as keyof typeof CHAR_NAMES]} requires a purchased score of –3 or lower (have ${base}).`, ref: 'DE p.141' });
    }
  }
  for (const [key, count] of seen) {
    if (count > 1) {
      const def = data.vfById.get(key.split('|')[0]);
      if (def && !def.repeatable) add({ id: `dup-${key}`, severity: 'error', step: 'virtues', message: `${def.name} can only be taken once (unless its description says otherwise).`, ref: 'DE p.63' });
    }
  }

  // --------------------------------------------------------------- characteristics
  if (creating) {
    if (d.charPointsSpent > d.charPointsBudget) add({ id: 'char-over', severity: 'error', step: 'characteristics', message: `Characteristics cost ${d.charPointsSpent} points; only ${d.charPointsBudget} available.`, ref: 'DE p.48' });
    else if (d.charPointsSpent < d.charPointsBudget) add({ id: 'char-under', severity: 'info', step: 'characteristics', message: `${d.charPointsBudget - d.charPointsSpent} Characteristic point(s) unspent.` });
    for (const ch of CHARACTERISTICS) {
      const b = c.characteristics[ch];
      if (b > 3 || b < -3) add({ id: `char-range-${ch}`, severity: 'error', step: 'characteristics', message: `${CHAR_NAMES[ch]} must be bought between –3 and +3 (use Great/Poor Characteristic to go beyond).`, ref: 'DE p.48' });
    }
    if (type === 'magus') {
      if (c.characteristics.Int < 1) add({ id: 'magus-int', severity: 'info', step: 'characteristics', message: 'Intelligence is central to laboratory work; magi should seriously consider a positive score.', ref: 'DE p.48' });
      if (c.characteristics.Sta < 0) add({ id: 'magus-sta', severity: 'info', step: 'characteristics', message: 'Stamina is important for spellcasting; a negative score is best avoided.', ref: 'DE p.48' });
    }
  }

  // --------------------------------------------------------------- xp budgets
  if (creating) {
    for (const b of d.budgets) {
      if (b.spent > b.total) add({ id: `budget-${b.id}`, severity: 'error', step: b.id === 'apprenticeship' || b.id === 'postGauntlet' ? 'arts' : 'abilities', message: `${b.label}: spent ${b.spent} of ${b.total} experience points.` });
      else if (b.total - b.spent > 0 && b.id !== 'native') add({ id: `budget-left-${b.id}`, severity: 'info', step: b.id === 'apprenticeship' || b.id === 'postGauntlet' ? 'arts' : 'abilities', message: `${b.label}: ${b.total - b.spent} experience points unspent.` });
      if (b.spellLevels && b.spellLevels.spent > b.spellLevels.total) add({ id: `spell-levels-${b.id}`, severity: 'error', step: 'spells', message: `Apprenticeship spells total ${b.spellLevels.spent} levels; limit is ${b.spellLevels.total}.`, ref: 'DE p.49' });
    }
  }
  // Allocation legality: xp spent at creation stays checked after play starts
  {
    for (const ab of c.abilities) {
      const da = d.abilityByUid.get(ab.uid);
      for (const [src, xp] of Object.entries(ab.xp)) {
        if (!xp || src === 'play' || src === 'adjust' || src === 'free') continue;
        const b = d.budgets.find((x) => x.id === src);
        if (!b) {
          add({ id: `orphan-${ab.uid}-${src}`, severity: 'warning', step: 'abilities', message: `${da?.name}: ${xp} xp assigned to a pool that no longer exists (${src}).`, fix: 'Move the experience to another pool.' });
          continue;
        }
        const ok = canSpend(d, data, b, ab);
        if (!ok.ok) add({ id: `illegal-${ab.uid}-${src}`, severity: 'error', step: 'abilities', message: `${da?.name}: ${ok.reason} (${b.label}).` });
      }
      if (creating && da && rules.enforceAbilityAgeCap && da.score > da.cap && !c.virtues.some((v) => v.defId === 'mentored-by-demons')) {
        add({ id: `cap-${ab.uid}`, severity: 'error', step: 'abilities', message: `${da.name} ${da.score} exceeds the age-based maximum of ${da.cap} at character creation.`, ref: 'DE p.48' });
      }
      if (creating && da?.type === 'Academic' && !ab.abilityId.includes('language') && !c.abilities.some((x) => (x.abilityId === 'dead-language' && /latin|greek|hebrew|arabic/i.test(x.param ?? '')) && (d.abilityByUid.get(x.uid)?.score ?? 0) >= 3)) {
        if (da.score > 0) add({ id: `academic-lang-${ab.uid}`, severity: 'info', step: 'abilities', message: `Learning ${da.name} normally requires Latin, Greek, Hebrew, or Arabic of at least 3.`, ref: 'DE p.158' });
      }
    }
    for (const art of Object.keys(c.arts)) {
      for (const [src, xp] of Object.entries(c.arts[art as keyof typeof c.arts] ?? {})) {
        if (!xp) continue;
        if (!['apprenticeship', 'postGauntlet', 'play', 'adjust', 'free'].includes(src) && !src.startsWith('pool:')) add({ id: `art-src-${art}-${src}`, severity: 'error', step: 'arts', message: `Arts can only be bought during and after apprenticeship (${art} has ${xp} xp from ${src}).` });
      }
    }
    const native = c.abilities.filter((a) => a.native);
    if (creating && native.length === 0) add({ id: 'native-lang', severity: 'warning', step: 'abilities', message: 'Choose a native language (75 xp, normally score 5).', ref: 'DE p.48' });
  }

  // magus minimum abilities
  if (type === 'magus') {
    const sc = (id: string, lang?: string) => {
      const a = c.abilities.find((x) => x.abilityId === id && (!lang || (x.param ?? '').toLowerCase() === lang));
      return a ? d.abilityByUid.get(a.uid)?.score ?? 0 : 0;
    };
    const latin = sc('dead-language', 'latin');
    if (sc('parma-magica') < 1) add({ id: 'min-parma', severity: 'error', step: 'abilities', message: 'Magi must have Parma Magica 1 or they would not be admitted to the Order.', ref: 'DE p.49' });
    if (sc('magic-theory') < 1) add({ id: 'min-mt', severity: 'error', step: 'abilities', message: 'Magi must have Magic Theory 1.', ref: 'DE p.49' });
    if (latin < 1) add({ id: 'min-latin', severity: 'error', step: 'abilities', message: 'Magi must have Latin 1.', ref: 'DE p.49' });
    if (latin >= 1 && latin < 4) add({ id: 'rec-latin', severity: 'warning', step: 'abilities', message: 'Without Latin 4 (and Artes Liberales 1) the magus cannot read the books of the Order.', ref: 'DE p.49' });
    if (latin === 4) add({ id: 'rec-latin5', severity: 'info', step: 'abilities', message: 'Latin below 5 means the magus cannot write books.', ref: 'DE p.49' });
    if (sc('artes-liberales') < 1) add({ id: 'rec-al', severity: 'warning', step: 'abilities', message: 'Artes Liberales 1 is needed to read (and for Ritual casting).', ref: 'DE p.49' });
    const mt = sc('magic-theory');
    if (mt >= 1 && mt < 3) add({ id: 'rec-mt', severity: 'warning', step: 'abilities', message: 'Magic Theory below 3 is weak, and the magus cannot set up a laboratory.', ref: 'DE p.49' });
    if (sc('parma-magica') > 1 && c.creation.yearsPostGauntlet === 0) add({ id: 'parma-high', severity: 'info', step: 'abilities', message: 'Very few magi have Parma Magica above 1 just out of apprenticeship.', ref: 'DE p.49' });
    // spell limits
    for (const s of c.spells) {
      if (s.source !== 'apprenticeship' && s.source !== 'postGauntlet') continue;
      const lim = creationSpellLimit(d, { technique: s.spell.technique, form: s.spell.form, requisites: s.spell.requisites }, rules.spellLevelLimitBonus, !!s.notes?.includes('[focus]'));
      if ((s.spell.level ?? 0) > lim.total) add({ id: `spell-limit-${s.uid}`, severity: 'error', step: 'spells', message: `${s.spell.name} (level ${s.spell.level}) exceeds the maximum ${lim.total} for ${s.spell.technique}${s.spell.form} (Te + Fo + Int + Magic Theory + ${rules.spellLevelLimitBonus}).`, ref: 'DE p.49' });
    }
  }

  // mastery pools
  for (const mp of d.masteryPools) {
    const spent = c.spells.reduce((s, sp) => s + (sp.masteryXp[`pool:${mp.uid}`] ?? 0), 0);
    if (spent > mp.total) add({ id: `mastery-pool-${mp.uid}`, severity: 'error', step: 'spells', message: `${mp.label}: ${spent} of ${mp.total} mastery xp spent.` });
  }

  // --------------------------------------------------------------- personality & misc
  for (const v of d.virtues) {
    if (v.def?.categories.includes('Personality') && v.def.kind === 'flaw') {
      const need = v.cv.size === 'Major' ? 6 : 3;
      if (!c.personality.some((p) => Math.abs(p.score) >= need)) add({ id: `ptrait-${v.cv.uid}`, severity: 'info', step: 'personality', message: `${v.name}: represent it with a Personality Trait of ±${need}.`, ref: 'DE p.52' });
    }
  }
  if (type === 'grog' && !c.personality.some((p) => /loyal/i.test(p.trait))) add({ id: 'grog-loyal', severity: 'info', step: 'personality', message: 'Grogs should all have a score in Loyal.', ref: 'DE p.52' });
  const warrior = c.abilities.some((a) => abilityTypeOf(data, a.abilityId) === 'Martial' && sumAlloc(a.xp) > 0);
  if (warrior && !c.personality.some((p) => /brave|cowardly/i.test(p.trait))) add({ id: 'warrior-brave', severity: 'info', step: 'personality', message: 'Warriors should all have a score in Brave.', ref: 'DE p.52' });
  for (const p of c.personality) if (Math.abs(p.score) > 3 && !d.virtues.some((v) => v.def?.categories.includes('Personality'))) add({ id: `ptrait-range-${p.uid}`, severity: 'info', step: 'personality', message: `${p.trait}: starting Personality Traits range from –3 to +3 unless a Personality Flaw justifies more.` });
  if (c.age > 35 && creating) add({ id: 'aging', severity: 'info', step: 'basics', message: 'Characters older than 35 must make aging rolls for each year from 35 before play (use the Aging tool on the sheet).', ref: 'DE p.50' });

  return issues;
}

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function summarize(issues: Issue[]) {
  return {
    errors: issues.filter((i) => i.severity === 'error').length,
    warnings: issues.filter((i) => i.severity === 'warning').length,
    infos: issues.filter((i) => i.severity === 'info').length,
  };
}

export type { Character };
