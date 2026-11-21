import type { TutorialStep } from './steps';

export const pathsSteps: TutorialStep[] = [
  {
    id: 'paths-intro', chapter: 'course-choices', kind: 'explain', route: 'omscs/paths', command: 'close-dialogs',
    targets: ['paths-first-term'],
    title: 'Choose a subject without locking the whole degree',
    body: 'The degree needs ten three-credit courses, not ten credits. Five slots satisfy the AI specialization; the remaining five are free electives. Prior passing subjects reduce new enrollment choices without being counted twice. Begin with the next term, then refine the rest. This draft is temporary and separate from saved academic entries, learning checkpoints and registration.',
  },
  {
    id: 'paths-context-help', chapter: 'course-choices', kind: 'action',
    targets: ['paths-first-subject-help'],
    title: 'Use help only when you need it',
    body: 'Open the question-mark button beside Next term, then close it with Escape or its close button. Tap and keyboard Enter work as well as hover. These small explanations stay beside their controls; they do not require another tutorial visit. Closing help returns you to the action.',
    checkUi: root => root.querySelector('[data-tour="paths-first-subject-help"]')?.getAttribute('aria-expanded') === 'true',
  },
  {
    id: 'paths-basis', chapter: 'course-choices', kind: 'action',
    targets: ['paths-history'],
    title: 'Check the starting point once',
    body: 'Open Prior courses & return. On a new device, add only your actual completed subjects, with their terms if known. Leave grades unknown instead of guessing. Confirm return approval only if you already have it; the gap notice is not an instruction to apply twice. Reloading or leaving this page discards the draft, without updating the academic ledger.',
    checkUi: root => root.querySelector<HTMLDetailsElement>('[data-tour="paths-history"]')?.open === true,
  },
  {
    id: 'paths-design', chapter: 'course-choices', kind: 'action',
    targets: ['paths-design-select'],
    title: 'Compare the two design routes',
    body: 'Try CS 6300 in Algorithms/design course. It emphasizes software delivery; CS 6515 emphasizes algorithms and proofs. A different career emphasis changes the qualitative fit notes, not your choices. Use each subject\'s question mark for its benefit, tradeoff, preparation and connections to existing roadmaps. Reading these notes grants no learning credit.',
    checkUi: root => root.querySelector<HTMLSelectElement>('[data-tour="paths-design-select"]')?.value === 'cs6300',
  },
  {
    id: 'paths-free-search', chapter: 'course-choices', kind: 'action',
    targets: ['paths-free-query'],
    title: 'Browse alternatives without replacing anything',
    body: 'Search for database in Find a free elective. Search and capability/fit filters only change what you see. Remove a selected example before choosing its replacement. All listed choices belong to the current OMSCS inventory, including online Analytics/Cybersecurity offerings; non-CS/CSE subjects are capped at two three-credit courses. Catalogue membership does not promise a semester or seat.',
    checkUi: root => root.querySelector<HTMLInputElement>('[data-tour="paths-free-query"]')?.value.trim().toLowerCase() === 'database',
  },
  {
    id: 'paths-entry-conditions', chapter: 'course-choices', kind: 'action',
    targets: ['paths-entry-checks'],
    title: 'Separate prerequisites from preparation',
    body: 'Open Entry confirmations. SDCC needs earlier qualifying AOS study or an allowed approved alternative; an ordinary B is not automatically a high B. Planned AOS and SDCC cannot share a term. DL expects formal ML, not self-study, but CS 7641 is not asserted as its only registration route. Other background advice does not become an invented course lock. Confirm only facts you actually know.',
    checkUi: root => root.querySelector<HTMLDetailsElement>('[data-tour="paths-entry-checks"]')?.open === true,
  },
  {
    id: 'paths-first-choice', chapter: 'course-choices', kind: 'action',
    targets: ['paths-first-term-select'],
    title: 'Make the next term explicit',
    body: 'Try CS 6200 as the first-term subject. This reorders selected new subjects, not the degree allocation. If a later edit removes your starting subject, the conflict stays visible and the calendar stops until you deliberately replace or reset that choice. Unmet hard entry requirements also stop a valid-looking calendar; future grades remain conditional.',
    checkUi: root => root.querySelector<HTMLSelectElement>('[data-tour="paths-first-term-select"]')?.value === 'cs6200',
  },
  {
    id: 'paths-copy-shortlist', chapter: 'course-choices', kind: 'action',
    targets: ['paths-shortlist-select'],
    title: 'Keep a shortlist for discussion',
    body: 'Open Plain-text shortlist to select and copy, then use Select shortlist text. It separates new subjects from prior reports and includes entry/calendar warnings. You may copy the selected text yourself; this lesson does not touch the system clipboard. Nothing on this page is saved as enrollment or official degree approval.',
    checkUi: root => {
      const field = root.querySelector<HTMLTextAreaElement>('textarea[aria-label="Subject shortlist for review notes"]');
      return !!field && root.activeElement === field && field.selectionStart === 0 && field.selectionEnd === field.value.length;
    },
  },
  {
    id: 'paths-calendar', chapter: 'course-choices', kind: 'action',
    targets: ['paths-calendar'],
    title: 'Read the calendar as a conditional proposal',
    body: 'Open Proposed calendar. One course per regular term is the default. Later summers are opt-in; two courses is a heavy what-if, not a workload recommendation. Check actual offerings, prerequisites, source differences and credit-age warnings before enrolling. Useful procedures live here in the tutorial; real data and decision-critical warnings stay on the normal pages. Exit returns to your unchanged workspace.',
    checkUi: root => root.querySelector<HTMLDetailsElement>('[data-tour="paths-calendar"]')?.open === true,
  },
];
