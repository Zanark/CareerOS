import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as catalog from './catalog';
import {
  checkpointEvidenceVersion, checkpointIdentity, getLatestMission, getMission, getMissionVersion,
  getMissions, hasRoadmapUpdate, isVerifiedAppend, LATEST_ROADMAP_VERSION, missions, prerequisitesFor, v2Missions,
} from './catalog';
import {
  activateCheckpoint, countCompletedCheckpoints, createInitialState, generatePlan, getSaveState,
  localDate, parseState, recallSummary, recordEvidence, recordRecall, upgradeRoadmap,
} from './engine';
import { missionIds } from './types';
import type { AppState, EvidenceInput, Mission, MissionId, RoadmapVersion } from './types';

const previous = getMissionVersion('pattern', '2.0.0');
const latest = getLatestMission('pattern');
const firstAppended = latest.checkpoints[previous.checkpoints.length];
const [, , , complement, grouping] = previous.checkpoints;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-04T10:00:00Z'));
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

function input(state: AppState, overrides: Partial<EvidenceInput> = {}): EvidenceInput {
  return {
    missionId: 'pattern', checkpointId: state.missions.pattern.checkpointId,
    title: 'A tested example', summary: 'A small traced example with an explanation and checked edge cases.',
    kind: 'code', url: '', advance: false, criteriaConfirmed: false, ...overrides,
  };
}

function advance(state: AppState): AppState {
  return recordEvidence(state, input(state, { advance: true, criteriaConfirmed: true }));
}

function oldState(completed = 0): AppState {
  let state = createInitialState(false, '2.0.0');
  for (let index = 0; index < completed; index += 1) state = advance(state);
  return state;
}

function reviewed(state: AppState, version: RoadmapVersion = '2.0.0'): AppState {
  return recordRecall(state, {
    missionId: 'pattern', checkpointId: state.missions.pattern.checkpointId, roadmapVersion: version,
    outcome: 'partial', checks: { explanation: true, exercise: false, diagram: false }, notes: 'A self-reported review.',
  });
}

function retainedState(state: AppState, missionId: 'pattern' | 'system' = 'pattern'): AppState {
  const checkpointId = state.missions[missionId].checkpointId;
  state = recordEvidence(state, input(state, { missionId, checkpointId }));
  const firstEvidenceAt = Date.parse(state.evidence.at(-1)!.createdAt);
  for (const hours of [25, 97]) {
    vi.setSystemTime(new Date(firstEvidenceAt + hours * 3600_000));
    state = recordRecall(state, {
      missionId, checkpointId, roadmapVersion: state.missions[missionId].roadmapVersion,
      outcome: 'independent', checks: { explanation: true, exercise: true, diagram: true }, notes: '',
    });
  }
  return state;
}

function roundTrip(state: AppState): AppState {
  return parseState(JSON.parse(JSON.stringify(state)));
}

describe('exact catalog versions and verified append identity', () => {
  it('freezes the original 87-node catalog and preserves the latest DSA prefix', () => {
    expect(v2Missions.reduce((sum, mission) => sum + mission.checkpoints.length, 0)).toBe(87);
    expect(previous.checkpoints).toHaveLength(5);
    expect(previous.stages).toHaveLength(2);
    expect(Object.isFrozen(v2Missions)).toBe(true);
    expect(Object.isFrozen(previous)).toBe(true);
    expect(Object.isFrozen(previous.checkpoints[0].criteria)).toBe(true);
    expect(latest.roadmapVersion).toBe('3.0.0');
    expect(latest.appendFrom).toBe('2.0.0');
    expect(latest.checkpoints.slice(0, 5)).toEqual(previous.checkpoints);
    previous.checkpoints.forEach((checkpoint, index) => expect(latest.checkpoints[index]).toBe(checkpoint));
    expect(latest.stages?.slice(0, 2)).toEqual(previous.stages);
    expect(missions.map(mission => mission.id)).toEqual([...missionIds]);
    for (const mission of v2Missions.filter(mission => !['pattern', 'system'].includes(mission.id))) {
      expect(getLatestMission(mission.id).roadmapVersion).toBe(mission.id === 'neural' ? '4.0.0' : '3.0.0');
      expect(getMissionVersion(mission.id, '2.0.0')).toBe(mission);
    }
    expect(isVerifiedAppend(latest, previous)).toBe(true);
    expect(prerequisitesFor(latest, firstAppended)).toEqual(expect.arrayContaining([complement.id, grouping.id]));
  });

  it.each([
    ['missing declaration', (mission: Mission) => { delete mission.appendFrom; }],
    ['wrong ancestor', (mission: Mission) => { mission.appendFrom = '1.0.0'; }],
    ['different mission', (mission: Mission) => { mission.id = 'system'; }],
    ['different descendant', (mission: Mission) => { mission.roadmapVersion = '2.0.0'; }],
    ['altered criteria', (mission: Mission) => { mission.checkpoints[0].criteria.push('A different requirement.'); }],
    ['altered prerequisites', (mission: Mission) => { mission.checkpoints[4].prerequisites = [complement.id]; }],
    ['altered action', (mission: Mission) => { mission.checkpoints[0].action = 'A different action.'; }],
    ['altered stage', (mission: Mission) => { mission.stages![0].checkpointIds = []; }],
    ['reordered prefix', (mission: Mission) => { mission.checkpoints.reverse(); }],
    ['duplicate identity', (mission: Mission) => { mission.checkpoints.push(mission.checkpoints[0]); }],
    ['no append', (mission: Mission) => { mission.checkpoints = mission.checkpoints.slice(0, 5); }],
  ])('does not verify %s as preserved lineage', (_label, corrupt) => {
    const changed = structuredClone(latest);
    corrupt(changed);
    expect(isVerifiedAppend(changed, previous)).toBe(false);
  });

  it('canonicalizes only the verified retained prefix, not new nodes or unrelated versions', () => {
    for (const checkpoint of previous.checkpoints) {
      expect(checkpointEvidenceVersion('pattern', checkpoint.id, '3.0.0')).toBe('2.0.0');
      expect(checkpointIdentity('pattern', checkpoint.id, '3.0.0'))
        .toBe(checkpointIdentity('pattern', checkpoint.id, '2.0.0'));
    }
    expect(checkpointEvidenceVersion('pattern', firstAppended.id, '3.0.0')).toBe('3.0.0');
    const system = getMissionVersion('system', '2.0.0');
    expect(checkpointEvidenceVersion('system', system.checkpoints[0].id, '2.0.0')).toBe('2.0.0');
    const legacy = getMissionVersion('pattern', '1.0.0');
    expect(isVerifiedAppend(latest, legacy)).toBe(false);
    expect(checkpointEvidenceVersion('pattern', legacy.checkpoints[0].id, '1.0.0')).toBe('1.0.0');
    expect(() => checkpointIdentity('pattern', firstAppended.id, '2.0.0')).toThrow('Unknown checkpoint');
  });

  it.each<[MissionId, RoadmapVersion]>([
    ['income', '1.0.0'], ['escape', '4.0.0' as RoadmapVersion], ['fabric', '4.0.0' as RoadmapVersion], ['algorithm', '4.0.0' as RoadmapVersion],
    ['pattern', '9.0.0' as RoadmapVersion],
  ])('rejects nonexistent %s / %s combinations rather than returning latest', (id, version) => {
    expect(() => getMissionVersion(id, version)).toThrow('roadmap exists');
  });

  it('starts new workspaces at each mission latest without changing the schema envelope', () => {
    const state = createInitialState(false);
    expect(state.schemaVersion).toBe(2);
    expect(state.roadmapVersion).toBe('2.0.0');
    expect(LATEST_ROADMAP_VERSION).toBe('2.0.0');
    for (const mission of missions) {
      expect(getMission(mission.id, state)).toBe(mission);
      expect(state.missions[mission.id]).toMatchObject({
        roadmapVersion: mission.roadmapVersion, completedCheckpointIds: [], status: 'not-started',
      });
      expect(hasRoadmapUpdate(mission.id, state)).toBe(false);
    }
    expect(state.evidence).toEqual([]);
    expect(state.events).toEqual([]);
    expect(state.archives).toEqual([]);
    expect(countCompletedCheckpoints(state)).toBe(0);
    expect(roundTrip(state)).toEqual(state);
    expect(createInitialState(false, '3.0.0')).toEqual(state);
  });

  it('pins old fixtures and loaded/imported workspaces without silently adopting', () => {
    const old = oldState(3);
    const serialized = JSON.stringify(old);
    expect(getMission('pattern')).toBe(latest);
    expect(getMission('pattern', old)).toBe(previous);
    expect(getMissions(old)).toEqual([...v2Missions, getLatestMission('fde')]);
    expect(hasRoadmapUpdate('pattern', old)).toBe(true);
    expect(hasRoadmapUpdate('system', old)).toBe(true);
    expect(JSON.stringify(roundTrip(old))).toBe(serialized);
    const legacy = createInitialState(false, '1.0.0');
    for (const id of missionIds) expect(legacy.missions[id].roadmapVersion).toBe(id === 'fde' ? '3.0.0' : id === 'income' ? '2.0.0' : '1.0.0');
  });
});

describe('explicit DSA append adoption preserves saved work', () => {
  it('fails closed instead of resetting progress when a declared append changes old definitions', () => {
    const state = oldState(3);
    const changed = structuredClone(latest);
    changed.checkpoints[0].criteria.push('An incompatible new criterion.');
    vi.spyOn(catalog, 'getLatestMission').mockReturnValue(changed);
    const before = JSON.stringify(state);
    expect(() => upgradeRoadmap(state, 'pattern')).toThrow('does not preserve the previous checkpoint definitions');
    expect(JSON.stringify(state)).toBe(before);
  });

  it.each([0, 1, 3, 4])('preserves %i completed checkpoints and the exact unfinished position', completed => {
    for (const mode of ['active', 'background'] as const) {
      for (const blocker of ['', 'Need a smaller example.']) {
        for (const practiced of [false, true]) {
          let state = oldState(completed);
          if (practiced) state = recordEvidence(state, input(state));
          state.missions.pattern.mode = mode;
          state.missions.pattern.blocker = blocker;
          const before = JSON.stringify(state);
          const updated = upgradeRoadmap(state, 'pattern');
          expect(updated.missions.pattern).toEqual({ ...state.missions.pattern, roadmapVersion: '3.0.0' });
          expect(updated.archives).toHaveLength(1);
          expect(updated.archives[0].progress).toEqual(state.missions.pattern);
          expect(updated.evidence).toEqual(state.evidence);
          expect(countCompletedCheckpoints(updated)).toBe(completed);
          expect(JSON.stringify(state)).toBe(before);
          expect(roundTrip(updated)).toEqual(updated);
        }
      }
    }
  });

  it('preserves the grouping-first branch, including its completion order', () => {
    let state = activateCheckpoint(oldState(3), 'pattern', grouping.id);
    state = advance(state);
    state = recordEvidence(state, input(state));
    expect(state.missions.pattern.checkpointId).toBe(complement.id);
    expect(state.missions.pattern.completedCheckpointIds.at(-1)).toBe(grouping.id);
    const updated = upgradeRoadmap(state, 'pattern');
    expect(updated.missions.pattern).toEqual({ ...state.missions.pattern, roadmapVersion: '3.0.0' });
    expect(() => activateCheckpoint(updated, 'pattern', firstAppended.id)).toThrow('locked');
    const completedBranch = advance(updated);
    expect(completedBranch.missions.pattern.checkpointId).toBe(firstAppended.id);
    expect(completedBranch.missions.pattern.completedCheckpointIds).toEqual([...state.missions.pattern.completedCheckpointIds, complement.id]);
    expect(completedBranch.archives[0].progress).toEqual(state.missions.pattern);
    expect(completedBranch.evidence.at(-1)?.roadmapVersion).toBe('3.0.0');
  });

  it('keeps both old branches required even when complement was completed first', () => {
    const updated = upgradeRoadmap(oldState(4), 'pattern');
    expect(updated.missions.pattern.checkpointId).toBe(grouping.id);
    expect(() => activateCheckpoint(updated, 'pattern', firstAppended.id)).toThrow('locked');
    expect(advance(updated).missions.pattern.checkpointId).toBe(firstAppended.id);
  });

  it('retains completed v2 history but resumes at the first new eligible checkpoint', () => {
    for (const groupingFirst of [false, true]) {
      let state = oldState(3);
      if (groupingFirst) state = activateCheckpoint(state, 'pattern', grouping.id);
      state = advance(advance(state));
      state.missions.pattern.mode = 'background';
      state.missions.pattern.blocker = 'Paused after the old roadmap.';
      const updated = upgradeRoadmap(state, 'pattern');
      expect(updated.missions.pattern).toEqual({
        ...state.missions.pattern, roadmapVersion: '3.0.0', checkpointId: firstAppended.id, status: 'not-started',
      });
      expect(updated.archives[0].progress).toEqual(state.missions.pattern);
      expect(getSaveState(previous, updated).status).toBe('completed');
      expect(updated.evidence).toHaveLength(5);
      expect(countCompletedCheckpoints(updated)).toBe(5);
      expect(() => upgradeRoadmap(updated, 'pattern')).toThrow('already on the latest version');
    }
  });

  it('keeps evidence, recall, historical plans and existing events byte-equivalent', () => {
    let state = oldState(3);
    const date = localDate();
    state.plans = { '2026-10-03': generatePlan(state, '2026-10-03'), [date]: generatePlan(state, date) };
    const action = state.plans[date].find(item => item.missionId === 'pattern')!;
    state = recordEvidence(state, input(state, { actionId: action.id }));
    state = reviewed(state);
    state.missions.pattern.blocker = 'Waiting for another example.';
    const updated = upgradeRoadmap(state, 'pattern');
    for (const field of ['evidence', 'recalls', 'plans', 'opportunities', 'readiness', 'freelanceOpportunities'] as const) {
      expect(JSON.stringify(updated[field])).toBe(JSON.stringify(state[field]));
    }
    expect(JSON.stringify(updated.events.slice(0, -1))).toBe(JSON.stringify(state.events));
    expect(updated.events).toHaveLength(state.events.length + 1);
    expect(updated.events.at(-1)).toMatchObject({ type: 'roadmap-upgraded', missionId: 'pattern' });
    expect(updated.updatedAt > state.updatedAt).toBe(true);
    for (const id of missionIds.filter(id => id !== 'pattern')) expect(updated.missions[id]).toEqual(state.missions[id]);
    expect(generatePlan(updated, date)).toBe(updated.plans[date]);
    expect(roundTrip(updated)).toEqual(updated);
  });

  it('does not reuse old version daily-action IDs for new evidence on the retained checkpoint', () => {
    const state = oldState(3);
    const date = localDate();
    state.plans[date] = generatePlan(state);
    const oldAction = state.plans[date].find(action => action.missionId === 'pattern')!;
    const updated = upgradeRoadmap(state, 'pattern');
    expect(() => recordEvidence(updated, input(updated, { actionId: oldAction.id }))).toThrow('no longer available');
    delete updated.plans[date];
    updated.plans[date] = generatePlan(updated);
    const action = updated.plans[date].find(item => item.missionId === 'pattern')!;
    expect(action.roadmapVersion).toBe('3.0.0');
    expect(recordEvidence(updated, input(updated, { actionId: action.id })).plans[date][0].completed).toBe(true);
  });

  it('restores inherited practice status when switching or advancing back to an old branch', () => {
    let state = oldState(3);
    state = recordEvidence(state, input(state));
    state = activateCheckpoint(state, 'pattern', grouping.id);
    let updated = upgradeRoadmap(state, 'pattern');
    updated = activateCheckpoint(updated, 'pattern', complement.id);
    expect(updated.missions.pattern.status).toBe('in-progress');
    updated = activateCheckpoint(updated, 'pattern', grouping.id);
    updated = advance(updated);
    expect(updated.missions.pattern).toMatchObject({ checkpointId: complement.id, status: 'in-progress' });
    expect(roundTrip(updated)).toEqual(updated);
  });

  it('archives v1 and resets on explicit adoption without arbitrary positional credit', () => {
    let state = advance(createInitialState(false, '1.0.0'));
    state = recordEvidence(state, input(state));
    state = reviewed(state, '1.0.0');
    state.missions.pattern.mode = 'background';
    state.missions.pattern.blocker = 'An old blocker.';
    const updated = upgradeRoadmap(state, 'pattern');
    expect(updated.archives[0].progress).toEqual(state.missions.pattern);
    expect(updated.missions.pattern).toEqual({
      roadmapVersion: '3.0.0', checkpointId: latest.checkpoints[0].id,
      completedCheckpointIds: [], status: 'not-started', mode: 'background', blocker: '',
    });
    expect(updated.evidence).toEqual(state.evidence);
    expect(updated.recalls).toEqual(state.recalls);
    expect(countCompletedCheckpoints(updated)).toBe(1);
    updated.missions.pattern.mode = 'active';
    expect(countCompletedCheckpoints(advance(updated))).toBe(2);
  });

  it('preserves a pre-existing legacy archive while appending the v2 archive exactly once', () => {
    const legacy = advance(createInitialState(false, '1.0.0'));
    const state = oldState(3);
    state.archives.push({ missionId: 'pattern', archivedAt: state.updatedAt, progress: legacy.missions.pattern });
    state.evidence.unshift(...legacy.evidence.map(entry => ({ ...entry, id: `legacy-${entry.id}` })));
    state.events.unshift(...legacy.events.map(entry => ({ ...entry, id: `legacy-${entry.id}` })));
    const updated = upgradeRoadmap(roundTrip(state), 'pattern');
    expect(updated.archives).toHaveLength(2);
    expect(updated.archives[0]).toEqual(state.archives[0]);
    expect(updated.archives[1].progress).toEqual(state.missions.pattern);
    expect(updated.evidence).toEqual(state.evidence);
    expect(countCompletedCheckpoints(updated)).toBe(4);
    expect(roundTrip(updated)).toEqual(updated);
  });

  it('records genuinely new v3 completions through the appended roadmap without doubling the original five', () => {
    let state = upgradeRoadmap(oldState(5), 'pattern');
    const originalEvidence = structuredClone(state.evidence);
    const archive = structuredClone(state.archives[0]);
    for (const checkpoint of latest.checkpoints.slice(5)) {
      expect(state.missions.pattern.checkpointId).toBe(checkpoint.id);
      state = advance(state);
      expect(state.evidence.at(-1)).toMatchObject({ checkpointId: checkpoint.id, roadmapVersion: '3.0.0', completedCheckpoint: true });
    }
    expect(state.missions.pattern.status).toBe('completed');
    expect(state.evidence.slice(0, 5)).toEqual(originalEvidence);
    expect(state.archives[0]).toEqual(archive);
    expect(countCompletedCheckpoints(state)).toBe(latest.checkpoints.length);
    expect(roundTrip(state)).toEqual(state);
    expect(generatePlan(state).some(action => action.missionId === 'pattern')).toBe(false);
  });

  it('stores ordinary v3 evidence and recalls in a fresh workspace without creating an archive', () => {
    let state = createInitialState(false);
    state = recordEvidence(state, input(state));
    state = reviewed(state, '3.0.0');
    state = advance(state);
    expect(state.evidence.every(entry => entry.roadmapVersion === '3.0.0')).toBe(true);
    expect(state.archives).toEqual([]);
    expect(state.recalls[0].roadmapVersion).toBe('3.0.0');
    expect(countCompletedCheckpoints(state)).toBe(1);
    expect(roundTrip(state)).toEqual(state);
  });

  it('keeps unrelated v1 adoption reset semantics and rejects updates for current missions', () => {
    let state = createInitialState(false, '1.0.0');
    state = recordEvidence(state, input(state, {
      missionId: 'system', checkpointId: state.missions.system.checkpointId, advance: true, criteriaConfirmed: true,
    }));
    state.missions.system.blocker = 'An old design question.';
    const updated = upgradeRoadmap(state, 'system');
    expect(updated.archives[0].progress).toEqual(state.missions.system);
    expect(updated.missions.system).toMatchObject({
      roadmapVersion: getLatestMission('system').roadmapVersion, completedCheckpointIds: [], status: 'not-started', blocker: '',
    });
    expect(updated.missions.pattern).toEqual(state.missions.pattern);
    expect(() => upgradeRoadmap(updated, 'system')).toThrow('already on the latest version');
    const incomeUpdated = upgradeRoadmap(updated, 'income');
    expect(() => upgradeRoadmap(incomeUpdated, 'income')).toThrow('already on the latest version');
  });
});

describe('append lineage keeps import and recall validation strict', () => {
  it('preserves retained recall, review timestamp and schedule across a verified append without rewriting records', () => {
    const state = retainedState(oldState());
    const checkpointId = state.missions.pattern.checkpointId;
    const summary = recallSummary(state, 'pattern', checkpointId, '2.0.0');
    expect(summary).toEqual({
      status: 'retained', nextReviewAt: null, lastReviewedAt: state.recalls.at(-1)!.createdAt,
    });
    const updated = upgradeRoadmap(state, 'pattern');
    const beforeSummary = JSON.stringify(updated);
    expect(recallSummary(updated, 'pattern', checkpointId, '3.0.0')).toEqual(summary);
    expect(recallSummary(updated, 'pattern', checkpointId, '2.0.0')).toEqual(summary);
    expect(JSON.stringify(updated.evidence)).toBe(JSON.stringify(state.evidence));
    expect(JSON.stringify(updated.recalls)).toBe(JSON.stringify(state.recalls));
    expect(JSON.stringify(updated)).toBe(beforeSummary);
    expect(roundTrip(updated)).toEqual(updated);
  });

  it('combines inherited and descendant reviews only in the descendant summary', () => {
    const state = retainedState(oldState());
    const checkpointId = state.missions.pattern.checkpointId;
    const oldSummary = recallSummary(state, 'pattern', checkpointId, '2.0.0');
    let updated = upgradeRoadmap(state, 'pattern');
    updated = recordRecall(updated, {
      missionId: 'pattern', roadmapVersion: '3.0.0', checkpointId, outcome: 'needs-review',
      checks: { explanation: false, exercise: false, diagram: false }, notes: 'A later review needs more practice.',
    });
    expect(recallSummary(updated, 'pattern', checkpointId, '3.0.0')).toEqual({
      status: 'needs-review', nextReviewAt: null, lastReviewedAt: updated.recalls.at(-1)!.createdAt,
    });
    expect(recallSummary(updated, 'pattern', checkpointId, '2.0.0')).toEqual(oldSummary);
    expect(updated.recalls.slice(0, 2)).toEqual(state.recalls);
    expect(updated.evidence).toEqual(state.evidence);
    expect(roundTrip(updated)).toEqual(updated);
  });

  it('does not transfer retained recall to a new checkpoint or another mission', () => {
    const state = retainedState(oldState(4));
    let updated = upgradeRoadmap(advance(state), 'pattern');
    expect(recallSummary(updated, 'pattern', grouping.id, '3.0.0').status).toBe('retained');
    expect(recallSummary(updated, 'pattern', firstAppended.id, '3.0.0')).toEqual({
      status: 'not-started', nextReviewAt: null,
    });
    updated = recordEvidence(updated, input(updated));
    expect(recallSummary(updated, 'pattern', firstAppended.id, '3.0.0')).toEqual({
      status: 'learning', nextReviewAt: new Date(Date.parse(updated.evidence.at(-1)!.createdAt) + 24 * 3600_000).toISOString(),
    });
    const systemCheckpoint = updated.missions.system.checkpointId;
    updated = recordEvidence(updated, input(updated, { missionId: 'system', checkpointId: systemCheckpoint }));
    expect(recallSummary(updated, 'system', systemCheckpoint, '2.0.0')).toEqual({
      status: 'learning', nextReviewAt: new Date(Date.parse(updated.evidence.at(-1)!.createdAt) + 24 * 3600_000).toISOString(),
    });
  });

  it.each(['pattern', 'system'] as const)('does not inherit v1 recall across non-append %s adoption', missionId => {
    const state = retainedState(createInitialState(false, '1.0.0'), missionId);
    const checkpointId = state.missions[missionId].checkpointId;
    const oldSummary = recallSummary(state, missionId, checkpointId, '1.0.0');
    expect(oldSummary.status).toBe('retained');
    const updated = upgradeRoadmap(state, missionId);
    expect(recallSummary(updated, missionId, updated.missions[missionId].checkpointId, updated.missions[missionId].roadmapVersion))
      .toEqual({ status: 'not-started', nextReviewAt: null });
    expect(recallSummary(updated, missionId, checkpointId, '1.0.0')).toEqual(oldSummary);
    expect(updated.recalls).toEqual(state.recalls);
  });

  it('retains old version recall visibility and accepts new recalls based on inherited learning', () => {
    let state = recordEvidence(oldState(), input(oldState()));
    state = reviewed(state);
    const summary = recallSummary(state, 'pattern', state.missions.pattern.checkpointId, '2.0.0');
    const updated = upgradeRoadmap(state, 'pattern');
    expect(recallSummary(updated, 'pattern', state.missions.pattern.checkpointId, '2.0.0')).toEqual(summary);
    expect(updated.recalls).toEqual(state.recalls);
    const newReview = reviewed(updated, '3.0.0');
    expect(newReview.recalls[0]).toEqual(state.recalls[0]);
    expect(newReview.recalls.at(-1)?.roadmapVersion).toBe('3.0.0');
    expect(newReview.missions).toEqual(updated.missions);
    expect(newReview.evidence).toEqual(updated.evidence);
    expect(roundTrip(newReview)).toEqual(newReview);
    expect(() => reviewed(upgradeRoadmap(oldState(), 'pattern'), '3.0.0')).toThrow('prior learning evidence');
  });

  it('rejects fake carried completions, removed carried completions and not-started inherited practice', () => {
    const fake = upgradeRoadmap(oldState(1), 'pattern');
    fake.evidence = [];
    expect(() => parseState(fake)).toThrow('requires completion evidence');
    const removed = upgradeRoadmap(oldState(1), 'pattern');
    removed.missions.pattern.completedCheckpointIds = [];
    removed.missions.pattern.checkpointId = previous.checkpoints[0].id;
    removed.missions.pattern.status = 'in-progress';
    expect(() => parseState(removed)).toThrow('must preserve completed checkpoints');
    const practiced = recordEvidence(oldState(), input(oldState()));
    const notStarted = upgradeRoadmap(practiced, 'pattern');
    notStarted.missions.pattern.status = 'not-started';
    expect(() => parseState(notStarted)).toThrow('checkpoint with evidence must be started');
  });

  it('rejects duplicate logical completion records across the ancestor and descendant', () => {
    const state = upgradeRoadmap(oldState(1), 'pattern');
    state.evidence.push({ ...state.evidence[0], id: 'duplicate-descendant-completion', roadmapVersion: '3.0.0' });
    expect(() => parseState(state)).toThrow('Duplicate checkpoint completion');
    state.evidence.reverse();
    expect(() => parseState(state)).toThrow('Duplicate checkpoint completion');
  });

  it('does not let descendant evidence retroactively invent completion or practice in an archive', () => {
    let state = upgradeRoadmap(oldState(), 'pattern');
    state = advance(state);
    state.archives[0].progress.completedCheckpointIds = [previous.checkpoints[0].id];
    state.archives[0].progress.checkpointId = previous.checkpoints[1].id;
    expect(() => parseState(state)).toThrow('requires completion evidence');
    const fresh = advance(upgradeRoadmap(oldState(), 'pattern'));
    expect(() => recordRecall(fresh, {
      missionId: 'pattern', checkpointId: previous.checkpoints[0].id, roadmapVersion: '2.0.0',
      outcome: 'partial', checks: { explanation: true, exercise: false, diagram: false }, notes: '',
    })).toThrow('prior learning evidence');
  });

  it.each(['evidence', 'plan', 'recall'] as const)('still requires exact progress for an ancestor %s reference', kind => {
    let state = recordEvidence(oldState(), input(oldState()));
    if (kind === 'recall') state = reviewed(state);
    if (kind === 'plan') state.plans[localDate()] = generatePlan(state);
    const updated = upgradeRoadmap(state, 'pattern');
    updated.archives = [];
    if (kind !== 'evidence') updated.evidence = updated.evidence.map(entry => ({ ...entry, roadmapVersion: '3.0.0' }));
    expect(() => parseState(updated)).toThrow('no matching progress');
  });

  it.each(['evidence', 'plan'] as const)('rejects nonexistent mission/version combinations in %s records', kind => {
    const state = recordEvidence(createInitialState(false), input(createInitialState(false), {
      missionId: 'escape', checkpointId: getLatestMission('escape').checkpoints[0].id,
    }));
    if (kind === 'evidence') {
      state.evidence[0].missionId = 'income';
      state.evidence[0].roadmapVersion = '1.0.0';
    }
    if (kind === 'plan') {
      state.capacity = 'deep';
      state.plans[localDate()] = generatePlan(state);
      const action = state.plans[localDate()].find(action => action.missionId === 'escape')!;
      action.missionId = 'income';
      action.roadmapVersion = '1.0.0';
    }
    expect(() => parseState(state)).toThrow('unknown roadmap version');
  });

  it('rejects unsupported versions in recall records', () => {
    const state = createInitialState(false);
    state.recalls.push({
      id: 'unknown-version-recall', missionId: 'system', roadmapVersion: '9.0.0' as RoadmapVersion,
      checkpointId: getLatestMission('system').checkpoints[0].id, outcome: 'partial',
      checks: { explanation: true, diagram: false, exercise: false }, notes: '', createdAt: state.updatedAt,
    });
    expect(() => parseState(state)).toThrow('Invalid workspace');
  });

  it('rejects nonexistent active and archived versions and unstamped v2 evidence', () => {
    const unknown = createInitialState(false);
    unknown.missions.income.roadmapVersion = '1.0.0';
    expect(() => parseState(unknown)).toThrow('Unknown roadmap version');
    const unknownArchive = createInitialState(false);
    unknownArchive.archives.push({
      missionId: 'income', archivedAt: unknownArchive.updatedAt,
      progress: { ...unknownArchive.missions.income, roadmapVersion: '1.0.0' },
    });
    expect(() => parseState(unknownArchive)).toThrow('unknown roadmap');
    const unstamped = upgradeRoadmap(oldState(1), 'pattern');
    delete unstamped.evidence[0].roadmapVersion;
    expect(() => parseState(unstamped)).toThrow('unknown checkpoint');
  });

  it('rejects duplicate or active-version archives rather than ambiguously resolving lineage', () => {
    const state = upgradeRoadmap(oldState(1), 'pattern');
    state.archives.push(structuredClone(state.archives[0]));
    expect(() => parseState(state)).toThrow('Duplicate archive');
    const activeArchive = createInitialState(false);
    activeArchive.archives.push({
      missionId: 'pattern', archivedAt: activeArchive.updatedAt, progress: structuredClone(activeArchive.missions.pattern),
    });
    expect(() => parseState(activeArchive)).toThrow('duplicates the active roadmap version');
  });

  it('validates completed descendant plans using retained learning without weakening old-version plan proof', () => {
    const practiced = recordEvidence(oldState(), input(oldState()));
    const updated = upgradeRoadmap(practiced, 'pattern');
    const date = localDate();
    updated.plans[date] = generatePlan(updated);
    updated.plans[date].find(action => action.missionId === 'pattern')!.completed = true;
    expect(roundTrip(updated)).toEqual(updated);

    const old = oldState();
    old.plans[date] = generatePlan(old);
    const descendant = recordEvidence(upgradeRoadmap(old, 'pattern'), input(old));
    descendant.plans[date].find(action => action.missionId === 'pattern')!.completed = true;
    expect(() => parseState(descendant)).toThrow('Completed action requires evidence');
  });

  it('never lets old evidence grant a new checkpoint completion or bypass its prerequisites', () => {
    const locked = upgradeRoadmap(oldState(3), 'pattern');
    locked.evidence.push({ ...locked.evidence[0], id: 'fake-appended-proof', roadmapVersion: '3.0.0', checkpointId: firstAppended.id });
    expect(() => parseState(locked)).toThrow('locked checkpoint');
    const missing = upgradeRoadmap(oldState(5), 'pattern');
    missing.missions.pattern.completedCheckpointIds.push(firstAppended.id);
    expect(() => parseState(missing)).toThrow('requires completion evidence');
    const wrongVersion = advance(upgradeRoadmap(oldState(5), 'pattern'));
    wrongVersion.evidence.at(-1)!.roadmapVersion = '2.0.0';
    expect(() => parseState(wrongVersion)).toThrow('unknown checkpoint');
  });

  it('counts unrelated missions and non-append archives separately without changing state', () => {
    let state = advance(createInitialState(false, '1.0.0'));
    state = upgradeRoadmap(state, 'pattern');
    state = advance(state);
    state = recordEvidence(state, input(state, {
      missionId: 'system', checkpointId: state.missions.system.checkpointId, advance: true, criteriaConfirmed: true,
    }));
    state = upgradeRoadmap(state, 'system');
    state = recordEvidence(state, input(state, {
      missionId: 'system', checkpointId: state.missions.system.checkpointId, advance: true, criteriaConfirmed: true,
    }));
    const before = JSON.stringify(state);
    expect(countCompletedCheckpoints(state)).toBe(4);
    expect(JSON.stringify(state)).toBe(before);
    expect(roundTrip(state)).toEqual(state);
  });
});
