import { defineOperation } from '../operationBuilder';
import type { Mission } from '../types';
import { agentCloudDocument, agentCloudPhases, agentCloudUnits } from './outline';
import { agentCloudSources } from './sources';

export function appendAgentCloudMission(original: Mission): Mission {
  if (original.id !== 'neural' || original.roadmapVersion !== '3.0.0') {
    throw new Error('The agent-cloud append requires the frozen Neural Edge v3 mission.');
  }
  const sourceFor = (sourceId: string | undefined, section: string) => {
    const source = agentCloudSources.find(candidate => candidate.id === sourceId);
    if (!source) throw new Error(`Unknown agent-cloud source: ${sourceId}`);
    return { document: source.title, section, url: source.url };
  };
  const extension = defineOperation({
    ...original,
    description: `${original.description} Continue into agent-ready cloud execution, governed engineering/operations, durable actions and independently measured outcomes.`,
    purpose: 'Defend both AI application architecture and the cloud/control-plane contracts that make agent work bounded, recoverable and useful.',
    appendFrom: '3.0.0',
    completionLabel: 'AI architecture and agent-cloud checkpoints completed (self-confirmed)',
    sourceNotes: [...original.sourceNotes ?? [],
      'Neural Edge v4 retains the exact 28-checkpoint v3 prefix and appends 12 original research-backed checkpoints. Adoption is explicit; verified prefix work is counted once, and no new topic receives free credit.',
      'The original private PDF is unchanged. Extension lessons cite public web sources with review limits, not invented PDF pages or an official vendor syllabus.',
      'Case laboratories are optional references. Use synthetic local evidence; no paid account, real customer information or production action is required.',
    ],
    sources: [...original.sources ?? [], ...agentCloudSources.map(source => ({
      document: source.title, section: source.scope, url: source.url,
    }))],
    referenceGroups: [...original.referenceGroups ?? [], {
      title: 'Agent-cloud case laboratory', kind: 'projects',
      items: agentCloudUnits.filter(unit => unit.role === 'practice').map(unit => ({
        title: unit.title, detail: `${unit.summary} Optional; no automatic completion credit.`,
        href: `#/practice/neural/${unit.id}`,
      })),
    }],
    stages: agentCloudPhases.map(phase => ({
      id: `neural-pack-${phase.id}`, title: phase.title, summary: phase.summary,
      topics: agentCloudUnits.filter(unit => unit.phaseId === phase.id).map(unit => unit.title),
      optional: phase.id === 'agent-cases',
      source: sourceFor(phase.id === 'agent-execution' ? 'controllers' : phase.id === 'agent-engineering' ? 'stripe' : 'itbench',
        `${agentCloudDocument}: ${phase.title}; original learning design`),
      checkpoints: agentCloudUnits.filter(unit => unit.phaseId === phase.id && unit.role === 'checkpoint').map(unit => ({
        id: unit.id, title: unit.title, action: unit.action, recoveryAction: unit.recovery,
        minutes: unit.minutes, criteria: unit.criteria, topics: unit.concepts, sourceId: unit.sourceId,
        granularity: 'topic-group',
        source: sourceFor(unit.sourceIds?.[0], `${unit.sourceId}: ${unit.title}; original criteria informed by reviewed sources`),
      })),
    })),
  }, '4.0.0');
  return {
    ...extension,
    checkpoints: [...original.checkpoints, ...extension.checkpoints],
    stages: [...original.stages ?? [], ...extension.stages ?? []],
  };
}
