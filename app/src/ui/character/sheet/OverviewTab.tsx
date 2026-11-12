import { useState } from 'react';
import { CHARACTERISTICS, CHAR_NAMES } from '../../../data';
import { BookBadge, Card, Field, signed } from '../../kit';
import type { CharEditor } from '../useChar';
import { RollAtTable } from '../../play';
import { EffectsCard } from './EffectsCard';
import { PurseCard } from './PurseCard';
import { useSagaCovenants } from '../../../store/hooks';
import { useStore } from '../../../store/store';
import { COMPANION_FLAWS, CompanionSheetLink, CreatureCard } from './Creature';
import { EssentialTraitsCard } from '../EssentialTraits';
import { essentialTraits } from '../../../engine/character/magicCharacter';
import { VFText } from '../../VFText';
import { AgencyCard } from './AgencyCard';
import { ApprenticeCard } from './ApprenticeCard';
import { TribunalCard } from './TribunalCard';
import { SocietyCard } from './SocietyCard';
import { NeedsYouCard } from './NeedsYouCard';
import { HOLY_TRADITIONS, SOLOMON_RINGS } from '../../../data/divine';
import { holyMethodsOf, holyPowersOf } from '../../../engine/holy';
import { divineResistance } from '../../../engine/magic';
import type { DerivedCharacter } from '../../../engine/character/derive';
import type { Character } from '../../../engine/types';

/** The holy side, for reference: Methods and Powers, a tradition, a commanding aura, the Divine Ascent, a Ring of Solomon (RoP: The Divine). */
function HolyLine({ c, d }: { c: Character; d: DerivedCharacter }) {
  const h = c.holy;
  const methods = holyMethodsOf(d);
  const powers = holyPowersOf(d);
  const parts: string[] = [];
  if (methods.length || powers.length) parts.push(`${[...methods, ...powers].map((x) => `${x.name} ${x.score}`).join(', ')}`);
  const tradition = HOLY_TRADITIONS.find((t) => t.id === h?.tradition);
  if (tradition) parts.push(`${tradition.name} (favored: ${tradition.favored.join(', ')})`);
  if (h?.commandingAura) parts.push(`commanding aura: Magic Resistance ${divineResistance(d).find((p) => p.label.startsWith('Commanding'))?.value ?? h.commandingAura}, Aura of Rightful Authority at Voice range`);
  if (h?.ascent) parts.push(`Divine ${h.ascent === 'form' ? 'Form' : h.ascent === 'gloom' ? 'Gloom' : `Unity (${h.unity?.virtue ?? 'a virtue'})`}`);
  if (h?.notoria?.learned) parts.push(`Rings of Solomon: ${h.notoria.learned} learned${h.notoria.active ? `, the ${SOLOMON_RINGS[h.notoria.active.ring - 1].name} to ${h.notoria.active.untilSeason} ${h.notoria.active.untilYear}` : ''}`);
  if (h?.tragedies?.length) parts.push(h.tragedies.length === 1 ? 'a tragedy of hubris' : `${h.tragedies.length} tragedies of hubris`);
  if (!parts.length) return null;
  return (
    <div className="small" style={{ marginTop: 8 }} data-tour="sheet-holy">
      <b>Holy:</b> {parts.join(' · ')}
      <RollAtTable sagaId={c.sagaId} who={c.id} where="holy" what="Holy powers are called, miracles prayed for and saints invoked" />
    </div>
  );
}

export default function OverviewTab({ ed }: { ed: CharEditor }) {
  const { c, d, data, update, saga } = ed;
  const [openVf, setOpenVf] = useState<string | null>(null);
  const covs = useSagaCovenants(saga?.id);
  const updateCovenant = useStore((s) => s.updateCovenant);
  if (!c || !d || !saga) return null;
  const hasEffects = (c.activeEffects ?? []).length > 0;
  return (
    <div className="stack">
      <NeedsYouCard ed={ed} />
      {/* magic on the character leads when something is recorded; otherwise it waits below */}
      {hasEffects && <EffectsCard ed={ed} />}
      {c.creation.finalized && <PurseCard ed={ed} />}
      <div className="grid grid-2">
        <Card title="Characteristics" className="accent">
          <div className="char-grid">
            {CHARACTERISTICS.map((k) => (
              <div key={k} className="stat" title={d.characteristics[k].notes.join(', ')}>
                <span className="v">{signed(d.characteristics[k].value)}</span>
                <span className="l">{CHAR_NAMES[k]}</span>
                {c.characteristicNotes?.[k] && <span className="small muted">{c.characteristicNotes[k]}</span>}
                {(c.agingPoints[k] ?? 0) > 0 && <span className="small warn-text">{c.agingPoints[k]} aging pt</span>}
                {d.charSpecialties
                  .filter((sp) => sp.char === k)
                  .map((sp, i) => (
                    <span key={i} className="small good-text" title={`${sp.from}: when it applies, +1 and one fewer botch die`}>
                      {signed(d.characteristics[k].value + 1)} {sp.text ? `(${sp.text})` : '(specialty: write it in the Virtue note)'}
                    </span>
                  ))}
              </div>
            ))}
          </div>
          <div className="row" style={{ marginTop: 10 }}>
            <div className="stat">
              <span className="v">{signed(d.size)}</span>
              <span className="l">Size</span>
            </div>
            <div className="stat">
              <span className="v">{c.age}</span>
              <span className="l">Age</span>
            </div>
            <div className="stat">
              <span className="v">{d.warpingScore}</span>
              <span className="l">Warping ({d.warpingPoints})</span>
            </div>
            <div className="stat">
              <span className="v">{d.decrepitude}</span>
              <span className="l">Decrepitude</span>
            </div>
            {c.type !== 'grog' && (
              <div className="stat">
                <span className="v">
                  {d.confidence.score} ({d.confidence.points})
                </span>
                <span className="l">Confidence</span>
              </div>
            )}
            {(d.trueFaith > 0 || d.relicFaith > 0) && (
              <div className="stat" title="Faith Points can be spent like Confidence; Magic Resistance from True Faith (score × 10) or a relic (Faith × 10) does not stack with Parma (DE p.419)">
                <span className="v">{d.trueFaith > 0 ? `${d.trueFaith} (${d.faithPoints})` : d.relicFaith}</span>
                <span className="l">{d.trueFaith > 0 ? 'True Faith' : 'Relic Faith'}</span>
              </div>
            )}
          </div>
        </Card>
        <Card title="Standing">
          <Field label="Covenant">
            <select
              value={c.covenantId ?? ''}
              onChange={(e) => {
                const id = e.target.value || undefined;
                for (const cv of covs) if (cv.memberIds.includes(c.id) && cv.id !== id) updateCovenant(cv.id, (x) => void (x.memberIds = x.memberIds.filter((m) => m !== c.id)));
                if (id) updateCovenant(id, (x) => void (!x.memberIds.includes(c.id) && x.memberIds.push(c.id)));
                update((x) => void (x.covenantId = id));
              }}
            >
              <option value="">— none —</option>
              {covs.map((cv) => (
                <option key={cv.id} value={cv.id}>
                  {cv.name}
                </option>
              ))}
            </select>
          </Field>
          {c.type !== 'grog' && (
            <div className="small" style={{ marginTop: 8 }}>
              <b>Confidence:</b> Score {c.confidence.score}, {c.confidence.points} point{c.confidence.points === 1 ? '' : 's'}
              {d.trueFaith > 0 && (
                <>
                  {' · '}
                  <b>Faith Points:</b> {d.faithPoints} (True Faith {d.trueFaith}, Magic Resistance {d.trueFaith * 10})
                </>
              )}
            </div>
          )}
          {c.type === 'grog' && d.trueFaith > 0 && (
            <div className="small" style={{ marginTop: 8 }}>
              <b>Faith Points:</b> {d.faithPoints} (True Faith {d.trueFaith}, Magic Resistance {d.trueFaith * 10})
            </div>
          )}
          {(c.type !== 'grog' || d.trueFaith > 0) && <RollAtTable sagaId={c.sagaId} where="confidence" what="Confidence and Faith Points are given and spent" />}
          {d.relicFaith > 0 && (
            <div className="small" style={{ marginTop: 8 }}>
              <b>Relic:</b> Faith {d.relicFaith} (its Faith Points can be used as Confidence) · Magic Resistance {d.relicFaith * 10} · Divine Might {d.relicFaith * 10}, pool refreshed
              each sunrise; Infernal creatures of lower Might cannot come within {d.relicFaith * 10} feet (DE p.419).
              {(() => {
                const power = d.virtues.find((v) => v.cv.defId === 'powerful-relic')?.cv.param;
                return power ? ` Power: ${power}.` : '';
              })()}
            </div>
          )}
          <HolyLine c={c} d={d} />
          <div className="small" style={{ marginTop: 8 }}>
            <b>Personality:</b>{' '}
            {[...c.personality.map((p) => `${p.trait} ${signed(p.score)}`), ...essentialTraits(c).filter((x) => x.source !== 'its true form' && !x.source.startsWith('a Personality')).map((x) => `${x.trait} ${signed(x.score)}`)].join(', ') || '—'}
            {c.familiar?.silver ? <span className="muted"> (silver cord: {signed(c.familiar.silver)} to Personality rolls and to resisting mental influence)</span> : null}
          </div>
          <div className="small">
            <b>Reputations:</b> {d.reputations.map((r) => `${r.text} ${r.score} (${r.scope})`).join(', ') || '—'}
          </div>
          {d.giftType !== 'none' && (
            <div className="small">
              <b>The Gift:</b> {d.giftType}
              {d.socialPenalty ? ` — ${d.socialPenalty} to social rolls with mundanes and animals` : ' — no social penalty'}
            </div>
          )}
          {d.socialPenalties.map((p, i) => (
            <div key={i} className="small">
              <b>{p.from}:</b> a further {p.amount} to social rolls with {p.vs || 'the chosen beings'} (total {d.socialPenalty + p.amount})
            </div>
          ))}
          {d.virtues.some((v) => v.cv.defId === 'all-according-to-plan') && (
            <div className="small" style={{ marginTop: 6 }}>
              <b>All According to Plan:</b> {c.session?.aatpUsed ? 'used this session' : 'ready (reroll one botch die)'}
            </div>
          )}
          {c.sigil && (
            <div className="small">
              <b>Sigil:</b> {c.sigil}
            </div>
          )}
        </Card>
      </div>
      <Card title="Virtues & Flaws">
        <div className="grid grid-2">
          {(['virtue', 'flaw'] as const).map((k) => (
            <div key={k}>
              <h4>{k === 'virtue' ? 'Virtues' : 'Flaws'}</h4>
              {d.virtues
                .filter((v) => (v.def?.kind ?? 'virtue') === k)
                .map((v) => (
                  <div key={v.cv.uid} className="list-row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                    <div className="row">
                      <span className="clickable" onClick={() => setOpenVf(openVf === v.cv.uid ? null : v.cv.uid)}>
                        <b>{v.name}</b>
                      </span>
                      <span className="badge">{v.cv.size}</span>
                      {v.def?.categories.map((cat) => (
                        <span key={cat} className="badge">
                          {cat}
                        </span>
                      ))}
                      {v.def && <BookBadge book={v.def.source.book} anchor={v.def.source.anchor} line={v.def.source.line} />}
                    </div>
                    {openVf === v.cv.uid && v.def && <VFText def={v.def} data={data} notes={false} />}
                    {COMPANION_FLAWS.has(v.cv.defId) && <CompanionSheetLink ed={ed} uid={v.cv.uid} />}
                    {v.def?.effects?.filter((e) => e.type === 'note').map((e, i) => (
                      <div key={i} className="small soft">
                        {(e as { text: string }).text}
                      </div>
                    ))}
                  </div>
                ))}
            </div>
          ))}
        </div>
      </Card>
      {c.creature && <CreatureCard ed={ed} />}
      <EssentialTraitsCard ed={ed} />
      {!hasEffects && <EffectsCard ed={ed} />}
      <AgencyCard ed={ed} />
      <TribunalCard ed={ed} />
      <ApprenticeCard ed={ed} />
      <SocietyCard ed={ed} />
      <Card title="Notes">
        <textarea value={c.notes} rows={6} onChange={(e) => update((x) => void (x.notes = e.target.value))} placeholder="Session notes, goals, secrets…" />
      </Card>
    </div>
  );
}
