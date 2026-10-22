// The market: paying from the treasury or a purse, vis for silver, books for vis, hired teachers, transfers.
import { describe, expect, it } from 'vitest';
import { buildGameData } from '../data';
import { newSaga } from '../store/store';
import { deriveCovenant, newCovenant } from './covenant';
import { newCharacter } from './character/factory';
import { MARKET, bookVisPrice, buyBook, buyVis, buyWare, hireTeacher, pay, sellVis, transfer, type Payer } from './market';
import { advanceSeason } from './time';
import type { LibraryBook } from './types';

const data = buildGameData();
const when = { year: 1220, season: 'Spring' as const };
const ware = (id: string) => MARKET.flatMap((g) => g.wares).find((w) => w.id === id)!;

function setup() {
  const saga = newSaga('Test');
  saga.currentYear = 1220;
  saga.currentSeason = 'Spring';
  const cov = newCovenant(saga.id, 1220);
  cov.name = 'Domus';
  cov.finances.treasury = 50;
  cov.visStocks.push({ art: 'Vi', pawns: 10 }, { art: 'Cr', pawns: 4 });
  const magus = newCharacter('magus', saga.id);
  magus.name = 'Magus';
  magus.creation.finalized = true;
  magus.covenantId = cov.id;
  cov.memberIds.push(magus.id);
  return { saga, cov, magus, treasury: { kind: 'covenant', cov } as Payer, purse: { kind: 'character', c: magus } as Payer };
}

describe('the market', () => {
  it('pays now from the treasury, or puts it on this year’s Sundry, and refuses what it cannot afford', () => {
    const { cov, treasury, purse } = setup();
    expect(pay(treasury, 2, 'Feast', when)).toBeUndefined();
    expect(cov.finances.treasury).toBe(48);
    expect(cov.log.at(-1)?.treasuryDelta).toBe(-2);
    expect(pay(treasury, 100, 'Castle', when, true)).toBeUndefined();
    expect(cov.finances.sundry).toBe(100);
    expect(cov.finances.treasury).toBe(48);
    expect(pay(purse, 1, 'Shoes', when)).toMatch(/only/);
  });
  it('buys a quality ware at its multiplier, and outfitting a lab adds one', () => {
    const { cov, treasury } = setup();
    const labs = cov.labs.length;
    expect(buyWare(treasury, cov, ware('riding-horse'), 5, 1, when)).toBeUndefined();
    expect(cov.finances.treasury).toBe(40);
    expect(buyWare(treasury, cov, ware('lab-outfit'), 1, 1, when)).toBeUndefined();
    expect(cov.labs.length).toBe(labs + 1);
    expect(cov.finances.treasury).toBe(35);
  });
  it('trades vis for silver, dedicated vis kept apart', () => {
    const { cov, treasury } = setup();
    expect(buyVis(treasury, 'Pe', 2, 15, when, 'Ig')).toBeUndefined();
    expect(cov.visStocks.find((v) => v.art === 'Pe' && v.pair === 'Ig')?.pawns).toBe(2);
    expect(cov.finances.treasury).toBe(20);
    expect(sellVis(treasury, 'Vi', 3, 10, when)).toBeUndefined();
    expect(cov.visStocks.find((v) => v.art === 'Vi')?.pawns).toBe(7);
    expect(cov.finances.treasury).toBe(50);
    expect(sellVis(treasury, 'Pe', 5, 15, when, 'Ig')).toMatch(/only 2/);
  });
  it('buys a book for vis into the library, a member’s own copy under their name', () => {
    const { cov, purse, magus } = setup();
    const book: LibraryBook = { uid: 'b1', title: 'Of Fire', kind: 'summa', subjectType: 'art', subject: 'Ig', level: 8, quality: 10, language: 'Latin' };
    expect(bookVisPrice('summa', 8, 'sound', false)).toBe(8);
    expect(bookVisPrice('summa', 8, 'sound', true)).toBe(10);
    expect(buyBook(purse, cov, book, { vis: 8, arts: ['Vi'] }, when)).toMatch(/not 8/);
    magus.purse = { pounds: 0, vis: [{ art: 'Vi', pawns: 9 }] };
    expect(buyBook(purse, cov, book, { vis: 8, arts: ['Vi'] }, when)).toBeUndefined();
    expect(magus.purse.vis[0].pawns).toBe(1);
    expect(cov.library.at(-1)?.ownerId).toBe(magus.id);
  });
  it('hires an outside teacher who is not an inhabitant, teaches, and leaves at the year’s end', () => {
    const { saga, cov, magus, treasury } = setup();
    const before = deriveCovenant(cov, data, [magus]).finances.inhabitantPoints;
    expect(hireTeacher(treasury, cov, { uid: 't', name: 'Master Odo', role: 'teacher', ability: 'Latin', score: 6, teaching: 4, chars: { Com: 2 } }, 2.5, 1, when)).toBeUndefined();
    expect(cov.finances.treasury).toBe(47.5);
    expect(deriveCovenant(cov, data, [magus]).finances.inhabitantPoints).toBe(before);
    saga.currentSeason = 'Winter';
    const { state } = advanceSeason({ saga, characters: [magus], covenants: [cov] }, data);
    expect(state.covenants[0].specialists.some((s) => s.uid === 't')).toBe(false);
  });
  it('moves pounds and vis between the treasury and a purse, noted on both sides', () => {
    const { cov, magus, treasury, purse } = setup();
    expect(transfer(treasury, purse, 5, { art: 'Cr', pawns: 2 }, 'a gift', when)).toBeUndefined();
    expect(cov.finances.treasury).toBe(45);
    expect(magus.purse?.pounds).toBe(5);
    expect(magus.purse?.vis).toEqual([{ art: 'Cr', pawns: 2 }]);
    expect(cov.visStocks.find((v) => v.art === 'Cr')?.pawns).toBe(2);
    expect(magus.purse?.log?.at(-1)?.text).toMatch(/Received 5 £ and 2 Cr from Domus/);
    expect(transfer(purse, treasury, 9, undefined, '', when)).toMatch(/only/);
  });
});
