import { R } from '../routes';
import { Link, useSearchParams } from 'react-router-dom';
import { BOOK_BY_ID } from '../../data';
import { OPTIONAL_RULES, OPTION_GROUPS, optionOn, tribunalMatches, tribunalName } from '../../engine/optional';
import { Tabs } from '../kit';
import { PLAYER_GUIDE, STORYGUIDE_GUIDE } from '../../data/roleplay';
import { TOOLKIT_GUIDE } from '../../data/toolkitGuide';
import { RoleplayGuide } from './RoleplayGuide';
import { useGameData } from '../../store/hooks';
import { MAGIC_QUALITIES } from '../../engine/character/magicCharacter';
import { useStore } from '../../store/store';
import { COURSE, TOURS, startTour, type TourGroup } from '../tour/tours';

const LEARN: { to: string; title: string; text: string }[] = [
  { to: '/mechanics/basics', title: 'The basics', text: 'How a roll works, Characteristics and Abilities, Personality Traits, Reputations and Confidence.' },
  { to: '/mechanics/creation', title: 'Making characters', text: 'Magi, companions, grogs and Mythic Companions, then the magical, faerie, holy and infernal characters of the other books.' },
  { to: '/mechanics/magic', title: 'Casting spells', text: 'Casting Totals, spontaneous and ritual magic, Penetration and Magic Resistance, Range, Duration and Target.' },
  { to: '/mechanics/seasons', title: 'Between stories', text: 'Seasons of study from books, teachers, practice and exposure, aging and Warping.' },
  { to: '/mechanics/lab', title: 'The laboratory', text: 'Lab Totals, inventing spells, enchanting items, familiars, longevity rituals and experimentation.' },
  { to: '/mechanics/combat', title: 'Combat & hazards', text: 'Fighting, wounds, Fatigue and recovery, poison, disease and the elements.' },
  { to: '/mechanics/covenant', title: 'Covenants', text: 'Boons and Hooks, Build Points, finances, covenfolk, vis sources and libraries.' },
  { to: '/mechanics/order', title: 'The Order of Hermes', text: 'The Code, Tribunals, Wizards’ War and the rules of each House.' },
  { to: '/mechanics/social', title: 'Society & influence', text: 'Social standing, wealth and trade, guilds, the Church, courts, agents and debate.' },
  { to: '/mechanics/realms', title: 'The Realms', text: 'Auras and regiones, the four realms, the Dominion, True Faith and miracles.' },
  { to: '/mechanics/beings', title: 'Creatures', text: 'Beings with Might: magic creatures, faeries, angels, demons, spirits and beasts.' },
  { to: '/mechanics/mysteries', title: 'Mysteries & initiation', text: 'Mystery Cults, Initiation, and the Hermetic Mysteries of the Houses and cults.' },
  { to: '/mechanics/traditions', title: 'Other traditions', text: 'Hedge magic, faerie wizards, holy and infernal magic, ancient traditions.' },
  { to: '/mechanics/setting', title: 'Sagas & setting', text: 'Troupe play, saga styles, and rules tied to the Tribunals and other places.' },
];

/** The subjects of Game Mechanics, each a link. */
function Learn() {
  return (
    <div className="grid grid-2" style={{ gap: 8, margin: '8px 0' }}>
      {LEARN.map((l) => (
        <Link key={l.to} to={l.to} className="card clickable" style={{ margin: 0, textDecoration: 'none', color: 'inherit', padding: '8px 12px' }}>
          <b>{l.title}</b>
          <div className="small muted">{l.text}</div>
        </Link>
      ))}
    </div>
  );
}

const GROUPS: TourGroup[] = ['Start here', 'The saga and covenant', 'Characters', 'Magic', 'In play', 'Storyguide'];

/** The guided tutorials, and the hints setting for those who want less help or more. */
function Tutorials() {
  const ui = useStore((s) => s.ui);
  const setHints = useStore((s) => s.setHints);
  const resetHints = useStore((s) => s.resetHints);
  const running = ui.tour ? TOURS.find((t) => t.id === ui.tour!.id) : undefined;
  return (
    <div>
      <p className="row small" style={{ alignItems: 'baseline' }}>
        <button className="primary" onClick={() => startTour(COURSE[0], { course: true })}>
          Take every tutorial in turn
        </button>
        <span className="muted">
          All {COURSE.length}, one after another in one saga, each building on the last. Skip any you know.
        </span>
      </p>
      {running && (
        <p className="small">
          <b>{running.title}</b> is under way (step {Math.min(ui.tour!.step, running.steps.length - 1) + 1} of {running.steps.length}); its panel is open.
        </p>
      )}
      <div className="stack" style={{ gap: 10 }}>
        {GROUPS.map((g) => (
          <div key={g}>
            <div className="small muted" style={{ marginBottom: 4 }}>
              {g}
            </div>
            <div className="grid grid-2" style={{ gap: 8 }}>
              {TOURS.filter((t) => t.group === g).map((t) => (
                <div key={t.id} className="list-row" style={{ alignItems: 'flex-start', gap: 10, margin: 0 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <b>{t.title}</b> <span className="small muted">{t.steps.length} steps</span>
                    <div className="small muted">{t.blurb}</div>
                  </div>
                  <button className="small" onClick={() => startTour(t.id)}>
                    {running?.id === t.id ? 'Restart' : 'Start'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="row small" style={{ marginTop: 12 }}>
        <label className="inline">
          <input type="checkbox" checked={ui.hints} onChange={(e) => setHints(e.target.checked)} /> Show hints for new players
        </label>
        <span className="muted">Short tips at the places people tend to get stuck, each with a <b>Got it</b> to hide it.</span>
        {ui.dismissedHints.length > 0 && (
          <button className="small ghost" onClick={resetHints}>
            Show the {ui.dismissedHints.length} hidden hint{ui.dismissedHints.length > 1 ? 's' : ''} again
          </button>
        )}
      </div>
    </div>
  );
}

/** The Guide's three pages: using the toolkit, playing the game, and running it. */
const GUIDE_TABS = ['toolkit', 'players', 'storyguides'] as const;
type GuideTab = (typeof GUIDE_TABS)[number];
const GUIDE_TAB_LABELS: Record<GuideTab, string> = { toolkit: TOOLKIT_GUIDE.tab, players: PLAYER_GUIDE.tab, storyguides: STORYGUIDE_GUIDE.tab };

export default function HelpPage() {
  const [params, setParams] = useSearchParams();
  const raw = params.get('tab');
  const tab: GuideTab = (GUIDE_TABS as readonly string[]).includes(raw ?? '') ? (raw as GuideTab) : 'toolkit';
  const setTab = (t: GuideTab) => {
    setParams(t === 'toolkit' ? {} : { tab: t }, { replace: true });
    window.scrollTo({ top: 0 });
  };
  return (
    <div className="stack" style={{ maxWidth: 960 }}>
      <div>
        <h1 style={{ marginBottom: 8 }}>Guide</h1>
        <div data-tour="guide-tabs">
          <Tabs tabs={GUIDE_TABS.map((id) => ({ id, label: GUIDE_TAB_LABELS[id] }))} value={tab} onChange={setTab} />
        </div>
      </div>
      {tab === 'toolkit' && <ToolkitGuide />}
      {tab === 'players' && (
        <RoleplayGuide
          guide={PLAYER_GUIDE}
          intro={
            <p className="small muted">
              Running the saga? The <a href="#/help?tab=storyguides">storyguide&apos;s page</a> is next door, and builds on this one.
            </p>
          }
        />
      )}
      {tab === 'storyguides' && (
        <RoleplayGuide
          guide={STORYGUIDE_GUIDE}
          intro={
            <p className="small muted">
              Start with the <a href="#/help?tab=players">players&apos; page</a>: what characters know about their world is yours to bring to life.
            </p>
          }
        />
      )}
    </div>
  );
}

/** The rules data the toolkit holds, counted from every book. */
function RulesDataCounts() {
  const data = useGameData();
  const n = (xs: readonly unknown[]) => xs.length.toLocaleString('en');
  return (
    <p className="small muted">
      It holds {n(data.virtuesFlaws)} Virtues and Flaws, {n(MAGIC_QUALITIES)} Magic Qualities and Inferiorities, {n(data.abilities)} Abilities, {n(data.spells)} spells,{' '}
      {n(data.guidelines)} guideline entries, {n(data.labVirtuesFlaws)} laboratory Virtues and Flaws, {n(data.hooksBoons)} Hooks and Boons and {n(data.shapeMaterial)} Shape &amp;
      Material entries.
    </p>
  );
}

/** Using the toolkit: its text is data (src/data/toolkitGuide.ts); the tutorials, the rules to learn from, the optional rules and the counts are drawn here. */
function ToolkitGuide() {
  return <RoleplayGuide guide={TOOLKIT_GUIDE} live={{ tutorials: <Tutorials />, learn: <Learn />, optional: <OptionalRules />, data: <RulesDataCounts /> }} />;
}

/** Every optional rule, from the rules list itself: what it adds, its book, where it shows, and whether it starts on. */
function OptionalRules() {
  const saga = useStore((s) => (s.activeSagaId ? s.sagas[s.activeSagaId] : undefined));
  return (
    <div>
      <p className="small">
        {saga && (
          <>
            <Link to={R.saga(saga.id, 'optional')}>Optional rules for {saga.name}</Link> ·{' '}
          </>
        )}
        <button className="small" onClick={() => startTour('optional')}>
          Show me where each one appears
        </button>
      </p>
      {OPTION_GROUPS.map((g) => (
        <div key={g} style={{ marginTop: 8 }}>
          <div className="small muted">{g === 'Tribunal' ? 'Tribunal customs' : g}</div>
          {OPTIONAL_RULES.filter((r) => r.group === g).map((r) => (
            <div key={r.id} className="small list-row" style={{ display: 'block' }}>
              <b>{r.label}</b> <span className="muted">({BOOK_BY_ID[r.book]?.abbr ?? r.book}{r.tribunal ? `, the ${tribunalName(r)} Tribunal` : ''})</span>: {r.summary}{' '}
              <span className="muted">
                Shows on: {r.where}. {r.tribunal ? 'Off until chosen.' : r.defaultOn ? 'Starts on.' : 'Starts off.'}
                {saga && (!r.tribunal || tribunalMatches(saga, r)) ? ` ${optionOn(saga, r.id) ? 'On' : 'Off'} in ${saga.name}.` : ''}
              </span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
