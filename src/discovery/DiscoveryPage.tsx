import { useId, useRef, useState } from 'react';
import {
  ArrowRight, ArrowUpRight, BookOpen, Check, ChevronRight, Compass, Eye, Fingerprint,
  Gem, Info, LockKeyhole, Sparkles,
} from 'lucide-react';
import { getMission } from '../domain/catalog';
import { getSaveState } from '../domain/engine';
import type { AppState } from '../domain/types';
import { Modal } from '../components';
import type { Discovery, DiscoveryDay, DiscoverySnapshot, DiscoverySource, DiscoveryTrack, WayfinderRun } from './model';
import { discoveryTracks } from './model';
import { DiscoverySeal } from './DiscoverySeal';
import { Wayfinder } from './Wayfinder';
import './discovery.css';

const starPositions = [
  [[101, 125], [146, 70], [207, 106], [190, 167], [125, 190], [72, 170]],
  [[428, 72], [493, 88], [541, 139], [486, 172], [415, 150], [384, 106]],
  [[104, 314], [171, 273], [214, 317], [185, 378], [114, 393], [64, 358]],
  [[420, 276], [478, 286], [548, 325], [516, 388], [444, 395], [390, 346]],
];

function dateLabel(value: string) {
  return new Date(value.length === 10 ? `${value}T12:00:00` : value)
    .toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function CollectionMap({ snapshot }: { snapshot: DiscoverySnapshot }) {
  const id = useId();
  return <figure className="discovery-map" data-tour="discovery-map">
    <div className="discovery-map-plot"><svg viewBox="0 0 620 460" role="img" aria-label={`Discovery map: ${snapshot.earned} of ${snapshot.total} discoveries recorded across four families. Each bright star is an earned discovery; lines group a family, not prerequisites.`}>
      <defs>
        <radialGradient id={`${id}-ocean`}><stop stopColor="var(--dsf-hero-accent)" stopOpacity=".13" /><stop offset="1" stopColor="var(--dsf-hero-bg)" stopOpacity="0" /></radialGradient>
        <radialGradient id={`${id}-core`}><stop stopColor="#0b3940" /><stop offset="1" stopColor="var(--dsf-hero-bg)" /></radialGradient>
      </defs>
      <circle cx="310" cy="229" r="210" fill={`url(#${id}-ocean)`} />
      <g className="discovery-map-grid"><path d="M22 229h576M310 16v426" /><path d="m33 52 554 354M33 406 587 52" strokeDasharray="2 9" /><circle cx="310" cy="229" r="193" strokeDasharray="1 9" /></g>
      {discoveryTracks.map((track, group) => {
        const discoveries = snapshot.discoveries.filter(item => item.track === track.id);
        const points = starPositions[group];
        return <g key={track.id} className={`map-family ${track.id}`}>
          <path className="map-tether" d={`M310 229 ${points.map(([x, y]) => `L${x} ${y}`).join(' ')}`} />
          {discoveries.map((discovery, index) => {
            const [x, y] = points[index];
            const earned = !!discovery.earnedAt;
            return <g key={discovery.id} className={`map-star${earned ? ' earned' : ''}`} transform={`translate(${x} ${y})`}>
              <title>{earned ? discovery.title : `${track.title}: undiscovered signal ${index + 1}`}</title>
              <circle className="map-star-aura" r={earned ? 17 : 10} />
              <path className="map-star-frame" d="m0-10 8.7 5v10L0 10l-8.7-5V-5Z" />
              <path className="map-star-light" d="m0-5 1.5 3.5L5 0 1.5 1.5 0 5l-1.5-3.5L-5 0l3.5-1.5Z" />
            </g>;
          })}
        </g>;
      })}
      <path className="map-core-edge" d="m310 145 73 42v84l-73 42-73-42v-84Z" />
      <path className="map-core" d="m310 153 66 38v76l-66 38-66-38v-76Z" fill={`url(#${id}-core)`} />
      <path className="map-core-line" d="m310 164 56 32v65l-56 32-56-32v-65Z" />
      <g className="map-coordinate"><path d="M24 39V24h15M581 24h15v15M24 419v15h15M581 434h15v-15" /><circle cx="310" cy="24" r="2" /><circle cx="310" cy="434" r="2" /></g>
    </svg>
    <div className="discovery-map-center" aria-hidden="true"><Gem size={18} /><strong>{snapshot.earned}<span>/{snapshot.total}</span></strong><span>DISCOVERED</span></div></div>
    <figcaption><span className="map-key-dot" />One star per discovery. Lit by saved work, not screen time.</figcaption>
  </figure>;
}

function SourceList({ sources, limit = 3 }: { sources: DiscoverySource[]; limit?: number }) {
  const render = (source: DiscoverySource) => <li key={source.id}>
    <span className={`discovery-source-icon ${source.kind}`}><Fingerprint size={16} /></span>
    <div><a href={source.href}>{source.title}<ArrowUpRight size={13} /></a><small>{source.detail}</small><time dateTime={source.createdAt}>{dateLabel(source.createdAt)} · {source.kind === 'recall' ? 'Self-reported recall' : 'Saved evidence'}</time></div>
  </li>;
  return <><ul className="discovery-sources">{sources.slice(0, limit).map(render)}</ul>
    {sources.length > limit && <details className="discovery-more-proof"><summary>Show {sources.length - limit} more supporting records</summary><ul className="discovery-sources">{sources.slice(limit).map(render)}</ul></details>}
  </>;
}

function DiscoveryDetail({ discovery, index, onClose, missionHref }: { discovery: Discovery; index: number; onClose: () => void; missionHref: string }) {
  const [revealed, setRevealed] = useState(false);
  const earned = !!discovery.earnedAt;
  const visible = earned || revealed;
  const href = discovery.track === 'memory' ? '#/recall' : discovery.track === 'rhythm' ? '#/plan' : missionHref;
  return <Modal title={visible ? discovery.title : 'An undiscovered signal'} subtitle={earned ? discovery.description : discovery.clue}
    eyebrow={`${discoveryTracks.find(track => track.id === discovery.track)!.title} / Discovery ${String(index + 1).padStart(2, '0')}`}
    className="discovery-modal" restoreFocus onClose={onClose}>
    <div className="discovery-detail-body" data-tour="discovery-detail" data-discovery-id={discovery.id}>
      <div className="discovery-detail-seal"><DiscoverySeal discovery={discovery} index={index} revealed={visible} />{earned ? <span className="discovery-earned-label"><Check size={14} />Discovered {dateLabel(discovery.earnedAt!)}</span> : <span className="discovery-mystery-label"><LockKeyhole size={13} />The name is hidden until you discover it or reveal the trail.</span>}</div>
      {!visible ? <div className="discovery-clue"><span className="eyebrow">YOUR CLUE</span><p>{discovery.clue}</p><button className="button secondary" data-tour="discovery-reveal" onClick={() => setRevealed(true)}><Eye size={16} />Reveal the trail</button><small>Looking never earns a discovery or changes your records.</small></div>
        : <section className="discovery-requirement" data-tour="discovery-requirement"><span className="eyebrow">THE TRAIL</span><p>{discovery.requirement}</p>
          <div className="discovery-detail-progress"><strong>{discovery.current}<span> / {discovery.target}</span></strong><span>{discovery.unit}</span></div>
          <div className="discovery-progress" role="progressbar" aria-label="Discovery requirement" aria-valuenow={discovery.current} aria-valuemin={0} aria-valuemax={discovery.target}><span style={{ width: `${discovery.current / discovery.target * 100}%` }} /></div>
        </section>}
      {visible && <section className="discovery-proof" data-tour="discovery-proof"><span className="eyebrow"><Fingerprint size={13} />{earned ? 'WHY THIS WAS DISCOVERED' : 'YOUR SUPPORTING RECORDS'}</span>
        {discovery.sources.length ? <SourceList sources={discovery.sources} /> : <p>No qualifying records yet. Do the real work first; then describe it honestly in the existing tools.</p>}
        <p className="discovery-proof-note">These are your recorded observations, not an independent assessment. A later Needs review result does not erase an earlier discovery or claim you are currently retained.</p>
      </section>}
      <div className="discovery-detail-actions"><a className="button primary" href={href}>{discovery.track === 'memory' ? 'Open recall practice' : discovery.track === 'rhythm' ? 'Open my daily plan' : 'Continue my mission'}<ArrowRight size={15} /></a><button className="button secondary" data-tour="discovery-close" onClick={onClose}>Back to the atlas</button></div>
    </div>
  </Modal>;
}

function ActivityRibbon({ snapshot }: { snapshot: DiscoverySnapshot }) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [focusIndex, setFocusIndex] = useState(27);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const selected: DiscoveryDay | undefined = snapshot.recentDays.find(day => day.date === selectedDate);
  return <section className="discovery-activity" data-tour="discovery-activity">
    <div className="discovery-section-heading"><div><span className="eyebrow">THE LAST 28 DAYS</span><h2>A rhythm, not a streak.</h2></div><div className="discovery-day-total"><strong>{snapshot.recordedDays}</strong><span>recorded days<br />across your saved history</span></div></div>
    <div className="discovery-day-grid" role="group" aria-label="Recorded learning days; use arrow keys to explore">
      {snapshot.recentDays.map((day, index) => {
        const count = day.evidence + day.recalls;
        return <button key={day.date} ref={node => { buttons.current[index] = node; }}
          className={`discovery-day${count ? ' recorded' : ''}${selectedDate === day.date ? ' selected' : ''}`}
          data-date={day.date} data-recorded={count > 0} tabIndex={index === focusIndex ? 0 : -1}
          aria-label={`${dateLabel(day.date)}: ${day.evidence} evidence, ${day.recalls} recalls; ${day.checkpoints} distinct checkpoints`}
          data-tour={index === 27 ? 'discovery-today' : undefined} aria-pressed={selectedDate === day.date} onFocus={() => setFocusIndex(index)}
          onClick={() => setSelectedDate(day.date)} onKeyDown={event => {
            const columns = getComputedStyle(event.currentTarget.parentElement!).gridTemplateColumns.trim().split(/\s+/).length;
            const next = { ArrowRight: index + 1, ArrowLeft: index - 1, ArrowDown: index + columns, ArrowUp: index - columns, Home: 0, End: 27 }[event.key];
            if (next === undefined) return;
            event.preventDefault();
            buttons.current[Math.max(0, Math.min(27, next))]?.focus();
          }}><span>{Number(day.date.slice(-2))}</span><i aria-hidden="true" /></button>;
      })}
    </div>
    <div className="discovery-day-range"><span>{dateLabel(snapshot.recentDays[0].date)}</span><span>{dateLabel(snapshot.recentDays.at(-1)!.date)}</span></div>
    {selected && <div className="discovery-day-detail" data-tour="discovery-day-detail"><div><h3>{dateLabel(selected.date)}</h3><span>{selected.evidence} evidence · {selected.recalls} recalls · {selected.checkpoints} distinct checkpoints</span></div>
      {selected.sources.length ? <><SourceList sources={selected.sources} limit={5} />{selected.evidence + selected.recalls > selected.sources.length && <p className="muted small">Showing the first five records. Open Saved work or Recall practice for the full history.</p>}</> : <p>No learning record on this date. That does not mean you did no work.</p>}
    </div>}
    <p className="discovery-activity-note">One filled tile means evidence or recall was saved that day. More notes do not make a day brighter. Gaps never subtract discoveries.</p>
  </section>;
}

export default function DiscoveryPage({ state, snapshot, practice, onLoadExample, selectedId, onSelect, levelUp, onLevelUpViewed }: {
  state: AppState; snapshot: DiscoverySnapshot; practice: boolean; onLoadExample: () => void;
  selectedId: string | null; onSelect: (id: string | null) => void;
  levelUp: WayfinderRun | null; onLevelUpViewed: () => void;
}) {
  const [track, setTrack] = useState<DiscoveryTrack | 'all'>('all');
  const [filter, setFilter] = useState<'all' | 'earned' | 'hidden'>('all');
  const collection = useRef<HTMLElement>(null);
  const selected = snapshot.discoveries.find(item => item.id === selectedId);
  const mission = getMission(state.focusMissionId, state);
  const progress = state.missions[mission.id];
  const save = getSaveState(mission, state);
  const missionHref = `#/mission/${mission.id}`;
  const filtered = snapshot.discoveries.filter(item => (track === 'all' || item.track === track) &&
    (filter === 'all' || (filter === 'earned' ? !!item.earnedAt : !item.earnedAt)));

  function chooseTrack(next: DiscoveryTrack | 'all') {
    setTrack(next);
    setFilter('all');
  }

  return <div className="discovery-page">
    <div className="discovery-masthead"><span><Compass size={17} />DISCOVERY ATLAS</span><span>COLLECTION 01 <i /> {snapshot.total} FINITE DISCOVERIES</span></div>
    <Wayfinder snapshot={snapshot} request={levelUp} onRequestViewed={onLevelUpViewed} />
    <section className="discovery-hero" data-tour="discovery-intro">
      <div className="discovery-hero-copy"><span className="discovery-overline"><span />YOUR WORK LEAVES A SIGNAL</span>
        <h1>Small steps.<br /><em>Lasting signals.</em></h1>
        <p>A hidden collection, brought to light by the work you actually record. Make something. Go deeper. Meet it again.</p>
        <div className="discovery-hero-progress"><span>{Math.round(snapshot.earned / snapshot.total * 100)}<small>%</small></span><div><strong>of this collection discovered</strong><small>Not a score of your career or ability.</small></div></div>
        <button className="discovery-hero-link" onClick={() => collection.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' })}>Explore your collection<ArrowRight size={17} /></button>
        <div className="discovery-hero-foot"><LockKeyhole size={13} />Private records. No countdown. No points to lose.</div>
      </div>
      <CollectionMap snapshot={snapshot} />
    </section>
    {practice && <div className="discovery-practice"><div><BookOpen size={19} /><p><strong>A safe place to explore.</strong> Load a fictional, partly discovered collection. This replaces only the current tutorial examples, never real progress.</p></div><button className="button secondary" data-tour="discovery-example" onClick={onLoadExample}>Load discovery example</button></div>}
    <div className="discovery-families" data-tour="discovery-families">
      {discoveryTracks.map((family, index) => {
        const items = snapshot.discoveries.filter(item => item.track === family.id);
        const count = items.filter(item => item.earnedAt).length;
        return <button key={family.id} className={`discovery-family ${family.id}`} aria-pressed={track === family.id} data-discovery-track={family.id} data-tour={family.id === 'memory' ? 'discovery-memory-family' : undefined}
          onClick={() => chooseTrack(track === family.id ? 'all' : family.id)}><span className="discovery-family-number">0{index + 1}</span><div><strong>{family.title}</strong><small>{family.subtitle}</small></div><span className="discovery-family-count">{count}<small>/{items.length}</small></span><span className="discovery-family-line"><i style={{ width: `${count / items.length * 100}%` }} /></span></button>;
      })}
    </div>
    <section className="discovery-collection" ref={collection} data-tour="discovery-collection">
      <div className="discovery-section-heading"><div><span className="eyebrow">THE COLLECTION</span><h2>{track === 'all' ? 'There is more beneath the surface.' : discoveryTracks.find(item => item.id === track)!.title}</h2></div><span className="discovery-collection-count">{snapshot.earned} / {snapshot.total} discovered</span></div>
      <div className="discovery-filters" data-tour="discovery-filters"><div role="group" aria-label="Discovery status">{([['all', 'All signals'], ['earned', 'Discovered'], ['hidden', 'Undiscovered']] as const).map(([value, label]) => <button key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</button>)}</div>
        {track !== 'all' && <button className="discovery-reset-filter" data-tour="discovery-all-families" onClick={() => chooseTrack('all')}>All families<ArrowRight size={14} /></button>}<span role="status">{filtered.length} {filtered.length === 1 ? 'signal' : 'signals'}</span>
      </div>
      {filtered.length ? <div className="discovery-card-grid">{filtered.map(discovery => {
        const index = snapshot.discoveries.findIndex(item => item.id === discovery.id);
        const earned = !!discovery.earnedAt;
        return <button key={discovery.id} className={`discovery-card ${discovery.track}${earned ? ' earned' : ''}`}
          data-discovery-id={discovery.id} data-earned={earned}
          data-tour={discovery.id === 'working-thought' ? 'discovery-code-card' : discovery.id === 'first-footprint' ? 'discovery-first-card' : undefined}
          aria-label={earned ? `Inspect ${discovery.title}` : `Inspect hidden discovery ${index + 1}: ${discovery.clue}`} onClick={() => onSelect(discovery.id)}>
          <span className="discovery-card-top"><span>{discoveryTracks.find(item => item.id === discovery.track)!.title}</span><span>{String(index + 1).padStart(2, '0')}</span></span>
          <DiscoverySeal discovery={discovery} index={index} />
          <span className="discovery-card-state">{earned ? <><Check size={12} />Discovered</> : <><LockKeyhole size={12} />Undiscovered</>}</span>
          <h3>{earned ? discovery.title : 'An uncharted signal'}</h3>
          <p>{earned ? discovery.description : discovery.clue}</p>
          <span className="discovery-card-bottom">{earned ? <time dateTime={discovery.earnedAt!}>{dateLabel(discovery.earnedAt!)}</time> : <span>Follow the clue <span>{discovery.current}/{discovery.target}</span></span>}<ChevronRight size={16} /></span>
          <span className="discovery-card-meter" aria-hidden="true"><i style={{ width: `${discovery.current / discovery.target * 100}%` }} /></span>
        </button>;
      })}</div> : <div className="discovery-empty"><Sparkles size={26} /><h3>{filter === 'earned' ? 'Your first signal is still ahead.' : 'This part of the collection is discovered.'}</h3><p>{filter === 'earned' ? 'Explore a clue, then return to the real practice. Opening cards never earns a discovery.' : 'There is no timer to beat. Keep doing work that matters to you.'}</p><button className="button secondary" onClick={() => { setTrack('all'); setFilter('all'); }}>Show all signals</button></div>}
    </section>
    <div className="discovery-bottom-grid"><ActivityRibbon snapshot={snapshot} />
      <aside className="discovery-next" data-tour="discovery-next"><span className="eyebrow"><Compass size={14} />YOUR REAL NEXT STEP</span><span className="discovery-next-operation">{mission.operation}</span><h2>{progress.blocker ? 'Work with the blocker.' : save.checkpoint && progress.status !== 'completed' ? save.checkpoint.title : 'Revisit what you have made.'}</h2>
        <p>{progress.blocker || (save.checkpoint && progress.status !== 'completed' ? save.checkpoint.action : 'Open your saved work and choose something worth revisiting. Discoveries never replace your completion criteria.')}</p>
        <a className="button primary" href={progress.status === 'completed' ? '#/evidence' : missionHref}>{progress.status === 'completed' ? 'Open saved work' : 'Open current checkpoint'}<ArrowUpRight size={15} /></a>
        <a className="discovery-recall-link" href="#/recall">Revisit learning in Recall practice<ArrowRight size={14} /></a>
        <p className="discovery-next-note">Your actual mission comes first. You never need to change focus or rush a checkpoint for a collectible.</p>
      </aside>
    </div>
    <details className="discovery-rules" data-tour="discovery-rules"><summary><Info size={16} />A collection of records, not a measure of your worth.</summary><div>
      <p>Discoveries are recalculated from saved evidence and recall. Existing records can reveal them immediately. Viewing, filters, timers, tutorial progress, readiness ratings and application stages do not earn them.</p>
      <p>Distinct checkpoints are counted by exact roadmap identity; only the verified unchanged DSA append shares an identity. Multiple same-day records count as one recorded day, using this browser&apos;s local calendar. Later calendar days are excluded.</p>
      <p>A discovery remembers a qualifying event in the records you currently hold. It is not a claim of current retention: a later Needs review still matters in Recall practice. There are no penalties for gaps, no currency, deadlines or leaderboard.</p>
      <p>Normal backups and the optional encrypted journal carry the existing source records; there is no separate collection file to lose. Confirmed import/reset replaces those records and therefore recalculates the collection. Linked artifact files themselves are not included in backups.</p>
    </div></details>
    {selected && <DiscoveryDetail key={selected.id} discovery={selected} index={snapshot.discoveries.findIndex(item => item.id === selected.id)} missionHref={missionHref} onClose={() => onSelect(null)} />}
  </div>;
}
