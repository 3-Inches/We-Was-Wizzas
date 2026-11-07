// Secondary Insight (DE): a season studying a Technique from a book, a teacher or vis also gives a point
// of experience in four Forms; a Form, in two Techniques. Which Arts get it is the player's choice, set
// here once (in order) and used every season after; the lowest Arts make up the rest.

import { ART_NAMES, FORMS, TECHNIQUES, type Art } from '../../../data';
import { Card } from '../../kit';
import type { CharEditor } from '../useChar';

export function InsightCard({ ed }: { ed: CharEditor }) {
  const { c, update } = ed;
  if (!c || !c.virtues.some((v) => v.defId === 'secondary-insight')) return null;
  const chosen = c.insight ?? [];
  const toggle = (a: Art) => update((x) => void (x.insight = chosen.includes(a) ? chosen.filter((y) => y !== a) : [...chosen, a]));
  const row = (arts: readonly string[], label: string) => (
    <div className="row tight small" style={{ flexWrap: 'wrap' }}>
      <span className="muted" style={{ minWidth: 90 }}>{label}</span>
      {arts.map((a) => {
        const i = chosen.indexOf(a as Art);
        return (
          <button key={a} className={`small ${i >= 0 ? 'primary' : 'ghost'}`} onClick={() => toggle(a as Art)} aria-pressed={i >= 0} title={ART_NAMES[a as Art]}>
            {i >= 0 ? `${i + 1}. ` : ''}
            {ART_NAMES[a as Art]}
          </button>
        );
      })}
    </div>
  );
  return (
    <Card title="Secondary Insight" tour="secondary-insight" fold="secondary-insight" summary={chosen.length ? `First: ${chosen.map((a) => ART_NAMES[a]).join(', ')}.` : 'The lowest Arts get its points.'}>
      <p className="small muted" style={{ marginTop: 0 }}>
        A season studying a Technique from a book, a teacher or vis also gives a point of experience in four Forms; studying a Form, in two Techniques. Never the Art studied, one
        point at most in each, and no Affinity raises it. The ones picked here go first, in order; the lowest make up the rest. It is added as the season is logged.
      </p>
      {row(FORMS, 'Forms')}
      {row(TECHNIQUES, 'Techniques')}
    </Card>
  );
}
