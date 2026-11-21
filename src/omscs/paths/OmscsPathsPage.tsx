import { useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowRight, BookOpen, Check } from 'lucide-react';
import { Badge, ContextHelp, ExternalLink, PageHeading } from '../../components';
import { omscsTermLabel } from '../../domain/omscs/model';
import { omscsCourses } from '../../domain/omscs/courses';
import { getLatestMission } from '../../domain/catalog';
import { pathArea, pathAreas, pathCourse, pathCourseDetails, pathCourses, outsideCsCse } from '../../domain/omscs/paths/catalog';
import { careerDirections, courseCareerFit } from '../../domain/omscs/paths/careerFit';
import type { CareerDirection, CourseFitTier } from '../../domain/omscs/paths/careerFit';
import {
  budgetCompleted, courseShortlist, defaultPathSelection, electiveChoices, enumerateSpecializationPaths, firstTermCourseOrder,
  evaluateDegree, pathCalendarWarnings, pathPresets, pathProfileSchema, proposedPathSemesters,
  remainingFreeCombinations, returnGap, reusedInSpecialization, specializationGradeConflicts,
  specializationIds,
} from '../../domain/omscs/paths/model';
import type { PathProfile, SpecializationSelection } from '../../domain/omscs/paths/model';
import { courseEntryAssessment, entryConfirmations, hardPrerequisiteProblems, requirementsReviewedAt } from '../../domain/omscs/paths/requirements';
import type { EntryConfirmations } from '../../domain/omscs/paths/requirements';
import { pathsReviewedAt, pathRules, pathSources } from '../../domain/omscs/paths/rules';
import type { PathRuleId } from '../../domain/omscs/paths/rules';
import { missionAccentStyle } from '../../missionVisuals';
import { readPlanningContext } from './planningContext';
import type { OmscsPathsProps } from './OmscsPathsLoader';
import PlanningBasisEditor from './PlanningBasisEditor';
import { CourseEntryInfo } from '../CourseEntryInfo';
import { recommendedAiSelection } from '../../domain/omscs/recommendations';
import './paths.css';

function CourseName({ id }: { id: string }) {
  const course = pathCourse(id);
  return <>{course.code} / {course.title}</>;
}
function RoleSelect({ label, value, options, completed, onChange, tour }: {
  label: string; value: string; options: readonly string[]; completed: ReadonlySet<string>; onChange: (value: string) => void; tour?: string;
}) {
  return <label>{label}<select data-tour={tour} aria-label={label} value={value} onChange={event => onChange(event.currentTarget.value)}>
    {!options.includes(value) && <option value={value}>{pathCourse(value).code} / not allowed in this role</option>}
    {options.map(id => <option value={id} key={id}>{pathCourse(id).code} / {pathCourse(id).title}{completed.has(id) ? ' / reported complete' : ''}</option>)}
  </select><span className="path-current-title">{pathCourse(value).title}</span></label>;
}
function CourseDetail({ id, direction, profile, earlierPlanned, checks }: {
  id: string; direction: CareerDirection; profile: PathProfile; earlierPlanned: readonly string[]; checks: EntryConfirmations;
}) {
  const course = pathCourse(id), detail = pathCourseDetails(id), guide = omscsCourses.find(item => item.id === id);
  const fit = courseCareerFit(id, direction);
  return <div className="path-career-fit context-actions" data-path-fit={id}>
    <Badge>{fit.tier}</Badge>
    <ContextHelp title={`${course.code} course details`}>
      <p>{fit.benefit}</p><p><strong>Tradeoff:</strong> {fit.tradeoff}</p>
      <p><strong>Preparation:</strong> {detail.preparation}</p>
      <details><summary>Tools and review scope</summary><p>{detail.tools}</p>
        <p>{detail.reviewedOverview ? 'Public sources reviewed; future syllabus and workload may differ.'
          : 'Public overview reviewed; complete course content has not been reviewed.'}</p></details>
      <div className="path-roadmap-links">{fit.roadmaps.map(missionId =>
        <a key={missionId} href={`#/mission/${missionId}`} target="_blank" rel="noopener noreferrer">{getLatestMission(missionId).operation}</a>)}</div>
      <div className="button-row"><ExternalLink href={course.url}>Official course page</ExternalLink>
        {guide && <a className="text-link" href={`#/practice/omscs/omscs-${guide.id}-${guide.modules[0].id}`} target="_blank" rel="noopener noreferrer">Study guide<BookOpen size={14} /></a>}</div>
    </ContextHelp><CourseEntryInfo id={id} completed={profile.completed} earlierPlanned={earlierPlanned} checks={checks} />
  </div>;
}
function initialFree(selection: SpecializationSelection, profile: PathProfile, values: readonly string[]) {
  const spec = new Set(specializationIds(selection)), completed = new Set(budgetCompleted(profile).map(row => row.id));
  const slots = Math.max(0, 5 - [...completed].filter(id => !spec.has(id)).length);
  return values.filter(id => !spec.has(id) && !completed.has(id)).slice(0, slots);
}

export default function OmscsPathsPage({ state, practice }: OmscsPathsProps) {
  const context = useMemo(() => readPlanningContext(state, practice), [state.omscsPlan, practice]);
  if (!context.profile) return <section className="panel alert error" role="alert">
    <h1>Review the planning context</h1><p>{context.error}</p>
    <a className="button secondary" href="#/omscs">Return to the academic companion</a>
  </section>;
  return <PathsExplorer key={JSON.stringify(context.profile)} initialProfile={context.profile} source={context.source} />;
}

function PathsExplorer({ initialProfile, source }: { initialProfile: PathProfile; source: string }) {
  const [profile, setProfile] = useState(initialProfile);
  const [basisEdited, setBasisEdited] = useState(false);
  const [direction, setDirection] = useState<CareerDirection>('cloud');
  const [fitFilter, setFitFilter] = useState<CourseFitTier | ''>('');
  const [ruleId, setRuleId] = useState<PathRuleId>('current');
  const [selection, setSelection] = useState<SpecializationSelection>(() => recommendedAiSelection(initialProfile.completed));
  const [free, setFree] = useState(() => initialFree(recommendedAiSelection(initialProfile.completed), initialProfile, pathPresets[0].free));
  const [includeSummer, setIncludeSummer] = useState(false);
  const [regularLoad, setRegularLoad] = useState<1 | 2>(1);
  const [firstTermCourse, setFirstTermCourse] = useState('');
  const [entryChecks, setEntryChecks] = useState<EntryConfirmations>({});
  const [startYear, setStartYear] = useState(profile.resumeTerm.slice(0, 4));
  const [startSeason, setStartSeason] = useState(profile.resumeTerm.split('-')[1]);
  const [calendarError, setCalendarError] = useState('');
  const [pathQuery, setPathQuery] = useState('');
  const [reuse, setReuse] = useState('most');
  const [pathPage, setPathPage] = useState(0);
  const [freeQuery, setFreeQuery] = useState('');
  const [area, setArea] = useState('');
  const [freePage, setFreePage] = useState(0);
  const notes = useRef<HTMLTextAreaElement>(null);
  const rules = pathRules[ruleId];
  const completed = useMemo(() => budgetCompleted(profile), [profile]);
  const completedIds = new Set(completed.map(row => row.id));
  const evaluation = useMemo(() => evaluateDegree(ruleId, selection, free, profile), [ruleId, selection, free, profile]);
  const firstTermError = firstTermCourse && !evaluation.newCourseIds.includes(firstTermCourse)
    ? 'Your chosen first-term subject is no longer a selected new subject. Choose another or reset to the suggestion; no calendar is proposed until this is resolved.' : '';
  const entryProblems = hardPrerequisiteProblems(evaluation.newCourseIds, profile.completed, entryChecks);
  const firstEntry = firstTermCourse ? courseEntryAssessment(firstTermCourse, profile.completed, [], entryChecks) : undefined;
  const firstEntryError = firstEntry?.kind === 'prerequisite' && firstEntry.status === 'check' ? firstEntry.warning : '';
  const calendarBlocked = evaluation.errors.length > 0 || Boolean(firstTermError || firstEntryError) || entryProblems.length > 0;
  const specIds = specializationIds(selection), specSet = new Set(specIds);
  const paths = useMemo(() => enumerateSpecializationPaths(ruleId), [ruleId]);
  const gradeCompatible = useMemo(() => paths.filter(path => !specializationGradeConflicts(profile, path.courseIds).length), [paths, profile]);
  const mostReuse = Math.max(0, ...gradeCompatible.map(path => reusedInSpecialization(profile, path)));
  const efficient = gradeCompatible.filter(path => reusedInSpecialization(profile, path) === mostReuse);
  const query = pathQuery.trim().toLowerCase();
  const filteredPaths = gradeCompatible.filter(path => {
    const reused = reusedInSpecialization(profile, path);
    return (reuse === 'all' || reused === (reuse === 'most' ? mostReuse : Number(reuse))) &&
      (!query || path.courseIds.some(id => `${pathCourse(id).code} ${pathCourse(id).title}`.toLowerCase().includes(query)));
  });
  const shownPaths = filteredPaths.slice(pathPage * 12, pathPage * 12 + 12);
  const freeCandidates = pathCourses.filter(course =>
    (!freeQuery.trim() || `${course.code} ${course.title}`.toLowerCase().includes(freeQuery.trim().toLowerCase())) &&
    (!area || pathArea(course.id) === area) &&
    (!fitFilter || courseCareerFit(course.id, direction).tier === fitFilter));
  const shownFree = freeCandidates.slice(freePage * 12, freePage * 12 + 12);
  const orderedNewSubjects = useMemo(() => calendarBlocked ? []
    : firstTermCourseOrder(evaluation.newCourseIds, firstTermCourse), [evaluation, firstTermCourse, calendarBlocked]);
  const semesters = useMemo(() => proposedPathSemesters(
    orderedNewSubjects, profile.resumeTerm, includeSummer, regularLoad, profile.completed, entryChecks,
  ), [orderedNewSubjects, profile, includeSummer, regularLoad, entryChecks]);
  const firstSubject = orderedNewSubjects[0] ?? (firstTermCourse && evaluation.newCourseIds.includes(firstTermCourse) ? firstTermCourse : undefined);
  const calendarWarnings = pathCalendarWarnings(profile, semesters, entryChecks);
  const gap = returnGap(profile);
  const unknownGrades = completed.filter(row => row.grade === 'unrecorded').length;
  const sourceConflict = ruleId === 'current' && evaluateDegree('conservative', selection, free, profile).errors.length > 0;
  const possibilities = remainingFreeCombinations(evaluation);
  const shortlist = courseShortlist(selection, free, profile);
  const newShortlist = shortlist.filter(row => !row.reportedComplete);
  const notesText = [
    'Gold Circuit / Georgia Tech OMSCS - subjects for discussion',
    `Career emphasis: ${careerDirections.find(item => item.id === direction)?.title}`,
    `Proposed first term: ${omscsTermLabel(profile.resumeTerm)} / ${firstSubject ? `${pathCourse(firstSubject).code} - ${pathCourse(firstSubject).title}` : 'resolve the draft choices first'}`,
    evaluation.completeSubjectPlan && !calendarBlocked ? 'Ten conditional subject slots filled; grades/catalog/offerings still need confirmation.'
      : 'INCOMPLETE OR CONFLICTING DRAFT - resolve the warnings before treating this as a full plan.',
    '', 'NEW SUBJECTS TO DISCUSS:',
    ...newShortlist.map(row => `${pathCourse(row.id).code} - ${pathCourse(row.id).title} [${row.role}]`),
    '', 'ALREADY REPORTED / NOT NEW ENROLLMENTS:',
    ...shortlist.filter(row => row.reportedComplete).map(row => `${pathCourse(row.id).code} - ${pathCourse(row.id).title} [${row.role}]`),
    '', 'ENTRY / CALENDAR CHECKS:',
    ...[firstTermError, firstEntryError, ...entryProblems, ...calendarWarnings].filter(Boolean),
    '', 'Planning only. No registration, degree approval or learning credit.',
  ].join('\n');
  const applyProfile = (next: PathProfile) => {
    const prior = new Set(budgetCompleted(next).map(row => row.id));
    setProfile(next); setBasisEdited(true);
    setFree(values => values.filter(id => !prior.has(id)));
  };
  const jump = (id: string) => document.getElementById(id)?.scrollIntoView({ block: 'start', behavior: 'instant' });
  const courseDetail = (id: string) => <CourseDetail id={id} direction={direction} profile={profile} checks={entryChecks}
    earlierPlanned={orderedNewSubjects.includes(id) ? orderedNewSubjects.slice(0, orderedNewSubjects.indexOf(id)) : []} />;
  const changeAi = (index: 0 | 1, id: string) => setSelection(value => ({
    ...value, ai: index === 0 ? [id, value.ai[1]] : [value.ai[0], id],
  }));
  const changeElective = (index: 0 | 1, id: string) => setSelection(value => ({
    ...value, electives: index === 0 ? [id, value.electives[1]] : [value.electives[0], id],
  }));
  const firstTermPanel = <section id="paths-first-term" className="panel" data-tour="paths-first-term">
    <div className="context-heading"><h2>Next term / {omscsTermLabel(profile.resumeTerm)}</h2>
      <ContextHelp title="Choosing the first subject" tour="paths-first-subject-help"><p>Choose from your selected new subjects. This changes their order, not the degree choices. The suggestion follows preparation order; confirm prerequisites, the actual offering and a seat before enrolling.</p></ContextHelp>
      <Badge>Enrollment unverified</Badge></div>
    <label>First-term subject<select data-tour="paths-first-term-select" aria-label="First-term subject" value={firstTermCourse} onChange={event => setFirstTermCourse(event.currentTarget.value)}
      disabled={!evaluation.newCourseIds.length && !firstTermCourse}>
      <option value="">Suggested order</option>
      {firstTermError && <option value={firstTermCourse}>{pathCourse(firstTermCourse).code} / no longer a new subject</option>}
      {evaluation.newCourseIds.map(id => <option value={id} key={id}>{pathCourse(id).code} / {pathCourse(id).title}</option>)}
    </select></label>
    {firstTermCourse && <button className="text-button" onClick={() => setFirstTermCourse('')}>Reset first-term suggestion</button>}
    {firstTermError && <p className="alert error" role="alert">{firstTermError}</p>}
    {firstEntryError && <p className="alert error" role="alert">{firstEntryError} It cannot be the first term without prior approval; choose the prerequisite first or confirm an allowed alternative.</p>}
    {evaluation.errors.length > 0 && <p className="attention-text">Resolve the course conflicts to propose a term.</p>}
    {firstSubject && <div className="path-first-subject"><Badge>{firstTermCourse ? 'Your draft choice' : 'Suggested'}</Badge>
      <h3><CourseName id={firstSubject} /></h3>{courseDetail(firstSubject)}
    </div>}
    {!firstSubject && !calendarBlocked && <p>No new subject selected.</p>}
  </section>;

  return <div className="omscs-paths amber" style={missionAccentStyle('omscs')} data-tour="omscs-paths">
    <PageHeading eyebrow="GOLD CIRCUIT / OMSCS" title="Course choices"
      help={<><p>Temporary planning only: this draft does not enroll you or save academic or learning progress.</p>
        <p>Basis: {basisEdited ? 'Edited in this tab' : source}. Specialization needs B or better; free electives C or better. Graduation requires the actual GPA and university audit.</p>
        <p>Sources reviewed {pathsReviewedAt}. Course availability does not guarantee a term or seat.</p><ExternalLink href={pathSources.degree}>Degree rules</ExternalLink></>}>
      <div className="button-row path-heading-actions">
        <button className="button primary" data-tour="paths-begin" onClick={() => jump('paths-shortlist')}>My shortlist<ArrowDown size={15} /></button>
        <a className="text-link" href="#/omscs">Academic entries<ArrowRight size={15} /></a>
      </div>
    </PageHeading>
    <div className="path-draft-status"><Badge>Unsaved draft</Badge><span>Copy before leaving.</span>
      {unknownGrades > 0 && <Badge>{unknownGrades} grades unrecorded</Badge>}</div>
    {evaluation.errors.length > 0 && <section id="paths-conflicts" className="panel alert error" role="alert"><h2>Course conflicts</h2>
      <ul>{evaluation.errors.map(error => <li key={error}>{error}</li>)}</ul></section>}
    {entryProblems.length > 0 && <section className="panel alert error" role="alert"><h2>Entry requirements unresolved</h2>
      <ul>{entryProblems.map(error => <li key={error}>{error}</li>)}</ul>
      <button className="text-button" onClick={() => {
        const element = document.getElementById('paths-entry-checks');
        if (element instanceof HTMLDetailsElement) element.open = true;
        jump('paths-entry-checks');
      }}>Review entry confirmations</button></section>}
    {firstTermPanel}
    {gap.needsCheck && !profile.readmissionConfirmed && <p className="attention-text" role="status">Readmission check / {gap.terms.length} absent terms, including summer. Review Prior courses &amp; return and confirm any existing approval.</p>}
    {calendarWarnings.length > 0 && <ul className="path-warnings">{calendarWarnings.map(warning => <li key={warning}>{warning}</li>)}</ul>}
    <section className="path-metrics" aria-label="Planning course budget" data-tour="paths-budget">
      <div><strong>{evaluation.priorCount}<small> / 10 courses</small></strong><span>Counted in draft / {evaluation.priorCount * 3} credits</span></div>
      <div><strong>{evaluation.remainingCourses}<small> courses</small></strong><span>Remaining / {evaluation.remainingCourses * 3} credits</span></div>
    </section>
    <nav className="button-row path-jumps" aria-label="Path explorer sections">
      {[
        ['paths-history', 'Prior courses'], ['paths-choices', 'AI subjects'], ['paths-free-choices', 'Free electives'],
        ['paths-shortlist', 'Shortlist'], ['paths-semester-calendar', 'Calendar'], ['paths-combinations', 'All combinations'],
      ].map(([id, title]) => <button key={id} className="button secondary" onClick={() => {
        const element = document.getElementById(id);
        if (element instanceof HTMLDetailsElement) element.open = true;
        jump(id);
      }}>{title}</button>)}
    </nav>

    <details id="paths-history" className="panel path-disclosure" data-tour="paths-history"><summary>Prior courses &amp; return <Badge>{profile.completed.length} entered</Badge></summary>
      <PlanningBasisEditor profile={profile} onChange={applyProfile} />
      {profile.completed.length ? <div className="path-history">{profile.completed.map(row => <article key={row.id}>
        <span className="eyebrow">{row.term ? omscsTermLabel(row.term) : 'Term not entered'}</span>
        <h3><CourseName id={row.id} /></h3><p>{row.grade === 'D' || row.grade === 'F' ? 'Completed attempt / not passing credit' : 'Reported complete'} / {row.grade === 'unrecorded' ? 'grade unknown' : `entered grade ${row.grade}`}</p>
        <Badge>{row.grade === 'D' || row.grade === 'F' ? 'Does not reduce the passing-course budget'
          : specSet.has(row.id) ? 'Chosen specialization slot / needs B' : 'Potential free elective / needs C'}</Badge>
        <button className="text-button" aria-label={`Remove ${pathCourse(row.id).code} from draft history`}
          onClick={() => applyProfile({ ...profile, completed: profile.completed.filter(item => item.id !== row.id) })}>Remove from this draft history</button>
      </article>)}</div> : <p>No prior courses entered on this device.</p>}
      <form className="path-calendar-form" onSubmit={event => {
        event.preventDefault();
        const parsed = pathProfileSchema.safeParse({ ...profile, resumeTerm: `${startYear}-${startSeason}` });
        if (!parsed.success) { setCalendarError(parsed.error.issues.map(issue => issue.message).join(' ')); return; }
        applyProfile(parsed.data); setCalendarError('');
      }}>
        <label>Return semester<select value={startSeason} onChange={event => setStartSeason(event.currentTarget.value)}><option value="spring">Spring</option><option value="summer">Summer</option><option value="fall">Fall</option></select></label>
        <label>Return year<input type="number" min={2000} max={2095} required value={startYear} onChange={event => setStartYear(event.currentTarget.value)} /></label>
        <button className="button primary">Apply draft return<Check size={15} /></button>
      </form>
      {calendarError && <p className="alert error" role="alert">{calendarError}</p>}
      <label className="path-return-check"><input type="checkbox" checked={profile.readmissionConfirmed === true}
        onChange={event => applyProfile({ ...profile, readmissionConfirmed: event.currentTarget.checked })} />
        I have confirmed my readmission / return approval</label>
      {profile.readmissionConfirmed && <p className="path-return-confirmed" data-tour="paths-return-confirmed">
        Return confirmed / self-reported.</p>}
      {gap.terms.length > 0 && <div className="path-gap"><h3>{gap.terms.length}-term gap</h3>
        <p>{gap.terms.map(omscsTermLabel).join(' / ')}</p>
        {gap.needsCheck && !profile.readmissionConfirmed && <p>This is {gap.terms.length} consecutive terms, counting summer. Check readmission after three or more; do not apply again if approval is already confirmed.</p>}</div>}
      {profile.programStart && <p>Program start: <strong>{omscsTermLabel(profile.programStart)}</strong></p>}
      <details className="path-course-detail"><summary>Return, foundational grades and credit-age checks</summary>
        <p>Readmission is not guaranteed. The current Registrar page says readmitted students follow the current catalog; keeping an older one requires a separately approved request.</p>
        <p>The general Spring readmission deadline is December 1 in the preceding year; other standings have earlier deadlines. Check the actual current rules, not a calendar promise here.</p>
        <p>The program requires two foundational courses at B or better within the first 12 months. The catalogue marks foundational courses; unknown grades do not verify that requirement.</p>
        <p>The program FAQ describes six-year credit age from the semester earned. Calendar warnings are watchpoints, not an official expiry or extension decision.</p>
        <div className="button-row"><ExternalLink href={pathSources.return}>Readmission policy</ExternalLink>
          <ExternalLink href={pathSources.deadlines}>Current deadlines</ExternalLink><ExternalLink href={pathSources.duration}>Program FAQ</ExternalLink></div>
      </details>
    </details>

    <details id="paths-entry-checks" className="panel path-disclosure" data-tour="paths-entry-checks"><summary>Entry confirmations / tab-only</summary>
      <p>Self-reported checks, not degree credit or university verification.</p>
      {entryConfirmations.filter(field => evaluation.newCourseIds.includes(field.courseId)
        && (field.id !== 'sdcc-high-b' || profile.completed.some(row => row.id === 'cs6210' && row.grade === 'B')))
        .map(field => <label key={field.id} className="path-return-check"><input type="checkbox" checked={entryChecks[field.id] === true}
          onChange={event => {
            const checked = event.currentTarget.checked;
            setEntryChecks(current => ({ ...current, [field.id]: checked }));
          }} />{field.label}</label>)}
      <ContextHelp title="Entry-check coverage">Reviewed {requirementsReviewedAt}. Published course prerequisites, required background and recommendations are different. Only documented cases are modeled; other current syllabi may add requirements. Confirm the current section before registration.</ContextHelp>
    </details>

    <section id="paths-career" className="panel" data-tour="paths-career"><h2>Choose a career emphasis</h2>
      <label>Career direction<select value={direction} onChange={event => {
        const chosen = careerDirections.find(item => item.id === event.currentTarget.value);
        if (chosen) { setDirection(chosen.id); setFreePage(0); }
      }}>{careerDirections.map(item => <option value={item.id} key={item.id}>{item.title}</option>)}</select></label>
      <ContextHelp title="Career fit">
        <p>{careerDirections.find(item => item.id === direction)?.description}</p>
        <p><strong>Direct support:</strong> closest to this emphasis. <strong>Supporting depth:</strong> useful foundations or complementary judgment.
          {' '}<strong>Specialist detour:</strong> choose for a deliberate domain or research interest, not because the course is bad.</p>
        <p>Editorial guidance, not degree eligibility or a university rating. Changing this filter does not change your subjects or saved progress.</p>
      </ContextHelp>
      <details className="path-course-detail"><summary>Try a capability-oriented starting point</summary>
        <p>Preview replaces the course choices in this draft.</p>
        <div className="path-preset-grid">{pathPresets.map(preset => <article className="path-option" key={preset.id}><h3>{preset.title}</h3><p>{preset.why}</p>
          <button className="button secondary" onClick={() => { setSelection(structuredClone(preset.selection)); setFree(initialFree(preset.selection, profile, preset.free)); }}>Preview {preset.title}</button></article>)}</div>
      </details>
    </section>

    <section className="panel" data-tour="paths-rules"><div className="context-heading"><h2>Degree rules</h2>
      <ContextHelp title="AI degree rules"><p>{rules.description}</p>
        <p>The current OMSCS menu and older catalog differ. Confirm which applies to your audit. Only current online choices are offered here.</p>
        <ExternalLink href={pathSources.ai}>OMSCS AI requirements</ExternalLink>{' '}<ExternalLink href={pathSources.catalog}>Catalog comparison</ExternalLink>
      </ContextHelp></div>
      <label>AI rule comparison<select value={ruleId} onChange={event => {
        if (event.currentTarget.value === 'current' || event.currentTarget.value === 'conservative') {
          setRuleId(event.currentTarget.value); setPathPage(0);
        }
      }}>{Object.values(pathRules).map(rule => <option key={rule.id} value={rule.id}>{rule.title}</option>)}</select></label>
      {sourceConflict && <p className="attention-text" role="status">Uses current OMSCS AI rules; differs from the older catalog comparison. Confirm your applicable degree audit.</p>}
    </section>

    <section id="paths-choices" className="path-flow" aria-label="Choose the specialization">
      <h2>AI subjects <Badge>{evaluation.newSpec.length} new / 5 slots</Badge></h2>
      <section className="panel path-step"><span className="eyebrow">AI SLOT 1 / THREE CREDITS</span><h2>Algorithms and design</h2>
        <RoleSelect tour="paths-design-select" label="Algorithms/design course" value={selection.design} options={rules.design} completed={completedIds} onChange={id => setSelection(value => ({ ...value, design: id }))} />
        {courseDetail(selection.design)}
      </section>
      <ArrowDown className="path-flow-arrow" aria-hidden="true" />
      <section className="panel path-step"><span className="eyebrow">AI SLOTS 2-3 / SIX CREDITS</span><h2>Two AI-core courses</h2>
        <div className="path-two"><div><RoleSelect label="First AI-core course" value={selection.ai[0]} options={rules.ai} completed={completedIds} onChange={id => changeAi(0, id)} />{courseDetail(selection.ai[0])}</div>
          <div><RoleSelect label="Second AI-core course" value={selection.ai[1]} options={rules.ai} completed={completedIds} onChange={id => changeAi(1, id)} />{courseDetail(selection.ai[1])}</div></div>
      </section>
      <ArrowDown className="path-flow-arrow" aria-hidden="true" />
      <section className="panel path-step"><span className="eyebrow">AI SLOTS 4-5 / SIX CREDITS</span><h2>Two specialization electives</h2>
        <div className="path-two"><div><RoleSelect label="First specialization elective" value={selection.electives[0]} options={electiveChoices(ruleId, selection)} completed={completedIds} onChange={id => changeElective(0, id)} />{courseDetail(selection.electives[0])}</div>
          <div><RoleSelect label="Second specialization elective" value={selection.electives[1]} options={electiveChoices(ruleId, selection)} completed={completedIds} onChange={id => changeElective(1, id)} />{courseDetail(selection.electives[1])}</div></div>
      </section>
    </section>

    <details id="paths-combinations" className="panel path-all-combinations" data-tour="paths-all-options"><summary>Optional: browse all specialization combinations</summary>
      <h2>See all specialization possibilities</h2>
      <p><strong>{paths.length.toLocaleString()} distinct five-course combinations</strong> / {paths.reduce((sum, path) => sum + path.allocations.length, 0).toLocaleString()} valid role allocations in this source snapshot.</p>
      <p><strong>{efficient.length.toLocaleString()} combinations</strong> reuse the most currently compatible reported courses ({mostReuse}). Unknown grades remain conditional.
        For this basis, that means {5 - mostReuse} additional specialization courses, with the remaining degree slots still to fill.</p>
      <div className="path-filters"><label>Find specialization paths<input type="search" value={pathQuery} placeholder="Course code or name" onChange={event => { setPathQuery(event.currentTarget.value); setPathPage(0); }} /></label>
        <label>Reuse completed courses<select value={reuse} onChange={event => { setReuse(event.currentTarget.value); setPathPage(0); }}>
          <option value="most">Most possible / {mostReuse} reused</option><option value="all">All compatible combinations</option>
          {Array.from({ length: mostReuse + 1 }, (_, count) => <option key={count} value={String(count)}>{count} reused</option>)}</select></label></div>
      <p role="status">{filteredPaths.length.toLocaleString()} matching combinations. Showing {shownPaths.length} on this page, not truncating the underlying possibilities.</p>
      <div className="path-options">{shownPaths.map(path => <article key={path.id} className="path-option">
        <h3>{path.courseIds.map(id => pathCourse(id).code).join(' + ')}</h3>
        <p>{reusedInSpecialization(profile, path)} reported courses reused / {5 - reusedInSpecialization(profile, path)} additional specialization subjects.</p>
        <details><summary>{path.allocations.length} valid slot {path.allocations.length === 1 ? 'mapping' : 'mappings'}</summary>
          {path.allocations.map((mapping, index) => <p key={index}><strong>Design:</strong> {pathCourse(mapping.design).code}; <strong>AI:</strong> {mapping.ai.map(id => pathCourse(id).code).join(' + ')}; <strong>electives:</strong> {mapping.electives.map(id => pathCourse(id).code).join(' + ')}.</p>)}</details>
        <button className="button secondary" onClick={() => setSelection(structuredClone(path.allocations[0]))}>Preview this combination</button>
      </article>)}</div>
      <div className="button-row path-pages"><button className="button secondary" disabled={pathPage === 0} onClick={() => setPathPage(value => value - 1)}>Previous paths</button>
        <span>Page {pathPage + 1} / {Math.max(1, Math.ceil(filteredPaths.length / 12))}</span>
        <button className="button secondary" disabled={(pathPage + 1) * 12 >= filteredPaths.length} onClick={() => setPathPage(value => value + 1)}>More paths</button></div>
      <p className="muted small">One course set may have several valid slot mappings. Counts are not a total of unique ten-course degrees.</p>
    </details>

    <section id="paths-free-choices" className="panel" data-tour="paths-free"><div className="context-heading"><h2>Free electives</h2>
      <Badge>{free.length} / {evaluation.freeSlots} chosen</Badge><Badge>{evaluation.outsideCount} / 2 non-CS/CSE</Badge>
      <ContextHelp title="Free elective budget"><p>{evaluation.priorFree.length} prior courses occupy free slots. The remaining subjects may be any listed OMSCS courses; non-CS/CSE choices are capped at six credits.</p>
        <p>Remove a chosen example before selecting a replacement. {possibilities.toLocaleString()} completions fit the remaining budget and subject cap.</p>
        <p>Only current OMSCS catalogue entries are offered. Semester availability, complete syllabi and equipment still need confirmation.</p>
        <ExternalLink href={pathSources.courses}>Official OMSCS catalogue</ExternalLink>
      </ContextHelp></div>
      {evaluation.priorFree.length > 0 && <p><strong>Prior free-elective budget:</strong> {evaluation.priorFree.map(id => pathCourse(id).code).join(' + ')}.</p>}
      <div className="path-selected"><h3>Additional free electives / {free.length} of {evaluation.freeSlots}</h3>
        {free.length ? free.map(id => <div key={id}><span><CourseName id={id} /></span><button className="text-button" aria-label={`Remove ${pathCourse(id).code} from free electives`} onClick={() => setFree(values => values.filter(value => value !== id))}>Remove</button></div>)
          : <p>No additional free electives selected.</p>}</div>
      <button className="button secondary" disabled={!free.length} onClick={() => setFree([])}>Clear additional free choices</button>
      {evaluation.missingFree > 0 && <p>{evaluation.missingFree} more to choose.</p>}
      <div className="path-filters"><label>Find a free elective<input data-tour="paths-free-query" type="search" placeholder="Course code or title" value={freeQuery} onChange={event => { setFreeQuery(event.currentTarget.value); setFreePage(0); }} /></label>
        <label>Explore a capability area<select value={area} onChange={event => { setArea(event.currentTarget.value); setFreePage(0); }}>
          <option value="">All editorial areas</option>{pathAreas.map(title => <option key={title}>{title}</option>)}</select></label>
        <label>Filter by career fit<select value={fitFilter} onChange={event => {
          const value = event.currentTarget.value;
          if (value === '' || value === 'Direct support' || value === 'Supporting depth' || value === 'Specialist detour') { setFitFilter(value); setFreePage(0); }
        }}><option value="">All fits / keep every option</option>
          {['Direct support', 'Supporting depth', 'Specialist detour'].map(value => <option key={value}>{value}</option>)}</select></label></div>
      <p role="status">{freeCandidates.length} / {pathCourses.length} OMSCS courses</p>
      <div className="path-free-grid">{shownFree.map(course => {
        const checked = free.includes(course.id), counted = specSet.has(course.id) || completedIds.has(course.id);
        const capped = !checked && (free.length >= evaluation.freeSlots || outsideCsCse(course.id) && evaluation.outsideCount >= 2);
        return <article className="path-free-card" key={course.id} data-path-course={course.id}>
          <span className="eyebrow">{course.code} / {course.credits} credits</span><h3>{course.title}</h3>
          <div className="button-row">{course.foundational && <Badge>Foundational</Badge>}{outsideCsCse(course.id) && <Badge>Non-CS/CSE</Badge>}</div>
          <label className="path-course-check"><input type="checkbox" checked={checked} disabled={!checked && (counted || capped)}
            aria-label={`Choose ${course.code} as free elective`} onChange={event => {
              const nextChecked = event.currentTarget.checked;
              setFree(values => nextChecked ? [...values, course.id] : values.filter(id => id !== course.id));
            }} />
            {counted ? 'Already counted' : checked ? 'Chosen' : capped ? 'Remove a choice or check the cap' : 'Choose elective'}</label>
          {courseDetail(course.id)}
        </article>;
      })}</div>
      <div className="button-row path-pages"><button className="button secondary" disabled={freePage === 0} onClick={() => setFreePage(value => value - 1)}>Previous courses</button>
        <span>Page {freePage + 1} / {Math.max(1, Math.ceil(freeCandidates.length / 12))}</span>
        <button className="button secondary" disabled={(freePage + 1) * 12 >= freeCandidates.length} onClick={() => setFreePage(value => value + 1)}>More courses</button></div>
    </section>

    <section id="paths-shortlist" className="panel" data-tour="paths-shortlist"><h2>Shortlist</h2>
      <p><strong>{newShortlist.length} new subjects</strong> / {shortlist.filter(row => row.reportedComplete).length} prior</p>
      {!evaluation.completeSubjectPlan && <p className="alert error">This draft is incomplete or has conflicts. Review the warnings and remaining free-choice count before treating it as a complete subject plan.</p>}
      <ol className="path-shortlist">{newShortlist.map((row, index) => <li key={`${index}-${row.id}`}>
        <h3><CourseName id={row.id} /></h3><Badge>{row.role}</Badge>
        <CourseEntryInfo id={row.id} completed={profile.completed} checks={entryChecks}
          earlierPlanned={orderedNewSubjects.includes(row.id) ? orderedNewSubjects.slice(0, orderedNewSubjects.indexOf(row.id)) : []} />
      </li>)}</ol>
      <details className="path-course-detail"><summary>Plain-text shortlist to select and copy</summary>
        <textarea ref={notes} aria-label="Subject shortlist for review notes" rows={12} readOnly value={notesText} />
        <button className="button secondary" data-tour="paths-shortlist-select" onClick={() => { notes.current?.focus(); notes.current?.select(); }}>Select shortlist text</button>
      </details>
    </section>

    <details id="paths-semester-calendar" className="panel path-disclosure" data-tour="paths-calendar"><summary>Proposed calendar <Badge>{semesters.length} terms</Badge></summary>
      <div className="path-calendar-options"><label><input type="checkbox" checked={includeSummer} onChange={event => setIncludeSummer(event.currentTarget.checked)} />Include later summers</label>
        <label>Courses per regular term<select value={regularLoad} onChange={event => setRegularLoad(event.currentTarget.value === '2' ? 2 : 1)}><option value="1">One / default</option><option value="2">Two / heavy what-if</option></select></label></div>
      <p><strong>{evaluation.chosenCourses} of 10 subjects chosen / {evaluation.chosenCourses * 3} of 30 credits planned.</strong>{' '}
        {firstTermError ? 'Resolve the starting-subject conflict.' : calendarBlocked ? 'Resolve course / entry conflicts before proposing terms.'
          : evaluation.completeSubjectPlan ? 'Draft / not earned credit.' : `${evaluation.missingFree} free choices or conflicts remain.`}</p>
      <div className="path-semesters">{semesters.map((semester, index) => <article key={semester.term} data-path-term={semester.term}>
        <h3>{omscsTermLabel(semester.term)}</h3>
        <ul>{semester.courseIds.map(id => <li key={id} data-path-enrollment={id}><CourseName id={id} />
          <CourseEntryInfo id={id} completed={profile.completed} checks={entryChecks} earlierPlanned={semesters.slice(0, index).flatMap(term => term.courseIds)} />
        </li>)}</ul>
      </article>)}</div>
    </details>
  </div>;
}
