import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { ClipboardCopy, Info, LockKeyhole, Plus } from 'lucide-react';
import { getCheckpoint, getMissionVersion, recordRoadmapVersion } from './domain/catalog';
import { recordChange, recordEvidence, recordRecall, recallSummary } from './domain/engine';
import type {
  AppState, FreelanceOpportunity, MissionId, RecallEntry, RoadmapVersion,
} from './domain/types';
import { freelanceVerdicts, recallMissionIds } from './domain/types';
import { Badge, Empty, Modal, PageHeading, SectionTitle } from './components';
import './operation-tools.css';

type Commit = (transform: (state: AppState) => AppState) => boolean;

export function ApplicationMetrics({ state }: { state: AppState }) {
  return <details className="panel application-details-table" data-tour="application-metrics"><summary>Resume variants, application lanes and effort</summary>
    <p className="muted small">Optional observations entered with an opportunity. They are not an automatic fit or readiness score.</p>
    <div className="table-scroll"><table><thead><tr><th>Role</th><th>Lane</th><th>Resume variant</th><th>Minutes</th><th>Friction (1-10)</th></tr></thead>
      <tbody>{state.opportunities.map(item => <tr key={item.id}><td><strong>{item.company}</strong><small>{item.role}</small></td><td>{item.lane ?? 'Not recorded'}</td><td>{item.resumeVariant || 'Not recorded'}</td><td>{item.effortMinutes ?? 'Not recorded'}</td><td>{item.frictionScore ?? 'Not recorded'}</td></tr>)}</tbody></table></div>
    {!state.opportunities.length && <p className="muted small">Add an opportunity to record its application details.</p>}
  </details>;
}

const RESEARCH_TARGET = 10;
const MAX_BRIEF_SELECTION = 5;

/** Mirrors the http(s)-only, credential-free URL shape the engine enforces on commit. */
function isSafeHttpUrl(value: string): boolean {
  if (value === '') return true;
  if (!/^https?:\/\//i.test(value) || /[\s\u0000-\u001f\u007f]/.test(value)) return false;
  try {
    const url = new URL(value);
    return (url.protocol === 'http:' || url.protocol === 'https:') && !!url.hostname && !url.username && !url.password;
  } catch {
    return false;
  }
}

function AddOpportunityModal({ onSave, onClose, practice }: { onSave: (opportunity: FreelanceOpportunity) => boolean; onClose: () => void; practice: boolean }) {
  const [error, setError] = useState('');
  const [title, setTitle] = useState('');
  const [platform, setPlatform] = useState('');
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const title = String(data.get('title')).trim();
    const platform = String(data.get('platform')).trim();
    const url = String(data.get('url')).trim();
    const skills = String(data.get('skills')).trim();
    const budget = String(data.get('budget')).trim();
    const notes = String(data.get('notes')).trim();
    if (!title || !platform) { setError('A title and platform are required.'); return; }
    if (!isSafeHttpUrl(url)) { setError('Use an http:// or https:// link without credentials, or leave the link empty.'); return; }
    const opportunity: FreelanceOpportunity = {
      id: crypto.randomUUID(), title, platform, url, skills, budget,
      verdict: 'Unreviewed', notes, createdAt: new Date().toISOString(),
    };
    if (onSave(opportunity)) onClose();
    else setError('This opportunity could not be saved. Check the workspace warning and try again.');
  }
  return <Modal title="Add opportunity" subtitle="Save a lead to research. Nothing here is applied to or submitted anywhere." onClose={onClose}>
    <form onSubmit={submit} className="stack-form">
      {practice && <button type="button" className="button secondary" data-tour="freelance-example" onClick={() => { setTitle('Tutorial API task'); setPlatform('Example marketplace'); }}>Fill example</button>}
      <div className="form-row"><label>Role / title<input name="title" value={title} onChange={event => setTitle(event.target.value)} required minLength={1} maxLength={160} placeholder="e.g. API integration task" /></label><label>Platform<input name="platform" value={platform} onChange={event => setPlatform(event.target.value)} required minLength={1} maxLength={120} placeholder="e.g. Upwork" /></label></div>
      <label>Link <span className="optional">(optional)</span><input type="url" name="url" maxLength={2048} placeholder="https://..." /></label>
      <div className="form-row"><label>Skills <span className="optional">(optional)</span><input name="skills" maxLength={400} placeholder="e.g. React, copywriting" /></label><label>Budget <span className="optional">(optional)</span><input name="budget" maxLength={120} placeholder="e.g. $200 fixed" /></label></div>
      <label>Notes <span className="optional">(optional)</span><textarea name="notes" maxLength={2000} rows={3} placeholder="What you noticed about this lead." /></label>
      <p className="privacy-note"><LockKeyhole size={14} />{practice ? 'Temporary tutorial data only. Discarded on exit.' : 'Stored in this browser only. Not shared or synced.'}</p>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="modal-footer"><button type="button" className="button secondary" onClick={onClose}>Cancel</button><button className="button primary" data-tour="freelance-save">Save opportunity</button></div>
    </form>
  </Modal>;
}

export function FreelancePage({ state, commit, practice = false }: { state: AppState; commit: Commit; practice?: boolean }) {
  const [showAdd, setShowAdd] = useState(false);
  const [platformFilter, setPlatformFilter] = useState('all');
  const [verdictFilter, setVerdictFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [copyError, setCopyError] = useState('');
  const [copied, setCopied] = useState(false);

  const opportunities = state.freelanceOpportunities;
  const platforms = useMemo(() => [...new Set(opportunities.map(item => item.platform))].sort(), [opportunities]);
  const filtered = opportunities.filter(item =>
    (platformFilter === 'all' || item.platform === platformFilter) &&
    (verdictFilter === 'all' || item.verdict === verdictFilter));
  const classifiedCount = opportunities.filter(item => item.verdict !== 'Unreviewed').length;

  function addOpportunity(opportunity: FreelanceOpportunity): boolean {
    return commit(current => recordChange({
      ...current, freelanceOpportunities: [...current.freelanceOpportunities, opportunity],
    }, `Freelance opportunity added: ${opportunity.title}`, 'income'));
  }

  function setVerdict(opportunity: FreelanceOpportunity, verdict: FreelanceOpportunity['verdict']) {
    setCopied(false);
    commit(current => recordChange({
      ...current,
      freelanceOpportunities: current.freelanceOpportunities.map(item => item.id === opportunity.id ? { ...item, verdict } : item),
    }, `Freelance opportunity classified: ${opportunity.title} -> ${verdict}`, 'income'));
  }

  function toggleSelect(id: string, checked: boolean) {
    setSelectedIds(current => {
      if (checked) return current.length >= MAX_BRIEF_SELECTION ? current : [...current, id];
      return current.filter(item => item !== id);
    });
    setCopied(false);
  }

  const selected = opportunities.filter(item => selectedIds.includes(item.id));
  const briefText = selected.map((item, index) => [
    `${index + 1}. ${item.title} (${item.platform})`,
    `Link: ${item.url || 'none'}`,
    `Skills: ${item.skills || 'none'}`,
    `Budget: ${item.budget || 'none'}`,
    `Verdict: ${item.verdict}`,
    `Notes: ${item.notes || 'none'}`,
  ].join('\n')).join('\n\n');

  async function copyBrief() {
    setCopyError('');
    setCopied(false);
    try {
      await navigator.clipboard.writeText(briefText);
      setCopied(true);
    } catch {
      setCopyError('Clipboard access was denied by the browser. Select and copy the text manually instead.');
    }
  }

  return <>
    <PageHeading eyebrow="SIDE INCOME · OPPORTUNITY LEDGER" title="Freelance opportunities" description="Research leads before you apply. Classifications are your judgment, not an automatic score.">
      <button className="button primary" data-tour="freelance-add" onClick={() => setShowAdd(true)}><Plus size={16} />Add opportunity</button>
    </PageHeading>
    {practice && opportunities.length < RESEARCH_TARGET && <button className="button secondary practice-example"
      data-tour="freelance-research-examples" onClick={() => commit(current => recordChange({
        ...current, freelanceOpportunities: [...current.freelanceOpportunities,
          ...Array.from({ length: Math.max(0, RESEARCH_TARGET - current.freelanceOpportunities.length) }, (_, index): FreelanceOpportunity => ({
            id: crypto.randomUUID(), title: `Tutorial research lead ${current.freelanceOpportunities.length + index + 1}`,
            platform: index % 2 ? 'Example marketplace' : 'Example projects',
            url: '', skills: index % 2 ? 'API development, testing' : 'Documentation, automation',
            budget: 'Illustrative only', verdict: 'Unreviewed',
            notes: 'Fictional tutorial example, not a real opportunity.', createdAt: new Date().toISOString(),
          }))],
      }, 'Tutorial research examples added', 'income'))}>Fill research examples</button>}
    <div className="operation-tools-note"><Info size={16} /><p>Research the market first. A lead sitting here is not an application, a commitment, or a sign of readiness &mdash; it is only a note to look into further.</p></div>
    <div className="operation-tools-stats">
      <div className="operation-tools-stat"><strong>{opportunities.length} / {RESEARCH_TARGET}</strong><span>Collected vs. this sprint's research target</span></div>
      <div className="operation-tools-stat"><strong>{classifiedCount} / {opportunities.length}</strong><span>Classified (verdict set beyond Unreviewed)</span></div>
    </div>
    <div className="freelance-filters" data-tour="freelance-filters">
      <select aria-label="Filter by platform" value={platformFilter} onChange={event => setPlatformFilter(event.target.value)}>
        <option value="all">All platforms</option>
        {platforms.map(platform => <option key={platform} value={platform}>{platform}</option>)}
      </select>
      <select aria-label="Filter by verdict" value={verdictFilter} onChange={event => setVerdictFilter(event.target.value)}>
        <option value="all">All verdicts</option>
        {freelanceVerdicts.map(verdict => <option key={verdict} value={verdict}>{verdict}</option>)}
      </select>
      <span className="freelance-count">{selectedIds.length} / {MAX_BRIEF_SELECTION} selected for review brief</span>
      <span className="privacy-note"><LockKeyhole size={14} />Browser-only data</span>
    </div>
    {filtered.length ? <div className="table-scroll"><table className="freelance-table"><thead><tr>
      <th>Select</th><th>Role / title</th><th>Platform</th><th>Skills</th><th>Budget</th><th>Verdict</th><th>Link</th>
    </tr></thead><tbody>{filtered.map(item => <tr key={item.id}>
      <td className="freelance-select-cell"><input type="checkbox" data-tour="freelance-select" aria-label={`Select ${item.title} for review brief`}
        checked={selectedIds.includes(item.id)}
        disabled={!selectedIds.includes(item.id) && selectedIds.length >= MAX_BRIEF_SELECTION}
        onChange={event => toggleSelect(item.id, event.target.checked)} /></td>
      <td><strong>{item.title}</strong>{item.notes && <small>{item.notes}</small>}</td>
      <td>{item.platform}</td>
      <td className="freelance-skills">{item.skills || '—'}</td>
      <td>{item.budget || '—'}</td>
      <td><select data-tour="freelance-verdict" aria-label={`Verdict for ${item.title}`} value={item.verdict} onChange={event => setVerdict(item, event.target.value as FreelanceOpportunity['verdict'])}>
        {freelanceVerdicts.map(verdict => <option key={verdict} value={verdict}>{verdict}</option>)}
      </select></td>
      <td>{item.url ? <a href={item.url} target="_blank" rel="noreferrer noopener" className="text-link">Open</a> : 'No link'}</td>
    </tr>)}</tbody></table></div>
      : <Empty title="No opportunities yet.">Add a lead from a freelance platform to start this sprint's research.</Empty>}
    <div className="freelance-brief" data-tour="freelance-brief">
      <SectionTitle eyebrow="LOCAL REVIEW BRIEF" title="Selected opportunities" />
      <p className="muted small">Select exactly {MAX_BRIEF_SELECTION} rows above to build a plain-text brief for your own review. This selection is not saved and clears on reload.</p>
      <textarea readOnly rows={8} value={briefText || 'Select opportunities above to generate a brief.'} aria-label="Review brief text" />
      <div className="freelance-brief-actions">
        <button className="button secondary" data-tour="freelance-copy" disabled={selected.length !== MAX_BRIEF_SELECTION} onClick={copyBrief}><ClipboardCopy size={15} />Copy brief</button>
        {copied && <span className="muted small" data-tour="freelance-copy-success">Copied to clipboard.</span>}
        {copyError && <span className="freelance-brief-error" data-tour="freelance-copy-error" role="alert">{copyError}</span>}
      </div>
    </div>
    {showAdd && <AddOpportunityModal practice={practice} onSave={addOpportunity} onClose={() => setShowAdd(false)} />}
  </>;
}

interface RecallWorkItem {
  key: string;
  missionId: MissionId;
  checkpointId: string;
  roadmapVersion: RoadmapVersion;
  missionName: string;
  checkpointTitle: string;
  archived: boolean;
}

const recallStatusLabels: Record<string, string> = {
  'not-started': 'Not started', learning: 'Learning', practiced: 'Practiced',
  'needs-review': 'Needs review', retained: 'Retained',
};

function requiredChecksMet(missionId: MissionId, checks: { explanation: boolean; diagram: boolean; exercise: boolean }): boolean {
  return checks.explanation && checks.exercise && (missionId === 'pattern' || checks.diagram);
}

function RecordRecallModal({ item, history, onSave, onClose }: {
  item: RecallWorkItem;
  history: RecallEntry[];
  onSave: (outcome: RecallEntry['outcome'], checks: RecallEntry['checks'], notes: string) => boolean;
  onClose: () => void;
}) {
  const [outcome, setOutcome] = useState<RecallEntry['outcome']>('needs-review');
  const [explanation, setExplanation] = useState(false);
  const [diagram, setDiagram] = useState(false);
  const [exercise, setExercise] = useState(false);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const checks = { explanation, diagram, exercise };
  const independentReady = requiredChecksMet(item.missionId, checks);
  const saveDisabled = outcome === 'independent' && !independentReady;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saveDisabled) { setError('Independent recall needs every required check for this mission type.'); return; }
    if (onSave(outcome, checks, notes.trim())) onClose();
    else setError('This recall could not be saved. Check the workspace warning and try again.');
  }

  return <Modal title="Record recall" subtitle={`${item.missionName} · ${item.checkpointTitle}`} onClose={onClose}>
    <form onSubmit={submit} className="stack-form">
      <div className="form-context"><span className="eyebrow">CHECKPOINT</span><strong>{item.checkpointTitle}</strong><small>Roadmap v{item.roadmapVersion}{item.archived ? ' (archived)' : ''}</small></div>
      <fieldset className="recall-checks" data-tour="recall-checks"><legend>Self-check from memory, not from notes</legend>
        <label className="checkbox-label"><input type="checkbox" data-required="true" checked={explanation} onChange={event => setExplanation(event.target.checked)} /><span>Explain from memory</span></label>
        <label className="checkbox-label"><input type="checkbox" data-required={item.missionId !== 'pattern'} checked={diagram} onChange={event => setDiagram(event.target.checked)} /><span>Draw from memory{item.missionId === 'pattern' ? ' (optional for this mission)' : ''}</span></label>
        <label className="checkbox-label"><input type="checkbox" data-required="true" checked={exercise} onChange={event => setExercise(event.target.checked)} /><span>Complete exercise</span></label>
      </fieldset>
      <fieldset className="recall-outcome" data-tour="recall-outcome"><legend>Outcome</legend>
        <label><input type="radio" name="outcome" checked={outcome === 'needs-review'} onChange={() => setOutcome('needs-review')} />Needs review</label>
        <label><input type="radio" name="outcome" checked={outcome === 'partial'} onChange={() => setOutcome('partial')} />Partial</label>
        <label><input type="radio" name="outcome" data-tour="recall-independent-choice" checked={outcome === 'independent'} onChange={() => setOutcome('independent')} />Independent</label>
      </fieldset>
      <label>Notes <span className="optional">(optional)</span><textarea value={notes} onChange={event => setNotes(event.target.value)} maxLength={2000} rows={3} placeholder="What came back easily, what didn't." /></label>
      <p className="privacy-note"><LockKeyhole size={14} />Self-reported retention, not an AI assessment. Saving does not change your learning roadmap or grant new mastery.</p>
      {history.length > 0 && <div className="recall-history"><span className="eyebrow">PAST REVIEWS FOR THIS CHECKPOINT</span>
        {history.slice(0, 5).map(entry => <div className="recall-history-row" key={entry.id}><time dateTime={entry.createdAt}>{new Date(entry.createdAt).toLocaleDateString()}</time><span>{entry.outcome}</span></div>)}
      </div>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="modal-footer"><button type="button" className="button secondary" onClick={onClose}>Cancel</button><button className="button primary" data-tour="recall-save" disabled={saveDisabled}>Save recall</button></div>
    </form>
  </Modal>;
}

export function RecallPage({ state, commit, practice = false }: { state: AppState; commit: Commit; practice?: boolean }) {
  const [missionFilter, setMissionFilter] = useState<'all' | typeof recallMissionIds[number]>('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeItem, setActiveItem] = useState<RecallWorkItem | null>(null);
  const [expanded, setExpanded] = useState<string[]>([]);
  const exampleMission = (['pattern', 'system'] as const).find(id => {
    const progress = state.missions[id];
    return progress.mode === 'active' && progress.status !== 'completed' && !progress.blocker;
  });

  const items = useMemo(() => {
    const map = new Map<string, RecallWorkItem>();
    for (const evidence of state.evidence) {
      if (!recallMissionIds.some(id => id === evidence.missionId)) continue;
      const version = recordRoadmapVersion(evidence);
      const key = `${evidence.missionId}:${version}:${evidence.checkpointId}`;
      if (map.has(key)) continue;
      const missionName = getMissionVersion(evidence.missionId, version).name;
      const checkpointTitle = getCheckpoint(evidence.missionId, evidence.checkpointId, version).title;
      const archived = state.missions[evidence.missionId].roadmapVersion !== version;
      map.set(key, {
        key, missionId: evidence.missionId, checkpointId: evidence.checkpointId, roadmapVersion: version,
        missionName, checkpointTitle, archived,
      });
    }
    return [...map.values()];
  }, [state.evidence, state.missions]);

  const rows = items.map(item => ({ item, summary: recallSummary(state, item.missionId, item.checkpointId, item.roadmapVersion) }))
    .filter(({ item }) => missionFilter === 'all' || item.missionId === missionFilter)
    .filter(({ summary }) => statusFilter === 'all' || summary.status === statusFilter);

  function historyFor(item: RecallWorkItem): RecallEntry[] {
    return state.recalls
      .filter(entry => entry.missionId === item.missionId && entry.checkpointId === item.checkpointId && entry.roadmapVersion === item.roadmapVersion)
      .slice().reverse();
  }

  function saveRecall(item: RecallWorkItem, outcome: RecallEntry['outcome'], checks: RecallEntry['checks'], notes: string): boolean {
    return commit(current => recordRecall(current, {
      missionId: item.missionId, roadmapVersion: item.roadmapVersion, checkpointId: item.checkpointId,
      outcome, checks, notes,
    }));
  }

  return <>
    <PageHeading eyebrow="PATTERN / SYSTEM / FIELDCRAFT" title="Spaced recall" description="Check in on what you can still retrieve from memory. This is self-reported, not a new assessment." />
    {practice && !items.length && <div className="panel">
      <p className="muted small">This chapter needs saved work. Add a fictional practice note without completing a checkpoint.</p>
      <button className="button secondary" data-tour="recall-example" disabled={!exampleMission} onClick={() => {
        if (exampleMission) commit(current => recordEvidence(current, {
          missionId: exampleMission, checkpointId: current.missions[exampleMission].checkpointId,
          title: 'Tutorial recall example', summary: 'Fictional practice note for learning the recall controls, not real completed work.',
          kind: 'note', url: '', advance: false, criteriaConfirmed: false,
        }));
      }}>Add tutorial recall example</button>
      {!exampleMission && <p className="muted small">Bring an unblocked DSA or System Design mission into focus first.</p>}
    </div>}
    <div className="operation-tools-note"><Info size={16} /><p>Rough rhythm: a first review around 24 hours after practice, a second about 4&ndash;5 days later. Two appropriately spaced independent reviews move a checkpoint toward Retained. A later review that doesn't go well simply flags it as Needs review &mdash; it does not delete your checkpoint completion or undo the roadmap. There is no backlog to feel behind on; only checkpoints with saved work appear here.</p></div>
    <div className="recall-filters" data-tour="recall-filters">
      <select aria-label="Filter by mission" value={missionFilter} onChange={event => setMissionFilter(event.target.value as typeof missionFilter)}>
        <option value="all">All missions</option>
        <option value="pattern">Pattern Forge</option>
        <option value="system">System Forge</option>
        <option value="fde">Forward Deployed Engineering</option>
      </select>
      <select aria-label="Filter by status" value={statusFilter} onChange={event => setStatusFilter(event.target.value)}>
        <option value="all">All statuses</option>
        <option value="not-started">Not started</option>
        <option value="learning">Learning</option>
        <option value="practiced">Practiced</option>
        <option value="needs-review">Needs review</option>
        <option value="retained">Retained</option>
      </select>
    </div>
    {rows.length ? <div className="recall-list">{rows.map(({ item, summary }) => {
      const history = historyFor(item);
      const isOpen = expanded.includes(item.key);
      return <article className="recall-card" key={item.key}>
        <div className="recall-card-top">
          <div><h3>{item.checkpointTitle}</h3><p>{item.missionName}</p></div>
          <div className="recall-card-meta">
            <Badge tone={`recall-tone-${summary.status}`}>{recallStatusLabels[summary.status] ?? summary.status}</Badge>
            <Badge tone={item.archived ? 'recall-tone-archived' : ''}>v{item.roadmapVersion}{item.archived ? ' · archived' : ''}</Badge>
          </div>
        </div>
        <div className="recall-schedule">
          {summary.lastReviewedAt && <span>Last reviewed {new Date(summary.lastReviewedAt).toLocaleDateString()}. </span>}
          {summary.nextReviewAt ? <span>Next suggested review: {new Date(summary.nextReviewAt).toLocaleDateString()}.</span> : <span>No review scheduled yet.</span>}
        </div>
        <div className="button-row">
          <button className="button primary" data-tour="recall-add" onClick={() => setActiveItem(item)}>Record recall</button>
          {history.length > 0 && <button className="text-button" onClick={() => setExpanded(current => isOpen ? current.filter(key => key !== item.key) : [...current, item.key])}>{isOpen ? 'Hide' : 'Show'} history ({history.length})</button>}
        </div>
        {isOpen && history.length > 0 && <div className="recall-history">{history.map(entry => <div className="recall-history-row" key={entry.id}><time dateTime={entry.createdAt}>{new Date(entry.createdAt).toLocaleDateString()}</time><span>{entry.outcome}</span>{entry.notes && <span>&mdash; {entry.notes}</span>}</div>)}</div>}
      </article>;
    })}</div>
      : <Empty title="No recall work yet." icon="book">Saved work for Pattern Forge, System Forge or Forward Deployed Engineering checkpoints will appear here for review.</Empty>}
    {activeItem && <RecordRecallModal item={activeItem} history={historyFor(activeItem)}
      onSave={(outcome, checks, notes) => saveRecall(activeItem, outcome, checks, notes)}
      onClose={() => setActiveItem(null)} />}
  </>;
}
