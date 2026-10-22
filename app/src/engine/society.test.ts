// Society: guild ranks and rolls (City & Guild), petitions (The Church), quick trials, etiquette and
// debate (HoH: Societates).
import { describe, expect, it } from 'vitest';
import { buildGameData } from '../data';
import { addVirtue, ensureAbility, newCharacter } from './character/factory';
import { deriveCharacter } from './character/derive';
import { apprenticePiece, debateAttack, debatePenalty, debateVotes, debaterOf, guildRank, journeymanContract, petitionArgument, petitionTotal, type Debater } from './society';
import { workshopFigures } from './workshop';
import { DEFAULT_HOUSE_RULES, type Character } from './types';

const data = buildGameData();
const d = (c: Character) => deriveCharacter(c, data, DEFAULT_HOUSE_RULES);
const fixed = (v: number) => () => v; // every die shows the same face

describe('guilds', () => {
  it('reads the rank from the guild Social Status, or one earned in play', () => {
    const c = newCharacter('companion', 's');
    expect(guildRank(c)).toBeUndefined();
    addVirtue(c, data, 'journeyman', 'Minor');
    expect(guildRank(c)).toBe('journeyman');
    c.guild = { name: 'Weavers', rank: 'senior' };
    expect(guildRank(c)).toBe('senior');
  });

  it('passes the apprentice piece on Craft + Characteristic + die against 9', () => {
    expect(apprenticePiece(4, 1, fixed(0.45)).ok).toBe(true); // 4 + 1 + 4 = 9
    expect(apprenticePiece(3, 1, fixed(0.45)).ok).toBe(false);
  });

  it('turns a contract roll into Labor Points, with the book’s modifiers', () => {
    const base = { com: 1, bargain: 2, age: 25, craft: 5, relationship: 0 as const, fined: false };
    // 1 + 2 + 3 + die 5 = 11: 0 Labor Points
    expect(journeymanContract(base, fixed(0.55))).toMatchObject({ total: 11, lp: 0 });
    expect(journeymanContract({ ...base, craft: 8, relationship: 1 }, fixed(0.55))).toMatchObject({ total: 14, lp: 1 });
    expect(journeymanContract({ ...base, fined: true }, fixed(0.55)).lp).toBe(0); // 9
    expect(journeymanContract({ ...base, fined: true, bargain: 0 }, fixed(0.55)).lp).toBe(-1); // 7
    expect(journeymanContract(base, fixed(0.05)).lp).toBeNull(); // a 0 and a botch die of 0: refused
  });

  it('adds the contract’s Labor Points to the workshop', () => {
    const c = newCharacter('companion', 's');
    ensureAbility(c, 'craft-type', { apprenticeship: 50 }, 'Weaving');
    c.workshop = { primary: 'Dex', innovation: 0, rawMaterials: 0, laborPoints: 0, assistants: [], manual: 0, craftLevelMod: 0, seasonsWorked: 0, reputationXp: 0, shoddyStreak: 0 };
    const before = workshopFigures(c, d(c))!.lp;
    c.workshop.contractLp = 2;
    expect(workshopFigures(c, d(c))!.lp).toBe(before + 2);
  });
});

describe('petitions', () => {
  it('writes with Communication, speaks with Presence and the Gift’s penalty', () => {
    const c = newCharacter('magus', 's');
    c.characteristics.Com = 2;
    c.characteristics.Pre = 1;
    expect(petitionTotal(d(c), false, 4).total).toBe(6);
    expect(petitionTotal(d(c), true, 4).total).toBe(1 + 4 + d(c).socialPenalty);
  });

  it('counts an argument’s bonus on a success, and against on a botch', () => {
    expect(petitionArgument(2, 3, 2, fixed(0.45)).value).toBe(2); // 2 + 3 + 4 = 9
    expect(petitionArgument(2, 3, 2, fixed(0.05)).value).toBe(-2);
  });
});

describe('debate', () => {
  const debater = (o: Partial<Debater> = {}): Debater => ({ name: 'A', per: 0, com: 2, int: 1, pre: 2, abilities: { 'folk-ken': 3, intrigue: 3, 'artes-liberales': 3, charm: 2, guile: 2, leadership: 2 }, resistance: 3, clearThinker: false, giftPenalty: 0, lost: 0, ...o });

  it('applies the style modifier and costs Fatigue past Resistance', () => {
    // attack 2 + 3 + 3 (Folk Ken vs Charm) + 5 = 13; defense 1 + 2 + 5 = 8; Advantage 5; Weakening 7 vs 3: one level
    const r = debateAttack(debater(), debater(), 'folk-ken', 'charm', 0, fixed(0.55));
    expect(r.lost).toBe(1);
    expect(debateAttack(debater(), debater(), 'artes-liberales', 'charm', 0, fixed(0.55)).lost).toBe(0);
  });

  it('penalizes a tired argument, less for a Clear Thinker', () => {
    expect(debatePenalty(debater({ lost: 3 }))).toBe(-3);
    expect(debatePenalty(debater({ lost: 3, clearThinker: true }))).toBe(-2);
    expect(debatePenalty(debater({ lost: 1 }))).toBe(0);
  });

  it('builds a debater from a character: Resistance from Reputation and Confidence', () => {
    const c = newCharacter('magus', 's');
    c.reputations.push({ uid: 'r', text: 'Wise', scope: 'Hermetic', score: 2 });
    c.confidence.score = 1;
    expect(debaterOf(d(c), 'X').resistance).toBe(3);
  });

  it('sways the vote by the Argument Strength table', () => {
    // the book's example: 20 neutral... strength 3 wins 20% of 25 neutral voters
    expect(debateVotes(3, 10, 25, 20)).toMatchObject({ winner: 15, abstain: 20 });
    expect(debateVotes(5, 10, 25, 20)).toMatchObject({ winner: 22, loser: 18 });
  });
});
