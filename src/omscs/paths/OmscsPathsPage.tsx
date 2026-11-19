import { useMemo, useState } from 'react';
import { ArrowDown, ArrowRight, BookOpen, Check, GraduationCap, Info } from 'lucide-react';
import { Badge, ExternalLink, PageHeading } from '../../components';
import { omscsTermLabel } from '../../domain/omscs/model';
import { omscsCourses } from '../../domain/omscs/courses';
import { pathArea, pathAreas, pathCourse, pathCourseDetails, pathCourses, outsideCsCse } from '../../domain/omscs/paths/catalog';
import {
  budgetCompleted, defaultPathSelection, electiveChoices, enumerateSpecializationPaths,
  evaluateDegree, pathCalendarWarnings, pathPresets, pathProfileSchema, proposedPathSemesters,
  remainingFreeCombinations, returnGap, reusedInSpecialization, specializationGradeConflicts,
  specializationIds, suggestedCourseOrder,
} from '../../domain/omscs/paths/model';
import type { PathProfile, SpecializationSelection } from '../../domain/omscs/paths/model';
import { catalogOnlyReferences, pathsReviewedAt, pathRules, pathSources, unavailableAiChoices } from '../../domain/omscs/paths/rules';
import type { PathRuleId } from '../../domain/omscs/paths/rules';
import { missionAccentStyle } from '../../missionVisuals';
import { readPlanningContext } from './planningContext';
import type { OmscsPathsProps } from './OmscsPathsLoader';
import './paths.css';

function CourseName({ id }: { id: string }) {
  const course = pathCourse(id);
  return <>{course.code} / {course.title}</>;
}
function RoleSelect({ label, value, options, onChange }: {
  label: string; value: string; options: readonly string[]; onChange: (value: string) => void;
}) {
  return <label>{label}<select aria-label={label} value={value} onChange={event => onChange(event.currentTarget.value)}>
    {!options.includes(value) && <option value={value}>{pathCourse(value).code} / not allowed in this role</option>}
    {options.map(id => <option value={id} key={id}>{pathCourse(id).code} / {pathCourse(id).title}</option>)}
  </select></label>;
}
function CourseDetail({ id }: { id: string }) {
  const course = pathCourse(id), detail = pathCourseDetails(id), guide = omscsCourses.find(item => item.id === id);
  return <details className="path-course-detail"><summary>What this choice involves</summary>
    <p>{detail.overview}</p><p><strong>Preparation:</strong> {detail.preparation}</p>
    <p><strong>Tools / methods:</strong> {detail.tools}</p>
    <p className="muted small">{detail.reviewedOverview
      ? 'Authored overview from reviewed public sources; not a complete future syllabus or workload guarantee.'
      : 'Catalogue identity reviewed; complete course content has not been reviewed in this comparison.'}</p>
    <div className="button-row"><ExternalLink href={course.url}>Official course page</ExternalLink>
      {guide && <a className="text-link" href={`#/practice/omscs/omscs-${guide.id}-${guide.modules[0].id}`} target="_blank" rel="noopener noreferrer">
        Original study guide<BookOpen size={14} /></a>}</div>
  </details>;
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
  const [ruleId, setRuleId] = useState<PathRuleId>('current');
  const [selection, setSelection] = useState<SpecializationSelection>(() => structuredClone(defaultPathSelection));
  const [free, setFree] = useState(() => initialFree(defaultPathSelection, initialProfile, pathPresets[0].free));
  const [includeSummer, setIncludeSummer] = useState(false);
  const [regularLoad, setRegularLoad] = useState<1 | 2>(1);
  const [startYear, setStartYear] = useState(profile.resumeTerm.slice(0, 4));
  const [startSeason, setStartSeason] = useState(profile.resumeTerm.split('-')[1]);
  const [calendarError, setCalendarError] = useState('');
  const [pathQuery, setPathQuery] = useState('');
  const [reuse, setReuse] = useState('most');
  const [pathPage, setPathPage] = useState(0);
  const [freeQuery, setFreeQuery] = useState('');
  const [area, setArea] = useState('');
  const [freePage, setFreePage] = useState(0);
  const rules = pathRules[ruleId];
  const completed = useMemo(() => budgetCompleted(profile), [profile]);
  const completedIds = new Set(completed.map(row => row.id));
  const evaluation = useMemo(() => evaluateDegree(ruleId, selection, free, profile), [ruleId, selection, free, profile]);
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
    (!area || pathArea(course.id) === area));
  const shownFree = freeCandidates.slice(freePage * 12, freePage * 12 + 12);
  const semesters = useMemo(() => evaluation.errors.length ? [] : proposedPathSemesters(
    suggestedCourseOrder(evaluation.newCourseIds), profile.resumeTerm, includeSummer, regularLoad,
  ), [evaluation, profile, includeSummer, regularLoad]);
  const calendarWarnings = pathCalendarWarnings(profile, semesters);
  const gap = returnGap(profile);
  const unknownGrades = completed.filter(row => row.grade === 'unrecorded').length;
  const sourceConflict = ruleId === 'current' && evaluateDegree('conservative', selection, free, profile).errors.length > 0;
  const possibilities = remainingFreeCombinations(evaluation);
  const changeAi = (index: 0 | 1, id: string) => setSelection(value => ({
    ...value, ai: index === 0 ? [id, value.ai[1]] : [value.ai[0], id],
  }));
  const changeElective = (index: 0 | 1, id: string) => setSelection(value => ({
    ...value, electives: index === 0 ? [id, value.electives[1]] : [value.electives[0], id],
  }));

  return <div className="omscs-paths amber" style={missionAccentStyle('omscs')} data-tour="omscs-paths">
    <PageHeading eyebrow="GOLD CIRCUIT / LOCAL REVIEW SANDBOX" title="Explore your AI degree paths"
      description="Choose specialization subjects first, then fill the remaining degree slots. Compare possibilities without rewriting your academic records or learning tracker.">
      <a className="button secondary" href="#/omscs">Original study companion<ArrowRight size={15} /></a>
    </PageHeading>
    <section className="panel path-purpose"><GraduationCap size={28} /><div>
      <h2>10 courses. 30 credits. More than one good route.</h2>
      <p>The AI specialization uses five courses / 15 credits. The other five courses / 15 credits are free electives. Each course counts once.</p>
      <p><strong>Planning basis:</strong> {source}. Choices here stay in memory only. They never save a course grade, complete a checkpoint or award Atlas credit.</p>
    </div></section>
    <nav className="button-row path-jumps" aria-label="Path explorer sections">
      {[
        ['paths-history', 'History and return checks'], ['paths-choices', 'Choose AI subjects'],
        ['paths-combinations', 'All combinations'], ['paths-free-choices', 'Free electives'], ['paths-semester-calendar', 'Semester plan'],
      ].map(([id, title]) => <button key={id} className="button secondary" onClick={() => document.getElementById(id)?.scrollIntoView({ block: 'start', behavior: 'instant' })}>{title}</button>)}
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

    <section id="paths-history" className="panel" data-tour="paths-history"><h2>Keep completed work in the picture</h2>
      {profile.completed.length ? <div className="path-history">{profile.completed.map(row => <article key={row.id}>
        <span className="eyebrow">{row.term ? omscsTermLabel(row.term) : 'Term not entered'}</span>
        <h3><CourseName id={row.id} /></h3><p>Reported complete / {row.grade === 'unrecorded' ? 'grade unknown' : `entered grade ${row.grade}`}</p>
        <Badge>{specSet.has(row.id) ? 'Chosen specialization slot / needs B' : 'Potential free elective / needs C'}</Badge>
      </article>)}</div> : <p>No prior completion is assumed in this planning basis. Saved completed course entries, or an explicitly supplied private local preview, can provide the baseline.</p>}
      {gap.terms.length > 0 && <div className="path-gap"><h3>Gap before the proposed return</h3>
        <p>{gap.terms.map(omscsTermLabel).join(' / ')}</p>
        {gap.needsCheck && <p className="alert error">This is {gap.terms.length} consecutive terms, counting summer. Current Registrar policy requires a readmission check after three or more.
          Confirm whether it is already approved; this page does not know your enrollment status.</p>}</div>}
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
      <section className="panel path-step"><span className="eyebrow">01 / THREE CREDITS</span><h2>Algorithms and design</h2>
        <p>GA and SDP are alternatives for this slot, not equivalent learning. The current-page exception can also allow the unused one as a specialization elective.</p>
        <RoleSelect label="Algorithms/design course" value={selection.design} options={rules.design} onChange={id => setSelection(value => ({ ...value, design: id }))} />
        <CourseDetail id={selection.design} />
      </section>
      <ArrowDown className="path-flow-arrow" aria-hidden="true" />
      <section className="panel path-step"><span className="eyebrow">02 / SIX CREDITS</span><h2>Two AI-core courses</h2>
        <p>A completed eligible course can fill a slot conditionally; it does not have to be taken again. You can also explore allocating unused core learning elsewhere.</p>
        <div className="path-two"><div><RoleSelect label="First AI-core course" value={selection.ai[0]} options={rules.ai} onChange={id => changeAi(0, id)} /><CourseDetail id={selection.ai[0]} /></div>
          <div><RoleSelect label="Second AI-core course" value={selection.ai[1]} options={rules.ai} onChange={id => changeAi(1, id)} /><CourseDetail id={selection.ai[1]} /></div></div>
      </section>
      <ArrowDown className="path-flow-arrow" aria-hidden="true" />
      <section className="panel path-step"><span className="eyebrow">03 / SIX CREDITS</span><h2>Two specialization electives</h2>
        <p>Only unused courses can fill these slots. The current-page lens includes unused core choices; the conservative lens does not assume that exception beyond the explicit catalog overlap.</p>
        <div className="path-two"><div><RoleSelect label="First specialization elective" value={selection.electives[0]} options={electiveChoices(ruleId, selection)} onChange={id => changeElective(0, id)} /><CourseDetail id={selection.electives[0]} /></div>
          <div><RoleSelect label="Second specialization elective" value={selection.electives[1]} options={electiveChoices(ruleId, selection)} onChange={id => changeElective(1, id)} /><CourseDetail id={selection.electives[1]} /></div></div>
      </section>
    </section>
    {evaluation.errors.length > 0 && <section className="panel alert error" role="alert"><h2>Resolve these planning conflicts</h2>
      <ul>{evaluation.errors.map(error => <li key={error}>{error}</li>)}</ul><p>Your choices are retained so you can correct them; no stored workspace was changed.</p></section>}

    <section id="paths-combinations" className="panel" data-tour="paths-all-options"><h2>See all specialization possibilities</h2>
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
    </section>

    <section className="panel"><h2>Compare capability-oriented starting points</h2>
      <p>These are editorial examples, not mandatory pathways, employer requirements or a replacement for the complete choices.</p>
      <div className="path-preset-grid">{pathPresets.map(preset => <article className="path-option" key={preset.id}><h3>{preset.title}</h3><p>{preset.why}</p>
        <button className="button secondary" onClick={() => { setSelection(structuredClone(preset.selection)); setFree(initialFree(preset.selection, profile, preset.free)); }}>Preview {preset.title}</button></article>)}</div>
    </section>

    <section id="paths-free-choices" className="panel" data-tour="paths-free"><span className="eyebrow">04 / FILL THE REST OF THE DEGREE</span><h2>Your free electives are real choices</h2>
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
          <option value="">All editorial areas</option>{pathAreas.map(title => <option key={title}>{title}</option>)}</select></label></div>
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
          <CourseDetail id={course.id} />
        </article>;
      })}</div>
      <div className="button-row path-pages"><button className="button secondary" disabled={freePage === 0} onClick={() => setFreePage(value => value - 1)}>Previous courses</button>
        <span>Page {freePage + 1} / {Math.max(1, Math.ceil(freeCandidates.length / 12))}</span>
        <button className="button secondary" disabled={(freePage + 1) * 12 >= freeCandidates.length} onClick={() => setFreePage(value => value + 1)}>More courses</button></div>
      <p className="muted small">This is a reviewed list of regular credit-course identities, not a future timetable. Seminars are one-credit pass/fail and do not count toward graduation. Not every course's full syllabus is reviewed here; its disclosure says when only catalogue metadata was reviewed.</p>
      <ExternalLink href={pathSources.courses}>Complete official current-course list</ExternalLink>
    </section>

    <section id="paths-semester-calendar" className="panel" data-tour="paths-calendar"><span className="eyebrow">05 / PROPOSE A CALENDAR</span><h2>Return to study without pretending a seat is booked</h2>
      <form className="path-calendar-form" onSubmit={event => {
        event.preventDefault();
        const parsed = pathProfileSchema.safeParse({ ...profile, resumeTerm: `${startYear}-${startSeason}` });
        if (!parsed.success) { setCalendarError(parsed.error.issues.map(issue => issue.message).join(' ')); return; }
        setProfile(parsed.data); setCalendarError('');
      }}>
        <label>Return semester<select value={startSeason} onChange={event => setStartSeason(event.currentTarget.value)}><option value="spring">Spring</option><option value="summer">Summer</option><option value="fall">Fall</option></select></label>
        <label>Return year<input type="number" min={2000} max={2095} required value={startYear} onChange={event => setStartYear(event.currentTarget.value)} /></label>
        <button className="button primary">Apply draft return<Check size={15} /></button>
      </form>
      {calendarError && <p className="alert error" role="alert">{calendarError}</p>}
      <div className="path-calendar-options"><label><input type="checkbox" checked={includeSummer} onChange={event => setIncludeSummer(event.currentTarget.checked)} />Include later summers</label>
        <label>Courses per regular term<select value={regularLoad} onChange={event => setRegularLoad(event.currentTarget.value === '2' ? 2 : 1)}><option value="1">One / default</option><option value="2">Two / heavy what-if</option></select></label></div>
      <p><strong>{evaluation.chosenCourses} of 10 subjects chosen / {evaluation.chosenCourses * 3} of 30 credits planned.</strong>{' '}
        {evaluation.completeSubjectPlan ? 'Subject slots are filled conditionally; this is not earned credit or official degree approval.' : `${evaluation.missingFree} additional free choices or the conflicts above remain. This is not a graduation estimate.`}</p>
      <p>Only {evaluation.newCourseIds.length} currently selected new subjects appear below. The existing learning mission stays on its original 24-checkpoint study template; this sandbox does not rewrite it.</p>
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
