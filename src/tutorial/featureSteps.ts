import type { TutorialStep } from './steps';
import { getLatestMission } from '../domain/catalog';

const value = (root: Document, target: string) => root.querySelector<HTMLSelectElement>(`[data-tour="${target}"]`)?.value;
const expanded = (root: Document, target: string) => root.querySelector<HTMLDetailsElement>(`[data-tour="${target}"]`)?.open === true;

export const sourceSteps: TutorialStep[] = [
  {
    id: 'source-upgrades', chapter: 'sources', kind: 'explain', route: 'sources', command: 'close-dialogs',
    targets: ['operation-source'], title: 'Where the PDFs went',
    body: 'The PDFs supply built-in curricula, detailed study notes and exercises, not imported achievements. This page shows their sources and scope. No PDF upload is needed. Our temporary Service Fabric example uses an older tracker so you can safely practice adoption.',
  },
  {
    id: 'source-bulk-preview', chapter: 'sources', kind: 'action',
    targets: ['source-bulk-preview'], title: 'Review the all-roadmaps option',
    body: 'Click Adopt all documented roadmaps to open its review dialog, not to save. Read the version changes: only the verified DSA v2-to-v3 append carries its unchanged HashMap progress; other updates archive and start unconfirmed. Export a backup first in real use. We will cancel here to keep the separate Fabric adoption exercise. If all updates are already adopted, continue.',
    checkUi: root => !!root.querySelector('dialog.bulk-roadmap-modal[open]') ||
      root.querySelector<HTMLButtonElement>('.source-page-actions button')?.disabled === true,
  },
  {
    id: 'source-bulk-cancel', chapter: 'sources', kind: 'action',
    targets: ['source-bulk-cancel'], title: 'Cancel without changing any tracker',
    body: 'Click Cancel, not Confirm all roadmaps. In real use, confirmation saves every pending update together or none if the workspace changed or validation/storage fails. Prior plans and records stay; active/background modes remain and a newly available planned mission becomes background, never automatically active. Cancel keeps our older practice tracker untouched.',
    checkUi: root => !!root.querySelector('[data-tour="source-mission"]') &&
      !root.querySelector('dialog.bulk-roadmap-modal[open]'),
  },
  {
    id: 'source-select-fabric', chapter: 'sources', kind: 'action',
    targets: ['source-mission'], title: 'Choose an operation',
    body: 'Choose Service Fabric / Fabric Core in Mission. Compare Documented roadmap with Active tracker. These can differ because an update never silently reclassifies your saved position.',
    checkUi: root => value(root, 'source-mission') === 'fabric',
  },
  {
    id: 'source-preview', chapter: 'sources', kind: 'action',
    targets: ['source-preview', 'source-material'], title: 'Preview before switching',
    body: 'Open Preview documented roadmap before adopting. Review the new stages without changing anything. If you already adopted this example, its archive replaces the preview and you can continue.',
    checkUi: root => value(root, 'source-mission') === 'fabric' &&
      (expanded(root, 'source-preview') || !!root.querySelector('[data-tour="source-archive"]')),
  },
  {
    id: 'source-adopt', chapter: 'sources', kind: 'action',
    targets: ['source-adopt', 'operation-source'], title: 'Adopt the practice roadmap',
    body: 'Click Adopt documented roadmap and confirm. Only tutorial data changes. Your old position becomes a read-only archive; new checkpoints start unconfirmed. In real use, export a backup before switching.',
    check: ({ state }) => state.missions.fabric.roadmapVersion === getLatestMission('fabric').roadmapVersion,
  },
  {
    id: 'source-archive', chapter: 'sources', kind: 'action',
    targets: ['source-archive'], title: 'Find the preserved position',
    body: 'Expand Previous roadmap v1.0.0. This is the preserved old position, not credit toward different new topics. Historical work remains associated with its original version.',
    checkUi: root => expanded(root, 'source-archive'),
  },
  {
    id: 'source-stage', chapter: 'sources', kind: 'action',
    targets: ['roadmap-stage'], title: 'Browse another stage',
    body: 'Choose the last option in Roadmap stage. This changes the diagram you are inspecting, not your current checkpoint. Current stage returns to your saved position.',
    checkUi: root => {
      const select = root.querySelector<HTMLSelectElement>('[data-tour="roadmap-stage"]');
      return !!select && select.options.length > 1 && select.selectedIndex === select.options.length - 1;
    },
  },
  {
    id: 'source-topics', chapter: 'sources', kind: 'action',
    targets: ['roadmap-stage-topics'], title: 'Read the actual requirements',
    body: 'Expand Topics and completion criteria in this stage. These show the actual capability requirements. Detailed study material and exercises are linked separately; reading a checklist does not prove mastery.',
    checkUi: root => expanded(root, 'roadmap-stage-topics'),
  },
  {
    id: 'source-optional', chapter: 'sources', kind: 'action',
    targets: ['source-optional'], title: 'Optional does not mean locked',
    body: 'Choose Certifications in Mission, then select a Roadmap stage marked optional. These groups hold independent practice or reference material. Required credential-study modules remain tracked; booking or passing a paid exam is a separate decision.',
    checkUi: root => value(root, 'source-mission') === 'credential' &&
      !!root.querySelector<HTMLSelectElement>('[data-tour="roadmap-stage"]')?.selectedOptions[0]?.textContent?.includes('(optional)'),
  },
  {
    id: 'source-forecast', chapter: 'sources', kind: 'action',
    targets: ['source-mission'], title: 'See a former forecast become a curriculum',
    body: 'Choose Competitive programming / Algorithm Forge. The new complete source now defines six stages, checkpoints and contest practice. Older forecast-only trackers are preserved as separate versions; new curriculum is not invented progress or a promised completion date.',
    checkUi: root => value(root, 'source-mission') === 'algorithm',
  },
  {
    id: 'source-projects', chapter: 'sources', kind: 'explain', route: 'sources/neural',
    targets: ['source-projects'], title: 'Projects are supporting material',
    body: 'AI Engineering includes core modules plus independent cases, transfer drills and portfolio choices. A project list is not a list of completed builds. Open the source practice material, do the work, then record genuine evidence on the current tracker.',
  },
];

export const packPracticeSteps: TutorialStep[] = [
  {
    id: 'pack-open', chapter: 'pack-practice', kind: 'action', route: 'sources/fabric', command: 'close-dialogs',
    targets: ['pack-library-open'], title: 'Open the complete practice material',
    body: 'Click Practice library. Expanded mission workbooks have their own detailed study pages, separate from your saved checkpoint; browsing does not require adopting a new edition.',
    check: ({ route }) => route === 'practice/fabric' || route.startsWith('practice/fabric/'),
  },
  {
    id: 'pack-reference', chapter: 'pack-practice', kind: 'action', route: 'practice/fabric',
    targets: ['pack-unit-select'], title: 'Find independent practice and references',
    body: 'In Module, exercise bank or reference, choose an option ending in (practice) or (reference). Cases, supplemental labs and reference guides remain available without becoming extra required checkpoint gates.',
    checkUi: root => /\((practice|reference)\)$/.test(root.querySelector<HTMLSelectElement>('[data-tour="pack-unit-select"]')?.selectedOptions[0]?.textContent ?? ''),
  },
  {
    id: 'pack-exercises', chapter: 'pack-practice', kind: 'explain', route: 'practice/fabric',
    targets: ['pack-exercises', 'pack-study-unit'], title: 'Work through real source tasks',
    body: 'Each unit retains its concepts, worked reasoning, practice prompts, transfer questions and source pages. Try a task before opening its evidence check. When a source omits a scenario or fixture, that limitation is stated rather than disguised as a supplied problem or solution.',
  },
  {
    id: 'pack-guide', chapter: 'pack-practice', kind: 'action',
    targets: ['pack-shared-guide'], title: 'Find the shared learning rules',
    body: 'Expand Study & review guide. Shared practice levels, diagnostic rubrics and retention guidance are factored here rather than copied into every lesson. The source capability labels are not automatically calculated app statuses.',
    checkUi: root => expanded(root, 'pack-shared-guide'),
  },
  {
    id: 'pack-gate', chapter: 'pack-practice', kind: 'explain',
    targets: ['pack-mastery'], title: 'Evidence moves the tracker; reading does not',
    body: 'Use the source mastery evidence and recovery guidance to decide what needs another attempt. Return to the saved mission to record actual work. This browser does not grade your answer, run a lab or award a credential.',
  },
];

export const fullMapSteps: TutorialStep[] = [
  {
    id: 'full-map-open', chapter: 'full-map', kind: 'action', route: 'mission/fabric', command: 'close-dialogs',
    targets: ['full-roadmap-open'], title: 'Open the entire mission',
    body: 'Click Full roadmap beside the mission name. The complete current curriculum is visible even when your saved tracker is older. My saved tracker shows your genuine older position; previewing does not adopt a new version.',
    check: ({ signals }) => signals.fullRoadmapOpen,
  },
  {
    id: 'full-map-zoom', chapter: 'full-map', kind: 'action', command: 'open-roadmap',
    targets: ['full-map-zoom-in'], title: 'Zoom into the overview',
    body: 'Click + to zoom in; - zooms out. Fit all is a whole-map overview, not large text on every screen. The percentage shows your zoom, and 100% gives normal-size text.',
    checkUi: root => root.querySelector('[data-tour="full-map-fit"]')?.getAttribute('aria-pressed') === 'false',
  },
  {
    id: 'full-map-inspect', chapter: 'full-map', kind: 'action', command: 'open-roadmap',
    targets: ['full-map-last-node'], title: 'Inspect without advancing',
    body: 'Click the highlighted later checkpoint. Its action and criteria open below; if you hid the panel, click Show details. Hide details gives the graph more room and stays hidden while you browse. Inspecting never completes work or moves your saved checkpoint.',
    checkUi: root => !!root.querySelector('.full-roadmap-inspector[data-expanded="true"]') &&
      !!root.querySelector('.full-roadmap-node[aria-pressed="true"]:not([aria-current="step"])'),
  },
  {
    id: 'full-map-current', chapter: 'full-map', kind: 'action', command: 'open-roadmap',
    targets: ['full-map-current', 'full-map-version'], title: 'Find your glowing checkpoint',
    body: 'Click Current checkpoint. If you are viewing a newer curriculum preview, choose My saved tracker first. The view centers on your actual saved step at readable size; a preview never invents a current-step glow. Reduced motion keeps the highlight still.',
    checkUi: root => !!root.activeElement?.matches('.full-roadmap-node[aria-current="step"]'),
  },
  {
    id: 'full-map-pan', chapter: 'full-map', kind: 'explain', command: 'open-roadmap',
    targets: ['full-map-canvas'], title: 'Move around a large map',
    body: 'Drag empty canvas space with a mouse, scroll, or swipe on a touch screen. With the canvas focused, arrow keys also scroll. These movements affect only the view, never your progress.',
  },
  {
    id: 'full-map-fit', chapter: 'full-map', kind: 'action', command: 'open-roadmap',
    targets: ['full-map-fit'], title: 'Bring every stage back',
    body: 'Click Fit all to see the entire map again. Optional and forecast sections stay visible without fake completion nodes. A fully completed mission has no current-step glow.',
    checkUi: root => root.querySelector('[data-tour="full-map-fit"]')?.getAttribute('aria-pressed') === 'true',
  },
  {
    id: 'full-map-close', chapter: 'full-map', kind: 'action',
    targets: ['dialog-close'], title: 'Return to the mission',
    body: 'Close the map with its top-right X or Escape. You return to the mission and the Full roadmap button. No checkpoint, evidence, or saved position has changed.',
    check: ({ signals }) => !signals.fullRoadmapOpen,
  },
];
