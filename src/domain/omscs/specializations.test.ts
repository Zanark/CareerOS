import { describe, expect, it } from 'vitest';
import { omscsSpecializations, specializationCourseIds, specializationFit } from './specializations';
import type { OmscsCourseRecord } from './types';
import { isPathCourse } from './paths/catalog';
import { createAcademicStarter } from './starter';
import { evaluateDegree } from './paths/model';
import { recommendedAiSelection } from './recommendations';
import { getOmscsSummary, omscsPlanSchema } from './model';

const specialization = (id: string) => omscsSpecializations.find(item => item.id === id)!;
const completed = (ids: string[]): OmscsCourseRecord[] => ids.map(id => ({ id, term: '2024-fall', status: 'completed', grade: 'B' }));

describe('six source-backed online specialization allocations', () => {
  it('uses only current online inventory and the published five/six course requirement totals', () => {
    expect(omscsSpecializations).toHaveLength(6);
    for (const spec of omscsSpecializations) {
      expect(specializationCourseIds(spec).every(isPathCourse), spec.id).toBe(true);
      expect(spec.groups.reduce((sum, group) => sum + group.count, 0) * 3).toBe(spec.credits);
    }
    expect(specialization('systems').credits).toBe(18);
  });

  it('reuses completed passing courses differently while never putting a C in specialization credit', () => {
    const records: OmscsCourseRecord[] = [
      ...completed(['cs6457', 'cs7632']),
      { id: 'cs7637', term: '2024-fall', status: 'completed', grade: 'C' },
    ];
    const counts = Object.fromEntries(omscsSpecializations.map(spec => [spec.id, specializationFit(spec, records).specializationCourses]));
    expect(counts).toEqual({ ai: 1, systems: 0, robotics: 0, hci: 2, graphics: 1, ml: 1 });
    for (const spec of omscsSpecializations) {
      const fit = specializationFit(spec, records);
      expect(fit.courseGroups.has('cs7637')).toBe(false);
      expect(fit.passingCourses).toBe(3);
      expect(fit.remainingCourses).toBe(7);
    }
  });

  it('does not count a graphics course as both its core and an elective', () => {
    const fit = specializationFit(specialization('graphics'), completed(['cs6457']));
    expect(fit.specializationCourses).toBe(1);
    expect(fit.groupCount('graphics-core') + fit.groupCount('electives')).toBe(1);
  });

  it('cannot satisfy HCI with design electives only or reuse its mobile core', () => {
    const fit = specializationFit(specialization('hci'), completed(['cs7470', 'cs6750', 'cs6435', 'cs6457', 'cs6460']));
    expect(fit.specializationCourses).toBe(4);
    expect(fit.groupCount('electives')).toBe(2);
    expect(fit.courseGroups.get('cs7470')).toBe('mobile');
  });

  it('requires an online robotics elective rather than three perception courses', () => {
    const records = completed(['cs6515', 'cs7641', 'cs6475', 'cs6476', 'cs7650']);
    expect(specializationFit(specialization('robotics'), records).specializationCourses).toBe(4);
    expect(specializationFit(specialization('robotics'), [...records, ...completed(['cs7638'])]).specializationCourses).toBe(5);
  });

  it('allows unused systems cores as electives without double counting', () => {
    const fit = specializationFit(specialization('systems'), completed(['cs6515', 'cs6210', 'cs6250', 'cs6290']));
    expect(fit.specializationCourses).toBe(4);
    expect(fit.groupCount('systems-core')).toBe(2);
    expect(fit.groupCount('electives')).toBe(1);
  });

  it('builds a grade-compatible AI suggestion and retains degree-only completed credits', () => {
    const plan = createAcademicStarter();
    const profile = { programStart: '' as const, resumeTerm: plan.startTerm,
      completed: plan.courses.map(({ id, term, grade }) => ({ id, term, grade })) };
    const selection = recommendedAiSelection(profile.completed);
    const degree = evaluateDegree('current', selection, ['cs6200', 'cs7210', 'cs7295'], profile);
    expect(degree.errors).toEqual([]);
    expect(degree.completeSubjectPlan).toBe(true);
    expect(degree.newCourseIds).toHaveLength(7);
    expect(degree.priorFree).toContain('cs7637');
    expect(getOmscsSummary(plan)).toMatchObject({ reportedCredits: 9, qualifyingCredits: 9, specializationCredits: 3, problems: [] });
  });

  it('records valid catalogue-wide entries but rejects campus-only or duplicate identities', () => {
    const plan = createAcademicStarter();
    expect(omscsPlanSchema.parse({ ...plan, courses: [...plan.courses, ...completed(['cs7470'])] }).courses).toHaveLength(4);
    expect(() => omscsPlanSchema.parse({ ...plan, courses: completed(['cs7652']) })).toThrow();
    expect(() => omscsPlanSchema.parse({ ...plan, courses: [...plan.courses, plan.courses[0]] })).toThrow();
  });
});
