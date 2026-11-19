import { defineOperation } from '../operationBuilder';
import type { MissionProgress } from '../types';
import { omscsOutline } from './outline';

export const omscsMission = defineOperation({
  id: 'omscs', name: 'Georgia Tech OMSCS', operation: 'Gold Circuit',
  description: omscsOutline.overview,
  purpose: 'Turn an unofficial semester proposal into independently explained AI and systems learning, while keeping academic records and official degree verification separate.',
  color: 'amber', icon: 'graduation', owner: 'You',
  dependencies: ['pattern', 'system', 'neural', 'blueprint'],
  coverage: 'documented', completionLabel: 'Gold Circuit learning checkpoints completed (self-confirmed, not degree credit)',
  sourceNotes: omscsOutline.sourceNotes,
  sources: omscsOutline.webSources?.map(source => ({ document: source.title, section: source.scope, url: source.url })),
  resources: [
    { label: 'Official AI specialization', url: 'https://omscs.gatech.edu/specialization-artificial-intelligence-formerly-interactive-intelligence' },
    { label: 'Official degree requirements', url: 'https://omscs.gatech.edu/degree-requirements' },
  ],
  referenceGroups: [{
    title: 'Complete foundation and alternate-route guides', kind: 'parallel',
    items: omscsOutline.units.filter(unit => unit.role !== 'checkpoint').map(unit => ({
      title: unit.title, detail: `${unit.summary} Browsing grants no credit.`,
      href: `#/practice/omscs/${unit.id}`,
    })),
  }],
  stages: omscsOutline.phases.map(phase => ({
    id: `omscs-pack-${phase.id}`, title: phase.title, summary: phase.summary,
    topics: omscsOutline.units.filter(unit => unit.phaseId === phase.id).map(unit => unit.title),
    optional: !omscsOutline.units.some(unit => unit.phaseId === phase.id && unit.role === 'checkpoint'),
    source: { document: omscsOutline.document, section: phase.title, url: 'https://omscs.gatech.edu/specialization-artificial-intelligence-formerly-interactive-intelligence' },
    checkpoints: omscsOutline.units.filter(unit => unit.phaseId === phase.id && unit.role === 'checkpoint').map(unit => {
      const source = omscsOutline.webSources?.find(source => source.id === unit.sourceIds?.[0]);
      if (!source) throw new Error(`Missing primary Gold Circuit source for ${unit.id}.`);
      return {
        id: unit.id, title: unit.title, action: unit.action, recoveryAction: unit.recovery,
        sourceId: unit.sourceId, minutes: unit.minutes, criteria: unit.criteria,
        topics: unit.concepts, granularity: 'topic-group',
        source: { document: source.title, section: `Authored study task: ${unit.title}`, url: source.url },
      };
    }),
  })),
}, '3.0.0');

export function createOmscsProgress(): MissionProgress {
  return { roadmapVersion: '3.0.0', checkpointId: omscsMission.checkpoints[0].id,
    status: 'not-started', mode: 'background', completedCheckpointIds: [], blocker: '' };
}
