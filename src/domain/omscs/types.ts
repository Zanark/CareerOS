export const omscsCourseIds = [
  'cs7637', 'cs7632', 'cs6457', 'cs7641', 'cs6200',
  'cs6515', 'cs7643', 'cs7650', 'cs7210', 'cs7295',
] as const;
export type OmscsCourseId = typeof omscsCourseIds[number];
export type OmscsTerm = `${number}-${'spring' | 'summer' | 'fall'}`;
export type OmscsGrade = 'unrecorded' | 'A' | 'B' | 'C' | 'D' | 'F';

export interface OmscsCourseRecord {
  id: string;
  term: OmscsTerm | '';
  status: 'planned' | 'taking' | 'completed';
  grade: OmscsGrade;
}

export interface OmscsPlan {
  startTerm: OmscsTerm;
  includeSummer: boolean;
  courses: OmscsCourseRecord[];
}

export interface OmscsModuleOutline {
  id: string;
  title: string;
  topics: string[];
  task: string;
  check: string;
  transfer: string;
  transferCheck: string;
}

export interface OmscsCourse {
  id: OmscsCourseId;
  code: string;
  title: string;
  allocation: 'Algorithms core' | 'AI core' | 'Specialization elective' | 'Free elective';
  order: number | null;
  overview: string;
  tools: string[];
  preparation: string[];
  assessment: string;
  career: string;
  boundary: string;
  sourceIds: string[];
  modules: OmscsModuleOutline[];
}
