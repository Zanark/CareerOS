import type { TutorialStep } from './steps';
import { cameraChanged, graphSkillCheckpointTitle, graphToggle, rangeIs, toggleIs } from './graphControls';

const view = { route: 'home', command: 'open-graph-view' } as const;
const closed = { route: 'home', command: 'close-dialogs' } as const;
const checked = (label: string, value: boolean) => (root: Document) => toggleIs(root, label, value);
const toggle = (id: string, chapter: string, label: string, value: boolean, title: string, body: string): TutorialStep => ({
  id, chapter, kind: 'action', ...view, targets: [`graph-toggle:${label}`], title, body, checkUi: checked(label, value),
});
const camera = (id: string, target: string, selector: string, title: string, body: string): TutorialStep => ({
  id, chapter: 'graph-camera', kind: 'action', ...closed, targets: [target], title,
  body: `${body} If 3D is unavailable, use Skip step; unavailable graphics never count as a completed camera exercise.`,
  uiAction: { selector, event: 'click' }, checkUi: cameraChanged,
});

export const graphSteps: TutorialStep[] = [
  {
    id: 'career-graph-intro', chapter: 'career-graph', kind: 'explain', ...closed,
    targets: ['career-graph-summary'], title: 'Read real work, not decorative activity',
    body: 'Green means a checkpoint was marked complete, including archived work; orange means unfinished. Hubs and records retain identity colors. The white core, sparks and ten-second ripple do not mean AI is working. View, Rings, Nodes and Work open panels without shrinking the graph. Everything here uses temporary practice data.',
  },
  {
    id: 'career-graph-orbits', chapter: 'career-graph', kind: 'explain',
    targets: ['career-graph-orbits'], title: 'Start with focused missions',
    body: 'Only in-focus mission rings start on. Other missions keep isolated hubs, without checkpoint clouds, links or tethers. Actual checkpoint completion outside focus reveals that whole mission for today, then collapses tomorrow. Partial evidence or recall lights today’s border and counts a work day, but never triggers that reveal. Modes never change automatically.',
  },
  {
    id: 'graph-pause', chapter: 'career-graph', kind: 'action', ...closed,
    targets: ['graph-pause'], title: 'Pause motion for a clear inspection',
    body: 'Click Pause animation before trying the detailed view controls. This pauses ambience, not a focus timer or your work. Reduced motion may already start paused. Resume explicitly opts into motion; a new reduced-motion preference revokes it. Auto-rotate is a separate camera preference. Without 3D, use Skip rather than claiming motion was tested.',
    checkUi: root => {
      const control = root.querySelector<HTMLButtonElement>('.career-graph-controls button[aria-label="Resume animation"]');
      return !!control && !control.disabled && control.getAttribute('aria-pressed') === 'true';
    },
  },
  {
    ...toggle('career-graph-checkpoints-hide', 'career-graph', 'Checkpoints', false,
      'Hide the checkpoint layer', 'Uncheck Checkpoints. Tracked, archived and untracked curriculum checkpoints disappear; mission hubs, records and rings remain. Nothing is deleted and framing stays stable. If you revisited with Show everything on, turn that override off first.'),
    targets: ['career-graph-checkpoints'],
  },
  {
    ...toggle('career-graph-checkpoints-show', 'career-graph', 'Checkpoints', true,
      'Restore checkpoints', 'Check Checkpoints again. References, focus, mission scope and individual choices still apply. These are temporary view settings, not backup fields. Explicit member reveal can restore a needed layer but never switches Sparks on.'),
    targets: ['career-graph-checkpoints'],
  },
  {
    id: 'graph-labels-hide', chapter: 'graph-view', kind: 'action', ...view,
    targets: ['graph-labels'], title: 'Hide only the text labels',
    body: 'Uncheck Labels beside the graph counts. The dots, rings, picking and inspector remain. First turn off Show everything if it is on. We will use this hidden-label setting to test exact restoration.',
    checkUi: checked('Node labels', false),
  },
  {
    id: 'graph-everything-on', chapter: 'graph-view', kind: 'action', ...view,
    targets: ['graph-everything'], title: 'Temporarily show the whole workspace',
    body: 'Check Show everything. All mission rings, current/reference/archived-complete nodes and stored work appear, including Fieldcraft and unfinished past and future planned actions. Collections are still not rings. Focus, item hides, layers and Labels are overridden and locked; spacing, camera, motion and spark amount remain yours. No mode or status changes.',
    checkUi: root => toggleIs(root, 'Show everything', true) &&
      graphToggle(root, 'Node labels')?.checked === true && graphToggle(root, 'Node labels')?.disabled === true,
  },
  {
    id: 'graph-everything-off', chapter: 'graph-view', kind: 'action', ...view,
    targets: ['graph-everything'], title: 'Restore your previous view',
    body: 'Uncheck Show everything. Your exact earlier scope, layers, ring/item choices, Labels and Clear center return—not fresh defaults. In this sequence Labels becomes hidden again. “Everything” means data coverage, not 100% sparks; the chosen particle amount and motion preferences stay unchanged.',
    checkUi: checked('Show everything', false),
  },
  {
    id: 'graph-labels-show', chapter: 'graph-view', kind: 'action', ...view,
    targets: ['graph-labels'], title: 'Restore readable labels',
    body: 'Check Labels again. In a crowded view you can hide text without hiding work. Every graph preference lasts only while this page is open; leaving the graph starts a fresh view next time.',
    checkUi: checked('Node labels', true),
  },
  {
    id: 'graph-spacing-spread', chapter: 'graph-view', kind: 'action', ...view,
    targets: ['graph-spacing'], title: 'Make the node spread visibly wider',
    body: 'Move Node spacing all the way right to 300. Compare the actual node gaps, not just the slider label. Relative spread unfolds crowded mission clouds into mission/stage neighborhoods, not a distance multiplier or uniform zoom. Frame all retains that organization; another rotation can still overlap nodes.',
    checkUi: root => rangeIs(root, 'Node spacing', 300),
  },
  {
    id: 'graph-spacing-reset', chapter: 'graph-view', kind: 'action', ...view,
    targets: ['graph-spacing'], title: 'Return to the original spacing',
    body: 'Move Node spacing all the way left to 100. Layout resets from the original positions, not the last spread. IDs, saved statuses, relationships and workspace records have not changed.',
    checkUi: root => rangeIs(root, 'Node spacing', 100),
  },
  {
    id: 'graph-records-references-hide', chapter: 'graph-view', kind: 'action', ...view,
    targets: ['graph-toggle:Work records', 'graph-toggle:References'], title: 'Separate work records from reference material',
    body: 'Uncheck both Work records and References. Work records covers daily actions, evidence, applications, freelance leads and past accomplishments. Reference means notes or curriculum you have not adopted—not failed work or an extra required checkpoint. Mission hubs remain.',
    checkUi: root => toggleIs(root, 'Work records', false) && toggleIs(root, 'References', false),
  },
  {
    id: 'graph-records-references-show', chapter: 'graph-view', kind: 'action', ...view,
    targets: ['graph-toggle:Work records', 'graph-toggle:References'], title: 'Restore both kinds of context',
    body: 'Check Work records and References again. Saved work, Pipeline, Freelance and Keep going retain their own pages; none becomes a collection ring. Older completed checkpoints stay historical, never credit toward different new curriculum.',
    checkUi: root => toggleIs(root, 'Work records', true) && toggleIs(root, 'References', true),
  },
  toggle('graph-shared-hide', 'graph-view', 'Shared skill links', false, 'Hide only cross-curriculum comparisons',
    'Uncheck Shared skill links. Only curated cross-mission skill lines disappear; structural, evidence and study-sequence links remain. A comparison is not a prerequisite or equivalent mastery.'),
  toggle('graph-shared-show', 'graph-view', 'Shared skill links', true, 'Bring back the real connection reasons',
    'Check Shared skill links again. Later we will open Connections and Curriculum basis to read the actual reasons and both sources, rather than guessing meaning from a line.'),
  toggle('graph-rings-hide', 'graph-motion', 'Rings', false, 'Rings and Sparks are independent',
    'Uncheck Rings in View. Mission paths, ring dots and tethers disappear; work nodes and their real connections remain. Sparks stay on at their chosen amount. Turn Show everything off first if these controls are locked.'),
  toggle('graph-sparks-hide', 'graph-motion', 'Sparks', false, 'Hide the decorative particles too',
    'Uncheck Sparks. Both Spark dots and Spark lines disappear and both sliders disable, retaining their independent amounts. The core glow and real work stay. Neither amount is a progress percentage.'),
  toggle('graph-rings-show', 'graph-motion', 'Rings', true, 'Restore rings without restoring sparks',
    'Check Rings. Sparks should still be unchecked. Active missions use moving outer rings; optional background/planned rings stay small, stationary and in their own mission hue. Ring selection highlights the entire circumference.'),
  toggle('graph-sparks-show', 'graph-motion', 'Sparks', true, 'Restore the same particle amount',
    'Check Sparks. Both sliders enable with their remembered amounts. Dots and short lines each default to 10%; each ranges from 0 to 100%. Full density restores decorative geometry, not additional work.'),
  {
    id: 'graph-spark-amount', chapter: 'graph-motion', kind: 'action', ...view,
    targets: ['graph-spark-amount'], title: 'Choose a calmer or denser spark field',
    body: 'Set Spark dots to 35, leaving Spark lines at 10. Use arrow keys for 5-point changes. Zero hides dots only; it does not hide lines or change the master Sparks choice. Real work counts never change.',
    checkUi: root => rangeIs(root, 'Spark dots', 35) && rangeIs(root, 'Spark lines', 10),
  },
  {
    id: 'graph-spark-lines', chapter: 'graph-motion', kind: 'action', ...view,
    targets: ['graph-spark-lines'], title: 'Control spark lines separately from dots',
    body: 'Set Spark lines to 35, leaving Spark dots at 35. These short decorative traces are not orange work connections, ring membership or evidence. The two amounts are independent under Sparks; neither adds graph nodes or relationships.',
    checkUi: root => rangeIs(root, 'Spark dots', 35) && rangeIs(root, 'Spark lines', 35),
  },
  {
    id: 'graph-spark-reset', chapter: 'graph-motion', kind: 'action', ...view,
    targets: ['graph-spark-amount', 'graph-spark-lines'], title: 'Restore both 10% defaults',
    body: 'Set Spark dots and Spark lines back to 10. Resizing or switching Sparks off and on retains each chosen amount. Show everything does not force either to 100%.',
    checkUi: root => rangeIs(root, 'Spark dots', 10) && rangeIs(root, 'Spark lines', 10),
  },
  toggle('graph-autorotate-off', 'graph-motion', 'Auto-rotate', false, 'Stop the camera, not the animation',
    'Uncheck Auto-rotate. This stops camera orbit only; mission motion, sparks and the heartbeat can continue. Zooming, dragging or inspecting also does not silently pause animation. Without WebGL this disabled camera control must be skipped.'),
  toggle('graph-heartbeat-off', 'graph-motion', 'Core heartbeat', false, 'Separate the heartbeat from saved progress',
    'Uncheck Core heartbeat. It is a ten-second outward-and-back mesh ripple from the white core, not an AI indicator or evidence of completion. Pause and reduced motion suppress it; quiet background rings stay stationary.'),
  {
    id: 'graph-clear-center', chapter: 'graph-motion', kind: 'action', ...view,
    targets: ['graph-clear-center'], title: 'Try the optional clear-center view',
    body: 'Restore Core heartbeat, then click Clear center so it is pressed. The heartbeat stays still while paused. Clear center hides ring paths across the camera’s center, not work nodes, anchors or tethers. Rings must be on and Show everything off. If 3D is unavailable, Skip.',
    checkUi: root => {
      const control = root.querySelector<HTMLButtonElement>('.career-graph-filters button[title^="Hide ring paths"]');
      return toggleIs(root, 'Core heartbeat', true) && !!control && !control.disabled && control.getAttribute('aria-pressed') === 'true';
    },
  },
  {
    id: 'graph-ring-select', chapter: 'graph-rings', kind: 'action', route: 'home', command: 'open-graph-rings',
    targets: ['graph-ring-select'], title: 'Inspect a mission ring without changing focus',
    body: 'Choose DSA in Rings. Every mission is listed, including hidden rings and Fieldcraft; there are no collection rings. Each mission has its own hue matching Missions. The dot border brightens for recorded work today, not automatic mastery.',
    checkUi: root => !!root.querySelector('.career-orbit-inspector[data-orbit-id="orbit:mission:pattern"]'),
  },
  {
    id: 'graph-ring-speed', chapter: 'graph-rings', kind: 'action', ...closed,
    targets: ['graph-ring-speed'], title: 'Set this ring’s speed, not every ring’s',
    body: 'Set DSA’s Rotation speed to 200 using 10-point increments. Resume animation if you want to compare movement. Each active mission ring has its own setting: 0 freezes only that ring, 100 is normal, 300 is triple speed. Global Pause and reduced motion still win. Background/planned rings stay stationary with this slider disabled.',
    checkUi: root => rangeIs(root, 'Rotation speed', 200),
  },
  {
    id: 'graph-ring-speed-reset', chapter: 'graph-rings', kind: 'action', ...closed,
    targets: ['graph-ring-speed'], title: 'Restore the selected ring’s normal rate',
    body: 'Return Rotation speed to 100. Other rings and camera Auto-rotate are unaffected. This preference is only for the current graph view and never changes a mission’s focus mode, work streak or checkpoint status.',
    checkUi: root => rangeIs(root, 'Rotation speed', 100),
  },
  {
    id: 'graph-ring-stage', chapter: 'graph-rings', kind: 'action', ...closed,
    targets: ['graph-ring-stage'], title: 'Inspect one saved-edition stage',
    body: 'Choose the first named Stage instead of Whole orbit. The whole circle stays highlighted; detailed tethers narrow to this stage’s actual members. Stage selection is a view, never a checkpoint advance. If needed, reopen Rings and select DSA first.',
    checkUi: root => {
      const control = root.querySelector<HTMLSelectElement>('select[aria-label="Orbit stage or record group"]');
      return !!control?.value && control.selectedIndex === 1;
    },
  },
  {
    id: 'graph-ring-basis', chapter: 'graph-rings', kind: 'action', ...closed,
    targets: ['graph-ring-basis'], title: 'Check what the ring actually measures',
    body: 'Expand What this ring means. Progress is based on this saved tracker edition, not unadopted curriculum or archive equivalence. Tethers mean membership, not prerequisites. Visible/total member counts distinguish hidden work from an empty stage.',
    checkUi: root => !!root.querySelector('.career-orbit-basis[open]'),
  },
  {
    id: 'graph-ring-members', chapter: 'graph-rings', kind: 'action', ...closed,
    targets: ['graph-ring-members', 'graph-ring-search'], title: 'Search within the selected stage',
    body: 'Expand Connected members, then type HashMap in Find a member. You can inspect a named member without precise 3D picking, even when WebGL is unavailable. This list is the actual selected stage, not a second tracker.',
    checkUi: root => !!root.querySelector('.career-orbit-member-details[open]') &&
      root.querySelector<HTMLInputElement>('input[aria-label="Search orbit members"]')?.value.toLowerCase() === 'hashmap',
  },
  {
    ...camera('graph-focus-ring', 'graph-focus-ring', 'button[aria-label="Focus ring"]', 'Frame the selected ring',
      'Click Focus ring. The camera approaches this ring/stage without changing focus mode. Enable Rings and its DSA item if you hid them.'),
    chapter: 'graph-rings',
  },
  {
    id: 'graph-ring-current', chapter: 'graph-rings', kind: 'action', ...closed,
    targets: ['graph-ring-current'], title: 'Inspect the saved current checkpoint',
    body: 'Click Current checkpoint in the ring details. The named node inspector shows the real saved position and related page. Record evidence opens the normal criteria form; merely choosing a node cannot complete it.',
    checkUi: root => !!root.querySelector('.career-graph-inspector:not([hidden]) .career-graph-current'),
  },
  {
    id: 'graph-connections', chapter: 'graph-rings', kind: 'action', route: 'home', command: 'open-graph-search',
    targets: ['graph-skill-connection'], title: 'Read a connection’s actual meaning',
    body: `In Work, search HashMap and select “${graphSkillCheckpointTitle}”, then expand Connections. Compare Shared skill with Contains, Study sequence, Saved evidence and Related missions. Orange lines have real endpoints and reasons; shared skills never create extra completion gates.`,
    checkUi: root => !!root.querySelector('.career-graph-connections[open] [data-connection-kind="shared-skill"]'),
  },
  {
    id: 'graph-connection-sources', chapter: 'graph-rings', kind: 'action', ...closed,
    targets: ['graph-connection-source'], title: 'Verify the curriculum basis',
    body: 'Expand Curriculum basis under a Shared skill reason. Both source references identify the exact curriculum comparison. These are editorial capability links, not a source claim that mastering one mission completes the other.',
    checkUi: root => !!root.querySelector('.career-graph-connections[open] .career-graph-connection-reason details[open]'),
  },
  {
    id: 'graph-hidden-inspect', chapter: 'graph-rings', kind: 'action', ...closed,
    targets: ['graph-hidden-connection'], title: 'Inspect hidden work without activating it',
    body: 'Choose Reveal and inspect for an outside-view connection. Needed item/layer filters may open, but an out-of-focus checkpoint stays details-only. No hidden checkpoint cloud, completion or mission activation is invented. If you changed the view so all peers show, Inspect is still read-only; Skip this hidden-peer exercise.',
    checkUi: root => [...root.querySelectorAll('.career-graph-inspector:not([hidden]) .career-graph-node-context')]
      .some(element => element.textContent?.startsWith('Details only:')),
  },
  {
    id: 'career-graph-visibility', chapter: 'graph-nodes', kind: 'explain', route: 'home', command: 'open-graph-visibility',
    targets: ['career-graph-visibility'], title: 'Choose groups and individual items',
    body: 'Nodes has batch groups plus searchable individual choices, including the core. A mixed checkbox means some members are chosen. Shared memberships update together. These choices hide presentation only, never delete records. If Show everything is on, turn it off in View before editing choices.',
  },
  {
    id: 'graph-group-hide', chapter: 'graph-nodes', kind: 'action', route: 'home', command: 'open-graph-visibility',
    targets: ['graph-group'], title: 'Hide one mission group',
    body: 'Uncheck the DSA group. Its mission ring and members are excluded together. Record groups select nodes only, never collection rings. Clear all items can hide even the core; the chooser remains available to recover.',
    checkUi: root => {
      const control = root.querySelector<HTMLInputElement>('[data-visibility-group="mission:pattern"] input');
      return !!control && !control.disabled && !control.checked && !control.indeterminate;
    },
  },
  {
    id: 'graph-individual-search', chapter: 'graph-nodes', kind: 'action', route: 'home', command: 'open-graph-visibility',
    targets: ['graph-individuals', 'graph-visibility-search'], title: 'Find an item even while hidden',
    body: 'Expand Individual nodes and rings. Type HashMap in Find an item. This searches the full source catalog, unlike Work’s current-view list. Item type can narrow to nodes or ring views; Show more items extends the list.',
    checkUi: root => !!root.querySelector('.career-visibility-items[open]') &&
      root.querySelector<HTMLInputElement>('input[aria-label="Search visibility items"]')?.value.toLowerCase() === 'hashmap',
  },
  {
    id: 'graph-individual-mixed', chapter: 'graph-nodes', kind: 'action', route: 'home', command: 'open-graph-visibility',
    targets: ['graph-individual'], title: 'Restore one item and see mixed selection',
    body: 'Check one HashMap checkpoint, not the whole group. DSA now has a mixed checkbox. A chosen item may still say Hidden by another filter: focus, mission scope and layers are separate. Choosing a background checkpoint cannot bypass focus policy.',
    checkUi: root => {
      const group = root.querySelector<HTMLInputElement>('[data-visibility-group="mission:pattern"] input');
      return !!group && !group.disabled && group.indeterminate &&
        !!root.querySelector('.career-visibility-items [data-visibility-item^="checkpoint:pattern:"] input:checked');
    },
  },
  {
    id: 'graph-select-all', chapter: 'graph-nodes', kind: 'action', route: 'home', command: 'open-graph-visibility',
    targets: ['graph-select-all'], title: 'Select all is not Show everything',
    body: 'Click Select all items. This restores item choices—including every mission ring—but still obeys focus, mission scope and layers. It does not reveal all background checkpoints. Only View → Show everything temporarily overrides all those filters; turning it off restores the previous choices.',
    uiAction: { selector: '.career-visibility-actions button:first-child', event: 'click' },
    checkUi: (root, observation) => observation?.interacted === true &&
      [...root.querySelectorAll<HTMLInputElement>('.career-visibility-groups input')].every(input => input.disabled || (input.checked && !input.indeterminate)) &&
      !!root.querySelector('.career-visibility-groups input'),
  },
  {
    id: 'career-graph-search', chapter: 'graph-camera', kind: 'action', route: 'home', command: 'open-graph-search',
    targets: ['career-graph-search'], title: 'Find a named node without 3D picking',
    body: 'Type HashMap in Find your work. Work searches nodes in the current view; Nodes searches every source item. Clear restrictive filters if no result appears. Both lists work without WebGL; unavailable rendering never implies your work is missing.',
    checkUi: root => root.querySelector<HTMLInputElement>('[aria-label="Search career graph nodes"]')?.value.trim().toLowerCase() === 'hashmap',
  },
  {
    id: 'career-graph-select', chapter: 'graph-camera', kind: 'action', route: 'home', command: 'open-graph-search',
    targets: ['career-graph-list'], title: 'Choose a checkpoint from the list',
    body: 'Choose a named HashMap checkpoint. Its saved status and related page appear. This closes Work without resizing the graph. The camera exercises need actual WebGL; the named inspector remains useful without it.',
    checkUi: root => !!root.querySelector('[data-tour="career-graph-list"] button[aria-pressed="true"]'),
  },
  camera('graph-focus-node', 'graph-focus-node', 'button[aria-label="Focus node"]', 'Frame the selected node',
    'Click Focus node. It moves the camera to the selected visible node, not your primary mission. If you returned from another page, select a HashMap node in Work again.'),
  camera('graph-zoom', 'graph-zoom', 'button[aria-label="Zoom career graph in"]', 'Change the camera distance',
    'Click + to zoom in. Minus zooms out; scrolling or pinching also zooms. The cursor bends line interiors while endpoints stay attached; that visual response becomes gentler as you approach.'),
  {
    id: 'graph-rotate', chapter: 'graph-camera', kind: 'action', ...view,
    targets: ['graph-keyboard', 'graph-rotate'], title: 'Rotate with accessible controls',
    body: 'Expand Keyboard rotation controls, then click Rotate left. On the canvas, arrow keys rotate, +/− zoom and Home frames all. Drag empty canvas with a mouse or touch to orbit in real 3D. Auto-rotate and Pause animation remain separate. Without WebGL, Skip.',
    uiAction: { selector: '.career-graph-keyboard button', event: 'click' },
    checkUi: cameraChanged,
  },
  {
    id: 'graph-drag', chapter: 'graph-camera', kind: 'action', ...closed,
    targets: ['graph-canvas'], title: 'Drag the real 3D scene',
    body: 'If node details are open, close them with the highlighted X first. Then drag uncovered canvas sideways and release. Move or collapse this coach if you need more room. A click without movement does not finish this exercise. Canvas arrow keys rotate; Home frames all. Without 3D, use Skip.',
    uiAction: { selector: '.career-graph-page canvas', event: 'pointerup' },
    checkUi: cameraChanged,
  },
  camera('graph-frame', 'graph-frame', '.career-graph-frame', 'Recover the whole graph',
    'Click Frame all to restore the whole-view camera and clearest starting angle after zoom, rotation or node focus. It respects your current visibility choices without resetting them.'),
  {
    id: 'graph-fullscreen', chapter: 'graph-camera', kind: 'action', ...closed,
    targets: ['graph-fullscreen'], title: 'Give the graph the full screen',
    body: 'Click Full screen. Panels remain accessible and bounded inside the graph; the tutorial follows into fullscreen. Unsupported or denied fullscreen is not success—use Skip. No workspace field changes.',
    checkUi: root => root.fullscreenElement?.matches('.career-graph-stage-wrap') === true,
  },
  {
    id: 'graph-fullscreen-exit', chapter: 'graph-camera', kind: 'action',
    targets: ['graph-fullscreen'], title: 'Return from fullscreen',
    body: 'Click Exit full screen or use the browser’s Escape key. Your selected node and view preferences remain. If you skipped entering fullscreen, you can continue; that does not mark the previous exercise successful.',
    checkUi: root => !!root.querySelector('.career-graph-stage-wrap') && !root.fullscreenElement,
  },
  {
    id: 'graph-brief', chapter: 'graph-camera', kind: 'explain', ...view,
    targets: ['graph-brief'], title: 'A manual handoff, never an AI connection',
    body: 'Copy brief for AI prepares saved-edition context and the selected item for your clipboard. It does not call a model, upload data or grade work. Review before sharing. No copy is required in this lesson; a denied clipboard write must show an error, not success.',
  },
];
