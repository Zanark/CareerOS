import { useMemo, useState } from 'react';
import { ArrowRight, FileText, History, RefreshCw } from 'lucide-react';
import { getCheckpoint, getLatestMission, getMission, getMissionVersion, isVerifiedAppend, missions } from './domain/catalog';
import { previewRoadmapUpgrades, upgradeAllRoadmaps, upgradeRoadmap, type RoadmapUpgradePreview } from './domain/engine';
import type { AppState, Mission, MissionId } from './domain/types';
import { recallMissionIds } from './domain/types';
import { Badge, Modal, PageHeading } from './components';
import { MissionFlowchart } from './roadmaps/MissionFlowchart';
import { SYSTEM_CONCEPT_SOURCE } from './system/concepts';
import { SYSTEM_PRACTICE_SOURCE } from './domain/operations/systemPracticeStudy';
import { getPackOutline, packUnitHref } from './domain/roadmapPacks/registry';
import { missionAccentStyle } from './missionVisuals';

type Commit = (transform: (state: AppState) => AppState) => boolean;

export function SourcePanel({ missionId, state, commit, expanded = false }: {
  missionId: MissionId; state: AppState; commit: Commit; expanded?: boolean;
}) {
  const active = getMission(missionId, state);
  const latest = getLatestMission(missionId);
  const pack = getPackOutline(missionId);
  const [notice, setNotice] = useState('');
  const pending = active.roadmapVersion !== latest.roadmapVersion;
  const append = pending && isVerifiedAppend(latest, active);
  const retained = missionId === 'pattern' ? 'HashMap' : active.name;
  const archives = state.archives.filter(archive => archive.missionId === missionId);

  function adopt() {
    const change = append
      ? `Your existing ${retained} checkpoints, completion evidence, current position and blocker are retained. Only new topic checkpoints start unconfirmed. The previous tracker is also archived; completed work is counted once.`
      : 'Your previous checkpoint, blocker and completion record will be archived. All saved work and history stay available. New checkpoints start unconfirmed; old progress is not credited to different topics.';
    if (!window.confirm(`${append ? 'Append the expanded' : 'Adopt the documented'} ${latest.operation} roadmap?\n\n${change}\n\nYour existing daily plan will be preserved. Refresh an untouched plan to use the new checkpoint.`)) return;
    const ok = commit(current => upgradeRoadmap(current, missionId));
    setNotice(ok ? append ? `Expanded roadmap appended. Existing ${retained} progress is retained; new topics start unconfirmed. Refresh an untouched daily plan when ready.` : 'Documented roadmap adopted. Previous progress is preserved below; refresh an untouched daily plan when ready.' : 'Roadmap was not changed. Check the workspace warning.');
  }

  return <section className={`source-panel ${latest.color}`} style={missionAccentStyle(latest.id)} data-tour="operation-source">
    <div className="source-heading"><FileText size={18} /><div><h3>Operation documents</h3><p>Documented roadmap v{latest.roadmapVersion} · Active tracker v{active.roadmapVersion}</p></div><Badge>{latest.coverage ?? 'documented'}</Badge></div>
    {pending && <div className="source-upgrade">
      <p>{append ? missionId === 'pattern'
        ? 'Full roadmap shows the complete expanded DSA curriculum, including BFS, DFS and DP. Append it to your saved HashMap tracker when ready; your current position and genuine completions stay.'
        : `The agent-cloud extension adds 12 checkpoints after the unchanged 28. Your saved v${active.roadmapVersion} position, blocker and evidence stay until confirmed adoption; original prefix work then carries once, with new topics unconfirmed.`
        : missionId === 'pattern' ? `Full roadmap shows all ${latest.checkpoints.length} checkpoints from the expanded PDF, including BFS, DFS and DP. Your saved tracker is still v${active.roadmapVersion}. Browsing the complete map does not change it; adoption is a separate confirmed action.` : 'Your saved position still uses the previous roadmap. Review the documented content before switching; no existing work will be silently reclassified.'}</p>
      <button className="button primary" data-tour="source-adopt" onClick={adopt}><RefreshCw size={15} />{append ? 'Append expanded roadmap' : 'Adopt documented roadmap'}</button>
    </div>}
    {missionId === 'pattern' && <p className="source-notice"><a className="text-link" data-tour="dsa-library-open" href="#/dsa/1">Browse all 50 DSA sections and problem sets<ArrowRight size={14} /></a></p>}
    {missionId === 'system' && <div className="system-concept-entry" data-tour="system-concepts-open">
      <p><strong>Two connected roadmaps:</strong> {SYSTEM_CONCEPT_SOURCE.document} is the concepts map; {SYSTEM_PRACTICE_SOURCE} supplies the modules, problems and case studies. Full roadmap lets you switch between both and your saved tracker. Cloud patterns begin at overview depth, not mastery of every pattern.</p>
      <div className="button-row"><a className="text-link" href="#/system-concepts">Browse and search all System Design concepts<ArrowRight size={14} /></a>
      <a className="text-link" href="#/system-practice">Open System Design problems and case studies<ArrowRight size={14} /></a></div>
    </div>}
    {pack && <div className="system-concept-entry">
      <p><strong>{pack.sourceKind === 'web-research' ? 'The research-backed field guide is available:' : 'The expanded workbook is available:'}</strong>{' '}
        {pack.sourceKind === 'web-research' ? `${pack.webSources?.length} reviewed primary sources`
          : pack.sourceKind === 'mixed' ? `${pack.pageCount} original source pages plus ${pack.webSources?.length} reviewed public extension sources`
            : `${pack.pageCount} source pages`}, {latest.checkpoints.length} curriculum checkpoints and {pack.exerciseCount} exercises, plus supporting cases and references.{' '}
        {pack.sourceKind === 'web-research' ? 'Fieldcraft starts in the background without changing your other missions. Its sequence and criteria are authored learning design, not employer hiring requirements.'
          : pack.sourceKind === 'mixed' ? 'The original workbook is unchanged. Agent-cloud lessons are new authored learning design, not additional PDF pages or a claim of autonomous production capability.'
            : 'Full roadmap shows the complete edition; your saved tracker stays separate until confirmed adoption.'}</p>
      <a className="text-link" data-tour="pack-library-open" href={packUnitHref(missionId)}>Open the complete practice library<ArrowRight size={14} /></a>
    </div>}
    {notice && <p className="source-notice" role="status">{notice}</p>}
    {missionId === 'income' && <p className="source-notice"><a className="text-link" href="#/freelance">Open freelance opportunity ledger<ArrowRight size={14} /></a></p>}
    {recallMissionIds.some(id => id === missionId) && <p className="source-notice"><a className="text-link" href="#/recall">Review saved work in recall practice<ArrowRight size={14} /></a></p>}
    <details className="source-details" data-tour="source-material" open={expanded}>
      <summary>Sources, scope and supporting material</summary>
      <div className="source-counts"><span>{latest.stages?.length ?? 0} {pack ? 'curriculum / reference groups' : 'documented stages'}</span><span>{latest.checkpoints.length} tracked nodes</span><span>Personal progress not imported</span></div>
      {latest.sourceNotes?.length ? <ul className="source-notes">{latest.sourceNotes.map(note => <li key={note}>{note}</li>)}</ul> : null}
      {latest.referenceGroups?.map(group => <section className="source-reference-group" data-tour={group.kind === 'projects' ? 'source-projects' : undefined} key={group.title}><h4>{group.title}<Badge>{group.kind}</Badge></h4><dl>{group.items.map(item => <div key={item.title}><dt>{item.href ? <a href={item.href}>{item.title}</a> : item.title}</dt><dd>{item.detail}</dd></div>)}</dl></section>)}
      {latest.resources?.length ? <div className="source-resources">{latest.resources.map(resource => <a key={resource.url} href={resource.url} target="_blank" rel="noopener noreferrer">{resource.label}<ArrowRight size={12} /></a>)}</div> : null}
      <h4 className="source-citations-heading">Source references</h4>
      <ul className="source-citations">{latest.sources?.map((source, index) => <li key={`${source.document}-${index}`}><strong>{source.url ? <a href={source.url} target="_blank" rel="noopener noreferrer">{source.document}</a> : source.document}</strong><span>{source.section}{source.page ? ` · page ${source.page}` : ''}</span></li>)}</ul>
      <p className="source-privacy">{pack?.sourceKind === 'mixed'
        ? 'The original PDF remains private and unchanged. Extension citations are public sources with explicit reviewed scope; no private report or invented PDF page is published.'
        : pack?.sourceKind === 'web-research'
        ? 'Original public-source synthesis. Review scopes and uncertainties are explicit; no private customer records or invented PDF pages are included.'
        : 'The original PDFs contain private material and are not bundled with the public site. Only reusable roadmap structure is shown here.'}</p>
    </details>
    {pending && <details className="source-details" data-tour="source-preview"><summary>Preview documented roadmap before adopting</summary><MissionFlowchart mission={latest} state={state} tutorialTarget={false} /></details>}
    {archives.map(archive => {
      const previous = getMissionVersion(missionId, archive.progress.roadmapVersion);
      const checkpoint = archive.progress.checkpointId ? getCheckpoint(missionId, archive.progress.checkpointId, previous.roadmapVersion) : undefined;
      return <details className="source-details roadmap-archive" data-tour="source-archive" key={previous.roadmapVersion}>
        <summary><History size={14} /> Previous roadmap v{previous.roadmapVersion}: {archive.progress.completedCheckpointIds.length}/{previous.checkpoints.length} completed</summary>
        <p className="source-archive-position">Preserved checkpoint: <strong>{checkpoint?.title ?? 'Roadmap pending'}</strong> · {archive.progress.status}. This archive is read-only.</p>
        {archive.progress.blocker && <p className="source-archive-position">Previous blocker: {archive.progress.blocker}</p>}
        <MissionFlowchart mission={previous} state={state} tutorialTarget={false} />
      </details>;
    })}
  </section>;
}

export function OperationSourcesPage({ state, commit, initialSelection = 'pattern' }: { state: AppState; commit: Commit; initialSelection?: MissionId }) {
  const [selection, setSelection] = useState<MissionId>(initialSelection);
  const [preview, setPreview] = useState<RoadmapUpgradePreview | null>(null);
  const [notice, setNotice] = useState('');
  const available = useMemo(() => previewRoadmapUpgrades(state), [state]);
  const mission: Mission = getLatestMission(selection);

  function adoptAll() {
    if (!preview) return;
    const ok = commit(current => upgradeAllRoadmaps(current, preview));
    setPreview(null);
    setNotice(ok
      ? 'All pending documented roadmaps were adopted together. Previous records and daily plans are preserved; no new work was marked complete.'
      : 'No roadmaps were changed. Check the workspace warning, then review a fresh preview before trying again.');
  }

  return <>
    <PageHeading eyebrow="DOCUMENTED MATERIAL" title="Operation documents" description="Complete source-based curricula, exercises and supporting references. Your private progress stays on its saved version until you explicitly adopt an update."><div className="button-row source-page-actions"><button className="button primary" disabled={available.upgrades.length === 0} onClick={() => { setNotice(''); setPreview(available); }}><RefreshCw size={15} />Adopt all documented roadmaps</button><a href="#/practice" className="button secondary">Practice libraries<ArrowRight size={15} /></a></div></PageHeading>
    <div className="source-bulk-status">
      <p>{available.upgrades.length === 0 ? 'All documented roadmaps are already adopted.' : `${available.upgrades.length} roadmap ${available.upgrades.length === 1 ? 'update' : 'updates'} available. Review every change in one confirmation; individual adoption remains available below.`}</p>
      {available.upgrades.length > 0 && <p>Recommended before adoption: <a className="text-link" href="#/settings">export a workspace backup in Settings<ArrowRight size={14} /></a>.</p>}
      {notice && <p role="status">{notice}</p>}
    </div>
    <div className="source-selector"><label>Mission<select data-tour="source-mission" value={selection} onChange={event => setSelection(event.target.value as MissionId)}>{missions.map(item => <option key={item.id} value={item.id}>{item.name} · {item.operation}</option>)}</select></label><a className="button secondary" href={`#/mission/${selection}`}>Open current tracker<ArrowRight size={15} /></a></div>
    <SourcePanel key={selection} missionId={selection} state={state} commit={commit} expanded />
    <MissionFlowchart key={`${selection}-latest`} mission={mission} state={state} tutorialTarget={false} />
    {preview && <Modal title="Adopt all documented roadmaps?" eyebrow="REVIEW BEFORE ADOPTING" className="bulk-roadmap-modal" onClose={() => setPreview(null)} restoreFocus>
      <div className="bulk-roadmap-body">
        <p>{preview.upgrades.length} pending {preview.upgrades.length === 1 ? 'update' : 'updates'}. Already-current missions are unchanged.</p>
        <p>Recommended: <a className="text-link" href="#/settings" onClick={() => setPreview(null)}>export a workspace backup in Settings<ArrowRight size={14} /></a> before adopting. Nothing is downloaded or adopted automatically.</p>
        <ul className="bulk-roadmap-list">{preview.upgrades.map(upgrade => <li key={upgrade.missionId}>
          <h3>{upgrade.name}</h3>
          <p className="bulk-roadmap-versions">v{upgrade.fromVersion} → v{upgrade.toVersion}</p>
          <p>{upgrade.preservesProgress
            ? upgrade.missionId === 'pattern'
              ? 'Verified DSA append: retain HashMap progress, evidence and blocker; archive the previous tracker. Keep the current position, or continue at the first new topic if the old track is complete. New topics start unconfirmed.'
              : 'Verified AI Architect append: retain the original 28-checkpoint progress, evidence and blocker; archive the previous tracker. Keep the current position, or continue at the first new topic if complete. New topics start unconfirmed.'
            : 'Archive previous progress and start the new tracker unconfirmed. No old completion is credited to different topics.'}</p>
        </li>)}</ul>
        <p>Daily plans, evidence, recalls, history, personal accomplishments and focus-session records stay intact. Your primary focus and active/background modes stay the same; a previously planned mission becomes background when its roadmap is available.</p>
        <p>No new checkpoint is marked complete. Refresh an untouched daily plan separately when ready. If any update fails or the workspace changes, none of these updates will be saved.</p>
      </div>
      <div className="bulk-roadmap-actions"><button className="button secondary" onClick={() => setPreview(null)}>Cancel</button><button className="button primary" onClick={adoptAll}>Confirm all roadmaps</button></div>
    </Modal>}
  </>;
}
