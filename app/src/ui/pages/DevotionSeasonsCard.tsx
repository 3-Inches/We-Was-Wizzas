// Seasons of devotion, on the Seasons page, in a character's season in full. Each is a season's work,
// logged with useSeasonWork:
// - a season at a saint's shrine and a season with a saint's hagiography (The Church, Devotion)
// - the mystic's path's seasons (The Church, Spiritual Paths)
// - a ring of Solomon's first recitation, and a season's search for the Book of Solomon (RoP: The Divine,
//   Ars Notoria). These two are rolled in Resolve when the season ends (seasonRolls.ts).
// The Faith & miracles page keeps the records and what happens in play.

import { useState } from 'react';
import { ARS_NOTORIA_MODS, SAINTS, SOLOMON_RINGS } from '../../data/divine';
import { ensureAbility } from '../../engine/character/factory';
import type { DerivedCharacter } from '../../engine/character/derive';
import { QUEST_COMPONENTS, SHRINE_SEASON_POINTS, devotionScore, hagiographyPoints, type HagiographyKind } from '../../engine/church';
import { recitationParts } from '../../engine/holy';
import { computeStudy } from '../../engine/longterm';
import { SOLOMON_SEARCH_EASE, firstRecitationEase } from '../../engine/seasonRolls';
import type { Character } from '../../engine/types';
import { Card, Field, Stepper, Total } from '../kit';
import type { CharEditor } from '../character/useChar';
import { useSeasonWork } from '../seasonWork';
import { ModList, modParts } from './holyMods';

type Work = 'shrine' | 'hagiography' | 'path' | 'ring' | 'search';

const WORK_NAMES: Record<Work, string> = {
  shrine: 'a season at a saint’s shrine',
  hagiography: 'a saint’s hagiography',
  path: 'the mystic’s path',
  ring: 'a ring of Solomon first recited',
  search: 'the search for the Book of Solomon',
};

/** The Abilities a season of devotion gives Exposure in, or a hagiography is read for. */
const LORES: { id: string; param?: string; name: string }[] = [
  { id: 'dominion-lore', name: 'Dominion Lore' },
  { id: 'organization-lore', param: 'Church', name: 'Church Lore' },
  { id: 'theology-christian', name: 'Theology' },
];

const score = (d: DerivedCharacter, id: string) => d.abilities.filter((a) => a.abilityId === id).reduce((m, a) => Math.max(m, a.total), 0);
const sum = (ps: { value: number }[]) => ps.reduce((s, p) => s + p.value, 0);
const saintName = (id: string) => SAINTS.find((s) => s.id === id)?.name ?? id;
const SEASON_QUESTS = QUEST_COMPONENTS.filter((x) => x.season);

/** The mystic's season-long Quest Components still open: one done "once" is not offered again. */
const questsOpen = (c: Character) => SEASON_QUESTS.filter((q) => !q.once || !c.spiritualPath?.components.some((x) => x.label === q.label));

/** The seasons of devotion open to a character, named as the card names them. */
export function devotionSeasonWorks(c: Character, d: DerivedCharacter): string[] {
  return workList(c, d).map((w) => WORK_NAMES[w]);
}

function workList(c: Character, d: DerivedCharacter): Work[] {
  const devoted = (c.devotions ?? []).length > 0;
  return [
    ...(devoted ? (['shrine', 'hagiography'] as Work[]) : []),
    ...(c.spiritualPath && questsOpen(c).length ? (['path'] as Work[]) : []),
    ...(score(d, 'ars-notoria') > 0 && (c.holy?.notoria?.learned ?? 0) < SOLOMON_RINGS.length ? (['ring'] as Work[]) : []),
    // only the Gifted learn from what is found (RoP: The Divine, Finding a Text); without Dominion Lore the
    // roll (Intelligence + Divine Lore against 21) is all but hopeless, and one who knows the Art has a copy
    ...((d.hasGift || d.isMagus) && score(d, 'dominion-lore') > 0 && score(d, 'ars-notoria') === 0 ? (['search'] as Work[]) : []),
  ];
}

export function DevotionSeasonsCard({ ed }: { ed: CharEditor }) {
  const { c, d } = ed;
  const sw = useSeasonWork(ed);
  const [work, setWork] = useState<Work>('shrine');
  const [devUid, setDevUid] = useState('');
  const [lore, setLore] = useState(0);
  const [quality, setQuality] = useState(10);
  const [hagKind, setHagKind] = useState<HagiographyKind>('about');
  const [quest, setQuest] = useState(0);
  const [seasons, setSeasons] = useState(1);
  const [mods, setMods] = useState<Record<string, number>>({});
  const [disease, setDisease] = useState('plague');
  const [lines, setLines] = useState<string[]>([]);
  if (!c || !d) return null;
  const works = workList(c, d);
  if (!works.length) return null;
  const w = works.includes(work) ? work : works[0];
  const devs = c.devotions ?? [];
  const dev = devs.find((x) => x.uid === devUid) ?? devs[0];
  const quests = questsOpen(c);
  const q = quests[Math.min(quest, quests.length - 1)];
  const lo = LORES[lore];
  // a ring's first recitation: the next ring, in its season
  const learned = c.holy?.notoria?.learned ?? 0;
  const ring = SOLOMON_RINGS.find((x) => x.ring === learned + 1);
  const wrongSeason = !!ring?.seasons && !ring.seasons.includes(sw.season.toLowerCase() as never);
  const ringParts = recitationParts(d, modParts(ARS_NOTORIA_MODS, mods));
  const ringEase = ring ? firstRecitationEase(ring.ring, seasons) : 0;
  const searchScore = d.characteristics.Int.value + score(d, 'dominion-lore');
  const points = w === 'shrine' ? SHRINE_SEASON_POINTS : w === 'hagiography' ? hagiographyPoints(hagKind, quality, hagKind === 'general' && !!dev?.general) : w === 'path' && q && /personal devotion/.test(q.label) && dev ? 1 : 0;
  const plan = (): string => {
    switch (w) {
      case 'shrine':
        return `A season of prayer and meditation at ${dev ? `${saintName(dev.saint)}’s` : 'the saint’s'} shrine: +${points} Devotion Points, and Exposure in ${lo.name} the only experience.`;
      case 'hagiography':
        return hagKind === 'general' && dev?.general
          ? `A general work on the saints has already given ${dev ? saintName(dev.saint) : 'this saint'} its one Devotion Point; the reading still teaches.`
          : `+${points} Devotion Point${points === 1 ? '' : 's'} (${hagKind === 'general' ? 'a general work: 1, once a saint' : 'its Quality ÷ 2'}), and the reading’s experience in ${lo.name}, as a tractatus.`;
      case 'path':
        return q ? `+${q.value} to the Spiritual Path (${c.spiritualPath?.revelation}): ${q.label}.` : '';
      case 'ring':
        return ring ? `${ring.name}, recited all season: rolled in Resolve when the season ends, against ${ringEase} (6 + 3 × ${ring.ring} + ${seasons} season${seasons === 1 ? '' : 's'}).` : '';
      case 'search':
        return `A season searching: rolled in Resolve when the season ends, Intelligence + Dominion Lore ${searchScore} + a stress die against ${SOLOMON_SEARCH_EASE}.`;
    }
  };
  const why =
    sw.busy ? `${sw.season} ${sw.year} is already spent.`
    : (w === 'shrine' || w === 'hagiography') && !dev ? 'Choose the saint.'
    : w === 'ring' && wrongSeason && ring?.seasons ? `${ring.name} is first recited in ${ring.seasons.join(' or ')}.`
    : w === 'ring' && c.holy?.recitation ? 'A recitation already waits to be rolled.'
    : w === 'search' && c.holy?.search ? 'A search already waits to be rolled.'
    : undefined;
  const addPoints = (x: Character, n: number, general = false) => {
    if (!dev || !n) return;
    x.devotions = (x.devotions ?? []).map((y) => (y.uid === dev.uid ? { ...y, points: y.points + n, ...(general ? { general: true } : {}) } : y));
  };
  const doSeason = () =>
    setLines(
      sw.work(`Devotion: ${WORK_NAMES[w]}`, w === 'ring' ? 'ars-notoria' : undefined, (x, _cov, entryUid) => {
        const out = [plan()];
        if (w === 'shrine' || w === 'hagiography') {
          addPoints(x, points, w === 'hagiography' && hagKind === 'general');
          const ab = ensureAbility(x, lo.id, {}, lo.param);
          const xp = w === 'shrine' ? 2 : computeStudy(d, { kind: 'tractatus', quality, isArt: false, subject: lo.name }, { abilityUid: ab.uid }).xp;
          if (dev) out.push(`${saintName(dev.saint)}: ${dev.points + points} Devotion Points, Devotion ${devotionScore(dev.points + points)}.`);
          return { lines: out, gains: xp ? { [`ability:${ab.uid}`]: xp } : {}, gainText: xp ? `+${xp} experience in ${lo.name}` : undefined };
        }
        if (w === 'path' && q && x.spiritualPath) {
          x.spiritualPath = { ...x.spiritualPath, components: [...x.spiritualPath.components, { label: q.label, value: q.value }] };
          // a season of personal devotion: a Devotion Point, and exposure in Dominion Lore only
          if (/personal devotion/.test(q.label)) {
            addPoints(x, points);
            const ab = ensureAbility(x, 'dominion-lore');
            return { lines: out, gains: { [`ability:${ab.uid}`]: 2 }, gainText: '+2 experience in Dominion Lore' };
          }
          return { lines: out };
        }
        if (w === 'ring' && ring) {
          x.holy = { ...(x.holy ?? {}), recitation: { ring: ring.ring, seasons, score: sum(ringParts), ease: ringEase, ...(ring.ring === 3 ? { disease } : {}), year: sw.year, season: sw.season, entryUid } };
          return { lines: [...out, 'Roll it in Resolve, at the top of the Seasons page, when the season ends.'] };
        }
        if (w === 'search') {
          x.holy = { ...(x.holy ?? {}), search: { score: searchScore, year: sw.year, season: sw.season, entryUid } };
          return { lines: [...out, 'Roll it in Resolve, at the top of the Seasons page, when the season ends.'] };
        }
        return { lines: [], refused: 'Nothing to do this season.' };
      }),
    );
  return (
    <Card title="Seasons of devotion" tour="holy-seasons" fold="holy-seasons" summary={works.map((x) => WORK_NAMES[x]).join(' · ')}>
      <div className="row">
        <Field label="Work">
          <select value={w} onChange={(e) => setWork(e.target.value as Work)}>
            {works.map((x) => (
              <option key={x} value={x}>{WORK_NAMES[x]}</option>
            ))}
          </select>
        </Field>
        {(w === 'shrine' || w === 'hagiography' || (w === 'path' && q && /personal devotion/.test(q.label))) && devs.length > 0 && (
          <Field label="Devotion to">
            <select value={dev?.uid ?? ''} onChange={(e) => setDevUid(e.target.value)}>
              {devs.map((x) => (
                <option key={x.uid} value={x.uid}>{saintName(x.saint)} ({devotionScore(x.points)})</option>
              ))}
            </select>
          </Field>
        )}
        {(w === 'shrine' || w === 'hagiography') && (
          <Field label={w === 'shrine' ? 'Exposure in' : 'Read for'}>
            <select value={lore} onChange={(e) => setLore(Number(e.target.value))}>
              {LORES.filter((_, i) => w === 'hagiography' || i < 2).map((x) => (
                <option key={x.name} value={LORES.indexOf(x)}>{x.name}</option>
              ))}
            </select>
          </Field>
        )}
        {w === 'hagiography' && (
          <>
            <Field label="The book" hint="A work by the saint counts as a hagiography (Augustine’s City of God: Quality 10, 5 points)">
              <select value={hagKind} onChange={(e) => setHagKind(e.target.value as HagiographyKind)}>
                <option value="about">entirely about the saint</option>
                <option value="by">by the saint</option>
                <option value="general">a general work on the saints</option>
              </select>
            </Field>
            <Field label="Its Quality">
              <Stepper value={quality} min={1} max={30} width={34} onChange={setQuality} />
            </Field>
          </>
        )}
        {w === 'path' && (
          <Field label="Quest Component">
            <select value={Math.min(quest, quests.length - 1)} onChange={(e) => setQuest(Number(e.target.value))} style={{ maxWidth: 320 }}>
              {quests.map((x, i) => (
                <option key={x.label} value={i}>+{x.value} {x.label}</option>
              ))}
            </select>
          </Field>
        )}
        {w === 'ring' && ring && (
          <>
            <Field label="For seasons" hint="+1 to the Ease Factor a season; they begin after this one">
              <Stepper value={seasons} min={1} max={8} width={34} onChange={setSeasons} />
            </Field>
            {ring.ring === 3 && (
              <Field label="The disease">
                <input value={disease} onChange={(e) => setDisease(e.target.value)} />
              </Field>
            )}
          </>
        )}
      </div>
      {w === 'ring' && <ModList mods={ARS_NOTORIA_MODS} value={mods} onChange={setMods} />}
      <p className="small">
        {w === 'ring' && (
          <>
            Recitation score <Total value={sum(ringParts)} parts={ringParts} label="Recitation" />.{' '}
          </>
        )}
        {plan()}
      </p>
      <button onClick={doSeason} disabled={!!why}>
        {w === 'shrine' ? 'Pray at the shrine' : w === 'hagiography' ? 'Read it' : w === 'path' ? 'Walk the path' : w === 'ring' ? 'Recite' : 'Search'} (a season)
      </button>
      {why && <span className="small muted"> {why}</span>}
      {lines.length > 0 && (
        <div className="log small" aria-live="polite">
          {lines.map((l, i) => (
            <div key={i}>{l}</div>
          ))}
        </div>
      )}
    </Card>
  );
}
