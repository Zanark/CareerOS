import data from './catalog-data.json';
import { omscsCourses } from '../courses';

export interface PathCourse {
  id: string;
  code: string;
  title: string;
  subject: string;
  url: string;
  foundational: boolean;
  credits: number;
}

export const pathCourses: readonly PathCourse[] = data;
const coursesById = new Map(pathCourses.map(course => [course.id, course]));
export function pathCourse(id: string): PathCourse {
  const found = coursesById.get(id);
  if (!found) throw new Error(`Unknown OMSCS planning course: ${id}`);
  return found;
}
export function isPathCourse(id: string): boolean {
  return coursesById.has(id);
}
export function outsideCsCse(id: string): boolean {
  return !['CS', 'CSE'].includes(pathCourse(id).subject);
}

const groups: ReadonlyArray<readonly [string, readonly string[]]> = [
  ['AI / language / robotics', ['cs6476', 'cs6601', 'cs7632', 'cs7637', 'cs7638', 'cs7639', 'cs7641', 'cs7642', 'cs7643', 'cs7646', 'cs7650', 'cse6250']],
  ['Systems / architecture / delivery', ['cs6200', 'cs6210', 'cs6211', 'cs6250', 'cs6290', 'cs6291', 'cs6300', 'cs6310', 'cs6340', 'cs6400', 'cs6422', 'cs6515', 'cs6675', 'cs7210', 'cs7240', 'cs7280', 'cs7295', 'cs8803-o08', 'cs8803-o25', 'cse6220']],
  ['Human-centered / cognition / health', ['cs6435', 'cs6440', 'cs6460', 'cs6603', 'cs6750', 'cs6795', 'cs7470', 'cs7711']],
  ['Graphics / games / simulation', ['cs6457', 'cs6475', 'cs6491', 'cs7496', 'cs8803-o27', 'cse6742']],
  ['Data / statistics / analytics', ['cse6242', 'isye6402', 'isye6414', 'isye6420', 'isye6501', 'isye6525', 'isye6644', 'isye6669']],
  ['Security / privacy / policy', ['cs6035', 'cs6238', 'cs6260', 'cs6261', 'cs6262', 'cs6263', 'cs6264', 'cs6265', 'cs6271', 'cs6747', 'cs8803-o34', 'ece8843', 'inta6450', 'pubp6725', 'pubp8823']],
  ['Quantum / emerging computing', ['cs7400', 'cs8803-o20']],
  ['Research / society / business', ['cs6150', 'cs8803-o15', 'cs8803-o17', 'cs8803-o24', 'cs8803-oro', 'mgt6311', 'mgt8813']],
];
export const pathAreas = groups.map(([title]) => title);
export function pathArea(id: string): string {
  const group = groups.find(([, ids]) => ids.includes(id));
  if (!group) throw new Error(`Missing editorial catalogue group for ${id}.`);
  return group[0];
}

const extraDetails: Record<string, { overview: string; preparation: string; tools: string }> = {
  cs6300: { overview: 'Software process, design, implementation, testing and team delivery rather than algorithm/proof depth.', preparation: 'Comfort with Java and software development; plan for project and team coordination.', tools: 'Java, Git and the current course project tooling; verify the dated Android/UML examples.' },
  cs6601: { overview: 'A broad AI route through search, decision-making, uncertainty and learning.', preparation: 'Python, algorithms and mathematical reasoning; an introductory title is not a beginner-programming guarantee.', tools: 'Python and independent algorithmic implementation; consult current assessed-work rules.' },
  cs6476: { overview: 'Image processing, geometry, features, motion and visual reasoning.', preparation: 'Python, linear algebra and comfort with numerical/image data.', tools: 'Python/OpenCV and numerical experimentation; not automatically a modern multimodal-model course.' },
  cs6440: { overview: 'Healthcare computing, interoperability, clinical data standards and an applied practicum.', preparation: 'Modern programming proficiency; no prior health-informatics background assumed by the page.', tools: 'Java, Python, TypeScript/React, Docker, FHIR/SMART on FHIR and OMOP/OHDSI examples.' },
  cs6460: { overview: 'Open-ended educational-technology research or implementation with a substantial project and paper.', preparation: 'Significant reading/writing, participation and individual or team project ownership.', tools: 'Research methods, prototyping and project-specific tools; not a lecture-only coding course.' },
  cs6603: { overview: 'Data misuse, bias, fairness, statistical reasoning and computing-professional responsibilities.', preparation: 'Python/Jupyter and supported critical argument; the public page also lists a social-media task requirement.', tools: 'Python, notebooks, fairness analysis, written critiques and policy/assistance checks.' },
  cs6750: { overview: 'Needfinding, interaction design, prototyping, evaluation and iterative user-centered systems.', preparation: 'Read, evaluate and revise designs; coding depth is not the central learning outcome.', tools: 'User research and prototyping methods; verify current proctoring/device constraints.' },
  cs6795: { overview: 'Models, debates and methods connecting mind, intelligence and computation.', preparation: 'Scholarly reading, argument, modeling and a computational proof of concept.', tools: 'Cognitive models, interactive modeling and project-specific implementation; not a substitute for ML/DL experiments.' },
  cs6210: { overview: 'A deeper operating-systems/platform route before specialized cloud systems work.', preparation: 'Strong operating-systems and systems-programming readiness.', tools: 'The reviewed sample includes KVM scheduling, barriers, gRPC and MapReduce; future setup may differ.' },
  cs6211: { overview: 'Hands-on cloud systems projects with substantial preparation and live attendance constraints.', preparation: 'A/high-B AOS-level preparation or equivalent/consent; mandatory weekly90-minute live meetings are listed.', tools: 'Reviewed examples include C++, OpenFlow/Mininet and cloud infrastructure; older A/F grading needs confirmation.' },
};

export function pathCourseDetails(id: string) {
  const original = omscsCourses.find(course => course.id === id);
  if (original) return { overview: original.overview, preparation: original.preparation.join(' / '), tools: original.tools.join(' / '), reviewedOverview: true };
  const extra = extraDetails[id];
  if (extra) return { ...extra, reviewedOverview: true };
  return {
    overview: 'Included in the reviewed current regular-course catalogue. This explorer has not reviewed its complete syllabus or assessed workload.',
    preparation: 'Use the official course page to check current prerequisites, syllabus, assessments, assistance policy and equipment.',
    tools: 'No unreviewed language, toolchain, hardware access or workload estimate is asserted.',
    reviewedOverview: false,
  };
}
