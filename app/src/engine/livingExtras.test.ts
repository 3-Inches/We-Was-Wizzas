// What the Rhine's magi have beyond their sheets: the book's items, talismans and familiar, the
// Mysteries of their Houses, heartbeasts, a Redcap's devices, House duties and the Bjornaer's
// Gathering of Twelve Years.
import { describe, expect, it } from 'vitest';
import { buildGameData } from '../data';
import { RHINE } from '../data/livingCovenants/rhine';
import { newSaga } from '../store/store';
import { newCharacter } from './character/factory';
import { newCovenant } from './covenant';
import { issueRedcapDevices, redcapYearEnd } from './generate/items';
import { seeded } from './generate/random';
import { buildLivingCovenant, houseGatheringIn } from './living';
import { houseDuty } from './priorities';
import { advanceSeasons, DEFAULT_ADVANCE } from './time';
import { DEFAULT_HOUSE_RULES, type Character } from './types';

const data = buildGameData();
const rules = DEFAULT_HOUSE_RULES;
const def = (id: string) => RHINE.covenants.find((c) => c.id === id)!;
const sagaAt = (year = 1220, season: 'Spring' | 'Summer' | 'Autumn' | 'Winter' = 'Spring', options: Record<string, boolean> = { rhineGilds: true }) => {
  const s = newSaga('Living');
  s.tribunal = 'Rhine';
  s.currentYear = year;
  s.currentSeason = season;
  s.options = options;
  return s;
};
const named = (cs: Character[], name: string) => cs.find((c) => c.name === name)!;

describe('the book’s items and familiars', () => {
  const { chars } = buildLivingCovenant(RHINE, def('durenmar'), { data, saga: sagaAt(), rules }, { seed: 3 });
  it('gives Philippus Niger his talisman, bridle and chain, and Sordus as the book has him', () => {
    const p = named(chars, 'Philippus Niger');
    const knife = p.items.find((i) => i.name === 'Knife of Human Bone')!;
    expect(knife.kind).toBe('talisman');
    expect(p.talismanUid).toBe(knife.uid);
    expect(knife.attunements.map((a) => a.bonus)).toEqual([2, 4, 3]);
    expect(knife.effects).toHaveLength(11);
    expect(knife.effects.find((e) => e.name === 'Evisceration of Ten Thousand Knives')?.modifiedLevel).toBe(55);
    expect(p.items.find((i) => i.name === 'The Wizard’s Bridle')?.effects.map((e) => e.modifiedLevel)).toEqual([50, 69]);
    expect(p.items.find((i) => i.name === 'The Subtle Chain')?.effects).toHaveLength(6);
    expect(p.familiar).toMatchObject({ name: 'Sordus', species: 'basilisk', might: 30, bindingTechnique: 'Pe', bindingForm: 'Vi', bindingLabTotal: 81, golden: 4, silver: 2, bronze: 2 });
    expect(p.familiar?.powers[0].name).toBe('Mental Communication');
  });
  it('gives every archmage a talisman', () => {
    for (const c of chars.filter((x) => x.rhine?.rank === 'archmage')) expect(c.talismanUid, c.name).toBeTruthy();
  });
  it('gives Falke her anklet-ring', () => {
    const { chars: cr } = buildLivingCovenant(RHINE, def('crintera'), { data, saga: sagaAt(), rules }, { seed: 3, others: false });
    const falke = named(cr, 'Falke');
    const ring = falke.items.find((i) => i.uid === falke.talismanUid)!;
    expect(ring.name).toBe('Silver anklet-ring');
    expect(ring.effects.map((e) => e.modifiedLevel)).toEqual([19, 17, 12]);
  });
});

describe('Mysteries, heartbeasts and House duties', () => {
  it('initiates the senior Merinita into their Mysteries only when the saga uses Mystery Initiation', () => {
    const off = buildLivingCovenant(RHINE, def('irencillia'), { data, saga: sagaAt(1220, 'Spring', { rhineGilds: true, mysteries: false }), rules }, { seed: 3, others: false });
    expect(named(off.chars, 'Handri').virtues.some((v) => v.defId === 'arcadian-travel')).toBe(false);
    const on = buildLivingCovenant(RHINE, def('irencillia'), { data, saga: sagaAt(1220, 'Spring', { rhineGilds: true, mysteries: true }), rules }, { seed: 3, others: false });
    const v = named(on.chars, 'Handri').virtues.find((x) => x.defId === 'arcadian-travel');
    expect(v).toMatchObject({ free: true, freeReason: 'Initiated before play' });
    expect(v?.note).toMatch(/^Not in the book/);
  });
  it('gives each Bjornaer a heartbeast, the book’s or a likely one', () => {
    const { chars } = buildLivingCovenant(RHINE, def('crintera'), { data, saga: sagaAt(), rules }, { seed: 5 });
    for (const c of chars.filter((x) => x.house === 'bjornaer')) expect(c.heartbeast, c.name).toBeTruthy();
    expect(named(chars, 'Urgen').heartbeast).toBe('bear');
  });
  it('lays a Quaesitor’s investigations and a Gifted Mercere’s season on the road on their lists', () => {
    const tabanus = newCharacter('magus', 's');
    tabanus.house = 'guernicus';
    expect(houseDuty(tabanus)?.ability).toBe('code-of-hermes');
    const xavier = newCharacter('magus', 's');
    xavier.house = 'mercere';
    expect(houseDuty(xavier)?.everyYears).toBe(7);
    const { chars } = buildLivingCovenant(RHINE, def('durenmar'), { data, saga: sagaAt(), rules }, { seed: 3, others: false });
    expect(named(chars, 'Caecilius').priorities?.some((p) => p.kind === 'house')).toBe(true);
  });
});

describe('a Redcap’s devices', () => {
  it('fits out a Redcap with the House’s fifty levels and two more a year, and upgrades them', () => {
    const { chars } = buildLivingCovenant(RHINE, def('fengheld'), { data, saga: sagaAt(), rules }, { seed: 3, others: false });
    const horst = named(chars, 'Horst');
    expect(horst.redcap?.levels).toBe(50 + 2 * (horst.age - 25));
    expect(horst.items.length).toBeGreaterThanOrEqual(2);
    expect(horst.redcap!.spent).toBeLessThanOrEqual(horst.redcap!.levels);
    // a young Redcap: no more than fifty, in at least two effects
    const r = newCharacter('companion', 's');
    r.virtues.push({ uid: 'v', defId: 'redcap', size: 'Major' });
    r.redcap = { levels: 50, spent: 0 };
    issueRedcapDevices(r, data, seeded(1));
    expect(r.items.length).toBeGreaterThanOrEqual(2);
    expect(r.redcap.spent).toBeLessThanOrEqual(50);
    const before = r.redcap.levels;
    r.age = 36;
    const lines = redcapYearEnd(r, data, seeded(2));
    expect(r.redcap.levels).toBe(before + 2);
    expect(r.longevity?.labTotal).toBe(50);
    expect(lines.join(' ')).toMatch(/Longevity Ritual/);
  });
});

describe('the Gathering of Twelve Years', () => {
  it('takes the Bjornaer’s Summer at Crintera in 1227, and no one else’s', () => {
    expect(houseGatheringIn(sagaAt(), 1227, 'Summer')).toMatchObject({ house: 'bjornaer', at: 'Crintera' });
    expect(houseGatheringIn(sagaAt(), 1227, 'Spring')).toBeUndefined();
    const saga = sagaAt(1227, 'Summer');
    const a = buildLivingCovenant(RHINE, def('crintera'), { data, saga, rules }, { seed: 2, others: false });
    const b = buildLivingCovenant(RHINE, def('roznov'), { data, saga, rules }, { seed: 2, others: false, avoidNames: a.chars.map((c) => c.name) });
    const r = advanceSeasons({ saga, characters: [...a.chars, ...b.chars], covenants: [newCovenant(saga.id, 1220), a.cov, b.cov] }, data, 1, { ...DEFAULT_ADVANCE, rollAging: false, rng: seeded(3) });
    const summer = (c: Character) => c.seasonLog.find((e) => e.year === 1227 && e.season === 'Summer')?.summary ?? '';
    for (const c of r.state.characters.filter((x) => x.house === 'bjornaer' && x.type === 'magus' && x.standing?.kind !== 'none')) expect(summer(c), c.name).toMatch(/^Attended The Gathering of Twelve Years at Crintera/);
    for (const c of r.state.characters.filter((x) => x.house !== 'bjornaer' && x.type === 'magus' && x.standing?.kind !== 'none')) expect(summer(c), c.name).not.toMatch(/Gathering of Twelve Years/);
  });
});
