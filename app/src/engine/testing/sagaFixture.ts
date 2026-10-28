// A populated saga for testing: generated magi with labs good and harsh, companions who keep other
// hours (a physician, a monk under a Rule, one who never sleeps), grogs and covenfolk bought with Build
// Points, a library, vis, an aura with Hooks and an alignment, a nearby abbey whose Dominion follows its
// congregation, and lab work in hand of every sort (invention by experiment and from Laboratory Texts,
// an item to prepare and enchant, a Longevity Ritual and a lapsed one, vis extraction, the lab itself
// improved). Seeded: the same seed gives the same saga. Used by the long-play test, and exported for
// the browser sweep by `npm run qa:saga`.

import type { GameData } from '../../data';
import { newSaga } from '../../store/store';
import { newEffect, newItem } from '../../ui/items/ItemEditor';
import { addVirtue } from '../character/factory';
import { newCovenant } from '../covenant';
import { generateCharacter } from '../generate/character';
import { fillCovenant } from '../generate/covenant';
import { seeded } from '../generate/random';
import { newLab } from '../lab';
import { newProject } from '../projects';
import { advanceSeasons, DEFAULT_ADVANCE, type SagaState } from '../time';
import { DEFAULT_HOUSE_RULES, type Character, type Covenant, type LabProject } from '../types';

export interface TestSagaOptions {
  seed: number;
  tribunal?: string;
  name?: string;
  /** seasons to play before handing it over */
  seasons?: number;
}

const ALIGNMENTS: NonNullable<Covenant['auraAlignment']>[] = [{ kind: 'art', art: 'Co' }, { kind: 'healing' }, { kind: 'art', art: 'Ig' }, { kind: 'emotion', text: 'Fearful' }];

export function buildTestSaga(data: GameData, o: TestSagaOptions): SagaState {
  const rules = DEFAULT_HOUSE_RULES;
  const saga = newSaga(o.name ?? `Test saga ${o.seed}`);
  saga.tribunal = o.tribunal ?? 'Rhine';
  saga.currentYear = 1220;
  saga.currentSeason = 'Spring';
  saga.options = { illness: true, labRoutines: true, originalResearch: true, rhineGilds: true, auraVariation: true };
  const g = { data, saga, rules };
  const chars: Character[] = [];
  const names: string[] = [];
  const mk = (x: Parameters<typeof generateCharacter>[0]) => {
    const r = generateCharacter({ ...x, avoidNames: names }, g);
    names.push(r.c.name);
    chars.push(r.c);
    return r.c;
  };
  const s = o.seed * 100;
  const magi = [0, 1, 2].map((i) => mk({ type: 'magus', variety: 'varied', npc: true, seed: s + i, spells: { maxLevel: 25 }, familiar: i !== 2, yearsPostGauntlet: 5 + 10 * i }));
  mk({ type: 'companion', role: 'physician', variety: 'varied', npc: true, seed: s + 11 });
  const monk = mk({ type: 'companion', variety: 'varied', npc: true, seed: s + 12 });
  addVirtue(monk, data, 'regular-flaw', 'Minor');
  const owl = mk({ type: 'companion', variety: 'varied', npc: true, seed: s + 13 });
  owl.seasons = { sleepless: true };

  let cov = newCovenant(saga.id, 1220);
  cov.name = 'Testhold';
  cov.aura = 5;
  cov.buildPoints = 500;
  cov.memberIds = chars.filter((c) => c !== monk).map((c) => c.id);
  magi.forEach((c, i) => {
    const lab = newLab(`${c.name}'s lab`, c.id);
    lab.refinement = 1;
    // the second lab is unsafe and warped, the third has Flaws that rule out work and halve Arts
    if (i === 1) lab.customMods = { Safety: -2, Warping: 2 };
    if (i === 2) lab.virtues = [{ uid: 'mx', defId: 'missing-equipment-flaw', alt: 'Longevity Rituals+Vis Extraction' }, { uid: 'cr', defId: 'cramped-flaw' }];
    cov.labs.push(lab);
  });
  cov.visSources = [{ uid: 'vs', name: 'Spring of Vim', art: 'Vi', pawnsPerYear: 6 }];
  cov.visStocks = [{ art: 'Cr', pawns: 20 }, { art: 'Co', pawns: 10 }, { art: 'Vi', pawns: 20 }];
  const hook = (name: string, kind: 'hook' | 'boon', size: 'Minor' | 'Major' = 'Minor') => {
    const def = data.hooksBoons.find((h) => h.name === name && h.kind === kind);
    cov.hooksBoons.push({ uid: `${kind}-${name}`, defId: def?.id, name, kind, size } as Covenant['hooksBoons'][number]);
  };
  hook('Flickering Aura', 'hook');
  hook('Weak Aura', 'hook');
  hook('Favorable Aura', 'boon');
  cov.auraAlignment = ALIGNMENTS[o.seed % ALIGNMENTS.length];
  const flawed = data.hooksBoons.find((h) => /flawed resource/i.test(h.name));
  if (flawed) cov.hooksBoons.push({ uid: 'fr', defId: flawed.id, name: flawed.name, kind: 'boon', size: 'Minor', earmark: ['specialist', 'book'] } as never);
  const fill = fillCovenant(cov, chars, g, {
    staff: true, teacher: true, goodTeacher: true, craftsmen: true, bookmakers: true, drill: true, soldiers: true, horses: true, gear: true, yearly: true, grogs: 4, counts: true, bought: true,
    library: { arts: true, abilities: true, labTexts: true, mundane: true }, rest: 'split', seed: o.seed,
  });
  cov = fill.cov;
  for (const gr of fill.grogs) {
    chars.push(gr.c);
    if (!cov.memberIds.includes(gr.c.id)) cov.memberIds.push(gr.c.id);
  }

  // the abbey nearby: a Dominion its congregation has kept for some years, where the monk lives
  const abbey = newCovenant(saga.id, 1205);
  abbey.name = 'St. Test Abbey';
  abbey.auraRealm = 'Divine';
  abbey.aura = 4;
  abbey.memberIds = [monk.id];
  abbey.auraTrack = { botchDice: 0, latent: 0, impinging: [], notes: [], dominion: { since: 1212, significant: true } };
  for (const c of chars) c.covenantId = c === monk ? abbey.id : cov.id;

  // lab work in hand
  const [m1, m2, m3] = magi;
  const known = (c: Character) => new Set(c.spells.map((x) => x.spellId));
  const spell = (level: number, not?: Set<string | undefined>) => data.spells.find((x) => x.level === level && !x.ritual && !x.general && !not?.has(x.id))!;
  const sp = spell(20, known(m1));
  const invent = { ...newProject('invent'), spell: sp, technique: sp.technique, form: sp.form, level: 20, name: `Invent ${sp.name}`, experiment: { risk: 1 } };
  // two spells of one Technique and Form from Laboratory Texts, learned in one season
  const low = data.spells.filter((x) => !!x.level && x.level <= 10 && !x.ritual && !x.general && !known(m1).has(x.id));
  // in the Technique and Form the magus knows best, of those with two such texts
  const xp = (a: string) => Object.values(m1.arts[a as keyof typeof m1.arts] ?? {}).reduce((t: number, n) => t + (Number(n) || 0), 0);
  const pairs = [...new Set(low.map((x) => x.technique + x.form))].filter((k) => low.filter((x) => x.technique + x.form === k).length >= 2);
  const arts = pairs.sort((a, b) => xp(b.slice(0, 2)) + xp(b.slice(2)) - xp(a.slice(0, 2)) - xp(a.slice(2)))[0];
  const pair = low.filter((x) => x.technique + x.form === arts).slice(0, 2);
  const texts: LabProject[] = pair.map((x) => ({ ...newProject('invent'), spell: x, technique: x.technique, form: x.form, level: x.level!, name: `Learn ${x.name}`, fromText: true }));
  if (texts.length === 2) texts[0].alongside = [texts[1].uid];
  m1.projects = [invent, ...texts];
  m1.standing = { kind: 'lab', projectUid: invent.uid };
  const staff = { ...newItem('invested'), name: 'Oak staff', material: 'wood', size: 'large' as const };
  const light = { ...newEffect(), name: 'Light of the staff', technique: 'Cr' as const, form: 'Ig' as const, modifiedLevel: 10, baseLevel: 10, pending: true };
  staff.effects.push(light);
  m2.items.push(staff);
  m2.projects = [{ ...newProject('open'), itemUid: staff.uid, name: 'Prepare Oak staff' }, { ...newProject('instill'), itemUid: staff.uid, effectUid: light.uid, name: 'Instill Light' }, { ...newProject('longevity'), experiment: { risk: 2 } }];
  m2.purse = { pounds: 5, vis: [{ art: 'Vi', pawns: 30 }, { art: 'Cr', pawns: 20 }, { art: 'Ig', pawns: 5 }] };
  m3.longevityLapsed = { labTotal: 35, bonus: 7, extraVis: 0, lapsedYear: 1219 };
  m3.longevity = undefined;
  // the third improves a lab its Flaws hold back: the Refinement, the Cramped Flaw put right, a Virtue
  const refine = { ...newProject('refine'), removeUid: 'cr' };
  m3.projects = [refine, { ...newProject('install'), labVirtue: { defId: 'superior-lighting' }, name: 'Install Superior Lighting' }, newProject('extract')];
  m3.standing = { kind: 'lab', projectUid: refine.uid };
  m3.purse = { pounds: 2, vis: [{ art: 'Cr', pawns: 8 }, { art: 'Co', pawns: 4 }, { art: 'Vi', pawns: 6 }] };

  const state: SagaState = { saga, characters: chars, covenants: [cov, abbey] };
  return o.seasons ? advanceSeasons(state, data, o.seasons, { ...DEFAULT_ADVANCE, rng: seeded(o.seed) }).state : state;
}
