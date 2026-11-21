import type { AppState } from '../types';
import type { OmscsPlan } from './types';

export const ACADEMIC_STARTER_KEY = 'careeros.academic-starter.v1';
export const ACADEMIC_STARTER_VERSION = '1';

// These academic self-reports were explicitly approved as public app defaults.
export function createAcademicStarter(): OmscsPlan {
  return {
    startTerm: '2027-spring',
    includeSummer: false,
    courses: [
      { id: 'cs6457', term: '2025-spring', status: 'completed', grade: 'A' },
      { id: 'cs7632', term: '2025-summer', status: 'completed', grade: 'B' },
      { id: 'cs7637', term: '2025-fall', status: 'completed', grade: 'C' },
    ],
  };
}

export function initializeAcademicStarter(state: AppState): AppState {
  return state.omscsPlan === undefined && !state.sampleData ? { ...state, omscsPlan: createAcademicStarter() } : state;
}
