import type { AppState } from '../domain/types';
import type { TutorialCommand, TutorialSignals } from './types';
import { fullMapSteps, packPracticeSteps, sourceSteps } from './featureSteps';
import { graphSteps } from './graphSteps';
import { discoverySteps } from './discoverySteps';
import { fdeSteps } from './fdeSteps';
import type { Theme } from '../useTheme';

export interface CheckContext {
  state: AppState;
  signals: TutorialSignals;
  route: string;
  enterTheme: Theme;
}

export type StepKind = 'explain' | 'action';

export interface TutorialUiAction {
  selector: string;
  event: 'click' | 'keydown' | 'pointerup';
  key?: string;
}

export interface TutorialUiObservation {
  interacted: boolean;
  viewRevision: number | null;
}

export interface TutorialStep {
  id: string;
  chapter: string;
  title: string;
  body: string;
  kind: StepKind;
  /** Named real-control targets, usually data-tour values, in priority order. */
  targets?: string[];
  /** Route to navigate to once, when this step becomes current. */
  route?: string;
  /** Command to invoke once, when this step becomes current (opens real UI, never submits data). */
  command?: TutorialCommand;
  /** For action steps: condition that marks the step as demonstrated. Ignored for explain steps. */
  check?: (ctx: CheckContext) => boolean;
  /** Read actual control state for actions that do not modify workspace records. */
  checkUi?: (root: Document, observation?: TutorialUiObservation) => boolean;
  /** Camera lessons require a real input on this control and a rendered view change. */
  uiAction?: TutorialUiAction;
}

export interface TutorialChapter {
  id: string;
  title: string;
}

export function graphCheckpointToggle(root: Document): HTMLInputElement | null {
  const label = [...root.querySelectorAll<HTMLLabelElement>('[data-tour="career-graph-filters"] label')]
    .find(candidate => candidate.textContent?.trim() === 'Checkpoints');
  return label?.querySelector<HTMLInputElement>('input') ?? null;
}

export const chapters: TutorialChapter[] = [
  { id: 'welcome', title: 'Welcome' },
  { id: 'career-graph', title: '3D career graph' },
  { id: 'graph-view', title: 'Graph layers & Show everything' },
  { id: 'graph-motion', title: 'Graph sparks & motion' },
  { id: 'graph-rings', title: 'Inspect rings & connections' },
  { id: 'graph-nodes', title: 'Choose individual nodes' },
  { id: 'graph-camera', title: 'Graph camera & fullscreen' },
  { id: 'perspective', title: 'Keep going' },
  { id: 'overview', title: 'Overview' },
  { id: 'plan', title: 'Plan & focus' },
  { id: 'mission', title: 'Mission basics' },
  { id: 'evidence', title: 'Recording evidence' },
  { id: 'review', title: 'Review & roadmap' },
  { id: 'control', title: 'Mission control' },
  { id: 'focus-room', title: 'Focus room & distractions' },
  { id: 'sources', title: 'PDFs & roadmap updates' },
  { id: 'pack-practice', title: 'Complete practice workbooks' },
  { id: 'dsa-practice', title: 'DSA practice library' },
  { id: 'system-concepts', title: 'System Design concepts' },
  { id: 'system-practice', title: 'System Design problems' },
  { id: 'full-map', title: 'Full mission roadmap' },
  { id: 'pipeline', title: 'Opportunities' },
  { id: 'freelance', title: 'Freelance research' },
  { id: 'readiness', title: 'Readiness & interview mode' },
  { id: 'settings', title: 'Settings & backup' },
  { id: 'persistence', title: 'How data is stored' },
  { id: 'tools', title: 'Search, theme & help' },
  { id: 'finish', title: 'Finish' },
  { id: 'discovery', title: 'Discovery Atlas' },
  { id: 'fde', title: 'Fieldcraft / new background mission' },
];

export const steps: TutorialStep[] = [
  // Welcome
  {
    id: 'welcome-intro', chapter: 'welcome', kind: 'explain',
    title: 'Welcome to the practice tutorial',
    body: 'Follow the glow and hand. Try the action, then click Next. If this window blocks your view, use Drag to move at the top; Reset position restores automatic placement. Use Chapter to jump between features. Practice is temporary; your real progress stays untouched.',
  },
  ...graphSteps,
  {
    id: 'perspective-intro', chapter: 'perspective', kind: 'explain', route: 'perspective',
    targets: ['perspective-intro'],
    title: 'Your own completed work',
    body: 'Keep going shows past accomplishments you supplied and work you recorded, not research or motivational quotes. Here you see only temporary practice data. Personal-history files are previewed before adding and do not complete mission checkpoints. Your real records stay untouched.',
  },
  // Overview
  {
    id: 'overview-today', chapter: 'overview', kind: 'explain', route: 'hq',
    targets: ['overview-today', 'overview-summary'],
    title: "Today's plan",
    body: 'HQ overview shows a short plan for today and a summary of your missions. Nothing here is graded; it is just a snapshot of your own tracked work.',
  },
  {
    id: 'overview-missions', chapter: 'overview', kind: 'explain',
    targets: ['overview-missions', 'overview-summary'],
    title: 'Missions and checkpoints',
    body: 'A mission is a career area, like DSA or system design, with source-defined checkpoints. Its mission page also shows a recorded-work streak from saved evidence and recall, not an attention or mastery score. There are no accounts or logins.',
  },
  // Plan & focus
  {
    id: 'plan-capacity', chapter: 'plan', kind: 'action', route: 'plan',
    targets: ['capacity'],
    title: 'Choose a capacity',
    body: 'Click Gentle to plan one action of up to 15 minutes. Steady and Deep focus allow up to three actions within a larger time budget.',
    check: ({ state }) => state.capacity === 'gentle',
  },
  {
    id: 'plan-actions', chapter: 'plan', kind: 'explain',
    targets: ['plan-actions'],
    title: "Today's actions",
    body: "These are the checkpoints suggested for today, based on your active missions and chosen capacity. Completing them is optional; evidence is what actually advances a checkpoint.",
  },
  {
    id: 'plan-refresh', chapter: 'plan', kind: 'explain',
    targets: ['plan-refresh'],
    title: 'Refresh an untouched plan',
    body: 'Refresh plan applies your latest active missions and priorities. It can rebuild an untouched plan, but preserves a plan once you have logged work. It never adds a missed-day backlog.',
  },
  {
    id: 'plan-focus', chapter: 'plan', kind: 'action',
    targets: ['focus-start'],
    title: 'Try the focus timer',
    body: 'Click Start focus session. Timer sessions and explicitly reported distractions have their own saved log; they never record learning evidence or complete a checkpoint. This tutorial uses temporary data only.',
    check: ({ signals }) => signals.focusRunning,
  },
  {
    id: 'plan-pause', chapter: 'plan', kind: 'action',
    targets: ['focus-start'],
    title: 'Pause the timer',
    body: 'Click Pause session. Your real focus timer, if you had one running before this tutorial, is separate.',
    check: ({ signals }) => !signals.focusRunning,
  },
  {
    id: 'plan-open-pattern', chapter: 'plan', kind: 'action',
    targets: ['plan-open-pattern'],
    title: 'Open a mission from the plan',
    body: "Open today's DSA checkpoint directly from the plan.",
    check: ({ route }) => route === 'mission/pattern',
  },
  // Mission basics
  {
    id: 'mission-save-state', chapter: 'mission', kind: 'explain', route: 'mission/pattern',
    targets: ['save-state'],
    title: 'The save-state card',
    body: 'This card shows four things: the stage, the current checkpoint, its status, and what unlocks next. Completing the current checkpoint with evidence is what moves "next" forward.',
  },
  {
    id: 'mission-roadmap-intro', chapter: 'mission', kind: 'explain',
    targets: ['mission-roadmap'],
    title: 'A mission roadmap',
    body: 'Follow the connected nodes downward. Roadmap stage changes which part you inspect. Expand How checkpoint completion works for the evidence-and-criteria rule. Browsing the diagram never changes progress.',
  },
  {
    id: 'mission-full-roadmap', chapter: 'mission', kind: 'explain',
    targets: ['full-roadmap-open'],
    title: 'See every stage together',
    body: 'Full roadmap opens all stages. DSA shows the complete expanded curriculum even if your saved tracker is older; choose My saved tracker to see its real glowing checkpoint. Find a topic jumps to DFS or another topic at readable size. Previewing changes no progress. Close the map before continuing.',
  },
  {
    id: 'mission-list', chapter: 'mission', kind: 'explain', route: 'missions',
    targets: ['mission-list'],
    title: 'Find all learning areas',
    body: 'Missions lists every area using the same mission hues as the graph rings. Use In focus, Background, or Planned to filter it, then open a card for its checkpoint and recorded-work streak. All ten latest curricula are available; Planned can contain older forecast-only trackers until their updates are adopted.',
  },
  // Evidence
  {
    id: 'evidence-open', chapter: 'evidence', kind: 'action', route: 'mission/pattern',
    targets: ['record-evidence'],
    title: 'Open the evidence form',
    body: 'Click Record evidence to open the real form for this checkpoint.',
    check: ({ signals }) => signals.evidenceOpen,
  },
  {
    id: 'evidence-save', chapter: 'evidence', kind: 'action', command: 'open-evidence',
    targets: ['evidence-example', 'evidence-form', 'evidence-submit'],
    title: 'Record evidence without completing',
    body: "Click Fill example (or write your own practice note), leave 'This checkpoint is complete' unchecked, then click Save evidence. A saved note counts toward this mission's recorded-work day without completing the checkpoint; this example stays in practice only.",
    check: ({ state }) => state.evidence.length >= 1,
  },
  {
    id: 'evidence-activity', chapter: 'evidence', kind: 'action', route: 'mission/pattern', command: 'close-dialogs',
    targets: ['mission-work-streak'],
    title: 'Read the recorded-work streak',
    body: 'Expand How this is counted below the streak. Any evidence/progress or recall result counts, even without completion. Same-day records across editions count once using this browser’s local date; future calendar days are excluded. No record today keeps yesterday’s streak for today; no record on either day means zero. Timers, browsing, settings, adoption, plans and personal history do not count.',
    checkUi: root => !!root.querySelector('.mission-work-streak[data-mission-id="pattern"] details[open]'),
  },
  {
    id: 'evidence-criteria', chapter: 'evidence', kind: 'explain', command: 'open-evidence',
    targets: ['evidence-criteria', 'evidence-form'],
    title: 'Checkpoint criteria',
    body: 'Criteria are short, specific statements you confirm yourself. Nothing here is graded or checked by AI; it is an honest self-record of what you did.',
  },
  {
    id: 'evidence-complete', chapter: 'evidence', kind: 'action', command: 'open-evidence',
    targets: ['checkpoint-complete', 'evidence-submit', 'evidence-form'],
    title: 'Complete the checkpoint',
    body: "Open evidence again, click Fill example, check 'This checkpoint is complete', confirm every criterion, then click Complete & unlock next.",
    check: ({ state }) => state.missions.pattern.completedCheckpointIds.length >= 1,
  },
  // Review & roadmap
  {
    id: 'review-saved-work', chapter: 'review', kind: 'explain', route: 'evidence', command: 'close-dialogs',
    targets: ['saved-work-filter'],
    title: 'Saved work',
    body: 'Your practice notes and completion evidence appear here. Try the mission/type filters or search. This is not an encrypted vault.',
  },
  {
    id: 'review-filter-work', chapter: 'review', kind: 'action',
    targets: ['saved-work-type'], title: 'Filter the evidence list',
    body: 'Choose Code in All artifact types. Filters only change this view; they never delete evidence. If you chose another kind for your example, an empty filtered list is expected. Mission and text filters work alongside this one.',
    checkUi: root => root.querySelector<HTMLSelectElement>('[data-tour="saved-work-type"]')?.value === 'code',
  },
  {
    id: 'review-history', chapter: 'review', kind: 'explain', route: 'history',
    title: 'History',
    body: 'This separate page records actions, checkpoint completions, and setting changes in order. Records survive normal app updates; tutorial records are discarded on exit.',
  },
  {
    id: 'review-recall-setup', chapter: 'review', kind: 'action', route: 'recall',
    targets: ['recall-example', 'recall-add'], title: 'Bring saved work into recall',
    body: 'Recall lists saved DSA and System Design work. If you jumped here and the list is empty, click Add tutorial recall example. It creates one fictional practice note, not a completed checkpoint. If work is already listed, continue.',
    check: ({ state }) => state.evidence.some(item => item.missionId === 'pattern' || item.missionId === 'system'),
  },
  {
    id: 'review-recall', chapter: 'review', kind: 'action', route: 'recall',
    targets: ['recall-outcome', 'recall-add'],
    title: 'Practice a recall check',
    body: 'Click Record recall, choose Partial, then Save recall. Any saved outcome, including Partial or Needs review, counts as a mission work day; multiple records today still count once. Recall never grants or undoes checkpoint completion. Independent recall requires its self-checks and spaced reviews before Retained.',
    check: ({ state }) => state.recalls.some(review => review.outcome === 'partial'),
  },
  {
    id: 'review-independent', chapter: 'review', kind: 'action',
    targets: ['recall-independent'], title: 'Try the independent-recall checks',
    body: 'Open Record recall, choose Independent, tick the required checks, then save. These are fictional practice confirmations. A real review must be honest; independent reviews also need spacing before Retained appears. No checkpoint is completed by doing this.',
    check: ({ state }) => state.recalls.some(review => review.outcome === 'independent'),
  },
  {
    id: 'review-master-roadmap', chapter: 'review', kind: 'explain', route: 'roadmap',
    targets: ['master-roadmap'],
    title: 'The master roadmap',
    body: 'The tree groups missions by In focus, Background, and Planned. Choose a mission node to see its checkpoint flowchart below. These group branches are not prerequisites; only the checkpoint order controls unlocks.',
  },
  // Mission control
  {
    id: 'control-mode', chapter: 'control', kind: 'action', route: 'mission/fabric',
    targets: ['mission-mode', 'mission-primary'],
    title: 'Bring a mission into focus',
    body: "Click Bring into focus. This makes Service Fabric eligible for daily planning; it does not erase its current checkpoint.",
    check: ({ state }) => state.missions.fabric.mode === 'active',
  },
  {
    id: 'control-primary', chapter: 'control', kind: 'action',
    targets: ['mission-primary'],
    title: 'Choose a primary mission',
    body: 'Click Make primary mission. The primary mission is considered first when generating a fresh plan, as long as it is active and unblocked.',
    check: ({ state }) => state.focusMissionId === 'fabric',
  },
  {
    id: 'control-blocker', chapter: 'control', kind: 'action',
    targets: ['blocker-input', 'blocker-submit', 'blocker-form'],
    title: 'Record a blocker',
    body: "Type 'Need a practice lab' into the blocker field and save it. A blocked mission is skipped by daily planning until you clear it.",
    check: ({ state }) => state.missions.fabric.blocker.trim().length > 0,
  },
  {
    id: 'control-blocker-clear', chapter: 'control', kind: 'action',
    targets: ['blocker-form'],
    title: 'Clearing a blocker',
    body: 'Clear the blocker field and save. This makes the mission eligible again and lets us practice background recording next. No checkpoint or earlier evidence is removed.',
    check: ({ state }) => state.missions.fabric.blocker === '',
  },
  {
    id: 'control-background', chapter: 'control', kind: 'action',
    targets: ['mission-mode'],
    title: 'Keep a mission in the background',
    body: 'Click Move to background. Its work stays intact but it no longer gets a daily action. You can still record practice or complete its current checkpoint from its mission page. Only an actual checkpoint completion reveals its full graph for today; unfinished practice and recall do not.',
    check: ({ state }) => state.missions.fabric.mode === 'background',
  },
  {
    id: 'control-background-evidence', chapter: 'control', kind: 'action', route: 'mission/fabric', command: 'close-dialogs',
    targets: ['record-evidence', 'evidence-example', 'evidence-submit'],
    title: 'Save work without bringing it into focus',
    body: 'On background Fabric, click Record evidence, Fill example, then Save evidence with completion unchecked. Its recorded-work day and dot border count this note; its full graph stays hidden. Background work uses the normal current-checkpoint guards, not a daily-plan action.',
    check: ({ state }) => state.missions.fabric.mode === 'background' &&
      state.evidence.some(item => item.missionId === 'fabric' && !item.completedCheckpoint),
  },
  {
    id: 'control-background-complete', chapter: 'control', kind: 'action', route: 'mission/fabric',
    targets: ['record-evidence', 'checkpoint-complete', 'evidence-example', 'evidence-submit'],
    title: 'Trigger today’s reveal with actual completion',
    body: 'Open Record evidence again. Fill example, check This checkpoint is complete, confirm every criterion, then Complete & unlock next. This is fictional practice only. Planned, blocked, wrong-edition or non-current work cannot bypass the normal guards.',
    check: ({ state }) => state.missions.fabric.mode === 'background' &&
      state.evidence.some(item => item.missionId === 'fabric' && item.completedCheckpoint),
  },
  {
    id: 'control-background-graph', chapter: 'control', kind: 'action', route: 'home', command: 'open-graph-rings',
    targets: ['graph-background-ring'], title: 'See the full mission for today, not forever',
    body: 'Choose Service Fabric in Rings. Its saved mode is still Background, but all its checkpoint detail is available today. Tomorrow’s local date collapses it again unless brought into focus; evidence and completion remain saved. Later adoption archives this v1 work, without crediting unrelated v3 checkpoints.',
    checkUi: root => !!root.querySelector('.career-orbit-inspector[data-orbit-id="orbit:mission:fabric"][data-mission-mode="background"]') &&
      [...root.querySelectorAll('.career-orbit-inspector .career-orbit-view-note')].some(item => item.textContent?.startsWith('Revealed for today')),
  },
  {
    id: 'focus-room-open', chapter: 'focus-room', kind: 'action', route: 'plan', command: 'close-dialogs',
    targets: ['focus-room-open'], title: 'Open the quiet focus room',
    body: 'Click Full screen focus. The timer stays readable in front of frosted glass, with a subdued 3D backdrop behind it. The tutorial opens a window-filling room; your saved workspace can also enter browser fullscreen.',
    checkUi: root => !!root.querySelector('dialog[data-tour="focus-room"][open]'),
  },
  {
    id: 'focus-room-run', chapter: 'focus-room', kind: 'action',
    targets: ['focus-room-toggle'], title: 'Start or continue the same timer',
    body: 'Use Start or Continue if the timer is not running. The room and compact timer share one countdown. Ambient motion and Core heartbeat control only the quiet background visuals, independently of the timer. They do not claim that an AI is processing work or record distractions for you.',
    check: ({ signals }) => signals.focusRunning,
  },
  {
    id: 'focus-room-report', chapter: 'focus-room', kind: 'action',
    targets: ['focus-room-distraction'], title: 'Record one example distraction',
    body: 'Click I got distracted once. This records a temporary tutorial report immediately, with its session, timestamp and elapsed timer time. Only a successful save increments the count; it is your report, not an automatic attention detector.',
    check: ({ state }) => !!state.focusSessions?.some(session => session.events.some(event => event.kind === 'distraction')),
  },
  {
    id: 'focus-room-data', chapter: 'focus-room', kind: 'explain',
    targets: ['focus-room-count'], title: 'Keep the data, not a judgment',
    body: 'The log retains presses, pause/resume transitions and session endings. Reset does not delete reports; timer activity earns no mission work day or completion. The backdrop keeps captured work. At midnight, old activity borders dim and temporary outside-focus checkpoint views collapse, even with Ambient motion off. Records are not deleted.',
  },
  {
    id: 'focus-room-close', chapter: 'focus-room', kind: 'action',
    targets: ['focus-room-close'], title: 'Leave the room without losing the session',
    body: 'Close the room. The compact timer keeps the same countdown and saved reports. Closing the browser tab stops the tab-local countdown, but records already saved remain in the workspace.',
    checkUi: root => !root.querySelector('dialog[data-tour="focus-room"][open]'),
  },
  {
    id: 'focus-room-history', chapter: 'focus-room', kind: 'action',
    targets: ['focus-history'], title: 'Find the saved focus log',
    body: 'Expand Focus history. Reports are included in normal Export backup / Import backup. Open records with no ending are labeled honestly rather than assumed completed. Tutorial history disappears when you exit practice.',
    checkUi: root => root.querySelector<HTMLDetailsElement>('[data-tour="focus-history"]')?.open === true,
  },
  ...sourceSteps,
  ...packPracticeSteps,
  {
    id: 'dsa-library', chapter: 'dsa-practice', kind: 'explain', route: 'dsa/5', command: 'close-dialogs',
    targets: ['dsa-library'],
    title: 'Find the full DSA practice sets',
    body: 'The expanded PDF is appended after the original HashMap track. All 50 source sections are browsable here. Source set placement and row difficulty are separate; some Foundation rows are Medium. Problems are curated practice, not a required solve-everything checklist.',
  },
  {
    id: 'dsa-library-section', chapter: 'dsa-practice', kind: 'action',
    targets: ['dsa-section'],
    title: 'Browse a later topic',
    body: 'Choose 09. Two Pointers in DSA source section. Browsing ahead does not unlock it or change your current checkpoint. Use the mission roadmap for execution order, not the PDF section numbers.',
    check: ({ route }) => route === 'dsa/9',
  },
  {
    id: 'dsa-library-filter', chapter: 'dsa-practice', kind: 'action', route: 'dsa/9',
    targets: ['dsa-problem-filters'],
    title: 'Inspect a manageable problem set',
    body: 'Choose Easy in Row difficulty. Open a problem on LeetCode when ready to practice. No solve is recorded by opening a link; genuine work is saved from the current mission checkpoint.',
    checkUi: root => root.querySelector<HTMLSelectElement>('[aria-label="Filter DSA problems by difficulty"]')?.value === 'Easy',
  },
  {
    id: 'dsa-notebook-companion', chapter: 'dsa-practice', kind: 'action', route: 'dsa/9',
    targets: ['dsa-notebook-companion'], title: 'Use a companion without creating another tracker',
    body: 'Expand NotebookLM companion. Coaching day numbers, R0 and its seven-day retention guidance are not synced CareerOS statuses. Put an actual session handoff in existing evidence and use Recall for closed-source attempts. The optional prompt is manual; this lesson makes no clipboard or AI request.',
    checkUi: root => !!root.querySelector('[data-tour="dsa-notebook-companion"][open]'),
  },
  {
    id: 'system-concepts-intro', chapter: 'system-concepts', kind: 'explain', route: 'system-concepts', command: 'close-dialogs',
    targets: ['system-concepts-intro'], title: 'The System Design concepts map',
    body: 'This is the supplied system-design.pdf concept roadmap, separate from the problems workbook and your saved tracker. All source branches are included. Cloud patterns ask for an overview, not mastery of every pattern. Full roadmap lets you switch between problems, concepts and saved progress.',
  },
  {
    id: 'system-concepts-search', chapter: 'system-concepts', kind: 'action',
    targets: ['system-concept-search'], title: 'Find a concept in its source context',
    body: 'Search for Circuit Breaker. The reliability section keeps both High Availability and Resiliency occurrences, because the source places it in both. Searching or reading does not complete a checkpoint.',
    checkUi: root => root.querySelector<HTMLInputElement>('[aria-label="Search System Design concepts"]')?.value.trim().toLowerCase() === 'circuit breaker',
  },
  {
    id: 'system-practice-intro', chapter: 'system-practice', kind: 'explain', route: 'system-practice/module-01',
    targets: ['system-practice-intro'], title: 'The problem-solving roadmap',
    body: 'SystemDesign_RoadMap.pdf supplies 72 modules, 15 case studies and eight diagnostics. Modules have practice tasks and transfer gates. Cases are an independently browsable practice bank, not required serial checkpoints. Browsing does not adopt this version or complete work.',
  },
  {
    id: 'system-practice-select', chapter: 'system-practice', kind: 'action',
    targets: ['system-practice-select'], title: 'Open a design module',
    body: 'Choose 52. Circuit Breakers. Read its practice tasks, then expand the transfer drills to see how the same concept changes under load or failure.',
    check: ({ route }) => route === 'system-practice/module-52',
  },
  {
    id: 'system-practice-transfer', chapter: 'system-practice', kind: 'action', route: 'system-practice/module-52',
    targets: ['system-transfer-drills'], title: 'Practice transfer, not memorization',
    body: 'Expand Change the constraints: transfer drills. The source asks you to adapt a design, explain failure behavior and defend a trade-off. Completing the reading is not the same as completing the module.',
    checkUi: root => root.querySelector<HTMLDetailsElement>('[data-tour="system-transfer-drills"]')?.open === true,
  },
  ...fullMapSteps,
  // Pipeline
  {
    id: 'pipeline-open', chapter: 'pipeline', kind: 'action', route: 'pipeline',
    targets: ['pipeline-add'], title: 'Open a career opportunity',
    body: 'Click Add opportunity. This is a manual tracker, not a job search or application service. Use only fictional details during this practice.',
    check: ({ signals }) => signals.opportunityOpen,
  },
  {
    id: 'pipeline-details', chapter: 'pipeline', kind: 'action', command: 'open-opportunity',
    targets: ['application-details'], title: 'Explore the optional application data',
    body: 'Click Fill example, then expand Application details. The example includes a lane, resume variant, minutes spent, and friction score. These are your observations, not an automatic fit score; they are optional in real use.',
    checkUi: root => root.querySelector<HTMLDetailsElement>('[data-tour="application-details"]')?.open === true &&
      ['lane', 'resumeVariant', 'effortMinutes', 'frictionScore'].every(name =>
        !!root.querySelector<HTMLInputElement | HTMLSelectElement>(`[data-tour="opportunity-form"] [name="${name}"]`)?.value),
  },
  {
    id: 'pipeline-add', chapter: 'pipeline', kind: 'action', route: 'pipeline',
    command: 'open-opportunity', targets: ['opportunity-example', 'opportunity-form'],
    title: 'Add an opportunity',
    body: 'Review the fictional form and click Add opportunity inside it. If you skipped the example step, Fill example supplies safe values. Saving tracks the lead; it does not apply for the role or complete a mission.',
    check: ({ state }) => state.opportunities.length >= 1,
  },
  {
    id: 'pipeline-stage', chapter: 'pipeline', kind: 'action',
    targets: ['opportunity-stage', 'pipeline-table'],
    title: 'Move a stage forward',
    body: "Change the first opportunity's stage to Recruiter.",
    check: ({ state }) => state.opportunities.some((item) => item.stage === 'Recruiter'),
  },
  {
    id: 'pipeline-table', chapter: 'pipeline', kind: 'explain',
    targets: ['pipeline-table'],
    title: 'Board and table views',
    body: 'Click Table for a compact list, or Board to group roles by stage. Both views edit the same opportunities; a stage change is recorded in History.',
  },
  {
    id: 'pipeline-metrics', chapter: 'pipeline', kind: 'action',
    targets: ['application-metrics'], title: 'Find the saved application details',
    body: 'Expand Resume variants, application lanes and effort. Your example lane, variant, minutes, and friction appear here. These remain manual observations; they do not raise readiness or complete a checkpoint.',
    checkUi: root => root.querySelector<HTMLDetailsElement>('[data-tour="application-metrics"]')?.open === true,
  },
  {
    id: 'freelance-add', chapter: 'freelance', kind: 'action', route: 'freelance',
    targets: ['freelance-example', 'freelance-add', 'freelance-save'],
    title: 'Research a freelance opportunity',
    body: 'Click Add opportunity, Fill example, then Save opportunity. This ledger records demand before applications; a saved lead is not completed career work.',
    check: ({ state }) => state.freelanceOpportunities.length > 0,
  },
  {
    id: 'freelance-classify', chapter: 'freelance', kind: 'action',
    targets: ['freelance-verdict'],
    title: 'Classify a lead',
    body: 'Choose Apply Now for the tutorial lead. Real verdicts are your judgment: Apply Now, a short ramp, a longer ramp, or Ignore. No application is sent automatically.',
    check: ({ state }) => state.freelanceOpportunities.some(item => item.verdict === 'Apply Now'),
  },
  {
    id: 'freelance-research-examples', chapter: 'freelance', kind: 'action',
    targets: ['freelance-research-examples', 'freelance-filters'], title: 'Practice with a research set',
    body: 'Click Fill research examples to bring this temporary ledger to ten fictional leads. This shortcut exists only in practice. The real sprint requires you to research and classify actual opportunities; no checkpoint is completed automatically.',
    check: ({ state }) => state.freelanceOpportunities.length >= 10,
  },
  {
    id: 'freelance-filters', chapter: 'freelance', kind: 'explain',
    targets: ['freelance-filters'], title: 'Narrow a research list',
    body: 'Try the platform and verdict filters. They hide rows, not delete them. Return both filters to All before selecting the five leads for your brief.',
  },
  {
    id: 'freelance-brief', chapter: 'freelance', kind: 'action',
    targets: ['freelance-select'], title: 'Select five leads',
    body: 'With both filters set to All, check five rows. The hand moves to the next unchecked row. Exactly five enables Copy brief. This selection is temporary and clears when you leave or reload the page.',
    checkUi: root => root.querySelector<HTMLButtonElement>('[data-tour="freelance-copy"]')?.disabled === false,
  },
  {
    id: 'freelance-copy', chapter: 'freelance', kind: 'action',
    targets: ['freelance-copy'], title: 'Copy the review brief',
    body: 'Click Copy brief. The text goes to your clipboard, not to an AI service. If clipboard access is blocked, copy the preview manually and use Skip step. A prepared brief is not a completed coach review or an application.',
    checkUi: root => !!root.querySelector('[data-tour="freelance-copy-success"]'),
  },
  // Readiness & interview mode
  {
    id: 'readiness-coding', chapter: 'readiness', kind: 'action', route: 'readiness', command: 'close-dialogs',
    targets: ['readiness-coding'],
    title: 'Self-assess readiness',
    body: "Select Building for Coding patterns. This is your own self-assessment; nothing automatically grades it.",
    check: ({ state }) => state.readiness['Coding patterns'] === 'building',
  },
  {
    id: 'readiness-interview-mode', chapter: 'readiness', kind: 'action', route: 'plan',
    targets: ['interview-mode'],
    title: 'Interview mode',
    body: 'Enable Interview mode to prioritize interview preparation. Refresh can rebuild an untouched plan; if you already logged work today, that plan stays intact and the change applies to a later fresh plan.',
    check: ({ state }) => state.interviewMode,
  },
  // Settings & backup
  {
    id: 'settings-goal', chapter: 'settings', kind: 'explain', route: 'settings',
    targets: ['goal-form'],
    title: 'Your objective',
    body: 'This optional text is a reminder for yourself. It does not change how missions or plans behave.',
  },
  {
    id: 'settings-export', chapter: 'settings', kind: 'action', route: 'settings',
    targets: ['backup-export'],
    title: 'Export an example backup',
    body: 'Click Export example to download a clearly labeled tutorial JSON file. This is not a backup of your real progress.',
    check: ({ signals }) => signals.exportCount > 0,
  },
  {
    id: 'settings-import', chapter: 'settings', kind: 'action',
    targets: ['backup-import', 'backup-input'],
    title: 'Import that backup',
    body: 'Click Import backup and choose the file you just downloaded, then confirm. Your file dialog may not be available in every environment; Skip is fine.',
    check: ({ signals }) => signals.importCount > 0,
  },
  {
    id: 'settings-reset', chapter: 'settings', kind: 'explain',
    targets: ['workspace-reset'],
    title: 'Fresh data and examples',
    body: 'Start a fresh workspace clears progress after confirmation; Reload sample replaces it with examples. Export before doing either in your real workspace. Here they only reset temporary tutorial data.',
  },
  // Persistence
  {
    id: 'persistence-explain', chapter: 'persistence', kind: 'explain', route: 'settings',
    targets: ['storage-info'],
    title: 'Where your data lives',
    body: 'Progress lives in this browser, not in a GitHub account. Refreshing the hosted site keeps compatible data; clearing site data can remove it. Our chat context is separate from website progress. Using the same URL on another machine does not synchronize records.',
  },
  {
    id: 'persistence-transfer', chapter: 'persistence', kind: 'explain',
    targets: ['backup-export', 'backup-import'], title: 'Move your real data between machines',
    body: 'Outside this tutorial, export the latest real backup from Settings & data, transfer it privately, then import it at zanark.github.io/CareerOS on the other machine. Export any destination progress first: import replaces, not merges. Carry the latest backup when switching back.',
  },
  {
    id: 'persistence-boundaries', chapter: 'persistence', kind: 'explain',
    targets: ['storage-info'], title: 'Know what a backup contains',
    body: 'Backups are unencrypted JSON records, including archived roadmap progress. They do not include the PDFs, linked code or diagram files, your theme preference, or this chat. Tutorial-example files are not real backups. Keep real exports private and out of GitHub.',
  },
  // Search, theme, print, help
  {
    id: 'tools-search', chapter: 'tools', kind: 'action', route: 'hq',
    targets: ['global-search'],
    title: 'Global search',
    body: 'Focus global search with Ctrl+K, or click it, then type DSA or a saved-work title. Click a result to open it. Opportunities are tracked on their own page, not in this search.',
    check: ({ signals }) => signals.searchQuery.trim().length > 0,
  },
  {
    id: 'tools-theme', chapter: 'tools', kind: 'action',
    targets: ['theme-switch'],
    title: 'Day and night theme',
    body: 'Click the theme toggle. The sun rises on the right/east and sets on the left/west; daytime has clouds and the page changes gradually. Reduced motion keeps things still. This practice preference is temporary and restores on exit.',
    check: ({ signals, enterTheme }) => signals.theme !== enterTheme,
  },
  {
    id: 'tools-print', chapter: 'tools', kind: 'explain', route: 'plan',
    targets: ['print-plan'],
    title: 'Printing your plan',
    body: "Print plan opens your browser's print dialog for today's actions. Try it now, or move on; it is optional.",
  },
  {
    id: 'tools-help', chapter: 'tools', kind: 'explain', route: 'guide',
    targets: ['help-guide'],
    title: 'Help and glossary',
    body: 'Search Help & glossary for a term such as mission, checkpoint, or work streak. Expand a topic to read its definition, then use its page link to open the relevant tool. You can return here for a refresher or restart this practice tutorial.',
  },
  // Finish
  {
    id: 'finish', chapter: 'finish', kind: 'explain',
    title: 'Back to your real workspace',
    body: 'You have covered the original tracking tools, document adoption, full maps, recall, application details, research briefs, and backup transfer. Continue to Discovery Atlas and Fieldcraft, or Exit to return to your real workspace. Practice examples are discarded; no real checkpoint, application, or machine transfer was completed by this tutorial.',
  },
  ...discoverySteps,
  ...fdeSteps,
];
