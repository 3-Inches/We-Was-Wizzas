import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ARTS, ART_NAMES, type Art } from '../../data';
import { deriveCharacter } from '../../engine/character/derive';
import { FREQUENCY, MATERIAL_BASE, SIZE_MULT, labTextCopyLevels, labTextWritingLevels, longevityBonus, longevityVisCost, maxTractatus, planSumma, tractatusQuality, visLimit } from '../../engine/enchant';
import { labTotal } from '../../engine/magic';
import { useCharacterContext, useGameData, useSaga, useSagaCharacters } from '../../store/hooks';
import { useStore } from '../../store/store';
import { Card, Empty, Field, SearchInput, Stepper, Tabs, Total } from '../kit';
import ItemsEditor from '../items/ItemEditor';

type TabId = 'items' | 'longevity' | 'vis' | 'writing' | 'tables';

export default function EnchantPage() {
  const { sagaId } = useParams();
  const saga = useSaga(sagaId);
  const data = useGameData(saga);
  const chars = useSagaCharacters(sagaId);
  const magi = chars.filter((c) => c.type === 'magus');
  const [charId, setCharId] = useState(magi[0]?.id ?? '');
  const [tab, setTab] = useState<TabId>('items');
  const c = useStore((s) => (charId ? s.characters[charId] : undefined));
  const updateCharacter = useStore((s) => s.updateCharacter);
  const ctx = useCharacterContext(c, data);
  const d = useMemo(() => (c && saga ? deriveCharacter(c, data, saga.houseRules) : undefined), [c, saga, data]);
  if (!saga) return <Empty>Saga not found.</Empty>;
  const lab = ctx.lab ? { generalQuality: ctx.lab.characteristics['General Quality'], specializations: ctx.lab.specializations } : undefined;
  return (
    <div>
      <div className="topbar">
        <h1>Laboratory workshop</h1>
        <Field label="Working magus">
          <select value={charId} onChange={(e) => setCharId(e.target.value)}>
            <option value="">— none —</option>
            {magi.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name || '(unnamed)'}
              </option>
            ))}
          </select>
        </Field>
      </div>
      {c && d && (
        <p className="small muted">
          {c.name}: aura {ctx.aura.realm} {ctx.aura.strength}
          {ctx.lab ? `, working in ${ctx.lab.lab.name}` : ', no laboratory assigned (assign one on the covenant page)'}; Magic Theory {d.abilities.find((a) => a.abilityId === 'magic-theory')?.total ?? 0}
          , vis limit {visLimit(d.abilities.find((a) => a.abilityId === 'magic-theory')?.total ?? 0)} pawns per season.
        </p>
      )}
      <Tabs
        tabs={[
          { id: 'items', label: 'Enchanted devices & talisman' },
          { id: 'longevity', label: 'Longevity Rituals' },
          { id: 'vis', label: 'Vis extraction' },
          { id: 'writing', label: 'Writing books & lab texts' },
          { id: 'tables', label: 'Shape & Material, tables' },
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === 'items' &&
        (c && d ? (
          <ItemsEditor
            items={c.items}
            onChange={(fn) => updateCharacter(c.id, (x) => fn(x.items))}
            data={data}
            d={d}
            aura={ctx.aura}
            lab={lab}
            talismanUid={c.talismanUid}
            onSetTalisman={(id) => updateCharacter(c.id, (x) => void (x.talismanUid = id))}
            title={`${c.name}'s enchanted items`}
          />
        ) : (
          <Empty>Choose a magus to enchant items.</Empty>
        ))}
      {tab === 'longevity' && (d ? <LongevityForOthers d={d} aura={ctx.aura} lab={lab} /> : <Empty>Choose a magus.</Empty>)}
      {tab === 'vis' && (d ? <VisExtraction d={d} aura={ctx.aura} lab={lab} /> : <Empty>Choose a magus.</Empty>)}
      {tab === 'writing' && (d ? <Writing d={d} /> : <Empty>Choose a character.</Empty>)}
      {tab === 'tables' && <Tables />}
    </div>
  );
}

type Props = { d: NonNullable<ReturnType<typeof deriveCharacter>>; aura: ReturnType<typeof useCharacterContext>['aura']; lab?: { generalQuality: number; specializations: Record<string, number> } };

function LongevityForOthers({ d, aura, lab }: Props) {
  const { sagaId } = useParams();
  const chars = useSagaCharacters(sagaId);
  const updateCharacter = useStore((s) => s.updateCharacter);
  const saga = useSaga(sagaId);
  const [subjectId, setSubjectId] = useState('');
  const [extra, setExtra] = useState(0);
  const [bonus, setBonus] = useState(0);
  const subject = chars.find((c) => c.id === subjectId);
  const self = subject?.id === d.char.id;
  const lt = labTotal(d, { technique: 'Cr', form: 'Co' }, { activity: 'longevity', aura, lab, forSelfLongevity: self, extra: bonus ? [{ label: 'Other (assistants, etc.)', value: bonus }] : [] });
  const total = lt.total + extra;
  const mundane = subject ? subject.type !== 'magus' && !subject.virtues.some((v) => /gift|supernatural/i.test(v.defId)) : true;
  const age = subject?.age ?? 35;
  const b = longevityBonus(lt.total, extra, mundane);
  const tooLow = !self && lt.total < 30;
  return (
    <Card title="Longevity Ritual" className="accent">
      <div className="row">
        <Field label="Subject">
          <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
            <option value="">— choose —</option>
            {chars.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name || '(unnamed)'} ({c.type}, age {c.age})
              </option>
            ))}
          </select>
        </Field>
        <div className="stat">
          <span className="v">
            <Total value={lt.total} parts={lt.parts} notes={lt.notes} label="Creo Corpus Lab Total" />
          </span>
          <span className="l">CrCo Lab Total</span>
        </div>
        <Field label="Other bonuses">
          <Stepper value={bonus} width={36} onChange={setBonus} />
        </Field>
        <Field label="Extra vis">
          <Stepper value={extra} min={0} width={36} onChange={setExtra} />
        </Field>
        <div className="stat">
          <span className="v">−{b}</span>
          <span className="l">{mundane ? 'Mundane: ÷10' : 'Magus / supernatural: ÷5'}</span>
        </div>
        <div className="stat">
          <span className="v">{longevityVisCost(age, extra)}</span>
          <span className="l">Pawns</span>
        </div>
      </div>
      {tooLow && <p className="small bad-text">A Longevity Ritual for someone else needs a Creo Corpus Lab Total of at least 30.</p>}
      {subject && (
        <button
          className="primary"
          disabled={tooLow}
          onClick={() =>
            updateCharacter(subject.id, (x) => void (x.longevity = { labTotal: total, bonus: b, extraVis: extra, forMundane: mundane, createdBy: d.char.name, createdYear: saga?.currentYear }))
          }
        >
          Give {subject.name} this ritual
        </button>
      )}
      <p className="small muted">The subject must be present all season. The ritual ends at the subject's next aging crisis; repeating it from the lab text needs only the vis.</p>
    </Card>
  );
}

function VisExtraction({ d, aura, lab }: Props) {
  const lt = labTotal(d, { technique: 'Cr', form: 'Vi' }, { activity: 'visExtraction', aura, lab });
  return (
    <Card title="Vis extraction (Creo Vim)" className="accent">
      <div className="row">
        <div className="stat">
          <span className="v">
            <Total value={lt.total} parts={lt.parts} notes={lt.notes} label="Creo Vim Lab Total" />
          </span>
          <span className="l">CrVi Lab Total</span>
        </div>
        <div className="stat">
          <span className="v">{Math.max(0, Math.ceil(lt.total / 10))}</span>
          <span className="l">Pawns of Vim per season</span>
        </div>
      </div>
      <p className="small muted">One pawn of Vim vis per ten points (or part) of the Creo Vim Lab Total, from a Magic aura. A season of lab work (DE p.250).</p>
    </Card>
  );
}

function Writing({ d }: Pick<Props, 'd'>) {
  const [subject, setSubject] = useState<string>('art:Cr');
  const [level, setLevel] = useState(10);
  const [bonus, setBonus] = useState(0);
  const isArt = subject.startsWith('art:');
  const score = isArt ? d.arts[subject.slice(4) as Art].score : d.abilityByUid.get(subject.slice(8))?.score ?? 0;
  const com = d.characteristics.Com.value;
  const latin = d.abilities.find((a) => /latin/i.test(a.name))?.total ?? 0;
  const scribe = d.abilities.find((a) => /scribe/i.test(a.name))?.total ?? 0;
  const goodWriter = d.virtues.some((v) => /good-teacher|book-?learner|skilled-author/.test(v.cv.defId));
  const plan = planSumma({ isArt, score, level, com, language: latin, qualityBonus: bonus });
  return (
    <div className="grid grid-2">
      <Card title="Summae & tractatus" className="accent">
        <div className="row">
          <Field label="Subject">
            <select value={subject} onChange={(e) => setSubject(e.target.value)}>
              <optgroup label="Arts">
                {ARTS.map((a) => (
                  <option key={a} value={`art:${a}`}>
                    {ART_NAMES[a]} ({d.arts[a].score})
                  </option>
                ))}
              </optgroup>
              <optgroup label="Abilities">
                {d.abilities.map((a) => (
                  <option key={a.uid} value={`ability:${a.uid}`}>
                    {a.name} ({a.score})
                  </option>
                ))}
              </optgroup>
            </select>
          </Field>
          <Field label="Summa level to write">
            <Stepper value={level} min={1} width={40} onChange={setLevel} />
          </Field>
          <Field label="Quality bonus (Virtues, Resonant materials)">
            <Stepper value={bonus} min={0} width={36} onChange={setBonus} />
          </Field>
        </div>
        {goodWriter && <p className="small info-text">This character has a Virtue that may add to book quality — include it in the bonus.</p>}
        <table className="compact" style={{ marginTop: 8 }}>
          <tbody>
            <tr>
              <td>Maximum summa level (half the score)</td>
              <td className="num">{plan.maxLevel}</td>
            </tr>
            <tr>
              <td>Summa quality (Com + 6 + bonus, +{isArt ? 1 : 3} per level below max, up to double)</td>
              <td className="num">{plan.quality}</td>
            </tr>
            <tr>
              <td>Points needed / per season (Com + Language)</td>
              <td className="num">
                {plan.pointsNeeded} / {plan.perSeason}
              </td>
            </tr>
            <tr>
              <td>
                <b>Seasons to write</b>
              </td>
              <td className="num">
                <b>{plan.seasons}</b>
              </td>
            </tr>
            <tr>
              <td>Tractatus quality (Com + 6 + bonus), one season</td>
              <td className="num">{tractatusQuality(com, bonus)}</td>
            </tr>
            <tr>
              <td>Tractatus the author can write on this subject (in total)</td>
              <td className="num">{maxTractatus(isArt, score)}</td>
            </tr>
          </tbody>
        </table>
      </Card>
      <Card title="Lab texts & copying">
        <table className="compact">
          <tbody>
            <tr>
              <td>Lab text levels written per season (Latin × 20)</td>
              <td className="num">{labTextWritingLevels(latin)}</td>
            </tr>
            <tr>
              <td>Lab text levels copied per season (Profession: Scribe × 60)</td>
              <td className="num">{labTextCopyLevels(scribe)}</td>
            </tr>
            <tr>
              <td>Careful copying of a summa: points per season (6 + Scribe)</td>
              <td className="num">{6 + scribe}</td>
            </tr>
            <tr>
              <td>Quick copying: three times as fast; copy quality −1</td>
              <td className="num">{3 * (6 + scribe)}</td>
            </tr>
          </tbody>
        </table>
        <p className="small muted">Casting tablets can only be written for mastered spells and use the same pool of levels as lab texts.</p>
      </Card>
    </div>
  );
}

function Tables() {
  const { sagaId } = useParams();
  const saga = useSaga(sagaId);
  const data = useGameData(saga);
  const [q, setQ] = useState('');
  const sm = data.shapeMaterial.filter((s) => !q || s.name.toLowerCase().includes(q.toLowerCase()) || s.bonuses.some((b) => b.effect.toLowerCase().includes(q.toLowerCase())));
  return (
    <div className="grid grid-2">
      <Card title={`Shape & Material bonuses (${data.shapeMaterial.length})`}>
        <SearchInput value={q} onChange={setQ} placeholder="Search e.g. 'fire', 'ring', 'ruby'" />
        <div className="scroll-y" style={{ maxHeight: 700, marginTop: 8 }}>
          <table className="compact">
            <tbody>
              {sm.map((s) => (
                <tr key={s.id}>
                  <td>
                    <b>{s.name}</b>
                  </td>
                  <td className="small">
                    {s.bonuses.map((b, i) => (
                      <div key={i}>
                        +{b.bonus} {b.effect}
                      </div>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <div className="stack">
        <Card title="Material & size (vis to open a device)">
          <table className="compact">
            <tbody>
              {Object.entries(MATERIAL_BASE).map(([m, v]) => (
                <tr key={m}>
                  <td>{m}</td>
                  <td className="num">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <table className="compact" style={{ marginTop: 8 }}>
            <tbody>
              {Object.entries(SIZE_MULT).map(([k, v]) => (
                <tr key={k}>
                  <td>{k}</td>
                  <td className="num">×{v.mult}</td>
                  <td className="small muted">{v.example}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="small muted">Pawns to open = material base × size multiplier. Each pawn opened allows 10 levels of effects.</p>
        </Card>
        <Card title="Effect modifiers">
          <table className="compact">
            <tbody>
              {FREQUENCY.map((f) => (
                <tr key={f.value}>
                  <td>{f.label}</td>
                  <td className="num">+{f.mod}</td>
                </tr>
              ))}
              <tr>
                <td>Penetration: +1 level per 2 points</td>
                <td />
              </tr>
              <tr>
                <td>Maintain concentration</td>
                <td className="num">+5</td>
              </tr>
              <tr>
                <td>Environmental trigger / restricted use / linked trigger</td>
                <td className="num">+3</td>
              </tr>
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}
