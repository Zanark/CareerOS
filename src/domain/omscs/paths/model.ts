import { z } from 'zod';
import type { AppState } from '../../types';
import type { OmscsGrade, OmscsTerm } from '../types';
import { followingOmscsTerm, omscsTermIndex, omscsTermLabel, omscsTermSchema, proposedOmscsPlan } from '../model';
import { isPathCourse, outsideCsCse, pathCourse, pathCourses } from './catalog';
import { pathRules } from './rules';
import type { PathRuleId } from './rules';
import { courseEntryAssessment, hardCoursePrerequisites, hardPrerequisiteProblems, prerequisiteNeedsEarlierTerm } from './requirements';
import type { EntryConfirmations } from './requirements';
export { defaultPathSelection } from '../recommendations';
export type { SpecializationSelection } from '../recommendations';
import type { SpecializationSelection } from '../recommendations';
import { defaultPathSelection } from '../recommendations';
import { createAcademicStarter } from '../starter';

export interface PriorCourse {
  id: string;
  term: OmscsTerm | '';
  grade: OmscsGrade;
}
export interface PathProfile {
  programStart: OmscsTerm | '';
  resumeTerm: OmscsTerm;
  completed: PriorCourse[];
  readmissionConfirmed?: boolean;
}
export interface SpecializationPath {
  id: string;
  courseIds: string[];
  allocations: SpecializationSelection[];
}

export const pathProfileSchema: z.ZodType<PathProfile> = z.object({
  programStart: z.union([omscsTermSchema, z.literal('')]),
  resumeTerm: omscsTermSchema.refine(term => Number(term.slice(0, 4)) <= 2095, 'Use a start year no later than 2095.'),
  readmissionConfirmed: z.boolean().optional(),
  completed: z.array(z.object({
    id: z.string().refine(isPathCourse, 'Choose a course in the reviewed OMSCS catalogue.'),
    term: z.union([omscsTermSchema, z.literal('')]),
    grade: z.enum(['unrecorded', 'A', 'B', 'C', 'D', 'F']),
  }).strict()).max(10).refine(rows => new Set(rows.map(row => row.id)).size === rows.length, 'A prior course can only appear once.'),
}).strict().superRefine((profile, context) => {
  for (const row of profile.completed) {
    if (row.term && omscsTermIndex(row.term) >= omscsTermIndex(profile.resumeTerm)) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: 'A prior completed course must be before the proposed return semester.' });
    }
    if (row.term && profile.programStart && omscsTermIndex(row.term) < omscsTermIndex(profile.programStart)) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: 'Review a prior course dated before the entered program start.' });
    }
  }
});

export function profileFromWorkspace(state: AppState): PathProfile {
  return {
    programStart: '', resumeTerm: state.omscsPlan?.startTerm ?? createAcademicStarter().startTerm,
    completed: state.omscsPlan?.courses.filter(row => row.status === 'completed')
      .map(row => ({ id: row.id, term: row.term, grade: row.grade })) ?? [],
  };
}

function pairs(values: readonly string[]): [string, string][] {
  return values.flatMap((first, index) => values.slice(index + 1).map(second => [first, second] as [string, string]));
}
export function electiveChoices(ruleId: PathRuleId, selection: Pick<SpecializationSelection, 'design' | 'ai'>): string[] {
  const rule = pathRules[ruleId], used = new Set([selection.design, ...selection.ai]);
  return [...new Set([...rule.electives, ...(rule.allowExcessCore ? [...rule.design, ...rule.ai] : [])])]
    .filter(id => !used.has(id));
}
export function specializationIds(selection: SpecializationSelection): string[] {
  return [selection.design, ...selection.ai, ...selection.electives];
}
export function specializationErrors(ruleId: PathRuleId, selection: SpecializationSelection): string[] {
  const rule = pathRules[ruleId], errors: string[] = [];
  if (!rule.design.includes(selection.design)) errors.push('Choose an online algorithms/design course allowed by this rule set.');
  if (selection.ai.some(id => !rule.ai.includes(id))) errors.push('Both AI-core courses must be allowed by the selected rule set.');
  if (new Set(specializationIds(selection)).size !== 5) errors.push('The five specialization slots must use five different courses.');
  const allowed = electiveChoices(ruleId, selection);
  if (selection.electives.some(id => !allowed.includes(id))) errors.push('Choose two permitted specialization electives; a core course cannot count twice.');
  return errors;
}

const pathCache = new Map<PathRuleId, readonly SpecializationPath[]>();
export function enumerateSpecializationPaths(ruleId: PathRuleId): readonly SpecializationPath[] {
  const cached = pathCache.get(ruleId);
  if (cached) return cached;
  const paths = new Map<string, SpecializationPath>(), rule = pathRules[ruleId];
  for (const design of rule.design) for (const ai of pairs(rule.ai)) {
    for (const electives of pairs(electiveChoices(ruleId, { design, ai }))) {
      const courseIds = [design, ...ai, ...electives].sort(), id = courseIds.join('|');
      const existing = paths.get(id);
      const allocation = { design, ai, electives };
      if (existing) existing.allocations.push(allocation);
      else paths.set(id, { id, courseIds, allocations: [allocation] });
    }
  }
  const result = [...paths.values()];
  pathCache.set(ruleId, result);
  return result;
}

export function budgetCompleted(profile: PathProfile): PriorCourse[] {
  return profile.completed.filter(row => row.grade !== 'D' && row.grade !== 'F');
}
export function specializationGradeConflicts(profile: PathProfile, ids: readonly string[]): string[] {
  return profile.completed.filter(row => row.grade === 'C' && ids.includes(row.id))
    .map(row => `${pathCourse(row.id).code} has an entered C. It can count as a free elective, not a B-minimum specialization course.`);
}
export function reusedInSpecialization(profile: PathProfile, path: SpecializationPath): number {
  const complete = new Set(budgetCompleted(profile).map(row => row.id));
  return path.courseIds.filter(id => complete.has(id)).length;
}

export function evaluateDegree(ruleId: PathRuleId, selection: SpecializationSelection, free: readonly string[], profile: PathProfile) {
  const spec = specializationIds(selection), specSet = new Set(spec), completed = budgetCompleted(profile);
  const errors = [...specializationErrors(ruleId, selection), ...specializationGradeConflicts(profile, spec)];
  const priorFree = completed.filter(row => !specSet.has(row.id)).map(row => row.id);
  const completeSet = new Set(completed.map(row => row.id));
  const freeSlots = 5 - priorFree.length;
  if (freeSlots < 0) errors.push('More than five prior courses fall outside this specialization. Limit the assumed degree-credit baseline or choose another allocation.');
  if (new Set(free).size !== free.length) errors.push('An additional free elective is selected more than once.');
  for (const id of free) {
    if (!isPathCourse(id)) errors.push(`Unknown free-elective course: ${id}.`);
    else if (specSet.has(id) || completeSet.has(id)) errors.push(`${pathCourse(id).code} is already counted. Remove its duplicate free-elective selection.`);
  }
  if (free.length > freeSlots) errors.push(`This allocation has room for ${Math.max(0, freeSlots)} additional free electives, not ${free.length}.`);
  const degreeIds = [...new Set([...spec, ...priorFree, ...free])].filter(isPathCourse);
  const outsideCount = degreeIds.filter(outsideCsCse).length;
  if (outsideCount > 2) errors.push('Non-CS/CSE courses exceed the six-credit maximum (two three-credit courses).');
  const newSpec = [...specSet].filter(id => !completeSet.has(id));
  return {
    errors: [...new Set(errors)], priorFree, freeSlots: Math.max(0, freeSlots), outsideCount,
    degreeIds, newSpec, newCourseIds: [...new Set([...newSpec, ...free])],
    priorCount: completed.length, remainingCourses: Math.max(0, 10 - completed.length),
    chosenCourses: degreeIds.length, missingFree: Math.max(0, freeSlots - free.length),
    unknownGrades: completed.filter(row => row.grade === 'unrecorded').length,
    completeSubjectPlan: errors.length === 0 && degreeIds.length === 10 && free.length === freeSlots,
  };
}

export function courseShortlist(selection: SpecializationSelection, free: readonly string[], profile: PathProfile) {
  const completed = new Set(budgetCompleted(profile).map(row => row.id)), spec = new Set(specializationIds(selection));
  return [
    { id: selection.design, role: 'Algorithms / design' },
    ...selection.ai.map(id => ({ id, role: 'AI core' })),
    ...selection.electives.map(id => ({ id, role: 'Specialization elective' })),
    ...budgetCompleted(profile).filter(row => !spec.has(row.id)).map(row => ({ id: row.id, role: 'Free elective' })),
    ...free.map(id => ({ id, role: 'Free elective' })),
  ].map(row => ({ ...row, reportedComplete: completed.has(row.id) }));
}

function combinations(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  let value = 1;
  for (let index = 1; index <= Math.min(k, n - k); index++) value = value * (n - index + 1) / index;
  return Math.round(value);
}
export function remainingFreeCombinations(evaluation: ReturnType<typeof evaluateDegree>): number {
  if (evaluation.errors.length) return 0;
  const selected = new Set(evaluation.degreeIds);
  const available = pathCourses.filter(course => !selected.has(course.id));
  const outside = available.filter(course => outsideCsCse(course.id)).length;
  const inside = available.length - outside, choose = evaluation.missingFree;
  let count = 0;
  for (let nonCs = 0; nonCs <= Math.min(choose, 2 - evaluation.outsideCount); nonCs++) {
    count += combinations(outside, nonCs) * combinations(inside, choose - nonCs);
  }
  return count;
}

export const preparationComparisons = [
  ['cs7641', 'cs7643', 'ML preparation before deep learning'],
  ['cs7641', 'cs7650', 'ML preparation before NLP'],
  ['cs6200', 'cs6210', 'OS preparation before advanced OS'],
  ['cs6200', 'cs7210', 'Systems preparation before distributed protocols'],
  ['cs6200', 'cs7295', 'Systems/architecture preparation before GPU work'],
] as const;
const preferredOrder = ['cs7641', 'cs6200', 'cs6515', 'cs6300', 'cs6601', 'cs7643', 'cs7650', 'cs6476', 'cs6210', 'cs7210', 'cs7295', 'cs6211'];
export function suggestedCourseOrder(ids: readonly string[]): string[] {
  const remaining = new Set(ids), ordered: string[] = [];
  const rank = (id: string) => preferredOrder.includes(id) ? preferredOrder.indexOf(id) : preferredOrder.length + pathCourses.findIndex(course => course.id === id);
  while (remaining.size) {
    const ready = [...remaining].filter(id => !preparationComparisons.some(([before, after]) => after === id && remaining.has(before))
      && !hardCoursePrerequisites.some(({ before, after }) => after === id && remaining.has(before)));
    if (!ready.length) throw new Error('The authored preparation comparisons contain a cycle.');
    ready.sort((a, b) => rank(a) - rank(b));
    ordered.push(ready[0]); remaining.delete(ready[0]);
  }
  return ordered;
}
export function firstTermCourseOrder(ids: readonly string[], first: string): string[] {
  const ordered = suggestedCourseOrder(ids);
  if (!first) return ordered;
  if (!ids.includes(first)) throw new Error('The first-term choice is not a selected new subject. Review the draft before proposing a calendar.');
  return [first, ...ordered.filter(id => id !== first)];
}
export function proposedPathSemesters(ids: readonly string[], resume: OmscsTerm, includeSummer: boolean, regularLoad: 1 | 2,
  completed: readonly PriorCourse[] = [], checks: EntryConfirmations = {}) {
  const problems = hardPrerequisiteProblems(ids, completed, checks);
  if (problems.length) throw new Error(problems.join(' '));
  let term = resume;
  const remaining = [...ids], semesters: { term: OmscsTerm; courseIds: string[] }[] = [];
  while (remaining.length) {
    const load = term.endsWith('summer') ? 1 : regularLoad;
    const available = remaining.filter(after => !remaining.some(before => prerequisiteNeedsEarlierTerm(before, after, completed, checks)));
    if (!available.length) throw new Error('The required course order cannot produce an eligible next term.');
    const courseIds = available.slice(0, load);
    semesters.push({ term, courseIds });
    for (const id of courseIds) remaining.splice(remaining.indexOf(id), 1);
    if (remaining.length) term = followingOmscsTerm(term, includeSummer);
  }
  return semesters;
}

export function returnGap(profile: PathProfile) {
  const terms = profile.completed.map(row => row.term).filter((term): term is OmscsTerm => Boolean(term));
  if (!terms.length) return { terms: [] as OmscsTerm[], needsCheck: false };
  const last = terms.reduce((a, b) => omscsTermIndex(a) > omscsTermIndex(b) ? a : b);
  const gap: OmscsTerm[] = [];
  let next = followingOmscsTerm(last, true);
  while (omscsTermIndex(next) < omscsTermIndex(profile.resumeTerm)) {
    gap.push(next); next = followingOmscsTerm(next, true);
  }
  return { terms: gap, needsCheck: gap.length >= 3 };
}
export function pathCalendarWarnings(profile: PathProfile, semesters: ReturnType<typeof proposedPathSemesters>, checks: EntryConfirmations = {}): string[] {
  const warnings: string[] = [];
  const positions = new Map(semesters.flatMap((semester, index) => semester.courseIds.map(id => [id, index] as const)));
  const completed = new Set(budgetCompleted(profile).map(row => row.id));
  for (const [before, after, label] of preparationComparisons) {
    if (after === 'cs7643') continue;
    const a = positions.get(before), b = positions.get(after);
    if (!completed.has(before) && b !== undefined && (a === undefined || a >= b)) {
      warnings.push(`${label}: review actual readiness. This comparison is guidance, not an enforced registration prerequisite.`);
    }
  }
  for (const [index, semester] of semesters.entries()) for (const id of semester.courseIds) {
    const entry = courseEntryAssessment(id, profile.completed, semesters.slice(0, index).flatMap(term => term.courseIds), checks);
    if (entry?.warning) warnings.push(entry.warning);
  }
  if (positions.has('cs6211')) warnings.push('CS 6211: mandatory weekly 90-minute live meetings. Confirm the current section and attendance conditions.');
  if (semesters.some(term => term.courseIds.length > 1)) warnings.push('Two substantial courses share at least one regular term. This is a heavy what-if pace, not a workload recommendation or approved exception.');
  const finish = semesters.at(-1)?.term;
  if (finish) for (const row of budgetCompleted(profile)) {
    if (row.term && omscsTermIndex(finish) - omscsTermIndex(row.term) >= 18) {
      warnings.push(`${pathCourse(row.id).code}: ${omscsTermLabel(finish)} reaches or exceeds its six-year credit-age watchpoint. Confirm the exact eligible graduation term; a break/readmission does not automatically renew old credits.`);
    }
  }
  return [...new Set(warnings)];
}

export const pathPresets = [
  { id: 'ai-systems', title: 'AI engineering + systems', why: 'Balanced original route: ML/DL plus OS, NLP, distributed failure and GPU cost/performance.', selection: defaultPathSelection, free: ['cs6457', 'cs6200', 'cs7650', 'cs7210', 'cs7295'] },
  { id: 'cloud-platform', title: 'Cloud-platform depth', why: 'Trade DC/GPU for AOS/SDCC. Check the substantial systems preparation and live attendance cost.', selection: defaultPathSelection, free: ['cs6457', 'cs6200', 'cs7650', 'cs6210', 'cs6211'] },
  { id: 'product-ai', title: 'Product / human-centered AI', why: 'Combine ML with interface evaluation, responsible-AI thinking, NLP and delivery foundations.', selection: { design: 'cs6300', ai: ['cs7637', 'cs7641'], electives: ['cs7632', 'cs6750'] }, free: ['cs6457', 'cs7643', 'cs7650', 'cs6603', 'cs6200'] },
  { id: 'model-depth', title: 'Broader AI methods', why: 'Favor AI, DL, NLP, vision and reinforcement learning; this trades away some systems depth.', selection: defaultPathSelection, free: ['cs6457', 'cs6601', 'cs7650', 'cs6476', 'cs7642'] },
] satisfies { id: string; title: string; why: string; selection: SpecializationSelection; free: string[] }[];
