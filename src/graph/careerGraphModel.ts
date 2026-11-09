import {
  checkpointIdentity, getCheckpoint, getLatestMission, getMissionVersion, getMissions, prerequisitesFor, recordRoadmapVersion,
} from '../domain/catalog';
import { localDate } from '../domain/engine';
import { missionIds } from '../domain/types';
import type { AppState, Checkpoint, Mission, MissionId, RoadmapVersion, SourceReference } from '../domain/types';
import { careerSkillLinks } from './careerSkillLinks';
import type { CareerSkillAnchor } from './careerSkillLinks';
import { buildCareerOrbits } from './careerOrbitModel';
import type { CareerOrbit } from './careerOrbitTypes';

export type CareerGraphStatus = 'complete' | 'incomplete' | 'reference';
export type CareerGraphKind = 'core' | 'mission' | 'checkpoint' | 'evidence' | 'opportunity' | 'freelance' | 'history' | 'curriculum' | 'action';

export interface CareerGraphNode {
  id: string;
  kind: CareerGraphKind;
  status: CareerGraphStatus;
  label: string;
  detail: string;
  context: string;
  href: string;
  missionId?: MissionId;
  roadmapVersion?: RoadmapVersion;
  archived?: boolean;
  current?: boolean;
  position: [number, number, number];
}

export interface CareerGraphSkillReason {
  id: string;
  concept: string;
  reason: string;
  sources: { nodeId: string; reference: SourceReference }[];
}

interface CareerGraphEdgeEndpoints {
  id: string;
  source: string;
  target: string;
}

export type CareerGraphEdge = CareerGraphEdgeEndpoints & (
  { kind: 'contains' | 'prerequisite' | 'related' | 'evidence' } |
  { kind: 'shared-skill'; reasons: CareerGraphSkillReason[] }
);

export interface CareerGraph {
  nodes: CareerGraphNode[];
  /** View-only isolation for quiet mission hubs, including their orbit membership tethers. */
  disconnectedNodeIds?: ReadonlySet<string>;
  edges: CareerGraphEdge[];
  orbits: CareerOrbit[];
  stats: {
    trackedTotal: number;
    trackedCompleted: number;
    archivedCompleted: number;
    pastWorkRecords: number;
  };
  updates: MissionId[];
}

const coreId = 'core:careerhq';
const missionNodeId = (id: MissionId) => `mission:${id}`;
const checkpointNodeId = (mission: Mission, checkpointId: string) =>
  `checkpoint:${checkpointIdentity(mission.id, checkpointId, mission.roadmapVersion)}`;
const recordNodeId = (kind: CareerGraphKind, id: string) => `${kind}:${encodeURIComponent(id)}`;

function unitHash(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash = Math.imul(hash ^ value.charCodeAt(index), 16777619);
  }
  hash = Math.imul(hash ^ (hash >>> 16), 0x85ebca6b);
  hash = Math.imul(hash ^ (hash >>> 13), 0xc2b2ae35);
  return ((hash ^ (hash >>> 16)) >>> 0) / 4294967296;
}

function sphericalPosition(radius: number, height: number, angle: number): CareerGraphNode['position'] {
  const width = Math.sqrt(1 - height * height);
  return [radius * width * Math.cos(angle), radius * height, radius * width * Math.sin(angle)];
}

function missionPosition(id: MissionId): CareerGraphNode['position'] {
  // Only the fixed mission identity determines a hub's slot, never its progress or visible child count.
  const slot = missionIds.indexOf(id);
  return sphericalPosition(
    52 + 10 * unitHash(`mission-radius:${id}`),
    1 - 2 * (slot + 0.5) / missionIds.length,
    slot * Math.PI * (3 - Math.sqrt(5)) + 0.35,
  );
}

function recordPosition(id: string, missionId?: MissionId): CareerGraphNode['position'] {
  const center = missionId ? missionPosition(missionId) : [0, 0, 0];
  const offset = sphericalPosition(
    (missionId ? 15 : 28) + 9 * unitHash(`radius:${id}`),
    2 * unitHash(`height:${id}`) - 1,
    2 * Math.PI * unitHash(`angle:${id}`),
  );
  return [center[0] + offset[0], center[1] + offset[1], center[2] + offset[2]];
}

function describeSource(source: SourceReference): string {
  return `${source.document} · ${source.section}${source.page === undefined ? '' : ` · p. ${source.page}`}`;
}

function checkpointDetail(mission: Mission, checkpoint: Checkpoint): string {
  const sources = checkpoint.source ? [checkpoint.source] : mission.sources ?? [];
  return [
    checkpoint.action,
    checkpoint.criteria.length ? `Completion criteria: ${checkpoint.criteria.join(' ')}` : '',
    checkpoint.topics?.length ? `Topics: ${checkpoint.topics.join(', ')}.` : '',
    `Definition: ${mission.name}, roadmap v${mission.roadmapVersion}, ${checkpoint.stage}.`,
    sources.length ? `Source: ${sources.map(describeSource).join('; ')}.` : 'Source: original app roadmap definition.',
  ].filter(Boolean).join('\n');
}

export function buildCareerGraph(state: AppState, options: { includeAllRecords?: boolean } = {}): CareerGraph {
  const nodes = new Map<string, CareerGraphNode>();
  const edges = new Map<string, CareerGraphEdge>();
  const versions = new Map<string, Mission>();
  const stats: CareerGraph['stats'] = {
    trackedTotal: 0, trackedCompleted: 0, archivedCompleted: 0, pastWorkRecords: state.personalProof?.length ?? 0,
  };
  const updates: MissionId[] = [];
  const missions = getMissions(state);

  function addEdge(source: string, target: string, kind: Exclude<CareerGraphEdge['kind'], 'shared-skill'>) {
    if (source === target || !nodes.has(source) || !nodes.has(target)) return;
    if (kind === 'related' && source > target) [source, target] = [target, source];
    const id = `edge:${kind}:${JSON.stringify([source, target])}`;
    edges.set(id, { id, source, target, kind });
  }

  function rememberVersion(mission: Mission) {
    versions.set(`${mission.id}:${mission.roadmapVersion}`, mission);
  }

  function addCheckpoint(mission: Mission, checkpoint: Checkpoint, scope: 'tracked' | 'archive' | 'curriculum') {
    const id = checkpointNodeId(mission, checkpoint.id);
    if (nodes.has(id)) return;
    const progress = state.missions[mission.id];
    const completed = scope === 'archive' || (scope === 'tracked' && progress.completedCheckpointIds.includes(checkpoint.id));
    const current = scope === 'tracked' && !completed && progress.status !== 'completed' && progress.checkpointId === checkpoint.id;
    const qualifier = scope === 'archive' ? 'Archived completion'
      : scope === 'curriculum' ? 'Latest curriculum · not tracked' : 'Saved tracker';
    const explanation = scope === 'archive'
      ? 'Completed in a previous roadmap. Preserved past work; no credit toward different current checkpoints.'
      : scope === 'curriculum'
        ? 'Reference only. This definition has not been adopted into the saved tracker and grants no progress credit.'
        : [
          completed ? 'Marked complete in the saved tracker.' : 'Unfinished in the saved tracker.',
          current ? `Current saved position · ${progress.mode} · ${progress.status}.` : '',
          current && progress.blocker ? `Blocker: ${progress.blocker}` : '',
        ].filter(Boolean).join('\n');
    nodes.set(id, {
      id, kind: scope === 'curriculum' ? 'curriculum' : 'checkpoint',
      status: scope === 'curriculum' ? 'reference' : completed ? 'complete' : 'incomplete',
      label: checkpoint.title,
      detail: `${explanation}\n${checkpointDetail(mission, checkpoint)}`,
      context: `${mission.name} · v${mission.roadmapVersion} · ${checkpoint.stage} · ${qualifier}`,
      href: scope === 'tracked' ? `#/mission/${mission.id}` : `#/sources/${mission.id}`,
      missionId: mission.id, roadmapVersion: mission.roadmapVersion,
      archived: scope === 'archive', current,
      position: recordPosition(id, mission.id),
    });
    addEdge(missionNodeId(mission.id), id, 'contains');
    if (scope === 'archive') stats.archivedCompleted += 1;
  }

  nodes.set(coreId, {
    id: coreId, kind: 'core', status: 'reference', label: 'CareerOS',
    detail: state.objective,
    context: `Career OS · ${state.sampleData ? 'sample-containing workspace' : 'browser-local workspace'}`,
    href: '#/hq', position: [0, 0, 0],
  });

  for (const mission of missions) {
    const progress = state.missions[mission.id];
    const completed = mission.checkpoints.filter(checkpoint => progress.completedCheckpointIds.includes(checkpoint.id)).length;
    stats.trackedTotal += mission.checkpoints.length;
    stats.trackedCompleted += completed;
    const id = missionNodeId(mission.id);
    nodes.set(id, {
      id, kind: 'mission',
      status: !mission.checkpoints.length ? 'reference' : progress.status === 'completed' ? 'complete' : 'incomplete',
      label: mission.name,
      detail: [
        mission.description,
        mission.checkpoints.length ? `${completed}/${mission.checkpoints.length} tracked checkpoints marked complete.`
          : 'Planned/reference material; no tracked checkpoints or completion credit.',
        `Saved tracker v${mission.roadmapVersion} · ${progress.mode} · ${progress.status}.`,
        progress.blocker ? `Blocker: ${progress.blocker}` : '',
        ...(mission.sources ?? []).map(source => `Source: ${describeSource(source)}`),
      ].filter(Boolean).join('\n'),
      context: `${mission.operation} · v${mission.roadmapVersion} · ${progress.mode}`,
      href: `#/mission/${mission.id}`, missionId: mission.id, roadmapVersion: mission.roadmapVersion,
      position: missionPosition(mission.id),
    });
    addEdge(coreId, id, 'contains');
    rememberVersion(mission);
    for (const checkpoint of mission.checkpoints) addCheckpoint(mission, checkpoint, 'tracked');
  }

  // Current identities win; only additional completed archive identities become past-work nodes.
  for (const archive of state.archives) {
    const mission = getMissionVersion(archive.missionId, archive.progress.roadmapVersion);
    rememberVersion(mission);
    for (const checkpoint of mission.checkpoints) {
      if (archive.progress.completedCheckpointIds.includes(checkpoint.id)) addCheckpoint(mission, checkpoint, 'archive');
    }
  }

  for (const mission of missions) {
    const latest = getLatestMission(mission.id);
    if (latest.roadmapVersion !== mission.roadmapVersion) {
      updates.push(mission.id);
      rememberVersion(latest);
      for (const checkpoint of latest.checkpoints) addCheckpoint(latest, checkpoint, 'curriculum');
    }
    for (const related of mission.dependencies) addEdge(missionNodeId(mission.id), missionNodeId(related), 'related');
  }

  for (const mission of versions.values()) {
    for (const checkpoint of mission.checkpoints) {
      for (const prerequisite of prerequisitesFor(mission, checkpoint)) {
        addEdge(checkpointNodeId(mission, prerequisite), checkpointNodeId(mission, checkpoint.id), 'prerequisite');
      }
    }
  }

  function skillEndpoint(anchor: CareerSkillAnchor) {
    const checkpoint = getCheckpoint(anchor.missionId, anchor.checkpointId, anchor.roadmapVersion);
    if (!checkpoint.source) throw new Error(`Shared skill anchor ${anchor.checkpointId} has no source citation.`);
    const id = checkpointNodeId(getMissionVersion(anchor.missionId, anchor.roadmapVersion), checkpoint.id);
    const node = nodes.get(id);
    // Only a verified unchanged prefix can stand for this pinned definition in a later edition.
    if (!node || node.archived || !node.roadmapVersion ||
      checkpointIdentity(anchor.missionId, checkpoint.id, node.roadmapVersion) !==
      checkpointIdentity(anchor.missionId, checkpoint.id, anchor.roadmapVersion)) return undefined;
    return { nodeId: id, reference: checkpoint.source };
  }

  for (const link of careerSkillLinks) {
    const first = skillEndpoint(link.source);
    const second = skillEndpoint(link.target);
    if (!first || !second || first.nodeId === second.nodeId) continue;
    const [source, target] = [first.nodeId, second.nodeId].sort();
    const id = `edge:shared-skill:${JSON.stringify([source, target])}`;
    const reason = { id: link.id, concept: link.concept, reason: link.reason, sources: [first, second] };
    const existing = edges.get(id);
    if (existing?.kind === 'shared-skill') existing.reasons.push(reason);
    else edges.set(id, { id, source, target, kind: 'shared-skill', reasons: [reason] });
  }

  for (const evidence of state.evidence) {
    const version = recordRoadmapVersion(evidence);
    const mission = getMissionVersion(evidence.missionId, version);
    const checkpoint = mission.checkpoints.find(item => item.id === evidence.checkpointId)!;
    const id = recordNodeId('evidence', evidence.id);
    const checkpointId = checkpointNodeId(mission, evidence.checkpointId);
    nodes.set(id, {
      id, kind: 'evidence', status: 'reference', label: evidence.title,
      detail: [
        evidence.summary,
        `Saved ${evidence.kind} record · ${evidence.createdAt}.`,
        `${evidence.completedCheckpoint ? 'Recorded with checkpoint completion' : 'Practice record'}; not an automatic mastery assessment.`,
        `Original checkpoint: ${checkpoint.title} · roadmap v${version}.`,
        evidence.url ? `Supporting link: ${evidence.url}` : '',
      ].filter(Boolean).join('\n'),
      context: `${mission.name} · evidence · v${version} · browser-local`,
      href: `#/evidence/${evidence.id}`, missionId: mission.id, roadmapVersion: version,
      position: recordPosition(id, mission.id),
    });
    addEdge(nodes.has(checkpointId) ? checkpointId : missionNodeId(mission.id), id, 'evidence');
  }

  const today = localDate();
  for (const [date, actions] of Object.entries(state.plans)) {
    if (!options.includeAllRecords && date > today) continue;
    for (const action of actions) {
      if (!options.includeAllRecords && date !== today && !action.completed) continue;
      const version = recordRoadmapVersion(action);
      const mission = getMissionVersion(action.missionId, version);
      const id = recordNodeId('action', action.id);
      const checkpointId = checkpointNodeId(mission, action.checkpointId);
      nodes.set(id, {
        id, kind: 'action', status: action.completed ? 'complete' : 'incomplete', label: action.title,
        detail: [
          `${action.completed ? 'Completed' : 'Unfinished'} daily action for ${date} · ${action.minutes} minutes planned.`,
          action.reason,
          `Saved action definition: ${mission.name} · roadmap v${version}.`,
          'An action marked done is not checkpoint completion or an automatic mastery assessment.',
        ].filter(Boolean).join('\n'),
        context: `${mission.name} · daily action · ${date} · ${date === today ? 'today' : date > today ? 'future saved plan' : action.completed ? 'past completed work' : 'past unfinished plan'} · v${version}`,
        href: date === today ? '#/plan' : '#/history',
        missionId: mission.id, roadmapVersion: version, position: recordPosition(id, mission.id),
      });
      addEdge(nodes.has(checkpointId) ? checkpointId : missionNodeId(mission.id), id, 'contains');
    }
  }

  for (const record of state.personalProof ?? []) {
    const id = recordNodeId('history', record.id);
    nodes.set(id, {
      id, kind: 'history', status: 'complete', label: record.title,
      detail: [
        record.detail, `Source: ${record.source}`, record.date ? `Date: ${record.date}` : '',
        record.url ? `Supporting link: ${record.url}` : '',
        'User-reviewed past accomplishment. Browser-local history, not checkpoint credit or a current mastery assessment.',
      ].filter(Boolean).join('\n'),
      context: 'Personal history · user-reviewed past work · no checkpoint credit',
      href: '#/perspective', position: recordPosition(id),
    });
    addEdge(coreId, id, 'contains');
  }

  for (const opportunity of state.opportunities) {
    const id = recordNodeId('opportunity', opportunity.id);
    const closed = opportunity.stage === 'Rejected' || opportunity.stage === 'Withdrawn';
    nodes.set(id, {
      id, kind: 'opportunity',
      status: opportunity.stage === 'Accepted' ? 'complete' : closed ? 'reference' : 'incomplete',
      label: `${opportunity.company} · ${opportunity.role} · ${opportunity.stage}`,
      detail: [
        `Saved stage: ${opportunity.stage}.`,
        opportunity.notes,
        closed ? 'Closed pipeline reference, not an achievement or active backlog.' : 'Pipeline record; no checkpoint credit.',
        opportunity.url ? `Listing: ${opportunity.url}` : '',
      ].filter(Boolean).join('\n'),
      context: `Career opportunities · ${opportunity.stage} · browser-local`,
      href: '#/pipeline', missionId: 'escape', position: recordPosition(id, 'escape'),
    });
    addEdge(missionNodeId('escape'), id, 'contains');
  }

  for (const lead of state.freelanceOpportunities) {
    const id = recordNodeId('freelance', lead.id);
    nodes.set(id, {
      id, kind: 'freelance', status: lead.verdict === 'Ignore' ? 'reference' : 'incomplete',
      label: `${lead.title} · ${lead.verdict}`,
      detail: [
        `Platform: ${lead.platform} · Verdict: ${lead.verdict}.`,
        lead.skills ? `Required skills: ${lead.skills}` : '',
        lead.budget ? `Listed budget: ${lead.budget}` : '',
        lead.notes,
        lead.url ? `Listing: ${lead.url}` : '',
        'Research lead classification, not paid work, income or checkpoint completion.',
      ].filter(Boolean).join('\n'),
      context: `Freelance research · ${lead.verdict} · browser-local`,
      href: '#/freelance', missionId: 'income', position: recordPosition(id, 'income'),
    });
    addEdge(missionNodeId('income'), id, 'contains');
  }

  const graphNodes = [...nodes.values()];
  return { nodes: graphNodes, edges: [...edges.values()], stats, updates, orbits: buildCareerOrbits(state, graphNodes) };
}
