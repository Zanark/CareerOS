import { useState } from 'react';
import { pathCourses } from '../../domain/omscs/paths/catalog';
import { pathProfileSchema } from '../../domain/omscs/paths/model';
import type { PathProfile } from '../../domain/omscs/paths/model';

export default function PlanningBasisEditor({ profile, onChange }: {
  profile: PathProfile; onChange: (profile: PathProfile) => void;
}) {
  const [expanded, setExpanded] = useState(profile.completed.length === 0);
  const [course, setCourse] = useState('');
  const [term, setTerm] = useState('');
  const [grade, setGrade] = useState('unrecorded');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  return <details className="path-baseline-editor path-course-detail" open={expanded} onToggle={event => setExpanded(event.currentTarget.open)}>
    <summary>Add previously completed courses to this draft</summary>
    <p>Optional, especially on a new phone. Enter your own prior subjects so the planner does not suggest taking them again.
      This edits only this open tab, not academic records, backups or learning progress. Leave grades unknown unless you know them.</p>
    <form className="path-baseline-form" onSubmit={event => {
      event.preventDefault();
      const parsed = pathProfileSchema.safeParse({ ...profile, completed: [...profile.completed, { id: course, term, grade }] });
      if (!parsed.success) { setError(parsed.error.issues.map(issue => issue.message).join(' ')); setStatus(''); return; }
      onChange(parsed.data);
      setCourse(''); setTerm(''); setGrade('unrecorded'); setError('');
      setStatus(grade === 'D' || grade === 'F'
        ? 'Added as a draft attempt only. This grade does not reduce the passing-course budget; the subject may still be a new course choice.'
        : 'Added to this tab only. The same subject is no longer a new free choice; it stays counted as reported prior work. No academic record was saved.');
    }}>
      <label>Previously completed course<select aria-label="Previously completed course" required value={course} onChange={event => setCourse(event.currentTarget.value)}>
        <option value="">Choose a course</option>
        {pathCourses.filter(item => !profile.completed.some(row => row.id === item.id)).map(item =>
          <option value={item.id} key={item.id}>{item.code} / {item.title}</option>)}
      </select></label>
      <label>Completed term (optional)<input placeholder="YYYY-spring, YYYY-summer or YYYY-fall" value={term} onChange={event => setTerm(event.currentTarget.value.trim())} /></label>
      <label>Known final grade<select value={grade} onChange={event => setGrade(event.currentTarget.value)}>
        <option value="unrecorded">Unknown / do not assume a grade</option>
        {['A', 'B', 'C', 'D', 'F'].map(value => <option key={value}>{value}</option>)}
      </select></label>
      <button className="button secondary" disabled={profile.completed.length >= 10}>Add completed course to draft</button>
    </form>
    {profile.completed.length >= 10 && <p>This what-if baseline is limited to ten courses; it is not a full transcript.</p>}
    {error && <p role="alert" className="alert error">{error}</p>}
    {status && <p role="status">{status}</p>}
  </details>;
}
