import type { TutorialStep } from './steps';

export const agentCloudSteps: TutorialStep[] = [
  {
    id: 'agent-cloud-intro', chapter: 'agent-cloud', kind: 'explain',
    route: 'sources/neural', command: 'close-dialogs', targets: ['operation-source'],
    title: 'AI Architect / cloud for agents and with agents',
    body: 'Neural Edge now has an agent-cloud extension: 12 checkpoints after the unchanged 28, plus four optional cases. It covers runtime isolation, identity, durable workflows, engineering/operations, evaluation and economics. Existing v3 trackers stay put until confirmed append; genuine prefix work carries once. This is learning material, not a working autonomous cloud agent. Tutorial data remains isolated.',
  },
  {
    id: 'agent-cloud-sources', chapter: 'agent-cloud', kind: 'action',
    route: 'practice/neural/neural-agent-authority', targets: ['pack-unit-sources'],
    title: 'Inspect the actual authority contract',
    body: 'Expand Reviewed sources for this lesson. Product documentation, company reports and empirical studies have different limits. Resource IAM, action approval and administrator overrides are separate. New lessons cite public web sources; the original workbook still uses its real PDF pages.',
    checkUi: root => root.querySelector<HTMLDetailsElement>('[data-tour="pack-unit-sources"]')?.open === true,
  },
  {
    id: 'agent-cloud-cases', chapter: 'agent-cloud', kind: 'action',
    route: 'practice/neural/neural-agent-runtime', targets: ['pack-unit-select'],
    title: 'Try a case without creating another gate',
    body: 'Choose Case C: stale DNS plans and amplified recovery in the module selector. This is a conventional-automation postmortem, not an AI-caused incident. All four case laboratories are optional practice; reading or selecting one grants no completion or EXP.',
    checkUi: root => root.querySelector<HTMLSelectElement>('[data-tour="pack-unit-select"]')?.value === 'neural-agent-case-race',
  },
  {
    id: 'agent-cloud-transfer', chapter: 'agent-cloud', kind: 'explain',
    route: 'practice/neural/neural-agent-development', targets: ['pack-related-practice'],
    title: 'Transfer foundations, then demonstrate the new task',
    body: 'Connected learning links this worker pipeline to Fieldcraft. Other new links connect identity to Fabric, durable state to Blueprint and critical paths to System Design. These explain transfer, not automatic equivalent completion. Your original lessons, records and evidence remain available.',
  },
  {
    id: 'agent-cloud-finish', chapter: 'agent-cloud', kind: 'explain',
    route: 'discoveries', targets: ['discovery-intro'],
    title: 'One evidence system, no reward for adoption alone',
    body: 'Agent-cloud work uses the same evidence, backups and optional encrypted journal. Atlas deduplicates verified prefix work and reads actual saved attempts/completions, not roadmap adoption or browsing. Neural recall support has not been silently expanded. Exit to discard tutorial examples and return to your real workspace.',
  },
];
