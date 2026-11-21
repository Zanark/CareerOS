import { pathCourse } from './paths/catalog';
import type { OmscsCourseRecord } from './types';

export interface SpecializationGroup {
  id: string;
  title: string;
  count: number;
  courseIds: readonly string[];
  minimums?: readonly { title: string; count: number; courseIds: readonly string[] }[];
  note?: string;
}
export interface OmscsSpecialization {
  id: string;
  title: string;
  credits: 15 | 18;
  url: string;
  groups: readonly SpecializationGroup[];
}
export const specializationsReviewedAt = '2026-11-20';
const aiDesign = ['cs6300', 'cs6515'];
const aiCore = ['cs6476', 'cs6601', 'cs7637', 'cs7641', 'cs7643', 'cs7650'];
const systemsCore = ['cs6210', 'cs6250', 'cs6290', 'cs6300', 'cs6400'];
const perception = ['cs6475', 'cs6476', 'cs7639', 'cs7650', 'cs7711'];
const robotics = ['cs7638'];
const design = ['cs6435', 'cs6457', 'cs6460', 'cs6795'];
const interactive = ['cs6440', 'cs7470', 'cs7632', 'cs7711'];
const graphics = ['cs6457', 'cs6475', 'cs6476', 'cs6491', 'cs7496'];
const url = (suffix: string) => `https://omscs.gatech.edu/specialization-${suffix}`;

export const omscsSpecializations: readonly OmscsSpecialization[] = [
  {
    id: 'ai', title: 'Artificial Intelligence', credits: 15,
    url: url('artificial-intelligence-formerly-interactive-intelligence'),
    groups: [
      { id: 'design', title: 'Algorithms & design', count: 1, courseIds: aiDesign },
      { id: 'ai-core', title: 'AI core', count: 2, courseIds: aiCore },
      { id: 'electives', title: 'Specialization electives', count: 2,
        courseIds: [...aiDesign, ...aiCore, 'cs7632', 'cs6440', 'cs6460', 'cs6603', 'cs6750', 'cs6795'],
        note: 'Unused core courses may fill elective slots. The same course never fills two slots.' },
    ],
  },
  {
    id: 'systems', title: 'Computing Systems', credits: 18, url: url('computing-systems'),
    groups: [
      { id: 'algorithms', title: 'Algorithms', count: 1, courseIds: ['cs6515'] },
      { id: 'systems-core', title: 'Systems core', count: 2, courseIds: systemsCore },
      { id: 'electives', title: 'Specialization electives', count: 3,
        courseIds: ['cs6515', ...systemsCore, 'cs6035', 'cs6200', 'cs6211', 'cs6238', 'cs6260', 'cs6261',
          'cs6262', 'cs6263', 'cs6291', 'cs6310', 'cs6340', 'cs6422', 'cs6675', 'cs6747',
          'cs7210', 'cs7280', 'cs7295', 'cs7400', 'cse6220', 'cs6264', 'cs8803-o08'],
        note: 'Unused cores may count. Only the currently named online faculty-topic exceptions are listed; other topics need separate confirmation.' },
    ],
  },
  {
    id: 'robotics', title: 'Computational Perception & Robotics', credits: 15,
    url: url('computational-perception-and-robotics'),
    groups: [
      { id: 'algorithms', title: 'Algorithms', count: 1, courseIds: ['cs6515'] },
      { id: 'intelligence', title: 'AI or Machine Learning', count: 1, courseIds: ['cs6601', 'cs7641'] },
      { id: 'electives', title: 'Perception & robotics electives', count: 3, courseIds: [...perception, ...robotics],
        minimums: [{ title: 'Perception', count: 1, courseIds: perception }, { title: 'Robotics', count: 1, courseIds: robotics }] },
    ],
  },
  {
    id: 'hci', title: 'Human-Computer Interaction', credits: 15, url: url('human-computer-interaction'),
    groups: [
      { id: 'mobile', title: 'Mobile & ubiquitous computing', count: 1, courseIds: ['cs7470'] },
      { id: 'hci', title: 'Human-Computer Interaction', count: 1, courseIds: ['cs6750'] },
      { id: 'electives', title: 'Specialization electives', count: 3, courseIds: [...design, ...interactive],
        minimums: [{ title: 'Design & evaluation', count: 1, courseIds: design }, { title: 'Interactive technology', count: 1, courseIds: interactive }],
        note: 'Core Mobile & Ubiquitous Computing cannot also fill an elective slot.' },
    ],
  },
  {
    id: 'graphics', title: 'Computer Graphics', credits: 15, url: url('computer-graphics'),
    groups: [
      { id: 'graphics-core', title: 'Graphics core', count: 1, courseIds: ['cs6457', 'cs6491', 'cs7496'] },
      { id: 'algorithms', title: 'Algorithms', count: 1, courseIds: ['cs6515'] },
      { id: 'electives', title: 'Graphics electives', count: 3, courseIds: graphics,
        note: 'A graphics core course may instead fill an elective slot, but never both.' },
    ],
  },
  {
    id: 'ml', title: 'Machine Learning', credits: 15, url: url('machine-learning'),
    groups: [
      { id: 'algorithms', title: 'Algorithms', count: 1, courseIds: ['cs6515'] },
      { id: 'ml-core', title: 'Machine Learning', count: 1, courseIds: ['cs7641'] },
      { id: 'electives', title: 'ML electives', count: 3, courseIds: ['cs6476', 'cs6601', 'cs6603',
        'cs7280', 'cs7632', 'cs7637', 'cs7642', 'cs7643', 'cs7646', 'cs7650', 'cse6242', 'cse6250', 'isye6420'],
        note: 'The official list requires at least one third of graded content to be ML. Similar titles alone do not establish an approved elective.' },
    ],
  },
];

export function specializationFit(specialization: OmscsSpecialization, records: readonly OmscsCourseRecord[]) {
  const slots = specialization.groups.flatMap(group => {
    const minimums = group.minimums ?? [];
    const reserved = minimums.flatMap(area => Array.from({ length: area.count }, () => ({ group: group.id, courses: area.courseIds })));
    if (reserved.length > group.count) throw new Error(`Invalid sub-area total in ${specialization.id}.`);
    return [...reserved, ...Array.from({ length: group.count - reserved.length }, () => ({ group: group.id, courses: group.courseIds }))];
  });
  const eligible = records.filter(record => record.status === 'completed' && (record.grade === 'A' || record.grade === 'B'));
  const assigned = new Map<number, string>();
  const place = (id: string, seen: Set<number>): boolean => {
    for (const [index, slot] of slots.entries()) {
      if (!slot.courses.includes(id) || seen.has(index)) continue;
      seen.add(index);
      const previous = assigned.get(index);
      if (!previous || place(previous, seen)) { assigned.set(index, id); return true; }
    }
    return false;
  };
  for (const record of eligible) place(record.id, new Set());
  const courseGroups = new Map([...assigned].map(([index, id]) => [id, slots[index].group]));
  const passing = records.filter(record => record.status === 'completed' && ['A', 'B', 'C'].includes(record.grade));
  const free = passing.filter(record => !courseGroups.has(record.id));
  const outside = passing.filter(record => !['CS', 'CSE'].includes(pathCourse(record.id).subject));
  return {
    courseGroups,
    specializationCourses: courseGroups.size,
    requiredCourses: specialization.credits / 3,
    freeCourses: free.length,
    freeSlots: 10 - specialization.credits / 3,
    passingCourses: passing.length,
    remainingCourses: Math.max(0, 10 - passing.length),
    nonCsCseOverflow: outside.length > 2,
    groupCount: (id: string) => [...courseGroups.values()].filter(group => group === id).length,
  };
}

export function specializationCourseIds(specialization: OmscsSpecialization) {
  return [...new Set(specialization.groups.flatMap(group => group.courseIds))];
}
