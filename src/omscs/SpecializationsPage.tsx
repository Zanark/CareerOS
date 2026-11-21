import { useState } from 'react';
import { Badge, ContextHelp, ExternalLink, PageHeading } from '../components';
import type { AppState } from '../domain/types';
import { omscsSpecializations, specializationFit, specializationsReviewedAt } from '../domain/omscs/specializations';
import type { OmscsSpecialization } from '../domain/omscs/specializations';
import { pathCourse } from '../domain/omscs/paths/catalog';
import { AcademicCourseRow } from './AcademicCourseRow';
import { CourseEntry } from './OmscsPage';
import './specializations.css';

type Commit = (transform: (state: AppState) => AppState) => boolean;

function SpecializationSection({ specialization, state, onRecord }: {
  specialization: OmscsSpecialization; state: AppState; onRecord: (id: string) => void;
}) {
  const [open, setOpen] = useState(specialization.id === 'ai');
  const records = state.omscsPlan?.courses ?? [];
  const completed = records.filter(record => record.status === 'completed');
  const fit = specializationFit(specialization, records);
  const recordFor = (id: string) => records.find(record => record.id === id);
  return <details className="panel specialization-section" data-specialization={specialization.id}
    open={open} onToggle={event => setOpen(event.currentTarget.open)}>
    <summary><span>{specialization.title}</span><span className="specialization-summary">
      <Badge>{specialization.credits} specialization credits</Badge>
      <Badge>{fit.specializationCourses} / {fit.requiredCourses} reusable courses</Badge>
    </span></summary>
    <div className="context-actions"><span>{fit.freeCourses} / {fit.freeSlots} free electives completed</span>
      <ExternalLink href={specialization.url}>Official requirements</ExternalLink></div>
    <section className="specialization-completed"><h3>Completed coursework</h3>
      {completed.length ? completed.map(record => <AcademicCourseRow key={record.id} id={record.id} record={record} records={records}
        placement={fit.courseGroups.has(record.id) ? 'Specialization option' : ['A', 'B', 'C'].includes(record.grade) ? 'Degree / free elective' : 'Grade eligibility unknown'}
        onRecord={() => onRecord(record.id)} />) : <p>No completed entries.</p>}
    </section>
    {specialization.groups.map(group => <section className="specialization-group" key={group.id} data-requirement-group={group.id}>
      <div className="context-heading"><h3>{group.title}</h3><Badge>{group.courseIds.length === group.count ? 'Required' : 'Choose'} {group.count} / B or better</Badge>
        <Badge>{fit.groupCount(group.id)} completed can fit</Badge>
        {group.note && <ContextHelp title={`${specialization.title} ${group.title}`}>{group.note}</ContextHelp>}</div>
      {group.minimums && <p className="specialization-minima">{group.minimums.map(area => `At least ${area.count} ${area.title}`).join(' / ')}</p>}
      <div className="specialization-course-list">{group.courseIds.map(id => <AcademicCourseRow key={id} id={id} record={recordFor(id)}
        records={records} onRecord={() => onRecord(id)}
        placement={group.minimums?.filter(area => area.courseIds.includes(id)).map(area => area.title).join(' / ')} />)}</div>
    </section>)}
    <footer className="specialization-free"><strong>Free electives / {30 - specialization.credits} credits</strong>
      <span>Any current OMSCS course, C or better. A course counts once.</span></footer>
    {(fit.freeCourses > fit.freeSlots || fit.nonCsCseOverflow) && <p className="alert error" role="alert">Review the free-course budget or six-credit non-CS/CSE cap before using this allocation.</p>}
  </details>;
}

export default function SpecializationsPage({ state, commit, practice }: {
  state: AppState; commit: Commit; practice: boolean;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  return <div className="omscs-specializations">
    <PageHeading eyebrow="GOLD CIRCUIT / OMSCS" title="Degree paths"
      help={<><p>Six alternative degree routes, not six specializations to complete. Green means a course is recorded complete. Specialization slots need B or better; C can count only toward the degree/free-elective budget.</p>
        <p>Reuse is a possible distinct-course allocation, not an official degree audit. Only current online choices are listed. Reviewed {specializationsReviewedAt}; actual offerings, permissions and GPA still need confirmation.</p></>}>
      <div className="button-row"><a className="button primary" href="#/omscs/paths">Plan AI subjects</a>
        <a className="text-link" href="#/omscs">Academic entries</a></div>
    </PageHeading>
    <label className="specialization-jump">Jump to specialization<select defaultValue="" onChange={event => {
      const element = document.querySelector(`[data-specialization="${event.currentTarget.value}"]`);
      if (element instanceof HTMLDetailsElement) {
        element.open = true;
        element.scrollIntoView({ block: 'start', behavior: 'instant' });
        element.querySelector<HTMLElement>(':scope > summary')?.focus({ preventScroll: true });
      }
    }}><option value="" disabled>Choose one of six</option>
      {omscsSpecializations.map(specialization => <option key={specialization.id} value={specialization.id}>{specialization.title}</option>)}
    </select></label>
    {notice && <p role="status">{notice}</p>}
    {omscsSpecializations.map(specialization => <SpecializationSection key={specialization.id} specialization={specialization}
      state={state} onRecord={setEditing} />)}
    {editing && <CourseEntry key={editing} course={pathCourse(editing)} record={state.omscsPlan?.courses.find(row => row.id === editing)}
      state={state} commit={commit} practice={practice} onClose={() => setEditing(null)}
      onSaved={() => setNotice('Academic entry saved across all specializations. No learning credit awarded.')} />}
  </div>;
}
