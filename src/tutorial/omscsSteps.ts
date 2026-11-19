import type { TutorialStep } from './steps';

export const omscsSteps: TutorialStep[] = [
  {
    id: 'omscs-intro', chapter: 'omscs', kind: 'explain', route: 'omscs', command: 'close-dialogs',
    targets: ['omscs-intro'],
    title: 'Gold Circuit / a semester and learning companion',
    body: 'Operation Gold Circuit is an unofficial Georgia Tech OMSCS AI route: ten course guides, proposed semesters and independent learning. It is not university advising, registration or a connected AI tutor. No prior completion is imported. Academic self-reports, rule-eligible credits and study checkpoints stay separate. Everything you change in this tutorial is temporary.',
  },
  {
    id: 'omscs-plan', chapter: 'omscs', kind: 'action', route: 'omscs',
    targets: ['omscs-semester-plan'],
    title: 'Save a proposed semester route',
    body: 'Use Start semester and Start year, then Save semester proposal. Regular terms are the default; summer is optional and not assumed light. Entered course terms are preserved when the route changes. A proposal does not reserve a seat or establish your real six-year deadline.',
    check: ({ state }) => Boolean(state.omscsPlan),
  },
  {
    id: 'omscs-guide', chapter: 'omscs', kind: 'action', route: 'omscs',
    targets: ['omscs-course-select'],
    title: 'Inspect the actual GPU preparation cost',
    body: 'Choose CS 7295 in Explore a course. Its guide separates syllabus topics, C/C++ and architecture preparation, tools and a dated assessment snapshot. Simulator/compiler work is part of the course; this is not just running PyTorch on a GPU. It is one deliberate elective choice, not a universal requirement.',
    checkUi: root => root.querySelector<HTMLSelectElement>('[data-tour="omscs-course-select"]')?.value === 'cs7295',
  },
  {
    id: 'omscs-entry', chapter: 'omscs', kind: 'action', route: 'omscs',
    targets: ['omscs-record-cs7637'],
    title: 'Try a fictional course self-report',
    body: 'Open Record course: CS 7637, choose Use fictional tutorial entry and save. This records a completed B-grade example only in practice. It does not mark KBAI learning as mastered, complete a checkpoint or grant Atlas credit. Real academic entries always require your explicit confirmation.',
    check: ({ state }) => state.omscsPlan?.courses.some(row => row.id === 'cs7637' && row.status === 'completed' && row.grade === 'B') === true,
  },
  {
    id: 'omscs-sources', chapter: 'omscs', kind: 'action',
    route: 'practice/omscs/omscs-cs7650-retrieval', targets: ['pack-unit-sources'],
    title: 'Check the source and independent-practice boundary',
    body: 'Expand Reviewed sources for this lesson. Dated samples are not future assessment guarantees, and class-specific assistance rules differ. The guide provides original independent practice, not assessed solutions. Related missions offer transfer opportunities, never automatic equivalent completion.',
    checkUi: root => root.querySelector<HTMLDetailsElement>('[data-tour="pack-unit-sources"]')?.open === true,
  },
  {
    id: 'omscs-finish', chapter: 'omscs', kind: 'explain', route: 'omscs',
    targets: ['omscs-credit-summary'],
    title: 'Keep academic credit separate from learning evidence',
    body: 'Rule-eligible totals depend on entered grades and the selected allocation, not an official transcript or full GPA. A finished course, a study attempt and an independently defended system are different evidence. Exit to discard the fictional route/grade and return to your unchanged real workspace.',
  },
];
