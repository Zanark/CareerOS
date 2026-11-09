import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getMission, getMissionVersion, getMissions, missions, v2Missions } from './catalog';
import {
  activateCheckpoint, createInitialState, generatePlan, getSaveState, localDate, parseState,
  recallSummary, recordChange, recordEvidence, recordRecall, STORAGE_KEY, upgradeRoadmap,
} from './engine';
import { missionIds, readinessKeys } from './types';
import type { AppState, Capacity, EvidenceInput, MissionId } from './types';

const HOUR = 60 * 60 * 1000;

function input(state: AppState, missionId: MissionId = 'pattern', overrides: Partial<EvidenceInput> = {}): EvidenceInput {
  return {
    missionId,
    checkpointId: state.missions[missionId].checkpointId,
    title: 'A small tested example',
    summary: 'A synthetic example with a traced invariant, edge cases, and an explanation of the trade-off.',
    kind: 'exercise',
    url: '',
    advance: false,
    criteriaConfirmed: false,
    ...overrides,
  };
}

function advance(state: AppState, missionId: MissionId = 'pattern'): AppState {
  return recordEvidence(state, input(state, missionId, { advance: true, criteriaConfirmed: true }));
}

function planned(state = createInitialState(false, '2.0.0'), date = localDate()): AppState {
  return { ...state, plans: { ...state.plans, [date]: generatePlan(state, date) } };
}

function freeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 9, 4, 9, 30));
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('v2 catalog and initial workspace', () => {
  it('provides nine canonical missions - the original eight plus income - with algorithm still planned', () => {
    expect(v2Missions.map((mission) => mission.id)).toEqual(missionIds.filter(id => id !== 'fde'));
    expect(v2Missions.filter((mission) => mission.planned).map((mission) => mission.id)).toEqual(['algorithm']);
    const checkpointIds = new Set<string>();
    for (const mission of v2Missions.filter((entry) => !entry.planned)) {
      expect(mission.roadmapVersion).toBe('2.0.0');
      expect(mission.checkpoints.length).toBeGreaterThan(0);
      mission.checkpoints.forEach((checkpoint) => {
        expect(checkpointIds.has(checkpoint.id)).toBe(false);
        checkpointIds.add(checkpoint.id);
        expect(checkpoint.id.startsWith(`${mission.id}-v2-`)).toBe(true);
        expect(checkpoint.criteria.length).toBeGreaterThanOrEqual(1);
        expect(checkpoint.action.length).toBeGreaterThan(10);
        expect(checkpoint.recoveryAction.length).toBeGreaterThan(10);
        expect(checkpoint.minutes).toBeGreaterThan(0);
      });
    }
    expect(getMissionVersion('algorithm', '2.0.0').checkpoints).toEqual([]);
    expect(getMissionVersion('algorithm', '2.0.0').planned).toBe(true);
    expect(() => getMission('missing' as MissionId)).toThrow('roadmap exists');
  });

  it('starts an explicit v2 workspace without inferred progress, readiness, opportunities, or history', () => {
    const state = createInitialState(false, '2.0.0');
    expect(parseState(state)).toEqual(state);
    expect(state.sampleData).toBe(false);
    expect(state.focusMissionId).toBe('pattern');
    expect(state.evidence).toEqual([]);
    expect(state.events).toEqual([]);
    expect(state.opportunities).toEqual([]);
    expect(state.archives).toEqual([]);
    expect(state.freelanceOpportunities).toEqual([]);
    expect(state.recalls).toEqual([]);
    expect(state.plans).toEqual({});
    expect(Object.values(state.readiness)).toEqual(readinessKeys.map(() => 'unassessed'));
    v2Missions.forEach((mission) => {
      const progress = state.missions[mission.id];
      expect(progress.completedCheckpointIds).toEqual([]);
      expect(progress.status).toBe('not-started');
      expect(progress.roadmapVersion).toBe('2.0.0');
      expect(progress.checkpointId).toBe(mission.checkpoints[0]?.id ?? '');
    });
    expect(state.missions.algorithm).toMatchObject({ checkpointId: '', mode: 'planned', status: 'not-started' });
    expect(STORAGE_KEY).toBe('careerhq.workspace.v1');
  });

  it('defaults to clearly fictional sample data with genuine completion artifacts', () => {
    const state = createInitialState();
    expect(state.sampleData).toBe(true);
    expect(parseState(JSON.parse(JSON.stringify(state)))).toEqual(state);
    expect(missions.filter((mission) => state.missions[mission.id].mode === 'active').map((mission) => mission.id))
      .toEqual(['pattern', 'system', 'escape']);
    expect(state.evidence.length).toBeGreaterThan(0);
    expect(state.evidence.every((evidence) => evidence.title.startsWith('Fictional sample:'))).toBe(true);
    expect(state.opportunities.every((opportunity) => opportunity.notes.includes('Fictional'))).toBe(true);
    expect(state.missions.pattern.status).toBe('in-progress');
    for (const mission of missions) {
      for (const id of state.missions[mission.id].completedCheckpointIds) {
        expect(state.evidence.some((evidence) => evidence.missionId === mission.id &&
          evidence.checkpointId === id && evidence.completedCheckpoint)).toBe(true);
      }
    }
    expect(state.missions.credential.completedCheckpointIds).toEqual([]);
    expect(state.missions.income.completedCheckpointIds).toEqual([]);
    expect(Object.values(state.readiness)).not.toContain('ready');
    expect(state.missions.escape.completedCheckpointIds).toHaveLength(1);
    expect(state.missions.escape.status).toBe('not-started');
    expect(state.missions.escape.checkpointId).toBe(getMission('escape').checkpoints[1].id);
    const previous = createInitialState(true, '2.0.0');
    expect(previous.missions.escape.status).toBe('completed');
    expect(previous.missions.escape.checkpointId).toBe(getMissionVersion('escape', '2.0.0').checkpoints[0].id);
  });

  it.each([false, true])('has exactly one current checkpoint per available mission (sample=%s)', (sample) => {
    const state = createInitialState(sample);
    missions.forEach((mission) => {
      const progress = state.missions[mission.id];
      expect(mission.checkpoints.filter((checkpoint) => checkpoint.id === progress.checkpointId))
        .toHaveLength(mission.planned ? 0 : 1);
      if (!mission.planned) {
        const expectedId = progress.status === 'completed'
          ? progress.completedCheckpointIds.at(-1)
          : mission.checkpoints[progress.completedCheckpointIds.length]?.id;
        expect(progress.checkpointId).toBe(expectedId);
      }
    });
  });

  it('returns next-unlock titles independently of the current action and blocker', () => {
    const state = createInitialState(false);
    const mission = getMission('pattern');
    expect(getSaveState(mission, state)).toEqual({
      stage: mission.checkpoints[0].stage,
      checkpoint: mission.checkpoints[0],
      status: 'not-started',
      next: mission.checkpoints[1].title,
      completed: 0,
      total: mission.checkpoints.length,
    });
    state.missions.pattern.blocker = 'Need a smaller example';
    expect(getSaveState(mission, state).next).toBe(mission.checkpoints[1].title);
    expect(getSaveState(mission, state).checkpoint?.action).toBe(mission.checkpoints[0].action);
    expect(getSaveState(getMissionVersion('algorithm', '2.0.0'), createInitialState(false, '2.0.0'))).toEqual({
      stage: 'Planned', checkpoint: undefined, status: 'not-started',
      next: 'Awaiting canonical roadmap', completed: 0, total: 0,
    });
  });

  it('keeps next unlock sequential through the final incomplete and completed checkpoint', () => {
    let state = createInitialState(false, '2.0.0');
    const mission = getMission('pattern', state);
    mission.checkpoints.forEach((_checkpoint, index) => {
      const expected = mission.checkpoints[index + 1]?.title ?? 'Mission complete';
      expect(getSaveState(mission, state).next).toBe(expected);
      state.missions.pattern.blocker = 'Clarify an example';
      expect(getSaveState(mission, state).next).toBe(expected);
      state.missions.pattern.blocker = '';
      state = advance(state);
    });
    expect(getSaveState(mission, state).status).toBe('completed');
    expect(getSaveState(mission, state).next).toBe('Mission complete');
  });

  it('reports a read-only Preview with no total when a mission has no snapshot at its requested version', () => {
    const state = createInitialState(false, '2.0.0');
    const legacyPattern = getMissionVersion('pattern', '1.0.0');
    // state.missions.pattern is on 2.0.0 and there is no 1.0.0 archive, so the 1.0.0
    // mission definition has no matching progress snapshot at all.
    expect(getSaveState(legacyPattern, state)).toEqual({
      stage: 'Preview',
      checkpoint: undefined,
      status: 'not-started',
      next: legacyPattern.checkpoints[0].title,
      completed: 0,
      total: legacyPattern.checkpoints.length,
    });
  });
});

describe('local dates and deterministic daily plans', () => {
  it('formats local calendar components rather than slicing a UTC timestamp', () => {
    const date = new Date('2026-01-01T23:45:00.000Z');
    vi.spyOn(date, 'getFullYear').mockReturnValue(2026);
    vi.spyOn(date, 'getMonth').mockReturnValue(0);
    vi.spyOn(date, 'getDate').mockReturnValue(2);
    expect(localDate(date)).toBe('2026-01-02');
    expect(date.toISOString().slice(0, 10)).toBe('2026-01-01');
    expect(localDate(new Date(2026, 0, 2, 0, 1))).toBe('2026-01-02');
    expect(localDate()).toBe('2026-10-04');
    expect(() => localDate(new Date('invalid'))).toThrow('invalid date');
  });

  it.each<Capacity>(['gentle', 'steady', 'deep'])('keeps %s within its budget and action cap', (capacity) => {
    const budgets = { gentle: 15, steady: 75, deep: 120 };
    for (const focusMissionId of missionIds) {
      const state = createInitialState(false);
      state.capacity = capacity;
      state.focusMissionId = focusMissionId;
      missions.filter((mission) => !mission.planned).forEach((mission) => {
        state.missions[mission.id].mode = 'active';
      });
      const actions = generatePlan(state);
      expect(actions.length).toBeLessThanOrEqual(capacity === 'gentle' ? 1 : 3);
      expect(actions.length).toBeGreaterThan(0);
      expect(actions.reduce((sum, action) => sum + action.minutes, 0)).toBeLessThanOrEqual(budgets[capacity]);
      expect(generatePlan(state)).toEqual(actions);
      if (focusMissionId !== 'algorithm') expect(actions[0].missionId).toBe(focusMissionId);
      if (capacity === 'gentle') {
        const checkpoint = getSaveState(getMission(actions[0].missionId), state).checkpoint!;
        expect(actions[0].title).toBe(checkpoint.recoveryAction);
        expect(actions[0].reason).toContain('Recovery pace');
      }
    }
  });

  it('takes focus first, then interview mode priorities, using definition order as the tiebreak', () => {
    const state = createInitialState(false, '2.0.0');
    state.focusMissionId = 'neural';
    state.missions.neural.mode = 'active';
    // No interview weight applies to neural; among the remaining equal-priority active
    // missions (pattern, system, escape), stable definition order plus the 75-minute
    // steady budget admits pattern and system but not the third-ranked escape.
    expect(generatePlan(state).map((action) => action.missionId)).toEqual(['neural', 'pattern', 'system']);
    state.interviewMode = true;
    // Interview weighting now ranks escape (3) above system (2) above pattern (1), but never
    // above the focus mission itself; system's checkpoint no longer fits the remaining budget
    // after neural and escape, so pattern (next by weight) is admitted instead.
    expect(generatePlan(state).map((action) => action.missionId)).toEqual(['neural', 'escape', 'pattern']);
    state.focusMissionId = 'pattern';
    expect(generatePlan(state).map((action) => action.missionId)).toEqual(['pattern', 'escape', 'system']);
  });

  it('skips blockers, background, planned, and complete missions', () => {
    let state = createInitialState(false);
    for (const _checkpoint of getMission('pattern').checkpoints) state = advance(state);
    state.missions.system.blocker = 'Need a design question';
    state.missions.escape.mode = 'background';
    expect(generatePlan(state)).toEqual([]);
    state.missions.fabric.mode = 'active';
    expect(generatePlan(state).map((action) => action.missionId)).toEqual(['fabric']);
  });

  it('treats related missions as support, never hard prerequisites', () => {
    const state = createInitialState(false);
    state.focusMissionId = 'fabric';
    state.missions.fabric.mode = 'active';
    state.missions.system.mode = 'background';
    expect(state.missions.system.completedCheckpointIds).toEqual([]);
    expect(generatePlan(state)[0].missionId).toBe('fabric');
    expect(() => advance(state, 'fabric')).not.toThrow();
  });

  it('keeps an existing day as-is despite progress, settings, or blockers', () => {
    let state = planned();
    const firstCheckpointId = state.missions.pattern.checkpointId;
    state = advance(state);
    const existing = state.plans[localDate()];
    state.capacity = 'gentle';
    state.focusMissionId = 'escape';
    state.interviewMode = true;
    state.missions.system.blocker = 'Paused for a question';
    expect(generatePlan(state)).toBe(existing);
    expect(generatePlan(state)[0].completed).toBe(true);
    expect(generatePlan(state)[0].checkpointId).toBe(firstCheckpointId);
    expect(parseState(state)).toEqual(state);
    delete state.plans[localDate()];
    expect(generatePlan(state)).toHaveLength(1);
    expect(generatePlan(state)[0].missionId).toBe('escape');
  });

  it('preserves an explicitly empty plan and never carries missed actions forward', () => {
    const state = planned(createInitialState(false, '2.0.0'), '2026-10-03');
    const yesterday = structuredClone(state.plans['2026-10-03']);
    const today = generatePlan(state);
    expect(today).toHaveLength(3);
    expect(today.every((action) => action.date === '2026-10-04')).toBe(true);
    expect(today.some((action) => yesterday.some((old) => old.id === action.id))).toBe(false);
    expect(state.plans['2026-10-03']).toEqual(yesterday);
    state.plans[localDate()] = [];
    expect(generatePlan(state)).toBe(state.plans[localDate()]);
  });

  it.each(['2026-02-30', '2025-02-29', '2026-13-01', '2026-1-01', '0000-01-01', '__proto__'])(
    'rejects malformed plan dates: %s', (date) => {
      expect(() => generatePlan(createInitialState(false), date)).toThrow();
    },
  );

  it('accepts a real leap day', () => {
    expect(generatePlan(createInitialState(false, '2.0.0'), '2028-02-29')).toHaveLength(3);
  });

  it('stamps each generated action with the mission roadmap version and a version-qualified stable ID', () => {
    const state = planned();
    for (const action of state.plans[localDate()]) {
      expect(action.roadmapVersion).toBe(state.missions[action.missionId].roadmapVersion);
      expect(action.id).toContain(action.roadmapVersion);
      expect(action.id).toContain(action.checkpointId);
    }
    expect(generatePlan(state)).toBe(state.plans[localDate()]);
  });

  it('uses getMissions(state) so a per-mission roadmap version change is reflected in planning', () => {
    const state = createInitialState(false, '2.0.0');
    expect(getMissions(state).map((mission) => mission.roadmapVersion)).toEqual(
      missionIds.map(id => id === 'fde' ? '3.0.0' : '2.0.0'),
    );
  });
});

describe('evidence, DAG checkpoint gates, and immutable history', () => {
  it('starts a checkpoint from evidence without claiming completion or mastery', () => {
    const before = createInitialState(false, '2.0.0');
    const firstCheckpointId = before.missions.pattern.checkpointId;
    const state = recordEvidence(before, input(before));
    expect(state.missions.pattern).toMatchObject({
      status: 'in-progress', checkpointId: firstCheckpointId, completedCheckpointIds: [],
    });
    expect(state.evidence[0].completedCheckpoint).toBe(false);
    expect(state.evidence[0].visibility).toBe('local');
    expect(state.evidence[0].roadmapVersion).toBe('2.0.0');
    expect(state.events).toHaveLength(1);
    expect(state.events[0].type).toBe('evidence-recorded');
    expect(state.readiness).toEqual(before.readiness);
    expect(state.updatedAt > before.updatedAt).toBe(true);
  });

  it.each([false, true])('records background work without changing focus, mode, or plans (complete=%s)', (complete) => {
    const before = planned(createInitialState(false));
    before.focusMissionId = 'pattern';
    const current = before.missions.fabric;
    expect(current.mode).toBe('background');
    const snapshot = JSON.stringify(before);
    freeze(before);
    const state = recordEvidence(before, input(before, 'fabric', { advance: complete, criteriaConfirmed: complete }));
    expect(state.missions.fabric.mode).toBe('background');
    expect(state.focusMissionId).toBe(before.focusMissionId);
    expect(state.evidence).toHaveLength(1);
    expect(state.evidence[0]).toMatchObject({
      missionId: 'fabric', checkpointId: current.checkpointId,
      roadmapVersion: current.roadmapVersion, completedCheckpoint: complete,
    });
    expect(state.missions.fabric.completedCheckpointIds).toEqual(complete ? [current.checkpointId] : []);
    if (complete) expect(state.missions.fabric.checkpointId).not.toBe(current.checkpointId);
    else expect(state.missions.fabric).toEqual({ ...current, status: 'in-progress' });
    expect(state.plans).toEqual(before.plans);
    expect(generatePlan(state, '2026-10-05').some(action => action.missionId === 'fabric')).toBe(false);
    expect(state.schemaVersion).toBe(before.schemaVersion);
    expect(state.roadmapVersion).toBe(before.roadmapVersion);
    expect(state.readiness).toEqual(before.readiness);
    expect(missionIds.filter(id => id !== 'fabric').map(id => state.missions[id]))
      .toEqual(missionIds.filter(id => id !== 'fabric').map(id => before.missions[id]));
    expect(JSON.stringify(before)).toBe(snapshot);
    expect(parseState(JSON.parse(JSON.stringify(state)))).toEqual(state);
  });

  it('keeps background evidence on its saved roadmap and rejects reference-only or planned checkpoints', () => {
    const before = createInitialState(false, '2.0.0');
    expect(() => recordEvidence(before, input(before, 'fabric', {
      checkpointId: getMission('fabric').checkpoints[0].id,
    }))).toThrow('Unknown checkpoint');
    expect(() => recordEvidence(before, input(before, 'algorithm', {
      checkpointId: getMission('algorithm').checkpoints[0].id,
    }))).toThrow('Unknown checkpoint');
    const state = recordEvidence(before, input(before, 'fabric'));
    expect(state.evidence[0].roadmapVersion).toBe('2.0.0');
    expect(state.missions.fabric.roadmapVersion).toBe('2.0.0');
    expect(state.missions.fabric.mode).toBe('background');
  });

  it('completes a daily action without advancing its checkpoint', () => {
    const before = planned();
    const action = before.plans[localDate()][0];
    const state = recordEvidence(before, input(before, 'pattern', { actionId: action.id }));
    expect(state.plans[localDate()].map((entry) => entry.completed)).toEqual([true, false, false]);
    expect(state.missions.pattern.status).toBe('in-progress');
    expect(state.missions.pattern.completedCheckpointIds).toEqual([]);
    expect(state.evidence[0].completedCheckpoint).toBe(false);
    expect(() => recordEvidence(state, input(state, 'pattern', { actionId: action.id }))).toThrow('no longer available');
    expect(() => recordEvidence(state, input(state))).not.toThrow();
  });

  it('completes same-date sample fixture work after valid UI focus and mode edits', () => {
    let state = planned(createInitialState());
    const date = localDate();
    const patternAction = state.plans[date].find((action) => action.missionId === 'pattern')!;
    const systemAction = state.plans[date].find((action) => action.missionId === 'system')!;
    state = recordChange({ ...state, focusMissionId: 'escape' }, 'Changed focus', 'escape');
    state = recordChange({
      ...state,
      missions: { ...state.missions, system: { ...state.missions.system, mode: 'background' } },
    }, 'Changed mission mode', 'system');
    state = parseState(JSON.parse(JSON.stringify(state)));
    expect(state.focusMissionId).toBe('escape');
    expect(state.missions.system.mode).toBe('background');
    expect(state.plans[date].some((action) => action.id === systemAction.id)).toBe(true);
    const evidenceCount = state.evidence.length;
    state = recordEvidence(state, input(state, 'pattern', { actionId: patternAction.id }));
    expect(state.plans[date].find((action) => action.id === patternAction.id)?.completed).toBe(true);
    expect(state.missions.pattern.checkpointId).toBe(patternAction.checkpointId);
    expect(state.missions.pattern.status).toBe('in-progress');
    expect(state.evidence).toHaveLength(evidenceCount + 1);
    expect(state.evidence.at(-1)?.completedCheckpoint).toBe(false);
    expect(() => recordEvidence(state, input(state, 'system', { actionId: systemAction.id })))
      .toThrow('active mission');
    const background = recordEvidence(state, input(state, 'system'));
    expect(background.missions.system.mode).toBe('background');
    expect(background.focusMissionId).toBe('escape');
    expect(background.plans).toEqual(state.plans);
    expect(background.evidence.at(-1)?.completedCheckpoint).toBe(false);
    expect(() => parseState(state)).not.toThrow();
  });

  it('does not mark daily work complete from unlinked partial evidence', () => {
    const before = planned();
    const state = recordEvidence(before, input(before));
    expect(state.plans[localDate()].every((action) => !action.completed)).toBe(true);
  });

  it('requires confirmed criteria, then advances precisely one checkpoint', () => {
    const before = planned();
    expect(() => recordEvidence(before, input(before, 'pattern', { advance: true }))).toThrow('Confirm all');
    const firstCheckpointId = before.missions.pattern.checkpointId;
    const secondCheckpointId = getMission('pattern').checkpoints[1].id;
    const state = advance(before);
    expect(state.missions.pattern).toMatchObject({
      checkpointId: secondCheckpointId, status: 'not-started', completedCheckpointIds: [firstCheckpointId],
    });
    expect(state.evidence[0].completedCheckpoint).toBe(true);
    expect(state.events[0].type).toBe('checkpoint-completed');
    expect(state.plans[localDate()][0].completed).toBe(true);
    expect(state.readiness).toEqual(before.readiness);
    expect(state.missions.system).toEqual(before.missions.system);
  });

  it('automatically resolves matching today actions but preserves historical plans', () => {
    const before = planned(planned(createInitialState(false), '2026-10-03'));
    const yesterday = structuredClone(before.plans['2026-10-03']);
    const state = advance(before);
    expect(state.plans[localDate()][0].completed).toBe(true);
    expect(state.plans['2026-10-03']).toEqual(yesterday);
    expect(() => parseState(state)).not.toThrow();
  });

  it('advances all the way to an evidenced final checkpoint and excludes it from new plans', () => {
    let state = createInitialState(false, '2.0.0');
    const mission = getMission('pattern', state);
    mission.checkpoints.forEach((checkpoint, index) => {
      expect(state.missions.pattern.checkpointId).toBe(checkpoint.id);
      state = advance(state);
      expect(state.missions.pattern.completedCheckpointIds).toEqual(mission.checkpoints.slice(0, index + 1).map((entry) => entry.id));
      expect(parseState(state)).toEqual(state);
    });
    expect(getSaveState(mission, state)).toMatchObject({
      status: 'completed', next: 'Mission complete', completed: mission.checkpoints.length, total: mission.checkpoints.length,
    });
    expect(state.missions.pattern.checkpointId).toBe(mission.checkpoints.at(-1)!.id);
    expect(generatePlan(state).some((action) => action.missionId === 'pattern')).toBe(false);
    expect(state.evidence).toHaveLength(mission.checkpoints.length);
    expect(state.events).toHaveLength(mission.checkpoints.length);
    expect(state.readiness['Coding patterns']).toBe('unassessed');
    expect(() => recordEvidence(state, input(state))).toThrow('already complete');
  });

  it('is atomic and never mutates state, actions, or evidence input', () => {
    const before = freeze(planned());
    const data = freeze(input(before, 'pattern', { advance: true, criteriaConfirmed: true }));
    const serialized = JSON.stringify(before);
    const state = recordEvidence(before, data);
    expect(JSON.stringify(before)).toBe(serialized);
    expect(state).not.toBe(before);
    expect(state.missions).not.toBe(before.missions);
    expect(state.plans[localDate()]).not.toBe(before.plans[localDate()]);
    expect(data.advance).toBe(true);
    expect(() => recordEvidence(before, { ...data, summary: 'short' })).toThrow();
    expect(JSON.stringify(before)).toBe(serialized);
    expect(before.evidence).toEqual([]);
  });

  it.each(['active', 'background'] as const)('requires unblocked current checkpoints and confirmed criteria in %s missions', (mode) => {
    const state = createInitialState(false);
    state.missions.pattern.mode = mode;
    const otherMissionCheckpointId = getMission('system').checkpoints[0].id;
    const sameMissionLaterCheckpointId = getMission('pattern').checkpoints[1].id;
    expect(() => recordEvidence(state, input(state, 'pattern', { advance: true }))).toThrow('Confirm all');
    expect(() => recordEvidence(state, input(state, 'algorithm', { checkpointId: 'algorithm-invented' }))).toThrow('Unknown checkpoint');
    expect(() => recordEvidence(state, input(state, 'pattern', { checkpointId: otherMissionCheckpointId }))).toThrow('Unknown checkpoint');
    expect(() => recordEvidence(state, input(state, 'pattern', { checkpointId: sameMissionLaterCheckpointId }))).toThrow('current checkpoint');
    state.missions.pattern.blocker = 'Clarify an example';
    expect(() => recordEvidence(state, input(state))).toThrow('Resolve the mission blocker');
    state.missions.pattern.blocker = '';
    const firstCheckpointId = state.missions.pattern.checkpointId;
    const moved = advance(state);
    expect(() => recordEvidence(moved, input(moved, 'pattern', { checkpointId: firstCheckpointId }))).toThrow('current checkpoint');
  });

  it('rejects absent, wrong-mission, old-day, and old-checkpoint action IDs', () => {
    const state = planned();
    expect(() => recordEvidence(state, input(state, 'pattern', { actionId: 'missing' }))).toThrow('no longer available');
    const systemAction = state.plans[localDate()].find((action) => action.missionId === 'system')!;
    expect(() => recordEvidence(state, input(state, 'pattern', { actionId: systemAction.id }))).toThrow('no longer available');
    const oldAction = state.plans[localDate()][0];
    const moved = advance(state);
    expect(() => recordEvidence(moved, input(moved, 'pattern', { actionId: oldAction.id }))).toThrow('no longer available');
    vi.setSystemTime(new Date(2026, 9, 5, 9, 30));
    expect(() => recordEvidence(state, input(state, 'pattern', { actionId: oldAction.id }))).toThrow('no longer available');
  });

  it.each([
    { title: 'ab' },
    { title: '   ' },
    { title: 't'.repeat(121) },
    { summary: 'too short' },
    { summary: 's'.repeat(4001) },
    { kind: 'unknown' },
    { advance: 'yes' },
    { criteriaConfirmed: 1 },
    { url: 'https://example.com/' + 'a'.repeat(2048) },
    { unexpected: true },
  ])('rejects invalid evidence input without partial writes (case %#)', (change) => {
    const state = createInitialState(false);
    const before = structuredClone(state);
    expect(() => recordEvidence(state, { ...input(state), ...change } as EvidenceInput)).toThrow();
    expect(state).toEqual(before);
  });

  it.each([
    'javascript:alert(1)', 'data:text/html,<script>alert(1)</script>', 'file:///secret',
    '//example.com', 'https:example.com', 'ftp://example.com', '******example.com',
    'https://example.com\\@evil.test', 'https://exa\nmple.com', 'http://',
  ])('rejects unsafe or malformed URLs: %s', (url) => {
    const state = createInitialState(false);
    expect(() => recordEvidence(state, input(state, 'pattern', { url }))).toThrow();
  });

  it.each(['', 'http://example.com/example', 'https://example.com/path?example=1#section'])(
    'accepts safe optional URLs: %s', (url) => {
      const state = createInitialState(false);
      expect(recordEvidence(state, input(state, 'pattern', { url })).evidence[0].url).toBe(url);
    },
  );

  it('trims form text but does not silently normalize imported state', () => {
    const state = createInitialState(false);
    const result = recordEvidence(state, input(state, 'pattern', { title: '  Clear title  ', url: ' https://example.com ' }));
    expect(result.evidence[0].title).toBe('Clear title');
    expect(result.evidence[0].url).toBe('https://example.com');
    result.evidence[0].url = ' https://example.com ';
    expect(() => parseState(result)).toThrow();
  });

  it('appends immutable change events after validating already-applied UI changes', () => {
    const before = freeze({ ...createInitialState(false), capacity: 'deep' as const });
    const state = recordChange(before, '  Changed capacity  ', 'pattern');
    expect(state.capacity).toBe('deep');
    expect(state.events[0]).toMatchObject({
      type: 'workspace-change', title: 'Changed capacity', missionId: 'pattern',
    });
    expect(state.updatedAt > before.updatedAt).toBe(true);
    expect(before.events).toEqual([]);
    expect(() => recordChange(before, '')).toThrow();
    expect(() => recordChange(before, 'x'.repeat(201))).toThrow();
    expect(() => recordChange(before, 'Change', 'missing' as MissionId)).toThrow();
    expect(() => recordChange({ ...before, capacity: 'unknown' } as unknown as AppState, 'Change')).toThrow();
  });

  it('preserves arbitrary bounded historical event types and monotonic appends after a clock rollback', () => {
    let state = recordChange(createInitialState(false), 'Initial setting');
    state.events[0].type = 'legacy-setting-edited';
    const first = structuredClone(state.events[0]);
    vi.setSystemTime(new Date(2026, 8, 1));
    state = recordEvidence(state, input(state));
    state = recordChange(state, 'Another setting');
    expect(state.events[0]).toEqual(first);
    const times = state.events.map((event) => Date.parse(event.createdAt));
    expect(times[1]).toBeGreaterThan(times[0]);
    expect(times[2]).toBeGreaterThan(times[1]);
    expect(new Set([...state.events, ...state.evidence].map((entry) => entry.id)).size)
      .toBe(state.events.length + state.evidence.length);
  });
});

describe('checkpoint branching, explicit activation, and locked-evidence rules', () => {
  it('exposes a genuine DAG branch and lets the user explicitly choose between two reachable checkpoints', () => {
    const mission = getMission('pattern');
    const [fundamentals, firstPattern, frequency, complement, grouping] = mission.checkpoints;
    let state = createInitialState(false);
    state = advance(state); // completes fundamentals
    state = advance(state); // completes firstPattern
    state = advance(state); // completes frequency -> both complement and grouping are now unlocked
    expect(state.missions.pattern.checkpointId).toBe(complement.id); // definition-order default
    expect(state.missions.pattern.completedCheckpointIds).toEqual([fundamentals.id, firstPattern.id, frequency.id]);

    const switched = activateCheckpoint(state, 'pattern', grouping.id);
    expect(switched.missions.pattern.checkpointId).toBe(grouping.id);
    expect(switched.missions.pattern.status).toBe('not-started');
    expect(switched.missions.pattern.completedCheckpointIds).toEqual(state.missions.pattern.completedCheckpointIds);
    expect(switched.events.at(-1)).toMatchObject({ type: 'checkpoint-activated', missionId: 'pattern' });

    const switchedBack = activateCheckpoint(switched, 'pattern', complement.id);
    expect(switchedBack.missions.pattern.checkpointId).toBe(complement.id);
    expect(() => parseState(switchedBack)).not.toThrow();
  });

  it('rejects activating a locked, already-completed, unknown, or planned-mission checkpoint', () => {
    const mission = getMission('pattern');
    const [fundamentals, , , , grouping] = mission.checkpoints;
    let state = createInitialState(false);
    expect(() => activateCheckpoint(state, 'pattern', grouping.id)).toThrow('locked');
    state = advance(state);
    expect(() => activateCheckpoint(state, 'pattern', fundamentals.id)).toThrow('already completed');
    expect(() => activateCheckpoint(state, 'pattern', 'invented-checkpoint')).toThrow('Unknown checkpoint');
    expect(() => activateCheckpoint(createInitialState(false, '2.0.0'), 'algorithm', 'anything')).toThrow('planned mission');
  });

  it('lets prior practice evidence remain valid after the active checkpoint is switched elsewhere', () => {
    const mission = getMission('pattern');
    const [, , , complement, grouping] = mission.checkpoints;
    let state = createInitialState(false);
    state = advance(state);
    state = advance(state);
    state = advance(state); // current checkpoint is now complement
    state = recordEvidence(state, input(state, 'pattern', { checkpointId: complement.id, advance: false }));
    state = activateCheckpoint(state, 'pattern', grouping.id);
    expect(() => parseState(state)).not.toThrow();
    expect(state.evidence.some((entry) => entry.checkpointId === complement.id)).toBe(true);
    // recordEvidence itself still only targets the current checkpoint - the old evidence is
    // preserved and valid, but new evidence cannot be written against a non-current checkpoint.
    expect(() => recordEvidence(state, input(state, 'pattern', { checkpointId: complement.id })))
      .toThrow('current checkpoint');
  });

  it('rejects upgrading a mission that is already on the latest roadmap version', () => {
    const state = createInitialState(false);
    expect(() => upgradeRoadmap(state, 'pattern')).toThrow('already on the latest version');
  });
});

describe('recall tracking and spaced-repetition self-assessment', () => {
  it('derives not-started, learning, practiced, needs-review, and retained from evidence and recall history', () => {
    let state = createInitialState(false, '2.0.0');
    const checkpointId = state.missions.pattern.checkpointId;
    expect(recallSummary(state, 'pattern', checkpointId, '2.0.0')).toEqual({ status: 'not-started', nextReviewAt: null });

    state = recordEvidence(state, input(state, 'pattern', { checkpointId }));
    const firstEvidenceAt = Date.parse(state.evidence[0].createdAt);
    let summary = recallSummary(state, 'pattern', checkpointId, '2.0.0');
    expect(summary.status).toBe('learning');
    expect(summary.nextReviewAt).toBe(new Date(firstEvidenceAt + 24 * HOUR).toISOString());

    vi.setSystemTime(new Date(firstEvidenceAt + 30 * HOUR));
    state = recordRecall(state, {
      missionId: 'pattern', roadmapVersion: '2.0.0', checkpointId, outcome: 'partial',
      checks: { explanation: true, diagram: false, exercise: false }, notes: 'Mostly recalled it.',
    });
    summary = recallSummary(state, 'pattern', checkpointId, '2.0.0');
    expect(summary.status).toBe('practiced');
    expect(state.missions.pattern.completedCheckpointIds).toEqual([]);
    expect(state.missions.pattern.checkpointId).toBe(checkpointId);

    vi.setSystemTime(new Date(firstEvidenceAt + 40 * HOUR));
    state = recordRecall(state, {
      missionId: 'pattern', roadmapVersion: '2.0.0', checkpointId, outcome: 'needs-review',
      checks: { explanation: false, diagram: false, exercise: false }, notes: 'Lost the thread halfway through.',
    });
    expect(recallSummary(state, 'pattern', checkpointId, '2.0.0')).toMatchObject({ status: 'needs-review', nextReviewAt: null });

    const firstIndependentAt = firstEvidenceAt + 50 * HOUR;
    vi.setSystemTime(new Date(firstIndependentAt));
    state = recordRecall(state, {
      missionId: 'pattern', roadmapVersion: '2.0.0', checkpointId, outcome: 'independent',
      checks: { explanation: true, diagram: false, exercise: true }, notes: 'Explained and re-derived without notes.',
    });
    summary = recallSummary(state, 'pattern', checkpointId, '2.0.0');
    expect(summary.status).toBe('practiced');
    const dueForSecond = new Date(Math.max(firstEvidenceAt + 96 * HOUR, firstIndependentAt + 48 * HOUR)).toISOString();
    expect(summary.nextReviewAt).toBe(dueForSecond);

    vi.setSystemTime(new Date(firstIndependentAt + 48 * HOUR + HOUR));
    state = recordRecall(state, {
      missionId: 'pattern', roadmapVersion: '2.0.0', checkpointId, outcome: 'independent',
      checks: { explanation: true, diagram: false, exercise: true }, notes: 'Second independent pass, cold.',
    });
    expect(recallSummary(state, 'pattern', checkpointId, '2.0.0')).toMatchObject({ status: 'retained', nextReviewAt: null });
    // Checkpoint completion is never touched by any of this read-only self-assessment.
    expect(state.missions.pattern.completedCheckpointIds).toEqual([]);
    expect(state.missions.pattern.checkpointId).toBe(checkpointId);

    vi.setSystemTime(new Date(firstEvidenceAt + 400 * HOUR));
    state = recordRecall(state, {
      missionId: 'pattern', roadmapVersion: '2.0.0', checkpointId, outcome: 'needs-review',
      checks: { explanation: false, diagram: false, exercise: false }, notes: 'Forgot the complement trick.',
    });
    expect(recallSummary(state, 'pattern', checkpointId, '2.0.0')).toMatchObject({ status: 'needs-review', nextReviewAt: null });
    expect(state.missions.pattern.completedCheckpointIds).toEqual([]);
  });

  it('supports recall only for pattern and system, gated on prior learning evidence for a referenceable checkpoint', () => {
    const state = createInitialState(false, '2.0.0');
    expect(() => recordRecall(state, {
      missionId: 'escape', roadmapVersion: '2.0.0', checkpointId: state.missions.escape.checkpointId,
      outcome: 'partial', checks: { explanation: true, diagram: true, exercise: true }, notes: 'Not supported.',
    } as unknown as Parameters<typeof recordRecall>[1])).toThrow();
    expect(() => recordRecall(state, {
      missionId: 'pattern', roadmapVersion: '2.0.0', checkpointId: state.missions.pattern.checkpointId,
      outcome: 'partial', checks: { explanation: true, diagram: true, exercise: true }, notes: 'No prior evidence yet.',
    })).toThrow('prior learning evidence');
    const withEvidence = recordEvidence(state, input(state));
    const laterCheckpointId = getMission('pattern', state).checkpoints[1].id;
    expect(() => recordRecall(withEvidence, {
      missionId: 'pattern', roadmapVersion: '2.0.0', checkpointId: laterCheckpointId,
      outcome: 'partial', checks: { explanation: true, diagram: true, exercise: true }, notes: 'Not unlocked yet.',
    })).toThrow();
  });

  it('requires the full independent-recall check set per mission (pattern vs. system)', () => {
    let pattern = createInitialState(false, '2.0.0');
    pattern = recordEvidence(pattern, input(pattern, 'pattern'));
    const patternCp = pattern.missions.pattern.checkpointId;
    expect(() => recordRecall(pattern, {
      missionId: 'pattern', roadmapVersion: '2.0.0', checkpointId: patternCp, outcome: 'independent',
      checks: { explanation: true, diagram: false, exercise: false }, notes: 'Missing exercise.',
    })).toThrow('explanation and exercise');
    expect(() => recordRecall(pattern, {
      missionId: 'pattern', roadmapVersion: '2.0.0', checkpointId: patternCp, outcome: 'independent',
      checks: { explanation: true, diagram: false, exercise: true }, notes: 'Complete.',
    })).not.toThrow();

    let system = createInitialState(false, '2.0.0');
    system = recordEvidence(system, input(system, 'system'));
    const systemCp = system.missions.system.checkpointId;
    expect(() => recordRecall(system, {
      missionId: 'system', roadmapVersion: '2.0.0', checkpointId: systemCp, outcome: 'independent',
      checks: { explanation: true, diagram: false, exercise: true }, notes: 'Missing diagram.',
    })).toThrow('all three checks');
    expect(() => recordRecall(system, {
      missionId: 'system', roadmapVersion: '2.0.0', checkpointId: systemCp, outcome: 'independent',
      checks: { explanation: true, diagram: true, exercise: true }, notes: 'Complete.',
    })).not.toThrow();
  });
});

describe('private freelance ledger and extended optional fields', () => {
  it('validates freelance ledger rows: bounded strings, http(s) links, and the verdict enum', () => {
    const state = createInitialState(false);
    const row = {
      id: 'freelance-1', title: 'Build a small API integration', platform: 'Upwork',
      url: 'https://www.upwork.com/jobs/example', skills: 'C#, REST APIs', budget: '$500-800',
      verdict: 'Apply Now' as const, notes: 'Looks like a strong fit.', createdAt: state.updatedAt,
    };
    expect(() => parseState({ ...state, freelanceOpportunities: [row] })).not.toThrow();
    const invalid = [
      { verdict: 'Maybe' }, { url: 'javascript:alert(1)' }, { title: '' }, { title: 't'.repeat(161) },
      { skills: 's'.repeat(501) }, { budget: 'b'.repeat(121) }, { notes: 'n'.repeat(2001) }, { extra: true },
    ];
    invalid.forEach((change) => {
      expect(() => parseState({ ...state, freelanceOpportunities: [{ ...row, ...change }] })).toThrow();
    });
  });

  it('validates optional job lane, resumeVariant, effortMinutes, and frictionScore fields on an opportunity', () => {
    const state = createInitialState();
    const opportunity = {
      ...state.opportunities[0], lane: 'referral' as const, resumeVariant: 'Backend-focused',
      effortMinutes: 45, frictionScore: 3,
    };
    expect(() => parseState({ ...state, opportunities: [opportunity] })).not.toThrow();
    expect(() => parseState({ ...state, opportunities: [{ ...opportunity, effortMinutes: 1440 }] })).not.toThrow();
    const invalid = [
      { lane: 'unknown' }, { effortMinutes: -1 }, { effortMinutes: 1.5 }, { effortMinutes: 1441 },
      { frictionScore: -1 }, { frictionScore: 11 }, { resumeVariant: 'r'.repeat(121) },
    ];
    invalid.forEach((change) => {
      expect(() => parseState({ ...state, opportunities: [{ ...opportunity, ...change }] })).toThrow();
    });
  });
});

describe('strict v2 import validation and relational integrity', () => {
  it.each([
    ['unsupported future schema', (state: AppState) => ({ ...state, schemaVersion: 3 })],
    ['old roadmap', (state: AppState) => ({ ...state, roadmapVersion: '0.9.0' })],
    ['unsupported future roadmap', (state: AppState) => ({ ...state, roadmapVersion: '3.0.0' })],
    ['unknown root key', (state: AppState) => ({ ...state, injected: true })],
    ['missing mission', (state: AppState) => ({ ...state, missions: { ...state.missions, pattern: undefined } })],
    ['extra mission', (state: AppState) => ({ ...state, missions: { ...state.missions, invented: state.missions.pattern } })],
    ['unknown focus', (state: AppState) => ({ ...state, focusMissionId: 'missing' })],
    ['bad capacity', (state: AppState) => ({ ...state, capacity: 'unlimited' })],
    ['bad timestamp', (state: AppState) => ({ ...state, updatedAt: '2026-10-04' })],
    ['bad calendar timestamp', (state: AppState) => ({ ...state, updatedAt: '2026-02-30T12:00:00.000Z' })],
    ['huge objective', (state: AppState) => ({ ...state, objective: 'x'.repeat(501) })],
    ['bad readiness', (state: AppState) => ({ ...state, readiness: { ...state.readiness, 'Coding patterns': 'expert' } })],
    ['extra readiness key', (state: AppState) => ({ ...state, readiness: { ...state.readiness, invented: 'ready' } })],
    ['nonboolean sample flag', (state: AppState) => ({ ...state, sampleData: 'true' })],
    ['invalid plan key', (state: AppState) => ({ ...state, plans: { '2026-02-30': [] } })],
  ])('rejects %s', (_label, corrupt) => {
    expect(() => parseState(corrupt(createInitialState(false)))).toThrow('Invalid workspace');
  });

  it.each([null, undefined, [], 'not a workspace', 42, {}])('rejects malformed top-level values: %j', (value) => {
    expect(() => parseState(value)).toThrow('Invalid workspace');
  });

  it('rejects a current checkpoint set ahead of its own unmet prerequisites', () => {
    const mission = getMission('pattern');
    const state = createInitialState(false);
    state.missions.pattern.checkpointId = mission.checkpoints[1].id;
    expect(() => parseState(state)).toThrow('prerequisites');
  });

  it('rejects a completed checkpoint whose own DAG prerequisites were never completed', () => {
    const mission = getMission('pattern');
    const complement = mission.checkpoints[3]; // requires the frequency checkpoint, index 2
    const state = createInitialState(false);
    state.missions.pattern.completedCheckpointIds = [complement.id];
    state.missions.pattern.checkpointId = complement.id;
    state.missions.pattern.status = 'in-progress';
    expect(() => parseState(state)).toThrow('unmet prerequisites');
  });

  it('rejects a duplicated completed-checkpoint id and an unevidenced completion', () => {
    const mission = getMission('pattern');
    const duplicated = advance(createInitialState(false));
    duplicated.missions.pattern.completedCheckpointIds.push(duplicated.missions.pattern.completedCheckpointIds[0]);
    expect(() => parseState(duplicated)).toThrow('Duplicate completed checkpoint');

    const noProof = createInitialState(false);
    noProof.missions.pattern.completedCheckpointIds = [mission.checkpoints[0].id];
    noProof.missions.pattern.checkpointId = mission.checkpoints[1].id;
    expect(() => parseState(noProof)).toThrow('requires completion evidence');
  });

  it('raises the completed-checkpoint id schema cap to 250, never the legacy five', () => {
    const state = createInitialState(false);
    state.missions.pattern.completedCheckpointIds = Array.from({ length: 250 }, (_, i) => `x-${i}`);
    // 250 distinct ids pass the schema's own array-size limit; only this mission's much
    // smaller real checkpoint count makes it relationally invalid here.
    expect(() => parseState(state)).toThrow('Too many completed checkpoints');
    state.missions.pattern.completedCheckpointIds = Array.from({ length: 251 }, (_, i) => `x-${i}`);
    expect(() => parseState(state)).toThrow('Invalid workspace');
  });

  it('rejects inconsistent final status and bogus checkpoint statuses', () => {
    let state = createInitialState(false);
    state.missions.pattern.status = 'completed';
    expect(() => parseState(state)).toThrow('Final completion');
    state = createInitialState(false);
    for (const _checkpoint of getMission('pattern').checkpoints) state = advance(state);
    state.missions.pattern.status = 'in-progress';
    expect(() => parseState(state)).toThrow('Final completion');
    state.missions.pattern.status = 'invented' as AppState['missions']['pattern']['status'];
    expect(() => parseState(state)).toThrow('Invalid workspace');
  });

  it('rejects any progress on a planned mission and planned mode on an available mission', () => {
    const state = createInitialState(false, '2.0.0');
    state.missions.algorithm.mode = 'active';
    expect(() => parseState(state)).toThrow('is planned');
    state.missions.algorithm.mode = 'planned';
    state.missions.algorithm.checkpointId = 'invented';
    expect(() => parseState(state)).toThrow('is planned');
    state.missions.algorithm.checkpointId = '';
    state.missions.pattern.mode = 'planned';
    expect(() => parseState(state)).toThrow('cannot be planned');
  });

  it('rejects unsafe URLs, public visibility, unknown references, and false completion artifacts', () => {
    const base = recordEvidence(createInitialState(false), input(createInitialState(false)));
    const laterCheckpointId = getMission('pattern').checkpoints[1].id;
    const alterations = [
      { url: 'javascript:alert(1)' },
      { visibility: 'public' },
      { checkpointId: 'missing' },
      { checkpointId: laterCheckpointId },
      { missionId: 'system' },
      { completedCheckpoint: true },
      { extra: true },
    ];
    alterations.forEach((change) => {
      const state = { ...base, evidence: [{ ...base.evidence[0], ...change }] };
      expect(() => parseState(state)).toThrow();
    });
    base.missions.pattern.status = 'not-started';
    expect(() => parseState(base)).toThrow('must be started');
  });

  it('rejects duplicate record IDs and duplicate completion references', () => {
    const base = advance(createInitialState(false));
    expect(() => parseState({ ...base, evidence: [base.evidence[0], base.evidence[0]] })).toThrow('Duplicate record');
    expect(() => parseState({ ...base, evidence: [base.evidence[0], { ...base.evidence[0], id: 'another-id' }] }))
      .toThrow('Duplicate checkpoint completion');
    expect(() => parseState({ ...base, events: [base.events[0], base.events[0]] })).toThrow('Duplicate record');
    expect(() => parseState({ ...base, events: [{ ...base.events[0], id: base.evidence[0].id }] })).toThrow('Duplicate record');
    const sample = createInitialState();
    sample.opportunities.push(sample.opportunities[0]);
    expect(() => parseState(sample)).toThrow('Duplicate record');
  });

  it('validates plan size, dates, checkpoint refs, duration, and completed-action evidence', () => {
    const state = planned();
    const date = localDate();
    const base = state.plans[date];
    const laterCheckpointId = getMission('pattern').checkpoints[1].id;
    const invalidPlans = [
      [...base, { ...base[0], id: 'fourth' }],
      [{ ...base[0], date: '2026-10-03' }],
      [{ ...base[0], checkpointId: laterCheckpointId }],
      [{ ...base[0], checkpointId: 'missing' }],
      [{ ...base[0], missionId: 'algorithm', checkpointId: 'invented' }],
      [{ ...base[0], completed: true }],
      [{ ...base[0], minutes: 0 }],
      [{ ...base[0], minutes: 1.5 }],
      [{ ...base[0], minutes: 121 }],
      [{ ...base[0], minutes: 75 }, { ...base[1], minutes: 75 }],
      [base[0], { ...base[0], id: 'second-same-mission' }],
      [base[0], { ...base[1], id: base[0].id }],
    ];
    invalidPlans.forEach((actions) => {
      expect(() => parseState({ ...state, plans: { [date]: actions } })).toThrow();
    });
  });

  it('preserves completed plans and history when modes, capacity, focus, and readiness change', () => {
    let state = planned();
    for (const action of [...state.plans[localDate()]]) {
      state = recordEvidence(state, input(state, action.missionId, { actionId: action.id }));
    }
    const savedPlans = structuredClone(state.plans);
    const savedEvents = structuredClone(state.events);
    state.capacity = 'gentle';
    state.focusMissionId = 'neural';
    state.missions.pattern.mode = 'background';
    state.missions.system.blocker = 'Taking a break';
    state.readiness['Coding patterns'] = 'ready';
    const imported = parseState(JSON.parse(JSON.stringify(state)));
    expect(imported.plans).toEqual(savedPlans);
    expect(imported.events).toEqual(savedEvents);
    expect(imported.readiness['Coding patterns']).toBe('ready');
    expect(generatePlan(imported)).toBe(imported.plans[localDate()]);
  });

  it('validates opportunities and bounds optional text', () => {
    const state = createInitialState();
    const opportunity = state.opportunities[0];
    [
      { stage: 'Hired' }, { company: '' }, { role: ' ' }, { url: 'data:text/html,evil' },
      { notes: 'n'.repeat(4001) }, { createdAt: 'yesterday' }, { extra: true },
    ].forEach((change) => {
      expect(() => parseState({ ...state, opportunities: [{ ...opportunity, ...change }] })).toThrow();
    });
    state.missions.pattern.blocker = 'b'.repeat(1001);
    expect(() => parseState(state)).toThrow();
  });

  it('rejects unordered history and invalid event references without repairing them', () => {
    const state = recordChange(recordChange(createInitialState(false), 'First'), 'Second');
    expect(() => parseState({ ...state, events: [...state.events].reverse() })).toThrow('chronological');
    expect(() => parseState({ ...state, events: [{ ...state.events[0], missionId: 'missing' }] })).toThrow();
    expect(() => parseState({ ...state, events: [{ ...state.events[0], type: 'x'.repeat(81) }] })).toThrow();
  });

  it('bounds evidence, event, opportunity, and daily-plan collections', () => {
    const state = createInitialState();
    expect(() => parseState({ ...state, evidence: Array(5001).fill(state.evidence[0]) })).toThrow('Invalid workspace');
    expect(() => parseState({ ...state, events: Array(5001).fill(state.events[0]) })).toThrow('Invalid workspace');
    expect(() => parseState({ ...state, opportunities: Array(501).fill(state.opportunities[0]) })).toThrow('Invalid workspace');
    const plans = Object.fromEntries(Array.from({ length: 3661 }, (_, index) => {
      const date = new Date(2026, 0, index + 1);
      return [localDate(date), []];
    }));
    expect(() => parseState({ ...state, plans })).toThrow('Too many saved plan dates');
  });

  it('returns an independent validated clone without altering its input', () => {
    const state = freeze(planned(createInitialState()));
    const serialized = JSON.stringify(state);
    const imported = parseState(state);
    expect(imported).toEqual(state);
    expect(imported).not.toBe(state);
    expect(imported.missions.pattern).not.toBe(state.missions.pattern);
    expect(JSON.stringify(state)).toBe(serialized);
  });
});
