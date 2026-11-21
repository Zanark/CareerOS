import { z } from 'zod';
import { omscsCourses, omscsRouteCourses } from './courses';
import type { OmscsCourseRecord, OmscsPlan, OmscsTerm } from './types';
import { isPathCourse, pathCourse, pathCourses } from './paths/catalog';
import { academicAllocation } from './recommendations';

const seasons = ['spring', 'summer', 'fall'] as const;

function validTerm(value: unknown): value is OmscsTerm {
  return typeof value === 'string' && /^(20\d{2}|2100)-(spring|summer|fall)$/.test(value);
}

export const omscsTermSchema = z.custom<OmscsTerm>(validTerm, {
  message: 'Use a semester from 2000 to 2100, such as 2027-spring.',
});
export const omscsCourseRecordSchema = z.object({
  id: z.string().refine(isPathCourse, 'Choose a current OMSCS course.'),
  term: z.union([omscsTermSchema, z.literal('')]),
  status: z.enum(['planned', 'taking', 'completed']),
  grade: z.enum(['unrecorded', 'A', 'B', 'C', 'D', 'F']),
}).strict().refine(value => value.status === 'completed' || value.grade === 'unrecorded', {
  message: 'A final grade can only accompany a completed course entry.',
});
export const omscsPlanSchema = z.object({
  startTerm: omscsTermSchema.refine(term => Number(term.slice(0, 4)) <= 2097,
    'Start this seven-term proposal no later than 2097 so every term stays within the supported range.'),
  includeSummer: z.boolean(),
  courses: z.array(omscsCourseRecordSchema).max(10).refine(
    rows => new Set(rows.map(row => row.id)).size === rows.length, 'A course can only be recorded once.',
  ),
}).strict();

export function nextOmscsTerm(now = new Date()): OmscsTerm {
  if (!Number.isFinite(now.getTime())) throw new Error('Cannot propose a semester from an invalid date.');
  const month = now.getMonth();
  return omscsTermSchema.parse(month < 4 ? `${now.getFullYear()}-summer`
    : month < 8 ? `${now.getFullYear()}-fall` : `${now.getFullYear() + 1}-spring`);
}

export function omscsTermLabel(term: OmscsTerm): string {
  const [year, season] = term.split('-');
  return `${season[0].toUpperCase()}${season.slice(1)} ${year}`;
}

export function omscsTermIndex(term: OmscsTerm): number {
  const valid = omscsTermSchema.parse(term);
  const [year, season] = valid.split('-');
  return Number(year) * 3 + seasons.findIndex(value => value === season);
}

export function followingOmscsTerm(term: OmscsTerm, includeSummer: boolean): OmscsTerm {
  const index = omscsTermIndex(term);
  const next = index + (!includeSummer && index % 3 === 0 ? 2 : 1);
  return omscsTermSchema.parse(`${Math.floor(next / 3)}-${seasons[next % 3]}`);
}

export function proposedOmscsPlan(now = new Date()): OmscsPlan {
  const next = nextOmscsTerm(now);
  return { startTerm: next.endsWith('-summer') ? followingOmscsTerm(next, false) : next, includeSummer: false, courses: [] };
}

export function setOmscsRoute(
  existing: OmscsPlan | undefined, input: Pick<OmscsPlan, 'startTerm' | 'includeSummer'>,
): OmscsPlan {
  return omscsPlanSchema.parse({ ...input, courses: existing?.courses ?? [] });
}

export function setOmscsCourse(
  existing: OmscsPlan | undefined, input: OmscsCourseRecord, now = new Date(),
): OmscsPlan {
  const course = omscsCourseRecordSchema.parse(input);
  const plan = existing ?? proposedOmscsPlan(now);
  return omscsPlanSchema.parse({
    ...plan,
    courses: [...plan.courses.filter(row => row.id !== course.id), course]
      .sort((a, b) => pathCourses.findIndex(course => course.id === a.id) - pathCourses.findIndex(course => course.id === b.id)),
  });
}

export function getOmscsSchedule(plan: OmscsPlan) {
  const defaults = new Map<string, OmscsTerm>();
  let term = plan.startTerm;
  for (const [index, course] of omscsRouteCourses.entries()) {
    defaults.set(course.id, term);
    if (index < omscsRouteCourses.length - 1) term = followingOmscsTerm(term, plan.includeSummer);
  }
  return omscsCourses.map(course => {
    const record = plan.courses.find(row => row.id === course.id);
    return { course, record, term: record?.term || defaults.get(course.id) || null };
  });
}

export function getOmscsSummary(plan: OmscsPlan | undefined) {
  let reportedCredits = 0, qualifyingCredits = 0, specializationCredits = 0, unknownGrades = 0;
  const problems: string[] = [];
  for (const record of plan?.courses ?? []) {
    if (record.status !== 'completed') continue;
    const course = pathCourse(record.id);
    const allocation = academicAllocation(record.id, plan?.courses ?? []);
    if (record.grade !== 'D' && record.grade !== 'F') reportedCredits += 3;
    if (record.grade === 'unrecorded') {
      unknownGrades++;
      continue;
    }
    const eligible = record.grade === 'A' || record.grade === 'B' ||
      allocation === 'Free elective' && record.grade === 'C';
    if (eligible) {
      qualifyingCredits += 3;
      if (allocation !== 'Free elective') specializationCredits += 3;
    } else problems.push(`${course.code}: this entered grade does not meet its proposed ${allocation.toLowerCase()} slot. Review reallocation or further study with official advising.`);
  }
  if ((plan?.courses.filter(row => row.status === 'completed' && ['A', 'B', 'C'].includes(row.grade)
    && !['CS', 'CSE'].includes(pathCourse(row.id).subject)).length ?? 0) > 2) {
    problems.push('Passing non-CS/CSE entries exceed the six-credit cap. Review which courses can count toward the degree.');
  }
  return { reportedCredits, qualifyingCredits, specializationCredits, unknownGrades, problems };
}

export function getOmscsScheduleWarnings(plan: OmscsPlan): string[] {
  const schedule = getOmscsSchedule(plan);
  const warnings: string[] = [];
  for (const [beforeId, afterId] of [
    ['cs7641', 'cs7643'], ['cs7641', 'cs7650'], ['cs6200', 'cs7210'], ['cs6200', 'cs7295'],
  ]) {
    const before = schedule.find(row => row.course.id === beforeId)!;
    const after = schedule.find(row => row.course.id === afterId)!;
    if (before.record?.status !== 'completed' && after.record?.status !== 'completed' && before.term && after.term &&
        omscsTermIndex(before.term) >= omscsTermIndex(after.term)) {
      warnings.push(`${after.course.code}: the proposed term is not after ${before.course.code}. Review the recommended preparation order; this is not an enforced registration prerequisite.`);
    }
  }
  const terms = new Map<OmscsTerm, number>();
  for (const row of schedule) {
    if (row.term && row.record?.status !== 'completed') terms.set(row.term, (terms.get(row.term) ?? 0) + 1);
  }
  for (const [term, count] of terms) {
    const limit = term.endsWith('summer') ? 1 : 2;
    if (count > limit) warnings.push(`${omscsTermLabel(term)}: ${count} proposed courses exceed the default ${limit}-course letter-grade limit. An exception is not assumed.`);
    else if (count > 1) warnings.push(`${omscsTermLabel(term)}: multiple substantial courses share this term. Check preparation, workload and actual offerings.`);
  }
  return warnings;
}
