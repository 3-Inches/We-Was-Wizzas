import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ART_NAMES, ARTS, type Art, type CharType, type GameData } from '../../data';
import { HOMELANDS } from '../../data/lists';
import { HOUSES } from '../../data/houses';
import { deriveCharacter, vfDisplayName } from '../../engine/character/derive';
import { BUDGET_KINDS, budgetLeft, deriveCovenant, homeCovenant } from '../../engine/covenant';
import { generateCharacter, type Generated, type Variety } from '../../engine/generate/character';
import { fillCovenant, type FillOptions, type FillResult } from '../../engine/generate/covenant';
import { newSeed, seeded } from '../../engine/generate/random';
import { rolesFor } from '../../engine/generate/roles';
import { homelandGroupFor } from '../../engine/generate/names';
import { optionOn } from '../../engine/optional';
import type { Character, Covenant, Saga } from '../../engine/types';
import { loadBestiary, matchCreatures, rollCreature, type Creature, type CreatureRealm } from '../../data/bestiary';
import { useGameData, useSaga, useSagaCharacters, useSagaCovenants } from '../../store/hooks';
import { useStore } from '../../store/store';
import { uid } from '../../util/id';
import { BookBadge, Card, Empty, Field, Markdown, Stepper, Tabs } from '../kit';
import { Hint } from '../Hint';
import { useTabParam } from '../useTabParam';

type TabId = 'characters' | 'covenant' | 'creatures';

/** Let the browser draw between slow steps, so a long build shows its progress. */
const tick = () => new Promise((r) => setTimeout(r, 0));

export default function QuickBuildPage() {
  const { sagaId } = useParams();
  const saga = useSaga(sagaId);
  const data = useGameData(saga);
  const [tab, setTab] = useTabParam<TabId>('characters');
  if (!saga) return <Empty>Saga not found.</Empty>;
  return (
    <div>
      <div className="topbar">
        <h1>Quick build</h1>
      </div>
      <p className="small muted" style={{ marginTop: 0 }}>
        Let the toolkit do the heavy lifting: whole characters for players to adjust or as the storyguide&apos;s NPCs, the people a covenant needs, and creatures from the
        books&apos; bestiaries. Choose what matters to you and leave the rest to chance; every character is built by the rules and checked like any other.
      </p>
      <Hint id="quick-build">
        Each roll has a seed, so the same choices and seed make the same result. Nothing is added to the saga until you keep it, and Undo takes back anything kept.
      </Hint>
      <Tabs
        tabs={[
          { id: 'characters', label: 'Characters' },
          { id: 'covenant', label: 'Fill out the covenant' },
          { id: 'creatures', label: 'Creatures & encounters' },
        ]}
        value={tab}
        onChange={setTab}
      />
      <div style={{ marginTop: 10 }}>
        {tab === 'characters' && <CharactersPanel saga={saga} data={data} />}
        {tab === 'covenant' && <CovenantPanel saga={saga} data={data} />}
        {tab === 'creatures' && <CreaturesPanel saga={saga} data={data} />}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ characters

const TYPE_LABEL: Record<CharType, string> = { grog: 'Grog', companion: 'Companion', magus: 'Magus', mythic: 'Mythic Companion' };
const VARIETY: { id: Variety; label: string; title: string }[] = [
  { id: 'focused', label: 'Keep to the role', title: 'The role and its themes decide nearly everything' },
  { id: 'varied', label: 'Vary it', title: 'Some choices at random, within the role' },
  { id: 'wild', label: 'Anything goes', title: 'Many choices at random, and another theme mixed in' },
];

interface Result {
  seed: number;
  g: Generated;
  kept?: boolean;
}

function CharactersPanel({ saga, data }: { saga: Saga; data: GameData }) {
  const covs = useSagaCovenants(saga.id);
  const putSagaState = useStore((s) => s.putSagaState);
  const setNotice = useStore((s) => s.setNotice);
  const [type, setType] = useState<CharType>('grog');
  const [role, setRole] = useState('');
  const [house, setHouse] = useState('');
  const [npc, setNpc] = useState(true);
  const [count, setCount] = useState(3);
  const [variety, setVariety] = useState<Variety>('varied');
  const [gender, setGender] = useState('');
  const [homeland, setHomeland] = useState('');
  const [covChoice, setCovChoice] = useState<string | undefined>();
  // a magus: the spells asked for, and a familiar
  const [spellArts, setSpellArts] = useState<Art[]>([]);
  const [spellMax, setSpellMax] = useState(0);
  const [rituals, setRituals] = useState(false);
  const [askSpells, setAskSpells] = useState(false);
  const [familiar, setFamiliar] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const [busy, setBusy] = useState('');
  const roles = rolesFor(type);
  // grogs and players' characters join the covenant; the storyguide's companions and magi need not
  const sagaChars = useSagaCharacters(saga.id);
  const home = homeCovenant(covs, sagaChars);
  const covId = covChoice ?? (home && (type === 'grog' || !npc) ? home.id : '');
  const cov = covs.find((c) => c.id === covId);
  const guilds = optionOn(saga, 'guilds') && roles.some((r) => r.craft);

  // a new character takes a name nobody in the saga, or in this set, has yet
  const build = (seed: number, taken: string[]): Result => ({
    seed,
    g: generateCharacter(
      {
        type, role: role || undefined, house: house || undefined, gender: (gender || undefined) as 'Male' | 'Female' | undefined, homeland: homeland || undefined, variety, npc, seed, avoidNames: [...sagaChars.map((c) => c.name), ...taken],
        spells: type === 'magus' && askSpells ? { arts: spellArts, maxLevel: spellMax || undefined, rituals } : undefined,
        familiar: type === 'magus' && familiar,
      },
      { data, saga, rules: saga.houseRules, covenant: cov },
    ),
  });
  const generate = async () => {
    const out: Result[] = [];
    for (let i = 0; i < count; i++) {
      setBusy(`Building ${i + 1} of ${count}…`);
      await tick();
      out.push(build(newSeed(), out.map((r) => r.g.c.name)));
      setResults([...out]);
    }
    setBusy('');
  };
  const reroll = async (i: number) => {
    setBusy('Rolling again…');
    await tick();
    setResults((rs) => rs.map((r, j) => (j === i ? build(newSeed(), rs.filter((x) => x !== r).map((x) => x.g.c.name)) : r)));
    setBusy('');
  };
  const keep = (rs: Result[]) => {
    const fresh = rs.filter((r) => !r.kept);
    if (!fresh.length) return;
    const chars = fresh.map((r) => ({ ...r.g.c, covenantId: cov?.id }));
    const covenants = cov ? [{ ...cov, memberIds: [...cov.memberIds, ...chars.map((c) => c.id)] }] : [];
    putSagaState({ saga, characters: chars, covenants });
    setResults((all) => all.map((r) => (fresh.includes(r) ? { ...r, kept: true } : r)));
    setNotice(`Added ${chars.map((c) => c.name).join(', ')} to ${saga.name}${cov ? `, living at ${cov.name}` : ''}.`);
  };

  return (
    <div className="grid with-side wide-side">
      <div className="stack">
        <Card title="What to make" className="accent" tour="quick-characters">
          <div className="row">
            <Field label="Kind">
              <select
                value={type}
                onChange={(e) => {
                  setType(e.target.value as CharType);
                  setRole('');
                }}
              >
                {(Object.keys(TYPE_LABEL) as CharType[]).map((t) => (
                  <option key={t} value={t}>
                    {TYPE_LABEL[t]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Role">
              <select value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="">Any (a mix)</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
            </Field>
            {type === 'magus' && (
              <Field label="House">
                <select value={house} onChange={(e) => setHouse(e.target.value)}>
                  <option value="">{variety === 'focused' ? 'The best fit' : 'Any'}</option>
                  {HOUSES.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <Field label="How many">
              <Stepper value={count} min={1} max={8} width={36} onChange={setCount} />
            </Field>
          </div>
          {role && <p className="small muted">{roles.find((r) => r.id === role)?.blurb}</p>}
          {type === 'magus' && (
            <div className="row small" style={{ marginTop: 6 }}>
              <label className="inline" title="Spend the apprenticeship's spell levels on spells of the Arts chosen here, within the creation limits">
                <input type="checkbox" checked={askSpells} onChange={(e) => setAskSpells(e.target.checked)} /> Spells of
              </label>
              {askSpells && (
                <>
                  <span className="row tight" style={{ flexWrap: 'wrap' }}>
                    {ARTS.map((a) => (
                      <label key={a} className="inline" title={ART_NAMES[a]}>
                        <input type="checkbox" checked={spellArts.includes(a)} onChange={(e) => setSpellArts(e.target.checked ? [...spellArts, a] : spellArts.filter((x) => x !== a))} />
                        {a}
                      </label>
                    ))}
                  </span>
                  <span className="muted">{spellArts.length ? '' : '(none ticked: their best Arts)'}</span>
                  <Field label="Up to level" hint="0: as high as they can">
                    <Stepper value={spellMax} min={0} max={50} step={5} width={36} onChange={setSpellMax} />
                  </Field>
                  <label className="inline">
                    <input type="checkbox" checked={rituals} onChange={(e) => setRituals(e.target.checked)} /> rituals too
                  </label>
                </>
              )}
              <label className="inline" title="A creature suited to their best Technique and Form, bound before play if their Lab Total reaches it (DE, Familiars)">
                <input type="checkbox" checked={familiar} onChange={(e) => setFamiliar(e.target.checked)} /> with a familiar
              </label>
            </div>
          )}
          <div className="row" style={{ marginTop: 6 }}>
            <Field label="For">
              <select value={npc ? 'npc' : 'player'} onChange={(e) => setNpc(e.target.value === 'npc')}>
                <option value="npc">The storyguide: a finished NPC</option>
                <option value="player">A player: a draft to finish</option>
              </select>
            </Field>
            <Field label="Variety">
              <select value={variety} onChange={(e) => setVariety(e.target.value as Variety)}>
                {VARIETY.map((v) => (
                  <option key={v.id} value={v.id} title={v.title}>
                    {v.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Gender">
              <select value={gender} onChange={(e) => setGender(e.target.value)}>
                <option value="">Either</option>
                <option value="Female">Female</option>
                <option value="Male">Male</option>
              </select>
            </Field>
            <Field label="Homeland">
              <select value={homeland} onChange={(e) => setHomeland(e.target.value)}>
                <option value="">{homelandGroupFor(saga.tribunal)?.label ?? 'Anywhere'} (the saga&apos;s)</option>
                {HOMELANDS.map((h) => (
                  <option key={h.label} value={h.label}>
                    {h.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Joins">
              <select value={covId} onChange={(e) => setCovChoice(e.target.value)}>
                <option value="">No covenant</option>
                {covs.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name || 'Unnamed covenant'}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <p className="small muted">
            {npc ? 'An NPC is finished, aged and ready to play, and is listed apart from the players’ characters.' : 'A draft opens at the Review step for the player to change anything.'}{' '}
            {type === 'magus' && 'A magus from a saga set in the Rhine, Thebes or Transylvania gets that Tribunal’s rank, citizenship or privilege when its customs are on. '}
            {guilds && 'Craftsmen take a guild rank, its Social Status and Guild Lore (City & Guild).'}
          </p>
          <div className="row">
            <button className="primary" onClick={generate} disabled={!!busy}>
              {results.length ? 'Roll a new set' : 'Build them'}
            </button>
            {busy && <span className="small muted">{busy} (a magus takes a few seconds)</span>}
          </div>
        </Card>
        {results.length > 0 && (
          <Card
            title={`Results (${results.length})`}
            actions={
              results.some((r) => !r.kept) && (
                <button className="small" onClick={() => keep(results)}>
                  Keep all
                </button>
              )
            }
          >
            {results.map((r, i) => (
              <ResultRow key={r.g.c.id} r={r} data={data} saga={saga} onKeep={() => keep([r])} onReroll={() => reroll(i)} onDrop={() => setResults((rs) => rs.filter((x) => x !== r))} busy={!!busy} />
            ))}
          </Card>
        )}
      </div>
      <div className="stack">
        <Card title="How it builds">
          <p className="small" style={{ marginTop: 0 }}>
            The role sets the concept, Social Status and gear. The guided build&apos;s auto-build then makes every choice from the role&apos;s themes, as a player answering its
            questions would; <b>Variety</b> says how many of those answers are left to chance. An older character rolls aging for each year past 35, and a magus gets a
            Longevity Ritual from their own Lab Total.
          </p>
          <p className="small muted" style={{ marginBottom: 0 }}>
            Anything the rules check would still flag is listed on the result; the generator tries again before it gives up on a clean build.
          </p>
        </Card>
      </div>
    </div>
  );
}

function ResultRow({ r, data, saga, onKeep, onReroll, onDrop, busy }: { r: Result; data: GameData; saga: Saga; onKeep: () => void; onReroll: () => void; onDrop: () => void; busy: boolean }) {
  const { c, role, issues, log } = r.g;
  const d = useMemo(() => deriveCharacter(c, data, saga.houseRules), [c, data, saga.houseRules]);
  const vfs = d.virtues.filter((v) => !v.cv.free && v.def && !v.def.categories.includes('Social Status')).map((v) => vfDisplayName(v.def, v.cv, data));
  const status = d.virtues.find((v) => v.def?.categories.includes('Social Status'))?.def?.name;
  const top = [...d.abilities].sort((a, b) => b.total - a.total).slice(0, 4).map((a) => `${a.name} ${a.total}`);
  const arts = c.type === 'magus' ? ARTS.map((a) => ({ a, s: d.arts[a].score })).sort((x, y) => y.s - x.s).slice(0, 3).map((x) => `${ART_NAMES[x.a]} ${x.s}`) : [];
  const house = HOUSES.find((h) => h.id === c.house)?.name;
  return (
    <div className="list-row" style={{ alignItems: 'flex-start', display: 'block' }}>
      <div className="row between" style={{ alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <b>{c.name}</b> <span className="badge">{c.creation.concept ?? role.label}</span>
          {house && <span className="badge">{house}</span>}
          {issues.length > 0 && (
            <span className="badge warn" title={issues.map((i) => i.message).join('\n')}>
              {issues.length} to settle
            </span>
          )}
          <div className="small muted">
            {c.gender === 'Female' ? 'Woman' : 'Man'} of {c.age}, {c.nationality}
            {status ? ` · ${status}` : ''}
          </div>
        </div>
        <div className="row tight">
          {r.kept ? (
            <Link className="btn small" to={`/saga/${saga.id}/character/${c.id}${c.creation.finalized ? '' : '/create'}`}>
              Open ›
            </Link>
          ) : (
            <>
              <button className="small primary" onClick={onKeep}>
                Keep
              </button>
              <button className="small" onClick={onReroll} disabled={busy} title="Roll this one again">
                ↻
              </button>
              <button className="small ghost" onClick={onDrop} title="Discard">
                ✕
              </button>
            </>
          )}
        </div>
      </div>
      <div className="small">{vfs.join(', ') || 'No Virtues or Flaws beyond the free ones.'}</div>
      <div className="small muted">
        {top.join(', ')}
        {arts.length > 0 && ` · ${arts.join(', ')}`}
        {c.personality.length > 0 && ` · ${c.personality.map((p) => `${p.trait} ${p.score > 0 ? '+' : ''}${p.score}`).join(', ')}`}
      </div>
      {c.type === 'magus' && (c.spells.length > 0 || c.familiar) && (
        <div className="small muted">
          {c.spells.length > 0 && `${c.spells.length} spell${c.spells.length > 1 ? 's' : ''}: ${c.spells.slice(0, 4).map((s) => `${s.spell.name} (${s.spell.technique}${s.spell.form} ${s.spell.level})`).join(', ')}${c.spells.length > 4 ? '…' : ''}`}
          {c.familiar && ` · Familiar: ${c.familiar.name ? `${c.familiar.name}, ` : ''}a ${c.familiar.species}${c.familiar.bindingLabTotal ? ` (bound; golden ${c.familiar.golden}, silver ${c.familiar.silver}, bronze ${c.familiar.bronze})` : ' (not yet bound)'}`}
        </div>
      )}
      <details className="small">
        <summary className="muted" style={{ cursor: 'pointer' }}>
          How it was built (seed {r.seed})
        </summary>
        <ul style={{ margin: '4px 0', paddingLeft: 18 }}>
          {log.map((l, i) => (
            <li key={i}>{l}</li>
          ))}
        </ul>
      </details>
    </div>
  );
}

// ------------------------------------------------------------------ the covenant's people

type Preview = FillResult & {
  bpBefore: number;
  bpAfter: number;
  /** Build Points by kind of purchase, before and after */
  kinds: { label: string; before: number; after: number }[];
  /** what each Hidden, Flawed or Illusory Resource now pays for that it did not before */
  pools: { name: string; spent: number; capacity: number; items: { label: string; cost: number }[] }[];
};

const FILL_DEFAULTS: Omit<FillOptions, 'seed'> = {
  staff: true, autocrat: false, teacher: true, goodTeacher: true, craftsmen: true, bookmakers: true, drill: true, grogs: 4, counts: true, soldiers: true, horses: true, gear: true, yearly: true,
  bought: true, library: { arts: true, abilities: true, labTexts: true, mundane: true, share: 0.5 }, rest: 'split',
};

function CovenantPanel({ saga, data }: { saga: Saga; data: GameData }) {
  const covs = useSagaCovenants(saga.id);
  const chars = useSagaCharacters(saga.id);
  const putSagaState = useStore((s) => s.putSagaState);
  const setNotice = useStore((s) => s.setNotice);
  const [covId, setCovId] = useState<string | undefined>();
  const [o, setO] = useState<Omit<FillOptions, 'seed'>>(FILL_DEFAULTS);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  // the covenant chosen, else the one with the most magi: only this saga's covenants and characters
  const cov = covs.find((c) => c.id === covId) ?? homeCovenant(covs, chars);
  if (!cov)
    return (
      <Empty>
        No covenant yet. <Link to={`/saga/${saga.id}`}>Found one on the saga page</Link>, then come back to fill it out.
      </Empty>
    );
  const membersOf = (c: Covenant) => chars.filter((x) => c.memberIds.includes(x.id));
  const set = <K extends keyof typeof o>(k: K, v: (typeof o)[K]) => {
    setO({ ...o, [k]: v });
    setPreview(null);
  };
  const lib = o.library ?? { arts: false, abilities: false, labTexts: false, mundane: false };
  const build = async () => {
    setBusy(true);
    await tick();
    const res = fillCovenant(cov, chars, { data, saga, rules: saga.houseRules }, { ...o, seed: newSeed() });
    const before = deriveCovenant(cov, data, chars);
    const after = deriveCovenant(res.cov, data, [...chars, ...res.grogs.map((g) => g.c)]);
    const byKind = (dc: typeof before, category: string) => dc.bpLines.filter((l) => l.category === category).reduce((t, l) => t + (l.fullCost ?? l.cost), 0);
    const kinds = BUDGET_KINDS.map((k) => ({ label: k.label, before: byKind(before, k.category), after: byKind(after, k.category) })).filter((k) => k.before || k.after);
    const had = new Set(before.pools.flatMap((p) => p.resources.map((r) => r.uid)));
    const pools = after.pools.map((p) => ({ name: `${p.hb.name}${p.hb.note ? ` (${p.hb.note})` : ''}`, spent: p.spent, capacity: p.capacity, items: p.resources.filter((r) => !had.has(r.uid)).map((r) => ({ label: r.label, cost: r.cost })) }));
    setPreview({ ...res, bpBefore: before.bpSpent, bpAfter: after.bpSpent, kinds, pools });
    setBusy(false);
  };
  const apply = () => {
    if (!preview) return;
    putSagaState({ saga, characters: preview.grogs.map((g) => g.c), covenants: [preview.cov] });
    setNotice(`${cov.name || 'The covenant'} filled out: ${preview.log.length} changes. Undo takes them all back.`);
    setPreview(null);
  };
  type Flag = 'staff' | 'autocrat' | 'teacher' | 'goodTeacher' | 'craftsmen' | 'bookmakers' | 'drill' | 'counts' | 'soldiers' | 'horses' | 'gear' | 'yearly';
  const check = (k: Flag, label: string, title: string) => (
    <label className="inline" title={title}>
      <input type="checkbox" checked={!!o[k]} onChange={(e) => set(k, e.target.checked)} /> {label}
    </label>
  );
  return (
    <div className="stack">
      <Card title="Fill out the covenant" className="accent" tour="quick-covenant">
        <div className="row">
          <Field label="Covenant" hint={covs.length > 1 ? `${covs.length} in this saga` : 'The only one in this saga'}>
            <select value={cov.id} onChange={(e) => (setCovId(e.target.value), setPreview(null))}>
              {covs.map((c) => {
                const m = membersOf(c);
                return (
                  <option key={c.id} value={c.id}>
                    {c.name || 'Unnamed covenant'} — {m.filter((x) => x.type === 'magus').length} magi, {m.length} members, {c.buildPoints} BP
                  </option>
                );
              })}
            </select>
          </Field>
          <Field label="Grogs for the turb" hint="Full characters: a sergeant first, then shield grogs and archers">
            <Stepper value={o.grogs} min={0} max={12} width={36} onChange={(v) => set('grogs', v)} />
          </Field>
          <Field label="They are">
            <select value={o.bought ? 'bought' : 'free'} onChange={(e) => set('bought', e.target.value === 'bought')}>
              <option value="bought">Starting covenfolk (Build Points)</option>
              <option value="free">Recruited in play (no Build Points)</option>
            </select>
          </Field>
        </div>
        <div className="row small" style={{ marginTop: 6 }}>
          <span>People:</span>
          {check('staff', 'Steward, chamberlain, turb captain and scribe', 'Each one the covenant lacks; officers add Presence + their Ability to Loyalty, and a scribe of 6 is skilled (+1 book Quality)')}
          {check('autocrat', 'one autocrat for steward and chamberlain', 'One officer in both roles: the Loyalty from both (Covenants ch.4)')}
          {check('teacher', 'A teacher', 'An older teacher with Communication +3, Teaching and three or four Abilities at the same score, the ones the covenant’s people lack most (only the highest counts toward the cost, DE p.180)')}
          {check('goodTeacher', 'with Good Teacher', '+5 to the Source Quality of their teaching')}
          {check('bookmakers', 'A bookbinder and an illuminator', 'Skilled at 6: +1 Quality each to the books the covenant makes (Covenants ch.7); a pound of Writing Materials each')}
          {check('drill', 'A drill sergeant and unit sergeants', 'The drill sergeant teaches the turb a Martial Ability one season a year; a sergeant for each body of five soldiers or more (Grogs)')}
          {check('craftsmen', 'Craftsmen who save money', 'Carpenters first (they save in Buildings and Consumables), then each craft where it saves most, then swaps while that saves more (Covenants ch.5)')}
          {check('soldiers', 'Soldiers for the soldier Boons', 'Ten for each Minor Boon, twenty for a Major one, at the Boon’s pay, horses and kit')}
          {check('counts', 'Servants, teamsters and laborers', 'The numbers the covenant needs, and the laborers that save most')}
          {check('horses', 'Horses', 'A riding horse for each magus and companion, a draught horse for each teamster: a point of inhabitants each')}
        </div>
        <div className="row small" style={{ marginTop: 6 }}>
          <span>Each year:</span>
          {check('gear', 'Weapons and armor points from the turb', 'Members’ sheets, an outfit for each grog without one at the covenant’s equipment, and the soldiers’ kit (Covenants ch.5)')}
          {check('yearly', 'Redcap visits and feast days', 'Four Redcap visits and a cycle of four feast days, which earns a Loyalty point each year')}
        </div>
        <div className="row small" style={{ marginTop: 6 }}>
          <span>Library:</span>
          {(
            [
              ['arts', 'Art summae and tractatus', "Every Art, Techniques and Forms, for what it gives the covenant's magi above what they know and what the shelf has: primers where they are weak, deeper books where they can read them"],
              ['abilities', 'Ability summae', 'Magic Theory, Parma Magica and others magi study, above what the covenant teacher teaches'],
              ['labTexts', 'Lab Texts', 'One for each Technique and Form pair the magi are best at, no Art more than twice, a Build Point per 5 levels'],
              ['mundane', 'mundane books', 'A few that cost nothing'],
            ] as const
          ).map(([k, label, title]) => (
            <label key={k} className="inline" title={title}>
              <input type="checkbox" checked={!!lib[k]} onChange={(e) => set('library', { ...lib, [k]: e.target.checked })} /> {label}
            </label>
          ))}
          <Field label="taking at most" hint="of the Build Points left, without a library budget">
            <select value={lib.share ?? 0.5} onChange={(e) => set('library', { ...lib, share: Number(e.target.value) })}>
              {[0.25, 0.5, 0.75, 1].map((v) => (
                <option key={v} value={v}>
                  {v === 1 ? 'all' : `${v * 100}%`}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="row small" style={{ marginTop: 6 }}>
          <Field label="The Build Points left at the end" hint="So nothing is left unspent">
            <select value={o.rest ?? 'none'} onChange={(e) => set('rest', e.target.value as FillOptions['rest'])}>
              <option value="split">a third each: vis sources, vis in store, money</option>
              <option value="vis-sources">vis sources to detail (5 BP a pawn a year)</option>
              <option value="vis">vis in store (5 pawns a BP)</option>
              <option value="money">a money reserve (10 £ a BP)</option>
              <option value="none">leave them</option>
            </select>
          </Field>
        </div>
        <BudgetEditor cov={cov} chars={chars} data={data} onChange={() => setPreview(null)} />
        <div className="row" style={{ marginTop: 8 }}>
          <button className="primary" onClick={build} disabled={busy}>
            {preview ? 'Roll again' : 'Show me'}
          </button>
          {busy && <span className="small muted">Building{o.grogs ? ` ${o.grogs} grogs` : ''}…</span>}
        </div>
      </Card>
      {preview && (
        <Card
          title="What it would add"
          actions={
            <button className="small primary" onClick={apply}>
              Add to {cov.name || 'the covenant'}
            </button>
          }
        >
          <ul className="small" style={{ margin: 0, paddingLeft: 18 }}>
            {preview.log.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
          <p className="small">
            Build Points spent: {preview.bpBefore} → <b>{preview.bpAfter}</b> of {cov.buildPoints}
            {preview.bpAfter > cov.buildPoints && <span className="warn-text"> (over the covenant&apos;s Build Points: recruit them in play, or raise the Build Points)</span>}.
          </p>
          {preview.kinds.length > 0 && (
            <table className="compact small">
              <thead>
                <tr>
                  <th>Build Points on</th>
                  <th className="num">Before</th>
                  <th className="num">After</th>
                </tr>
              </thead>
              <tbody>
                {preview.kinds.map((k) => (
                  <tr key={k.label}>
                    <td>{k.label}</td>
                    <td className="num">{k.before}</td>
                    <td className="num">{k.after}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {preview.pools.map((p) => (
            <div key={p.name} className="small" style={{ marginTop: 6 }}>
              <b>{p.name}</b> pays for {p.spent} of its {p.capacity} Build Points
              {p.items.length ? (
                <>
                  ; new from this fill-out:
                  <ul style={{ margin: '2px 0', paddingLeft: 18 }}>
                    {p.items.map((it, i) => (
                      <li key={i}>
                        {it.label} ({it.cost} BP)
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                '; nothing new from this fill-out (set it aside for a kind of purchase on the Hooks & Boons tab).'
              )}
            </div>
          ))}
          {preview.grogs.some((g) => g.issues.length) && (
            <div className="small">
              <span className="warn-text">The rules check would still flag, on adding (fix it on the grog&apos;s sheet, or roll again):</span>
              <ul style={{ margin: '2px 0', paddingLeft: 18 }}>
                {preview.grogs
                  .filter((g) => g.issues.length)
                  .map((g) => (
                    <li key={g.c.id}>
                      <b>{g.c.name}</b>: {g.issues.map((i) => i.message).join(' ')}
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

/**
 * The covenant's Build Points set aside by kind of purchase, and the Hidden, Flawed and Illusory
 * Resources earmarked for each: what Quick build may spend on it.
 */
function BudgetEditor({ cov, chars, data, onChange }: { cov: Covenant; chars: Character[]; data: GameData; onChange: () => void }) {
  const updateCovenant = useStore((s) => s.updateCovenant);
  const dc = deriveCovenant(cov, data, chars);
  const free = cov.buildPoints - dc.bpSpent;
  return (
    <details style={{ marginTop: 6 }}>
      <summary className="small">
        Build Point budget: {free} of {cov.buildPoints} left{cov.budget && Object.keys(cov.budget).length ? ', some set aside' : ''}
      </summary>
      <div className="table-wrap">
        <table className="compact small">
          <thead>
            <tr>
              <th>For</th>
              <th>Set aside</th>
              <th>Spent</th>
              <th>Quick build may spend</th>
            </tr>
          </thead>
          <tbody>
            {BUDGET_KINDS.map((k) => {
              const b = budgetLeft(cov, dc, k.id);
              return (
                <tr key={k.id}>
                  <td>{k.label}</td>
                  <td>
                    <span className="row tight">
                      <Stepper
                        value={cov.budget?.[k.id] ?? 0}
                        min={0}
                        step={5}
                        width={44}
                        onChange={(v) => (updateCovenant(cov.id, (x) => void (x.budget = { ...(x.budget ?? {}), [k.id]: v || undefined })), onChange())}
                      />
                      {cov.budget?.[k.id] === undefined && <span className="muted">no limit</span>}
                    </span>
                  </td>
                  <td>{b.spent}</td>
                  <td>
                    {b.own}
                    {b.pools.map((p) => (
                      <span key={p.hbUid} className="muted">
                        {' '}
                        + {p.left} from {p.name}
                      </span>
                    ))}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="small muted" style={{ margin: 0 }}>
        A kind with nothing set aside may take whatever the covenant has left. Set a Hidden, Flawed or Illusory Resource aside for a kind on the covenant&apos;s Hooks &amp; Boons tab, and
        Quick build spends it there first and ties what it buys to it.
      </p>
    </details>
  );
}

// ------------------------------------------------------------------ creatures

const REALMS: CreatureRealm[] = ['Magic', 'Faerie', 'Infernal', 'Divine'];

function CreaturesPanel({ saga, data }: { saga: Saga; data: GameData }) {
  const updateSaga = useStore((s) => s.updateSaga);
  const [all, setAll] = useState<Creature[] | null>(null);
  const [realm, setRealm] = useState<CreatureRealm | ''>('');
  const [min, setMin] = useState(0);
  const [max, setMax] = useState(30);
  const [q, setQ] = useState('');
  const [sagaBooks, setSagaBooks] = useState(true);
  const [shown, setShown] = useState<Creature | null>(null);
  const [n, setN] = useState(1);
  useEffect(() => void loadBestiary().then(setAll), []);
  const matches = useMemo(
    () => (all ? matchCreatures(all, { realm: realm || undefined, minMight: min, maxMight: max, q, books: sagaBooks ? (b) => data.isBookEnabled(b) : undefined }) : []),
    [all, realm, min, max, q, sagaBooks, data],
  );
  const cast = saga.cast ?? [];
  const byId = useMemo(() => new Map((all ?? []).map((c) => [c.id, c])), [all]);
  const addToCast = (c: Creature) =>
    updateSaga(saga.id, (s) => void (s.cast = [...(s.cast ?? []), { uid: uid(), creatureId: c.id, name: c.name, count: n, notes: '' }]));
  if (!all) return <p className="muted">Opening the bestiary…</p>;
  return (
    <div className="grid with-side wide-side">
      <div className="stack">
        <Card title="Roll an encounter" className="accent" tour="quick-creatures">
          <div className="row">
            <Field label="Realm">
              <select value={realm} onChange={(e) => setRealm(e.target.value as CreatureRealm | '')}>
                <option value="">Any</option>
                {REALMS.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </Field>
            <Field label="Might from">
              <Stepper value={min} min={0} max={max} width={36} onChange={setMin} />
            </Field>
            <Field label="to">
              <Stepper value={max} min={min} max={150} step={5} width={36} onChange={setMax} />
            </Field>
            <Field label="Name or text">
              <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="wolf, ghost, Ignem…" />
            </Field>
          </div>
          <label className="inline small">
            <input type="checkbox" checked={sagaBooks} onChange={(e) => setSagaBooks(e.target.checked)} /> Only from the saga&apos;s books
          </label>
          <div className="row" style={{ marginTop: 8 }}>
            <button className="primary" disabled={!matches.length} onClick={() => setShown(rollCreature(matches, seeded(newSeed())) ?? null)}>
              Roll one
            </button>
            <span className="small muted">
              {matches.length} of {all.length} creatures match
            </span>
          </div>
        </Card>
        {shown && (
          <Card
            title={shown.name}
            actions={
              <>
                <Stepper value={n} min={1} max={20} width={30} onChange={setN} title="How many" />
                <button className="small primary" onClick={() => addToCast(shown)}>
                  Add to the cast
                </button>
              </>
            }
          >
            <CreatureHead c={shown} />
            <Markdown text={shown.text} />
          </Card>
        )}
        <Card title={`Matches (${matches.length})`}>
          <div className="chip-row">
            {matches.slice(0, 80).map((c) => (
              <span key={c.id} className={`chip ${shown?.id === c.id ? 'on' : ''}`} onClick={() => setShown(c)} title={`${c.realm} Might ${c.might}`}>
                {c.name} <span className="muted">{c.might}</span>
              </span>
            ))}
          </div>
          {matches.length > 80 && <p className="small muted">The first 80; narrow the search to see the rest.</p>}
        </Card>
      </div>
      <div className="stack">
        <Card title={`The storyguide's cast (${cast.length})`} tour="quick-cast">
          {!cast.length && <p className="small muted">Creatures kept to hand for the next story. Roll or pick one, then Add to the cast.</p>}
          {cast.map((m) => {
            const c = byId.get(m.creatureId);
            return (
              <details key={m.uid} className="list-row" style={{ display: 'block' }}>
                <summary style={{ cursor: 'pointer' }}>
                  <b>{m.name}</b>
                  {m.count > 1 ? ` × ${m.count}` : ''} {c && <span className="small muted">({c.realm} {c.might})</span>}
                </summary>
                <div className="row" style={{ margin: '6px 0' }}>
                  <input
                    value={m.notes}
                    placeholder="Notes: where, why, what it wants"
                    style={{ flex: 1 }}
                    onChange={(e) => updateSaga(saga.id, (s) => void (s.cast = (s.cast ?? []).map((x) => (x.uid === m.uid ? { ...x, notes: e.target.value } : x))))}
                  />
                  <button className="small ghost" onClick={() => updateSaga(saga.id, (s) => void (s.cast = (s.cast ?? []).filter((x) => x.uid !== m.uid)))}>
                    Remove
                  </button>
                </div>
                {c ? (
                  <>
                    <CreatureHead c={c} />
                    <Markdown text={c.text} />
                  </>
                ) : (
                  <p className="small muted">No longer in the bestiary.</p>
                )}
              </details>
            );
          })}
        </Card>
      </div>
    </div>
  );
}

function CreatureHead({ c }: { c: Creature }) {
  return (
    <div className="small muted" style={{ marginBottom: 4 }}>
      {c.realm} Might {c.might}
      {c.form ? ` (${c.form})` : ''}
      {c.size !== null ? ` · Size ${c.size > 0 ? '+' : ''}${c.size}` : ''}
      {c.season ? ` · ${c.season}` : ''} · <BookBadge book={c.book} line={c.line} />
    </div>
  );
}
