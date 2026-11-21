import { Badge, ExternalLink } from '../components';
import { pathCourse } from '../domain/omscs/paths/catalog';
import { omscsTermLabel } from '../domain/omscs/model';
import type { OmscsCourseRecord } from '../domain/omscs/types';
import { CourseEntryInfo } from './CourseEntryInfo';
import './specializations.css';

export function AcademicCourseRow({ id, record, records, placement, onRecord }: {
  id: string; record?: OmscsCourseRecord; records: readonly OmscsCourseRecord[];
  placement?: string; onRecord: () => void;
}) {
  const course = pathCourse(id), completed = record?.status === 'completed';
  return <article className={`academic-course-row${completed ? ' academic-course-completed' : ''}`}
    data-academic-course={id} data-academic-completed={completed}>
    <div><span className="eyebrow">{course.code}</span><h3>{course.title}</h3>
      <div className="context-actions">
        {record && <Badge>{completed ? `Completed / ${record.grade === 'unrecorded' ? 'grade unknown' : record.grade}` : record.status === 'taking' ? 'Taking' : 'Planned'}</Badge>}
        {record?.term && <span className="muted small">{omscsTermLabel(record.term)}</span>}
        {completed && record.grade === 'C' && <Badge>C / free-elective credit only</Badge>}
        {completed && (record.grade === 'D' || record.grade === 'F') && <Badge>Not passing credit</Badge>}
      </div>
      {placement && <p className="muted small">{placement}</p>}
      <CourseEntryInfo id={id} completed={records.filter(row => row.status === 'completed')} />
    </div>
    <div className="academic-row-actions"><button className="button secondary" onClick={onRecord}
      data-tour={`omscs-record-${id}`}
      aria-label={`${record ? 'Edit' : 'Record'} ${course.code}`}>{record ? 'Edit entry' : 'Record course'}</button>
      <ExternalLink href={course.url}>Official course</ExternalLink></div>
  </article>;
}
