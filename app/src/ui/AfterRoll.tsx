// After the roll: Confidence, Faith and All According to Plan, under any roll a character makes at the
// Game Table. The points come off the character as they are spent (a point spent by mistake can be
// taken back while the roll is still showing); the total with them, and whether it now succeeds, is
// shown here. A new roll starts afresh (the caller keys this on the roll).

import { useState } from 'react';
import type { DerivedCharacter } from '../engine/character/derive';
import { rerollBotchDie } from '../engine/afterRoll';
import type { Character } from '../engine/types';
import { useStore } from '../store/store';
import { signed } from './kit';

export interface AfterRollChange {
  /** +3 a point spent */
  bonus: number;
  /** still a botch */
  botch: boolean;
  /** the botch dice now, after All According to Plan */
  faces?: number[];
  /** what happened, in a line, for a roll log */
  text: string;
}

export function AfterRoll({
  c,
  d,
  total,
  ease,
  botchFaces,
  what = 'Total',
  magical,
  judge,
  onChange,
}: {
  c: Character;
  d: DerivedCharacter;
  /** the roll's total as it fell (for a botch, what a plain zero would have made) */
  total: number;
  /** the Ease Factor or the total to beat, when there is one */
  ease?: number | null;
  /** the botch dice, when the roll botched */
  botchFaces?: number[] | null;
  /** what the total is: "Attack", "Casting total" */
  what?: string;
  /** a magical botch: each botch taken back by All According to Plan takes back its Warping Point */
  magical?: boolean;
  /** what a total comes to, where it is more than success or failure (a spell cast, with its Penetration) */
  judge?: (total: number) => string;
  onChange?: (x: AfterRollChange) => void;
}) {
  const updateCharacter = useStore((s) => s.updateCharacter);
  const [conf, setConf] = useState(0);
  const [faith, setFaith] = useState(0);
  const [faces, setFaces] = useState<number[] | null>(botchFaces?.length ? botchFaces : null);
  const [plan, setPlan] = useState('');
  const botches = faces ? faces.filter((f) => f === 0).length : 0;
  const botch = botches > 0;
  // a True Faith Score of 3 makes a Faith Point worth +6 (RoP: The Divine, Embodying the Light: Hope)
  const fv = d.trueFaith >= 3 ? 6 : 3;
  const bonus = 3 * conf + fv * faith;
  const now = total + bonus;
  const grog = c.type === 'grog';
  const confMore = !grog && conf < c.confidence.score && c.confidence.points > 0;
  const faithCap = Math.max(1, d.trueFaith);
  const faithMore = faith < faithCap && d.faithPoints > 0;
  const aatp = d.virtues.some((v) => v.cv.defId === 'all-according-to-plan');
  const aatpReady = aatp && !c.session?.aatpUsed;
  const tell = (x: Partial<AfterRollChange> & { text: string }) => onChange?.({ bonus, botch, faces: faces ?? undefined, ...x });
  const name = c.name || 'They';

  const spendConf = (n: 1 | -1) => {
    updateCharacter(c.id, (x) => void (x.confidence.points = Math.max(0, x.confidence.points - n)));
    const k = conf + n;
    setConf(k);
    tell({ bonus: 3 * k + fv * faith, text: n > 0 ? `${name} spends a Confidence Point: ${what.toLowerCase()} ${now + 3}.` : `A Confidence Point taken back: ${what.toLowerCase()} ${now - 3}.` });
  };
  const spendFaith = (n: 1 | -1) => {
    updateCharacter(c.id, (x) => void (x.faith = { score: d.trueFaith, points: Math.max(0, d.faithPoints - n) }));
    const k = faith + n;
    setFaith(k);
    tell({ bonus: 3 * conf + fv * k, text: n > 0 ? `${name} spends a Faith Point: ${what.toLowerCase()} ${now + fv}.` : `A Faith Point taken back: ${what.toLowerCase()} ${now - fv}.` });
  };
  const reroll = () => {
    if (!faces) return;
    const r = rerollBotchDie(faces);
    const gone = botches - r.botches;
    updateCharacter(c.id, (x) => {
      x.session = { ...(x.session ?? {}), aatpUsed: true };
      if (magical && gone > 0) x.warpingPoints = Math.max(0, x.warpingPoints - gone);
    });
    setFaces(r.faces);
    const text =
      r.botches === 0
        ? `All According to Plan: the botch die rerolled shows ${r.now}. No botch: the roll counts as a zero, ${what.toLowerCase()} ${total}.${magical ? ' Its Warping Point is taken back.' : ''}`
        : `All According to Plan: the botch die rerolled shows ${r.now === 0 ? 'another 0' : r.now}; ${r.botches} botch${r.botches > 1 ? 'es' : ''} left.${magical && gone ? ' One Warping Point is taken back.' : ''}`;
    setPlan(text);
    tell({ botch: r.botches > 0, faces: r.faces, text });
  };

  const hasAny = !grog || d.faithPoints > 0 || aatp;
  if (!hasAny) return null;
  const outcome = ease === null || ease === undefined ? '' : now >= ease ? 'success' : 'failure';
  return (
    <div className="after-roll small" data-tour="after-roll">
      <span className="after-roll-head">After the roll</span>
      {botch ? (
        <span className="row tight">
          <span className="bad-text">A botch: Confidence and Faith can&apos;t change it.</span>
          {aatpReady && (
            <button className="small" onClick={reroll} title="Once a session: the character planned for exactly this failure (describe the plan)">
              All According to Plan: reroll a botch die
            </button>
          )}
          {aatp && !aatpReady && !plan && <span className="muted">All According to Plan is used this session.</span>}
        </span>
      ) : (
        <>
          {!grog && (
            <span className="row tight" title={`+3 a point, after seeing the roll; at most ${c.confidence.score} on one roll (the Confidence Score)`}>
              Confidence ({c.confidence.points} left):
              <button className="small" disabled={!confMore} onClick={() => spendConf(1)}>
                Spend a point (+3)
              </button>
              {conf > 0 && (
                <button className="small ghost" onClick={() => spendConf(-1)} title="Spent by mistake: give it back">
                  ↺
                </button>
              )}
              {conf > 0 && <span className="muted">{conf} spent</span>}
            </span>
          )}
          {d.faithPoints + faith > 0 && (
            <span className="row tight" title={`While acting in accordance with God's will: +${fv} a point, at most ${faithCap} on one roll${d.trueFaith ? ' (the True Faith Score)' : ' (no True Faith Score: one at a time)'}`}>
              Faith ({d.faithPoints} left):
              <button className="small" disabled={!faithMore} onClick={() => spendFaith(1)}>
                Spend a point (+3)
              </button>
              {faith > 0 && (
                <button className="small ghost" onClick={() => spendFaith(-1)} title="Spent by mistake: give it back">
                  ↺
                </button>
              )}
            </span>
          )}
          {(bonus > 0 || plan) && (
            <b className={outcome === 'success' ? 'good-text' : outcome === 'failure' ? 'warn-text' : undefined}>
              {what} now {now}
              {bonus ? ` (${signed(bonus)})` : ''}
              {outcome ? `: ${outcome} against ${ease}` : ''}
              {judge ? `: ${judge(now)}` : ''}
            </b>
          )}
        </>
      )}
      {plan && <span className="soft" style={{ flexBasis: '100%' }}>{plan}</span>}
    </div>
  );
}
