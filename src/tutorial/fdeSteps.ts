import type { TutorialStep } from './steps';

export const fdeSteps: TutorialStep[] = [
  {
    id: 'fde-intro', chapter: 'fde', kind: 'explain', route: 'mission/fde', command: 'close-dialogs',
    targets: ['save-state'], title: 'Fieldcraft / your new background mission',
    body: 'Forward Deployed Engineering connects customer discovery, software, data, responsible AI, operations and adoption. It starts unstarted in the background without changing your primary mission or old progress. Its 48 checkpoints are authored learning design, not an employer certificate or a promise of hiring. Everything here still uses isolated tutorial data.',
  },
  {
    id: 'fde-library', chapter: 'fde', kind: 'action', route: 'practice/fde/fde-01',
    targets: ['pack-unit-select'], title: 'Explore a terrain without adding a gate',
    body: 'Choose Optional / Foundry and operational ontologies in Module, exercise bank or reference. The eight optional terrain labs let you explore specialist roles without adding required checkpoints or pretending you have platform experience. Reading any of the 56 units records no learning or completion.',
    checkUi: root => root.querySelector<HTMLSelectElement>('[data-tour="pack-unit-select"]')?.value === 'fde-lab-ontology',
  },
  {
    id: 'fde-sources', chapter: 'fde', kind: 'action', route: 'practice/fde/fde-01',
    targets: ['pack-unit-sources'], title: 'Read what was actually researched',
    body: 'Expand Reviewed sources for this lesson. Primary employer roles differ; AI, GPU systems, language and travel are not universal requirements. Each source records its reviewed scope, including partial reads. These are web references, not invented PDF pages. Palantir AI FDE is a separate software product, not the human job.',
    checkUi: root => root.querySelector<HTMLDetailsElement>('[data-tour="pack-unit-sources"]')?.open === true,
  },
  {
    id: 'fde-work', chapter: 'fde', kind: 'action', route: 'mission/fde', command: 'close-dialogs',
    targets: ['record-evidence'], title: 'Save a background attempt',
    body: 'Click Record evidence, then Fill example and Save evidence. Leave This checkpoint is complete unchecked. This fictional tutorial record demonstrates background logging without activating Fieldcraft or changing primary focus. In real work, save your actual role comparison or artifact. Atlas reads that evidence; browsing the research does not earn anything.',
    check: ({ state, signals }) => !signals.evidenceOpen && state.evidence.some(entry => entry.missionId === 'fde'),
  },
  {
    id: 'fde-recall', chapter: 'fde', kind: 'action', route: 'recall',
    targets: ['recall-filters'], title: 'Bring Fieldcraft into recall',
    body: 'Set Filter by mission to Forward Deployed Engineering. Your saved attempt appears here. Independent FDE recall requires an explanation, a diagram reconstructed from memory and a changed practical exercise. Recall stays separate from checkpoint completion. Partial or Needs review is honest information, not a lost level.',
    checkUi: root => root.querySelector<HTMLSelectElement>('[aria-label="Filter by mission"]')?.value === 'fde',
  },
  {
    id: 'fde-connections', chapter: 'fde', kind: 'explain', route: 'practice/fde/fde-42',
    targets: ['pack-related-practice'], title: 'Transfer what you already learned',
    body: 'Expand Connected learning in other missions to compare this lesson with DSA and Algorithm Arena. Fieldcraft has explicit links to all nine earlier missions, also visible in Career graph Connections. They explain shared reasoning, not automatic equivalent credit or prerequisites. Show everything can reveal its quiet background ring; only completion triggers the existing today-only graph reveal.',
  },
  {
    id: 'fde-finish', chapter: 'fde', kind: 'explain', route: 'discoveries',
    targets: ['discovery-intro'], title: 'One Atlas, not another score',
    body: 'FDE evidence and eligible recall feed the same 24 discoveries, seven Wayfinder levels and source receipts. No new point ledger or career rank was added. Backups and the optional encrypted journal retain the actual records. Exit now to discard only tutorial examples and return to your real workspace; your other mission progress remains intact.',
  },
];
