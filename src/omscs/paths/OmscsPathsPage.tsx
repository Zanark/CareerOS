import { useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowRight, BookOpen, Check, GraduationCap, Info } from 'lucide-react';
import { Badge, ExternalLink, PageHeading } from '../../components';
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
import { catalogOnlyReferences, pathsReviewedAt, pathRules, pathSources, unavailableAiChoices } from '../../domain/omscs/paths/rules';
import type { PathRuleId } from '../../domain/omscs/paths/rules';
import { missionAccentStyle } from '../../missionVisuals';
import { readPlanningContext } from './planningContext';
import type { OmscsPathsProps } from './OmscsPathsLoader';
import PlanningBasisEditor from './PlanningBasisEditor';
import './paths.css';

function CourseName({ id }: { id: string }) {
  const course = pathCourse(id);
  return <>{course.code} / {course.title}</>;
}
function RoleSelect({ label, value, options, completed, onChange }: {
  label: string; value: string; options: readonly string[]; completed: ReadonlySet<string>; onChange: (value: string) => void;
}) {
  return <label>{label}<select aria-label={label} value={value} onChange={event => onChange(event.currentTarget.value)}>
    {!options.includes(value) && <option value={value}>{pathCourse(value).code} / not allowed in this role</option>}
    {options.map(id => <option value={id} key={id}>{pathCourse(id).code} / {pathCourse(id).title}{completed.has(id) ? ' / reported complete' : ''}</option>)}
  </select><span className="path-current-title">{pathCourse(value).title}</span></label>;
}
function CourseDetail({ id, direction }: { id: string; direction: CareerDirection }) {
  const course = pathCourse(id), detail = pathCourseDetails(id), guide = omscsCourses.find(item => item.id === id);
  const fit = courseCareerFit(id, direction);
  return <><div className="path-career-fit" data-path-fit={id}>
    <Badge>{fit.tier}</Badge><p>{fit.benefit}</p>
    <p className="small"><strong>Tradeoff:</strong> {fit.tradeoff}</p>
    <div className="path-roadmap-links"><span className="small muted">Connects to:</span>{fit.roadmaps.map(missionId =>
      <a className="text-link" key={missionId} href={`#/mission/${missionId}`} target="_blank" rel="noopener noreferrer">
        {getLatestMission(missionId).operation}<ArrowRight size={13} /></a>)}</div>
  </div><details className="path-course-detail"><summary>Preparation, tools and official sources</summary>
    <p>{detail.overview}</p><p><strong>Preparation:</strong> {detail.preparation}</p>
    <p><strong>Tools / methods:</strong> {detail.tools}</p>
    <p className="muted small">{detail.reviewedOverview
      ? 'Authored overview from reviewed public sources; not a complete future syllabus or workload guarantee.'
      : 'Public overview reviewed; complete course content has not been reviewed in this comparison. Confirm preparation, tools and assessed workload with the official course.'}</p>
    <div className="button-row"><ExternalLink href={course.url}>Official course page</ExternalLink>
      {guide && <a className="text-link" href={`#/practice/omscs/omscs-${guide.id}-${guide.modules[0].id}`} target="_blank" rel="noopener noreferrer">
        Original study guide<BookOpen size={14} /></a>}</div>
  </details></>;
}
function initialFree(selection: SpecializationSelection, profile: PathProfile, values: readonly string[]) {
  const spec = new Set(specializationIds(selection)), completed = new Set(budgetCompleted(profile).map(row => row.id));
  const slots = Math.max(0, 5 - [...completed].filter(id => !spec.has(id)).length);
  return values.filter(id => !spec.has(id) && !completed.has(id)).slice(0, slots);
}

export default function OmscsPathsPage({ state, practice }: OmscsPathsProps) {
  const [context] = useState(() => readPlanningContext(state, practice));
  if (!context.profile) return <section className="panel alert error" role="alert">
    <h1>Review the planning context</h1><p>{context.error}</p>
    <a className="button secondary" href="#/omscs">Return to the academic companion</a>
  </section>;
  return <PathsExplorer initialProfile={context.profile} source={context.source} />;
}

function PathsExplorer({ initialProfile, source }: { initialProfile: PathProfile; source: string }) {
  const [profile, setProfile] = useState(initialProfile);
  const [basisEdited, setBasisEdited] = useState(false);
  const [direction, setDirection] = useState<CareerDirection>('cloud');
  const [fitFilter, setFitFilter] = useState<CourseFitTier | ''>('');
  const [ruleId, setRuleId] = useState<PathRuleId>('current');
  const [selection, setSelection] = useState<SpecializationSelection>(() => structuredClone(defaultPathSelection));
  const [free, setFree] = useState(() => initialFree(defaultPathSelection, initialProfile, pathPresets[0].free));
  const [includeSummer, setIncludeSummer] = useState(false);
  const [regularLoad, setRegularLoad] = useState<1 | 2>(1);
  const [firstTermCourse, setFirstTermCourse] = useState('');
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
  const orderedNewSubjects = useMemo(() => evaluation.errors.length || firstTermError ? []
    : firstTermCourseOrder(evaluation.newCourseIds, firstTermCourse), [evaluation, firstTermCourse, firstTermError]);
  const semesters = useMemo(() => proposedPathSemesters(
    orderedNewSubjects, profile.resumeTerm, includeSummer, regularLoad,
  ), [orderedNewSubjects, profile, includeSummer, regularLoad]);
  const firstSubject = orderedNewSubjects[0];
  const calendarWarnings = pathCalendarWarnings(profile, semesters);
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
    evaluation.completeSubjectPlan ? 'Ten conditional subject slots filled; grades/catalog/offerings still need confirmation.'
      : 'INCOMPLETE OR CONFLICTING DRAFT - resolve the warnings before treating this as a full plan.',
    '', 'NEW SUBJECTS TO DISCUSS:',
    ...newShortlist.map(row => `${pathCourse(row.id).code} - ${pathCourse(row.id).title} [${row.role}]`),
    '', 'ALREADY REPORTED / NOT NEW ENROLLMENTS:',
    ...shortlist.filter(row => row.reportedComplete).map(row => `${pathCourse(row.id).code} - ${pathCourse(row.id).title} [${row.role}]`),
    '', 'Planning only. No registration, degree approval or learning credit.',
  ].join('\n');
  const applyProfile = (next: PathProfile) => {
    const prior = new Set(budgetCompleted(next).map(row => row.id));
    setProfile(next); setBasisEdited(true);
    setFree(values => values.filter(id => !prior.has(id)));
  };
  const jump = (id: string) => document.getElementById(id)?.scrollIntoView({ block: 'start', behavior: 'instant' });
  const changeAi = (index: 0 | 1, id: string) => setSelection(value => ({
    ...value, ai: index === 0 ? [id, value.ai[1]] : [value.ai[0], id],
  }));
  const changeElective = (index: 0 | 1, id: string) => setSelection(value => ({
    ...value, electives: index === 0 ? [id, value.electives[1]] : [value.electives[0], id],
  }));

  return <div className="omscs-paths amber" style={missionAccentStyle('omscs')} data-tour="omscs-paths">
    <PageHeading eyebrow="GOLD CIRCUIT / COURSE CHOICE WORKBENCH" title="Explore your AI degree paths"
      description="Choose your next subject, then keep the rest of the degree flexible. Compare possibilities without rewriting academic records or learning progress.">
      <div className="button-row path-heading-actions">
        <button className="button primary" data-tour="paths-begin" onClick={() => jump('paths-start')}>Start choosing subjects<ArrowDown size={15} /></button>
        <button className="button secondary" onClick={() => jump('paths-first-term')}>Choose next term<ArrowRight size={15} /></button>
        <a className="text-link" href="#/omscs">Original study companion<ArrowRight size={15} /></a>
      </div>
    </PageHeading>
    <section className="panel path-purpose"><GraduationCap size={28} /><div>
      <h2>10 courses. 30 credits. More than one good route.</h2>
      <p>The AI specialization uses five courses / 15 credits. The other five courses / 15 credits are free electives. Each course counts once.</p>
      <p><strong>Planning basis:</strong> {basisEdited ? 'Edited in this tab / saved academic records unchanged' : source}.
        {' '}Choices are temporary: keep this tab open or note your shortlist before leaving. Refreshing or leaving this page resets the draft.
        No grade, checkpoint or Atlas credit is saved here.</p>
    </div></section>
    <section id="paths-start" className="panel path-start" data-tour="paths-start"><h2>Start here. Build one plan, not 830 plans.</h2>
      <p>A replaceable example is loaded, not a decision made for you. Follow these four steps; the complete combinations are optional reference.</p>
      <ol>
        <li><button className="text-button" onClick={() => jump('paths-history')}>Set your starting point</button>
          <p>On a new phone, add your own completed courses privately to this tab. Choose a return term. A course you already took should not become a new enrollment.</p></li>
        <li><button className="text-button" onClick={() => jump('paths-career')}>Choose the five AI slots</button>
          <p>Choose a career emphasis, then one algorithms/design course, two AI-core courses and two specialization electives. Eligible prior courses may fill these slots.</p></li>
        <li><button className="text-button" onClick={() => jump('paths-free-choices')}>Fill the remaining free choices</button>
          <p>Use career fit, benefits and tradeoffs to compare alternatives. Remove an unwanted example before ticking its replacement; the counter shows how many free subjects are needed.</p></li>
        <li><button className="text-button" onClick={() => jump('paths-shortlist')}>Review your subject shortlist</button>
          <p>Check new versus already-reported subjects, choose a starting subject for the next term, then note the list for discussion. Later terms remain proposals.</p></li>
      </ol>
    </section>
    <nav className="button-row path-jumps" aria-label="Path explorer sections">
      {[
        ['paths-history', 'History and return checks'], ['paths-choices', 'Choose AI subjects'],
        ['paths-combinations', 'All combinations'], ['paths-free-choices', 'Free electives'], ['paths-shortlist', 'My shortlist'], ['paths-first-term', 'Next term choice'], ['paths-semester-calendar', 'Semester plan'],
      ].map(([id, title]) => <button key={id} className="button secondary" onClick={() => {
        const element = document.getElementById(id);
        if (element instanceof HTMLDetailsElement) element.open = true;
        jump(id);
      }}>{title}</button>)}
    </nav>
    <section className="path-metrics" aria-label="Planning course budget" data-tour="paths-budget">
      <div><strong>{evaluation.priorCount}<small> / 10 courses</small></strong><span>Reported completed / {evaluation.priorCount * 3} credits</span></div>
      <div><strong>{evaluation.remainingCourses}<small> courses</small></strong><span>Remaining / {evaluation.remainingCourses * 3} credits</span></div>
      <div><strong>{evaluation.newSpec.length}<small> courses</small></strong><span>Additional specialization subjects</span></div>
      <div><strong>{evaluation.freeSlots}<small> courses</small></strong><span>Additional free-elective choices</span></div>
    </section>
    <p className="quiet-note"><Info size={19} />Subject budgets are conditional, not earned-degree verification.
      {unknownGrades > 0 ? ` ${unknownGrades} reported completions have no entered grade.` : ''}
      {' '}Specialization needs B or better, free electives C or better, and the actual cumulative GPA must be at least 3.0. D/F attempts do not reduce the passing-credit budget.</p>

    <section id="paths-history" className="panel" data-tour="paths-history"><span className="eyebrow">01 / YOUR STARTING POINT</span><h2>Keep completed work in the picture</h2>
      <PlanningBasisEditor profile={profile} onChange={applyProfile} />
      {profile.completed.length ? <div className="path-history">{profile.completed.map(row => <article key={row.id}>
        <span className="eyebrow">{row.term ? omscsTermLabel(row.term) : 'Term not entered'}</span>
        <h3><CourseName id={row.id} /></h3><p>{row.grade === 'D' || row.grade === 'F' ? 'Completed attempt / not passing credit' : 'Reported complete'} / {row.grade === 'unrecorded' ? 'grade unknown' : `entered grade ${row.grade}`}</p>
        <Badge>{row.grade === 'D' || row.grade === 'F' ? 'Does not reduce the passing-course budget'
          : specSet.has(row.id) ? 'Chosen specialization slot / needs B' : 'Potential free elective / needs C'}</Badge>
        <button className="text-button" aria-label={`Remove ${pathCourse(row.id).code} from draft history`}
          onClick={() => applyProfile({ ...profile, completed: profile.completed.filter(item => item.id !== row.id) })}>Remove from this draft history</button>
      </article>)}</div> : <p>No prior completion is assumed. Add your own above if needed; you can also explore a degree from scratch. Existing academic records are not changed.</p>}
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
        Return approval is marked confirmed for this draft. Continue choosing the next subject; the historical gap below does not mean you need to apply again.
        This does not verify a future seat or select an applicable catalog.</p>}
      {gap.terms.length > 0 && <div className="path-gap"><h3>Gap before the proposed return</h3>
        <p>{gap.terms.map(omscsTermLabel).join(' / ')}</p>
        {gap.needsCheck && !profile.readmissionConfirmed && <p className="alert error">This is {gap.terms.length} consecutive terms, counting summer. Current Registrar policy requires a readmission check after three or more.
          If approval is already confirmed, mark that above; do not apply again just because this planning notice appears.</p>}</div>}
      {profile.programStart && <p>Program start entered: <strong>{omscsTermLabel(profile.programStart)}</strong>. A study break does not automatically renew the age of prior credits.</p>}
      <details className="path-course-detail"><summary>Return, foundational grades and credit-age checks</summary>
        <p>Readmission is not guaranteed. The current Registrar page says readmitted students follow the current catalog; keeping an older one requires a separately approved request.</p>
        <p>The general Spring readmission deadline is December 1 in the preceding year; other standings have earlier deadlines. Check the actual current rules, not a calendar promise here.</p>
        <p>The program requires two foundational courses at B or better within the first 12 months. The catalogue marks foundational courses; unknown grades do not verify that requirement.</p>
        <p>The program FAQ describes six-year credit age from the semester earned. Calendar warnings are watchpoints, not an official expiry or extension decision.</p>
        <div className="button-row"><ExternalLink href={pathSources.return}>Readmission policy</ExternalLink>
          <ExternalLink href={pathSources.deadlines}>Current deadlines</ExternalLink><ExternalLink href={pathSources.duration}>Program FAQ</ExternalLink></div>
      </details>
    </section>

    <section id="paths-career" className="panel" data-tour="paths-career"><h2>Choose a career emphasis</h2>
      <label>Career direction<select value={direction} onChange={event => {
        const chosen = careerDirections.find(item => item.id === event.currentTarget.value);
        if (chosen) { setDirection(chosen.id); setFreePage(0); }
      }}>{careerDirections.map(item => <option value={item.id} key={item.id}>{item.title}</option>)}</select></label>
      <p>{careerDirections.find(item => item.id === direction)?.description} This changes course explanations and filters, not your selections.</p>
      <details className="path-course-detail"><summary>What the career-fit labels mean</summary>
        <p><strong>Direct support:</strong> closest to this emphasis. <strong>Supporting depth:</strong> useful foundations or complementary judgment.
          {' '}<strong>Specialist detour:</strong> choose for a deliberate domain or research interest, not because the course is bad.</p>
        <p className="muted small">These are authored qualitative judgments from public overviews and existing CareerOS roadmaps, not university ratings, job guarantees or completion equivalence.
          Fit is not degree eligibility. Changing the emphasis never changes saved mission progress. Roadmap links open separately so this draft stays here.</p>
      </details>
      <details className="path-course-detail"><summary>Try a capability-oriented starting point</summary>
        <p>Optional worked examples, not mandatory pathways. Preview replaces the subject draft, not your prior history or academic records.</p>
        <div className="path-preset-grid">{pathPresets.map(preset => <article className="path-option" key={preset.id}><h3>{preset.title}</h3><p>{preset.why}</p>
          <button className="button secondary" onClick={() => { setSelection(structuredClone(preset.selection)); setFree(initialFree(preset.selection, profile, preset.free)); }}>Preview {preset.title}</button></article>)}</div>
      </details>
    </section>

    <section className="panel" data-tour="paths-rules"><h2>First: choose the rule lens</h2>
      <label>AI rule comparison<select value={ruleId} onChange={event => {
        if (event.currentTarget.value === 'current' || event.currentTarget.value === 'conservative') {
          setRuleId(event.currentTarget.value); setPathPage(0);
        }
      }}>{Object.values(pathRules).map(rule => <option key={rule.id} value={rule.id}>{rule.title}</option>)}</select></label>
      <p>{rules.description}</p>
      <p>The current OMSCS page and general MSCS catalog do not show identical AI menus. Neither this switch nor a proposed return date establishes which catalog your official audit will apply.</p>
      {sourceConflict && <p className="alert error">This selection fits only the expanded current-page lens, not the conservative comparison. Confirm its applicability before relying on it for registration.</p>}
      <div className="button-row"><ExternalLink href={pathSources.ai}>Current AI requirements</ExternalLink>
        <ExternalLink href={pathSources.catalog}>General catalog comparison</ExternalLink></div>
    </section>

    <section id="paths-choices" className="path-flow" aria-label="Choose the specialization">
      <h2>2. Choose the five specialization slots</h2>
      <section className="panel path-step"><span className="eyebrow">AI SLOT 1 / THREE CREDITS</span><h2>Algorithms and design</h2>
        <p>GA and SDP are alternatives for this slot, not equivalent learning. The current-page exception can also allow the unused one as a specialization elective.</p>
        <RoleSelect label="Algorithms/design course" value={selection.design} options={rules.design} completed={completedIds} onChange={id => setSelection(value => ({ ...value, design: id }))} />
        <CourseDetail id={selection.design} direction={direction} />
      </section>
      <ArrowDown className="path-flow-arrow" aria-hidden="true" />
      <section className="panel path-step"><span className="eyebrow">AI SLOTS 2-3 / SIX CREDITS</span><h2>Two AI-core courses</h2>
        <p>A completed eligible course can fill a slot conditionally; it does not have to be taken again. You can also explore allocating unused core learning elsewhere.</p>
        <div className="path-two"><div><RoleSelect label="First AI-core course" value={selection.ai[0]} options={rules.ai} completed={completedIds} onChange={id => changeAi(0, id)} /><CourseDetail id={selection.ai[0]} direction={direction} /></div>
          <div><RoleSelect label="Second AI-core course" value={selection.ai[1]} options={rules.ai} completed={completedIds} onChange={id => changeAi(1, id)} /><CourseDetail id={selection.ai[1]} direction={direction} /></div></div>
      </section>
      <ArrowDown className="path-flow-arrow" aria-hidden="true" />
      <section className="panel path-step"><span className="eyebrow">AI SLOTS 4-5 / SIX CREDITS</span><h2>Two specialization electives</h2>
        <p>Only unused courses can fill these slots. The current-page lens includes unused core choices; the conservative lens does not assume that exception beyond the explicit catalog overlap.</p>
        <div className="path-two"><div><RoleSelect label="First specialization elective" value={selection.electives[0]} options={electiveChoices(ruleId, selection)} completed={completedIds} onChange={id => changeElective(0, id)} /><CourseDetail id={selection.electives[0]} direction={direction} /></div>
          <div><RoleSelect label="Second specialization elective" value={selection.electives[1]} options={electiveChoices(ruleId, selection)} completed={completedIds} onChange={id => changeElective(1, id)} /><CourseDetail id={selection.electives[1]} direction={direction} /></div></div>
      </section>
    </section>
    {evaluation.errors.length > 0 && <section className="panel alert error" role="alert"><h2>Resolve these planning conflicts</h2>
      <ul>{evaluation.errors.map(error => <li key={error}>{error}</li>)}</ul><p>Your choices are retained so you can correct them; no stored workspace was changed.</p></section>}

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
      <p className="muted small">A five-course combination can have several legal slot mappings. Free electives can overlap other specialization combinations, so these counts are not added into a misleading global count of unique ten-course degrees. Future offerings and seats are unknown.</p>
      <details className="path-course-detail"><summary>Formal AI choices not currently marked online ({unavailableAiChoices.length})</summary>
        <p>The full campus menu is broader than OMSCS. These choices are references, not selectable online degree slots in this snapshot.</p>
        <ul>{unavailableAiChoices.map(([code, title, group]) => <li key={code}><strong>{code}</strong> / {title} ({group})</li>)}</ul>
        <p>The older catalog also names these topic/course references, which are not current online choices here:</p><ul>{catalogOnlyReferences.map(name => <li key={name}>{name}</li>)}</ul>
      </details>
    </details>

    <section id="paths-free-choices" className="panel" data-tour="paths-free"><span className="eyebrow">03 / FILL THE REST OF THE DEGREE</span><h2>Your free electives are real choices</h2>
      <p>{evaluation.priorFree.length} prior course(s) already sit outside the chosen specialization; choose {evaluation.freeSlots} additional free electives.
        They need not all be AI courses. At most six credits / two courses may use a subject other than CS/CSE.</p>
      {evaluation.priorFree.length > 0 && <p><strong>Prior free-elective budget:</strong> {evaluation.priorFree.map(id => pathCourse(id).code).join(' + ')}.</p>}
      <div className="path-selected"><h3>Additional free electives / {free.length} of {evaluation.freeSlots}</h3>
        {free.length ? free.map(id => <div key={id}><span><CourseName id={id} /></span><button className="text-button" aria-label={`Remove ${pathCourse(id).code} from free electives`} onClick={() => setFree(values => values.filter(value => value !== id))}>Remove</button></div>)
          : <p>No additional free electives selected.</p>}</div>
      <button className="button secondary" disabled={!free.length} onClick={() => setFree([])}>Clear additional free choices</button>
      <p>{evaluation.errors.length ? <strong>Fix conflicts to count completions.</strong>
        : evaluation.missingFree === 0 ? <><strong>The free slots are filled.</strong> Clear or replace these suggested choices to explore alternatives; none is compulsory.</>
          : <><strong>{possibilities.toLocaleString()}</strong> compatible ways to fill the remaining free slots from this catalogue, given the current choices and subject-code cap.</>}</p>
      <div className="path-filters"><label>Find a free elective<input type="search" placeholder="Course code or title" value={freeQuery} onChange={event => { setFreeQuery(event.currentTarget.value); setFreePage(0); }} /></label>
        <label>Explore a capability area<select value={area} onChange={event => { setArea(event.currentTarget.value); setFreePage(0); }}>
          <option value="">All editorial areas</option>{pathAreas.map(title => <option key={title}>{title}</option>)}</select></label>
        <label>Filter by career fit<select value={fitFilter} onChange={event => {
          const value = event.currentTarget.value;
          if (value === '' || value === 'Direct support' || value === 'Supporting depth' || value === 'Specialist detour') { setFitFilter(value); setFreePage(0); }
        }}><option value="">All fits / keep every option</option>
          {['Direct support', 'Supporting depth', 'Specialist detour'].map(value => <option key={value}>{value}</option>)}</select></label></div>
      <p role="status">{freeCandidates.length} matching courses from all {pathCourses.length} current regular-course entries. Area labels are editorial navigation, not official specialization categories.</p>
      <div className="path-free-grid">{shownFree.map(course => {
        const checked = free.includes(course.id), counted = specSet.has(course.id) || completedIds.has(course.id);
        const capped = !checked && (free.length >= evaluation.freeSlots || outsideCsCse(course.id) && evaluation.outsideCount >= 2);
        return <article className="path-free-card" key={course.id} data-path-course={course.id}>
          <span className="eyebrow">{course.code} / {course.credits} credits</span><h3>{course.title}</h3><p>{pathArea(course.id)}</p>
          <div className="button-row"><Badge>{course.foundational ? 'Foundational' : 'Not foundational'}</Badge>{outsideCsCse(course.id) && <Badge>Uses non-CS/CSE allowance</Badge>}</div>
          <label className="path-course-check"><input type="checkbox" checked={checked} disabled={!checked && (counted || capped)}
            aria-label={`Choose ${course.code} as free elective`} onChange={event => {
              const nextChecked = event.currentTarget.checked;
              setFree(values => nextChecked ? [...values, course.id] : values.filter(id => id !== course.id));
            }} />
            {counted ? 'Already counted in this draft' : checked ? 'Chosen free elective' : capped ? 'Remove another choice or review the subject cap first' : 'Use as a free elective'}</label>
          <CourseDetail id={course.id} direction={direction} />
        </article>;
      })}</div>
      <div className="button-row path-pages"><button className="button secondary" disabled={freePage === 0} onClick={() => setFreePage(value => value - 1)}>Previous courses</button>
        <span>Page {freePage + 1} / {Math.max(1, Math.ceil(freeCandidates.length / 12))}</span>
        <button className="button secondary" disabled={(freePage + 1) * 12 >= freeCandidates.length} onClick={() => setFreePage(value => value + 1)}>More courses</button></div>
      <p className="muted small">All 78 public course overviews inform the authored career connections, not a future timetable. Full syllabi/readiness/toolchains were not reviewed for every course.
        Seminars are one-credit pass/fail and do not count toward graduation.</p>
      <ExternalLink href={pathSources.courses}>Complete official current-course list</ExternalLink>
    </section>

    <section id="paths-shortlist" className="panel" data-tour="paths-shortlist"><span className="eyebrow">04 / REVIEW BEFORE YOU DECIDE</span><h2>Your subject shortlist</h2>
      <p><strong>{newShortlist.length} selected new subjects</strong> / {shortlist.filter(row => row.reportedComplete).length} already-reported subjects in the chosen slots.
        {' '}This is the list to note down and bring back for discussion, not an enrollment action.</p>
      {!evaluation.completeSubjectPlan && <p className="alert error">This draft is incomplete or has conflicts. Review the warnings and remaining free-choice count before treating it as a complete subject plan.</p>}
      <ol className="path-shortlist">{newShortlist.map((row, index) => <li key={`${index}-${row.id}`}>
        <h3><CourseName id={row.id} /></h3><Badge>{row.role}</Badge>
        <p>{courseCareerFit(row.id, direction).benefit}</p>
      </li>)}</ol>
      <details className="path-course-detail"><summary>Plain-text shortlist to select and copy</summary>
        <p>No sharing service is connected. Select the text and use your phone or browser copy control.</p>
        <textarea ref={notes} aria-label="Subject shortlist for review notes" rows={12} readOnly value={notesText} />
        <button className="button secondary" onClick={() => { notes.current?.focus(); notes.current?.select(); }}>Select shortlist text</button>
      </details>
      <p className="muted small">Roadmap connections describe potential learning transfer. A course selection or self-reported completion never marks those roadmap skills learned.</p>
    </section>

    <section id="paths-first-term" className="panel" data-tour="paths-first-term"><h2>Choose a starting subject for {omscsTermLabel(profile.resumeTerm)}</h2>
      <p>You do not have to finalize every later semester now. Start from the currently selected new subjects; prior counted courses are not new enrollments.</p>
      <label>First-term subject<select aria-label="First-term subject" value={firstTermCourse} onChange={event => setFirstTermCourse(event.currentTarget.value)}
        disabled={!evaluation.newCourseIds.length && !firstTermCourse}>
        <option value="">Use the preparation-order suggestion</option>
        {firstTermError && <option value={firstTermCourse}>{pathCourse(firstTermCourse).code} / no longer a new subject in this draft</option>}
        {evaluation.newCourseIds.map(id => <option value={id} key={id}>{pathCourse(id).code} / {pathCourse(id).title}</option>)}
      </select></label>
      {firstTermCourse && <button className="text-button" onClick={() => setFirstTermCourse('')}>Reset first-term suggestion</button>}
      {firstTermError && <p className="alert error" role="alert">{firstTermError}</p>}
      {evaluation.errors.length > 0 && <p>Resolve the subject conflicts above before using the proposed starting order.</p>}
      {firstSubject && <div className="path-first-subject"><Badge>{firstTermCourse ? 'Your draft choice / not enrolled' : 'Suggested order / not a final decision'}</Badge>
        <h3><CourseName id={firstSubject} /></h3><p>{courseCareerFit(firstSubject, direction).benefit}</p>
        <p><strong>Before choosing:</strong> {pathCourseDetails(firstSubject).preparation}</p>
        <p className="small"><strong>Tradeoff:</strong> {courseCareerFit(firstSubject, direction).tradeoff}</p>
        <ExternalLink href={pathCourse(firstSubject).url}>Check the course before choosing</ExternalLink>
      </div>}
      {!firstSubject && !firstTermError && !evaluation.errors.length && <p>No new subjects remain in the current draft. Review your starting basis and choices if that is not intended.</p>}
      <p className="muted small">The default pace is one course in a regular term. Choosing an advanced course first can raise readiness warnings below; guidance is not an enforced university prerequisite.
        Confirm the actual offering and available seat. Changing the starting order does not change your chosen subjects.</p>
    </section>

    <section id="paths-semester-calendar" className="panel" data-tour="paths-calendar"><span className="eyebrow">OPTIONAL / CHECK THE CALENDAR</span><h2>Return to study without pretending a seat is booked</h2>
      <div className="path-calendar-options"><label><input type="checkbox" checked={includeSummer} onChange={event => setIncludeSummer(event.currentTarget.checked)} />Include later summers</label>
        <label>Courses per regular term<select value={regularLoad} onChange={event => setRegularLoad(event.currentTarget.value === '2' ? 2 : 1)}><option value="1">One / default</option><option value="2">Two / heavy what-if</option></select></label></div>
      <p><strong>{evaluation.chosenCourses} of 10 subjects chosen / {evaluation.chosenCourses * 3} of 30 credits planned.</strong>{' '}
        {firstTermError ? 'Resolve the starting-subject conflict before using the calendar.'
          : evaluation.completeSubjectPlan ? 'Subject slots are filled conditionally; this is not earned credit or official degree approval.' : `${evaluation.missingFree} additional free choices or the conflicts above remain. This is not a graduation estimate.`}</p>
      <p>Only {evaluation.newCourseIds.length} currently selected new subjects appear below. The existing learning mission stays on its original 24-checkpoint study template; this workbench does not rewrite it.</p>
      {calendarWarnings.length > 0 && <ul className="path-warnings">{calendarWarnings.map(warning => <li key={warning}>{warning}</li>)}</ul>}
      <div className="path-semesters">{semesters.map(semester => <article key={semester.term} data-path-term={semester.term}>
        <h3>{omscsTermLabel(semester.term)}</h3><Badge>Proposed / offering unverified</Badge>
        <ul>{semester.courseIds.map(id => <li key={id}><CourseName id={id} /></li>)}</ul>
      </article>)}</div>
    </section>
    <section className="quiet-note"><Info size={20} /><p>Sources reviewed {pathsReviewedAt}; the calendar is a planning scenario, not a future section listing or approved registration.
      No account, official transcript, GPA, AI model or university service is connected. No progress or draft is saved automatically.</p>
      <ExternalLink href={pathSources.degree}>Official degree rules</ExternalLink></section>
  </div>;
}
