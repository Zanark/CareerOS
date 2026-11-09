import type { TutorialStep } from './steps';

export const discoverySteps: TutorialStep[] = [
  {
    id: 'discovery-intro', chapter: 'discovery', kind: 'explain', route: 'discoveries', command: 'close-dialogs',
    targets: ['discovery-intro'], title: 'A final chapter: your Discovery Atlas',
    body: 'This optional collection reveals hidden discoveries from evidence and recall you actually save. It is not a career level or a measure of mastery. Your earlier tools and completion criteria are unchanged. Everything in this tutorial remains temporary; use Chapter to return directly to this final section later.',
  },
  {
    id: 'discovery-example', chapter: 'discovery', kind: 'action',
    targets: ['discovery-example'], title: 'Load a safe collection to explore',
    body: 'Click Load discovery example. It replaces only the current tutorial examples with fictional past evidence and spaced recalls, so you can see both discovered and hidden signals without waiting. The running practice timer is discarded. Your real workspace, journal and theme preference remain untouched.',
    check: ({ signals }) => signals.discoveryExampleCount > 0,
  },
  {
    id: 'discovery-map', chapter: 'discovery', kind: 'explain',
    targets: ['discovery-map'], title: 'Read the light, not a fictional score',
    body: 'Each star represents one of 24 finite discoveries. Lit stars have qualifying saved records. The four families concern tangible work, depth, recall and nonconsecutive recorded days; their lines group discoveries, not prerequisites. The percentage is collection completion only. Existing real records can reveal discoveries immediately when you first open the atlas.',
  },
  {
    id: 'discovery-character', chapter: 'discovery', kind: 'explain',
    targets: ['wayfinder-panel'], title: 'A little RPG, built around your actual records',
    body: 'Your low-poly Wayfinder lives on a real isometric 3D diorama. Seven collection levels bring distinct scenery, equipment, relics and chapters. Earned equipment stays on the character. Every discovery supplies 100 cosmetic collection EXP; clicking, replaying and leaving the page open supply none. These are fictional character levels, never a rating of your career or readiness.',
  },
  {
    id: 'discovery-character-orbit', chapter: 'discovery', kind: 'action',
    targets: ['wayfinder-viewer'], title: 'Turn the whole diorama',
    body: 'Drag to orbit the character and its actual 3D surroundings together. On a keyboard, focus the canvas and press an arrow key. Scroll, pinch or use plus/minus to zoom. Rotate away from the starting isometric angle to continue. The viewer stays still when you stop. If 3D is unavailable, read the explicit notice and use Skip step.',
    checkUi: root => Number(root.querySelector('[data-tour="wayfinder-viewer"]')?.getAttribute('data-orbit-offset') ?? '0') > .01,
  },
  {
    id: 'discovery-diorama-move', chapter: 'discovery', kind: 'action',
    targets: ['wayfinder-pan-mode', 'wayfinder-viewer'], title: 'Move the diorama without rotating it',
    body: 'Click Move diorama, the four-arrow button. Now a one-finger or left-mouse drag moves the whole view instead of rotating. On the focused canvas, Shift plus an arrow key moves it too; right-mouse drag also works. Move away from the initial position to continue. These are camera choices only, never progress or saved workspace data.',
    checkUi: root => root.querySelector('[data-tour="wayfinder-viewer"]')?.getAttribute('data-control-mode') === 'move' &&
      Number(root.querySelector('[data-tour="wayfinder-viewer"]')?.getAttribute('data-pan-offset') ?? '0') > .02,
  },
  {
    id: 'discovery-character-reset', chapter: 'discovery', kind: 'action',
    targets: ['wayfinder-reset-view'], title: 'Return to the original view',
    body: 'Click Reset diorama view, the circular-arrow button inside the scene. Home on the focused canvas works too. This restores the isometric camera, position, zoom and rotation mode, not EXP, equipment, discoveries or real progress. Manual controls remain available with reduced motion.',
    checkUi: root => Number(root.querySelector('[data-tour="wayfinder-viewer"]')?.getAttribute('data-reset-count') ?? '0') > 0 &&
      root.querySelector('[data-tour="wayfinder-viewer"]')?.getAttribute('data-view-default') === 'true',
  },
  {
    id: 'discovery-character-play', chapter: 'discovery', kind: 'action',
    targets: ['wayfinder-replay'], title: 'Replay a proper level-up',
    body: 'Click Replay level-up. The old EXP bar fills, the threshold announces the next level, new equipment appears on the 3D character, and the chapter rewards are revealed. Every level has a different visual payoff. This is a replay of an unlocked chapter, not more EXP. Real new discoveries offer View level-up without interrupting evidence recording.',
    checkUi: root => Number(root.querySelector('[data-tour="wayfinder-panel"]')?.getAttribute('data-replay-count') ?? '0') > 0,
  },
  {
    id: 'discovery-character-skip', chapter: 'discovery', kind: 'action',
    targets: ['wayfinder-sequence'], title: 'Keep the rewards, skip the animation',
    body: 'Click Skip animation if it is still playing. The complete reward summary stays available. With reduced motion, it is already shown without automatic movement. Multi-level arrivals keep every crossed chapter, even when skipped. No save waits for an animation to finish and nothing must be claimed before you can leave.',
    checkUi: root => root.querySelector('[data-tour="wayfinder-sequence"]')?.getAttribute('data-phase') === 'complete',
  },
  {
    id: 'discovery-character-memory', chapter: 'discovery', kind: 'action',
    targets: ['wayfinder-chapters'], title: 'Revisit an earlier chapter',
    body: 'Click the unlocked LV 01 chapter. Its earlier outfit and harbor appear, while the actual collection level and EXP stay unchanged. Future artwork remains hidden until earned. Exploring a chapter is view-only; you can return to it whenever you want.',
    checkUi: root => root.querySelector('[data-tour="wayfinder-panel"]')?.getAttribute('data-view-level') === '1',
  },
  {
    id: 'discovery-character-current', chapter: 'discovery', kind: 'action',
    targets: ['wayfinder-current'], title: 'Return to your current chapter',
    body: 'Click Current chapter. Your current cumulative equipment returns without resetting the camera or changing a record. The stats below EXP are your actual recorded days, practiced checkpoints and revisited checkpoints, not invented combat attributes or independently measured skills.',
    checkUi: root => {
      const panel = root.querySelector('[data-tour="wayfinder-panel"]');
      return !!panel && panel.getAttribute('data-view-level') === panel.getAttribute('data-level') &&
        !root.querySelector('[data-tour="wayfinder-current"]');
    },
  },
  {
    id: 'discovery-family', chapter: 'discovery', kind: 'action',
    targets: ['discovery-memory-family'], title: 'Explore a family',
    body: 'Click Carry it forward. The collection now shows recall discoveries only. This is a view filter: it does not change focus, record a review or earn anything. Independent recall is still your self-report, and later Needs review results still matter.',
    checkUi: root => root.querySelector('[data-discovery-track="memory"]')?.getAttribute('aria-pressed') === 'true',
  },
  {
    id: 'discovery-inspect', chapter: 'discovery', kind: 'action',
    targets: ['discovery-code-card', 'discovery-all-families'], title: 'Follow a hidden clue',
    body: 'Click All families, then the highlighted hidden card with the clue about an idea that runs. Its name stays hidden while you inspect the clue. Opening cards is never rewarded; only the qualifying work in your saved records can reveal a discovery.',
    checkUi: root => !!root.querySelector('dialog.discovery-modal[open] [data-discovery-id="working-thought"]'),
  },
  {
    id: 'discovery-reveal', chapter: 'discovery', kind: 'action',
    targets: ['discovery-reveal'], title: 'Reveal a trail without claiming the work',
    body: 'Click Reveal the trail. This shows the name, exact requirement and progress. Looking does not unlock it. This example needs a genuine Code evidence record; in real use, never relabel a copied note just to clear a card. Next opens the normal evidence form in practice.',
    checkUi: root => !!root.querySelector('dialog.discovery-modal[open] [data-discovery-id="working-thought"] [data-tour="discovery-requirement"]'),
  },
  {
    id: 'discovery-work', chapter: 'discovery', kind: 'action', route: 'mission/pattern', command: 'open-evidence',
    targets: ['evidence-example'], title: 'Let a saved record reveal the discovery',
    body: 'Click Fill example; the existing tutorial form fills a clearly fictional Code record. Leave This checkpoint is complete unchecked and click Save evidence. The discovery recognises the record without completing a checkpoint. Real use requires your actual work, not the example. A brief dismissible notice never takes keyboard focus.',
    check: ({ state, signals }) => signals.discoveryExampleCount > 0 && !signals.evidenceOpen &&
      state.evidence.some(record => record.kind === 'code'),
  },
  {
    id: 'discovery-proof', chapter: 'discovery', kind: 'action', route: 'discoveries', command: 'close-dialogs',
    targets: ['discovery-code-card'], title: 'Inspect the receipt behind the reward',
    body: 'Open the now-discovered A working thought card. Read Why this was discovered and its actual saved-work link. Discovery dates come from the first qualifying record; historical discoveries are not announced again merely because you reload. Repeated same-checkpoint records cannot farm distinct-checkpoint milestones.',
    checkUi: root => !!root.querySelector('dialog.discovery-modal[open] [data-discovery-id="working-thought"] [data-tour="discovery-proof"]'),
  },
  {
    id: 'discovery-activity', chapter: 'discovery', kind: 'action', command: 'close-dialogs',
    targets: ['discovery-today'], title: 'Inspect a recorded day',
    body: 'Click today in the 28-day ribbon. The detail shows the actual records behind the tile. One day stays one day regardless of note count. Arrow keys move between tiles; Home and End find the ends. Gaps never subtract discoveries. A blank tile means no saved learning record, not that you did no work.',
    checkUi: root => root.querySelector('[data-tour="discovery-today"]')?.getAttribute('aria-pressed') === 'true' &&
      !!root.querySelector('[data-tour="discovery-day-detail"]'),
  },
  {
    id: 'discovery-next', chapter: 'discovery', kind: 'explain',
    targets: ['discovery-next'], title: 'Keep your actual next step in charge',
    body: 'The next-step panel comes from your real primary mission and its current checkpoint or blocker. It opens the existing tools, never creates a new plan or changes focus. You can pursue the entire collection at your own pace, but collectibles never replace source-defined criteria or require a different mission.',
  },
  {
    id: 'discovery-rules', chapter: 'discovery', kind: 'action',
    targets: ['discovery-rules'], title: 'Keep the collection private and portable',
    body: 'Expand A collection of records, not a measure of your worth. Discoveries are derived from existing records, so normal backups and the optional encrypted journal already carry their source data. There is no separate collection export. Confirmed import/reset recalculates the collection from the replacement records. No cloud account, deadline, points loss or leaderboard was added.',
    checkUi: root => root.querySelector<HTMLDetailsElement>('[data-tour="discovery-rules"]')?.open === true,
  },
  {
    id: 'discovery-finish', chapter: 'discovery', kind: 'explain',
    title: 'The rest of the atlas is yours to discover',
    body: 'Finish tutorial returns to your unchanged real workspace. None of these fictional discoveries, records or timer changes are copied into it. Open Discovery Atlas from Career to see your own collection. Discoveries recognise recorded practice, not verified mastery; your evidence, recall and completion controls remain the authority.',
  },
];
