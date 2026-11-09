import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDownToLine, ArrowRight, ArrowUpRight, BookOpen, BriefcaseBusiness, Check,
  ChevronRight, CircleCheck, Clock3, Compass, FileCheck2, Flag, FolderOpen,
  Gem, GitBranch, History, House, Info, LayoutGrid, ListChecks, LockKeyhole, Menu, CircleHelp,
  Pause, Play, Plus, RotateCcw, Search, Settings2, ShieldCheck, Target, X, BrainCircuit, FileText, Maximize2, Network,
} from 'lucide-react';
import { getMissions, getMission, getMissionVersion, recordRoadmapVersion, prerequisitesFor } from './domain/catalog';
import { createInitialState, generatePlan, getSaveState, localDate, recordChange, recordEvidence, activateCheckpoint } from './domain/engine';
import type { AppState, Capacity, DailyAction, Evidence, Mission, MissionId } from './domain/types';
import { Badge, Empty, kindLabels, MissionIcon, PageHeading, Progress, SectionTitle, statusLabels } from './components';
import { BrandMark } from './BrandMark';
import { EvidenceDialog, OpportunityDialog } from './dialogs';
import { DataPage, GuidePage, HistoryPage, PipelinePage, ReadinessPage } from './pages';
import { downloadFile, useWorkspace } from './useWorkspace';
import { serializeWorkspace } from './workspaceFile';
import { useTheme } from './useTheme';
import { ThemeToggle } from './ThemeToggle';
import { Overview } from './Overview';
import { Perspective } from './perspective/Perspective';
import { usePracticeWorkspace } from './usePracticeWorkspace';
import type { WorkspaceModel } from './useWorkspace';
import { Tutorial } from './tutorial/Tutorial';
import type { TutorialCommand } from './tutorial/types';
import { RoadmapPage } from './roadmaps/RoadmapPage';
import { MissionFlowchart } from './roadmaps/MissionFlowchart';
import { FullMissionRoadmap } from './roadmaps/FullMissionRoadmap';
import { SourcePanel, OperationSourcesPage } from './SourcePanel';
import { FreelancePage, RecallPage } from './OperationTools';
import { DsaLibrary, DsaPracticeLink } from './dsa/DsaLibrary';
import { SystemConceptsPage } from './system/SystemConcepts';
import { SystemPracticePage, SystemPracticeLink } from './system/SystemPractice';
import { CareerGraphPage } from './graph/CareerGraphPage';
import type { CareerGraphPageHandle } from './graph/CareerGraphPage';
import { PackPracticePage, PackPracticeLink } from './practice/PackPractice';
import { searchRoadmapPacks } from './domain/roadmapPacks/registry';
import { useFocusSession } from './focus/useFocusSession';
import { FocusTimer } from './focus/FocusTimer';
import FocusRoom from './focus/FocusRoom';
import type { FocusRoomHandle } from './focus/focusTypes';
import { missionAccentStyle, missionColor } from './missionVisuals';
import { MissionWorkStreak } from './MissionWorkStreak';
import { useRepositorySync } from './repositorySync/useRepositorySync';
import { RepositorySyncPage } from './repositorySync/RepositorySyncPage';
import DiscoveryPage from './discovery/DiscoveryPage';
import { DiscoveryNotice } from './discovery/DiscoveryNotice';
import { getDiscoverySnapshot } from './discovery/model';
import { createDiscoveryPracticeState } from './discovery/practice';

type Commit = (transform: (current: AppState) => AppState) => boolean;
const mainNav = [
  { id: 'home', label: 'Career graph', icon: Network, color: 'blue' },
  { id: 'perspective', label: 'Keep going', icon: Compass, color: 'sand' },
  { id: 'hq', label: 'Overview', icon: House, color: 'blue' },
  { id: 'missions', label: 'Missions', icon: LayoutGrid, color: 'violet' },
  { id: 'roadmap', label: 'Roadmap', icon: GitBranch, color: 'blue' },
  { id: 'plan', label: 'Daily plan', icon: ListChecks, color: 'sand' },
  { id: 'evidence', label: 'Saved work', icon: FolderOpen, color: 'magenta' },
  { id: 'history', label: 'History', icon: History, color: 'amber' },
  { id: 'recall', label: 'Recall practice', icon: BrainCircuit, color: 'violet' },
];
const extraNav = [
  { id: 'discoveries', label: 'Discovery Atlas', icon: Gem, color: 'amber' },
  { id: 'pipeline', label: 'Opportunities', icon: BriefcaseBusiness, color: 'amber' },
  { id: 'readiness', label: 'Interview readiness', icon: Target, color: 'rose' },
  { id: 'freelance', label: 'Freelance ledger', icon: BriefcaseBusiness, color: 'teal' },
];
const capacities: { id: Capacity; label: string; description: string }[] = [
  { id: 'gentle', label: 'Gentle', description: 'Up to 15 minutes; one action.' },
  { id: 'steady', label: 'Steady', description: 'Up to 75 minutes; three actions maximum.' },
  { id: 'deep', label: 'Deep focus', description: 'Up to 120 minutes; three actions maximum.' },
];

function routeNow() { return window.location.hash.slice(2) || 'home'; }
function navigate(route: string) { window.location.hash = `/${route}`; }
function formatDate(date: string) { return new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); }

export default function App() {
  const practice = usePracticeWorkspace();
  const workspace = useWorkspace(practice.active);
  const appearance = useTheme(practice.active);
  const personalFocus = useFocusSession(workspace, practice.active);
  const practiceFocus = useFocusSession(practice);
  const returnRoute = useRef('home');
  const startTutorial = useCallback(() => {
    if (!practice.active) returnRoute.current = routeNow();
    practiceFocus.discard();
    practice.begin();
    navigate('hq');
  }, [practice.active, practice.begin, practiceFocus.discard]);
  const exitTutorial = useCallback(() => {
    practiceFocus.discard();
    practice.end();
    navigate(returnRoute.current);
  }, [practice.end, practiceFocus.discard]);
  const visible = practice.active ? practice : workspace;
  if (!visible.state) {
    return <div className="recovery-screen"><div className="recovery-toolbar"><BrandMark /><ThemeToggle appearance={appearance} /></div><span className="eyebrow">CAREEROS / SAFE RECOVERY</span><h1>Your existing data comes first.</h1>{appearance.notice && <p role="status">{appearance.notice}</p>}<p>The workspace could not be opened. It has not been reset or overwritten. Storage may be unavailable, or the saved data may need a compatible version.</p><pre>{workspace.error}</pre><div className="button-row">{workspace.recoveryRaw && <button className="button primary" onClick={() => downloadFile(workspace.recoveryRaw!, `careerhq-backup-recovery-${localDate()}.json`)}>Download original data</button>}<button className="button secondary" onClick={() => location.reload()}>Try again</button><button className="button secondary" onClick={() => {
      if (window.confirm('Start over on this browser? Download your original data first. This replaces the unreadable workspace.')) workspace.replace(createInitialState(false));
    }}>Start a clean workspace</button></div></div>;
  }
  return <Workspace key={practice.active ? `practice-${practice.generation}` : 'saved'} state={visible.state}
    workspace={visible} appearance={appearance} practice={practice.active}
    focusSession={practice.active ? practiceFocus : personalFocus}
    onStartTutorial={startTutorial} onExitTutorial={exitTutorial} />;
}

function Workspace({ state, workspace, appearance, practice, focusSession, onStartTutorial, onExitTutorial }: {
  state: AppState; workspace: WorkspaceModel; appearance: ReturnType<typeof useTheme>;
  practice: boolean; focusSession: ReturnType<typeof useFocusSession>;
  onStartTutorial: () => void; onExitTutorial: () => void;
}) {
  const { commit, date } = workspace;
  const repositorySync = useRepositorySync(workspace, practice);
  const missions = getMissions(state);
  const [route, setRoute] = useState(routeNow);
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [toast, setToast] = useState('');
  const [evidenceDialog, setEvidenceDialog] = useState<{ missionId: MissionId; action?: DailyAction } | null>(null);
  const [opportunityDialog, setOpportunityDialog] = useState(false);
  const [fullRoadmapOpen, setFullRoadmapOpen] = useState(false);
  const [discoveryId, setDiscoveryId] = useState<string | null>(null);
  const [discoveryExampleCount, setDiscoveryExampleCount] = useState(0);
  const discovery = useMemo(() => getDiscoverySnapshot(state), [state, date]);
  const focusRoom = useRef<FocusRoomHandle>(null);
  const careerGraph = useRef<CareerGraphPageHandle>(null);
  const closeFullRoadmap = useCallback(() => setFullRoadmapOpen(false), []);
  const [exportCount, setExportCount] = useState(0);
  const [importCount, setImportCount] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);
  const headingRef = useRef<HTMLDivElement>(null);
  const page = route.split('/')[0];
  const selected = missions.find(mission => mission.id === route.split('/')[1]);
  const todayPlan = state.plans[date] ?? [];
  const active = missions.filter(mission => state.missions[mission.id].mode === 'active' && state.missions[mission.id].status !== 'completed');
  const pageInfo = [...mainNav, ...extraNav, { id: 'settings', label: 'Settings & data', color: 'blue' }, { id: 'repository-sync', label: 'Repository sync', color: 'blue' }, { id: 'guide', label: 'Help & glossary', color: 'sand' }, { id: 'sources', label: 'Operation documents', color: 'violet' }, { id: 'dsa', label: 'DSA practice library', color: 'sage' }, { id: 'system-concepts', label: 'System Design concepts', color: 'blue' }, { id: 'system-practice', label: 'System Design problems', color: 'blue' }, { id: 'practice', label: 'Practice libraries', color: 'violet' }].find(item => item.id === page);
  const title = pageInfo?.label ?? selected?.name ?? 'Not found';
  const navigateTutorial = useCallback((target: string) => {
    focusRoom.current?.close();
    careerGraph.current?.closePanels();
    setEvidenceDialog(null);
    setOpportunityDialog(false);
    setFullRoadmapOpen(false);
    setDiscoveryId(null);
    setMenuOpen(false);
    setQuery('');
    navigate(target);
  }, []);
  const commandTutorial = useCallback((command: TutorialCommand) => {
    focusRoom.current?.close();
    setDiscoveryId(null);
    if (command === 'open-graph-search') careerGraph.current?.openPanel('work');
    else if (command === 'open-graph-view') careerGraph.current?.openPanel('view');
    else if (command === 'open-graph-rings') careerGraph.current?.openPanel('rings');
    else if (command === 'open-graph-visibility') careerGraph.current?.openPanel('visibility');
    else careerGraph.current?.closePanels();
    setFullRoadmapOpen(command === 'open-roadmap');
    if (command === 'open-evidence') { setOpportunityDialog(false); setEvidenceDialog({ missionId: 'pattern' }); }
    else if (command === 'open-opportunity') { setEvidenceDialog(null); setOpportunityDialog(true); }
    else { setEvidenceDialog(null); setOpportunityDialog(false); }
  }, []);

  useEffect(() => {
    const onHash = () => { focusRoom.current?.close(); setRoute(routeNow()); setMenuOpen(false); setQuery(''); setFullRoadmapOpen(false); setDiscoveryId(null); window.scrollTo(0, 0); };
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); searchRef.current?.focus(); }
      if (event.key === 'Escape') { setMenuOpen(false); setQuery(''); searchRef.current?.blur(); }
    };
    window.addEventListener('hashchange', onHash);
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('hashchange', onHash); window.removeEventListener('keydown', onKey); };
  }, []);
  useEffect(() => { document.title = `${title} - CareerOS`; headingRef.current?.focus({ preventScroll: true }); }, [route, title]);
  useEffect(() => { if (!toast) return; const id = window.setTimeout(() => setToast(''), 4500); return () => window.clearTimeout(id); }, [toast]);

  function change(title: string, transform: (current: AppState) => AppState, missionId?: MissionId) {
    const ok = commit(current => recordChange(transform(current), title, missionId));
    if (ok) setToast(title);
    return ok;
  }

  function exportBackup() {
    downloadFile(serializeWorkspace(state), `${practice ? 'careerhq-tutorial-example' : 'careerhq-backup'}-${date}.json`);
    setExportCount(count => count + 1);
    setToast(practice ? 'Tutorial example downloaded. This is not your real backup.' : 'Backup downloaded. Keep it private.');
  }

  function openEvidence(missionId?: MissionId, action?: DailyAction) {
    const eligible = missions.filter(item => !item.planned && state.missions[item.id].mode !== 'planned' &&
      state.missions[item.id].status !== 'completed' && !state.missions[item.id].blocker.trim());
    const selected = eligible.find(item => item.id === (missionId ?? state.focusMissionId)) ??
      (missionId === undefined && !action ? eligible.find(item => state.missions[item.id].mode === 'active') ?? eligible[0] : undefined);
    if (!selected || (action && state.missions[selected.id].mode !== 'active')) {
      setToast('This mission is unavailable for this action. Record evidence from an unblocked mission with a current checkpoint.');
      return;
    }
    setEvidenceDialog({ missionId: selected.id, action });
  }

  function setCapacity(capacity: Capacity) {
    change(`Capacity set to ${capacity}`, current => {
      const next = { ...current, capacity, plans: { ...current.plans } };
      if (!next.plans[date]?.some(action => action.completed)) {
        delete next.plans[date];
        next.plans[date] = generatePlan(next, date);
      }
      return next;
    });
  }

  function resume(missionId: MissionId) {
    const progress = state.missions[missionId];
    if (progress.mode === 'active' && progress.status === 'not-started' && !progress.blocker) {
      change('Checkpoint started', current => ({ ...current, missions: { ...current.missions, [missionId]: { ...current.missions[missionId], status: 'in-progress' } } }), missionId);
    }
    navigate(`mission/${missionId}`);
  }

  const searchResults = query.trim() ? [
    ...missions.filter(mission => `${mission.operation} ${mission.name} ${mission.checkpoints.map(cp => cp.title).join(' ')}`.toLowerCase().includes(query.trim().toLowerCase())).map(mission => ({ label: mission.name, detail: mission.operation, route: `mission/${mission.id}` })),
    ...state.evidence.filter(item => `${item.title} ${item.summary}`.toLowerCase().includes(query.trim().toLowerCase())).map(item => ({ label: item.title, detail: 'Evidence', route: `evidence/${item.id}` })),
    ...searchRoadmapPacks(query),
  ].slice(0, 7) : [];

  const navButton = (item: typeof mainNav[number]) => {
    const selected = page === item.id || (item.id === 'missions' && ['mission', 'dsa', 'system-concepts', 'system-practice', 'practice'].includes(page));
    return <a key={item.id} data-tour={`nav-${item.id}`} href={`#/${item.id}`} className={`nav-item ${item.color} ${selected ? 'selected' : ''}`} aria-current={selected ? 'page' : undefined}><item.icon size={18} strokeWidth={1.7} /><span>{item.label}</span>{item.id === 'missions' && <span className="nav-count">{active.length}</span>}{item.id === 'hq' && <span className="selected-dot" />}</a>;
  };

  return <div className="app" data-workspace={practice ? 'practice' : 'saved'}>
    <a className="skip-link" href="#main-content" onClick={event => { event.preventDefault(); headingRef.current?.focus(); }}>Skip to content</a>
    {menuOpen && <button className="sidebar-scrim" aria-label="Close navigation" onClick={() => setMenuOpen(false)} />}
    <aside className={`sidebar ${menuOpen ? 'open' : ''}`} aria-label="Main navigation" onClick={event => {
      if (event.target instanceof Element && event.target.closest('a[href^="#/"]')) {
        setMenuOpen(false);
        setQuery('');
      }
    }}>
      <a href="#/home" className="brand" aria-label="CareerOS - Career operating system"><BrandMark /><span className="brand-copy"><span className="brand-name">Career<span className="brand-hq">OS</span></span><small className="brand-tagline">Career OS</small></span></a>
      <span className="nav-label">TRACKING</span>
      <nav>{mainNav.map(navButton)}</nav>
      <span className="nav-label second">CAREER</span>
      <nav>{extraNav.map(navButton)}</nav>
      <div className="sidebar-bottom">
        <a href="#/sources" className={`nav-item violet ${page === 'sources' ? 'selected' : ''}`}><FileText size={18} /><span>Operation documents</span></a>
        <button className="nav-item magenta" onClick={onStartTutorial}><BookOpen size={18} /><span>{practice ? 'Restart tutorial' : 'Tutorial'}</span></button>
        <a href="#/guide" className={`nav-item sand ${page === 'guide' ? 'selected' : ''}`}><CircleHelp size={18} /><span>Help & glossary</span></a>
        <a href="#/settings" className={`nav-item blue ${page === 'settings' ? 'selected' : ''}`}><Settings2 size={18} /><span>Settings & data</span></a>
        <div className="local-status"><span className="status-dot" /><span>{practice ? 'Practice data' : 'Browser storage'}<small>{practice ? 'Discarded on exit' : 'No cloud sync'}</small></span><ShieldCheck size={17} /></div>
      </div>
    </aside>
    <div className="main-shell">
      <header className="topbar">
        <div className="breadcrumbs"><button className="icon-button mobile-menu" onClick={() => { setMenuOpen(!menuOpen); setQuery(''); searchRef.current?.blur(); }} aria-label="Open navigation" aria-expanded={menuOpen}><Menu size={22} /></button><span>CareerOS</span><ChevronRight size={13} /><strong>{title}</strong></div>
        <div className="top-actions"><div className={`search-wrap${query ? ' has-results' : ''}`}><Search size={16} /><input ref={searchRef} data-tour="global-search" placeholder="Search missions and work" aria-label="Search missions and evidence" value={query} onChange={event => setQuery(event.target.value)} /><kbd>Ctrl K</kbd>
          {query && <div className="search-results"><span className="eyebrow">MISSIONS, WORK & CURRICULUM</span>{searchResults.length ? searchResults.map(item => <a key={item.route} href={`#/${item.route}`}><span>{item.label}<small>{item.detail}</small></span><ArrowUpRight size={14} /></a>) : <p>No matches. Try a mission, topic or artifact title.</p>}<button className="text-button" onClick={() => setQuery('')}>Close search</button></div>}
        </div><ThemeToggle appearance={appearance} /><button className="tutorial-launch" onClick={onStartTutorial} aria-label={practice ? 'Restart tutorial' : 'Start tutorial'} title="Interactive tutorial"><CircleHelp size={17} /><span>Tutorial</span></button></div>
      </header>
      <main id="main-content" className={`page-content ${selected?.color ?? pageInfo?.color ?? 'teal'}${page === 'home' ? ' career-graph-content' : ''}`} style={selected ? missionAccentStyle(selected.id) : undefined} ref={headingRef} tabIndex={-1}>
        {appearance.notice && <div className="alert" role="status"><span>{appearance.notice}</span><button className="icon-button" aria-label="Dismiss theme notice" onClick={appearance.dismissNotice}><X size={17} /></button></div>}
        {!practice && repositorySync.connected && !repositorySync.unlocked && page !== 'repository-sync' &&
          <div className="alert repository-sync-prompt" role="status"><span>Your optional repository journal is locked. Browser saving still works; unlock to load published progress.</span><a className="text-link" href="#/repository-sync">Unlock journal<ArrowRight size={15} /></a></div>}
        {workspace.conflict && <div className="alert error" role="alert"><span>This workspace changed in another tab. Reload to avoid overwriting newer work.</span><button onClick={() => location.reload()} className="button secondary">Reload</button></div>}
        {workspace.error && <div className="alert error" role="alert"><span>{workspace.error}</span><button className="icon-button" aria-label="Dismiss error" onClick={() => workspace.setError('')}><X size={17} /></button></div>}
        {practice && <div className="tutorial-practice-banner"><strong>Practice tutorial</strong><span>Temporary data. Your real progress is untouched.</span><button onClick={onExitTutorial}>Exit tutorial</button></div>}
        {state.sampleData && !practice && <div className="sample-banner"><span>Includes example data.</span><a href="#/settings">Start fresh <ArrowRight size={14} /></a></div>}
        {page === 'home' && <CareerGraphPage ref={careerGraph} state={state} practice={practice} date={date} onRecord={id => openEvidence(id)} />}
        {page === 'perspective' && <Perspective state={state} practice={practice} commit={commit} />}
        {page === 'discoveries' && <DiscoveryPage state={state} snapshot={discovery} practice={practice}
          selectedId={discoveryId} onSelect={setDiscoveryId} onLoadExample={() => {
            if (!practice) { workspace.setError('Discovery examples are available only in the isolated tutorial.'); return; }
            focusSession.discard();
            if (commit(() => createDiscoveryPracticeState())) {
              setDiscoveryExampleCount(count => count + 1);
              setToast('Fictional discovery examples loaded in this tutorial only.');
            }
          }} />}
        {page === 'dsa' && <DsaLibrary key={route} state={state} sectionNumber={route.split('/')[1]} />}
        {page === 'system-concepts' && <SystemConceptsPage key={route} groupId={route.split('/')[1]} />}
        {page === 'system-practice' && <SystemPracticePage key={route} state={state}
          entryId={route.split('/')[1] === 'concept' ? route.split('/')[3] : route.split('/')[1]}
          conceptGroupId={route.split('/')[1] === 'concept' ? route.split('/')[2] : undefined} />}
        {page === 'practice' && <PackPracticePage state={state} missionId={route.split('/')[1]} entryId={route.split('/')[2]} />}
        {page === 'hq' && <Overview state={state} date={date} practice={practice} onEvidence={openEvidence} onResume={resume} onExport={exportBackup} />}
        {page === 'missions' && <MissionsPage state={state} onResume={resume} />}
        {page === 'mission' && selected && <MissionPage mission={selected} state={state} commit={commit} onEvidence={() => openEvidence(selected.id)} onResume={resume} notify={setToast} onFullRoadmap={() => setFullRoadmapOpen(true)} />}
        {page === 'roadmap' && <RoadmapPage state={state} />}
        {page === 'plan' && <>
          <PageHeading eyebrow="TODAY" title="Daily plan" description="Up to three actions, chosen from your active missions."><button className="button secondary" data-tour="print-plan" onClick={() => window.print()}><ArrowDownToLine size={16} />Print plan</button></PageHeading>
          <div className="plan-settings panel"><div><h3>How much room do you have?</h3><p className="muted small">Capacity changes rebuild an untouched plan. Completed plans stay intact until tomorrow.</p></div><CapacityControl value={state.capacity} onChange={setCapacity} /></div>
          <div className="dashboard-grid"><div><SectionTitle title={new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}><Badge>{todayPlan.filter(action => action.completed).length} / {todayPlan.length} complete</Badge></SectionTitle><PlanList actions={todayPlan} state={state} onEvidence={action => openEvidence(action.missionId, action)} onResume={resume} /><div className="plan-bottom"><span><Clock3 size={15} />{todayPlan.reduce((sum, action) => sum + action.minutes, 0)} minutes planned</span><button className="text-button" data-tour="plan-refresh" onClick={() => {
            if (todayPlan.some(action => action.completed)) { setToast('Completed work is preserved. A fresh plan arrives tomorrow.'); return; }
            change('Daily plan refreshed from your active missions', current => {
              const next = { ...current, plans: { ...current.plans } }; delete next.plans[date]; next.plans[date] = generatePlan(next, date); return next;
            });
          }}><RotateCcw size={14} />Refresh plan</button></div><p className="muted small">Logging practice does not complete a checkpoint. Use its completion criteria to decide when to advance.</p></div><div className="right-rail"><FocusTimer session={focusSession} state={state} onOpen={() => focusRoom.current?.open()} /><Blockers state={state} /><section className="panel"><label className="checkbox-label"><input data-tour="interview-mode" type="checkbox" checked={state.interviewMode} onChange={event => change(event.target.checked ? 'Interview mode enabled' : 'Interview mode disabled', current => ({ ...current, interviewMode: event.target.checked }))} /><span><strong>Interview mode</strong><small>Prioritize coding, design, and opportunity work in the next fresh plan.</small></span></label></section></div></div>
        </>}
        {page === 'evidence' && <EvidencePage state={state} selectedId={route.split('/')[1]} onAdd={() => openEvidence()} />}
        {page === 'history' && <HistoryPage state={state} />}
        {page === 'pipeline' && <PipelinePage state={state} onAdd={() => setOpportunityDialog(true)} commit={commit} notify={setToast} />}
        {page === 'readiness' && <ReadinessPage state={state} commit={commit} />}
        {page === 'freelance' && <FreelancePage state={state} commit={commit} practice={practice} />}
        {page === 'recall' && <RecallPage state={state} commit={commit} practice={practice} />}
        {page === 'sources' && <OperationSourcesPage key={selected?.id ?? 'pattern'} initialSelection={selected?.id} state={state} commit={commit} />}
        {page === 'settings' && <DataPage state={state} commit={commit} onExport={exportBackup} onReplace={next => workspace.replace(next)} notify={setToast} practice={practice} onImported={() => setImportCount(count => count + 1)} />}
        {page === 'repository-sync' && <RepositorySyncPage sync={repositorySync} />}
        {page === 'guide' && <GuidePage onStartTutorial={onStartTutorial} />}
        {(!['home', 'perspective', 'discoveries', 'dsa', 'system-concepts', 'system-practice', 'practice', 'hq', 'missions', 'mission', 'roadmap', 'plan', 'evidence', 'history', 'pipeline', 'readiness', 'freelance', 'recall', 'sources', 'settings', 'repository-sync', 'guide'].includes(page) || (page === 'mission' && !selected)) && <Empty title="This page isn’t on the map."><a href="#/hq">Return to HQ overview</a></Empty>}
        {page !== 'home' && <footer className="page-footer"><a href="#/guide">Help & glossary</a><a href="#/settings">Data & backups</a></footer>}
      </main>
    </div>
    {toast && <div className="toast" role="status"><Check size={17} />{toast}<button aria-label="Dismiss notification" className="icon-button" onClick={() => setToast('')}><X size={14} /></button></div>}
    {evidenceDialog && <EvidenceDialog state={state} initialMission={evidenceDialog.missionId} action={evidenceDialog.action} practice={practice} onClose={() => setEvidenceDialog(null)} onSave={input => { const ok = commit(current => recordEvidence(current, input)); if (ok) setToast(input.advance ? 'Checkpoint completed. Next checkpoint unlocked.' : practice ? 'Practice example saved in the tutorial only.' : 'Progress saved.'); return ok; }} />}
    {opportunityDialog && <OpportunityDialog practice={practice} onClose={() => setOpportunityDialog(false)} onSave={opportunity => change('Opportunity added', current => ({ ...current, opportunities: [...current.opportunities, opportunity] }), 'escape')} />}
    {fullRoadmapOpen && page === 'mission' && selected && <FullMissionRoadmap key={`${selected.id}-${selected.roadmapVersion}`} mission={selected} state={state} onClose={closeFullRoadmap} />}
    <FocusRoom ref={focusRoom} state={state} date={date} session={focusSession} practice={practice} />
    <DiscoveryNotice snapshot={discovery} />
    {practice && <Tutorial state={state} route={route} signals={{ evidenceOpen: !!evidenceDialog, opportunityOpen: opportunityDialog, fullRoadmapOpen, focusRunning: focusSession.running, exportCount, importCount, discoveryExampleCount, searchQuery: query, theme: appearance.theme }} onNavigate={navigateTutorial} onCommand={commandTutorial} onExit={onExitTutorial} onRestart={onStartTutorial} />}
  </div>;
}

function CapacityControl({ value, onChange }: { value: Capacity; onChange: (capacity: Capacity) => void }) {
  return <div className="segmented" data-tour="capacity" role="group" aria-label="Daily capacity">{capacities.map(capacity => <button key={capacity.id} title={capacity.description} onClick={() => onChange(capacity.id)} className={value === capacity.id ? 'active' : ''} aria-pressed={value === capacity.id}>{capacity.label}</button>)}</div>;
}

function MissionCard({ mission, state, onResume }: { mission: Mission; state: AppState; onResume: (id: MissionId) => void }) {
  const save = getSaveState(mission, state);
  const progress = state.missions[mission.id];
  return <article className={`mission-card ${mission.color}`} style={missionAccentStyle(mission.id)} data-mission-id={mission.id} data-mission-color={missionColor(mission.id)}>
    <div className="mission-card-top"><MissionIcon mission={mission} /><Badge>{mission.planned ? 'Planned' : progress.status === 'completed' ? 'Completed' : progress.mode === 'active' ? 'In focus' : 'Background'}</Badge></div>
    <span className="mission-subtitle">{mission.operation}</span><h3>{mission.name}</h3>
    <p className="source-version-label">{mission.roadmapVersion !== getMission(mission.id).roadmapVersion ? `Previous roadmap v${mission.roadmapVersion} · update available` : `Operation docs · v${mission.roadmapVersion} · ${mission.coverage ?? 'documented'}`}</p>
    <p className="checkpoint-title">{save.checkpoint?.title ?? (mission.coverage === 'forecast' ? 'Planning timeline available' : 'Roadmap not yet defined')}</p>
    <div className="mission-progress-label"><span>{save.stage}</span><span>{save.completed}/{save.total}</span></div>
    <Progress value={save.total ? save.completed / save.total * 100 : 0} label={`${mission.name} checkpoints`} />
    <div className="mission-card-bottom"><span>{progress.blocker ? 'Blocked - needs attention' : mission.planned ? 'Detailed checkpoints pending' : `Next: ${save.next}`}</span><button onClick={() => onResume(mission.id)} className="icon-button" aria-label={`Open ${mission.name}`}><ArrowUpRight size={18} /></button></div>
  </article>;
}

function PlanList({ actions, state, onEvidence, onResume }: { actions: DailyAction[]; state: AppState; onEvidence: (action: DailyAction) => void; onResume: (id: MissionId) => void }) {
  if (!actions.length) return <section className="panel"><Empty title="Room for a fresh start.">There are no available actions at this capacity. Activate an unblocked mission, choose a larger capacity, or refresh the plan after changing focus.</Empty><a href="#/missions" className="button secondary">Explore your missions<ArrowRight size={16} /></a></section>;
  return <div className="plan-list" data-tour="plan-actions">{actions.map((action, index) => {
    const mission = getMissionVersion(action.missionId, recordRoadmapVersion(action));
    const progress = state.missions[action.missionId];
    const unavailable = progress.blocker || progress.mode !== 'active' || progress.checkpointId !== action.checkpointId || progress.status === 'completed' || progress.roadmapVersion !== recordRoadmapVersion(action);
    return <article key={action.id} className={`plan-item ${mission.color} ${action.completed ? 'done' : ''}`} style={missionAccentStyle(mission.id)}><span className="plan-number">{action.completed ? <Check size={17} /> : `0${index + 1}`}</span><div className="plan-content"><div className="plan-meta"><span className={`mission-tag ${mission.color}`} style={missionAccentStyle(mission.id)}>{mission.name}</span><span><Clock3 size={12} />{action.minutes} min</span></div><h3>{action.title}</h3><p>{action.reason}</p>{!action.completed && !!unavailable && <p className="attention-text">This mission changed. Open it to inspect the current checkpoint.</p>}<div className="plan-item-footer">{action.completed ? <span className="done-label"><CircleCheck size={14} />Evidence recorded</span> : <><button className="text-link" data-tour={`plan-open-${mission.id}`} onClick={() => onResume(action.missionId)}>Open checkpoint<ArrowUpRight size={14} /></button><button className="complete-button" disabled={!!unavailable} onClick={() => onEvidence(action)}><Plus size={13} />Log progress</button></>}</div></div></article>;
  })}</div>;
}

function Blockers({ state }: { state: AppState }) {
  const missions = getMissions(state);
  const blocked = missions.filter(mission => state.missions[mission.id].blocker);
  return <section className="blockers-card"><span className="eyebrow"><Flag size={13} />ON YOUR RADAR</span>{blocked.length ? blocked.map(mission => <a href={`#/mission/${mission.id}`} key={mission.id}><strong>{mission.operation}</strong><p>{state.missions[mission.id].blocker}</p><span>Work through this<ArrowUpRight size={13} /></span></a>) : <><h3>No blockers in the way.</h3><p>When something slows you down, name it in your mission. You don’t have to hold it all in your head.</p></>}</section>;
}

function MissionsPage({ state, onResume }: { state: AppState; onResume: (id: MissionId) => void }) {
  const missions = getMissions(state);
  const [filter, setFilter] = useState('all');
  const filtered = missions.filter(mission => filter === 'all' || state.missions[mission.id].mode === filter);
  return <>
    <PageHeading eyebrow="LEARNING AREAS" title="Missions" description="Each area has one current checkpoint. Background missions retain their progress."><a href="#/practice" className="button secondary"><BookOpen size={16} />Practice libraries</a></PageHeading>
    <div className="filter-row" data-tour="mission-list">
      <div className="tabs">{[['all', 'All missions'], ['active', 'In focus'], ['background', 'Background'], ['planned', 'Planned']].map(([key, label]) => <button key={key} onClick={() => setFilter(key)} className={filter === key ? 'active' : ''} aria-pressed={filter === key}>{label}<span>{key === 'all' ? missions.length : missions.filter(m => state.missions[m.id].mode === key).length}</span></button>)}</div>
      <span className="muted small">Operation catalog · v{state.roadmapVersion}</span>
    </div>
    <div className="mission-grid all-missions">{filtered.map(mission => <MissionCard key={mission.id} mission={mission} state={state} onResume={onResume} />)}</div>
    <div className="quiet-note"><Info size={17} /><p>Only active, unblocked missions enter a daily plan. Tracking granularity and source limitations are documented on each mission.</p></div>
  </>;
}

function MissionPage({ mission, state, commit, onEvidence, onResume, notify, onFullRoadmap }: { mission: Mission; state: AppState; commit: Commit; onEvidence: () => void; onResume: (id: MissionId) => void; notify: (text: string) => void; onFullRoadmap: () => void }) {
  const save = getSaveState(mission, state);
  const progress = state.missions[mission.id];
  const [blocker, setBlocker] = useState(progress.blocker);
  const alternatives = mission.checkpoints.filter(checkpoint => checkpoint.id !== progress.checkpointId &&
    !progress.completedCheckpointIds.includes(checkpoint.id) &&
    prerequisitesFor(mission, checkpoint).every(id => progress.completedCheckpointIds.includes(id)));
  useEffect(() => setBlocker(progress.blocker), [mission.id, progress.blocker]);
  function update(title: string, transform: (current: AppState) => AppState) {
    if (commit(current => recordChange(transform(current), title, mission.id))) notify(title);
  }
  return <><a className="back-link" href="#/missions">← All missions</a><PageHeading eyebrow={mission.operation} title={mission.name} description={mission.purpose}
    titleAction={<button className="button secondary" data-tour="full-roadmap-open" onClick={onFullRoadmap}><Maximize2 size={17} />Full roadmap</button>}>{!mission.planned && <button className="button secondary" data-tour="mission-mode" onClick={() => update(progress.mode === 'active' ? 'Mission moved to background' : 'Mission brought into focus', current => ({ ...current, missions: { ...current.missions, [mission.id]: { ...current.missions[mission.id], mode: progress.mode === 'active' ? 'background' : 'active' } } }))}>{progress.mode === 'active' ? <Pause size={15} /> : <Play size={15} />}{progress.mode === 'active' ? 'Move to background' : 'Bring into focus'}</button>}</PageHeading>
    <MissionWorkStreak mission={mission} state={state} />
    <SourcePanel missionId={mission.id} state={state} commit={commit} />
    {mission.planned ? <MissionFlowchart mission={mission} state={state} /> : <>
      <section className={`save-state-card ${mission.color}`} style={missionAccentStyle(mission.id)} data-tour="save-state"><div className="save-state-header"><span className="eyebrow"><Flag size={14} />CURRENT CHECKPOINT</span><Badge>{statusLabels[save.status]}</Badge></div><div className="save-state-main"><MissionIcon mission={mission} size={27} /><div><span>{save.stage}</span><h2>{save.checkpoint?.title}</h2></div><span className="save-count">{save.completed}<small> / {save.total} complete</small></span></div><Progress value={save.completed / save.total * 100} label="Mission checkpoint progress" /><div className="save-state-bottom"><span><LockKeyhole size={14} /><strong>Next unlock:</strong> {save.next}</span><button className="text-link" data-tour="mission-primary" onClick={() => update('Primary mission updated', current => ({ ...current, focusMissionId: mission.id }))}>{state.focusMissionId === mission.id ? 'Your primary mission' : 'Make primary mission'}<Target size={14} /></button></div></section>
      <div className="dashboard-grid mission-detail"><div><section className="panel next-action"><span className="eyebrow">NEXT ACTION</span>      <h2>{save.status === 'completed' ? (mission.completionLabel ?? 'Mission completed') : save.checkpoint?.action}</h2><p>{save.status === 'completed' ? 'Your saved work and history are retained.' : mission.purpose}</p>{save.status !== 'completed' && <><div className="criteria-list"><h4>Completion criteria</h4>{save.checkpoint?.criteria.map(criterion => <div key={criterion}><span className="tiny-circle" />{criterion}</div>)}</div><div className="button-row"><button className="button primary" data-tour="record-evidence" onClick={onEvidence} disabled={progress.mode === 'planned' || !!progress.blocker}><Plus size={16} />Record evidence</button>{progress.status === 'not-started' && progress.mode === 'active' && <button className="button secondary" onClick={() => onResume(mission.id)} disabled={!!progress.blocker}>Begin checkpoint<Play size={14} /></button>}<span className="muted small"><Clock3 size={13} />About {save.checkpoint?.minutes} min</span></div>{progress.mode === 'background' && <p className="attention-text">Record practice or complete this checkpoint without changing focus. Daily plans still use only in-focus missions.</p>}</>}</section>
        {alternatives.length > 0 && <section className="panel available-checkpoints"><h4>Other available checkpoints</h4><p className="muted small">Choose one current checkpoint. This does not complete the previous one.</p><div className="button-row">{alternatives.map(checkpoint => <button key={checkpoint.id} className="button secondary" onClick={() => {
          if (commit(current => activateCheckpoint(current, mission.id, checkpoint.id))) notify('Current checkpoint changed. Existing evidence is preserved.');
        }}>Make current: {checkpoint.title}</button>)}</div></section>}
        {mission.id === 'pattern' && <DsaPracticeLink checkpoint={save.checkpoint} />}
        {mission.id === 'system' && <SystemPracticeLink checkpoint={save.checkpoint} />}
        <PackPracticeLink mission={mission} checkpoint={save.checkpoint} />
        <SectionTitle title={`Checkpoint flowchart · v${mission.roadmapVersion}`} /><MissionFlowchart mission={mission} state={state} />
      </div><div className="right-rail">
        <section className="panel"><SectionTitle title="Blocker" />
          <form className="stack-form" data-tour="blocker-form" onSubmit={event => {
            event.preventDefault();
            update(blocker.trim() ? 'Blocker recorded' : 'Blocker cleared', current => ({
              ...current, missions: { ...current.missions, [mission.id]: { ...current.missions[mission.id], blocker: blocker.trim() } },
            }));
          }}>
            <label>What is blocking this mission?<textarea data-tour="blocker-input" value={blocker} onChange={event => setBlocker(event.target.value)} rows={3} maxLength={500} placeholder="For example: need a practice lab" /></label>
            <button className="button secondary" data-tour="blocker-submit" type="submit">{blocker.trim() ? 'Save blocker' : 'Clear blocker'}</button>
          </form>
        </section>
        <section className="panel dependencies"><h3>Related missions</h3>{mission.dependencies.map(id => <a href={`#/mission/${id}`} key={id}><MissionIcon mission={getMission(id)} size={16} /><span>{getMission(id).name}</span><ArrowUpRight size={14} /></a>)}<p className="muted small">Related skills, not automatic prerequisite locks. Checkpoints unlock in order within each mission.</p></section>
        <section className="panel"><SectionTitle title="Saved work" /><p className="muted small">{state.evidence.filter(item => item.missionId === mission.id).length} items recorded.</p><a href="#/evidence" className="text-link">View saved work<ArrowUpRight size={14} /></a></section>
        <section className="panel"><span className="eyebrow">RECENT HISTORY</span>{[...state.events].reverse().filter(event => event.missionId === mission.id).slice(0, 3).map(event => <p className="mission-event" key={event.id}><strong>{event.title}</strong><small>{formatDate(event.createdAt)}</small></p>)}{!state.events.some(event => event.missionId === mission.id) && <p className="muted small">No events yet.</p>}</section>
      </div></div>
    </>}</>;
}

function EvidencePage({ state, selectedId, onAdd }: { state: AppState; selectedId?: string; onAdd: () => void }) {
  const missions = getMissions(state);
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState('all');
  useEffect(() => { setFilter('all'); setQuery(''); setKind('all'); }, [selectedId]);
  useEffect(() => { if (selectedId) document.getElementById(`proof-${selectedId}`)?.scrollIntoView({ block: 'center' }); }, [selectedId, filter, query, kind]);
  const evidence = [...state.evidence].reverse().filter(item => (filter === 'all' || item.missionId === filter) && (kind === 'all' || item.kind === kind) && `${item.title} ${item.summary}`.toLowerCase().includes(query.toLowerCase()));
  return <><PageHeading eyebrow="NOTES, CODE & DIAGRAMS" title="Saved work" description="Evidence of your practice and completed checkpoints."><button className="button primary" onClick={onAdd}><Plus size={16} />Add evidence</button></PageHeading>
    <div className="filter-row evidence-filters" data-tour="saved-work-filter">
      <div className="input-with-icon"><Search size={16} /><input aria-label="Search evidence" placeholder="Search saved work..." value={query} onChange={event => setQuery(event.target.value)} /></div>
      <select value={filter} aria-label="Filter evidence by mission" onChange={event => setFilter(event.target.value)}><option value="all">All missions</option>{missions.filter(mission => !mission.planned).map(mission => <option key={mission.id} value={mission.id}>{mission.name}</option>)}</select>
      <select data-tour="saved-work-type" aria-label="Filter evidence by type" value={kind} onChange={event => setKind(event.target.value)}><option value="all">All artifact types</option>{Object.entries(kindLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
    </div>
    {evidence.length ? <div className="evidence-grid">{evidence.map(item => <EvidenceCard key={item.id} item={item} highlighted={item.id === selectedId} />)}</div> : <Empty title={state.evidence.length ? 'No work matches those filters.' : 'No saved work yet.'} icon="file">{state.evidence.length ? 'Try another mission, type, or search term.' : 'Use Add evidence to record a note, explanation, diagram, or link to code.'}</Empty>}
  </>;
}

function EvidenceCard({ item, highlighted }: { item: Evidence; highlighted: boolean }) {
  const mission = getMissionVersion(item.missionId, recordRoadmapVersion(item));
  const checkpoint = mission.checkpoints.find(cp => cp.id === item.checkpointId);
  return <article id={`proof-${item.id}`} className={`evidence-card ${mission.color} ${highlighted ? 'highlighted' : ''}`} style={missionAccentStyle(mission.id)}>
    <div className="evidence-card-top"><span className={`mission-tag ${mission.color}`} style={missionAccentStyle(mission.id)}>{mission.operation}</span><span className="local-label"><LockKeyhole size={12} />Local · v{recordRoadmapVersion(item)}</span></div>
    <div className={`artifact-illustration ${mission.color}`} style={missionAccentStyle(mission.id)}><FileCheck2 size={34} strokeWidth={1.2} /><span>{kindLabels[item.kind]}</span></div>
    <h3>{item.title}</h3><p>{item.summary}</p><div className="artifact-checkpoint"><Flag size={12} />{checkpoint?.title}</div>
    <div className="evidence-card-footer"><span>{formatDate(item.createdAt)}{item.completedCheckpoint && <span className="proof-complete"><CircleCheck size={12} />Checkpoint proof</span>}</span>{item.url && <a className="text-link" href={item.url} target="_blank" rel="noopener noreferrer">Open artifact<ArrowUpRight size={14} /></a>}</div>
  </article>;
}
