import { ArrowRight, ArrowUpRight, CheckCircle2, ChevronDown, ChevronUp, FileText, Paperclip, Trash2 } from 'lucide-react';
import { Fragment, useId, useMemo, useState } from 'react';
import { getCheckpoint, getMissionVersion, recordRoadmapVersion } from '../domain/catalog';
import type { AppState } from '../domain/types';
import { ContextHelp } from '../components';
import { PersonalProofManager } from './PersonalProofManager';
import { removePersonalProof } from './personalProof';
import { missionAccentStyle } from '../missionVisuals';
import { getJournalEntries, groupJournalEntries, journalDateLabel, journalMonthLabel } from './journal';
import type { JournalEntry } from './journal';
import './perspective.css';

function MemoryStory({ text, title }: { text: string; title: string }) {
  const id = useId();
  const [expanded, setExpanded] = useState(false);
  const long = text.length > 280;
  return <div className="journal-story">
    <p id={id} className={long && !expanded ? 'journal-story-text is-collapsed' : 'journal-story-text'}>{text}</p>
    {long && <button type="button" className="text-button journal-expand" aria-expanded={expanded} aria-controls={id}
      aria-label={`${expanded ? 'Show less of' : 'Read more of'} ${title}`} onClick={() => setExpanded(value => !value)}>
      {expanded ? 'Show less' : 'Read more'}{expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
    </button>}
  </div>;
}

function MemoryCard({ entry, practice, sample, onRemove }: {
  entry: JournalEntry; practice: boolean; sample: boolean; onRemove: (id: string) => void;
}) {
  const personal = entry.kind === 'personal' ? entry.record : undefined;
  const evidence = entry.kind === 'evidence' ? entry.record : undefined;
  const mission = evidence && getMissionVersion(evidence.missionId, recordRoadmapVersion(evidence));
  const text = entry.kind === 'personal' ? entry.record.detail : entry.record.summary;
  const colors = ['blue', 'violet', 'sand', 'rose', 'magenta', 'amber'];
  const color = mission?.color ?? colors[entry.order % colors.length];
  const label = practice ? 'Tutorial example' : sample ? 'Sample-containing workspace'
    : personal ? 'Personal history' : evidence?.completedCheckpoint ? 'Checkpoint marked complete' : 'Practice recorded';
  return <article className={`journal-card ${personal ? 'personal-proof-card journal-memory' : `perspective-receipt journal-work${evidence?.completedCheckpoint ? ' journal-milestone' : ''}`} ${color}${text.length > 600 ? ' journal-wide' : ''}`}
    style={mission && missionAccentStyle(mission.id)} data-record-id={entry.key} data-journal-date={entry.day ?? ''}
    aria-labelledby={`journal-title-${entry.key}`}>
    <div className="journal-card-top">
      <span className="journal-entry-kind">{personal ? <Paperclip size={17} /> : evidence?.completedCheckpoint ? <CheckCircle2 size={17} /> : <FileText size={17} />}
        <span className="perspective-receipt-meta">{label}</span>
      </span>
      {entry.day ? <time className="journal-date" dateTime={entry.day}>{evidence && 'Recorded '}{journalDateLabel(entry.day)}</time>
        : <span className="journal-date">Date not recorded</span>}
    </div>
    <h3 id={`journal-title-${entry.key}`}>{entry.record.title}</h3>
    <MemoryStory text={text} title={entry.record.title} />
    <div className="journal-card-links">
      {entry.record.url && <a className="text-link" href={entry.record.url} target="_blank" rel="noopener noreferrer">
        Open supporting artifact<ArrowUpRight size={15} />
      </a>}
      {evidence && <a className="text-link" href={`#/evidence/${evidence.id}`}>Open full record<ArrowUpRight size={15} /></a>}
    </div>
    <details className="journal-details">
      <summary>About this {personal ? 'memory' : 'record'}</summary>
      <div className={personal ? 'personal-proof-source journal-source' : 'journal-source'}>
        {personal && <>
          <span>Source</span><p>{personal.source}</p>
          {personal.date && <p>Date supplied: <time dateTime={personal.date}>{personal.date}</time></p>}
          <button type="button" className="text-button journal-remove" aria-label={`Remove history record: ${personal.title}`} onClick={() => onRemove(personal.id)}>
            <Trash2 size={14} />Remove memory
          </button>
        </>}
        {evidence && mission && <>
          <p>{mission.name} / v{recordRoadmapVersion(evidence)}</p>
          <p>{getCheckpoint(evidence.missionId, evidence.checkpointId, recordRoadmapVersion(evidence)).title}</p>
          <p>{evidence.completedCheckpoint ? 'Checkpoint completion is self-attested.' : 'Practice evidence, not checkpoint completion.'}</p>
          <p>Recorded <time dateTime={evidence.createdAt}>{new Date(evidence.createdAt).toLocaleString()}</time></p>
        </>}
      </div>
    </details>
  </article>;
}

export function Perspective({ state, practice, commit }: {
  state: AppState; practice: boolean; commit: (transform: (state: AppState) => AppState) => boolean;
}) {
  const [shown, setShown] = useState(12);
  const entries = useMemo(() => getJournalEntries(state), [state.personalProof, state.evidence]);
  const dated = entries.filter(entry => entry.day !== undefined);
  const undated = entries.filter(entry => entry.day === undefined);
  const groups = groupJournalEntries([...dated.slice(0, shown), ...undated]);
  const showMore = dated.length > shown && <button type="button" className="button secondary journal-show-more" onClick={() => setShown(count => count + 12)}>Show older memories<ChevronDown size={16} /></button>;
  function removeMemory(id: string) {
    if (window.confirm('Remove this personal-history record? This does not affect mission progress or saved-work evidence.')) {
      commit(current => removePersonalProof(current, id));
    }
  }

  return <div className="perspective-page">
    <section className="perspective-intro" data-tour="perspective-intro" aria-labelledby="perspective-title">
      <div className="journal-heading">
        <div className="journal-eyebrow"><span className="eyebrow">{practice ? 'TUTORIAL PRACTICE' : 'THE STORY SO FAR'}</span>
          <ContextHelp title="Journal dates and sources">
            <p>Newest dates appear first. Personal history uses the date you supplied; saved work shows when it was recorded.
              Date-only memories share their day after timed records. Unknown dates stay unknown.</p>
            <p>Open About this memory or record for its source. Browsing never changes progress.</p>
          </ContextHelp>
        </div>
        <h1 id="perspective-title">{practice ? 'Practice records.' : 'Keep going.'}</h1>
        {practice && <p className="journal-mode-note">Temporary tutorial examples, not your real history.</p>}
        {!practice && state.sampleData && <p className="journal-mode-note">This workspace includes example data; these are not all personal achievements.</p>}
        <a className="text-link journal-back" href="#/hq">Back to Overview<ArrowRight size={15} /></a>
      </div>
      <PersonalProofManager state={state} commit={commit} practice={practice} />
    </section>

    {entries.length > 0 && <div className="journal-feed perspective-record" data-tour="perspective-record">
      {groups.map(group => <Fragment key={group.key}>
        {!group.day && showMore}
        <section className="journal-month" aria-labelledby={`journal-month-${group.key}`}>
          <div className="journal-month-heading">
            <h2 id={`journal-month-${group.key}`}>{group.day ? journalMonthLabel(group.day) : 'Date not recorded'}</h2>
            <span aria-hidden="true" />
          </div>
          <div className="journal-grid">
            {group.entries.map(entry => <MemoryCard key={entry.key} entry={entry} practice={practice} sample={state.sampleData} onRemove={removeMemory} />)}
          </div>
        </section>
      </Fragment>)}
      {undated.length === 0 && showMore}
    </div>}

    {entries.length === 0 && <section className="perspective-empty" data-tour="perspective-record">
      <Paperclip size={27} aria-hidden="true" />
      <h2>{practice ? 'Save an example to see it here.' : 'No memories here yet.'}</h2>
      <p>{practice ? 'Temporary tutorial workspace.' : 'Add past work or load your private history whenever you want.'}</p>
    </section>}
    <footer className="journal-footer">
      <p className="personal-proof-privacy">Browser-local. Included in backups. No extra checkpoint credit.</p>
      <a className="text-link" href="#/evidence">Open all saved work<ArrowRight size={15} /></a>
    </footer>
  </div>;
}
