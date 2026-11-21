import { Badge, ContextHelp, ExternalLink } from '../components';
import { pathCourse } from '../domain/omscs/paths/catalog';
import type { PriorCourse } from '../domain/omscs/paths/model';
import { courseEntryAssessment, requirementsReviewedAt } from '../domain/omscs/paths/requirements';
import type { EntryConfirmations } from '../domain/omscs/paths/requirements';

export function CourseEntryInfo({ id, completed, earlierPlanned = [], checks = {} }: {
  id: string; completed: readonly PriorCourse[]; earlierPlanned?: readonly string[]; checks?: EntryConfirmations;
}) {
  const entry = courseEntryAssessment(id, completed, earlierPlanned, checks);
  if (!entry) return null;
  const course = pathCourse(id);
  return <div className="context-actions" data-course-entry-check={id} data-entry-status={entry.status}>
    <Badge>{entry.label}</Badge>
    <ContextHelp title={`${course.code} entry requirements`}>
      <p>{entry.detail}</p>
      <p>Public-source review: {requirementsReviewedAt}. Self-reports and proposed ordering are not university eligibility verification.</p>
      <ExternalLink href={course.url}>Official entry requirements</ExternalLink>
      {entry.additionalSource && <p><ExternalLink href={entry.additionalSource.url}>{entry.additionalSource.title}</ExternalLink></p>}
    </ContextHelp>
  </div>;
}
