import { describe, expect, it } from 'vitest';
import { deprivationEase, exchange, fallingBonus, opposedRoll, perilDamage, staminaCheck, woundBySize } from './rolls';
import { contestChance, pct, simpleChance, simpleDie, stressChance, stressContestChance, stressDie } from './dice';
import { seeded } from './generate/random';
import { guildOf, relatedCrafts } from '../data/lists';

/** A die that shows these faces in turn (0–9). */
const faces = (...f: number[]) => {
  let i = 0;
  return () => (f[i++ % f.length] + 0.5) / 10;
};

describe('rolls of a session', () => {
  it('opposed: the higher total wins, a tie holds for the one resisting, a botch loses', () => {
    expect(opposedRoll({ mod: 5 }, { mod: 3 }, faces(6, 6)).winner).toBe('a'); // 11 against 9
    const tie = opposedRoll({ mod: 3 }, { mod: 5 }, faces(6, 4)); // 9 against 9
    expect(tie.winner).toBe('b');
    expect(tie.text).toMatch(/a tie/);
    expect(opposedRoll({ mod: 9 }, { mod: 0 }, faces(0, 0, 5)).winner).toBe('b'); // a botches
  });

  it('a wound is 5 + Size points wide', () => {
    expect(woundBySize(5)).toBe('light');
    expect(woundBySize(6)).toBe('medium');
    expect(woundBySize(16)).toBe('incapacitating');
    expect(woundBySize(21)).toBe('dead');
    expect(woundBySize(6, 1)).toBe('light');
    expect(woundBySize(0)).toBe('none');
  });

  it('a blow: Attack Advantage + weapon Damage − Soak gives the wound; a miss and a botch do nothing', () => {
    // attack 9 + 8 = 17 against defense 6 + 4 = 10: advantage 7, damage 7 + 5 = 12, soak 3: 9 → medium
    const hit = exchange({ atk: 9, dam: 5, dfn: 6, soak: 3 }, faces(8, 4));
    expect(hit).toMatchObject({ advantage: 7, damage: 12, excess: 9, wound: 'medium' });
    expect(exchange({ atk: 3, dam: 5, dfn: 9, soak: 3 }, faces(4, 4)).wound).toBe('none');
    expect(exchange({ atk: 30, dam: 5, dfn: 0, soak: 0 }, faces(0, 0, 5)).text).toMatch(/botch/);
  });

  it('perils: falls, damage against Soak, Stamina checks, deprivation', () => {
    expect(fallingBonus(20, 'normal')).toBe(10);
    expect(fallingBonus(20, 'hard')).toBe(20);
    expect(fallingBonus(20, 'soft')).toBe(5);
    // damage 10 + 6 = 16 against soak 2 + 3 = 5: 11 → heavy
    expect(perilDamage(10, 2, undefined, faces(6, 3)).wound).toBe('heavy');
    expect(staminaCheck(2, 9, faces(7)).ok).toBe(true);
    expect(staminaCheck(0, 9, faces(7)).ok).toBe(false);
    expect(deprivationEase(1)).toBe(3);
    expect(deprivationEase(4)).toBe(6);
  });
});

describe('the chance of a roll, shown beside it', () => {
  it('a simple die: a 10-sided die from 1 to 10', () => {
    expect(simpleChance(3, 9)).toBeCloseTo(0.5); // a 6 or better
    expect(simpleChance(0, 1)).toBe(1);
    expect(simpleChance(0, 11)).toBe(0);
    expect(simpleChance(-2, 3)).toBeCloseTo(0.6);
    expect(contestChance(3, 3) + contestChance(3, 3) + 0.1).toBeCloseTo(1); // a tie one time in ten
  });

  it('a stress die: a 1 doubles the next, a 0 may botch; the chances match a long run of rolls', () => {
    // nothing but a 1 reaches 15 from +0: a tenth of the time, then 8+ doubled, or 4+ doubled twice…
    expect(stressChance(0, 15).chance).toBeCloseTo(0.038, 3);
    expect(stressChance(0, 15, 1).botch).toBeCloseTo(0.01);
    expect(stressChance(0, 15, 3).botch).toBeCloseTo(0.1 * (1 - 0.9 ** 3));
    const rng = seeded(9);
    for (const [t, e] of [[3, 9], [10, 15], [5, 12]]) {
      let ok = 0;
      let simple = 0;
      for (let i = 0; i < 40000; i++) {
        const r = stressDie(1, rng);
        if ((r.zero ? 0 : r.value) + t >= e) ok++;
        if (simpleDie(rng).value + t >= e) simple++;
      }
      expect(Math.abs(ok / 40000 - stressChance(t, e).chance), `${t} vs ${e}`).toBeLessThan(0.015);
      expect(Math.abs(simple / 40000 - simpleChance(t, e)), `${t} vs ${e}`).toBeLessThan(0.015);
    }
    let wins = 0;
    for (let i = 0; i < 40000; i++) {
      const a = stressDie(1, rng);
      const b = stressDie(1, rng);
      if ((a.botches ? -Infinity : a.value + 6) > (b.botches ? -Infinity : b.value + 4)) wins++;
    }
    expect(Math.abs(wins / 40000 - stressContestChance(6, 4))).toBeLessThan(0.015);
    expect(stressContestChance(4, 4) + stressContestChance(4, 4)).toBeLessThan(1); // ties hold
  });

  it('says a chance in plain words', () => {
    expect(pct(0.5)).toBe('50%');
    expect(pct(1)).toBe('certain');
    expect(pct(0)).toBe('no chance');
    expect(pct(0.004)).toBe('under 1%');
  });
});

describe('crafts that go together, and their guilds', () => {
  it('a smith shoes horses, a baker brews; a craft is not related to itself', () => {
    expect(relatedCrafts('Blacksmith')).toEqual(expect.arrayContaining(['Farrier', 'Armorer']));
    expect(relatedCrafts('Baker')).toEqual(expect.arrayContaining(['Cook', 'Brewer']));
    expect(relatedCrafts('Baker')).not.toContain('Blacksmith');
    expect(relatedCrafts('Percamenarius (parchment maker)')).toContain('Bookbinder');
    for (const c of ['Blacksmith', 'Weaver', 'Mason']) expect(relatedCrafts(c)).not.toContain(c);
  });

  it('names a guild by its craft', () => {
    expect(guildOf('Baker')).toBe('Bakers’ guild');
    expect(guildOf('Lapidary')).toBe('Lapidaries’ guild');
    expect(guildOf('Percamenarius (parchment maker)')).toBe('Parchment makers’ guild');
    expect(guildOf('Ink-maker')).toBe('Ink-makers’ guild');
  });
});
