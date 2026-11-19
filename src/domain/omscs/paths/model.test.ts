import { describe, expect, it } from 'vitest';
import { createInitialState } from '../../engine';
import { getDiscoverySnapshot } from '../../../discovery/model';
import { pathArea, pathCourses } from './catalog';
import {
  courseShortlist, defaultPathSelection, enumerateSpecializationPaths, evaluateDegree, firstTermCourseOrder,
  pathCalendarWarnings, pathProfileSchema, proposedPathSemesters,
  remainingFreeCombinations, returnGap, reusedInSpecialization,
  specializationErrors, specializationGradeConflicts, specializationIds,
  suggestedCourseOrder,
} from './model';
import type { PathProfile, SpecializationSelection } from './model';
import { pathRules } from './rules';
import { careerDirections, courseAdvice, courseCareerFit } from './careerFit';
import { getLatestMission } from '../../catalog';

const referenceProfile: PathProfile = {
  programStart: '2022-spring', resumeTerm: '2024-spring',
  completed: [
    { id: 'cs6457', term: '2022-spring', grade: 'unrecorded' },
    { id: 'cs7632', term: '2022-summer', grade: 'unrecorded' },
    { id: 'cs7637', term: '2022-fall', grade: 'unrecorded' },
  ],
};
const free = ['cs6200', 'cs7650', 'cs7210', 'cs7295'];

describe('complete source-backed specialization possibilities', () => {
  it('enumerates distinct subject sets and all legal role allocations separately', () => {
    const current = enumerateSpecializationPaths('current');
    expect(current).toHaveLength(830);
    expect(current.reduce((sum, path) => sum + path.allocations.length, 0)).toBe(1650);
    expect(new Set(current.map(path => path.id)).size).toBe(current.length);
    for (const path of current) for (const allocation of path.allocations) {
      expect(specializationErrors('current', allocation)).toEqual([]);
      expect([...specializationIds(allocation)].sort()).toEqual(path.courseIds);
    }
    const designPairs = current.filter(path => path.courseIds.includes('cs6515') && path.courseIds.includes('cs6300'));
    expect(designPairs).toHaveLength(110);
    expect(designPairs.every(path => path.allocations.some(allocation => allocation.electives.includes('cs6300') || allocation.electives.includes('cs6515')))).toBe(true);
  });

  it('does not silently apply the expanded core menu or unused-core rule to the older catalog comparison', () => {
    const conservative = enumerateSpecializationPaths('conservative');
    expect(conservative).toHaveLength(216);
    const expanded: SpecializationSelection = {
      design: 'cs6515', ai: ['cs7643', 'cs7650'], electives: ['cs7637', 'cs7632'],
    };
    expect(specializationErrors('current', expanded)).toEqual([]);
    expect(specializationErrors('conservative', expanded).length).toBeGreaterThan(0);
    expect(conservative.every(path => path.allocations.every(allocation => allocation.ai.every(id => pathRules.conservative.ai.includes(id))))).toBe(true);
  });

  it('finds every efficient way to reuse the original foundation-reference trio without locking KBAI into a single role', () => {
    const current = enumerateSpecializationPaths('current').filter(path => reusedInSpecialization(referenceProfile, path) === 2);
    expect(current).toHaveLength(75);
    expect(current.some(path => path.allocations.some(allocation => allocation.electives.includes('cs7637')))).toBe(true);
    expect(enumerateSpecializationPaths('conservative').filter(path => reusedInSpecialization(referenceProfile, path) === 2)).toHaveLength(32);
    for (const path of current) {
      const evaluated = evaluateDegree('current', path.allocations[0], [], referenceProfile);
      expect(evaluated.newSpec).toHaveLength(3);
      expect(evaluated.freeSlots).toBe(4);
    }
  });

  it('includes alternate allocations with more specialization subjects and fewer free choices while keeping seven new courses', () => {
    for (const reused of [0, 1, 2]) {
      const path = enumerateSpecializationPaths('current').find(path => reusedInSpecialization(referenceProfile, path) === reused)!;
      const evaluated = evaluateDegree('current', path.allocations[0], [], referenceProfile);
      expect(evaluated.newSpec.length + evaluated.freeSlots).toBe(7);
      expect(evaluated.newSpec.length).toBe(5 - reused);
    }
  });

  it('rejects duplicated roles, unavailable courses and invalid electives rather than counting them twice', () => {
    for (const selection of [
      { ...defaultPathSelection, ai: ['cs7641', 'cs7641'] as [string, string] },
      { ...defaultPathSelection, design: 'cs6505' },
      { ...defaultPathSelection, electives: ['cs7637', 'cs7632'] as [string, string] },
      { ...defaultPathSelection, electives: ['cs7652', 'cs7632'] as [string, string] },
    ]) expect(specializationErrors('current', selection).length).toBeGreaterThan(0);
  });
});

describe('conditional degree budgets and complete free-elective choices', () => {
  it('builds a role-labelled shortlist without retaking reported courses or hiding duplicate-slot conflicts', () => {
    const rows = courseShortlist(defaultPathSelection, free, referenceProfile);
    expect(rows.filter(row => !row.reportedComplete).map(row => row.id).sort())
      .toEqual(evaluateDegree('current', defaultPathSelection, free, referenceProfile).newCourseIds.sort());
    expect(rows.filter(row => row.reportedComplete).map(row => row.id).sort()).toEqual(referenceProfile.completed.map(row => row.id).sort());
    expect(rows.find(row => row.id === 'cs6457')).toMatchObject({ role: 'Free elective', reportedComplete: true });
    const duplicate = courseShortlist({ ...defaultPathSelection, ai: ['cs7641', 'cs7641'] }, [], referenceProfile);
    expect(duplicate.filter(row => row.id === 'cs7641')).toHaveLength(2);
    const failed = { ...referenceProfile, completed: [{ id: 'cs7641', term: '' as const, grade: 'F' as const }] };
    expect(courseShortlist(defaultPathSelection, [], failed).find(row => row.id === 'cs7641')?.reportedComplete).toBe(false);
  });

  it('provides complete explicitly authored career guidance with real roadmap targets, not title matching or numeric scores', () => {
    expect(Object.keys(courseAdvice).sort()).toEqual(pathCourses.map(course => course.id).sort());
    for (const course of pathCourses) for (const direction of careerDirections) {
      const fit = courseCareerFit(course.id, direction.id);
      expect(fit.source).toBe(course.url);
      expect(fit.benefit.length).toBeGreaterThan(30);
      expect(fit.tradeoff.length).toBeGreaterThan(30);
      expect(fit.roadmaps.length).toBeGreaterThan(0);
      expect(fit.direct.some(id => fit.supporting.includes(id))).toBe(false);
      for (const target of fit.roadmaps) expect(getLatestMission(target).id).toBe(target);
    }
    expect(courseCareerFit('cs6300', 'fde').tier).toBe('Direct support');
    expect(courseCareerFit('cs6300', 'cloud').tier).toBe('Supporting depth');
    expect(courseCareerFit('mgt8813', 'cloud').tier).toBe('Specialist detour');
  });

  it('keeps reported credits separate from unknown grades and never mutates workspace or Atlas', () => {
    const workspace = createInitialState(false), raw = JSON.stringify(workspace);
    const before = getDiscoverySnapshot(workspace);
    const result = evaluateDegree('current', defaultPathSelection, free, referenceProfile);
    expect(result).toMatchObject({
      priorCount: 3, remainingCourses: 7, freeSlots: 4, missingFree: 0,
      chosenCourses: 10, unknownGrades: 3, completeSubjectPlan: true, errors: [],
    });
    expect(result.priorFree).toEqual(['cs6457']);
    expect(result.newSpec).toHaveLength(3);
    expect(result.newCourseIds).toHaveLength(7);
    expect(JSON.stringify(workspace)).toBe(raw);
    expect(getDiscoverySnapshot(workspace)).toEqual(before);
  });

  it('retains a C for free-elective use but flags it in a specialization; D/F do not reduce the remaining credit budget', () => {
    const profile = structuredClone(referenceProfile);
    profile.completed[2].grade = 'C';
    expect(specializationGradeConflicts(profile, specializationIds(defaultPathSelection))).toHaveLength(1);
    const moved = { design: 'cs6515', ai: ['cs7641', 'cs6601'] as [string, string], electives: ['cs7632', 'cs7643'] as [string, string] };
    expect(evaluateDegree('current', moved, [], profile).errors).toEqual([]);
    expect(evaluateDegree('current', moved, [], profile).priorFree).toContain('cs7637');
    profile.completed[2].grade = 'F';
    expect(evaluateDegree('current', defaultPathSelection, [], profile).remainingCourses).toBe(8);
  });

  it('surfaces duplicate free courses, overfilled slots, unknown identities and the two-course non-CS/CSE cap', () => {
    for (const selected of [
      ['cs7641'], ['cs6457'], ['cs6200', 'cs6200'], ['not-a-course'],
      [...free, 'cs6250'], ['isye6420', 'inta6450', 'mgt6311', 'cs6200'],
    ]) expect(evaluateDegree('current', defaultPathSelection, selected, referenceProfile).errors.length).toBeGreaterThan(0);
    expect(evaluateDegree('current', defaultPathSelection, ['isye6420', 'inta6450', 'cs6200', 'cs7210'], referenceProfile).completeSubjectPlan).toBe(true);
  });

  it('counts exact remaining free subject combinations with a non-CS/CSE allowance, not role permutations', () => {
    const result = evaluateDegree('current', defaultPathSelection, ['cs6200', 'cs7650', 'cs7210'], referenceProfile);
    const used = new Set(result.degreeIds);
    expect(remainingFreeCombinations(result)).toBe(pathCourses.filter(course => !used.has(course.id)).length);
    const capped = evaluateDegree('current', defaultPathSelection, ['isye6420', 'inta6450', 'cs6200'], referenceProfile);
    const usedCapped = new Set(capped.degreeIds);
    expect(remainingFreeCombinations(capped)).toBe(pathCourses.filter(course => !usedCapped.has(course.id) && ['CS', 'CSE'].includes(course.subject)).length);
    expect(remainingFreeCombinations(evaluateDegree('current', defaultPathSelection, free, referenceProfile))).toBe(1);
    expect(remainingFreeCombinations(evaluateDegree('current', defaultPathSelection, ['bad-id'], referenceProfile))).toBe(0);
  });

  it('covers the whole current regular-course inventory without topic-ID collisions or missing editorial groups', () => {
    expect(pathCourses).toHaveLength(78);
    expect(new Set(pathCourses.map(course => course.id)).size).toBe(78);
    expect(pathCourses.filter(course => !['CS', 'CSE'].includes(course.subject))).toHaveLength(13);
    for (const course of pathCourses) {
      expect(pathArea(course.id)).toBeTruthy();
      expect(new URL(course.url).origin).toBe('https://omscs.gatech.edu');
      expect(course.credits).toBe(3);
    }
    expect(pathCourses.filter(course => course.id.startsWith('cs8803-')).length).toBeGreaterThan(1);
  });
});

describe('return calendars and input boundaries', () => {
  it('lets the learner choose the first new subject, preserves other choices and flags readiness instead of inventing a prerequisite lock', () => {
    const evaluated = evaluateDegree('current', defaultPathSelection, free, referenceProfile);
    const before = [...evaluated.newCourseIds], ordered = firstTermCourseOrder(before, 'cs6200');
    expect(ordered[0]).toBe('cs6200');
    expect(new Set(ordered)).toEqual(new Set(before));
    expect(before).toEqual(evaluated.newCourseIds);
    const advancedFirst = proposedPathSemesters(firstTermCourseOrder(before, 'cs7643'), referenceProfile.resumeTerm, false, 1);
    expect(pathCalendarWarnings(referenceProfile, advancedFirst).some(value => value.startsWith('ML preparation before deep learning'))).toBe(true);
    expect(() => firstTermCourseOrder(before, 'cs6457')).toThrow('not a selected new subject');
    const confirmed = { ...referenceProfile, readmissionConfirmed: true };
    expect(pathProfileSchema.parse(confirmed)).toEqual(confirmed);
    expect(evaluateDegree('current', defaultPathSelection, free, confirmed)).toEqual(evaluated);
    expect(returnGap(confirmed)).toEqual(returnGap(referenceProfile));
  });

  it('counts summer in a three-term gap and does not infer a gap when course terms are unknown', () => {
    expect(returnGap(referenceProfile)).toEqual({ terms: ['2023-spring', '2023-summer', '2023-fall'], needsCheck: true });
    expect(returnGap({ ...referenceProfile, resumeTerm: '2023-fall' }).needsCheck).toBe(false);
    expect(returnGap({ ...referenceProfile, completed: referenceProfile.completed.map(row => ({ ...row, term: '' })) })).toEqual({ terms: [], needsCheck: false });
  });

  it('keeps preparation order visible and supports regular, summer and heavy calendars without inventing offerings', () => {
    const ordered = suggestedCourseOrder(['cs7643', 'cs6211', 'cs6210', 'cs7641', 'cs6200', 'cs7650', 'cs7295']);
    expect(ordered.indexOf('cs7641')).toBeLessThan(ordered.indexOf('cs7643'));
    expect(ordered.indexOf('cs6200')).toBeLessThan(ordered.indexOf('cs6210'));
    expect(ordered.indexOf('cs6210')).toBeLessThan(ordered.indexOf('cs6211'));
    expect(proposedPathSemesters(ordered, '2024-spring', false, 1).at(-1)?.term).toBe('2027-spring');
    const summers = proposedPathSemesters(ordered, '2024-spring', true, 1);
    expect(summers.at(-1)?.term).toBe('2026-spring');
    const heavy = proposedPathSemesters(ordered, '2024-spring', true, 2);
    expect(heavy).toHaveLength(4);
    expect(heavy.filter(row => row.term.endsWith('summer')).every(row => row.courseIds.length === 1)).toBe(true);
    expect(pathCalendarWarnings(referenceProfile, heavy).some(text => text.includes('live meetings'))).toBe(true);
  });

  it('flags credit-age watchpoints from the earned semester instead of resetting the clock on a return', () => {
    const finish = proposedPathSemesters(['cs7641'], '2028-spring', false, 1);
    expect(pathCalendarWarnings(referenceProfile, finish).some(text => text.includes('six-year credit-age'))).toBe(true);
    expect(pathCalendarWarnings(referenceProfile, proposedPathSemesters(['cs7641'], '2027-fall', false, 1)).some(text => text.includes('six-year credit-age'))).toBe(false);
  });

  it('rejects malformed, duplicate, future-completed and contradictory private assumptions', () => {
    expect(pathProfileSchema.parse(referenceProfile)).toEqual(referenceProfile);
    for (const invalid of [
      { ...referenceProfile, secret: 'invalid' },
      { ...referenceProfile, completed: [...referenceProfile.completed, referenceProfile.completed[0]] },
      { ...referenceProfile, completed: [{ id: 'cs7652', term: '', grade: 'A' }] },
      { ...referenceProfile, completed: [{ id: 'cs7641', term: '2024-spring', grade: 'A' }] },
      { ...referenceProfile, programStart: '2023-spring' },
      { ...referenceProfile, resumeTerm: '2096-spring' },
      { ...referenceProfile, completed: [{ id: 'cs7641', term: '', grade: 'B+' }] },
      { ...referenceProfile, readmissionConfirmed: 'true' },
    ]) expect(pathProfileSchema.safeParse(invalid).success).toBe(false);
  });
});
