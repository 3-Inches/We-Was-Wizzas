// What a tutorial can do for the player when asked: the heavy lifting the toolkit already knows how
// to do, run on the saga, character or covenant the tutorial is following. Each goes through the
// store, so it can be undone like any other change. Loaded with the tutorial panel only.

import { applyBaseCovenant, newCovenant } from '../../engine/covenant';
import { addVirtue, newCharacter } from '../../engine/character/factory';
import { generateCharacter } from '../../engine/generate/character';
import { sumAlloc } from '../../engine/character/derive';
import { newWorkshop } from '../../engine/workshop';
import { newSeed } from '../../engine/generate/random';
import type { Character, Covenant, Saga } from '../../engine/types';
import { fillCovenant } from '../../engine/generate/covenant';
import { CRAFTS, countOf } from '../../engine/covenantRules';
import { craftsmanUpkeep, laborPointsPerSeason, suggestedGuildRank, workSeasons } from '../../engine/covenfolk';
import { optionOn } from '../../engine/optional';
import { uid } from '../../util/id';
import { newLab } from '../../engine/lab';
import { gameDataFor } from '../../store/hooks';
import { useStore } from '../../store/store';
import { buildWholeCharacter } from '../character/buildWhole';
import { tourNeeds, type Tour, type TourActionId, type TourCtx } from './tours';

export interface ActionResult {
  /** what was done, for the notice */
  notice: string;
  /** the title of the tutorial step to go on to */
  goto?: string;
}

/** Build a whole draft of the character from its concept themes and any guided-build answers. */
function buildDraft(c: TourCtx): ActionResult | undefined {
  const r = c.charId ? buildWholeCharacter(c.charId) : undefined;
  return r && { notice: r.notice, goto: 'Review and finalize' };
}

function basePackage(c: TourCtx): ActionResult | undefined {
  const st = useStore.getState();
  if (!c.covId || !st.covenants[c.covId]) return undefined;
  st.updateCovenant(c.covId, (x) => applyBaseCovenant(x, 'Medium'));
  return { notice: 'Applied the Medium package: 800 Build Points, a starting library, lab texts and vis, their subjects still to choose.' };
}

function standardLabs(c: TourCtx): ActionResult | undefined {
  const st = useStore.getState();
  const cov = c.covId ? st.covenants[c.covId] : undefined;
  if (!cov) return undefined;
  const magi = cov.memberIds.map((id) => st.characters[id]).filter((m) => m?.type === 'magus' && !cov.labs.some((l) => l.ownerId === m.id));
  if (!magi.length) return { notice: 'Every member magus already has a laboratory.' };
  st.updateCovenant(cov.id, (x) => void x.labs.push(...magi.map((m) => newLab(`${m.name || 'Magus'}'s laboratory`, m.id))));
  return { notice: `Gave ${magi.length} ${magi.length > 1 ? 'magi' : 'magus'} a standard laboratory.` };
}

export const ACTIONS: Record<TourActionId, (c: TourCtx) => ActionResult | undefined> = { buildDraft, basePackage, standardLabs };

/**
 * Covenfolk for a practice covenant (the City & Guild tutorial's): three grogs, servants and laborers
 * at what it needs, craftsmen where they save money (a carpenter and a smith at the least), each
 * with a guild rank under the guild rules and a year's Labor Points banked, and 50 £ in the treasury,
 * bought as a starting reserve. All but the reserve are recruited in play, at no Build Points.
 */
function practiceFolk(cov0: Covenant, saga: Saga, inSaga: Character[]): { cov: Covenant; grogs: Character[]; text: string } {
  const data = gameDataFor(saga);
  const r = fillCovenant(cov0, inSaga, { data, saga, rules: saga.houseRules }, { staff: false, teacher: false, craftsmen: true, grogs: 3, counts: true, bought: false, seed: newSeed() });
  const cov = r.cov;
  const grogs = r.grogs.map((g) => ({ ...g.c, notes: [g.c.notes, PRACTICE_NOTE].filter(Boolean).join('\n') }));
  for (const g of grogs) if (!cov.memberIds.includes(g.id)) cov.memberIds.push(g.id);
  // a carpenter and a smith at the least, so the tutorial has craftsmen to show; at Dexterity + Craft 7
  // an average craftsman's two seasons (42) pay the 36 upkeep with 6 to save each year
  for (const id of ['carpenter', 'blacksmith']) {
    if (cov.specialists.some((x) => x.role === 'craftsman' && x.craft === id)) continue;
    const k = CRAFTS.find((c) => c.id === id)!;
    cov.specialists.push({ uid: uid(), name: k.name, role: 'craftsman', ability: `Craft (${k.name})`, craft: k.id, rare: k.rare, score: 6, age: 38, count: 1, free: true, abilities: [{ id: 'craft-type', param: k.name, score: 6 }], chars: { Dex: 1 } });
  }
  const guilds = optionOn(saga, 'guilds');
  for (const x of cov.specialists.filter((y) => y.role === 'craftsman')) {
    if (guilds && !x.guildRank) x.guildRank = suggestedGuildRank(x.age, x.score);
    // a year's work banked, so the buttons that spend it have something to spend
    if (!x.workshop?.laborPoints) x.workshop = { innovation: x.workshop?.innovation ?? 0, rawMaterials: x.workshop?.rawMaterials ?? 0, laborPoints: Math.max(60, laborPointsPerSeason(x) * workSeasons(x).work - craftsmanUpkeep(x)) };
  }
  if (cov.finances.treasury < 50) {
    cov.finances.startingReserve = (cov.finances.startingReserve ?? 0) + (50 - cov.finances.treasury);
    cov.finances.treasury = 50;
  }
  const crafts = cov.specialists.filter((y) => y.role === 'craftsman').map((y) => `${countOf(y) > 1 ? `${countOf(y)} ` : ''}${y.name.toLowerCase()}${countOf(y) > 1 ? 's' : ''}`);
  return { cov, grogs, text: `its people (${grogs.length} grogs, ${crafts.join(', ')}, servants and laborers) and 50 £ in the treasury` };
}

/** The note that marks what a tutorial made for practice. */
export const PRACTICE_NOTE = 'Made for practice by a tutorial.';
const isPractice = (x: { notes?: string } | undefined) => !!x && (x.notes ?? '').includes(PRACTICE_NOTE);
/** A covenant a tutorial made for practice (an older version named it so, without the note). */
export const isPracticeCovenant = (x: { notes?: string; name?: string } | undefined) => isPractice(x) || x?.name === 'Practice covenant';

/**
 * What a tutorial needs to work on, made for practice: the saga if none is open, a practice covenant
 * (the Medium package), and the tutorial's practice character (a finished one from Quick build, with
 * a laboratory for a magus, or a blank draft). Practice things stay apart from the troupe's own: a
 * practice character joins the practice covenant, never the troupe's, and one already made for this
 * tutorial is used again rather than made twice. One Undo takes it all back.
 */
export function makePractice(tour: Tour, c: TourCtx, what: { character?: boolean; covenant?: boolean } = tourNeeds(tour)): { sagaId: string; charId?: string; covId?: string; notice: string } {
  const st = useStore.getState();
  const saga = (c.sagaId ? st.sagas[c.sagaId] : undefined) ?? st.createSaga('Practice saga');
  const made: string[] = [];
  const reused: string[] = [];
  let movedFrom = '';
  const p = tour.practice;
  const wantsChar = !!what.character && !!p;
  const inSaga = Object.values(st.covenants).filter((x) => x.sagaId === saga.id && !x.living);
  const tag = `${PRACTICE_NOTE} (${tour.title})`;
  // the practice covenant: the one chosen if it is a practice one, else one made for practice before, else a new one when wanted
  const chosen = c.covId ? st.covenants[c.covId] : undefined;
  const earlier = (isPracticeCovenant(chosen) ? chosen : undefined) ?? inSaga.find(isPracticeCovenant);
  let cov: Covenant | undefined = earlier ? structuredClone(earlier) : undefined;
  if (!cov && (what.covenant || (wantsChar && !p!.draft))) {
    cov = newCovenant(saga.id, saga.currentYear);
    cov.name = 'Practice covenant';
    cov.notes = PRACTICE_NOTE;
    applyBaseCovenant(cov, 'Medium');
    made.push('a practice covenant (the Medium package)');
  } else if (cov && what.covenant) reused.push(`${cov.name || 'the practice covenant'}, made for practice before`);
  // people for the tutorial to work with: grogs to send to market, covenfolk and craftsmen with Labor
  // Points to spend, and silver in the treasury, all recruited in play (no Build Points)
  const extra: Character[] = [];
  if (cov && p?.folk && !cov.specialists.some((x) => x.role === 'craftsman')) {
    const folk = practiceFolk(cov, saga, Object.values(st.characters).filter((x) => x.sagaId === saga.id));
    cov = folk.cov;
    extra.push(...folk.grogs);
    made.push(folk.text);
  }
  let ch: Character | undefined;
  let moved: Covenant | undefined;
  // the practice character this tutorial made before, if it is still about, else a new one
  const before = wantsChar ? Object.values(st.characters).find((x) => x.sagaId === saga.id && (x.notes ?? '').includes(tag) && !x.wounds.dead) : undefined;
  // with a covenant asked for, the practice character the tutorial is working on comes along to it
  const current = c.charId ? st.characters[c.charId] : undefined;
  const bring = before ?? (what.covenant && isPractice(current) ? current : undefined);
  if (bring) {
    ch = structuredClone(bring);
    if (wantsChar) reused.push(`${ch.name}, the ${p!.label.replace(/^an? /, '')} made before`);
  } else if (wantsChar) {
    const names = Object.values(st.characters).filter((x) => x.sagaId === saga.id).map((x) => x.name);
    if (p!.draft) {
      ch = newCharacter(p!.type, saga.id, saga.currentYear);
      ch.name = `Practice ${p!.type}`;
    } else {
      ch = generateCharacter({ type: p!.type, role: p!.role, answers: p!.answers, variety: 'focused', npc: false, finished: true, seed: newSeed(), avoidNames: names }, { data: gameDataFor(saga), saga, rules: saga.houseRules, covenant: cov }).c;
      // what the tutorial is about, if the build spent its points elsewhere: given for practice, at no cost
      for (const id of p!.ensure ?? []) {
        if (!ch.virtues.some((v) => v.defId === id)) addVirtue(ch, gameDataFor(saga), id, undefined, undefined, { free: true, freeReason: 'For practice' });
      }
    }
    ch.notes = [ch.notes, tag].filter(Boolean).join('\n');
    // a craftsman's livelihood tracked from the start, for the tutorial to show
    // their trade: the Craft (or Profession) they are best at
    const trade = ch.abilities.filter((a) => a.abilityId === 'craft-type' || a.abilityId === 'profession-type').sort((a, b) => sumAlloc(b.xp) - sumAlloc(a.xp))[0];
    if (p!.role === 'master-craftsman' && trade && !ch.workshop) {
      ch.workshop = newWorkshop(trade.uid, trade.abilityId === 'profession-type');
      // worked with the better of Dexterity and Strength (Strength for a smith or a mason)
      if (ch.characteristics.Str > ch.characteristics.Dex) ch.workshop.primary = 'Str';
    }
    made.unshift(`${p!.label}, ${ch.name}`);
  }
  if (ch && cov && ch.covenantId !== cov.id) {
    // out of any other covenant it was put in (a troupe's own, by an older version), with its laboratory
    const old = ch.covenantId ? st.covenants[ch.covenantId] : undefined;
    if (old && old.id !== cov.id) {
      moved = structuredClone(old);
      moved.memberIds = moved.memberIds.filter((id) => id !== ch!.id);
      const lab = moved.labs.find((l) => l.ownerId === ch!.id);
      if (lab) {
        moved.labs = moved.labs.filter((l) => l !== lab);
        cov.labs.push(lab);
      }
      movedFrom = `${ch.name} moved to ${cov.name || 'the practice covenant'} from ${old.name || 'the other covenant'}`;
    }
    ch.covenantId = cov.id;
    if (!cov.memberIds.includes(ch.id)) cov.memberIds.push(ch.id);
  }
  if (ch && cov && ch.type === 'magus' && !cov.labs.some((l) => l.ownerId === ch!.id)) cov.labs.push(newLab(`${ch.name || 'Magus'}'s laboratory`, ch.id));
  if (ch || cov) st.putRecords({ characters: [...(ch ? [ch] : []), ...extra], covenants: [cov, moved].filter((x): x is Covenant => !!x) }, `Practice for ${tour.title}`);
  return {
    sagaId: saga.id, charId: ch?.id, covId: cov?.id,
    notice:
      made.length || reused.length || movedFrom
        ? `${[made.length ? `Made ${made.join(' and ')}` : '', reused.length ? `Using ${reused.join(' and ')}` : '', movedFrom].filter(Boolean).join('; ')}, in ${saga.name}. Your own covenant and characters are left as they are; Undo takes this back.`
        : `Working in ${saga.name}.`,
  };
}
