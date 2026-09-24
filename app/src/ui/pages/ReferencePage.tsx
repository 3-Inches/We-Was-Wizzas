import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { BOOKS, BOOK_BY_ID, type VirtueFlawDef } from '../../data';
import { EX_MISC_TRADITIONS, HOUSES } from '../../data/houses';
import { useGameData } from '../../store/hooks';
import { useStore } from '../../store/store';
import { BookBadge, Card, Markdown, SearchInput, Tabs } from '../kit';

type TabId = 'vf' | 'abilities' | 'houses' | 'labvf' | 'hooks' | 'weapons' | 'books';

export default function ReferencePage() {
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as TabId) || 'vf';
  const activeSagaId = useStore((s) => s.activeSagaId);
  const saga = useStore((s) => (activeSagaId ? s.sagas[activeSagaId] : undefined));
  const [allBooks, setAllBooks] = useState(true);
  const data = useGameData(allBooks ? undefined : saga);
  return (
    <div>
      <div className="topbar">
        <h1>Rules reference</h1>
        {saga && (
          <label className="inline small">
            <input type="checkbox" checked={!allBooks} onChange={(e) => setAllBooks(!e.target.checked)} /> only books enabled in {saga.name}
          </label>
        )}
      </div>
      <Tabs
        tabs={[
          { id: 'vf', label: `Virtues & Flaws (${data.virtuesFlaws.filter((v) => data.isBookEnabled(v.source.book)).length})` },
          { id: 'abilities', label: `Abilities (${data.abilities.length})` },
          { id: 'houses', label: 'Houses of Hermes' },
          { id: 'labvf', label: `Laboratory V&F (${data.labVirtuesFlaws.length})` },
          { id: 'hooks', label: `Covenant Hooks & Boons (${data.hooksBoons.length})` },
          { id: 'weapons', label: 'Weapons & armor' },
          { id: 'books', label: 'Books' },
        ]}
        value={tab}
        onChange={(t) => setParams({ tab: t })}
      />
      {tab === 'vf' && <VFRef data={data} />}
      {tab === 'abilities' && <AbilityRef data={data} />}
      {tab === 'houses' && <HouseRef />}
      {tab === 'labvf' && <SimpleList items={data.labVirtuesFlaws.filter((v) => data.isBookEnabled(v.source.book)).map((v) => ({ id: v.id, name: v.name, tags: [`${v.size} ${v.kind}`, v.group], sub: v.modText, text: v.text, source: v.source }))} />}
      {tab === 'hooks' && <SimpleList items={data.hooksBoons.filter((v) => data.isBookEnabled(v.source.book)).map((v) => ({ id: v.id, name: v.name, tags: [`${v.size} ${v.kind}`, v.category ?? ''], sub: v.requires ? `Requires ${v.requires}` : '', text: v.deText ?? v.text, source: v.source }))} />}
      {tab === 'weapons' && <WeaponRef data={data} />}
      {tab === 'books' && <BookList />}
      <p className="small muted" style={{ marginTop: 12 }}>
        Spells and guidelines are under Spells & design; Shape & Material bonuses under Enchantments. Every entry links to its source in the built-in book reader.
      </p>
    </div>
  );
}

type Data = ReturnType<typeof useGameData>;

function VFRef({ data }: { data: Data }) {
  const [q, setQ] = useState('');
  const [kind, setKind] = useState('');
  const [size, setSize] = useState('');
  const [cat, setCat] = useState('');
  const [book, setBook] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [limit, setLimit] = useState(150);
  const cats = useMemo(() => [...new Set(data.virtuesFlaws.flatMap((v) => v.categories))].sort(), [data]);
  const books = useMemo(() => [...new Set(data.virtuesFlaws.map((v) => v.source.book))].sort(), [data]);
  const list = useMemo(() => {
    const qq = q.toLowerCase();
    return data.virtuesFlaws
      .filter((v) => data.isBookEnabled(v.source.book))
      .filter((v) => (!kind || v.kind === kind) && (!size || v.sizes.includes(size as VirtueFlawDef['sizes'][number])) && (!cat || v.categories.includes(cat as VirtueFlawDef['categories'][number])) && (!book || v.source.book === book))
      .filter((v) => !qq || v.name.toLowerCase().includes(qq) || v.text.toLowerCase().includes(qq))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [data, q, kind, size, cat, book]);
  return (
    <Card>
      <div className="row" style={{ marginBottom: 8 }}>
        <SearchInput value={q} onChange={setQ} placeholder="Search names and rules text" />
        <select value={kind} onChange={(e) => setKind(e.target.value)}>
          <option value="">Virtues & Flaws</option>
          <option value="virtue">Virtues</option>
          <option value="flaw">Flaws</option>
        </select>
        <select value={size} onChange={(e) => setSize(e.target.value)}>
          <option value="">Any size</option>
          <option>Major</option>
          <option>Minor</option>
          <option>Free</option>
        </select>
        <select value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="">Any category</option>
          {cats.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select value={book} onChange={(e) => setBook(e.target.value)}>
          <option value="">All books</option>
          {books.map((b) => (
            <option key={b} value={b}>
              {BOOK_BY_ID[b]?.abbr ?? b}
            </option>
          ))}
        </select>
      </div>
      <div className="small muted">{list.length} entries</div>
      {list.slice(0, limit).map((v) => (
        <div key={v.id} className="list-row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
          <div className="row">
            <span className="clickable" onClick={() => setOpen(open === v.id ? null : v.id)}>
              <b>{v.name}</b>
            </span>
            <span className={`badge ${v.kind === 'flaw' ? 'bad' : 'good'}`}>
              {v.sizes.join('/')} {v.kind}
            </span>
            {v.categories.map((c) => (
              <span key={c} className="badge">
                {c}
              </span>
            ))}
            {v.tainted && <span className="badge warn">tainted</span>}
            {v.effects?.some((e) => e.type !== 'note') && (
              <span className="badge info" title="The toolkit applies this Virtue/Flaw's mechanics automatically">
                automated
              </span>
            )}
            <BookBadge book={v.source.book} line={v.source.line} />
            {v.alsoIn?.map((s, i) => <BookBadge key={i} book={s.book} line={s.line} />)}
          </div>
          {open === v.id && (
            <>
              <Markdown text={v.text} />
              {v.effects
                ?.filter((e) => e.type === 'note')
                .map((e, i) => (
                  <div key={i} className="small soft">
                    Toolkit note: {(e as { text: string }).text}
                  </div>
                ))}
            </>
          )}
        </div>
      ))}
      {list.length > limit && <button onClick={() => setLimit(limit + 300)}>Show more</button>}
    </Card>
  );
}

function AbilityRef({ data }: { data: Data }) {
  const [q, setQ] = useState('');
  const [type, setType] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const types = [...new Set(data.abilities.map((a) => a.type))].sort();
  const list = data.abilities
    .filter((a) => (!type || a.type === type) && (!q || a.name.toLowerCase().includes(q.toLowerCase()) || a.text.toLowerCase().includes(q.toLowerCase())))
    .sort((a, b) => a.name.localeCompare(b.name));
  return (
    <Card>
      <div className="row" style={{ marginBottom: 8 }}>
        <SearchInput value={q} onChange={setQ} />
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">Any type</option>
          {types.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </div>
      {list.map((a) => (
        <div key={a.id} className="list-row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
          <div className="row">
            <span className="clickable" onClick={() => setOpen(open === a.id ? null : a.id)}>
              <b>{a.name}</b>
              {a.restricted ? '*' : ''}
            </span>
            <span className="badge">{a.type}</span>
            <BookBadge book={a.source.book} line={a.source.line} />
            {a.specialties.length > 0 && <span className="small muted">Specialties: {a.specialties.join(', ')}</span>}
          </div>
          {open === a.id && <Markdown text={a.text} />}
        </div>
      ))}
      <p className="small muted">* cannot be used without at least a score of 1.</p>
    </Card>
  );
}

function HouseRef() {
  return (
    <div className="grid grid-2">
      {HOUSES.map((h) => (
        <Card key={h.id} title={`House ${h.name}`}>
          <div className="row small">
            <span className="badge">{h.type}</span>
            <span className="muted">Domus Magna: {h.domusMagna}</span>
          </div>
          <p className="small">{h.description}</p>
          <p className="small">
            <b>House benefit:</b> {h.benefitText}
          </p>
          {h.notes?.map((n, i) => (
            <div key={i} className="small soft">
              • {n}
            </div>
          ))}
        </Card>
      ))}
      <Card title="Ex Miscellanea traditions (DE)">
        {EX_MISC_TRADITIONS.map((t) => (
          <div key={t.id} className="list-row small">
            <b>{t.name}</b>
          </div>
        ))}
      </Card>
    </div>
  );
}

function SimpleList({ items }: { items: { id: string; name: string; tags: string[]; sub: string; text: string; source: { book: string; line?: number } }[] }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const list = items.filter((i) => !q || i.name.toLowerCase().includes(q.toLowerCase()) || i.text.toLowerCase().includes(q.toLowerCase())).sort((a, b) => a.name.localeCompare(b.name));
  return (
    <Card>
      <SearchInput value={q} onChange={setQ} />
      <div className="small muted" style={{ margin: '6px 0' }}>
        {list.length} entries
      </div>
      {list.map((i) => (
        <div key={i.id} className="list-row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
          <div className="row">
            <span className="clickable" onClick={() => setOpen(open === i.id ? null : i.id)}>
              <b>{i.name}</b>
            </span>
            {i.tags.filter(Boolean).map((t) => (
              <span key={t} className="badge">
                {t}
              </span>
            ))}
            <BookBadge book={i.source.book} line={i.source.line} />
            <span className="small soft">{i.sub}</span>
          </div>
          {open === i.id && <Markdown text={i.text} />}
        </div>
      ))}
    </Card>
  );
}

function WeaponRef({ data }: { data: Data }) {
  return (
    <div className="grid grid-2">
      <Card title="Weapons">
        <div className="table-wrap">
          <table className="compact">
            <thead>
              <tr>
                <th>Weapon</th>
                <th>Ability</th>
                <th className="num">Init</th>
                <th className="num">Atk</th>
                <th className="num">Dfn</th>
                <th className="num">Dam</th>
                <th className="num">Str</th>
                <th className="num">Load</th>
                <th>Cost</th>
              </tr>
            </thead>
            <tbody>
              {data.weapons.map((w) => (
                <tr key={w.id}>
                  <td>{w.name}</td>
                  <td className="small">{w.ability}</td>
                  <td className="num">{w.init ?? '—'}</td>
                  <td className="num">{w.atk ?? '—'}</td>
                  <td className="num">{w.dfn ?? '—'}</td>
                  <td className="num">{w.dam ?? '—'}</td>
                  <td className="num">{w.str ?? '—'}</td>
                  <td className="num">{w.load ?? '—'}</td>
                  <td className="small">{w.cost}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <Card title="Armor">
        <table className="compact">
          <thead>
            <tr>
              <th>Armor</th>
              <th className="num">Partial prot/load</th>
              <th className="num">Full prot/load</th>
              <th>Cost</th>
            </tr>
          </thead>
          <tbody>
            {data.armor.map((a) => (
              <tr key={a.id}>
                <td>{a.name}</td>
                <td className="num">
                  {a.partialProt ?? '—'} / {a.partialLoad ?? '—'}
                </td>
                <td className="num">
                  {a.fullProt ?? '—'} / {a.fullLoad ?? '—'}
                </td>
                <td className="small">{a.cost}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function BookList() {
  const cats = [...new Set(BOOKS.map((b) => b.category))];
  return (
    <div className="grid grid-3">
      {cats.map((c) => (
        <Card key={c} title={c[0].toUpperCase() + c.slice(1)}>
          {BOOKS.filter((b) => b.category === c).map((b) => (
            <div key={b.id} className="list-row">
              <Link to={`/reference/book/${b.id}`}>{b.title}</Link>
              <span className="badge book">{b.abbr}</span>
              {b.status === 'wip' && <span className="badge warn">WIP</span>}
            </div>
          ))}
        </Card>
      ))}
    </div>
  );
}
