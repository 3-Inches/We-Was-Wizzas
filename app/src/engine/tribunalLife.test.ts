// The Tribunal's life (Guardians of the Forests): votes and sigils at a gathering, promotions,
// certamen, apprentices brought to the Gauntlet, the wanderers, and magi enchanting items.
import { describe, expect, it } from 'vitest';
import { buildGameData } from '../data';
import { RHINE } from '../data/livingCovenants/rhine';
import { newSaga } from '../store/store';
import { deriveCharacter } from './character/derive';
import { characterContext } from './context';
import { newCovenant } from './covenant';
import { generateCharacter } from './generate/character';
import { seeded } from './generate/random';
import { newLab } from './lab';
import { buildLivingCovenant } from './living';
import { choosePriority } from './priorities';
import { advanceSeasons, DEFAULT_ADVANCE } from './time';
import { apprenticesYearEnd, certamenDuel, gatheringVoters, motionsDue, sigilsOf, voteOn, welcomeWanderer, wanderersSeasonStart, wanderersYearEnd } from './tribunalLife';
import { DEFAULT_HOUSE_RULES, type Character, type Covenant } from './types';
import { addVis, purseOf } from './vis';

const data = buildGameData();
const rules = DEFAULT_HOUSE_RULES;
const def = (id: string) => RHINE.covenants.find((c) => c.id === id)!;
const sagaAt = (year = 1220, season: 'Spring' | 'Summer' | 'Autumn' | 'Winter' = 'Spring', customs = true) => {
  const s = newSaga('Living');
  s.tribunal = 'Rhine';
  s.currentYear = year;
  s.currentSeason = season;
  s.options = { rhineGilds: customs };
  return s;
};
const build = (ids: string[], saga = sagaAt()) => {
  const covenants: Covenant[] = [];
  const characters: Character[] = [];
  for (const id of ids) {
    const b = buildLivingCovenant(RHINE, def(id), { data, saga, rules }, { seed: 3, others: false, avoidNames: characters.map((c) => c.name) });
    covenants.push(b.cov);
    characters.push(...b.chars);
  }
  return { saga, covenants, characters };
};
const named = (cs: Character[], name: string) => cs.find((c) => c.name === name)!;

describe('sigils and votes at a gathering', () => {
  const s = build(['durenmar', 'fengheld', 'roznov', 'waddenzee', 'triamore', 'heorot']);
  const voters = gatheringVoters(RHINE, s.characters, s.covenants);
  const voter = (name: string) => voters.find((v) => v.c.name === name);

  it('gives each rank its sigils: a journeyman one, a master two, an archmage three', () => {
    expect(voter('Murion')?.sigils).toBe(3);
    expect(voter('Stentorius')?.sigils).toBe(3);
    expect(voter('Severicus')?.sigils).toBe(2);
    expect(voter('Sicero')?.sigils).toBe(1);
    // with the Rhine's customs off, one each
    expect(sigilsOf(named(s.characters, 'Murion'), false)).toBe(1);
  });

  it('has House Tremere’s exarchs cast the sigils of the House’s other magi', () => {
    const stentorius = named(s.characters, 'Stentorius').id;
    const severicus = named(s.characters, 'Severicus').id;
    expect(voter('Daria la Gris')?.heldBy).toBe(stentorius);
    expect(voter('Sicero')?.heldBy).toBe(stentorius);
    expect(voter('Clemens')?.heldBy).toBe(stentorius);
    expect(voter('Hygwald Veritas')?.heldBy).toBe(severicus);
    expect(voter('Stentorius')?.heldBy).toBeUndefined();
    expect(voter('Severicus')?.heldBy).toBeUndefined();
  });

  it('leaves Heorot’s magi without sigils until the Tribunal admits it', () => {
    const heorot = s.covenants.find((c) => c.living?.key === 'heorot')!;
    expect(voters.some((v) => v.cov?.id === heorot.id)).toBe(false);
    const after = gatheringVoters(RHINE, s.characters, s.covenants, [{ uid: 'v', motionId: 'heorot', year: 1221, title: '', for: 30, against: 2, abstain: 0, passed: true, byCovenant: {} }]);
    expect(after.some((v) => v.cov?.id === heorot.id)).toBe(true);
  });

  it('brings the book’s motions to their gatherings, and a defeated one back now and then', () => {
    expect(motionsDue(RHINE, [], 1221, () => 0.99).map((m) => m.id)).toEqual(['heorot', 'praeco']);
    expect(motionsDue(RHINE, [], 1228, () => 0.99).map((m) => m.id)).toEqual(['ruegen', 'lotharingia']);
    const lost = { uid: 'v', motionId: 'heorot', year: 1221, title: '', for: 2, against: 30, abstain: 0, passed: false, byCovenant: {} };
    expect(motionsDue(RHINE, [lost], 1228, () => 0).map((m) => m.id)).toContain('heorot');
    expect(motionsDue(RHINE, [{ ...lost, passed: true }], 1228, () => 0).map((m) => m.id)).not.toContain('heorot');
  });

  it('counts each covenant’s and gild’s stand, a held sigil with its holder, and the players’ magi as the troupe sets them', () => {
    const saga = sagaAt(1221);
    const ours = newCovenant(saga.id, 1220);
    const pc = generateCharacter({ type: 'magus', house: 'jerbiton', seed: 9, yearsPostGauntlet: 3, variety: 'focused', npc: false }, { data, saga, rules }).c;
    ours.memberIds = [pc.id];
    pc.covenantId = ours.id;
    const vs = gatheringVoters(RHINE, [...s.characters, pc], [...s.covenants, ours]);
    const m = RHINE.motions!.find((x) => x.id === 'praeco')!;
    saga.playerVotes = { praeco: { [pc.id]: 'for' } };
    const v = voteOn(m, vs, saga, 1221, seeded(4));
    expect(v.for + v.against + v.abstain).toBe(vs.reduce((t, x) => t + x.sigils, 0));
    const durenmar = s.covenants.find((c) => c.living?.key === 'durenmar')!;
    const fengheld = s.covenants.find((c) => c.living?.key === 'fengheld')!;
    // Durenmar stands against (bar the odd magus going their own way), Fengheld for
    expect(v.byCovenant[durenmar.id].against).toBeGreaterThan(v.byCovenant[durenmar.id].for);
    expect(v.byCovenant[fengheld.id].for).toBeGreaterThan(v.byCovenant[fengheld.id].against);
    expect(v.byCovenant[ours.id]).toEqual({ for: 1, against: 0 });
  });
});

describe('the gathering of 1221, played', () => {
  it('votes on the book’s motions in Spring, at Durenmar, and records the sigils', () => {
    const s = build(['durenmar', 'fengheld', 'oculus-septentrionalis', 'crintera', 'heorot'], sagaAt(1221, 'Spring'));
    const ours = newCovenant(s.saga.id, 1220);
    const r = advanceSeasons({ saga: s.saga, characters: s.characters, covenants: [ours, ...s.covenants] }, data, 1, { ...DEFAULT_ADVANCE, rollAging: false, rng: seeded(11) });
    const votes = r.state.saga.tribunalVotes ?? [];
    expect(votes.map((v) => v.motionId).sort()).toEqual(['heorot', 'praeco']);
    const news = r.state.saga.tribunalNews ?? [];
    expect(news.filter((n) => n.kind === 'vote')).toHaveLength(2);
    expect(news.find((n) => n.kind === 'vote')?.text).toMatch(/sigils? for to \d+ against/);
    expect(r.reports[0].lines.filter((l) => /^The Rhine Tribunal$/.test(l.who ?? '')).every((l) => l.tribunal)).toBe(true);
  });
});

describe('certamen', () => {
  it('plays a duel out to a winner, the stronger magus winning most of the time', () => {
    const saga = sagaAt();
    const strong = generateCharacter({ type: 'magus', house: 'tremere', seed: 1, yearsPostGauntlet: 60, variety: 'focused', npc: true }, { data, saga, rules }).c;
    const weak = generateCharacter({ type: 'magus', house: 'jerbiton', seed: 2, yearsPostGauntlet: 0, variety: 'focused', npc: true }, { data, saga, rules }).c;
    const ds = deriveCharacter(strong, data, rules);
    const dw = deriveCharacter(weak, data, rules);
    let wins = 0;
    for (let i = 0; i < 20; i++) {
      const r = certamenDuel(weak, dw, strong, ds, seeded(100 + i));
      expect([r.winner, r.loser].sort((a, b) => a.id.localeCompare(b.id))).toEqual([strong, weak].sort((a, b) => a.id.localeCompare(b.id)));
      expect(r.rounds).toBeGreaterThan(0);
      if (r.winner === strong) wins++;
    }
    expect(wins).toBeGreaterThanOrEqual(15);
  });
});

describe('apprentices', () => {
  it('has a master take an apprentice, and the apprentice pass the Gauntlet after fifteen years', () => {
    const s = build(['triamore'], sagaAt(1220, 'Winter'));
    const cov = s.covenants[0];
    const daria = named(s.characters, 'Daria la Gris');
    // no chance at all: nobody takes one
    expect(apprenticesYearEnd({ ...s }, { data, saga: s.saga, rules }, 1220, () => 0.99).news).toHaveLength(0);
    // every chance: the masters take one each, and teach them from their lists
    const r = apprenticesYearEnd({ ...s }, { data, saga: s.saga, rules }, 1220, () => 0.01);
    expect(daria.apprentice).toMatchObject({ since: 1221, seasons: 0 });
    expect(daria.priorities?.some((p) => p.kind === 'apprentice')).toBe(true);
    expect(r.news.some((n) => n.kind === 'apprentice' && n.characterId === daria.id)).toBe(true);
    // a journeyman does not, under the Rhine's customs
    expect(named(s.characters, 'Sicero').apprentice).toBeUndefined();
    // fifteen years on
    daria.apprentice!.since = 1205;
    const before = s.characters.length;
    const g = apprenticesYearEnd({ ...s }, { data, saga: s.saga, rules }, 1219, () => 0.99);
    expect(daria.apprentice).toBeUndefined();
    expect(s.characters.length).toBe(before + 1);
    const fresh = s.characters[s.characters.length - 1];
    expect(fresh.type).toBe('magus');
    expect(fresh.house).toBe('tremere');
    expect(fresh.rhine?.rank).toBe('journeyman');
    expect(fresh.covenantId ? [cov.id, fresh.covenantId].includes(cov.id) : false).toBe(true);
    expect(g.news[0].text).toMatch(/passes the Gauntlet/);
  });
});

describe('the wanderers', () => {
  it('builds Felicia at Fengheld and Tabanus at Triamore, as guests with laboratories of their own', () => {
    const s = build(['fengheld', 'triamore']);
    const felicia = named(s.characters, 'Felicia');
    const tabanus = named(s.characters, 'Tabanus');
    const [fengheld, triamore] = s.covenants;
    expect(felicia.covenantId).toBe(fengheld.id);
    expect(fengheld.memberIds).not.toContain(felicia.id);
    expect(tabanus.covenantId).toBe(triamore.id);
    expect(felicia.rhine?.gild).toBe('linden');
    expect(tabanus.rhine?.gild).toBeUndefined();
    expect(felicia.description).toMatch(/Dorana/);
  });

  it('has Felicia take to the road for the summer and come back to Fengheld for the winter', () => {
    const s = build(['fengheld']);
    const felicia = named(s.characters, 'Felicia');
    const fengheld = s.covenants[0];
    wanderersSeasonStart(s, 1220, 'Summer', seeded(1));
    expect(felicia.covenantId).toBeUndefined();
    expect(fengheld.labs.some((l) => l.ownerId === felicia.id)).toBe(false);
    expect(felicia.wanderer?.lab).toBeTruthy();
    wanderersSeasonStart(s, 1220, 'Winter', seeded(1));
    expect(felicia.covenantId).toBe(fengheld.id);
    expect(fengheld.labs.filter((l) => l.ownerId === felicia.id)).toHaveLength(1);
  });

  it('moves Tabanus on after his stay, favoring young covenants, and lets the players take him in', () => {
    const s = build(['triamore', 'durenmar', 'heorot']);
    const tabanus = named(s.characters, 'Tabanus');
    const [triamore, , heorot] = s.covenants;
    addVis(purseOf(tabanus).vis, 'Vi', 3);
    wanderersYearEnd(s, 1220, () => 0.99);
    expect(tabanus.covenantId).toBe(triamore.id);
    expect(triamore.log.some((l) => /Tabanus pays 3 Vi vis/.test(l.text))).toBe(true);
    // three years on, he goes; Heorot (founded 1215) weighs eight times Durenmar (767)
    wanderersYearEnd(s, 1222, () => 0.5);
    expect(tabanus.covenantId).toBe(heorot.id);
    expect(heorot.labs.some((l) => l.ownerId === tabanus.id)).toBe(true);
    expect(triamore.labs.some((l) => l.ownerId === tabanus.id)).toBe(false);
    const ours = newCovenant(s.saga.id, 1220);
    s.covenants.push(ours);
    const text = welcomeWanderer(tabanus, ours, s.covenants, 1223, 'Spring');
    expect(text).toMatch(/guest-laws/);
    expect(tabanus.covenantId).toBe(ours.id);
    expect(ours.labs.some((l) => l.ownerId === tabanus.id)).toBe(true);
  });
});

describe('enchanting', () => {
  it('makes a lesser enchanted device of one of the magus’s spells when the Lab Total allows, and finishes it in the season', () => {
    const saga = sagaAt();
    const c = generateCharacter({ type: 'magus', house: 'verditius', seed: 5, yearsPostGauntlet: 30, variety: 'focused', npc: true }, { data, saga, rules }).c;
    const cov = newCovenant(saga.id, 1200);
    cov.aura = 5;
    cov.memberIds = [c.id];
    c.covenantId = cov.id;
    cov.labs.push(newLab('Lab', c.id));
    for (const a of ['Cr', 'In', 'Mu', 'Pe', 'Re', 'An', 'Aq', 'Au', 'Co', 'He', 'Ig', 'Im', 'Me', 'Te', 'Vi'] as const) addVis(cov.visStocks, a, 10);
    c.priorities = [{ kind: 'enchant' }];
    c.standing = { kind: 'priorities' };
    const d = deriveCharacter(c, data, rules);
    const ctx = characterContext(c, [cov], data);
    const pick = choosePriority(c, d, ctx, cov, data, 1220, 'Spring', seeded(1), [c]);
    expect(pick.choice?.kind).toBe('enchant');
    const item = c.items.find((i) => i.creatorId === c.id)!;
    expect(item).toBeTruthy();
    expect(['lesser', 'charged']).toContain(item.kind);
    const r = advanceSeasons({ saga, characters: [c], covenants: [cov] }, data, 1, { ...DEFAULT_ADVANCE, rollAging: false, rng: seeded(2) });
    const made = r.state.characters[0].items.find((i) => i.uid === item.uid)!;
    expect(made.effects[0].pending).toBe(false);
    if (made.kind === 'charged') expect(made.charges).toBeGreaterThan(0);
  });
});
