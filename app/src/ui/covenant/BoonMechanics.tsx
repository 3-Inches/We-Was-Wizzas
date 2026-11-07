// The controls for Boons and Hooks that change the covenant's people, its aura or its points
// (engine/covenantBoons.ts): a regio of another realm, an Immunity, inhuman covenfolk, a Useful
// Curse, the Local Language, an Edifice's Great Work, and what the loyalty and health Boons do.
import { useMemo } from 'react';
import {
  IMMUNITY_HAZARDS, IMMUNITY_INFLUENCES, INHUMAN, INHUMAN_NATURES, WARP_IMMUNE_NOTE, hookBoonPoints, inhumanCovenfolk, inhumanDefaultShare, isEdifice, isImmunity, isInhuman, isLocalLanguage, isRegioHook, isUsefulCurse,
} from '../../engine/covenantBoons';
import { DISEASES } from '../../engine/disease';
import type { Covenant, CovenantHookBoon, ImmunityKind, InhumanNature } from '../../engine/types';
import { uid } from '../../util/id';
import { Field, Stepper } from '../kit';
import type { CovTabProps } from './shared';

/** Whether a Boon or Hook has controls here. */
export const hasBoonControls = (hb: CovenantHookBoon) =>
  isRegioHook(hb) || isImmunity(hb) || isInhuman(hb) || isUsefulCurse(hb) || isLocalLanguage(hb) || isEdifice(hb) || !!BOON_EFFECT[`${hb.kind}:${hb.name.trim().toLowerCase()}`];

/** What a Boon or Hook does to the covenant's numbers, where it needs no choice. */
const BOON_EFFECT: Record<string, string> = {
  'boon:loyal covenfolk': 'Prevailing Loyalty: the points after the Base Loyalty are raised to 30 (+3).',
  'hook:rebellious covenfolk': 'Prevailing Loyalty: the points after the Base Loyalty are lowered to −75 (−5) until stories raise morale.',
  'boon:healthy feature': '+1 on the Aging rolls of those who live here (up to three times), and +10 loyalty points for the covenfolk’s living conditions.',
  'hook:unhealthy environment': '−1 on the Aging rolls of those who live here, except those with a longevity ritual (up to three times), and −10 loyalty points.',
  'boon:vivid environment': '+10 loyalty points: the beauty of the place counts as a step of living conditions (the toolkit’s reading of "bonuses for the calculations given in the Governance chapter").',
  'boon:literate covenfolk': 'Those made here read and write their language: Artes Liberales 1 (DE, Artes Liberales).',
  'hook:incompetent covenfolk': 'Those made here are a point worse at their work (the toolkit’s reading).',
  'hook:distorted covenfolk': 'Those made here start with a Warping Score of 1 (the toolkit’s reading).',
  'boon:prestige': 'A Reputation for the covenant: 9 for the Major Boon, 3 for the Minor; name the group in the detail.',
  'hook:infamous': 'An ill Reputation of 3 for the covenant; name the group in the detail.',
};

export function BoonControls({ hb, cov, update, dc, data }: CovTabProps & { hb: CovenantHookBoon }) {
  const edit = (fn: (h: CovenantHookBoon) => void) => update((x) => void fn(x.hooksBoons.find((y) => y.uid === hb.uid)!));
  const flaws = useMemo(() => data.virtuesFlaws.filter((v) => v.kind === 'flaw').sort((a, b) => a.name.localeCompare(b.name)), [data]);
  const pts = hookBoonPoints(hb, dc.members);
  const effect = BOON_EFFECT[`${hb.kind}:${hb.name.trim().toLowerCase()}`];

  if (isRegioHook(hb))
    return (
      <div className="row small">
        <Field label="The regio's realm">
          <select value={hb.regioRealm ?? ''} onChange={(e) => edit((h) => void (h.regioRealm = (e.target.value || undefined) as CovenantHookBoon['regioRealm']))}>
            <option value="">Magic</option>
            <option value="Faerie">Faerie</option>
            <option value="Divine">Divine</option>
            <option value="Infernal">Infernal</option>
          </select>
        </Field>
        <span className="muted">A regio that is not magical counts as an additional Minor Hook (Covenants ch.2).{pts.note ? ` This one is worth ${pts.hook} points.` : ''}</span>
      </div>
    );

  if (isImmunity(hb)) {
    const im = hb.immunity ?? { kind: 'hazard' as ImmunityKind, value: '' };
    const set = (kind: ImmunityKind, value: string) => edit((h) => void (h.immunity = { kind, value, share: h.immunity?.share }));
    const kinds: { id: ImmunityKind; label: string }[] = [
      { id: 'hazard', label: 'a form of damage' },
      { id: 'disease', label: 'a disease' },
      { id: 'influence', label: 'an influence' },
      { id: 'flaw' as ImmunityKind, label: hb.size === 'Major' ? 'a Flaw' : 'a Minor Flaw' },
    ];
    // the Major Boon may hold off any Flaw; the Minor (the troupe's ruling: the book gives the Minor only damage or influence) a Minor one
    const flawChoices = hb.size === 'Major' ? flaws : flaws.filter((f) => f.sizes.includes('Minor'));
    const chosenFlaw = im.kind === 'flaw' ? data.vfById.get(im.value) : undefined;
    return (
      <div className="stack small">
        <span className="muted">
          Within the covenant&apos;s aura everyone and everything is immune to it. As the Virtues: the Major Boon covers a common, deadly hazard (fire, iron, all disease),
          an influence or a Flaw; the Minor a rarer or lesser one, as the leprosarium&apos;s immunity to leprosy, a disease, which is held off while they stay but falls on them
          when they leave (DE, Greater and Lesser Immunity).
        </span>
        <div className="row">
          <Field label="Immune to">
            <select value={im.kind} onChange={(e) => set(e.target.value as ImmunityKind, '')}>
              {kinds.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label={im.kind === 'flaw' ? 'The Flaw' : im.kind === 'disease' ? 'The disease' : im.kind === 'influence' ? 'The influence' : 'The hazard'}>
            {im.kind === 'flaw' ? (
              <select value={im.value} onChange={(e) => set('flaw', e.target.value)}>
                <option value="">— choose —</option>
                {flawChoices.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                    {hb.size === 'Major' && !f.sizes.includes('Major') ? ' (Minor)' : hb.size === 'Major' && !f.sizes.includes('Minor') ? ' (Major)' : ''}
                  </option>
                ))}
              </select>
            ) : im.kind === 'disease' ? (
              <select value={im.value} onChange={(e) => set('disease', e.target.value)}>
                <option value="">— choose —</option>
                {hb.size === 'Major' && <option value="all">all disease</option>}
                {DISEASES.map((x) => (
                  <option key={x.name} value={x.name}>
                    {x.name}
                  </option>
                ))}
              </select>
            ) : (
              <>
                <input list={`imm-${hb.uid}`} value={im.value} onChange={(e) => set(im.kind, e.target.value)} placeholder={im.kind === 'influence' ? 'Warping, mind control…' : 'fire, cold, iron weapons…'} />
                <datalist id={`imm-${hb.uid}`}>
                  {(im.kind === 'influence' ? IMMUNITY_INFLUENCES : IMMUNITY_HAZARDS).map((x) => (
                    <option key={x} value={x} />
                  ))}
                </datalist>
              </>
            )}
          </Field>
          {im.kind === 'flaw' && im.value && (
            <Field label="Who has it (%)" hint="of those the toolkit makes for the covenant">
              <Stepper value={Math.round((im.share ?? 1) * 100)} min={0} max={100} step={10} width={40} onChange={(x) => edit((h) => void (h.immunity = { ...im, share: x / 100 }))} />
            </Field>
          )}
        </div>
        <span className="muted">
          {im.kind === 'disease'
            ? 'Those living here cannot catch it (the illness roll on each sheet), and a plague trouble passes the covenant by.'
            : im.kind === 'influence' && /warping/i.test(im.value)
              ? 'Nobody living here gains Warping from the aura at the year’s end.'
              : im.kind === 'flaw'
                ? `${chosenFlaw?.param ? `${chosenFlaw.name} is held off whatever its ${chosenFlaw.param.label}; each one made here takes one at random (any is held off alike). ` : ''}Grogs, companions and magi the toolkit makes for the covenant take this Flaw at that share, paired with the Immunity, and spend the Virtue points it gives; one it would take past their Flaw limits (a grog’s Major Flaw) takes it for no points. Specialists have it noted. A paired Flaw is held off while they live in the aura and is back when they leave (each sheet's Combat & Health tab). ${pts.note ? `Now ${pts.note} (${hb.size === 'Major' ? 3 : 1} Hook point${hb.size === 'Major' ? 's' : ''}, no Boon points).` : `A member whose Flaw is paired with it makes the Boon a ${hb.size === 'Major' ? 'Major' : 'Minor'} Hook (Covenants ch.2).`}`
                : 'It shows on the sheets of those who live here.'}
        </span>
      </div>
    );
  }

  if (isInhuman(hb)) {
    // the first Inhuman Residents Boon is the majority; taken again, each brings another kind (Covenants: Calebais)
    const boons = cov.hooksBoons.filter((h) => isInhuman(h) && h.kind === 'boon');
    const first = hb.kind === 'boon' && boons[0]?.uid === hb.uid;
    const v = hb.inhuman ?? { nature: 'faerie' as InhumanNature, share: inhumanDefaultShare(hb, first) };
    const n = INHUMAN[v.nature];
    const all = inhumanCovenfolk(cov);
    const mine = all?.groups.find((g) => g.uid === hb.uid);
    return (
      <div className="stack small">
        <div className="row">
          <Field label="They are">
            <select value={v.nature} onChange={(e) => edit((h) => void (h.inhuman = { ...v, nature: e.target.value as InhumanNature }))}>
              {INHUMAN_NATURES.map((k) => (
                <option key={k} value={k}>
                  {INHUMAN[k].label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Share of the covenfolk (%)" hint={hb.kind === 'boon' ? (first ? 'The Boon: the majority' : 'The Boon taken again: another kind besides') : 'The Hook: enough to draw attention'}>
            <Stepper value={Math.round(v.share * 100)} min={first ? 51 : 5} max={100} step={5} width={40} onChange={(x) => edit((h) => void (h.inhuman = { ...v, share: x / 100 }))} />
          </Field>
          <Field label="Their Might" hint="Taken off each season’s learning: 0 learns as a person, 4 or more nothing">
            <Stepper value={v.might ?? 0} min={0} max={30} width={36} onChange={(x) => edit((h) => void (h.inhuman = { ...v, might: x || undefined }))} />
          </Field>
        </div>
        {all && all.groups.length > 1 && (
          <span>
            With the covenant&apos;s other inhuman folk: {all.groups.map((g) => `${Math.round(g.share * 100)}% ${INHUMAN[g.nature].label.toLowerCase()}`).join(', ')}, {Math.round(all.share * 100)}% in all
            {mine && mine.share < v.share ? ` (this one is held to ${Math.round(mine.share * 100)}%: the shares cannot pass the whole)` : ''}.
          </span>
        )}
        <span className="muted">
          {n.rules} They are {WARP_IMMUNE_NOTE}. {n.noFood ? 'They eat nothing, so their share is left out of the Provisions bill' : ''}
          {n.noShelter ? ' and the Buildings bill' : ''}
          {n.noFood ? '. ' : ''}{n.learns} Grogs and specialists the toolkit makes here are one of them at this share; set a sheet&apos;s nature by hand on its Seasons &amp; Aging tab.
        </span>
      </div>
    );
  }

  if (isUsefulCurse(hb)) {
    const v = hb.curse ?? { what: '', bonus: 2, share: 0.25 };
    const set = (fn: (c: NonNullable<CovenantHookBoon['curse']>) => void) => edit((h) => void ((h.curse = { ...v }), fn(h.curse)));
    return (
      <div className="stack small">
        <div className="row">
          <Field label="The curse">
            <input value={v.what} onChange={(e) => set((c) => void (c.what = e.target.value))} placeholder="live as wolves for years" />
          </Field>
          <Field label="What it makes them better at">
            <select value={v.ability ?? ''} onChange={(e) => set((c) => void (c.ability = e.target.value || undefined))}>
              <option value="">— nothing on the sheet —</option>
              {data.abilities
                .filter((a) => a.type === 'General' || a.type === 'Martial')
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
            </select>
          </Field>
          <Field label="By">
            <Stepper value={v.bonus} min={1} max={5} width={30} onChange={(x) => set((c) => void (c.bonus = x))} />
          </Field>
          <Field label="Share of the covenfolk (%)">
            <Stepper value={Math.round(v.share * 100)} min={5} max={100} step={5} width={40} onChange={(x) => set((c) => void (c.share = x / 100))} />
          </Field>
        </div>
        <span className="muted">
          The book leaves its use to the troupe (wolves with human wits make guards and watchers). Those made here who suffer it are better at the Ability you choose.
        </span>
      </div>
    );
  }

  if (isLocalLanguage(hb))
    return (
      <div className="row small">
        <Field label="The language they speak">
          <input value={hb.language ?? ''} onChange={(e) => edit((h) => void (h.language = e.target.value || undefined))} placeholder="Vulgar Latin" />
        </Field>
        <span className="muted">A language useful to their masters; those made here are given it at 4.</span>
      </div>
    );

  if (isEdifice(hb)) {
    const work = cov.library.find((b) => b.boonUid === hb.uid);
    const books = cov.library.filter((b) => (b.kind === 'summa' || b.kind === 'tractatus') && !b.boonUid);
    const link = (bookUid: string) =>
      update((x) => {
        const b = x.library.find((y) => y.uid === bookUid)!;
        b.boonUid = hb.uid;
        b.make = { ...(b.make ?? {}), format: 'great-work', scribe: false, binder: false, illuminator: false };
      });
    return (
      <div className="stack small">
        <span className="muted">
          A building raised to inspire awe. A Great Work (learning built as a structure, read as a summa or tractatus: Covenants ch.7) may be this Edifice, at no Build
          Points, or bought as a book of its level and quality.
        </span>
        {work ? (
          <div className="row">
            <span>
              Its Great Work: <b>{work.title}</b> ({work.kind}, {work.subject}
              {work.kind === 'summa' ? ` L${work.level}` : ''} Q{work.quality}), no Build Points.
            </span>
            <button className="small ghost" onClick={() => update((x) => void delete x.library.find((b) => b.uid === work.uid)!.boonUid)}>
              Unlink
            </button>
          </div>
        ) : (
          <div className="row">
            <button
              className="small"
              onClick={() =>
                update((x: Covenant) =>
                  void x.library.push({ uid: uid(), title: 'A Great Work', kind: 'summa', subjectType: 'art', subject: 'Vi', level: 10, quality: 10, language: 'Latin', boonUid: hb.uid, make: { format: 'great-work' } }),
                )
              }
            >
              Make its Great Work
            </button>
            {books.length > 0 && (
              <select value="" onChange={(e) => e.target.value && link(e.target.value)}>
                <option value="">or make a book in the library its Great Work…</option>
                {books.map((b) => (
                  <option key={b.uid} value={b.uid}>
                    {b.title} ({b.kind} {b.subject} Q{b.quality})
                  </option>
                ))}
              </select>
            )}
          </div>
        )}
      </div>
    );
  }

  return effect ? <span className="small muted">{effect}</span> : null;
}
