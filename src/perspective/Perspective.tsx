import { ArrowRight, ArrowUpRight, CheckCircle2, FileText, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { getMissionVersion, recordRoadmapVersion } from '../domain/catalog';
import type { AppState } from '../domain/types';
import { PersonalProofManager } from './PersonalProofManager';
import { removePersonalProof } from './personalProof';
import { missionAccentStyle } from '../missionVisuals';
import './perspective.css';

export function Perspective({ state, practice, commit }: {
  state: AppState; practice: boolean; commit: (transform: (state: AppState) => AppState) => boolean;
}) {
  const [shown, setShown] = useState(12);
  const personal = state.personalProof ?? [];
  const evidence = [...state.evidence].sort((left, right) =>
    Number(right.completedCheckpoint) - Number(left.completedCheckpoint) ||
    Date.parse(right.createdAt) - Date.parse(left.createdAt));
  const hasRecords = personal.length > 0 || evidence.length > 0;
  const colors = ['blue', 'violet', 'sand', 'rose', 'magenta', 'amber'];

  return <div className="perspective-page">
    <section className="perspective-intro" data-tour="perspective-intro" aria-labelledby="perspective-title">
      <span className="eyebrow">{practice ? 'TUTORIAL PRACTICE' : 'KEEP GOING / YOUR OWN TRACK RECORD'}</span>
      <h1 id="perspective-title">{practice ? 'Practice records.' : "What you've already done."}</h1>
      {practice && <p>Temporary tutorial examples, not your real history.</p>}
      <a className="text-link" href="#/hq">Back to Overview<ArrowRight size={16} /></a>
    </section>

    {personal.length > 0 && <section className="personal-proof-records" aria-labelledby="personal-proof-title">
      <div className="perspective-section-heading"><span className="eyebrow">FROM YOUR SUPPLIED HISTORY</span><h2 id="personal-proof-title">Things you already accomplished</h2></div>
      <div className="perspective-receipts">
        {personal.map((record, index) => <article key={record.id} className={`personal-proof-card ${colors[index % colors.length]}`}>
          <div className="personal-proof-card-head"><CheckCircle2 size={22} /><button className="icon-button" aria-label={`Remove history record: ${record.title}`} onClick={() => {
            if (window.confirm('Remove this personal-history record? This does not affect mission progress or saved-work evidence.')) commit(current => removePersonalProof(current, record.id));
          }}><Trash2 size={15} /></button></div>
          <h3>{record.title}</h3>
          <p>{record.detail}</p>
          <div className="personal-proof-source"><span>Source</span><p>{record.source}</p>{record.date && <time dateTime={record.date}>{record.date}</time>}</div>
          {record.url && <a className="text-link" href={record.url} target="_blank" rel="noopener noreferrer">Open supporting artifact<ArrowUpRight size={15} /></a>}
        </article>)}
      </div>
    </section>}

    {evidence.length > 0 && <section className="perspective-record" aria-labelledby="perspective-record-title" data-tour="perspective-record">
      <div className="perspective-section-heading">
        <span className="eyebrow"><FileText size={16} />{practice ? 'PRACTICE EXAMPLES' : 'WORK YOU RECORDED'}</span>
        <h2 id="perspective-record-title">{practice ? 'Tutorial examples, not personal achievements' : state.sampleData ? 'Examples and added records' : 'The work is here'}</h2>
        <p>{state.sampleData && !practice
          ? 'This workspace contains sample data mixed with anything you added. These records are not all personal achievements.'
          : 'Completed checkpoints appear first. Practice notes remain labeled as practice; their dates are when the records were saved.'}</p>
      </div>
      <div className="perspective-receipts">
        {evidence.slice(0, shown).map(item => {
          const mission = getMissionVersion(item.missionId, recordRoadmapVersion(item));
          const checkpoint = mission.checkpoints.find(candidate => candidate.id === item.checkpointId);
          return <a key={item.id} className={`perspective-receipt ${mission.color}`} style={missionAccentStyle(mission.id)} href={`#/evidence/${item.id}`}>
            <span className="perspective-receipt-meta">{practice ? 'Tutorial example' : state.sampleData ? 'Sample-containing workspace' : item.completedCheckpoint ? 'Checkpoint marked complete' : 'Practice recorded'} / {mission.name}</span>
            <h3>{item.title}</h3>
            <p>{item.summary}</p>
            <span className="perspective-checkpoint">{checkpoint?.title} / v{recordRoadmapVersion(item)}</span>
            <span className="perspective-receipt-footer"><time dateTime={item.createdAt}>Recorded {new Date(item.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</time><ArrowUpRight size={17} /></span>
          </a>;
        })}
      </div>
      {evidence.length > shown && <button className="button secondary" onClick={() => setShown(count => count + 12)}>Show more recorded work</button>}
      <a className="text-link" href="#/evidence">Open all saved work<ArrowRight size={15} /></a>
    </section>}

    {!hasRecords && <section className="perspective-empty" data-tour="perspective-record">
      <h2>{practice ? 'Save an example to see it here.' : 'Load your own history'}</h2>
      <p>{practice ? 'Temporary tutorial workspace.' : 'Import a private personal-history file or a workspace backup.'}</p>
    </section>}
    <section className="personal-proof-tools" aria-label="Manage your personal history">
      <PersonalProofManager state={state} commit={commit} practice={practice} />
      <p className="personal-proof-privacy">Browser-local / included in backups / no checkpoint credit.</p>
    </section>
  </div>;
}
