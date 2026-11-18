import type { PackPhase, PackUnitOutline, RoadmapPackOutline } from '../roadmapPacks/types';
import { omscsCourses, omscsCourseUnit, omscsRouteCourses } from './courses';
import { omscsReviewedAt, omscsSources } from './sources';

const phases: PackPhase[] = [
  { id: 'omscs-program', title: '00 / Establish your route', summary: 'Check the degree contract, grade/time assumptions and actual entry readiness.' },
  ...omscsRouteCourses.map(course => ({
    id: `omscs-${course.id}`, title: `Semester ${course.order} / ${course.code}`,
    summary: `${course.title}. Proposed learning order, not a guaranteed university offering.`,
  })),
  { id: 'omscs-capstone', title: '08 / Defend the combined system', summary: 'Transfer academic foundations into one original, bounded AI-systems artifact.' },
  { id: 'omscs-foundations', title: 'Foundation / prior-study review', summary: 'Three complete course guides. No prior completion, credit or term is assumed.' },
  { id: 'omscs-alternatives', title: 'Reference / choices and integrity', summary: 'Conditional alternatives and independent-study boundaries, not extra graduation gates.' },
];

const program: PackUnitOutline[] = [
  { id: 'omscs-route', sourceId: 'GJ-00.1', title: 'A degree route is not a degree audit', phaseId: 'omscs-program', role: 'checkpoint',
    pages: [], minutes: 30, exerciseCount: 2,
    summary: 'Inspect the selected ten-course, thirty-credit allocation and identify the assumptions that official advising must confirm.',
    action: 'Create a private slot map separating nine core, six specialization-elective and fifteen free-elective credits.',
    concepts: ['Degree requirements', 'Course identity', 'Grade thresholds', 'Credit age', 'Source versions'],
    criteria: ['Allocate each of the ten selected courses exactly once and explain the excess-core elective exception.', 'List actual unknown grades, GPA, time window and offering assumptions without inventing their values.'],
    recovery: 'Start from the official degree and specialization pages, not an old course-icon or an assumed completion.',
    sourceIds: ['P01', 'P02', 'P03', 'P05', 'P06', 'P08'] },
  { id: 'omscs-readiness', sourceId: 'GJ-00.2', title: 'Prepare only the missing foundations', phaseId: 'omscs-program', role: 'checkpoint',
    pages: [], minutes: 45, exerciseCount: 2,
    summary: 'Use small Python, mathematics, algorithms and C/Linux diagnostics to choose a realistic next study block.',
    action: 'Attempt a bounded readiness exercise for the next course and identify a specific gap or supported strength.',
    concepts: ['Python', 'Linear algebra', 'Probability', 'Algorithms', 'C/C++ and Linux', 'Workload'],
    criteria: ['Record an actual diagnostic attempt and explain the prerequisite it probes.', 'Choose a small repair/retry and distinguish readiness evidence from having read a guide.'],
    recovery: 'Reduce the diagnostic to one failing shape, pointer, probability or recurrence question.',
    sourceIds: ['C01', 'C02', 'C04', 'C05', 'C06', 'C07'] },
];

export const omscsUnits: PackUnitOutline[] = [
  ...program,
  ...omscsRouteCourses.flatMap(course => course.modules.map((module, index) => ({
    id: omscsCourseUnit(course, module), sourceId: `GJ-${course.order}.${index + 1}`,
    title: `${course.code} / ${module.title}`, phaseId: `omscs-${course.id}`,
    role: 'checkpoint' as const, pages: [], minutes: index === 2 ? 60 : 45, exerciseCount: 2,
    summary: module.topics.join(' / '), action: module.task, concepts: module.topics,
    criteria: [module.check, module.transferCheck],
    recovery: 'Return to one small original example, explain the invariant or evidence boundary, and retry with a changed condition.',
    sourceIds: course.sourceIds,
  }))),
  { id: 'omscs-defense', sourceId: 'GJ-08.1', title: 'Defend a complete AI-systems design', phaseId: 'omscs-capstone', role: 'checkpoint',
    pages: [], minutes: 60, exerciseCount: 2,
    summary: 'Connect model evaluation, resources, distributed failure and permission boundaries without claiming academic or production authority.',
    action: 'Defend one original read-only evidence assistant using public or invented documents and a credible non-LLM baseline.',
    concepts: ['AI architecture', 'Evaluation', 'Concurrency', 'Distributed recovery', 'GPU budgets', 'Authority boundaries'],
    criteria: ['Trace request, data, state and control paths with an explicit baseline, failure and resource budget.', 'Demonstrate a changed-case retry and explain limitations, recovery and what was not executed.'],
    recovery: 'Remove the model or deployment layer until the smallest deterministic path is reproducible.',
    sourceIds: ['C01', 'C02', 'C03', 'C05', 'C06', 'C07', 'T01', 'T02', 'T03'] },
  ...omscsCourses.filter(course => course.order === null).map(course => ({
    id: omscsCourseUnit(course), sourceId: `GJ-REF-${course.code.slice(3)}`, title: `${course.code} / ${course.title}`,
    phaseId: 'omscs-foundations', role: 'reference' as const, pages: [], minutes: 30, exerciseCount: 2,
    summary: course.overview, action: course.modules[0].task, concepts: course.modules[0].topics,
    criteria: [course.modules[0].check, course.modules[0].transferCheck],
    recovery: 'Review one original example and record only the understanding or academic status you can actually support.',
    sourceIds: course.sourceIds,
  })),
  { id: 'omscs-cloud-route', sourceId: 'GJ-ALT-01', title: 'Compare the cloud-infrastructure alternative', phaseId: 'omscs-alternatives', role: 'practice',
    pages: [], minutes: 30, exerciseCount: 2,
    summary: 'Replace DC/GPU with AOS/SDCC only deliberately, preserving the degree count and checking preparation and mandatory meeting constraints.',
    action: 'Compare the default route with a cloud-infrastructure-first variant and defend the opportunity cost.',
    concepts: ['AOS', 'SDCC', 'Synchronous attendance', 'Prerequisite preparation', 'Opportunity cost'],
    criteria: ['Keep ten courses and thirty credits without quietly adding both alternatives.', 'Identify AOS readiness, the SDCC entry/meeting conditions and unconfirmed future delivery.'],
    recovery: 'Compare one actual desired capability and one binding constraint before collecting more course names.',
    sourceIds: ['P01', 'P03', 'C08', 'C09', 'C10', 'C11', 'C12', 'C13', 'C24', 'S08', 'S09'] },
  { id: 'omscs-integrity', sourceId: 'GJ-REF-02', title: 'Protect independent work and private records', phaseId: 'omscs-alternatives', role: 'reference',
    pages: [], minutes: 20, exerciseCount: 2,
    summary: 'Course-specific AI/collaboration policies and private academic self-reports do not become permissions or proof of mastery.',
    action: 'Write a short independent-study contract for source use, assistance, assessment and portfolio publication.',
    concepts: ['Academic integrity', 'AI assistance', 'Private records', 'Original practice', 'Evidence limits'],
    criteria: ['Distinguish public reference, independent practice and assessed coursework without publishing solutions.', 'Check the actual current policy rather than borrowing permission from another course.'],
    recovery: 'Stop using restricted or assessed material and return to an independently authored public-data exercise.',
    sourceIds: ['S01', 'S02', 'S03', 'S08', 'S09', 'T03'] },
];

export const omscsOutline: RoadmapPackOutline = {
  missionId: 'omscs', document: 'GeoJack OMSCS / public-source AI study route',
  title: 'GeoJack OMSCS: semester planning, course guides and independent learning',
  pageCount: 0, sourceKind: 'web-research', reviewedAt: omscsReviewedAt, webSources: omscsSources,
  overview: 'An unofficial Georgia Tech OMSCS AI completion-route template: ten course guides, a seven-semester learning proposal, conditional credit accounting and independent evidence. No enrollment, prior completion or future offering is assumed.',
  sourceNotes: [
    'Reviewed November 19, 2026. Official program requirements and dated sample syllabi are separate from this authored sequence, exercises and criteria.',
    'The route allocates GA/KBAI/ML to core, Game AI/DL to specialization electives and VGD/NLP/GIOS/DC/GPU to free electives. Each course counts once; actual grades, GPA, course age and DegreeWorks applicability require official confirmation.',
    'The seven-course learning sequence has three foundation reference guides, not an assumption that those courses were passed. Use the semester companion to record your own status explicitly.',
    'The updated specialization page and June 2026 worksheet differ from the older general catalog. Excess-core DL is allowed as an elective by the updated rule and explicitly listed by the older catalog.',
    'ML current-page/sample details differ. Newer NLP CPU/free-tier guidance differs from the older page. Assessment snapshots, not future guarantees, are labelled in each guide.',
    'Minutes describe a bounded practice session, never the time to finish a course or semester. Future offerings, seats, registration, grades and academic AI policies must be checked through their actual official sources.',
    'Academic records remain optional browser-local self-reports. They do not award checkpoint credit, Atlas EXP, verified mastery or an official degree outcome. This static app has no connected tutor or registrar.',
    'Original teaching summaries use public sources. No private research report, transcript, paid course body, problem-set solution or original PDF is bundled.',
  ],
  phases, units: omscsUnits,
  exerciseCount: omscsUnits.reduce((sum, unit) => sum + unit.exerciseCount, 0),
};
