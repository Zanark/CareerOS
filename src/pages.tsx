import { useRef, useState } from 'react';
import { ArrowDownToLine, ArrowRight, ArrowUpRight, Check, FileJson2, History, Info, LayoutGrid, List, LockKeyhole, Plus, ShieldCheck, Upload } from 'lucide-react';
import { getMission, getMissions } from './domain/catalog';
import { createInitialState, generatePlan, localDate, parseState, recordChange } from './domain/engine';
import type { AppState, Opportunity, OpportunityStage, Readiness } from './domain/types';
import { opportunityStages, readinessKeys } from './domain/types';
import { Empty, ExternalLink, MissionIcon, PageHeading, SectionTitle } from './components';
import { MAX_WORKSPACE_BYTES } from './workspaceFile';
import { ApplicationMetrics } from './OperationTools';
import './help-guide.css';

type Commit = (transform: (current: AppState) => AppState) => boolean;

export function HistoryPage({ state }: { state: AppState }) {
  const missions = getMissions(state);
  const [filter, setFilter] = useState('all');
  const events = [...state.events].reverse().filter(event => filter === 'all' || event.missionId === filter);
  const groups = new Map<string, typeof events>();
  for (const event of events) {
    const date = new Date(event.createdAt).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    groups.set(date, [...(groups.get(date) ?? []), event]);
  }
  return <><PageHeading eyebrow="NOTHING USEFUL GETS LOST" title="A record of moving forward." description="Your checkpoints, decisions, and evidence. Kept in order, not rewritten by your next step." /><div className="filter-row"><span className="muted small">{events.length} recorded events</span><select aria-label="Filter history by mission" value={filter} onChange={event => setFilter(event.target.value)}><option value="all">All missions</option>{missions.map(mission => <option key={mission.id} value={mission.id}>{mission.operation}</option>)}</select></div>{groups.size ? <div className="history-groups">{[...groups.entries()].map(([date, entries]) => <section key={date}><h2>{date}</h2><div className="history-list">{entries.map(event => <article key={event.id} className="history-entry"><span className="history-icon">{event.missionId ? <MissionIcon mission={getMission(event.missionId)} size={18} /> : <History size={18} />}</span><div><h3>{event.title}</h3><p>{event.missionId ? getMission(event.missionId).operation : 'CareerOS workspace'}<span>·</span>{event.type.replaceAll('_', ' ').toLowerCase()}</p></div><time dateTime={event.createdAt}>{new Date(event.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</time></article>)}</div></section>)}</div> : <Empty title="Your story starts with the next step." icon="book">No events in this view yet. Starting a checkpoint or adding evidence will leave a record here.</Empty>}</>;
}

const stageGroups = [
  { name: 'Discover', stages: ['Found', 'Screening'], color: 'sage' },
  { name: 'In conversation', stages: ['Recruiter', 'Technical', 'System design', 'Onsite'], color: 'blue' },
  { name: 'The next chapter', stages: ['Offer', 'Accepted'], color: 'amber' },
  { name: 'Closed, not forgotten', stages: ['Rejected', 'Withdrawn'], color: 'gray' },
];

export function PipelinePage({ state, onAdd, commit, notify }: { state: AppState; onAdd: () => void; commit: Commit; notify: (message: string) => void }) {
  const [view, setView] = useState('board');
  function setStage(opportunity: Opportunity, stage: OpportunityStage) {
    if (commit(current => recordChange({
      ...current, opportunities: current.opportunities.map(item => item.id === opportunity.id ? { ...item, stage } : item),
    }, `Opportunity moved from ${opportunity.stage} to ${stage}: ${opportunity.company}`, 'escape'))) notify(`Moved to ${stage}. The transition is kept in history.`);
  }
  function stageSelect(opportunity: Opportunity) {
    return <select data-tour="opportunity-stage" aria-label={`Stage for ${opportunity.company}`} value={opportunity.stage} onChange={event => setStage(opportunity, event.target.value as OpportunityStage)}>{opportunityStages.map(stage => <option key={stage}>{stage}</option>)}</select>;
  }
  return <><PageHeading eyebrow="JOB SEARCH" title="Opportunities" description="Track roles, application stages, and next steps."><button className="button primary" data-tour="pipeline-add" onClick={onAdd}><Plus size={16} />Add opportunity</button></PageHeading><div className="pipeline-summary"><div><strong>{state.opportunities.length.toString().padStart(2, '0')}</strong><span>opportunities tracked</span></div><div><strong>{state.opportunities.filter(item => ['Recruiter', 'Technical', 'System design', 'Onsite'].includes(item.stage)).length.toString().padStart(2, '0')}</strong><span>active conversations</span></div><div><strong>{state.opportunities.filter(item => ['Offer', 'Accepted'].includes(item.stage)).length.toString().padStart(2, '0')}</strong><span>offers / accepted</span></div><span className="privacy-note"><LockKeyhole size={15} />Browser-only data</span></div><div className="filter-row"><span className="muted small">Every stage change is recorded in History.</span><div className="segmented"><button className={view === 'board' ? 'active' : ''} aria-pressed={view === 'board'} onClick={() => setView('board')}><LayoutGrid size={14} />Board</button><button data-tour="pipeline-table" className={view === 'table' ? 'active' : ''} aria-pressed={view === 'table'} onClick={() => setView('table')}><List size={14} />Table</button></div></div>
    {view === 'board' ? <div className="pipeline-board">{stageGroups.map(group => <section className={`pipeline-column ${group.color}`} key={group.name}><h2><span className="legend-dot" />{group.name}<span className="column-count">{state.opportunities.filter(item => group.stages.includes(item.stage)).length}</span></h2>{state.opportunities.filter(item => group.stages.includes(item.stage)).map(item => <article className="opportunity-card" key={item.id}><span className="company-letter">{item.company.slice(0, 1).toUpperCase()}</span><h3>{item.company}</h3><strong>{item.role}</strong>{item.notes && <p>{item.notes}</p>}{item.url && <ExternalLink href={item.url}>View listing</ExternalLink>}{stageSelect(item)}<span className="opportunity-date">Added {new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span></article>)}{!state.opportunities.some(item => group.stages.includes(item.stage)) && <div className="empty-column"><span>Room for what’s next.</span>{group.name === 'Discover' && <button className="text-link" onClick={onAdd}><Plus size={14} />Add a role</button>}</div>}</section>)}</div> : <div className="table-scroll"><table><thead><tr><th>Company / role</th><th>Stage</th><th>Next step</th><th>Listing</th></tr></thead><tbody>{state.opportunities.map(item => <tr key={item.id}><td><strong>{item.company}</strong><small>{item.role}</small></td><td>{stageSelect(item)}</td><td>{item.notes || 'No next step recorded.'}</td><td>{item.url ? <ExternalLink href={item.url}>Open</ExternalLink> : 'No link'}</td></tr>)}</tbody></table>{!state.opportunities.length && <Empty title="Find a role worth a closer look.">Add an opportunity to begin. There’s no application target to chase here.</Empty>}</div>}
    <ApplicationMetrics state={state} />
  </>;
}

const readinessDescriptions: Record<typeof readinessKeys[number], string> = {
  'Coding patterns': 'Recognize the pattern, explain the choice, and implement it without copying.',
  'System design': 'Draw the flow from memory. Explain a trade-off and what happens when a component fails.',
  'Resume defense': 'Connect each important claim to a concrete example and the work behind it.',
  'STAR stories': 'Retrieve a situation, your action, and an observable result in your own words.',
  'Sustained coding': 'Build, debug, and explain a small solution while working against a realistic time limit.',
};

export function ReadinessPage({ state, commit }: { state: AppState; commit: Commit }) {
  return <><PageHeading eyebrow="SELF-ASSESSMENT" title="Interview readiness" description="Record what you can currently demonstrate. These ratings are yours, not an AI score." /><div className="readiness-matrix">{readinessKeys.map((key, index) => <section className="readiness-row" key={key}><span className="readiness-index">0{index + 1}</span><div><h3>{key}</h3><p>{readinessDescriptions[key]}</p></div><div className="segmented" data-tour={index === 0 ? 'readiness-coding' : undefined} role="group" aria-label={`${key} readiness`}>{(['unassessed', 'building', 'ready'] as Readiness[]).map(level => <button aria-pressed={state.readiness[key] === level} className={state.readiness[key] === level ? `active ${level}` : ''} key={level} onClick={() => commit(current => recordChange({ ...current, readiness: { ...current.readiness, [key]: level } }, `Readiness self-assessed: ${key} - ${level}`))}>{level === 'ready' && <Check size={13} />}{level === 'unassessed' ? 'Not assessed' : level === 'building' ? 'Building' : 'Ready'}</button>)}</div></section>)}</div><div className="quiet-note"><Info size={18} /><p>Saved work and timer sessions do not automatically raise these ratings.</p><a href="#/evidence" className="text-link">Review saved work<ArrowRight size={15} /></a></div></>;
}

export function DataPage({ state, commit, onExport, onReplace, notify, practice = false, onImported }: { state: AppState; commit: Commit; onExport: () => void; onReplace: (state: AppState) => boolean; notify: (message: string) => void; practice?: boolean; onImported?: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState('');
  const [objective, setObjective] = useState(state.objective);
  async function importBackup(file: File) {
    setImportError('');
    if (file.size > MAX_WORKSPACE_BYTES) { setImportError('This file is larger than the 5 MB import limit. Your workspace is unchanged.'); return; }
    try {
      const parsed = parseState(JSON.parse(await file.text()));
      if (!window.confirm(practice ? 'Import this file into the temporary tutorial workspace? Your real data will not change.' : 'Replace the current browser workspace with this backup? Export the current workspace first if you want to keep it.')) return;
      if (onReplace(parsed)) { setObjective(parsed.objective); onImported?.(); notify(practice ? 'Example imported into the tutorial only.' : 'Backup restored.'); }
      else setImportError('The validated backup could not be stored. Your previous workspace is unchanged.');
    } catch (error) {
      setImportError(`Backup not imported. Your workspace is unchanged. ${error instanceof Error ? error.message : 'Unable to read this file.'}`);
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  }
  function reset(sampleData: boolean) {
    if (!window.confirm(practice ? 'Reset temporary tutorial data? Your real progress stays unchanged.' : sampleData ? 'Replace your browser workspace, including focus and distraction records, with illustrative sample data? Export your current data first.' : 'Start a fresh workspace? This removes all current progress, evidence, history, opportunities, focus sessions and distraction records from this browser. Export first to keep them.')) return;
    const next = createInitialState(sampleData);
    next.plans[localDate()] = generatePlan(next);
    if (onReplace(next)) { setObjective(next.objective); notify(practice ? 'Tutorial data reset.' : sampleData ? 'Sample workspace loaded.' : 'Fresh workspace ready.'); }
  }
  return <><PageHeading eyebrow="SAVING & PORTABILITY" title="Settings & data" description="Browser-only storage, private backups, and your tracking settings." /><div className="settings-grid">
      <section className="panel data-lifecycle" data-tour="storage-info">
        <SectionTitle title="How saving works" />
        <dl>
          <div><dt>Where is progress saved?</dt><dd>In localStorage for this browser and website address, not a server account or cloud backup. Mission streaks are calculated locally from saved evidence and recall records.</dd></div>
          <div><dt>What survives a refresh or update?</dt><dd>Refreshes keep saved records, including focus sessions and distraction reports. The running countdown itself is tab-local; an interrupted session is not marked complete. Adopting a documented roadmap is a separate confirmed action; old progress is archived, not reclassified. Unreadable data is preserved for recovery.</dd></div>
          <div><dt>What if I change machines?</dt><dd>Export a JSON backup here, transfer it privately, then import it on the other machine. The same applies to another browser or website address, including moving from this local preview to the hosted site. There is no automatic sync.</dd></div>
          <div><dt>What can delete it?</dt><dd>Clearing site data, deleting your browser profile, or ending a private-browsing session can remove progress. Export regularly. Imports replace the destination workspace after confirmation.</dd></div>
        </dl>
      </section>
      <section className="panel"><SectionTitle title="Goal" /><form className="stack-form" data-tour="goal-form" onSubmit={event => { event.preventDefault(); if (commit(current => recordChange({ ...current, objective: objective.trim() }, 'Strategic objective updated'))) notify('Goal updated.'); }}><label>What are you working toward?<textarea value={objective} onChange={event => setObjective(event.target.value)} maxLength={240} minLength={5} required rows={3} /></label><p className="muted small">Shown on your roadmap.</p><button className="button primary">Save direction<Check size={15} /></button></form></section>
      <section className="panel data-boundary"><ShieldCheck size={27} strokeWidth={1.4} /><h2>Privacy</h2><p>Browser storage and ordinary backups are not encrypted. The app never uploads or commits progress automatically.</p><ul><li>Other apps on the same website origin may access localStorage.</li><li>Do not add passwords, confidential work, or sensitive personal details.</li><li>Automatic cloud sync is not implemented; optional repository publication remains manual.</li></ul></section>
      <section className="panel backup-panel"><SectionTitle title="Backup & restore" />
        <div className="backup-row"><span className="backup-icon"><ArrowDownToLine size={22} /></span><div><h3>{practice ? 'Export a tutorial example' : 'Export your progress'}</h3><p>{practice ? 'Downloads only the temporary practice workspace, not your real progress.' : 'Includes current and archived progress, saved work, plans, opportunities, recall, ratings, history, and the full focus-session and timestamped distraction log.'}</p></div><button data-tour="backup-export" className="button secondary" onClick={onExport}>{practice ? 'Export example' : 'Export backup'}</button></div>
        <div className="backup-row"><span className="backup-icon"><Upload size={22} /></span><div><h3>{practice ? 'Try importing the example' : 'Import a saved backup'}</h3><p>{practice ? 'Select the example JSON you downloaded. Only tutorial data will change.' : 'Validated first, then replaces this browser workspace after confirmation.'}</p></div><button data-tour="backup-import" className="button secondary" onClick={() => fileRef.current?.click()}>Import backup</button><input data-tour="backup-input" ref={fileRef} type="file" accept=".json,application/json" aria-label="Choose backup file" className="sr-only" onChange={event => { const file = event.target.files?.[0]; if (file) void importBackup(file); }} /></div>
        <p className="privacy-note"><FileJson2 size={14} />Backups are plain-text JSON. Keep them private and out of public repositories.</p>{importError && <pre className="import-error" role="alert">{importError}</pre>}
      </section>
      <section className="panel" data-tour="workspace-reset"><SectionTitle title="Reset or load examples" /><p className="muted">Both replace the current workspace after confirmation. Export first to retain its progress.</p><div className="button-row settings-reset"><button className="button primary" onClick={() => reset(false)}>Start a fresh workspace<ArrowRight size={15} /></button><button className="button secondary" onClick={() => reset(true)}>Reload sample</button></div></section>
      <section className="panel repository-sync-entry"><SectionTitle title="Optional encrypted repository sync" />
        <p>A separate append-only export for manually publishing encrypted progress through GitHub Pages.
          It does not replace browser saving or the ordinary, unencrypted backups above.</p>
        <a className="button secondary" href="#/repository-sync">Open repository sync<ArrowRight size={16} /></a></section>
    </div><div className="system-status panel"><div><span className="status-dot" /><strong>Data format v{state.schemaVersion}</strong></div><span>Roadmaps v{state.roadmapVersion}</span><span>{practice ? 'Practice updated' : 'Last saved'} {new Date(state.updatedAt).toLocaleString()}</span><a href="#/guide" className="text-link">Help & glossary<ArrowUpRight size={14} /></a></div></>;
}

export function GuidePage({ onStartTutorial }: { onStartTutorial: () => void }) {
  const [query, setQuery] = useState('');
  const topics = helpTopics.filter(topic => `${topic.title} ${topic.text}`.toLowerCase().includes(query.trim().toLowerCase()));
  return <div data-tour="help-guide"><PageHeading eyebrow="ANSWERS & SHORTCUTS" title="Help & glossary" description="Search a question, expand a topic, or open the relevant tool. Use the tutorial for guided practice without changing real progress."><button className="button primary" onClick={onStartTutorial}>Start tutorial<ArrowRight size={16} /></button></PageHeading>
    <nav className="help-shortcuts" aria-label="Help shortcuts">
      <a className="button secondary" href="#/home">Open career graph<ArrowRight size={16} /></a>
      <a className="button secondary" href="#/missions">Record mission work<ArrowRight size={16} /></a>
      <a className="button secondary" href="#/sources">Review roadmap updates<ArrowRight size={16} /></a>
      <a className="button secondary" href="#/settings">Export or restore a backup<ArrowRight size={16} /></a>
    </nav>
    <div className="help-search">
      <label htmlFor="help-search">Find an answer<input id="help-search" type="search" value={query} placeholder="Try rings, streaks, references, spacing or backups"
        onChange={event => setQuery(event.currentTarget.value)} /></label>
      {query && <button className="button secondary" onClick={() => setQuery('')}>Clear search</button>}
    </div>
    <p className="muted small" role="status">{topics.length} {topics.length === 1 ? 'topic' : 'topics'} found. Select a heading to expand it.</p>
    <div className="guide-glossary">{topics.map(topic => <details className="panel help-topic" key={topic.title}>
      <summary><h3>{topic.title}</h3></summary><p>{topic.text}</p>
      {topic.href ? <a className="text-link" href={topic.href}>{topic.action}<ArrowRight size={15} /></a>
        : <button className="text-link" onClick={onStartTutorial}>Practice in the tutorial<ArrowRight size={15} /></button>}
    </details>)}</div>
    {!topics.length && <div className="quiet-note"><Info size={18} /><p>No matching topic. Try a shorter term or clear the search.</p></div>}
    <div className="quiet-note"><Info size={18} /><p>Help is read-only. Opening a topic or tool does not record work. There is no account system, automatic cloud sync or connected AI agent.</p><a href="#/settings" className="text-link">Saving and device changes<ArrowRight size={14} /></a></div>
  </div>;
}

const helpTopics: { title: string; text: string; href?: string; action?: string }[] = [
  { title: 'Mission and checkpoint', text: 'A mission is a learning or career area, such as DSA or System Design. Its checkpoint is the current source-defined milestone. Open Missions, select an area, and use Record evidence. Completing a checkpoint requires confirming every criterion; browsing or a timer never completes it.', href: '#/missions', action: 'Open missions' },
  { title: 'In focus, primary and background', text: 'Bring into focus makes a mission eligible for daily planning. Make primary prioritizes one mission; it is not the same setting. Background missions retain work and can still record evidence or complete a checkpoint. Blocked and reference-only missions remain protected.', href: '#/missions', action: 'Manage mission focus' },
  { title: 'Why are checkpoints or connections missing?', text: 'The normal career graph emphasizes in-focus missions. Other missions keep isolated hubs without checkpoint clouds or connections. Completing a background checkpoint reveals its full mission for today, then collapses it tomorrow unless it is in focus. View > Show everything bypasses that filtering without changing mission modes.', href: '#/home', action: 'Open graph, then View' },
  { title: 'Show everything versus Select all items', text: 'View > Show everything displays all nine mission rings, checkpoints, applications, evidence, history and other graph records regardless of focus or completion. It temporarily overrides scope, layers and hidden choices; turning it off restores them. Nodes > Select all items only checks individual choices and still respects the focused view and layers.', href: '#/home', action: 'Open graph, then Show everything in View' },
  { title: 'Mission rings, glowing dots and rotation speed', text: 'Rings represent missions only. Their colors match Missions, and selecting one highlights the entire orbit. Stage tethers mean membership, not new prerequisites. An active ring has its own Rotation speed slider: 0% stops it, 100% is normal, 300% is triple. Inactive rings stay still; the global pause and reduced-motion setting take precedence.', href: '#/home', action: 'Inspect a mission ring' },
  { title: 'References and completed checkpoint colors', text: 'References are supporting notes, unadopted curriculum, closed applications or ignored leads—not extra tasks to complete. Green is reserved for checkpoints actually marked complete; other records keep identity colors. References and Checkpoints in View hide layers without deleting anything.', href: '#/home', action: 'Open graph layers' },
  { title: 'Node spacing and Labels', text: 'View > Node spacing unfolds crowded nodes into separate mission/stage groups rather than simply zooming. Use Frame all for the clearest starting angle; 1.0x resets the spread. Labels beside the counts hides floating text only. Dots, picking and inspection remain available.', href: '#/home', action: 'Adjust graph spacing and labels' },
  { title: 'Spark dots, spark lines and heartbeat', text: 'Dots and short spark lines are decoration, not work connections. Each has an independent 0-100% slider, default 10%, under View. Sparks hides both but retains their amounts. Core heartbeat is a ten-second outward-and-back mesh ripple; Pause animation stops ambience independently from a focus timer.', href: '#/home', action: 'Open visual controls' },
  { title: 'Recorded-work streak and today’s dot border', text: 'Saved progress/evidence or any recall result counts as a local-calendar work day, even without completion. Multiple records in one day count once. If there is no record today, yesterday’s streak lasts through today. A bright mission-dot border means work was recorded today. Neither streak nor border proves mastery; only checkpoint completion triggers a background mission’s today-only graph reveal.', href: '#/missions', action: 'View mission streaks' },
  { title: 'Daily action and capacity', text: 'Gentle, Steady and Deep focus set a bounded daily plan, with up to three actions from active unblocked missions. An action is practice, not automatic checkpoint mastery. Changing capacity or creating a plan does not count as recorded work. Refresh an untouched plan separately after roadmap adoption.', href: '#/plan', action: 'Open the daily plan' },
  { title: 'Focus room and distractions', text: 'Open the focus room from Daily plan. Its timer sits over a captured 3D graph. Each distraction press saves a self-reported event immediately and travels in backups. Reset keeps the log; closing the room does not stop the timer. Ambient motion is independent of timer pause. This is not measured attention.', href: '#/plan', action: 'Open the focus timer' },
  { title: 'Saved work and evidence', text: 'A note, code link, explanation, diagram or artifact records what you practiced. Use Save evidence for unfinished work, or explicitly confirm every completion criterion to unlock the next checkpoint. Records retain their original roadmap version. They remain browser-local and are included in private backups.', href: '#/evidence', action: 'Review saved work' },
  { title: 'Roadmap versions and adopting all updates', text: 'Operation documents lets you inspect and adopt newer editions individually or together through one review dialog. Only the verified unchanged DSA v2-to-v3 prefix carries progress forward; other updates archive old progress and start the new tracker unconfirmed. Export a backup first. No adoption awards new checkpoint completion.', href: '#/sources', action: 'Review documented roadmaps' },
  { title: 'Full roadmap and practice libraries', text: 'A mission’s Full roadmap shows the complete latest curriculum without adopting it. My saved tracker returns to your actual version and progress. Practice libraries contain detailed workbooks, DSA problem sets and System Design concepts/cases; optional references are not invented mandatory checkpoints.', href: '#/practice', action: 'Browse practice libraries' },
  { title: 'Recall practice', text: 'Recall records what you can retrieve from memory after saving evidence. Independent recall has self-checks and spacing rules. Partial or Needs review still counts as recorded work, but cannot grant or undo checkpoint completion. Native recall recording currently covers DSA and System Design.', href: '#/recall', action: 'Open recall practice' },
  { title: 'Applications, readiness and freelance leads', text: 'Opportunities tracks saved roles and pipeline stages; it never sends applications. Readiness is self-assessment, not an AI grade. Freelance research records links, skills, budgets and verdicts, not paid work or income. These records have their own pages, not graph rings.', href: '#/pipeline', action: 'Open opportunities' },
  { title: 'Past accomplishments and history', text: 'Keep going shows personal accomplishments you explicitly supplied and actual saved work, not invented motivation. History records changes and completions. Importing reviewed personal history grants no new checkpoint credit; private source material is not published.', href: '#/perspective', action: 'Open Keep going' },
  { title: 'Storage, backups and changing devices', text: 'Data is in this browser’s localStorage for this website origin, not a cloud account. Export JSON in Settings, transfer it privately, then import on the other device. Import replaces the destination only after confirmation. Backups are unencrypted; clearing site data can remove progress. Optional Repository sync is a separate encrypted append-only export for manual commit/push and later loading on another device. It needs your passphrase and never publishes automatically. Ordinary backups and graph view settings are unchanged.', href: '#/settings', action: 'Open backup and restore' },
  { title: 'Tutorial practice', text: 'The guided tutorial uses a separate temporary workspace. You can try real controls, record examples, adopt roadmaps and practice backup import without changing real data. Exiting discards the examples and restores your normal workspace and appearance. Use Chapter to jump, Show this step to return, or drag the coach if it covers a control.' },
];
