export const pathsReviewedAt = '2026-11-19';
export const pathSources = {
  ai: 'https://omscs.gatech.edu/specialization-artificial-intelligence-formerly-interactive-intelligence',
  degree: 'https://omscs.gatech.edu/degree-requirements',
  courses: 'https://omscs.gatech.edu/current-courses',
  catalog: 'https://catalog.gatech.edu/programs/computer-science-ms/',
  return: 'https://registrar.gatech.edu/info/readmission-policy/readmission-after-being-away-three-or-more-consecutive-terms',
  deadlines: 'https://registrar.gatech.edu/alumni/readmission',
  duration: 'https://omscs.gatech.edu/prospective-student-faqs',
} as const;

export type PathRuleId = 'current' | 'conservative';
export interface PathRules {
  id: PathRuleId;
  title: string;
  description: string;
  design: readonly string[];
  ai: readonly string[];
  electives: readonly string[];
  allowExcessCore: boolean;
}

export const pathRules: Record<PathRuleId, PathRules> = {
  current: {
    id: 'current', title: 'Current OMSCS AI page',
    description: 'The current online page permits all unused core courses as specialization electives, including the other algorithms/design choice.',
    design: ['cs6515', 'cs6300'],
    ai: ['cs6476', 'cs6601', 'cs7637', 'cs7641', 'cs7643', 'cs7650'],
    electives: ['cs7632', 'cs6440', 'cs6460', 'cs6603', 'cs6750', 'cs6795'],
    allowExcessCore: true,
  },
  conservative: {
    id: 'conservative', title: 'Conservative overlap with catalog',
    description: 'Uses AI/KBAI/ML for the two AI-core slots and only electives explicitly supported by both sources. Does not assume the newer excess-core exception for the older table.',
    design: ['cs6515', 'cs6300'],
    ai: ['cs6601', 'cs7637', 'cs7641'],
    electives: ['cs6440', 'cs6460', 'cs6603', 'cs6750', 'cs6476', 'cs7632', 'cs7643', 'cs7650', 'cs6795'],
    allowExcessCore: false,
  },
};

export const unavailableAiChoices = [
  ['CSE 6140', 'Computational Science and Engineering Algorithms', 'Algorithms/design'],
  ['CS 6301', 'Advanced Topics in Software Engineering', 'Algorithms/design'],
  ['CS 6505', 'Computability, Complexity, and Algorithms', 'Algorithms/design'],
  ['CS 6604', 'Conversational AI', 'AI methods'],
  ['CS 7476', 'Advanced Computer Vision', 'AI methods'],
  ['CS 7631', 'Multi-Robot Systems', 'AI methods'],
  ['CS 7633', 'Human-Robot Interaction', 'AI methods'],
  ['CS 7634', 'AI Storytelling in Virtual Worlds', 'AI methods'],
  ['CS 7647', 'Machine Learning with Limited Supervision', 'AI methods'],
  ['CS 7652', 'Large Language Models', 'AI methods'],
  ['CS 7610', 'Modeling and Design', 'Cognition'],
  ['CS 7651', 'Human and Machine Learning', 'Cognition'],
] as const;

export const catalogOnlyReferences = [
  'CS 6465 Computational Journalism',
  'CS 6471 Computational Social Science',
  'CS 8803 Advanced Game AI topic',
  'CS 8803 Computational Creativity topic',
] as const;
