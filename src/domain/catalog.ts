import type { AppState, Checkpoint, Mission, MissionId, MissionProgress, RoadmapVersion } from './types';
import { legacyMissions } from './legacyCatalog';
import { technicalMissions } from './operations/technical';
import { growthMissions } from './operations/growth';
import { executionMissions } from './operations/execution';
import { dsaExpandedMission } from './operations/dsaExpanded';
import { systemPracticeMission } from './operations/systemPractice';
import { documentedPackMission } from './roadmapPacks/mission';
import { fdeMission } from './forwardDeployed/mission';
import { appendAgentCloudMission } from './agentCloud/mission';

// The workspace envelope stays at v2; individual missions have independent versions.
export const LATEST_ROADMAP_VERSION = '2.0.0' as const;

function freeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

export const v2Missions: Mission[] = freeze([
  ...technicalMissions, ...growthMissions, ...executionMissions,
].sort((a, b) => ['pattern', 'system', 'escape', 'fabric', 'blueprint', 'credential', 'neural', 'algorithm', 'income'].indexOf(a.id) -
  ['pattern', 'system', 'escape', 'fabric', 'blueprint', 'credential', 'neural', 'algorithm', 'income'].indexOf(b.id)));

export const v3Missions: Mission[] = freeze([
  ...v2Missions.map(mission => mission.id === 'pattern' ? dsaExpandedMission
    : mission.id === 'system' ? systemPracticeMission : documentedPackMission(mission)),
  fdeMission,
]);

export const missions: Mission[] = freeze(v3Missions.map(mission =>
  mission.id === 'neural' ? appendAgentCloudMission(mission) : mission));

export function getMissionVersion(id: MissionId, version: RoadmapVersion): Mission {
  const mission = [...legacyMissions, ...v2Missions, ...v3Missions, ...missions]
    .find(candidate => candidate.id === id && candidate.roadmapVersion === version);
  if (!mission) throw new Error(`No ${version} roadmap exists for mission ${id}`);
  return mission;
}

export function getLatestMission(id: MissionId): Mission {
  const mission = missions.find(candidate => candidate.id === id);
  if (!mission) throw new Error(`No latest roadmap exists for mission ${id}`);
  return mission;
}

export function getMission(id: MissionId, state?: AppState): Mission {
  return state ? getMissionVersion(id, state.missions[id].roadmapVersion) : getLatestMission(id);
}

export function hasRoadmapUpdate(id: MissionId, state: AppState): boolean {
  return getMission(id, state).roadmapVersion !== getLatestMission(id).roadmapVersion;
}

export function getMissions(state: AppState): Mission[] {
  return missions.map(mission => getMission(mission.id, state));
}

export function recordRoadmapVersion(record: { roadmapVersion?: RoadmapVersion }): RoadmapVersion {
  return record.roadmapVersion ?? '1.0.0';
}

export function getProgressForVersion(state: AppState, id: MissionId, version: RoadmapVersion): MissionProgress | undefined {
  return state.missions[id].roadmapVersion === version ? state.missions[id] :
    state.archives.find(archive => archive.missionId === id && archive.progress.roadmapVersion === version)?.progress;
}

export function getCheckpoint(id: MissionId, checkpointId: string, version: RoadmapVersion): Checkpoint {
  const checkpoint = getMissionVersion(id, version).checkpoints.find(item => item.id === checkpointId);
  if (!checkpoint) throw new Error(`Unknown checkpoint ${checkpointId} in ${id} roadmap ${version}`);
  return checkpoint;
}

export function prerequisitesFor(mission: Mission, checkpoint: Checkpoint): string[] {
  if (checkpoint.prerequisites) return checkpoint.prerequisites;
  const index = mission.checkpoints.findIndex(item => item.id === checkpoint.id);
  return index > 0 ? [mission.checkpoints[index - 1].id] : [];
}

/** Only explicitly allowlisted, byte-equivalent checkpoint/stage prefixes inherit evidence. */
export function isVerifiedAppend(mission: Mission, previous: Mission): boolean {
  const declared = mission.id === 'pattern'
    ? mission.roadmapVersion === '3.0.0' && previous.roadmapVersion === '2.0.0'
    : mission.id === 'neural' && mission.roadmapVersion === '4.0.0' && previous.roadmapVersion === '3.0.0';
  return declared && mission.id === previous.id &&
    mission.appendFrom === previous.roadmapVersion && !mission.planned && !previous.planned &&
    previous.checkpoints.length > 0 && mission.checkpoints.length > previous.checkpoints.length &&
    new Set(mission.checkpoints.map(checkpoint => checkpoint.id)).size === mission.checkpoints.length &&
    previous.checkpoints.every((checkpoint, index) =>
      JSON.stringify(mission.checkpoints[index]) === JSON.stringify(checkpoint) &&
      JSON.stringify(prerequisitesFor(mission, mission.checkpoints[index])) === JSON.stringify(prerequisitesFor(previous, checkpoint))) &&
    (previous.stages ?? []).every((stage, index) => JSON.stringify(mission.stages?.[index]) === JSON.stringify(stage));
}

const preservedPatternIds = new Set(
  isVerifiedAppend(dsaExpandedMission, getMissionVersion('pattern', '2.0.0'))
    ? getMissionVersion('pattern', '2.0.0').checkpoints.map(checkpoint => checkpoint.id) : [],
);

const preservedNeuralIds = new Set(
  isVerifiedAppend(getLatestMission('neural'), getMissionVersion('neural', '3.0.0'))
    ? getMissionVersion('neural', '3.0.0').checkpoints.map(checkpoint => checkpoint.id) : [],
);

export function checkpointEvidenceVersion(id: MissionId, checkpointId: string, version: RoadmapVersion): RoadmapVersion {
  getCheckpoint(id, checkpointId, version);
  if (id === 'pattern' && version === '3.0.0' && preservedPatternIds.has(checkpointId)) return '2.0.0';
  return id === 'neural' && version === '4.0.0' && preservedNeuralIds.has(checkpointId) ? '3.0.0' : version;
}

export function checkpointIdentity(id: MissionId, checkpointId: string, version: RoadmapVersion): string {
  return `${id}:${checkpointEvidenceVersion(id, checkpointId, version)}:${checkpointId}`;
}
