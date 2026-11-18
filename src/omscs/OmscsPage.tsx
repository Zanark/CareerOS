import { useMemo, useState } from 'react';
import { ArrowRight, BookOpen, CalendarDays, Check, GraduationCap, Info, ShieldCheck } from 'lucide-react';
import { Badge, ExternalLink, Modal, PageHeading } from '../components';
import { getMission } from '../domain/catalog';
import { recordChange } from '../domain/engine';
import type { AppState } from '../domain/types';
import { omscsCourses, omscsCourseUnit } from '../domain/omscs/courses';
import {
  getOmscsSchedule, getOmscsScheduleWarnings, getOmscsSummary, omscsTermIndex,
  omscsTermLabel, omscsTermSchema, proposedOmscsPlan, setOmscsCourse, setOmscsRoute,
} from '../domain/omscs/model';
import { omscsReviewedAt, omscsSources } from '../domain/omscs/sources';
import type { OmscsCourse, OmscsCourseRecord, OmscsGrade } from '../domain/omscs/types';
import { packUnitForCheckpoint, packUnitHref } from '../domain/roadmapPacks/registry';
import { missionAccentStyle } from '../missionVisuals';
import './omscs.css';

type Commit = (transform: (state: AppState) => AppState) => boolean;

function recordLabel(record?: OmscsCourseRecord) {
  if (!record) return 'No academic entry';
  return record.status === 'completed' ? `Reported complete / ${record.grade === 'unrecorded' ? 'grade not entered' : `grade ${record.grade}`}`
    : record.status === 'taking' ? 'Taking / self-reported' : 'Planned / not enrollment';
}

function CourseEntry({ course, record, state, commit, practice, onClose, onSaved }: {
  course: OmscsCourse; record?: OmscsCourseRecord; state: AppState;
  commit: Commit; practice: boolean; onClose: () => void; onSaved: () => void;
}) {
  const [term, setTerm] = useState<string>(record?.term ?? '');
  const [status, setStatus] = useState<OmscsCourseRecord['status']>(record?.status ?? 'planned');
  const [grade, setGrade] = useState<OmscsGrade>(record?.grade ?? 'unrecorded');
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState('');
  const [expected] = useState(() => JSON.stringify(state.omscsPlan?.courses.find(row => row.id === course.id)));
  return <Modal title={`Course entry: ${course.code}`} eyebrow={practice ? 'FICTIONAL TUTORIAL RECORD' : 'PRIVATE SELF-REPORT'}
    subtitle={course.title} onClose={onClose} restoreFocus className="omscs-entry-modal">
    <form className="stack-form omscs-entry-form" data-tour="omscs-course-entry" onSubmit={event => {
      event.preventDefault();
      const ok = commit(current => {
        if (JSON.stringify(current.omscsPlan?.courses.find(row => row.id === course.id)) !== expected) {
          throw new Error('This course entry changed. Close the dialog and review its current values.');
        }
        return recordChange({ ...current, omscsPlan: setOmscsCourse(current.omscsPlan, {
          id: course.id, term: term === '' ? '' : omscsTermSchema.parse(term), status, grade,
        }) }, `GeoJack course entry updated: ${course.code}`, 'omscs');
      });
      if (ok) { onSaved(); onClose(); }
      else setError('Course entry not saved. Review the workspace warning; your previous record is retained.');
    }}>
      <p>Self-reported only. This never enrolls you, verifies a transcript or awards learning/Atlas credit.</p>
      <label>Course status<select value={status} onChange={event => {
        const value = event.currentTarget.value;
        if (value === 'planned' || value === 'taking' || value === 'completed') {
          setStatus(value);
          if (value !== 'completed') setGrade('unrecorded');
        }
      }}><option value="planned">Planned</option><option value="taking">Taking</option><option value="completed">Completed</option></select></label>
      <label>Final grade<select value={grade} disabled={status !== 'completed'} onChange={event => {
        const value = event.currentTarget.value;
        if (value === 'unrecorded' || value === 'A' || value === 'B' || value === 'C' || value === 'D' || value === 'F') setGrade(value);
      }}><option value="unrecorded">Not entered</option>{['A', 'B', 'C', 'D', 'F'].map(value => <option key={value}>{value}</option>)}</select></label>
      <label>Course semester (optional)<input value={term} maxLength={11} pattern="(20[0-9]{2}|2100)-(spring|summer|fall)"
        placeholder="2027-spring" onChange={event => setTerm(event.currentTarget.value)} /></label>
      <p className="muted small">Use year-spring, year-summer or year-fall. Empty keeps the proposed term, or leaves a foundation course unscheduled. An entered term is preserved when the route changes.</p>
      <label className="omscs-check"><input type="checkbox" required checked={confirmed} onChange={event => setConfirmed(event.currentTarget.checked)} />
        I confirm this is a self-reported course entry, not verified by Georgia Tech.</label>
      {practice && <button className="button secondary" type="button" data-tour="omscs-course-example" onClick={() => {
        setStatus('completed'); setGrade('B'); setTerm(''); setConfirmed(true);
      }}>Use fictional tutorial entry</button>}
      {error && <p className="alert error" role="alert">{error}</p>}
      <div className="button-row"><button type="button" className="button secondary" onClick={onClose}>Cancel</button>
        <button className="button primary" data-tour="omscs-course-save">Save course entry<Check size={15} /></button></div>
    </form>
  </Modal>;
}

export default function OmscsPage({ state, commit, practice }: { state: AppState; commit: Commit; practice: boolean }) {
  const [proposal] = useState(() => proposedOmscsPlan());
  const plan = state.omscsPlan ?? proposal;
  const [year, setYear] = useState(plan.startTerm.slice(0, 4));
  const [season, setSeason] = useState(plan.startTerm.split('-')[1]);
  const [summer, setSummer] = useState(plan.includeSummer);
  const [selectedId, setSelectedId] = useState('cs7641');
  const [editing, setEditing] = useState<OmscsCourse | null>(null);
  const [notice, setNotice] = useState('');
  const course = omscsCourses.find(item => item.id === selectedId)!;
  const schedule = useMemo(() => getOmscsSchedule(plan), [plan]);
  const summary = useMemo(() => getOmscsSummary(state.omscsPlan), [state.omscsPlan]);
  const warnings = useMemo(() => getOmscsScheduleWarnings(plan), [plan]);
  const terms = [...new Set(schedule.flatMap(row => row.term ? [row.term] : []))]
    .sort((a, b) => omscsTermIndex(a) - omscsTermIndex(b));
  const foundation = schedule.filter(row => row.term === null);
  const mission = getMission('omscs', state);
  const current = mission.checkpoints.find(item => item.id === state.missions.omscs.checkpointId);
  const currentUnit = packUnitForCheckpoint('omscs', current);
  const recordFor = (item: OmscsCourse) => plan.courses.find(row => row.id === item.id);

  function inspect(item: OmscsCourse) {
    setSelectedId(item.id);
    document.getElementById('omscs-course-guide')?.scrollIntoView({ block: 'start', behavior: 'instant' });
  }

  function courseCard(item: OmscsCourse) {
    return <article className="omscs-course-card" key={item.id} data-omscs-course={item.id}>
      <div className="omscs-course-heading"><span className="eyebrow">{item.code}</span><Badge>{item.allocation}</Badge></div>
      <h3>{item.title}</h3><p>{item.overview}</p>
      <p className="omscs-record-status">{recordLabel(recordFor(item))}</p>
      <div className="button-row"><button className="text-link" onClick={() => inspect(item)}>Explore course guide<BookOpen size={15} /></button>
        <button className="button secondary" data-tour={`omscs-record-${item.id}`} onClick={() => setEditing(item)}>Record course: {item.code}</button></div>
    </article>;
  }

  return <div className="omscs-page amber" style={missionAccentStyle('omscs')}>
    <PageHeading eyebrow="GEOJACK / UNOFFICIAL LEARNING COMPANION" title="GeoJack OMSCS"
      description="A semester proposal, complete course guides and honest learning evidence for the Georgia Tech OMSCS AI route. Not university advising, enrollment or a connected AI tutor.">
      <a className="button secondary" href="#/mission/omscs">My learning tracker<ArrowRight size={15} /></a>
      <a className="button secondary" href="#/practice/omscs">Practice library<BookOpen size={15} /></a>
    </PageHeading>
    <section className="omscs-intro panel" data-tour="omscs-intro">
      <GraduationCap size={30} /><div><h2>One degree route. Separate evidence.</h2>
        <p>Ten selected courses / 30 credits. Seven proposed course semesters and three foundation guides; no previous completion is prefilled.
          Academic self-reports do not complete learning checkpoints or level up your character.</p>
        <p>Reviewed {omscsReviewedAt}. Future offerings, seats, course age, your complete GPA and DegreeWorks applicability remain unverified.</p></div>
    </section>
    <section className="omscs-stats" data-tour="omscs-credit-summary" aria-label="Conditional course credit summary">
      <div><strong>{summary.reportedCredits}<small> / 30</small></strong><span>Reported completed credits</span></div>
      <div><strong>{summary.qualifyingCredits}<small> / 30</small></strong><span>Meet selected slot rules</span></div>
      <div><strong>{summary.specializationCredits}<small> / 15</small></strong><span>Specialization slot credits</span></div>
      <div><strong>{state.missions.omscs.completedCheckpointIds.length}<small> / {mission.checkpoints.length}</small></strong><span>Learning checkpoints / not degree credits</span></div>
    </section>
    <p className="muted small">All totals use only your optional entries, not an official transcript. Unknown grades cannot qualify a slot; D/F do not count as reported passing credits. Specialization needs B or better, free electives C or better, and graduation needs the actual cumulative GPA of at least 3.0.</p>
    {summary.unknownGrades > 0 && <p className="quiet-note" role="status">{summary.unknownGrades} completed {summary.unknownGrades === 1 ? 'entry has' : 'entries have'} no recorded grade. Those reported credits are not yet included in rule-eligible totals.</p>}
    {summary.problems.length > 0 && <ul className="omscs-warnings">{summary.problems.map(item => <li key={item}>{item}</li>)}</ul>}

    <section className="panel omscs-next">
      <h2>Next learning move</h2><p>{current?.action}</p>
      <p>Course grades never replace an explanation, implementation or changed-case attempt. The tracker keeps one current study checkpoint.</p>
      <a className="button primary" href={packUnitHref('omscs', currentUnit?.id)}>Open current study material<ArrowRight size={16} /></a>
    </section>

    <section className="panel" data-tour="omscs-allocation"><h2>The 30-credit allocation</h2>
      <div className="omscs-allocation">
        <div><h3>Core / 9 credits</h3><p>GA + KBAI + ML</p><small>B or better in each selected course.</small></div>
        <div><h3>Specialization electives / 6 credits</h3><p>Game AI + DL</p><small>Excess-core DL is permitted by the updated AI rule.</small></div>
        <div><h3>Free electives / 15 credits</h3><p>VGD + NLP + GIOS + DC + GPU</p><small>Each course counted once; C or better for these slots.</small></div>
      </div>
      <p>The older catalog and newer specialization menu differ. This selected allocation fits both, but it does not establish your actual grades or official approval.</p>
      <ExternalLink href={omscsSources[0].url}>Read the official AI specialization</ExternalLink>
    </section>

    <section className="panel" data-tour="omscs-semester-plan"><h2>Shape the semester proposal</h2>
      <p>Default: one substantial course per regular term. You can explicitly start in summer; the checkbox adds later summers. This proposal never enrolls you or changes an entered course term.</p>
      <form className="omscs-plan-form" onSubmit={event => {
        event.preventDefault();
        const ok = commit(currentState => recordChange({
          ...currentState,
          omscsPlan: setOmscsRoute(currentState.omscsPlan, { startTerm: omscsTermSchema.parse(`${year}-${season}`), includeSummer: summer }),
        }, 'GeoJack semester proposal updated', 'omscs'));
        setNotice(ok ? 'Semester proposal saved. No registration, grade or learning completion changed.'
          : 'Semester proposal not saved. Review the workspace warning; previous data is retained.');
      }}>
        <label>Start semester<select data-tour="omscs-start-season" value={season} onChange={event => setSeason(event.currentTarget.value)}>
          <option value="spring">Spring</option><option value="summer">Summer</option><option value="fall">Fall</option>
        </select></label>
        <label>Start year<input type="number" min={2000} max={2097} required value={year} onChange={event => setYear(event.currentTarget.value)} /></label>
        <label className="omscs-check"><input type="checkbox" checked={summer} onChange={event => setSummer(event.currentTarget.checked)} />Include later summer terms in the proposal</label>
        <button className="button primary" data-tour="omscs-plan-save">Save semester proposal<Check size={15} /></button>
      </form>
      {!state.omscsPlan && <p className="muted small">This is an unsaved example proposal. Nothing is stored until you save a route or course entry.</p>}
      {notice && <p role="status">{notice}</p>}
      <p className="muted small">Check your actual six-year window before using a slower calendar. The app does not infer a matriculation date or an extension.</p>
      {warnings.length > 0 && <ul className="omscs-warnings" role="status">{warnings.map(item => <li key={item}>{item}</li>)}</ul>}
    </section>

    <section className="omscs-semesters" data-tour="omscs-semesters" aria-label="Proposed course semesters">
      {terms.map(term => <section className="omscs-semester" key={term} data-omscs-term={term}>
        <h2><CalendarDays size={20} />{omscsTermLabel(term)}<Badge>Proposed / check actual offering</Badge></h2>
        {schedule.filter(row => row.term === term).map(row => courseCard(row.course))}
      </section>)}
    </section>
    {foundation.length > 0 && <section className="panel"><h2>Foundation courses / no term assumed</h2>
      <p>These are part of the selected ten-course degree route, not imported prior progress. Review each guide and record status/term only when you choose.</p>
      <div className="omscs-foundations">{foundation.map(row => courseCard(row.course))}</div>
    </section>}

    <section id="omscs-course-guide" className="panel omscs-guide" data-tour="omscs-course-guide">
      <label>Explore a course<select data-tour="omscs-course-select" value={selectedId} onChange={event => setSelectedId(event.currentTarget.value)}>
        {omscsCourses.map(item => <option key={item.id} value={item.id}>{item.code} / {item.title}</option>)}
      </select></label>
      <span className="eyebrow">{course.code} / 3 credits / {course.allocation}</span>
      <h2>{course.title}</h2><p>{course.overview}</p>
      <h3>What you will study</h3>
      <ol className="omscs-syllabus">{course.modules.map(module => <li key={module.id}>
        <h4>{module.title}</h4><p>{module.topics.join(' / ')}</p>
        <a className="text-link" href={packUnitHref('omscs', omscsCourseUnit(course, module))}>Explanation, example and independent practice<ArrowRight size={15} /></a>
      </li>)}</ol>
      <div className="omscs-guide-grid"><div><h3>Before enrolling</h3><ul>{course.preparation.map(item => <li key={item}>{item}</li>)}</ul></div>
        <div><h3>Tools and working methods</h3><ul>{course.tools.map(item => <li key={item}>{item}</li>)}</ul></div></div>
      <h3>Dated assessment snapshot / not a future contract</h3><p>{course.assessment}</p>
      <h3>Connection to AI engineering and architecture</h3><p>{course.career}</p><p className="quiet-note"><Info size={18} />{course.boundary}</p>
      <details className="pack-study-section" data-tour="omscs-course-sources"><summary>Official course sources / reviewed {omscsReviewedAt}</summary>
        <ul>{omscsSources.filter(source => course.sourceIds.includes(source.id)).map(source => <li key={source.id}>
          <ExternalLink href={source.url}>{source.title}</ExternalLink><p>{source.scope}</p></li>)}</ul>
      </details>
      <div className="button-row"><button className="button secondary" onClick={() => setEditing(course)}>Record course: {course.code}</button>
        <a className="text-link" href="#/practice/omscs/omscs-cloud-route">Compare alternate routes<ArrowRight size={15} /></a></div>
    </section>
    <section className="quiet-note" data-tour="omscs-boundary"><ShieldCheck size={22} />
      <p>Academic entries are private to this browser and included in ordinary private backups. Optional encrypted repository sync stays manual. No Georgia Tech account, transcript, model or external service is connected. Course-specific integrity rules govern assessed work.</p>
    </section>
    {editing && <CourseEntry key={editing.id} course={editing} record={recordFor(editing)} state={state} commit={commit} practice={practice}
      onClose={() => setEditing(null)} onSaved={() => setNotice('Self-reported course entry saved. No learning checkpoint or Atlas credit was awarded.')} />}
  </div>;
}
