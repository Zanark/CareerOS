import { ArrowRight, BookOpen, FileText } from 'lucide-react';
import { getMission } from '../domain/catalog';
import type { AppState, Checkpoint } from '../domain/types';
import { PageHeading } from '../components';
import {
  SYSTEM_PRACTICE_SOURCE, systemDecisionLens, systemDiagnostics, systemDifficultyLadder, systemInterviewPrompts,
  systemLearningStates, systemMasteryChecks, systemPracticeFor, systemPracticePhases,
  systemMentalModel, systemPracticeProtocol, systemPracticeUnits, systemSketchTemplate, systemTransferDrills,
} from '../domain/operations/systemPracticeStudy';
import { systemCaseGuidance } from '../domain/operations/systemPracticeContent';
import { systemConceptGroups } from './concepts';
import './system-practice.css';

export function SystemPracticeLink({ checkpoint }: { checkpoint?: Checkpoint }) {
  const unit = systemPracticeFor(checkpoint);
  if (!unit) return null;
  return <aside className="dsa-practice-link" data-tour="system-practice-link">
    <BookOpen size={20} /><div><strong>Problems for this checkpoint</strong>
      <p>{unit.kind === 'module' ? 'Practice tasks, transfer drills and the source mastery gate.' : 'Scope, primary flow, failure scenarios and trade-off defense for this case.'}</p>
    </div><a className="text-link" href={`#/system-practice/${unit.id}`}>Open design exercises<ArrowRight size={15} /></a>
  </aside>;
}

export function SystemPracticePage({ state, entryId, conceptGroupId }: {
  state: AppState; entryId?: string; conceptGroupId?: string;
}) {
  const active = getMission('system', state);
  const current = systemPracticeFor(active.checkpoints.find(checkpoint => checkpoint.id === state.missions.system.checkpointId));
  const concept = systemConceptGroups.find(group => group.id === conceptGroupId);
  const visible = systemPracticeUnits.filter(unit => !conceptGroupId || unit.conceptGroupIds.includes(conceptGroupId));
  const unit = entryId ? visible.find(candidate => candidate.id === entryId) :
    visible.find(candidate => candidate.id === current?.id) ?? visible[0];
  const phaseFor = (number: number) => systemPracticePhases.find(phase => number >= phase.start && number <= phase.end);
  const unitRoute = (id: string) => conceptGroupId ? `#/system-practice/concept/${conceptGroupId}/${id}` : `#/system-practice/${id}`;

  return <div className="system-practice-page">
    <div data-tour="system-practice-intro">
      <PageHeading eyebrow="SYSTEM FORGE / PROBLEMS & EXERCISES" title="System Design problems"
        help={<>Practice material from {SYSTEM_PRACTICE_SOURCE}. Modules, diagnostic gates and independent cases remain separate from saved completion. The concepts view is a connected reference, not another set of prerequisites.</>}>
        <a href="#/mission/system" className="button secondary">System Design mission<ArrowRight size={15} /></a>
      </PageHeading>
      <div className="system-concept-notice">
        <p><strong>72 modules / 15 cases / 8 diagnostics.</strong> Tracker v{active.roadmapVersion} / <a href="#/system-concepts">Concepts map</a></p>
      </div>
    </div>
    <details className="system-practice-guide"><summary>Learning sequence, source states and review rules</summary>
      <ol>{systemPracticeProtocol.map(item => <li key={item}>{item}</li>)}</ol>
      <dl>{systemLearningStates.map(([label, meaning]) => <div key={label}><dt>{label}</dt><dd>{meaning}</dd></div>)}</dl>
      <p>The source's learning labels describe capability. They are not six automatically calculated app statuses, and reading a lesson is not a retained-skill assessment.</p>
      <h3>Case-study practice</h3><ul>{systemCaseGuidance.map(item => <li key={item}>{item}</li>)}</ul>
    </details>
    {conceptGroupId && <div className="system-practice-context">
      <span>{concept ? `Related to: ${concept.title}` : 'That concept group was not found.'}</span>
      <a className="text-link" href="#/system-practice">Show the whole problems roadmap<ArrowRight size={15} /></a>
    </div>}
    <div className="system-practice-selectors">
      <label>Module or case study<select data-tour="system-practice-select" aria-label="System Design module or case" value={unit?.id ?? ''}
        onChange={event => { window.location.hash = unitRoute(event.target.value); }}>
        {!unit && <option value="" disabled>Choose a module or case</option>}
        {systemPracticePhases.map(phase => <optgroup key={phase.id} label={phase.title}>
          {visible.filter(candidate => candidate.kind === 'case' ? phase.id === 'i' : phaseFor(candidate.number)?.id === phase.id).map(candidate =>
            <option key={candidate.id} value={candidate.id}>{candidate.kind === 'module' ? `${String(candidate.number).padStart(2, '0')}.` : `Case ${candidate.letter}:`} {candidate.title}</option>)}
        </optgroup>)}
      </select></label>
      {current && (!conceptGroupId || current.conceptGroupIds.includes(conceptGroupId)) &&
        <a href={unitRoute(current.id)} className="button secondary">Current checkpoint's exercises</a>}
    </div>
    {!unit ? <p className="system-practice-empty" role="alert">No module or case matches this view. Choose from the supplied roadmap above.</p> : <>
      <section className="system-practice-unit" aria-labelledby="system-practice-title" data-tour="system-practice-unit">
        <span className="eyebrow"><FileText size={16} />{unit.kind === 'module' ? `MODULE ${String(unit.number).padStart(2, '0')} / ${unit.track}` : `CASE STUDY ${unit.letter}`} / PDF PAGES {unit.page}-{unit.page + 1}</span>
        <h2 id="system-practice-title">{unit.title}</h2><p>{unit.summary}</p>
        {unit.kind === 'module' ? <>
          <h3>Concepts used</h3><ul className="system-practice-focus">{unit.focus.map(item => <li key={item}>{item}</li>)}</ul>
          <details><summary>Mental model, architecture sketch and decision lens</summary>
            <ul>{systemMentalModel.map(question => <li key={question}>{question}</li>)}</ul>
            <h3>Template for your own sketch</h3>
            <ol className="system-case-flow">{systemSketchTemplate.map(layer => <li key={layer}>{layer}</li>)}</ol>
            <p>Fill in the components for the exercise. Locate a bottleneck and explain what happens when a box is slow or unavailable; this template is not a solved architecture.</p>
            <dl className="system-decision-lens">{systemDecisionLens.map(([label, question]) => <div key={label}><dt>{label}</dt><dd>{question}</dd></div>)}</dl>
          </details>
          <h3>Practice set</h3><ol className="system-practice-prompts">{unit.practice.map(item => <li key={item}>{item}</li>)}</ol>
          <details><summary>Easy, Medium and Hard practice progression</summary>
            <div className="system-practice-levels">{systemDifficultyLadder.map(level => <article key={level.level}><h4>{level.level}</h4><p>{level.task}</p><p><strong>Success:</strong> {level.success}</p></article>)}</div>
          </details>
          <details data-tour="system-transfer-drills"><summary>Change the constraints: transfer drills</summary><ul>{systemTransferDrills.map(drill => <li key={drill}>{drill}</li>)}</ul></details>
          <details><summary>Interview prompts</summary><ul>{systemInterviewPrompts.map(prompt => <li key={prompt}>{prompt}</li>)}</ul></details>
        </> : <>
          <h3>Source component outline</h3>
          <p>This is a discussion outline, not a guaranteed runtime execution order. Draw and justify the actual request, data and failure paths for your design.</p>
          <ul className="system-case-flow">{unit.flow.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul>
          <h3>Scope and high-level design</h3><ol className="system-practice-prompts">{unit.scope.map(item => <li key={item}>{item}</li>)}</ol>
          <h3>Failure, trade-offs and interview defense</h3><ol className="system-practice-prompts">{unit.deepDive.map(item => <li key={item}>{item}</li>)}</ol>
        </>}
        <div className="system-practice-gate"><h3>Source mastery gate</h3><p>{unit.gate}</p>
          <ul>{systemMasteryChecks.map(check => <li key={check}>{check}</li>)}</ul>
          <p className="muted small">Self-confirm the gate only after doing the work. This page does not grade a design or grant checkpoint completion.</p>
        </div>
        <div className="system-related-concepts"><h3>Related concepts</h3>
          {unit.conceptGroupIds.map(id => <a className="text-link" href={`#/system-concepts/${id}`} key={id}>{systemConceptGroups.find(group => group.id === id)?.title ?? id}<ArrowRight size={14} /></a>)}
        </div>
      </section>
    </>}
    <details className="system-practice-guide" data-tour="system-diagnostics"><summary>Eight periodic diagnostic gates</summary>
      <div className="system-diagnostic-grid">{systemDiagnostics.map((diagnostic, index) => <article key={diagnostic.id}><h3>{index + 1}. {diagnostic.title}</h3><p>{diagnostic.task}</p></article>)}</div>
      <p>For each diagnostic, record what you explained from memory, where you needed hints, a missed failure mode and the trade-off to revisit. Source: p.179. Reading these prompts records no result.</p>
    </details>
    <p className="system-practice-source">{SYSTEM_PRACTICE_SOURCE} supplies the practice progression; system-design.pdf supplies the concepts view. Descriptions are authored summaries, not worked solutions. Original PDFs are not published.</p>
  </div>;
}
