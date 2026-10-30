// The saga's calendar and the stories waiting to be told: so the troupe can play the story and let the
// toolkit keep the dates. What is coming (the Tribunal and the Houses' gatherings, a Hook's story come
// round, a Natural Disaster or a Flawed Resource due, the Aegis to cast again, a magus turning 35, an
// apprentice's Gauntlet, a trouble passing, the troupe's own dates) and the stories each character's
// Story and Personality Flaws and the covenant's Hooks promise, the longest untold first.

import type { GameData } from '../data';
import { effectExpiry, seasonIndex } from './effects';
import { mechanicOf } from './covenantRules';
import { gatheringSeason, nextGatherings } from './living';
import { tribunalBook } from '../data/livingCovenants';
import { HOOK_REMINDERS } from './time';
import type { Character, Covenant, Saga, Season } from './types';

export interface CalEvent {
  year: number;
  season: Season;
  kind: 'tribunal' | 'hook' | 'covenant' | 'character' | 'trouble' | 'troupe' | 'year';
  text: string;
  /** where it is dealt with */
  link?: { covenantId?: string; characterId?: string; tab?: string; page?: 'tribunal' | 'seasons' };
  /** the troupe's own event (SagaEvent uid), which can be removed */
  uid?: string;
}

interface State {
  saga: Saga;
  characters: Character[];
  covenants: Covenant[];
}

/** What is coming over the next few years, soonest first (this season included). */
export function upcoming(state: State, years = 3): CalEvent[] {
  const { saga } = state;
  const now = seasonIndex(saga.currentYear, saga.currentSeason);
  const until = now + years * 4;
  const out: CalEvent[] = [];
  const add = (e: CalEvent) => {
    const i = seasonIndex(e.year, e.season);
    if (i >= now && i < until) out.push(e);
  };
  const players = state.covenants.filter((c) => !c.living);
  const inPlay = state.characters.filter((c) => !c.wounds.dead && !c.retired && c.creation.finalized && players.some((p) => p.memberIds.includes(c.id)));

  // the troupe's own dates
  for (const e of saga.calendar ?? []) {
    if (!e.every) add({ year: e.year, season: e.season, kind: 'troupe', text: e.text, uid: e.uid });
    else for (let y = e.year; y < saga.currentYear + years + 1; y += e.every) add({ year: y, season: e.season, kind: 'troupe', text: `${e.text}${e.every === 1 ? ' (every year)' : ` (every ${e.every} years)`}`, uid: e.uid });
  }
  // the Tribunal's gathering and the Houses'
  const book = tribunalBook(saga.tribunal);
  for (const g of nextGatherings(saga, saga.currentYear))
    add({ year: g.year, season: g.house ? 'Summer' : gatheringSeason(book), kind: 'tribunal', text: `${g.name} meets at ${g.at}${g.house ? '' : ': motions, new masters, and the magi’s votes'}.`, link: { page: 'tribunal' } });

  for (const cov of players) {
    const name = cov.name || 'The covenant';
    // Hooks that come due on a date, and Hooks whose stories come round
    for (const hb of cov.hooksBoons) {
      const m = mechanicOf(hb);
      if (hb.due && (m === 'natural-disaster' ? !hb.active : m === 'flawed-resource' ? !hb.outcome || hb.outcome === 'pending' : false))
        add({ year: hb.due.year, season: hb.due.season, kind: 'hook', text: `${name}: ${m === 'natural-disaster' ? 'the Natural Disaster strikes' : `${hb.name}: the story of its loss`}.`, link: { covenantId: cov.id, tab: 'hooks' } });
      if (hb.kind !== 'hook') continue;
      const r = HOOK_REMINDERS.find((x) => x.match.test(hb.name));
      if (!r) continue;
      const last = cov.hookStories?.[hb.uid] ?? cov.foundedYear;
      add({ year: Math.max(saga.currentYear, last + r.every - 1), season: 'Winter', kind: 'hook', text: `${name}, ${hb.name}: ${r.text}.`, link: { covenantId: cov.id, tab: 'hooks' } });
    }
    // wards to cast again
    for (const e of cov.effects ?? []) {
      const end = effectExpiry(e);
      if (end && e.renew) add({ ...end, kind: 'covenant', text: `${name}: ${e.name} is cast again (${Math.max(1, Math.ceil(e.renew.level / 5))} pawns of ${e.renew.art ?? 'Rego or Vim'} vis).`, link: { covenantId: cov.id, tab: 'overview' } });
    }
    // troubles passing
    for (const t of cov.troubles ?? []) if (t.yearsLeft > 0) add({ year: saga.currentYear + t.yearsLeft - 1, season: 'Winter', kind: 'trouble', text: `${name}: the ${t.label.split(' (')[0].toLowerCase()} should pass at the year’s end.`, link: { covenantId: cov.id, tab: 'overview' } });
  }
  // the characters: Longevity Rituals, apprentices' Gauntlets
  for (const c of inPlay) {
    if (c.type === 'magus' && !c.longevity) {
      const at35 = saga.currentYear + Math.max(0, 35 - c.age);
      add({ year: at35, season: saga.currentYear === at35 ? saga.currentSeason : 'Spring', kind: 'character', text: c.age >= 35 ? `${c.name} is ${c.age} with no Longevity Ritual: every year's aging roll is unguarded.` : `${c.name} turns 35: aging rolls begin, and a Longevity Ritual is wanted.`, link: { characterId: c.id, tab: 'lab' } });
    }
    if (c.apprentice) add({ year: c.apprentice.since + 15, season: 'Spring', kind: 'character', text: `${c.apprentice.name}, ${c.name}’s apprentice, faces the Gauntlet after fifteen years.`, link: { characterId: c.id, tab: 'advancement' } });
  }
  // the year's end
  const aging = inPlay.filter((c) => c.age >= 35).length;
  add({ year: saga.currentYear, season: 'Winter', kind: 'year', text: `The year closes: the covenant’s accounts, the vis harvest${aging ? `, aging rolls for ${aging} character${aging > 1 ? 's' : ''} over 35` : ''}, and a year’s Warping.`, link: { page: 'seasons' } });
  return out.sort((a, b) => seasonIndex(a.year, a.season) - seasonIndex(b.year, b.season));
}

export interface StorySeed {
  /** what records it as told: 'vf:<characterId>:<virtueUid>' or 'hook:<covenantId>:<hookUid>' */
  key: string;
  who: string;
  title: string;
  /** the Flaw's or Hook's first sentence, as a prompt */
  prompt: string;
  /** the year it last came up in play */
  last?: number;
  link: { covenantId?: string; characterId?: string; tab?: string };
}

const firstSentence = (t: string) => (t.match(/^[^.!?]*[.!?]/)?.[0] ?? t).trim().slice(0, 200);

/** The stories the characters' Story and Personality Flaws and the covenant's Hooks promise, the longest untold first. */
export function storySeeds(state: State, data: GameData): StorySeed[] {
  const players = state.covenants.filter((c) => !c.living);
  const out: StorySeed[] = [];
  for (const c of state.characters) {
    if (c.wounds.dead || c.retired || !c.creation.finalized || !players.some((p) => p.memberIds.includes(c.id))) continue;
    for (const v of c.virtues) {
      const def = data.vfById.get(v.defId);
      if (!def || def.kind !== 'flaw' || !def.categories.some((k) => k === 'Story' || k === 'Personality')) continue;
      out.push({
        key: `vf:${c.id}:${v.uid}`,
        who: c.name,
        title: `${def.name}${v.param ? ` (${v.param})` : ''}`,
        prompt: v.note?.trim() || firstSentence(def.text),
        last: c.storiesTold?.[v.uid],
        link: { characterId: c.id, tab: 'overview' },
      });
    }
  }
  for (const cov of players)
    for (const hb of cov.hooksBoons.filter((h) => h.kind === 'hook')) {
      const def = hb.defId ? data.hooksBoons.find((d) => d.id === hb.defId) : undefined;
      out.push({ key: `hook:${cov.id}:${hb.uid}`, who: cov.name || 'The covenant', title: hb.name, prompt: hb.note?.trim() || (def ? firstSentence(def.text) : ''), last: cov.hookStories?.[hb.uid], link: { covenantId: cov.id, tab: 'hooks' } });
    }
  return out.sort((a, b) => (a.last ?? -Infinity) - (b.last ?? -Infinity) || a.who.localeCompare(b.who));
}

/** Mark a story as told this year. */
export function tellStory(state: State, key: string, year: number): void {
  const [kind, owner, uid] = key.split(':');
  if (kind === 'vf') {
    const c = state.characters.find((x) => x.id === owner);
    if (c) c.storiesTold = { ...(c.storiesTold ?? {}), [uid]: year };
  } else {
    const cov = state.covenants.find((x) => x.id === owner);
    if (cov) cov.hookStories = { ...(cov.hookStories ?? {}), [uid]: year };
  }
}

