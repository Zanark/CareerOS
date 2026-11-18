import type { PackSection, PackUnit, RoadmapPack } from '../roadmapPacks/types';
import { omscsCourses, omscsCourseUnit } from './courses';
import { omscsOutline } from './outline';
import { omscsTeaching } from './teaching';

const section = (heading: string, paragraphs: string[], items: string[] = []): PackSection => ({ heading, paragraphs, items });
const shared = [
  section('One route, three kinds of evidence', [
    'The proposed semester plan is not a registration record. Course status/grades are your own optional academic self-reports. Learning checkpoints require separate explicit evidence and do not certify official academic credit or production mastery.',
    'The default learning route covers seven selected courses. Three foundation courses remain fully browsable references; their academic status is never prefilled. If they are not applicable prior study, schedule them and obtain a complete official audit rather than treating this template as universally sufficient.',
  ]),
  section('Locate, explain, implement, change the conditions', [
    'Begin with the course readiness and source/version notes. Attempt an original small example, explain the mechanism, then change an input or failure condition. A passing test is evidence for its scenario, not an automatically assigned capability level.',
    'Keep assessed work and course solutions private according to actual rules. These exercises are independently authored practice, not assessed answers or permission to use AI assistance in a class that prohibits it.',
  ]),
];

function courseSections(unitId: string): PackSection[] | undefined {
  for (const course of omscsCourses) {
    const module = course.modules.find(item => omscsCourseUnit(course, item) === unitId);
    if (!module) continue;
    const teaching = omscsTeaching[unitId];
    if (!teaching) throw new Error(`Missing GeoJack teaching: ${unitId}`);
    return [
      section('What the course covers and why it matters', [course.overview, course.career], module.topics),
      section('Mechanism and a worked reasoning example', [teaching.model, teaching.example]),
      section('Before enrolling: readiness and tools', [course.boundary], [...course.preparation, ...course.tools.map(tool => `Tool or working method: ${tool}`)]),
      section('Dated syllabus and assessment snapshot', [course.assessment,
        'Use the actual current Canvas/course documentation for deadlines, permitted assistance and assessment. Opening this guide neither enrolls you nor establishes a grade.']),
    ];
  }
  return undefined;
}

const additional: Record<string, { sections: PackSection[]; tasks: [string, string]; checks: [string, string] }> = {
  'omscs-route': {
    sections: [
      section('The exact conditional credit contract', [
        'The proposed allocation is fifteen specialization credits plus fifteen free-elective credits. GA supplies three design-core credits, KBAI and ML six AI-core credits, and Game AI plus DL six specialization-elective credits. VGD, NLP, GIOS, DC and GPU fill the five free-elective slots.',
        'The updated AI page permits core courses beyond the required nine credits to fill electives. The older catalog independently lists DL as an elective. NLP is deliberately assigned once as a free elective here; eligibility in more than one category never means double credit.',
      ]),
      section('What only the official record can establish', [
        'Specialization slots require B or better, free electives C or better and graduation a cumulative GPA of at least 3.0. Course age and the six-year completion policy matter. This app does not know the complete transcript, repeated attempts, institutional deadlines or DegreeWorks applicability.',
        'A completed entry without a grade is reported completion, not rule-eligible credit. A below-threshold grade does not become eligible because the total looks close; discuss reallocation or further study with official advising.',
      ]),
    ],
    tasks: ['Allocate the selected ten courses to the three requirement categories and expose every assumption.', 'Change one specialization grade to C in an invented audit and explain the required review.'],
    checks: ['Each course appears once and the categories total 9 + 6 + 15 credits.', 'Do not claim graduation, erase the course or invent an approved substitution.'],
  },
  'omscs-readiness': {
    sections: [
      section('A bounded entry diagnostic', [
        'Try a small Python array task, conditional-probability calculation, BFS/DP explanation and C pointer/debugging exercise. These are preparation signals, not a prerequisite to finish every other mission.',
        'For a failed check, identify the mechanism and retry a changed example. Choose a short gap-driven repair block rather than collecting certificates or repeating the entire source library.',
      ]),
      section('A realistic semester proposal', [
        'One substantial course per term is the default proposal. The regular-term template omits summers unless you explicitly include them. That does not override the actual six-year window or guarantee any future offering.',
        'The public FAQ allows two letter-grade courses by default in Fall/Spring and one in Summer. Required synchronous work in an alternate course must be checked separately. Do not equate an available course page with a registered seat.',
      ]),
    ],
    tasks: ['Run one entry diagnostic relevant to the next course and preserve the failed attempt if any.', 'Estimate a week with an actual debugging block, an assessment deadline and recovery time.'],
    checks: ['Explain the particular prerequisite and demonstrate a changed-case retry.', 'State the capacity assumptions and the university condition the proposal cannot verify.'],
  },
  'omscs-defense': {
    sections: [
      section('One small system that crosses the boundaries', [
        'Propose a read-only evidence assistant over public or invented documents. Begin with a deterministic or simple statistical baseline. Measure retrieval separately from answer quality, then define process ownership, cancellation, backpressure and recovery.',
        'Keep tool authorization and outcome verification outside a model. Inject duplicate requests or a lost acknowledgement before claiming durable behavior. Optimize a measured bottleneck only after preserving correctness and full timing scope.',
      ]),
      section('Defend without exaggerating the evidence', [
        'Present a vertical request/data/control map, the state owner, a rejected alternative, held-out tests and a failure/recovery trace. A local fixture, educational protocol, model-generated explanation and verified production outcome are different evidence classes.',
        'A portfolio demonstration must be independently authored under its own data/rights constraints, not a public copy of assessed coursework. No paid cloud run or customer record is required.',
      ]),
    ],
    tasks: ['Build and defend one bounded original vertical slice with a non-LLM baseline and a failure trace.', 'Change an access rule, workload or source version and defend the revised architecture.'],
    checks: ['Explain every state/authority boundary and separate executed results from assumptions.', 'Retain the baseline and revise the decision when the changed constraint invalidates it.'],
  },
  'omscs-cloud-route': {
    sections: [
      section('Exchange courses, do not secretly add them', [
        'The default is GIOS, DC and GPU for systems/platform depth. A cloud-infrastructure-first alternative keeps GIOS and replaces DC/GPU with AOS/SDCC, preserving ten courses and thirty credits.',
        'AOS includes virtualization and distributed-system implementation. SDCC covers infrastructure layers with SDN, system software, NFV and applications; its linked older description includes OpenFlow/Mininet, C++ MapReduce and Azure examples.',
      ]),
      section('Check the constraints before selecting a title', [
        'The SDCC page expects A/high-B AOS or equivalent preparation and mandatory weekly ninety-minute synchronous meetings. The faculty description includes instructor consent and A/F assessment. Check the actual future contract; none is silently assumed here.',
        'Other deliberate swaps include SDP for GA, AI for broader classic reasoning, CV for perception or RL for learned sequential decision policies. These have different objectives, not automatic equivalence. RL is not a prerequisite for building a tool-using language application.',
      ]),
    ],
    tasks: ['Compare the default and cloud-focused route for one real desired capability and one binding time/preparation constraint.', 'A candidate wants every alternative but only ten degree slots; produce an explicit exchange and explain what is lost.'],
    checks: ['Keep the chosen credit categories and total unchanged while exposing SDCC conditions.', 'Do not invent equivalence, a future seat, a waived prerequisite or a free extra course.'],
  },
  'omscs-integrity': {
    sections: [
      section('Assistance rules are course-specific', [
        'The reviewed NLP sample prohibits AI help with assignments; the ML sample permits certain disclosed assistance but requires original analysis. The DL sample requires submitted text/code to be the student’s own. AOS has its own disclosed-assistance and oral-understanding checks.',
        'Use the actual current rule for each class. Do not copy restricted problems, private lectures, exam material or another student’s solution into this app or an external tool. A policy from a different course is not permission.',
      ]),
      section('Private records and honest learning', [
        'Course entries stay in the current browser and ordinary private backups. Optional encrypted repository sync is still manual and separately controlled. The app does not upload academic data, authenticate to Georgia Tech or infer degree approval.',
        'Neither a prompt, a timer, a planned term nor a recorded grade automatically establishes independent implementation skill. Keep those claims separate and record only evidence you can actually explain.',
      ]),
    ],
    tasks: ['Classify public reference, independent practice, assessed material and a proposed public portfolio example.', 'Compare two different assistance policies and specify the safe action under each.'],
    checks: ['Do not publish solutions or treat a locally saved record as university verification.', 'Apply the stricter relevant actual course rule and do not invent permission.'],
  },
};

const units: PackUnit[] = omscsOutline.units.map(outline => {
  const course = omscsCourses.find(item => item.modules.some(module => omscsCourseUnit(item, module) === outline.id));
  const module = course?.modules.find(item => omscsCourseUnit(course, item) === outline.id);
  const extra = additional[outline.id];
  const sections = courseSections(outline.id) ?? extra?.sections;
  if (!sections) throw new Error(`Missing GeoJack unit content: ${outline.id}`);
  const tasks = module ? [module.task, module.transfer] : extra.tasks;
  const checks = module ? [module.check, module.transferCheck] : extra.checks;
  return {
    ...outline, sections,
    exercises: tasks.map((task, index) => ({
      title: index === 0 ? 'Original attempt / explain the mechanism' : 'Changed conditions / transfer',
      level: index === 0 ? 'Independent practice' : 'Transfer', task, check: checks[index],
    })),
  };
});

const pack: RoadmapPack = { ...omscsOutline, units, commonSections: shared };
export default pack;
