import type { TutorialStep } from './steps';

export const discoverySteps: TutorialStep[] = [
  {
    id: 'discovery-intro', chapter: 'discovery', kind: 'explain', route: 'discoveries', command: 'close-dialogs',
    targets: ['discovery-intro'], title: 'Your Discovery Atlas',
    body: 'This optional journey grows from evidence and recall you actually save. Checkpoint expeditions give you a real next step; a finite collection remembers discoveries along the way and opens on Discovered. Neither is a career level or measure of mastery. Your earlier tools and criteria are unchanged. Everything in this tutorial remains temporary.',
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
    body: 'Each star represents one of 24 finite discoveries. Lit stars have qualifying saved records. The four families concern tangible work, depth, recall and nonconsecutive recorded days; their lines group discoveries, not prerequisites. Collection counts are separate from journey EXP. Existing records can reveal discoveries immediately when you first open the atlas.',
  },
  {
    id: 'discovery-character', chapter: 'discovery', kind: 'explain',
    targets: ['wayfinder-panel'], title: 'A little RPG, built around your actual records',
    body: 'Your low-poly Wayfinder lives on a real isometric 3D diorama, with different animated weather in each chapter. Pause motion quiets this visit; system reduced motion stays authoritative. First traces add 40 EXP, confirmed finishes 80, first honest revisits 40, recorded days 20 and discoveries 100. Animation, duplicate notes, previews and replay earn nothing. Where your EXP comes from exposes the calculation.',
  },
  {
    id: 'discovery-character-orbit', chapter: 'discovery', kind: 'action',
    targets: ['wayfinder-viewer'], title: 'Turn the whole diorama',
    body: 'Drag to orbit the character and its actual 3D surroundings together. On a keyboard, focus the canvas and press an arrow key. Scroll, pinch or use plus/minus to zoom. Rotate away from the starting isometric angle to continue. The camera stays where you leave it; the decorative atmosphere can keep moving. If 3D is unavailable, read the explicit notice and use Skip step.',
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
    body: 'Click Replay level-up. The old EXP bar fills, the threshold announces the next level, new equipment appears on the 3D character, and the chapter rewards are revealed. Every level has a different visual payoff. This is a replay of an earned chapter, not more EXP. Real saved work can offer View level-up even between discovery unlocks, without interrupting evidence recording.',
    checkUi: root => Number(root.querySelector('[data-tour="wayfinder-panel"]')?.getAttribute('data-replay-count') ?? '0') > 0,
  },
  {
    id: 'discovery-character-skip', chapter: 'discovery', kind: 'action',
    targets: ['wayfinder-sequence'], title: 'Keep the rewards, skip the animation',
    body: 'Click Skip animation if it is still playing. The complete reward summary stays available. Pause motion or system reduced motion also settles the result without losing rewards. Multi-level arrivals keep every crossed chapter. No save waits for an animation to finish, and nothing must be claimed before you can leave. Decorative ambience can be paused separately from deliberate camera controls.',
    checkUi: root => root.querySelector('[data-tour="wayfinder-sequence"]')?.getAttribute('data-phase') === 'complete',
  },
  {
    id: 'discovery-character-memory', chapter: 'discovery', kind: 'action',
    targets: ['wayfinder-chapters'], title: 'Revisit an earlier chapter',
    body: 'Click the unlocked LV 01 chapter. Its earlier outfit and harbor appear, while the actual journey level and EXP stay unchanged. Locked chapter buttons cannot be selected. A separate Preview reward can show only the next chapter, clearly labelled not earned; it never grants ownership or EXP. Exploring is view-only.',
    checkUi: root => root.querySelector('[data-tour="wayfinder-panel"]')?.getAttribute('data-view-level') === '1',
  },
  {
    id: 'discovery-character-current', chapter: 'discovery', kind: 'action',
    targets: ['wayfinder-current'], title: 'Return to your current chapter',
    body: 'Click Current chapter. Your current cumulative equipment returns without resetting the camera or changing a record. The expedition and EXP calculation refer to actual saved work, not invented combat attributes or independently measured skills. Your equipment and story are available below the scene.',
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
    body: 'Your next expedition starts from the primary mission. Its route selector changes only this view, never mission focus. Nearby checkpoint positions, first-trace and confirmed-finish awards show a concrete next step. Record real work opens the normal evidence form; a blocker or completed route never offers a completion shortcut. Planned routes are not silently activated.',
  },
  {
    id: 'discovery-rules', chapter: 'discovery', kind: 'action',
    targets: ['discovery-rules'], title: 'Keep the collection private and portable',
    body: 'Expand Discovery rules. Discoveries and journey EXP are derived from existing records, so normal backups and the optional encrypted journal already carry their sources. There is no separate reward export or wallet. Confirmed import/reset recalculates the journey from replacement records. No cloud account, deadline, points loss or leaderboard was added.',
    checkUi: root => root.querySelector<HTMLDetailsElement>('[data-tour="discovery-rules"]')?.open === true,
  },
  {
    id: 'discovery-finish', chapter: 'discovery', kind: 'explain',
    title: 'The rest of the atlas is yours to discover',
    body: 'Finish tutorial returns to your unchanged real workspace. None of these fictional discoveries, EXP, records or timer changes are copied into it. Open Discovery Atlas above Tracking in the sidebar. Rewards recognise recorded work, not verified mastery; your evidence, recall and completion controls remain the authority.',
  },
];
