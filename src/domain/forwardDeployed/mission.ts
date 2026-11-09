import { defineOperation } from '../operationBuilder';
import type { MissionProgress } from '../types';
import { fdeOutline } from './outline';
import { fdeSources } from './sources';

const researchUrl = 'https://github.com/Zanark/CareerOS/blob/main/docs/FDE-RESEARCH.md';

export const fdeMission = defineOperation({
  id: 'fde',
  name: 'Forward Deployed Engineering',
  operation: 'Fieldcraft',
  description: fdeOutline.overview,
  purpose: 'Turn an ambiguous customer problem into a dependable, adopted system and an honest, reproducible body of engineering evidence.',
  color: 'orange',
  icon: 'briefcase',
  owner: 'You',
  dependencies: ['system', 'blueprint', 'escape'],
  coverage: 'documented',
  completionLabel: 'Fieldcraft checkpoints completed (self-confirmed)',
  sourceNotes: fdeOutline.sourceNotes,
  sources: [
    { document: fdeOutline.document, section: 'Authored curriculum, source matrix and research limits', url: researchUrl },
    ...fdeSources.map(source => ({ document: source.title, section: source.scope, url: source.url })),
  ],
  resources: [
    { label: 'Research, role differences and curriculum source matrix', url: researchUrl },
    { label: 'Customer problem discovery', url: 'https://www.gov.uk/service-manual/agile-delivery/how-the-discovery-phase-works' },
    { label: 'Evaluation methods, not a required hosted product', url: 'https://developers.openai.com/api/docs/guides/evaluation-best-practices' },
  ],
  referenceGroups: [{
    title: 'Optional field specializations',
    kind: 'projects',
    items: fdeOutline.units.filter(unit => unit.role === 'practice').map(unit => ({
      title: unit.title, detail: `${unit.summary} Independent practice; not a checkpoint gate.`,
      href: `#/practice/fde/${unit.id}`,
    })),
  }],
  stages: fdeOutline.phases.map(phase => ({
    id: `fde-pack-${phase.id}`, title: phase.title, summary: phase.summary,
    topics: fdeOutline.units.filter(unit => unit.phaseId === phase.id).map(unit => unit.title),
    optional: phase.id === 'fde-specialize',
    source: { document: fdeOutline.document, section: phase.title, url: researchUrl },
    checkpoints: fdeOutline.units.filter(unit => unit.phaseId === phase.id && unit.role === 'checkpoint').map(unit => ({
      id: unit.id, title: unit.title, action: unit.action, recoveryAction: unit.recovery,
      sourceId: unit.sourceId, minutes: unit.minutes, criteria: unit.criteria, topics: unit.concepts,
      granularity: 'workflow',
      source: { document: fdeOutline.document, section: `${unit.sourceId}: ${unit.title}`, url: researchUrl },
    })),
  })),
}, '3.0.0');

export function createFdeProgress(): MissionProgress {
  return {
    roadmapVersion: fdeMission.roadmapVersion,
    checkpointId: fdeMission.checkpoints[0].id,
    status: 'not-started',
    mode: 'background',
    completedCheckpointIds: [],
    blocker: '',
  };
}
