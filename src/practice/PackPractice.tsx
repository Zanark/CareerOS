import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, FileText, RefreshCw } from 'lucide-react';
import { Badge, Empty, ExternalLink, MissionIcon, PageHeading } from '../components';
import { getCheckpoint, getLatestMission, getMission } from '../domain/catalog';
import type { AppState, Checkpoint, Mission } from '../domain/types';
import { loadRoadmapPack } from '../domain/roadmapPacks/load';
import {
  formatPackPages, getPackOutline, isPackMissionId, packCheckpointId, packUnitForCheckpoint,
  packUnitHref, roadmapPackOutlines,
} from '../domain/roadmapPacks/registry';
import type { PackMissionId, PackSection, PackUnit, RoadmapPack } from '../domain/roadmapPacks/types';
import { missionAccentStyle } from '../missionVisuals';
import { careerSkillLinks } from '../graph/careerSkillLinks';
import './pack-practice.css';

export function PackPracticeLink({ mission, checkpoint }: { mission: Mission; checkpoint?: Checkpoint }) {
  const pack = getPackOutline(mission.id);
  if (!pack) return null;
  const unit = packUnitForCheckpoint(mission.id, checkpoint);
  return <aside className="dsa-practice-link" data-tour="pack-practice-link">
    <BookOpen size={20} /><div><strong>{unit ? 'Practice for this checkpoint' : 'The complete practice roadmap'}</strong>
      <p>Concepts, worked reasoning, exercises, transfer tasks and source gates. Browsing does not change your saved tracker.</p>
    </div><a className="text-link" data-tour="pack-current-library-open" href={packUnitHref(mission.id, unit?.id)}>Open practice library<ArrowRight size={15} /></a>
  </aside>;
}

function StudySection({ section }: { section: PackSection }) {
  return <details className="pack-study-section">
    <summary>{section.heading}</summary>
    {section.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
    {section.items.length > 0 && <ul>{section.items.map((item, index) => <li key={index}>{item}</li>)}</ul>}
  </details>;
}

function searchableUnit(unit: PackUnit) {
  return [
    unit.title, unit.sourceId, unit.summary, ...unit.concepts, ...unit.criteria, unit.recovery,
    ...unit.sections.flatMap(section => [section.heading, ...section.paragraphs, ...section.items]),
    ...unit.exercises.flatMap(exercise => [exercise.title, exercise.task, exercise.check ?? '']),
  ].join(' ').toLowerCase();
}

function RelatedPractice({ missionId, unit }: { missionId: PackMissionId; unit: PackUnit }) {
  const checkpointId = packCheckpointId(missionId, unit.id);
  const links = careerSkillLinks.filter(link =>
    link.source.missionId === missionId && link.source.checkpointId === checkpointId ||
    link.target.missionId === missionId && link.target.checkpointId === checkpointId);
  if (!links.length) return null;
  return <details className="pack-study-section" data-tour="pack-related-practice">
    <summary>Connected learning in other missions ({links.length})</summary>
    <p>Curated transfer opportunities, not extra prerequisites or equivalent completion. Reuse understanding, then demonstrate this checkpoint with its own evidence.</p>
    <ul>{links.map(link => {
      const peer = link.source.missionId === missionId ? link.target : link.source;
      const checkpoint = getCheckpoint(peer.missionId, peer.checkpointId, peer.roadmapVersion);
      const peerUnit = packUnitForCheckpoint(peer.missionId, checkpoint);
      return <li key={link.id}><strong>{link.concept}</strong><p>{link.reason}</p>
        <a className="text-link" href={peerUnit ? packUnitHref(peer.missionId, peerUnit.id) : `#/mission/${peer.missionId}`}>
          {getLatestMission(peer.missionId).name}: {checkpoint.title}<ArrowRight size={14} /></a></li>;
    })}</ul>
  </details>;
}

function PracticeIndex() {
  return <div className="pack-practice-page">
    <PageHeading eyebrow="SOURCE-BASED PRACTICE" title="Practice libraries"
      description="Open a complete curriculum without changing your current checkpoint. Exercises and references are separate from recorded progress." />
    <div className="pack-library-grid">
      {roadmapPackOutlines.map(pack => {
        const mission = getLatestMission(pack.missionId);
        return <a key={pack.missionId} href={packUnitHref(pack.missionId)} className={`pack-library-card ${mission.color}`} style={missionAccentStyle(mission.id)}>
          <MissionIcon mission={mission} /><h2>{mission.name}</h2><p>{pack.title}</p>
          <span>{pack.units.filter(unit => unit.role === 'checkpoint').length} checkpoints / {pack.exerciseCount} exercises</span>
          <span>{pack.sourceKind === 'web-research' ? `${pack.webSources?.length} reviewed primary sources`
            : pack.sourceKind === 'mixed' ? `${pack.pageCount}-page source + ${pack.webSources?.length} public references`
              : `${pack.pageCount}-page source`}<ArrowRight size={16} /></span>
        </a>;
      })}
      <a href="#/dsa/1" className="pack-library-card sage"><BookOpen /><h2>DSA</h2><p>The retained complete LeetCode roadmap.</p><span>50 sections / 939 problem appearances<ArrowRight size={16} /></span></a>
      <a href="#/system-practice" className="pack-library-card blue"><BookOpen /><h2>System Design</h2><p>Concepts, module exercises and independent design cases.</p><span>72 modules / 15 cases<ArrowRight size={16} /></span></a>
    </div>
  </div>;
}

export function PackPracticePage({ state, missionId, entryId }: { state: AppState; missionId?: string; entryId?: string }) {
  if (!missionId) return <PracticeIndex />;
  if (!isPackMissionId(missionId)) return <Empty title="That practice roadmap was not found."><a href="#/practice">Open the practice libraries</a></Empty>;
  return <LoadedPractice key={missionId} state={state} missionId={missionId} entryId={entryId} />;
}

function LoadedPractice({ state, missionId, entryId }: { state: AppState; missionId: PackMissionId; entryId?: string }) {
  const mission = getLatestMission(missionId);
  const active = getMission(missionId, state);
  const outline = getPackOutline(missionId);
  const research = outline?.sourceKind === 'web-research';
  const mixed = outline?.sourceKind === 'mixed';
  const [pack, setPack] = useState<RoadmapPack | null>(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [phase, setPhase] = useState('');
  const [role, setRole] = useState('');
  useEffect(() => {
    let cancelled = false;
    loadRoadmapPack(missionId).then(result => {
      if (!cancelled) { setPack(result); setError(''); }
    }, reason => {
      if (!cancelled) setError(reason instanceof Error ? reason.message : 'The practice roadmap could not be loaded.');
    });
    return () => { cancelled = true; };
  }, [missionId]);

  const searchIndex = useMemo(() => pack?.units.map(unit => ({ unit, text: searchableUnit(unit) })) ?? [], [pack]);
  const visible = searchIndex.filter(entry =>
    (!query.trim() || entry.text.includes(query.trim().toLowerCase())) &&
    (!phase || entry.unit.phaseId === phase) &&
    (!role || entry.unit.role === role)).map(entry => entry.unit);
  const current = packUnitForCheckpoint(missionId, active.checkpoints.find(checkpoint => checkpoint.id === state.missions[missionId].checkpointId));
  const unit = entryId ? pack?.units.find(candidate => candidate.id === entryId)
    : pack?.units.find(candidate => candidate.id === current?.id) ?? pack?.units.find(candidate => candidate.role === 'checkpoint');
  const position = unit ? pack?.units.findIndex(candidate => candidate.id === unit.id) ?? -1 : -1;
  const previous = position > 0 ? pack?.units[position - 1] : undefined;
  const next = position >= 0 ? pack?.units[position + 1] : undefined;
  const currentCheckpoint = unit?.role === 'checkpoint' &&
    state.missions[missionId].checkpointId === packCheckpointId(missionId, unit.id);
  const unitResearch = research || Boolean(unit?.sourceIds?.length);

  return <div className={`pack-practice-page ${mission.color}`} style={missionAccentStyle(mission.id)} data-tour="pack-library">
    <PageHeading eyebrow={`${mission.operation.toUpperCase()} / COMPLETE PRACTICE`} title={`${mission.name} practice`}
      description={outline?.overview ?? mission.description}>
      <a className="button secondary" href={`#/mission/${missionId}`}>My saved tracker<ArrowRight size={15} /></a>
    </PageHeading>
    <div className="pack-source-notice">
      <p><strong>{outline?.units.filter(candidate => candidate.role === 'checkpoint').length} curriculum checkpoints / {outline?.exerciseCount} exercises.</strong>
        {' '}Practice banks and references are also included, without extra completion credit.</p>
      <p><span className="pack-source-name">{outline?.document}</span> / {research ? `${outline?.webSources?.length} primary sources; original research synthesis, not a PDF.`
        : mixed ? `${outline?.pageCount} original pages plus ${outline?.webSources?.length} public extension sources; web lessons have no invented PDF pages.`
          : `${outline?.pageCount} pages.`}
        {' '}Your saved tracker is v{active.roadmapVersion}. Reading ahead does not adopt the new edition or advance your checkpoint.</p>
      <div className="button-row"><a className="text-link" href="#/practice">All practice libraries</a>
        <a className="text-link" href={`#/sources/${missionId}`}>Source notes and tracker update</a></div>
    </div>
    {error && <div className="alert error" role="alert"><span>Practice content could not be loaded: {error}</span>
      <button className="button secondary" onClick={() => window.location.reload()}><RefreshCw size={15} />Reload library</button></div>}
    {!pack && !error && <p role="status">Loading this roadmap's study material...</p>}
    {pack && <>
      <details className="pack-shared-guide" data-tour="pack-shared-guide">
        <summary>How to use this roadmap: practice, diagnostics and retention</summary>
        {pack.commonSections.map((section, index) => <StudySection key={index} section={section} />)}
        <p>The source's capability states describe evidence quality, not automatically assigned app statuses. The site does not grade answers, run labs, assess interviews or verify credentials.</p>
      </details>
      <div className="pack-filters">
        <label>Search this roadmap<input type="search" value={query} onChange={event => setQuery(event.target.value)}
          placeholder="Topic or exercise" /></label>
        <label>Stage or reference group<select value={phase} onChange={event => setPhase(event.target.value)}>
          <option value="">All groups</option>{pack.phases.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}
        </select></label>
        <label>Material<select value={role} onChange={event => setRole(event.target.value)}>
          <option value="">All material</option><option value="checkpoint">Curriculum checkpoints</option>
          <option value="practice">Practice banks and cases</option><option value="reference">Supporting references</option>
        </select></label>
      </div>
      <div className="pack-unit-chooser">
        <label>Module, exercise bank or reference<select aria-label="Practice module or reference" data-tour="pack-unit-select" value={unit?.id ?? ''}
          onChange={event => { window.location.hash = packUnitHref(missionId, event.target.value); }}>
          {!unit && <option value="" disabled>Choose a source unit</option>}
          {unit && !visible.some(candidate => candidate.id === unit.id) && <option value={unit.id}>Selected (outside filters): {unit.sourceId} - {unit.title}</option>}
          {pack.phases.map(item => <optgroup key={item.id} label={item.title}>
            {visible.filter(candidate => candidate.phaseId === item.id).map(candidate =>
              <option key={candidate.id} value={candidate.id}>{candidate.sourceId} - {candidate.title}{candidate.role === 'checkpoint' ? '' : ` (${candidate.role})`}</option>)}
          </optgroup>)}
        </select></label>
        <p role="status">{visible.length} matching source units. Filters narrow the chooser; the selected lesson stays open.</p>
        {!!(query || phase || role) && <button className="text-button" onClick={() => { setQuery(''); setPhase(''); setRole(''); }}>Clear filters</button>}
        {current && current.id !== unit?.id && <a className="text-link" href={packUnitHref(missionId, current.id)}>Current checkpoint's practice<ArrowRight size={15} /></a>}
      </div>
      {!unit ? <p className="pack-missing" role="alert">That source unit was not found. Choose a module or reference from the roadmap above.</p> : <section className="pack-study-unit" data-tour="pack-study-unit" aria-labelledby="pack-unit-title">
        <div className="pack-unit-meta"><span className="eyebrow"><FileText size={16} />{unit.sourceId} / {unitResearch ? 'RESEARCH-BACKED FIELDWORK' : `PDF PAGES ${formatPackPages(unit.pages)}`}</span>
          <Badge>{unit.role === 'checkpoint' ? currentCheckpoint ? 'Your saved checkpoint' : 'Curriculum checkpoint' : 'Practice / reference only'}</Badge></div>
        <h2 id="pack-unit-title">{unit.title}</h2><p>{unit.summary}</p>
        {unitResearch && <details className="pack-study-section" data-tour="pack-unit-sources">
          <summary>Reviewed sources for this lesson ({unit.sourceIds?.length ?? 0})</summary>
          <p>These sources inform the original teaching design; exercises and criteria are authored here, not quotations or official employer requirements. Reviewed {pack.reviewedAt}.</p>
          <ul>{pack.webSources?.filter(source => unit.sourceIds?.includes(source.id)).map(source =>
            <li key={source.id}><ExternalLink href={source.url}>{source.title}</ExternalLink><p>{source.scope}</p></li>)}</ul>
        </details>}
        {unit.role !== 'checkpoint' && <p className="pack-reference-note">Independently browsable material, not an additional required checkpoint. Opening it records no result.</p>}
        <div className="pack-start"><h3>A starting task</h3><p>{unit.action}</p>
          <span>{unit.minutes} minutes is a starting-session estimate, not a mastery deadline.</span></div>
        {unit.concepts.length > 0 && <div className="pack-concepts"><h3>Concepts and variations</h3><ul>{unit.concepts.map((concept, index) => <li key={index}>{concept}</li>)}</ul></div>}
        <div className="pack-unit-guidance" data-tour="pack-unit-guidance">{unit.sections.map((section, index) => <StudySection key={index} section={section} />)}</div>
        <RelatedPractice missionId={missionId} unit={unit} />
        {unit.exercises.length > 0 && <section className="pack-exercises" data-tour="pack-exercises">
          <h3>Practice and transfer exercises <span>{unit.exercises.length}</span></h3>
          <p>Attempt the task before reviewing the evidence check. A check describes the source expectation, not an automatically graded result.</p>
          <ol>{unit.exercises.map((exercise, index) => <li key={index}>
            <div className="pack-exercise-heading"><h4>{exercise.title}</h4>{exercise.level && <Badge>{exercise.level}</Badge>}</div>
            <p>{exercise.task}</p>
            {exercise.check && <details><summary>Evidence / diagnostic check</summary><p>{exercise.check}</p></details>}
            <small>{exercise.page !== undefined ? `Source p.${exercise.page}` : `Authored fieldwork / reviewed ${pack.reviewedAt}`}</small>
          </li>)}</ol>
        </section>}
        {(unit.criteria.length > 0 || unit.recovery) && <section className="pack-mastery" data-tour="pack-mastery">
          <h3>Mastery evidence and recovery</h3>
          {unit.criteria.length > 0 && <ul>{unit.criteria.map((criterion, index) => <li key={index}>{criterion}</li>)}</ul>}
          {unit.recovery && <p><strong>If it is not secure yet:</strong> {unit.recovery}</p>}
          <p>Keep exactly one current checkpoint per mission. Save evidence on your tracker; this library never marks work complete.</p>
        </section>}
        <nav className="pack-pagination" aria-label="Source unit navigation">
          {previous && <a className="text-link" href={packUnitHref(missionId, previous.id)}><ArrowLeft size={15} />{previous.sourceId}: {previous.title}</a>}
          {next && <a className="text-link" href={packUnitHref(missionId, next.id)}>{next.sourceId}: {next.title}<ArrowRight size={15} /></a>}
        </nav>
      </section>}
      <details className="pack-shared-guide"><summary>Source scope and integration notes</summary>
        <ul>{pack.sourceNotes.map((note, index) => <li key={index}>{note}</li>)}</ul>
      </details>
    </>}
    <p className="pack-public-note">{mixed
      ? 'The original private PDF is unchanged and unpublished. The agent-cloud extension is original learning design from reviewed public sources; local synthetic practice is not a production deployment or automatic mastery.'
      : research
      ? 'Original learning design informed by reviewed public sources, not an official employer syllabus or a solved-answer bank. No customer data, paid account or production access is required.'
      : 'Study material is authored from the supplied roadmap, not a solved-answer bank. The original PDF and private baseline information are not published.'}</p>
  </div>;
}
