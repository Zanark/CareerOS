import type { OmscsCourseRecord } from './types';

export interface SpecializationSelection {
  design: string;
  ai: [string, string];
  electives: [string, string];
}
export const defaultPathSelection: SpecializationSelection = {
  design: 'cs6515', ai: ['cs7637', 'cs7641'], electives: ['cs7632', 'cs7643'],
};
const formalAiRoute: SpecializationSelection = {
  design: 'cs6515', ai: ['cs7641', 'cs7643'], electives: ['cs7632', 'cs7650'],
};

export function recommendedAiSelection(completed: readonly Pick<OmscsCourseRecord, 'id' | 'grade'>[]): SpecializationSelection {
  const degreeOnly = new Set(completed.filter(row => row.grade === 'C').map(row => row.id));
  const originalIds = [defaultPathSelection.design, ...defaultPathSelection.ai, ...defaultPathSelection.electives];
  return structuredClone(originalIds.some(id => degreeOnly.has(id)) ? formalAiRoute : defaultPathSelection);
}

export function academicAllocation(id: string, records: readonly OmscsCourseRecord[]) {
  const selection = recommendedAiSelection(records.filter(row => row.status === 'completed'));
  if (selection.design === id) return 'Algorithms core';
  if (selection.ai.includes(id)) return 'AI core';
  if (selection.electives.includes(id)) return 'Specialization elective';
  return 'Free elective';
}
