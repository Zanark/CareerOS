import type { PriorCourse } from './model';

export const requirementsReviewedAt = '2026-11-20';
export const hardCoursePrerequisites = [{ before: 'cs6210', after: 'cs6211' }] as const;
export const entryConfirmations = [
  { id: 'sdcc-equivalent', courseId: 'cs6211', label: 'I have an approved equivalent to CS 6210 or instructor consent for CS 6211.' },
  { id: 'sdcc-high-b', courseId: 'cs6211', label: 'My recorded CS 6210 B has been confirmed as the required high B for CS 6211.' },
  { id: 'formal-ml', courseId: 'cs7643', label: 'I already completed other formal introductory ML coursework equivalent to CS 7641, not self-study.' },
  { id: 'database-background', courseId: 'cs6422', label: 'I completed equivalent algorithms and computer-systems coursework and checked my C++ / systems readiness.' },
  { id: 'health-data-background', courseId: 'cse6250', label: 'I checked the graduate-section entry rule and my ML, programming, ETL, statistics and data background.' },
] as const;
export type EntryConfirmationId = typeof entryConfirmations[number]['id'];
export type EntryConfirmations = Partial<Record<EntryConfirmationId, boolean>>;
export interface CourseEntryAssessment {
  kind: 'prerequisite' | 'background' | 'advice';
  status: 'check' | 'conditional' | 'reported' | 'advice';
  label: string;
  detail: string;
  warning?: string;
  additionalSource?: { title: string; url: string };
}

const advice: Record<string, { label: string; detail: string }> = {
  cs6210: { label: 'OS background expected', detail: 'An undergraduate OS course or industry experience is expected. GIOS is one preparation route, not a mandatory named prerequisite.' },
  cs7210: { label: 'Systems background', detail: 'The current page explicitly says no prerequisites are enforced. Graduate-level systems or networking knowledge is still expected; GIOS, AOS and Computer Networks are examples, not mandatory course locks.' },
  cs7295: { label: 'Recommended preparation', detail: 'OS, architecture, parallel-computing and software-analysis courses are listed as advantageous or beneficial, not mandatory prior OMSCS courses.' },
  cs6310: { label: 'SE / industry background', detail: 'Prior undergraduate software engineering, SDP or significant industrial software-development experience can provide preparation. Do not treat SDP as the only permitted route. Java and object-oriented competence are expected.' },
  cs7632: { label: 'AI recommended', detail: 'CS 6601 is strongly recommended before Game AI, not stated as a hard required course on the public page.' },
  cs7637: { label: 'AI background optional', detail: 'An introductory AI course is recommended but explicitly not required. Programming readiness is still important.' },
};

export function courseEntryAssessment(id: string, completed: readonly PriorCourse[], earlierPlanned: readonly string[] = [], checks: EntryConfirmations = {}): CourseEntryAssessment | undefined {
  if (id === 'cs6211') {
    const aos = completed.find(row => row.id === 'cs6210');
    const reported = checks['sdcc-equivalent'] || aos?.grade === 'A' || aos?.grade === 'B' && checks['sdcc-high-b'];
    const conditional = !reported && earlierPlanned.includes('cs6210');
    return {
      kind: 'prerequisite', status: reported ? 'reported' : conditional ? 'conditional' : 'check',
      label: reported ? 'Prerequisite self-reported' : conditional ? 'After CS 6210 / grade condition' : 'Requires CS 6210 / approval',
      detail: 'The linked faculty syllabus names prior OS study or instructor consent. The current OMSCS page expects CS 6210 with A or high B, or equivalent study elsewhere. A plain B or unknown grade does not establish a high B. Weekly 90-minute live meetings are mandatory. The linked sample is dated; confirm the current section with the instructor.',
      warning: reported ? undefined : conditional
        ? 'CS 6211 is conditional on completing earlier CS 6210 with A / confirmed high B, or an approved equivalent.'
        : 'CS 6211 needs prior CS 6210 with A / confirmed high B, or an approved equivalent / instructor consent. Add the prerequisite or review entry confirmations.',
      additionalSource: { title: 'Linked faculty prerequisites / sample syllabus', url: 'https://faculty.cc.gatech.edu/~rama/CS6211-External/' },
    };
  }
  if (id === 'cs7643') {
    const reported = checks['formal-ml'] || completed.some(row => row.id === 'cs7641' && row.grade !== 'D' && row.grade !== 'F');
    const conditional = !reported && earlierPlanned.includes('cs7641');
    return {
      kind: 'background', status: reported ? 'reported' : conditional ? 'conditional' : 'check',
      label: reported ? 'Formal ML self-reported' : conditional ? 'Formal ML first' : 'Formal ML background needed',
      detail: 'The public page says this should not be your first ML class and self-study does not count. Formal introductory ML equivalent to CS 7641 is expected, alongside strong mathematics and Python. This is not evidence of a registrar-enforced CS 7641-only prerequisite.',
      warning: reported || conditional ? undefined
        : 'CS 7643 expects prior formal ML coursework; self-study does not count. Confirm equivalent study or place CS 7641 earlier.',
    };
  }
  if (id === 'cs6422') {
    const reported = checks['database-background'];
    return {
      kind: 'background', status: reported ? 'reported' : 'check',
      label: reported ? 'Background self-reported' : 'Algorithms / systems required',
      detail: 'The OMSCS and linked faculty pages require foundational algorithms/data-structures and computer-systems coursework or equivalent preparation. Systems programming is necessary; C++ readiness matters. OS and introductory databases are recommended. This does not establish a mandatory CS 6400 or GIOS chain.',
      warning: reported ? undefined : 'CS 6422: review required algorithms / computer-systems background and C++ / systems readiness.',
      additionalSource: { title: 'OMSCS faculty syllabus', url: 'https://faculty.cc.gatech.edu/~jarulraj/courses/6422-online/' },
    };
  }
  if (id === 'cse6250') {
    const reported = checks['health-data-background'];
    return {
      kind: 'background', status: reported ? 'reported' : 'check',
      label: reported ? 'Graduate entry check reported' : 'Graduate entry rule check',
      detail: 'Review ML, programming, ETL, statistics and data background. The OMSCS overview lists prior statistics grades and data courses, while the linked Fall 2026 faculty page places those formal requirements under an undergraduate cross-listing and allows learned equivalent background for its graduate cross-listing. Confirm the current graduate-section rule; do not add campus-only undergraduate classes as new OMSCS degree choices.',
      warning: reported ? undefined : 'CSE 6250: public pages differ in how they present formal prerequisites. Confirm the graduate-section rule and expected background.',
      additionalSource: { title: 'Linked Fall 2026 graduate / undergraduate distinctions', url: 'https://jimengsun.org/teaching/cse6250/fall2026/' },
    };
  }
  return advice[id] ? { ...advice[id], kind: 'advice', status: 'advice' } : undefined;
}

export function hardPrerequisiteProblems(ids: readonly string[], completed: readonly PriorCourse[], checks: EntryConfirmations = {}): string[] {
  return ids.flatMap(id => {
    const result = courseEntryAssessment(id, completed, ids.filter(other => other !== id), checks);
    if (result?.kind !== 'prerequisite' || result.status !== 'check') return [];
    if (!result.warning) throw new Error(`Missing prerequisite explanation for ${id}.`);
    return [result.warning];
  });
}

export function prerequisiteNeedsEarlierTerm(before: string, after: string, completed: readonly PriorCourse[], checks: EntryConfirmations): boolean {
  return hardCoursePrerequisites.some(edge => edge.before === before && edge.after === after)
    && courseEntryAssessment(after, completed, [], checks)?.status !== 'reported';
}
