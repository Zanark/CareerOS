import { describe, expect, it } from 'vitest';
import { pathCalendarWarnings, proposedPathSemesters } from './model';
import type { PathProfile, PriorCourse } from './model';
import { courseEntryAssessment, hardPrerequisiteProblems } from './requirements';

const profile: PathProfile = { programStart: '', resumeTerm: '2024-spring', completed: [] };
const aos = (grade: PriorCourse['grade']): PriorCourse[] => [{ id: 'cs6210', term: '2023-fall', grade }];

describe('published prerequisites versus background advice', () => {
  it('does not turn a missing, unknown or ordinary B-grade AOS record into SDCC eligibility', () => {
    for (const completed of [[], aos('unrecorded'), aos('B'), aos('C'), aos('D'), aos('F')]) {
      expect(hardPrerequisiteProblems(['cs6211'], completed)).toHaveLength(1);
      expect(() => proposedPathSemesters(['cs6211'], '2024-spring', false, 1, completed)).toThrow('CS 6211 needs prior CS 6210');
    }
    expect(hardPrerequisiteProblems(['cs6211'], aos('unrecorded'), { 'sdcc-high-b': true })).toHaveLength(1);
    expect(hardPrerequisiteProblems(['cs6211'], aos('C'), { 'sdcc-high-b': true })).toHaveLength(1);
  });

  it('accepts only explicitly reported qualifying grades or allowed alternative approval without rewriting the grade', () => {
    const completed = aos('B'), before = JSON.stringify(completed);
    expect(proposedPathSemesters(['cs6211'], '2024-spring', false, 1, aos('A'))[0].courseIds).toEqual(['cs6211']);
    expect(proposedPathSemesters(['cs6211'], '2024-spring', false, 1, completed, { 'sdcc-high-b': true })[0].courseIds).toEqual(['cs6211']);
    expect(proposedPathSemesters(['cs6211'], '2024-spring', false, 1, [], { 'sdcc-equivalent': true })[0].courseIds).toEqual(['cs6211']);
    expect(JSON.stringify(completed)).toBe(before);
  });

  it('never pairs a planned hard prerequisite with its dependent, even at two courses per term or with reversed input', () => {
    for (const includeSummer of [false, true]) for (const regularLoad of [1, 2] as const) {
      const terms = proposedPathSemesters(['cs6211', 'cs6210'], '2024-spring', includeSummer, regularLoad);
      expect(terms.map(term => term.courseIds)).toEqual([['cs6210'], ['cs6211']]);
      expect(pathCalendarWarnings(profile, terms)).toContain('CS 6211 is conditional on completing earlier CS 6210 with A / confirmed high B, or an approved equivalent.');
    }
    expect(courseEntryAssessment('cs6211', [], ['cs6210'])?.status).toBe('conditional');
    expect(courseEntryAssessment('cs6211', [])?.status).toBe('check');
  });

  it('does not impose an unnecessary earlier-term edge after an explicitly allowed alternative', () => {
    const terms = proposedPathSemesters(['cs6211', 'cs6210'], '2024-spring', false, 2, [], { 'sdcc-equivalent': true });
    expect(terms.map(term => term.courseIds)).toEqual([['cs6211', 'cs6210']]);
    expect(pathCalendarWarnings(profile, terms, { 'sdcc-equivalent': true }).some(warning => warning.includes('mandatory weekly 90-minute live meetings'))).toBe(true);
  });

  it('keeps formal ML background visible without pretending CS 7641 is the only enforced registration route', () => {
    const firstDl = proposedPathSemesters(['cs7643', 'cs7641'], '2024-spring', false, 1);
    expect(firstDl[0].courseIds).toEqual(['cs7643']);
    expect(pathCalendarWarnings(profile, firstDl).some(warning => warning.includes('self-study does not count'))).toBe(true);
    expect(courseEntryAssessment('cs7643', [])?.status).toBe('check');
    expect(courseEntryAssessment('cs7643', [], ['cs7641'])?.status).toBe('conditional');
    expect(courseEntryAssessment('cs7643', [], [], { 'formal-ml': true })?.status).toBe('reported');
    expect(courseEntryAssessment('cs7643', [{ id: 'cs7641', term: '', grade: 'unrecorded' }])?.status).toBe('reported');
  });

  it('leaves GIOS/AOS/systems preparation as advice instead of manufacturing course locks', () => {
    expect(hardPrerequisiteProblems(['cs6210', 'cs7210', 'cs7295', 'cs6310', 'cs7632'], [])).toEqual([]);
    expect(proposedPathSemesters(['cs7210', 'cs7295'], '2024-spring', false, 2)[0].courseIds).toEqual(['cs7210', 'cs7295']);
    expect(courseEntryAssessment('cs7210', [])?.detail).toContain('no prerequisites are enforced');
  });

  it('surfaces background requirements and the graduate cross-listing ambiguity without adding undergraduate degree courses', () => {
    expect(hardPrerequisiteProblems(['cs6422', 'cse6250'], [])).toEqual([]);
    const terms = proposedPathSemesters(['cs6422', 'cse6250'], '2024-spring', false, 1);
    const warnings = pathCalendarWarnings(profile, terms);
    expect(warnings.some(warning => warning.startsWith('CS 6422: review required'))).toBe(true);
    expect(warnings.some(warning => warning.startsWith('CSE 6250: public pages differ'))).toBe(true);
    expect(pathCalendarWarnings(profile, terms, { 'database-background': true, 'health-data-background': true })).toEqual([]);
  });
});
