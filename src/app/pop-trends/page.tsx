'use client';

import Link from 'next/link';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Edit2,
  Flame,
  Gamepad2,
  MessageCircle,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
  Star,
  Tags,
  Trash2,
} from 'lucide-react';

type TrendCategory = 'Slang' | 'Games' | 'Shows & Music' | 'Toys & Collectibles' | 'Style' | 'Watch';
type Familiarity = 'New to me' | 'Heard it' | 'I get it';

interface TrendCard {
  id: string;
  title: string;
  category: TrendCategory;
  signal: string;
  meaning: string;
  parentTranslation: string;
  askPrompt: string;
  watchOut: string;
  ageBand: string;
  status: Familiarity;
  pinned: boolean;
  updated: string;
}

const STORAGE_KEY = 'super_parent_pop_trend_cheatsheet';

const categories: TrendCategory[] = ['Slang', 'Games', 'Shows & Music', 'Toys & Collectibles', 'Style', 'Watch'];
const statuses: Familiarity[] = ['New to me', 'Heard it', 'I get it'];

const starterTrends: TrendCard[] = [
  {
    id: 'six-seven',
    title: '6-7',
    category: 'Slang',
    signal: 'Nonsense chant, classroom call-and-response, hand motion',
    meaning: 'Often used because it is funny to repeat, not because it has a fixed meaning.',
    parentTranslation: 'A social password. Kids are checking whether you are in on the joke.',
    askPrompt: 'Is this still funny at school, or is it already old?',
    watchOut: 'Can derail homework/classroom focus if it becomes a reflexive interruption.',
    ageBand: 'Tweens',
    status: 'New to me',
    pinned: true,
    updated: 'May 2026',
  },
  {
    id: 'labubu-charms',
    title: 'Labubu-style bag charms',
    category: 'Toys & Collectibles',
    signal: 'Tiny collectible character charms clipped to backpacks and bags',
    meaning: 'Cute-weird collectibles that work as status signals and trading conversation starters.',
    parentTranslation: 'Part toy, part fashion accessory, part “do you know this character?” badge.',
    askPrompt: 'Which characters are popular right now, and are people trading them?',
    watchOut: 'Watch resale pricing, fakes, and pressure to collect a whole set.',
    ageBand: 'Kids + tweens',
    status: 'Heard it',
    pinned: false,
    updated: 'May 2026',
  },
  {
    id: 'pokemon-cards',
    title: 'Pokemon cards',
    category: 'Toys & Collectibles',
    signal: 'Trading, binders, rare pulls, playground value debates',
    meaning: 'A classic collectible loop that keeps cycling back through elementary school.',
    parentTranslation: 'The fun is the social economy as much as the card game.',
    askPrompt: 'Which cards are cool because they look good, and which are cool because they are rare?',
    watchOut: 'Set house rules before cards go to school; trades can get emotional fast.',
    ageBand: 'Elementary + tweens',
    status: 'I get it',
    pinned: true,
    updated: 'May 2026',
  },
  {
    id: 'roblox-obby',
    title: 'Roblox obbies',
    category: 'Games',
    signal: 'Obstacle courses, timed jumps, “one more try” frustration',
    meaning: 'Short challenge games inside Roblox, usually built around jumping and timing.',
    parentTranslation: 'Digital playground games with endless variations and lots of peer recommendations.',
    askPrompt: 'What makes an obby good: difficulty, funny traps, or playing with friends?',
    watchOut: 'Keep an eye on chat settings, private servers, and in-game purchases.',
    ageBand: 'Kids + tweens',
    status: 'Heard it',
    pinned: false,
    updated: 'May 2026',
  },
  {
    id: 'kpop-demon-hunters',
    title: 'KPop Demon Hunters',
    category: 'Shows & Music',
    signal: 'Soundtrack clips, character favorites, cosplay-ish outfit talk',
    meaning: 'Streaming pop-culture crossover: music fandom plus animated action/fantasy energy.',
    parentTranslation: 'The hook is not just the story; it is songs, characters, and repeatable bits.',
    askPrompt: 'Who has the best song, and who would you be in the group?',
    watchOut: 'If younger kids are watching clips, check whether they are seeing edits from the show or unrelated fan content.',
    ageBand: 'Kids + tweens',
    status: 'New to me',
    pinned: false,
    updated: 'May 2026',
  },
  {
    id: 'brain-rot',
    title: 'Brain rot',
    category: 'Watch',
    signal: 'Kids calling something chaotic, repetitive, or absurd “brain rot”',
    meaning: 'A label for extremely online, low-context humor that can feel deliberately nonsensical.',
    parentTranslation: 'Sometimes it means “this is dumb.” Sometimes it means “this is dumb and I love it.”',
    askPrompt: 'Is this good brain rot or annoying brain rot?',
    watchOut: 'Great moment to talk about attention, sleep, and when short-form video stops being fun.',
    ageBand: 'Tweens + teens',
    status: 'Heard it',
    pinned: true,
    updated: 'May 2026',
  },
];

const blankTrend: Omit<TrendCard, 'id' | 'pinned' | 'updated'> = {
  title: '',
  category: 'Slang',
  signal: '',
  meaning: '',
  parentTranslation: '',
  askPrompt: '',
  watchOut: '',
  ageBand: '',
  status: 'New to me',
};

function createId() {
  return `trend-${Math.random().toString(16).slice(2)}-${Date.now()}`;
}

function getStatusClass(status: Familiarity) {
  if (status === 'I get it') return 'statusGotIt';
  if (status === 'Heard it') return 'statusHeard';
  return 'statusNew';
}

export default function PopTrendsPage() {
  const [mounted, setMounted] = useState(false);
  const [trends, setTrends] = useState<TrendCard[]>(starterTrends);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<TrendCategory | 'All'>('All');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState(blankTrend);

  useEffect(() => {
    setMounted(true);
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setTrends(JSON.parse(saved));
      } catch {
        setTrends(starterTrends);
      }
    }
  }, []);

  useEffect(() => {
    if (mounted) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trends));
    }
  }, [mounted, trends]);

  const filteredTrends = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return trends
      .filter((trend) => category === 'All' || trend.category === category)
      .filter((trend) => {
        if (!needle) return true;
        return [
          trend.title,
          trend.category,
          trend.signal,
          trend.meaning,
          trend.parentTranslation,
          trend.askPrompt,
          trend.watchOut,
          trend.ageBand,
        ]
          .join(' ')
          .toLowerCase()
          .includes(needle);
      })
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || a.title.localeCompare(b.title));
  }, [category, query, trends]);

  const pinnedCount = trends.filter((trend) => trend.pinned).length;
  const knownCount = trends.filter((trend) => trend.status === 'I get it').length;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft.title.trim()) return;

    if (editingId) {
      setTrends((current) =>
        current.map((trend) =>
          trend.id === editingId
            ? { ...trend, ...draft, title: draft.title.trim(), updated: 'Updated locally' }
            : trend
        )
      );
    } else {
      setTrends((current) => [
        {
          ...draft,
          id: createId(),
          title: draft.title.trim(),
          pinned: false,
          updated: 'Added locally',
        },
        ...current,
      ]);
    }

    setEditingId(null);
    setDraft(blankTrend);
  };

  const handleEdit = (trend: TrendCard) => {
    setEditingId(trend.id);
    setDraft({
      title: trend.title,
      category: trend.category,
      signal: trend.signal,
      meaning: trend.meaning,
      parentTranslation: trend.parentTranslation,
      askPrompt: trend.askPrompt,
      watchOut: trend.watchOut,
      ageBand: trend.ageBand,
      status: trend.status,
    });
  };

  const handleDelete = (id: string) => {
    if (confirm('Remove this trend card?')) {
      setTrends((current) => current.filter((trend) => trend.id !== id));
    }
  };

  const handleReset = () => {
    if (confirm('Reset trend cheatsheet to the starter deck? Your local cards will be removed.')) {
      setTrends(starterTrends);
      setEditingId(null);
      setDraft(blankTrend);
      setQuery('');
      setCategory('All');
    }
  };

  if (!mounted) {
    return (
      <main className="trendAppShell sp-variant-knowledge">
        <div className="trendLoading">Loading trend deck...</div>
      </main>
    );
  }

  return (
    <main className="trendAppShell sp-variant-knowledge">
      <style jsx>{`
        .trendAppShell {
          min-height: 100vh;
          color: #171314;
          background:
            radial-gradient(circle at top left, rgba(255, 220, 46, 0.44), transparent 30rem),
            radial-gradient(circle at 80% 10%, rgba(48, 213, 200, 0.28), transparent 24rem),
            linear-gradient(135deg, #fff7cf 0%, #f8fbff 42%, #ffe4ef 100%);
          padding: 1.25rem;
          overflow: hidden;
          position: relative;
        }

        .trendAppShell::before {
          content: '';
          position: fixed;
          inset: 0;
          background-image:
            linear-gradient(rgba(23, 19, 20, 0.055) 1px, transparent 1px),
            linear-gradient(90deg, rgba(23, 19, 20, 0.055) 1px, transparent 1px);
          background-size: 28px 28px;
          pointer-events: none;
        }

        .trendPage {
          position: relative;
          width: min(1500px, 100%);
          margin: 0 auto;
        }

        .trendHeader {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 1rem;
          align-items: start;
          margin-bottom: 1rem;
        }

        .backLink {
          color: #171314;
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.8rem;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-bottom: 0.85rem;
        }

        .titleRow {
          display: flex;
          align-items: center;
          gap: 0.85rem;
          flex-wrap: wrap;
        }

        .titleBadge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 3.2rem;
          height: 3.2rem;
          background: #171314;
          color: var(--app-accent-2);
          border: 3px solid #171314;
          box-shadow: 6px 6px 0 var(--app-accent-3);
          transform: rotate(-4deg);
        }

        h1 {
          font-size: clamp(2.15rem, 5vw, 5.2rem);
          line-height: 0.95;
          letter-spacing: 0;
          text-transform: uppercase;
          max-width: 920px;
        }

        .dek {
          margin-top: 0.8rem;
          max-width: 760px;
          color: #443a3d;
          font-size: 1rem;
          font-weight: 650;
        }

        .statsStrip {
          display: grid;
          grid-template-columns: repeat(3, minmax(120px, 1fr));
          gap: 0.65rem;
          min-width: 370px;
        }

        .statTile {
          background: #ffffff;
          border: 3px solid #171314;
          box-shadow: 5px 5px 0 #171314;
          padding: 0.8rem;
        }

        .statTile strong {
          display: block;
          font-size: 1.9rem;
          line-height: 1;
          font-family: var(--font-heading);
        }

        .statTile span {
          display: block;
          margin-top: 0.25rem;
          font-size: 0.72rem;
          font-weight: 900;
          text-transform: uppercase;
          color: #5a4d50;
        }

        .controlBand {
          display: grid;
          grid-template-columns: minmax(240px, 1fr) auto auto;
          gap: 0.75rem;
          align-items: center;
          background: #171314;
          color: #ffffff;
          border: 3px solid #171314;
          box-shadow: 8px 8px 0 var(--app-accent);
          padding: 0.8rem;
          margin-bottom: 1.25rem;
        }

        .searchBox,
        .categorySelect {
          display: flex;
          align-items: center;
          gap: 0.55rem;
          background: #ffffff;
          color: #171314;
          border: 2px solid #ffffff;
          padding: 0.55rem 0.7rem;
          min-height: 44px;
        }

        .searchBox input,
        .categorySelect select {
          width: 100%;
          border: 0;
          outline: 0;
          background: transparent;
          color: #171314;
          font-size: 0.95rem;
          font-weight: 800;
        }

        .popButton {
          border: 2px solid #ffffff;
          background: var(--app-accent-2);
          color: #171314;
          min-height: 44px;
          padding: 0.55rem 0.85rem;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.45rem;
          font-weight: 950;
          cursor: pointer;
          box-shadow: 3px 3px 0 #ffffff;
          transition: transform 0.16s ease, box-shadow 0.16s ease;
          white-space: nowrap;
        }

        .popButton:hover {
          transform: translate(-1px, -1px);
          box-shadow: 5px 5px 0 #ffffff;
        }

        .popButton.secondary {
          background: var(--app-accent-3);
        }

        .workspace {
          display: grid;
          grid-template-columns: 350px minmax(0, 1fr);
          gap: 1.1rem;
          align-items: start;
        }

        .editorPanel {
          position: sticky;
          top: 1rem;
          background: #fff;
          border: 3px solid #171314;
          box-shadow: 8px 8px 0 var(--app-accent-3);
          padding: 1rem;
        }

        .panelHead {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 0.8rem;
        }

        .panelHead h2 {
          font-size: 1.2rem;
          text-transform: uppercase;
        }

        .formGrid {
          display: grid;
          gap: 0.75rem;
        }

        .field label {
          display: block;
          margin-bottom: 0.25rem;
          font-size: 0.72rem;
          font-weight: 950;
          text-transform: uppercase;
        }

        .field input,
        .field select,
        .field textarea {
          width: 100%;
          border: 2px solid #171314;
          background: #fffdf4;
          color: #171314;
          padding: 0.55rem 0.6rem;
          font-weight: 700;
          font-size: 0.9rem;
          outline: 0;
        }

        .field textarea {
          min-height: 74px;
          resize: vertical;
        }

        .formActions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.55rem;
        }

        .trendGrid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(285px, 1fr));
          gap: 1rem;
          align-items: stretch;
        }

        .trendCard {
          background: #ffffff;
          border: 3px solid #171314;
          box-shadow: 7px 7px 0 #171314;
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          min-height: 410px;
        }

        .trendCard:nth-child(4n + 1) {
          background: #fff7bf;
        }

        .trendCard:nth-child(4n + 2) {
          background: #e7fbff;
        }

        .trendCard:nth-child(4n + 3) {
          background: #ffe8f1;
        }

        .trendCardHeader {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 0.75rem;
        }

        .trendCard h3 {
          font-size: 1.35rem;
          text-transform: uppercase;
        }

        .categoryPill,
        .agePill,
        .statusPill {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          width: fit-content;
          border: 2px solid #171314;
          background: #ffffff;
          color: #171314;
          padding: 0.2rem 0.45rem;
          font-size: 0.7rem;
          font-weight: 950;
          text-transform: uppercase;
        }

        .statusNew {
          background: var(--app-accent);
          color: #ffffff;
        }

        .statusHeard {
          background: var(--app-accent-2);
        }

        .statusGotIt {
          background: var(--app-accent-3);
        }

        .cardActions {
          display: flex;
          gap: 0.35rem;
        }

        .iconButton {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 2rem;
          height: 2rem;
          background: #ffffff;
          color: #171314;
          border: 2px solid #171314;
          cursor: pointer;
        }

        .iconButton.active {
          background: #ffdc2e;
        }

        .signalLine {
          font-size: 0.88rem;
          font-weight: 850;
          color: #42383a;
          border-top: 2px dashed rgba(23, 19, 20, 0.28);
          border-bottom: 2px dashed rgba(23, 19, 20, 0.28);
          padding: 0.55rem 0;
        }

        .translationBlock {
          display: grid;
          gap: 0.55rem;
        }

        .translationBlock div {
          background: rgba(255, 255, 255, 0.72);
          border: 2px solid rgba(23, 19, 20, 0.22);
          padding: 0.55rem;
        }

        .translationBlock strong {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.72rem;
          text-transform: uppercase;
          margin-bottom: 0.25rem;
        }

        .translationBlock p {
          color: #2c2527;
          font-size: 0.86rem;
          font-weight: 650;
        }

        .cardFoot {
          margin-top: auto;
          display: flex;
          justify-content: space-between;
          gap: 0.75rem;
          align-items: center;
          color: #5a4d50;
          font-size: 0.75rem;
          font-weight: 900;
        }

        .emptyState,
        .trendLoading {
          background: #ffffff;
          border: 3px solid #171314;
          box-shadow: 8px 8px 0 var(--app-accent);
          padding: 2rem;
          font-weight: 900;
          text-align: center;
        }

        @media (max-width: 1050px) {
          .trendHeader,
          .workspace,
          .controlBand {
            grid-template-columns: 1fr;
          }

          .statsStrip {
            min-width: 0;
          }

          .editorPanel {
            position: static;
          }
        }

        @media (max-width: 620px) {
          .trendAppShell {
            padding: 0.75rem;
          }

          .statsStrip {
            grid-template-columns: 1fr;
          }

          .trendGrid {
            grid-template-columns: 1fr;
          }

          .controlBand {
            box-shadow: 5px 5px 0 var(--app-accent);
          }

          .trendCard,
          .editorPanel,
          .statTile {
            box-shadow: 4px 4px 0 #171314;
          }
        }
      `}</style>

      <div className="trendPage">
        <header className="trendHeader">
          <div>
            <Link href="/" className="backLink">
              <ArrowLeft size={14} />
              Super Parent Toolkit
            </Link>
            <div className="titleRow">
              <span className="titleBadge">
                <Flame size={30} />
              </span>
              <h1>Pop Trend Cheatsheet</h1>
            </div>
            <p className="dek">
              Decode the fast-moving bits: slang, playground economies, games, shows, and watch-outs worth asking about.
            </p>
          </div>

          <div className="statsStrip" aria-label="Trend deck stats">
            <div className="statTile">
              <strong>{trends.length}</strong>
              <span>Trend cards</span>
            </div>
            <div className="statTile">
              <strong>{pinnedCount}</strong>
              <span>Pinned</span>
            </div>
            <div className="statTile">
              <strong>{knownCount}</strong>
              <span>Decoded</span>
            </div>
          </div>
        </header>

        <section className="controlBand" aria-label="Filter trends">
          <label className="searchBox">
            <Search size={18} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search slang, Roblox, cards, watch-outs..."
            />
          </label>

          <label className="categorySelect">
            <Tags size={18} />
            <select value={category} onChange={(event) => setCategory(event.target.value as TrendCategory | 'All')}>
              <option value="All">All signals</option>
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <button type="button" className="popButton secondary" onClick={handleReset}>
            <RefreshCw size={17} />
            Reset deck
          </button>
        </section>

        <div className="workspace">
          <aside className="editorPanel">
            <div className="panelHead">
              <h2>{editingId ? 'Edit card' : 'Add a signal'}</h2>
              <Sparkles size={20} />
            </div>

            <form className="formGrid" onSubmit={handleSubmit}>
              <div className="field">
                <label htmlFor="trendTitle">Trend name</label>
                <input
                  id="trendTitle"
                  value={draft.title}
                  onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
                  placeholder="e.g. a phrase, game, toy, song"
                  required
                />
              </div>

              <div className="field">
                <label htmlFor="trendCategory">Category</label>
                <select
                  id="trendCategory"
                  value={draft.category}
                  onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value as TrendCategory }))}
                >
                  {categories.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label htmlFor="trendSignal">What you might notice</label>
                <textarea
                  id="trendSignal"
                  value={draft.signal}
                  onChange={(event) => setDraft((current) => ({ ...current, signal: event.target.value }))}
                  placeholder="Where it shows up: school, YouTube, Roblox, backpack..."
                />
              </div>

              <div className="field">
                <label htmlFor="trendMeaning">What it means</label>
                <textarea
                  id="trendMeaning"
                  value={draft.meaning}
                  onChange={(event) => setDraft((current) => ({ ...current, meaning: event.target.value }))}
                  placeholder="Plain English version"
                />
              </div>

              <div className="field">
                <label htmlFor="trendTranslation">Parent translation</label>
                <textarea
                  id="trendTranslation"
                  value={draft.parentTranslation}
                  onChange={(event) => setDraft((current) => ({ ...current, parentTranslation: event.target.value }))}
                  placeholder="Why kids care about it"
                />
              </div>

              <div className="field">
                <label htmlFor="trendPrompt">Ask your kid</label>
                <textarea
                  id="trendPrompt"
                  value={draft.askPrompt}
                  onChange={(event) => setDraft((current) => ({ ...current, askPrompt: event.target.value }))}
                  placeholder="A low-cringe conversation starter"
                />
              </div>

              <div className="field">
                <label htmlFor="trendWatch">Watch-out</label>
                <textarea
                  id="trendWatch"
                  value={draft.watchOut}
                  onChange={(event) => setDraft((current) => ({ ...current, watchOut: event.target.value }))}
                  placeholder="Spending, chat, attention, school rules..."
                />
              </div>

              <div className="field">
                <label htmlFor="trendAge">Age band</label>
                <input
                  id="trendAge"
                  value={draft.ageBand}
                  onChange={(event) => setDraft((current) => ({ ...current, ageBand: event.target.value }))}
                  placeholder="e.g. Elementary, tweens"
                />
              </div>

              <div className="field">
                <label htmlFor="trendStatus">My familiarity</label>
                <select
                  id="trendStatus"
                  value={draft.status}
                  onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value as Familiarity }))}
                >
                  {statuses.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <div className="formActions">
                <button type="submit" className="popButton">
                  <Plus size={17} />
                  {editingId ? 'Save' : 'Add'}
                </button>
                <button
                  type="button"
                  className="popButton secondary"
                  onClick={() => {
                    setEditingId(null);
                    setDraft(blankTrend);
                  }}
                >
                  Clear
                </button>
              </div>
            </form>
          </aside>

          <section className="trendGrid" aria-label="Trend cheatsheet cards">
            {filteredTrends.length === 0 ? (
              <div className="emptyState">No trend cards match that filter.</div>
            ) : (
              filteredTrends.map((trend) => (
                <article className="trendCard" key={trend.id}>
                  <div className="trendCardHeader">
                    <div>
                      <div className="categoryPill">{trend.category}</div>
                      <h3>{trend.title}</h3>
                    </div>
                    <div className="cardActions">
                      <button
                        type="button"
                        className={`iconButton ${trend.pinned ? 'active' : ''}`}
                        aria-label={trend.pinned ? 'Unpin trend' : 'Pin trend'}
                        title={trend.pinned ? 'Unpin trend' : 'Pin trend'}
                        onClick={() =>
                          setTrends((current) =>
                            current.map((item) => (item.id === trend.id ? { ...item, pinned: !item.pinned } : item))
                          )
                        }
                      >
                        <Star size={16} fill={trend.pinned ? 'currentColor' : 'none'} />
                      </button>
                      <button type="button" className="iconButton" aria-label="Edit trend" title="Edit trend" onClick={() => handleEdit(trend)}>
                        <Edit2 size={15} />
                      </button>
                      <button type="button" className="iconButton" aria-label="Delete trend" title="Delete trend" onClick={() => handleDelete(trend.id)}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  <div className="signalLine">{trend.signal || 'Add the signal you are seeing in the wild.'}</div>

                  <div className="translationBlock">
                    <div>
                      <strong>
                        <MessageCircle size={14} />
                        Meaning
                      </strong>
                      <p>{trend.meaning || 'No meaning captured yet.'}</p>
                    </div>
                    <div>
                      <strong>
                        <Gamepad2 size={14} />
                        Parent translation
                      </strong>
                      <p>{trend.parentTranslation || 'Add why kids care about this.'}</p>
                    </div>
                    <div>
                      <strong>
                        <CheckCircle2 size={14} />
                        Ask your kid
                      </strong>
                      <p>{trend.askPrompt || 'Add a conversation starter.'}</p>
                    </div>
                    <div>
                      <strong>
                        <ShieldAlert size={14} />
                        Watch-out
                      </strong>
                      <p>{trend.watchOut || 'Add anything worth monitoring.'}</p>
                    </div>
                  </div>

                  <div className="cardFoot">
                    <span className={`statusPill ${getStatusClass(trend.status)}`}>{trend.status}</span>
                    <span className="agePill">{trend.ageBand || 'Any age'}</span>
                    <span>{trend.updated}</span>
                  </div>
                </article>
              ))
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
