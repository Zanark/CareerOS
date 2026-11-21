import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, BookOpen, CalendarDays, Check, Info } from 'lucide-react';
import { Badge, ContextHelp, ExternalLink, Modal, PageHeading } from '../components';
import { getMission } from '../domain/catalog';
import { recordChange } from '../domain/engine';
import type { AppState } from '../domain/types';
import { omscsCourses, omscsCourseUnit } from '../domain/omscs/courses';
import {
  getOmscsSchedule, getOmscsScheduleWarnings, getOmscsSummary, omscsTermIndex,
  omscsPlanSchema, omscsTermLabel, omscsTermSchema, setOmscsCourse, setOmscsRoute,
} from '../domain/omscs/model';
import { omscsReviewedAt, omscsSources } from '../domain/omscs/sources';
import type { OmscsCourse, OmscsCourseRecord, OmscsGrade } from '../domain/omscs/types';
import { packUnitForCheckpoint, packUnitHref } from '../domain/roadmapPacks/registry';
import { missionAccentStyle } from '../missionVisuals';
import { CourseEntryInfo } from './CourseEntryInfo';
import { pathCourse } from '../domain/omscs/paths/catalog';
import type { PathCourse } from '../domain/omscs/paths/catalog';
import { academicAllocation, recommendedAiSelection } from '../domain/omscs/recommendations';
import { createAcademicStarter } from '../domain/omscs/starter';
import { AcademicCourseRow } from './AcademicCourseRow';
import './omscs.css';

type Commit = (transform: (state: AppState) => AppState) => boolean;

function recordLabel(record?: OmscsCourseRecord) {
  if (!record) return 'No academic entry';
  return record.status === 'completed' ? `Reported complete / ${record.grade === 'unrecorded' ? 'grade not entered' : `grade ${record.grade}`}`
    : record.status === 'taking' ? 'Taking / self-reported' : 'Planned / not enrollment';
}

export function CourseEntry({ course, record, state, commit, practice, onClose, onSaved }: {
  course: Pick<PathCourse, 'id' | 'code' | 'title'>; record?: OmscsCourseRecord; state: AppState;
  commit: Commit; practice: boolean; onClose: () => void; onSaved: () => void;
}) {
  const [term, setTerm] = useState<string>(record?.term ?? '');
  const [status, setStatus] = useState<OmscsCourseRecord['status']>(record?.status ?? 'planned');
  const [grade, setGrade] = useState<OmscsGrade>(record?.grade ?? 'unrecorded');
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState('');
  const [expected] = useState(() => JSON.stringify(state.omscsPlan?.courses.find(row => row.id === course.id)));
  return <Modal title={`Course entry: ${course.code}`} eyebrow={practice ? 'FICTIONAL TUTORIAL RECORD' : 'ACADEMIC SELF-REPORT'}
    subtitle={course.title} onClose={onClose} restoreFocus className="omscs-entry-modal">
    <form className="stack-form omscs-entry-form" data-tour="omscs-course-entry" onSubmit={event => {
      event.preventDefault();
      const ok = commit(current => {
        if (JSON.stringify(current.omscsPlan?.courses.find(row => row.id === course.id)) !== expected) {
          throw new Error('This course entry changed. Close the dialog and review its current values.');
        }
        return recordChange({ ...current, omscsPlan: setOmscsCourse(current.omscsPlan ?? { ...createAcademicStarter(), courses: [] }, {
          id: course.id, term: term === '' ? '' : omscsTermSchema.parse(term), status, grade,
        }) }, `Gold Circuit course entry updated: ${course.code}`, 'omscs');
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
      <p className="muted small">Format: year-spring, year-summer or year-fall. Blank keeps the proposed term, or leaves a foundation course unscheduled.</p>
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

function StarterReview({ state, commit, onClose }: { state: AppState; commit: Commit; onClose: () => void }) {
  const [expected] = useState(() => JSON.stringify(state.omscsPlan));
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState('');
  const starter = createAcademicStarter();
  return <Modal title="Use the provided academic history?" onClose={onClose} restoreFocus>
    <p>These are the public starter self-reports. This updates the listed entries and resume semester, not learning progress. Other saved subjects stay.</p>
    <ul>{starter.courses.map(row => {
      const current = state.omscsPlan?.courses.find(item => item.id === row.id);
      return <li key={row.id}><strong>{pathCourse(row.id).code}</strong>: {current ? `${current.status} / ${current.grade}` : 'No entry'}
        {' → '}completed / {row.grade} / {row.term && omscsTermLabel(row.term)}</li>;
    })}</ul>
    <p>Resume: {omscsTermLabel(starter.startTerm)}. Known differing records are replaced only by this confirmation.</p>
    <label className="omscs-check"><input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.currentTarget.checked)} />
      I reviewed the academic changes. Keep my other subjects and all learning records.</label>
    {error && <p className="alert error" role="alert">{error}</p>}
    <div className="button-row"><button className="button secondary" onClick={onClose}>Cancel</button>
      <button className="button primary" disabled={!confirmed} onClick={() => {
        const ok = commit(current => {
          if (JSON.stringify(current.omscsPlan) !== expected) throw new Error('Academic entries changed. Review the current values before applying the starter.');
          const ids = new Set(starter.courses.map(row => row.id));
          const plan = omscsPlanSchema.parse({ ...starter, includeSummer: current.omscsPlan?.includeSummer ?? starter.includeSummer,
            courses: [...(current.omscsPlan?.courses ?? []).filter(row => !ids.has(row.id)), ...starter.courses] });
          return recordChange({ ...current, omscsPlan: plan }, 'Provided academic starter reviewed and applied', 'omscs');
        });
        if (ok) onClose(); else setError('Academic changes were not saved. Previous records are retained; review the workspace warning.');
      }}>Apply reviewed academic history</button></div>
  </Modal>;
}

export default function OmscsPage({ state, commit, practice }: { state: AppState; commit: Commit; practice: boolean }) {
  const [proposal] = useState(() => ({ ...createAcademicStarter(), courses: [] }));
  const plan = state.omscsPlan ?? proposal;
  const [year, setYear] = useState(plan.startTerm.slice(0, 4));
  const [season, setSeason] = useState(plan.startTerm.split('-')[1]);
  const [summer, setSummer] = useState(plan.includeSummer);
  const [selectedId, setSelectedId] = useState('cs7641');
  const [editing, setEditing] = useState<Pick<PathCourse, 'id' | 'code' | 'title'> | null>(null);
  const [starterReview, setStarterReview] = useState(false);
  const [notice, setNotice] = useState('');
  const course = omscsCourses.find(item => item.id === selectedId)!;
  const schedule = useMemo(() => getOmscsSchedule(plan), [plan]);
  const summary = useMemo(() => getOmscsSummary(state.omscsPlan), [state.omscsPlan]);
  const warnings = useMemo(() => getOmscsScheduleWarnings(plan), [plan]);
  const future = schedule.filter(row => row.record?.status !== 'completed');
  const terms = [...new Set(future.flatMap(row => row.term ? [row.term] : []))]
    .sort((a, b) => omscsTermIndex(a) - omscsTermIndex(b));
  const foundation = future.filter(row => row.term === null);
  const mission = getMission('omscs', state);
  const current = mission.checkpoints.find(item => item.id === state.missions.omscs.checkpointId);
  const currentUnit = packUnitForCheckpoint('omscs', current);
  const recordFor = (item: { id: string }) => plan.courses.find(row => row.id === item.id);
  const completedCourses = plan.courses.filter(row => row.status === 'completed');
  const selection = recommendedAiSelection(completedCourses);
  const spec = new Set([selection.design, ...selection.ai, ...selection.electives]);
  const nextCourse = future.flatMap(row => row.term && omscsTermIndex(row.term) >= omscsTermIndex(plan.startTerm)
    ? [{ course: row.course, term: row.term }] : [])
    .sort((a, b) => omscsTermIndex(a.term) - omscsTermIndex(b.term))[0];
  const additional = plan.courses.filter(row => row.status !== 'completed' && !omscsCourses.some(course => course.id === row.id));
  useEffect(() => {
    setYear(plan.startTerm.slice(0, 4)); setSeason(plan.startTerm.split('-')[1]); setSummer(plan.includeSummer);
  }, [plan.startTerm, plan.includeSummer]);

  function inspect(item: OmscsCourse) {
    setSelectedId(item.id);
    const guide = document.getElementById('omscs-course-guide');
    if (guide instanceof HTMLDetailsElement) guide.open = true;
    guide?.scrollIntoView({ block: 'start', behavior: 'instant' });
  }

  function courseCard(item: OmscsCourse) {
    const term = schedule.find(row => row.course.id === item.id)?.term;
    const earlierPlanned = term ? schedule.filter(row => row.term && omscsTermIndex(row.term) < omscsTermIndex(term)
      && recordFor(row.course)?.status !== 'completed').map(row => row.course.id) : [];
    return <article className="omscs-course-card" key={item.id} data-omscs-course={item.id}>
      <div className="omscs-course-heading"><span className="eyebrow">{item.code}</span><Badge>{academicAllocation(item.id, plan.courses)}</Badge></div>
      <div className="context-heading"><h3>{item.title}</h3><ContextHelp title={`${item.code} overview`}>{item.overview}</ContextHelp></div>
      <p className="omscs-record-status">{recordLabel(recordFor(item))}</p>
      <CourseEntryInfo id={item.id} completed={completedCourses} earlierPlanned={earlierPlanned} />
      <div className="button-row"><button className="text-link" onClick={() => inspect(item)}>Explore course guide<BookOpen size={15} /></button>
        <button className="button secondary" data-tour={`omscs-record-${item.id}`} onClick={() => setEditing(item)}>Record course: {item.code}</button></div>
    </article>;
  }

  return <div className="omscs-page amber" style={missionAccentStyle('omscs')}>
    <PageHeading eyebrow="GOLD CIRCUIT" title="Georgia Tech OMSCS"
      help={<><p>An unofficial academic companion. Entries are self-reported, not enrollment, university verification or learning credit.</p>
        <p>Reviewed {omscsReviewedAt}. Offerings, seats, credit age, actual GPA and degree applicability need university confirmation.</p></>}>
      <a className="button primary" href="#/omscs/paths">Course choices<ArrowRight size={15} /></a>
    </PageHeading>
    <div className="button-row"><a className="text-link" href="#/mission/omscs">My learning tracker<ArrowRight size={15} /></a>
      <a className="text-link" href="#/practice/omscs">Practice library<BookOpen size={15} /></a>
      <a className="text-link" href="#/omscs/specializations">Six specializations<ArrowRight size={15} /></a>
      {!practice && <button className="text-button" onClick={() => setStarterReview(true)}>Review provided academic history</button>}</div>
    <div data-tour="omscs-intro"><section className="omscs-stats" data-tour="omscs-credit-summary" aria-label="Conditional course credit summary">
      <div><strong>{summary.reportedCredits}<small> / 30</small></strong><span>Reported completed credits</span></div>
      <div><strong>{summary.qualifyingCredits}<small> / 30</small></strong><span>Meet selected slot rules</span></div>
      <div><strong>{summary.specializationCredits}<small> / 15</small></strong><span>Specialization slot credits</span></div>
      <div><strong>{state.missions.omscs.completedCheckpointIds.length}<small> / {mission.checkpoints.length}</small></strong><span>Learning checkpoints / not degree credits</span></div>
    </section><div className="context-actions"><span className="muted small">Self-reported / B specialization / C free electives</span>
      <ContextHelp title="Academic totals"><p>Unknown grades cannot qualify a slot; D/F do not count as passing credits. Graduation also needs the actual cumulative GPA of at least 3.0 and the university audit. This app checks neither.</p></ContextHelp>
      <ContextHelp title="Academic privacy" tour="omscs-boundary"><p>The provided starter history is intentionally public app data, approved by its owner. Your later edits stay in browser storage and ordinary unencrypted backups; optional encrypted publication is manual. No Georgia Tech account, transcript, model or external service is connected. Follow each course's integrity rules for assessed work.</p></ContextHelp>
    </div></div>
    {summary.unknownGrades > 0 && <p className="quiet-note" role="status">{summary.unknownGrades} completed {summary.unknownGrades === 1 ? 'entry has' : 'entries have'} no recorded grade. Those reported credits are not yet included in rule-eligible totals.</p>}
    {summary.problems.length > 0 && <ul className="omscs-warnings">{summary.problems.map(item => <li key={item}>{item}</li>)}</ul>}

    <section className="panel omscs-next">
      <div className="omscs-next-header">
        <div><h2>{nextCourse ? `Next course / ${omscsTermLabel(nextCourse.term)}` : 'Review your course choices'}</h2>
          {nextCourse && <p>{nextCourse.course.code} / {nextCourse.course.title}</p>}</div>
        <a className="button primary" href="#/omscs/paths">Choose next subject<ArrowRight size={16} /></a>
      </div>
      <details className="pack-study-section"><summary>Learning practice / separate from academic credit</summary><p>{current?.action}</p>
        <a className="text-link" href={packUnitHref('omscs', currentUnit?.id)}>Open current study material<ArrowRight size={16} /></a></details>
    </section>
    {completedCourses.length > 0 && <section className="panel" data-tour="academic-completed"><h2>Completed coursework</h2>
      {completedCourses.map(record => <AcademicCourseRow key={record.id} id={record.id} record={record} records={plan.courses}
        onRecord={() => setEditing(pathCourse(record.id))} />)}</section>}

    <details className="panel calm-disclosure" data-tour="omscs-allocation"><summary>The 30-credit allocation</summary>
      <div className="omscs-allocation">
        <div><h3>Core / 9 credits</h3><p>{[selection.design, ...selection.ai].map(id => pathCourse(id).code).join(' + ')}</p><small>B or better in each selected course.</small></div>
        <div><h3>Specialization electives / 6 credits</h3><p>{selection.electives.map(id => pathCourse(id).code).join(' + ')}</p><small>Unused cores can fill elective slots under the current AI page.</small></div>
        <div><h3>Free electives / 15 credits</h3><p>{omscsCourses.filter(item => !spec.has(item.id)).map(item => item.code).join(' + ')}</p><small>C or better; one course counts once.</small></div>
      </div>
      <p>This suggestion uses the current online AI menu. The older catalog differs; confirm your applicable degree audit. A C never fills a B-minimum specialization slot.</p>
      <ExternalLink href={omscsSources[0].url}>Read the official AI specialization</ExternalLink>
    </details>

    <section className="panel" data-tour="omscs-semester-plan"><div className="context-heading"><h2>Semester proposal</h2>
      <ContextHelp title="Semester proposal">One course per regular term. A summer start is explicit; the checkbox adds later summers. Saving changes the proposal, not enrollment or an already-entered course term. Check the actual six-year window before using a slower calendar.</ContextHelp></div>
      <form className="omscs-plan-form" onSubmit={event => {
        event.preventDefault();
        const ok = commit(currentState => recordChange({
          ...currentState,
          omscsPlan: setOmscsRoute(currentState.omscsPlan, { startTerm: omscsTermSchema.parse(`${year}-${season}`), includeSummer: summer }),
        }, 'Gold Circuit semester proposal updated', 'omscs'));
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
      {!state.omscsPlan && <p className="muted small">Unsaved example route.</p>}
      {notice && <p role="status">{notice}</p>}
      {warnings.length > 0 && <ul className="omscs-warnings" role="status">{warnings.map(item => <li key={item}>{item}</li>)}</ul>}
    </section>

    <section className="omscs-semesters" data-tour="omscs-semesters" aria-label="Proposed course semesters">
      {terms.map(term => <section className="omscs-semester" key={term} data-omscs-term={term}>
        <h2><CalendarDays size={20} />{omscsTermLabel(term)}<Badge>Proposed / check actual offering</Badge></h2>
        {future.filter(row => row.term === term).map(row => courseCard(row.course))}
      </section>)}
    </section>
    {foundation.length > 0 && <section className="panel"><h2>Foundation courses / no term assumed</h2>
      <div className="omscs-foundations">{foundation.map(row => courseCard(row.course))}</div>
    </section>}
    {additional.length > 0 && <section className="panel"><h2>Other saved academic entries</h2>
      {additional.map(record => <AcademicCourseRow key={record.id} id={record.id} record={record} records={plan.courses}
        onRecord={() => setEditing(pathCourse(record.id))} />)}</section>}

    <details id="omscs-course-guide" className="panel omscs-guide calm-disclosure" data-tour="omscs-course-guide"><summary>Course guides</summary>
      <label>Explore a course<select data-tour="omscs-course-select" value={selectedId} onChange={event => setSelectedId(event.currentTarget.value)}>
        {omscsCourses.map(item => <option key={item.id} value={item.id}>{item.code} / {item.title}</option>)}
      </select></label>
      <span className="eyebrow">{course.code} / 3 credits / {academicAllocation(course.id, plan.courses)}</span>
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
    </details>
    {editing && <CourseEntry key={editing.id} course={editing} record={recordFor(editing)} state={state} commit={commit} practice={practice}
      onClose={() => setEditing(null)} onSaved={() => setNotice('Self-reported course entry saved. No learning checkpoint or Atlas credit was awarded.')} />}
    {starterReview && <StarterReview state={state} commit={commit} onClose={() => setStarterReview(false)} />}
  </div>;
}
