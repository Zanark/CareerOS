import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  checkpointEvidenceVersion, checkpointIdentity, getCheckpoint, getLatestMission, getMission, getMissionVersion,
  getMissions, getProgressForVersion, hasRoadmapUpdate, isVerifiedAppend, LATEST_ROADMAP_VERSION, missions, v2Missions,
} from './catalog';
import {
  countCompletedCheckpoints, createInitialState, generatePlan, getSaveState, localDate, parseState,
  recallSummary, recordEvidence, recordRecall, upgradeRoadmap,
} from './engine';
import { missionIds } from './types';
import type { AppState, EvidenceInput, RoadmapVersion } from './types';

const latest = getLatestMission('system');
const oldVersions = ['1.0.0', '2.0.0'] as const;
const firstModule = 'system-v3-module-01';
const secondModule = 'system-v3-module-02';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-05T06:00:00Z'));
});
afterEach(() => vi.useRealTimers());

function input(state: AppState, overrides: Partial<EvidenceInput> = {}): EvidenceInput {
  return {
    missionId: 'system', checkpointId: state.missions.system.checkpointId,
    title: 'A traced design example', summary: 'A concrete design with explained trade-offs, failure cases and a checked diagram.',
    kind: 'diagram', url: '', advance: false, criteriaConfirmed: false, ...overrides,
  };
}

function advance(state: AppState): AppState {
  return recordEvidence(state, input(state, { advance: true, criteriaConfirmed: true }));
}

function oldState(version: typeof oldVersions[number], completed = 0): AppState {
  let state = createInitialState(false, version);
  for (let index = 0; index < completed; index += 1) state = advance(state);
  return state;
}

function roundTrip(state: AppState): AppState {
  return parseState(JSON.parse(JSON.stringify(state)));
}

function withRetainedRecall(state: AppState): AppState {
  state = recordEvidence(state, input(state));
  const firstEvidenceAt = Date.parse(state.evidence.at(-1)!.createdAt);
  for (const hours of [25, 97]) {
    vi.setSystemTime(new Date(firstEvidenceAt + hours * 3600_000));
    state = recordRecall(state, {
      missionId: 'system', checkpointId: state.missions.system.checkpointId,
      roadmapVersion: state.missions.system.roadmapVersion, outcome: 'independent',
      checks: { explanation: true, diagram: true, exercise: true }, notes: '',
    });
  }
  return state;
}

describe('independently versioned System problem curriculum', () => {
  it('selects the 72-module v3 curriculum without changing frozen broad-topic definitions', () => {
    const previous = getMissionVersion('system', '2.0.0');
    expect(previous.checkpoints).toHaveLength(28);
    expect(previous).toBe(v2Missions.find(mission => mission.id === 'system'));
    expect(Object.isFrozen(previous)).toBe(true);
    expect(Object.isFrozen(previous.checkpoints[0].criteria)).toBe(true);
    expect(v2Missions.reduce((total, mission) => total + mission.checkpoints.length, 0)).toBe(87);
    expect(latest).toBe(getMissionVersion('system', '3.0.0'));
    expect(getMission('system')).toBe(latest);
    expect(latest.roadmapVersion).toBe('3.0.0');
    expect(latest.appendFrom).toBeUndefined();
    expect(latest.checkpoints).toHaveLength(72);
    expect(latest.stages).toHaveLength(9);
    expect(latest.checkpoints[0].id).toBe(firstModule);
    const expectedIds = Array.from({ length: 72 }, (_, index) => `system-v3-module-${String(index + 1).padStart(2, '0')}`);
    expect(new Set(latest.checkpoints.map(checkpoint => checkpoint.id))).toEqual(new Set(expectedIds));
    expect(new Set(latest.checkpoints.map(checkpoint => checkpoint.id)).size).toBe(72);
    expect(latest.checkpoints.some(checkpoint => previous.checkpoints.some(old => old.id === checkpoint.id))).toBe(false);
    expect(missions.map(mission => mission.id)).toEqual([...missionIds]);
    for (const mission of v2Missions.filter(mission => !['pattern', 'system'].includes(mission.id))) {
      expect(getMissionVersion(mission.id, '2.0.0')).toBe(mission);
      expect(getLatestMission(mission.id).roadmapVersion).toBe(mission.id === 'neural' ? '4.0.0' : '3.0.0');
    }
  });

  it('keeps all fifteen case studies outside checkpoint lookup and completion prerequisites', () => {
    for (const letter of 'abcdefghijklmno') {
      const id = `system-v3-case-${letter}`;
      expect(() => getCheckpoint('system', id, '3.0.0')).toThrow('Unknown checkpoint');
      expect(latest.checkpoints.some(checkpoint => checkpoint.prerequisites?.includes(id))).toBe(false);
      expect(latest.stages?.some(stage => stage.checkpointIds.includes(id))).toBe(false);
    }
    const state = createInitialState(false);
    expect(() => recordEvidence(state, input(state, { checkpointId: 'system-v3-case-a' }))).toThrow('Unknown checkpoint');
  });

  it('starts fresh at each latest version while keeping schema/catalog v2 and no assumed progress', () => {
    const state = createInitialState(false);
    expect(state.schemaVersion).toBe(2);
    expect(state.roadmapVersion).toBe('2.0.0');
    expect(LATEST_ROADMAP_VERSION).toBe('2.0.0');
    expect(state.missions.system).toEqual({
      roadmapVersion: '3.0.0', checkpointId: firstModule, status: 'not-started',
      mode: 'active', completedCheckpointIds: [], blocker: '',
    });
    for (const id of missionIds) {
      expect(state.missions[id].roadmapVersion).toBe(getLatestMission(id).roadmapVersion);
      expect(hasRoadmapUpdate(id, state)).toBe(false);
      expect(getMission(id, state)).toBe(getLatestMission(id));
    }
    expect(state.evidence).toEqual([]);
    expect(state.events).toEqual([]);
    expect(state.recalls).toEqual([]);
    expect(state.archives).toEqual([]);
    expect(countCompletedCheckpoints(state)).toBe(0);
    expect(createInitialState(false, '3.0.0')).toEqual(state);
    expect(roundTrip(state)).toEqual(state);
  });

  it.each(oldVersions)('loads and imports %s progress, evidence, recall and plans without automatic adoption', version => {
    const state = withRetainedRecall(oldState(version, 2));
    state.plans[localDate()] = generatePlan(state);
    const serialized = JSON.stringify(state);
    const imported = roundTrip(state);
    expect(JSON.stringify(imported)).toBe(serialized);
    expect(imported.missions.system.roadmapVersion).toBe(version);
    expect(getMission('system', imported)).toBe(getMissionVersion('system', version));
    expect(getMissions(imported).find(mission => mission.id === 'system')?.roadmapVersion).toBe(version);
    expect(getMission('system', imported).checkpoints).toHaveLength(version === '2.0.0' ? 28 : 5);
    expect(hasRoadmapUpdate('system', imported)).toBe(true);
    expect(generatePlan(imported)).toBe(imported.plans[localDate()]);
    expect(imported.archives).toEqual([]);
    expect(imported.missions.income.roadmapVersion).toBe('2.0.0');
  });

  it('limits the verified append/evidence identity rule to unchanged DSA checkpoints', () => {
    for (const version of oldVersions) expect(isVerifiedAppend(latest, getMissionVersion('system', version))).toBe(false);
    for (const checkpoint of latest.checkpoints) {
      expect(checkpointEvidenceVersion('system', checkpoint.id, '3.0.0')).toBe('3.0.0');
      expect(checkpointIdentity('system', checkpoint.id, '3.0.0')).toBe(`system:3.0.0:${checkpoint.id}`);
    }
    const previous = getMissionVersion('system', '2.0.0');
    const claimedAppend = {
      ...latest, appendFrom: '2.0.0' as const,
      checkpoints: [...previous.checkpoints, ...latest.checkpoints], stages: previous.stages,
    };
    expect(isVerifiedAppend(claimedAppend, previous)).toBe(false);
    const dsa = getLatestMission('pattern');
    expect(isVerifiedAppend(dsa, getMissionVersion('pattern', '2.0.0'))).toBe(true);
    expect(checkpointEvidenceVersion('pattern', dsa.checkpoints[0].id, '3.0.0')).toBe('2.0.0');
  });

  it('rejects unsupported exact mission/version pairs instead of returning another version', () => {
    for (const id of missionIds) {
      expect(getMissionVersion(id, '3.0.0').roadmapVersion).toBe('3.0.0');
    }
    for (const version of ['0.9.0', '4.0.0']) {
      expect(() => getMissionVersion('system', version as RoadmapVersion)).toThrow('roadmap exists');
    }
    expect(() => getMissionVersion('income', '1.0.0')).toThrow('roadmap exists');
  });
});

describe('explicit System adoption archives rather than transfers achievements', () => {
  it.each(oldVersions)('archives exact %s progress and resets only System on adoption', version => {
    for (const mode of ['active', 'background'] as const) {
      for (const blocker of ['', 'A question awaiting review.']) {
        let state = withRetainedRecall(oldState(version, 2));
        state = recordEvidence(state, input(state, {
          missionId: 'pattern', checkpointId: state.missions.pattern.checkpointId,
          advance: true, criteriaConfirmed: true,
        }));
        state.plans = { '2026-10-03': generatePlan(state, '2026-10-03'), [localDate()]: generatePlan(state) };
        state.missions.system.mode = mode;
        state.missions.system.blocker = blocker;
        const serialized = JSON.stringify(state);
        const updated = upgradeRoadmap(state, 'system');
        expect(updated.missions.system).toEqual({
          roadmapVersion: '3.0.0', checkpointId: firstModule, status: 'not-started',
          mode, completedCheckpointIds: [], blocker: '',
        });
        expect(updated.archives).toHaveLength(1);
        expect(updated.archives[0].missionId).toBe('system');
        expect(updated.archives[0].progress).toEqual(state.missions.system);
        expect(getProgressForVersion(updated, 'system', version)).toEqual(state.missions.system);
        expect(getSaveState(getMissionVersion('system', version), updated).completed).toBe(2);
        for (const field of ['evidence', 'recalls', 'plans', 'opportunities', 'freelanceOpportunities', 'readiness'] as const) {
          expect(JSON.stringify(updated[field])).toBe(JSON.stringify(state[field]));
        }
        expect(JSON.stringify(updated.events.slice(0, -1))).toBe(JSON.stringify(state.events));
        expect(updated.events.at(-1)).toMatchObject({ type: 'roadmap-upgraded', missionId: 'system' });
        expect(updated.updatedAt > state.updatedAt).toBe(true);
        for (const id of missionIds.filter(id => id !== 'system')) expect(updated.missions[id]).toEqual(state.missions[id]);
        expect(updated.objective).toBe(state.objective);
        expect(updated.capacity).toBe(state.capacity);
        expect(updated.focusMissionId).toBe(state.focusMissionId);
        expect(updated.interviewMode).toBe(state.interviewMode);
        expect(updated.sampleData).toBe(state.sampleData);
        expect(countCompletedCheckpoints(updated)).toBe(countCompletedCheckpoints(state));
        expect(JSON.stringify(state)).toBe(serialized);
        expect(roundTrip(updated)).toEqual(updated);
        expect(() => upgradeRoadmap(updated, 'system')).toThrow('already on the latest version');
      }
    }
  });

  it.each(oldVersions)('does not transfer any %s completion, including an entirely finished old roadmap', version => {
    const oldMission = getMissionVersion('system', version);
    for (const completed of [0, 1, oldMission.checkpoints.length]) {
      const state = oldState(version, completed);
      const updated = upgradeRoadmap(state, 'system');
      expect(updated.missions.system.checkpointId).toBe(firstModule);
      expect(updated.missions.system.status).toBe('not-started');
      expect(updated.missions.system.completedCheckpointIds).toEqual([]);
      expect(updated.archives[0].progress).toEqual(state.missions.system);
      expect(countCompletedCheckpoints(updated)).toBe(completed);
      expect(updated.evidence).toEqual(state.evidence);
      expect(roundTrip(updated)).toEqual(updated);
    }
  });

  it.each(oldVersions)('keeps %s recalls visible and writable against their archive without inheriting mastery', version => {
    const state = withRetainedRecall(oldState(version));
    const checkpointId = state.missions.system.checkpointId;
    const summary = recallSummary(state, 'system', checkpointId, version);
    expect(summary.status).toBe('retained');
    let updated = upgradeRoadmap(state, 'system');
    expect(recallSummary(updated, 'system', checkpointId, version)).toEqual(summary);
    expect(recallSummary(updated, 'system', firstModule, '3.0.0')).toEqual({ status: 'not-started', nextReviewAt: null });
    expect(() => recordRecall(updated, {
      missionId: 'system', roadmapVersion: '3.0.0', checkpointId: firstModule, outcome: 'partial',
      checks: { explanation: true, diagram: false, exercise: false }, notes: '',
    })).toThrow('prior learning evidence');
    updated = recordRecall(updated, {
      missionId: 'system', roadmapVersion: version, checkpointId, outcome: 'needs-review',
      checks: { explanation: false, diagram: false, exercise: false }, notes: 'Reviewing the old topic again.',
    });
    expect(updated.recalls.slice(0, -1)).toEqual(state.recalls);
    expect(updated.missions.system.status).toBe('not-started');
    expect(updated.missions.system.completedCheckpointIds).toEqual([]);
    updated = recordEvidence(updated, input(updated));
    expect(recallSummary(updated, 'system', firstModule, '3.0.0').status).toBe('learning');
    const oldSummary = recallSummary(updated, 'system', checkpointId, version);
    updated = recordRecall(updated, {
      missionId: 'system', roadmapVersion: '3.0.0', checkpointId: firstModule, outcome: 'partial',
      checks: { explanation: true, diagram: true, exercise: false }, notes: 'New curriculum practice.',
    });
    expect(recallSummary(updated, 'system', checkpointId, version)).toEqual(oldSummary);
    expect(roundTrip(updated)).toEqual(updated);
  });

  it.each(oldVersions)('keeps saved %s plans historical and requires fresh versioned action IDs', version => {
    const state = oldState(version);
    state.focusMissionId = 'system';
    const date = localDate();
    state.plans[date] = generatePlan(state);
    const oldAction = state.plans[date].find(action => action.missionId === 'system')!;
    const updated = upgradeRoadmap(state, 'system');
    expect(generatePlan(updated)).toEqual(state.plans[date]);
    expect(() => recordEvidence(updated, input(updated, { actionId: oldAction.id }))).toThrow('no longer available');
    delete updated.plans[date];
    updated.plans[date] = generatePlan(updated);
    const action = updated.plans[date].find(candidate => candidate.missionId === 'system')!;
    expect(action.roadmapVersion).toBe('3.0.0');
    expect(action.checkpointId).toBe(firstModule);
    expect(recordEvidence(updated, input(updated, { actionId: action.id })).plans[date][0].completed).toBe(true);
  });

  it('keeps both pre-existing v1 history and the newly archived v2 snapshot without copying evidence', () => {
    const legacy = oldState('1.0.0', 1);
    const state = oldState('2.0.0', 2);
    state.archives.push({ missionId: 'system', archivedAt: state.updatedAt, progress: legacy.missions.system });
    state.evidence.unshift(...legacy.evidence.map(entry => ({ ...entry, id: `legacy-${entry.id}` })));
    state.events.unshift(...legacy.events.map(entry => ({ ...entry, id: `legacy-${entry.id}` })));
    const updated = upgradeRoadmap(roundTrip(state), 'system');
    expect(updated.archives).toHaveLength(2);
    expect(updated.archives[0]).toEqual(state.archives[0]);
    expect(updated.archives[1].progress).toEqual(state.missions.system);
    expect(updated.evidence).toEqual(state.evidence);
    expect(countCompletedCheckpoints(updated)).toBe(3);
    expect(countCompletedCheckpoints(advance(updated))).toBe(4);
    expect(roundTrip(updated)).toEqual(updated);
  });

  it('does not alter DSA append progress while adopting System independently', () => {
    let state = oldState('2.0.0', 1);
    state = recordEvidence(state, input(state, {
      missionId: 'pattern', checkpointId: state.missions.pattern.checkpointId, advance: true, criteriaConfirmed: true,
    }));
    state = upgradeRoadmap(state, 'pattern');
    const updated = upgradeRoadmap(state, 'system');
    expect(updated.missions.pattern).toEqual(state.missions.pattern);
    expect(updated.archives[0]).toEqual(state.archives[0]);
    expect(updated.missions.pattern.completedCheckpointIds).toHaveLength(1);
    expect(countCompletedCheckpoints(updated)).toBe(2);
    expect(roundTrip(updated)).toEqual(updated);
  });
});

describe('strict System evidence and version references', () => {
  it.each(oldVersions)('rejects positional carry and invented v3 completions after %s adoption', version => {
    const carried = upgradeRoadmap(oldState(version, 1), 'system');
    carried.missions.system.completedCheckpointIds = [...carried.archives[0].progress.completedCheckpointIds];
    expect(() => parseState(carried)).toThrow('Completed checkpoint is unknown');
    const fabricated = upgradeRoadmap(oldState(version, 1), 'system');
    fabricated.missions.system.completedCheckpointIds = [firstModule];
    fabricated.missions.system.checkpointId = secondModule;
    expect(() => parseState(fabricated)).toThrow('requires completion evidence');
    const practiceOnly = recordEvidence(upgradeRoadmap(oldState(version, 1), 'system'), input(createInitialState(false)));
    practiceOnly.missions.system.completedCheckpointIds = [firstModule];
    practiceOnly.missions.system.checkpointId = secondModule;
    expect(() => parseState(practiceOnly)).toThrow('requires completion evidence');
  });

  it.each(['evidence', 'plan', 'recall'] as const)('requires the original version progress for an archived %s record', kind => {
    let state = oldState('2.0.0');
    if (kind === 'plan') state.plans[localDate()] = generatePlan(state);
    else state = withRetainedRecall(state);
    const updated = upgradeRoadmap(state, 'system');
    updated.archives = [];
    if (kind === 'recall') updated.evidence = [];
    expect(() => parseState(updated)).toThrow('no matching progress');
  });

  it.each(['evidence', 'plan', 'recall'] as const)('rejects re-stamping old %s records as v3', kind => {
    let state = oldState('2.0.0');
    if (kind === 'plan') state.plans[localDate()] = generatePlan(state);
    else state = withRetainedRecall(state);
    const updated = upgradeRoadmap(state, 'system');
    if (kind === 'evidence') updated.evidence[0].roadmapVersion = '3.0.0';
    if (kind === 'recall') updated.recalls[0].roadmapVersion = '3.0.0';
    if (kind === 'plan') updated.plans[localDate()].find(action => action.missionId === 'system')!.roadmapVersion = '3.0.0';
    expect(() => parseState(updated)).toThrow('unknown checkpoint');
  });

  it.each(['active', 'archive', 'evidence', 'plan', 'recall'] as const)('rejects unknown System versions in %s data', kind => {
    let state = withRetainedRecall(oldState('2.0.0'));
    state.plans[localDate()] = generatePlan(state);
    state = upgradeRoadmap(state, 'system');
    const unknown = '9.0.0' as RoadmapVersion;
    if (kind === 'active') state.missions.system.roadmapVersion = unknown;
    if (kind === 'archive') state.archives[0].progress.roadmapVersion = unknown;
    if (kind === 'evidence') state.evidence[0].roadmapVersion = unknown;
    if (kind === 'plan') state.plans[localDate()].find(action => action.missionId === 'system')!.roadmapVersion = unknown;
    if (kind === 'recall') state.recalls[0].roadmapVersion = unknown;
    expect(() => parseState(state)).toThrow('Invalid workspace');
  });

  it('accepts fresh v3 evidence, plans, recall and completion only under matching v3 progress', () => {
    let state = createInitialState(false);
    state.focusMissionId = 'system';
    const date = localDate();
    state.plans[date] = generatePlan(state);
    const action = state.plans[date][0];
    state = recordEvidence(state, input(state, { actionId: action.id }));
    state = recordRecall(state, {
      missionId: 'system', roadmapVersion: '3.0.0', checkpointId: firstModule, outcome: 'independent',
      checks: { explanation: true, diagram: true, exercise: true }, notes: '',
    });
    state = advance(state);
    expect(state.missions.system).toMatchObject({
      roadmapVersion: '3.0.0', checkpointId: secondModule, status: 'not-started', completedCheckpointIds: [firstModule],
    });
    expect(state.archives).toEqual([]);
    expect(state.evidence.every(entry => entry.roadmapVersion === '3.0.0')).toBe(true);
    expect(state.recalls[0].roadmapVersion).toBe('3.0.0');
    expect(state.plans[date][0].completed).toBe(true);
    expect(countCompletedCheckpoints(state)).toBe(1);
    expect(roundTrip(state)).toEqual(state);
    state.evidence[0].roadmapVersion = '2.0.0';
    expect(() => parseState(state)).toThrow('unknown checkpoint');
  });

  it('can complete all 72 core modules without mandatory cases or losing old work', () => {
    let state = upgradeRoadmap(oldState('2.0.0', 2), 'system');
    const oldEvidence = structuredClone(state.evidence);
    const archive = structuredClone(state.archives[0]);
    for (let index = 0; index < latest.checkpoints.length; index += 1) {
      expect(state.missions.system.status).not.toBe('completed');
      state = advance(state);
    }
    expect(state.missions.system.status).toBe('completed');
    expect(new Set(state.missions.system.completedCheckpointIds).size).toBe(72);
    expect(state.evidence.slice(0, 2)).toEqual(oldEvidence);
    expect(state.evidence.slice(2).every(entry => entry.roadmapVersion === '3.0.0' && entry.completedCheckpoint)).toBe(true);
    expect(state.archives[0]).toEqual(archive);
    expect(countCompletedCheckpoints(state)).toBe(74);
    expect(roundTrip(state)).toEqual(state);
    expect(generatePlan(state).some(action => action.missionId === 'system')).toBe(false);
  });
});
