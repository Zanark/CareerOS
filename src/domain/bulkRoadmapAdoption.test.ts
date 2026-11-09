import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as catalog from './catalog';
import { getLatestMission, getMissionVersion } from './catalog';
import {
  countCompletedCheckpoints, createInitialState, generatePlan, localDate, parseState,
  previewRoadmapUpgrades, recordEvidence, recordFocusSessionEvent, recordRecall,
  startFocusSession, upgradeAllRoadmaps, upgradeRoadmap,
} from './engine';
import { missionIds, type AppState, type MissionId } from './types';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-06T10:00:00Z'));
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

function mixedState(): AppState {
  const state = createInitialState(false, '1.0.0');
  const v2 = createInitialState(false, '2.0.0');
  const latest = createInitialState(false);
  state.missions.pattern = v2.missions.pattern;
  state.missions.system = v2.missions.system;
  state.missions.escape = latest.missions.escape;
  state.missions.income = latest.missions.income;
  return parseState(state);
}

function evidence(state: AppState, missionId: MissionId, advance = true): AppState {
  return recordEvidence(state, {
    missionId, checkpointId: state.missions[missionId].checkpointId,
    title: 'Synthetic checkpoint work',
    summary: 'A fictional traced exercise with explicitly checked criteria.',
    kind: 'exercise', url: '', advance, criteriaConfirmed: advance,
  });
}

function freeze(value: unknown): void {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
}

describe('bulk roadmap preview', () => {
  it('reports no eligible targets for a fresh latest workspace without a success-shaped mutation', () => {
    const state = createInitialState(false);
    const before = JSON.stringify(state);
    const preview = previewRoadmapUpgrades(state);
    expect(preview.upgrades).toEqual([]);
    expect(() => upgradeAllRoadmaps(state, preview)).toThrow('All documented roadmaps are already adopted.');
    expect(JSON.stringify(state)).toBe(before);
  });

  it('lists only actual pending missions, exact versions and verified retention in a mixed workspace', () => {
    const state = mixedState();
    const before = JSON.stringify(state);
    const preview = previewRoadmapUpgrades(state);
    expect(preview.upgrades).toEqual(missionIds.filter(id => !['escape', 'income', 'fde'].includes(id)).map(missionId => ({
      missionId, name: getLatestMission(missionId).name,
      fromVersion: state.missions[missionId].roadmapVersion,
      toVersion: getLatestMission(missionId).roadmapVersion,
      preservesProgress: missionId === 'pattern',
    })));
    expect(previewRoadmapUpgrades(state)).toEqual(preview);
    expect(JSON.stringify(state)).toBe(before);
  });

  it('never infers DSA v1 equivalence or retention for other v2 roadmaps', () => {
    const v1 = previewRoadmapUpgrades(createInitialState(false, '1.0.0'));
    expect(v1.upgrades).toHaveLength(9);
    expect(v1.upgrades.every(upgrade => !upgrade.preservesProgress)).toBe(true);
    const v2 = previewRoadmapUpgrades(createInitialState(false, '2.0.0'));
    expect(v2.upgrades.filter(upgrade => upgrade.preservesProgress).map(upgrade => upgrade.missionId)).toEqual(['pattern']);
  });
});

describe('atomic bulk roadmap adoption', () => {
  it('preserves records, primary focus, modes and verified progress while archiving unrelated editions', () => {
    let state = mixedState();
    state = evidence(state, 'pattern');
    state = evidence(state, 'pattern', false);
    state = evidence(state, 'system');
    state.missions.fabric.mode = 'active';
    state = evidence(state, 'fabric');
    state = recordRecall(state, {
      missionId: 'pattern', roadmapVersion: '2.0.0',
      checkpointId: state.missions.pattern.checkpointId, outcome: 'needs-review',
      checks: { explanation: false, diagram: false, exercise: false }, notes: 'Synthetic self-review.',
    });
    state.missions.pattern.blocker = 'Synthetic retained blocker';
    state.missions.pattern.mode = 'background';
    state.missions.system.blocker = 'Synthetic archived blocker';
    state.focusMissionId = 'fabric';
    state.personalProof = [{
      id: 'bulk-proof-1', title: 'Synthetic past project', detail: 'A fictional project supplied only for this test.',
      source: 'Synthetic note, page 1', url: '',
    }];
    state = startFocusSession(state, 600);
    state = recordFocusSessionEvent(state, {
      sessionId: state.focusSessions![0].id, kind: 'distraction', elapsedMs: 1000,
    });
    state.plans[localDate()] = generatePlan(state);
    const before = JSON.stringify(state);
    const preview = previewRoadmapUpgrades(state);
    freeze(state);
    freeze(preview);
    const next = upgradeAllRoadmaps(state, preview);

    expect(JSON.stringify(state)).toBe(before);
    expect(next.missions.pattern).toEqual({ ...state.missions.pattern, roadmapVersion: '3.0.0' });
    for (const upgrade of preview.upgrades) {
      const old = state.missions[upgrade.missionId];
      expect(next.archives.find(archive => archive.missionId === upgrade.missionId)?.progress).toEqual(old);
      expect(next.missions[upgrade.missionId].mode).toBe(old.mode === 'planned' ? 'background' : old.mode);
      if (!upgrade.preservesProgress) {
        expect(next.missions[upgrade.missionId]).toMatchObject({
          checkpointId: getLatestMission(upgrade.missionId).checkpoints[0].id,
          status: 'not-started', completedCheckpointIds: [], blocker: '',
        });
      }
    }
    for (const id of ['escape', 'income'] as const) expect(next.missions[id]).toEqual(state.missions[id]);
    for (const field of [
      'schemaVersion', 'roadmapVersion', 'sampleData', 'objective', 'focusMissionId', 'capacity',
      'interviewMode', 'plans', 'evidence', 'recalls', 'personalProof', 'focusSessions',
      'readiness', 'opportunities', 'freelanceOpportunities',
    ] as const) expect(next[field], field).toEqual(state[field]);
    expect(next.events.slice(0, state.events.length)).toEqual(state.events);
    expect(next.events.slice(state.events.length).map(event => [event.type, event.missionId]))
      .toEqual(preview.upgrades.map(upgrade => ['roadmap-upgraded', upgrade.missionId]));
    expect(countCompletedCheckpoints(next)).toBe(countCompletedCheckpoints(state));
    expect(parseState(JSON.parse(JSON.stringify(next)))).toEqual(next);
  });

  it('advances a fully completed DSA v2 prefix to its first new topic without awarding another completion', () => {
    let state = createInitialState(false, '2.0.0');
    const previous = getMissionVersion('pattern', '2.0.0');
    for (const _checkpoint of previous.checkpoints) state = evidence(state, 'pattern');
    const next = upgradeAllRoadmaps(state, previewRoadmapUpgrades(state));
    expect(next.missions.pattern).toMatchObject({
      checkpointId: getLatestMission('pattern').checkpoints[previous.checkpoints.length].id,
      status: 'not-started', completedCheckpointIds: state.missions.pattern.completedCheckpointIds,
    });
    expect(next.evidence).toEqual(state.evidence);
    expect(countCompletedCheckpoints(next)).toBe(previous.checkpoints.length);
  });

  it('keeps all completed legacy work in archives without granting any new checkpoint credit', () => {
    let state = createInitialState(false, '1.0.0');
    state = evidence(state, 'pattern');
    const next = upgradeAllRoadmaps(state, previewRoadmapUpgrades(state));
    expect(Object.values(next.missions).every(progress => progress.completedCheckpointIds.length === 0)).toBe(true);
    expect(next.archives.find(archive => archive.missionId === 'pattern')!.progress.completedCheckpointIds)
      .toEqual(state.missions.pattern.completedCheckpointIds);
    expect(countCompletedCheckpoints(next)).toBe(1);
    expect(next.evidence).toEqual(state.evidence);
  });

  it('is exactly equivalent to applying the authoritative single-mission transform in catalog order', () => {
    const state = mixedState();
    const preview = previewRoadmapUpgrades(state);
    const single = preview.upgrades.reduce((next, upgrade) => upgradeRoadmap(next, upgrade.missionId), state);
    expect(upgradeAllRoadmaps(state, preview)).toEqual(single);
  });

  it('preserves existing older archives and leaves repeated all-current calls unchanged', () => {
    let state = createInitialState(false, '2.0.0');
    state.archives.push({
      missionId: 'fabric', archivedAt: state.updatedAt,
      progress: createInitialState(false, '1.0.0').missions.fabric,
    });
    state = parseState(state);
    const next = upgradeAllRoadmaps(state, previewRoadmapUpgrades(state));
    expect(next.archives[0]).toEqual(state.archives[0]);
    const beforeRepeat = JSON.stringify(next);
    expect(previewRoadmapUpgrades(next).upgrades).toEqual([]);
    expect(() => upgradeAllRoadmaps(next, previewRoadmapUpgrades(next))).toThrow('already adopted');
    expect(JSON.stringify(next)).toBe(beforeRepeat);
  });

  it.each([
    ['different scope', (state: AppState) => upgradeRoadmap(state, 'fabric')],
    ['same timestamp replacement', (state: AppState) => ({ ...state, objective: 'A different synthetic objective.' })],
    ['changed mode', (state: AppState) => {
      const changed = structuredClone(state);
      changed.missions.pattern.mode = 'background';
      return changed;
    }],
    ['new evidence', (state: AppState) => evidence(state, 'pattern', false)],
  ] as const)('rejects a confirmed preview after %s without changing either workspace', (_label, change) => {
    const state = createInitialState(false, '2.0.0');
    const preview = previewRoadmapUpgrades(state);
    const changed = change(state);
    const before = JSON.stringify(changed);
    expect(() => upgradeAllRoadmaps(changed, preview)).toThrow('workspace changed since this roadmap preview');
    expect(JSON.stringify(changed)).toBe(before);
    expect(previewRoadmapUpgrades(state)).toEqual(preview);
  });

  it.each(['remove', 'duplicate', 'rename', 'retention'] as const)('rejects a %s alteration of the confirmed preview', alteration => {
    const state = mixedState();
    const preview = previewRoadmapUpgrades(state);
    const upgrades = [...preview.upgrades];
    if (alteration === 'remove') upgrades.pop();
    if (alteration === 'duplicate') upgrades.push(upgrades[0]);
    if (alteration === 'rename') upgrades[0] = { ...upgrades[0], name: 'Unrelated mission' };
    if (alteration === 'retention') upgrades[0] = { ...upgrades[0], preservesProgress: false };
    expect(() => upgradeAllRoadmaps(state, { ...preview, upgrades })).toThrow('workspace changed');
    expect(state.archives).toEqual([]);
  });

  it('fails atomically when the final eligible mission already has an archive for the target version', () => {
    const state = createInitialState(false, '2.0.0');
    state.archives.push({
      missionId: 'income', archivedAt: state.updatedAt,
      progress: createInitialState(false).missions.income,
    });
    const preview = previewRoadmapUpgrades(state);
    const before = JSON.stringify(state);
    expect(preview.upgrades.at(-1)?.missionId).toBe('income');
    expect(() => upgradeAllRoadmaps(state, preview)).toThrow('Archive duplicates the active roadmap version for income');
    expect(JSON.stringify(state)).toBe(before);
  });

  it('rejects an invalid active-version archive instead of silently omitting that mission', () => {
    const state = createInitialState(false, '2.0.0');
    const preview = previewRoadmapUpgrades(state);
    state.archives.push({ missionId: 'income', archivedAt: state.updatedAt, progress: structuredClone(state.missions.income) });
    const before = JSON.stringify(state);
    expect(() => previewRoadmapUpgrades(state)).toThrow('Archive duplicates the active roadmap version');
    expect(() => upgradeAllRoadmaps(state, preview)).toThrow('Archive duplicates the active roadmap version');
    expect(JSON.stringify(state)).toBe(before);
  });

  it('fails closed when a declared append is no longer verified rather than resetting or skipping DSA', () => {
    const state = createInitialState(false, '2.0.0');
    const altered = structuredClone(getLatestMission('pattern'));
    altered.checkpoints[0].criteria.push('A different synthetic requirement.');
    const original = catalog.getLatestMission;
    vi.spyOn(catalog, 'getLatestMission').mockImplementation(id => id === 'pattern' ? altered : original(id));
    const preview = previewRoadmapUpgrades(state);
    expect(preview.upgrades[0].preservesProgress).toBe(false);
    expect(() => upgradeAllRoadmaps(state, preview)).toThrow('declared roadmap append');
    expect(state.archives).toEqual([]);
    expect(state.events).toEqual([]);
  });

  it('rolls back the entire prospective batch when its final event exceeds the record limit', () => {
    const state = createInitialState(false, '2.0.0');
    state.events = Array.from({ length: 4992 }, (_, index) => ({
      id: `bulk-existing-${index}`, type: 'workspace-change',
      title: 'Synthetic history', createdAt: state.updatedAt,
    }));
    const preview = previewRoadmapUpgrades(state);
    const before = JSON.stringify(state);
    expect(() => upgradeAllRoadmaps(state, preview)).toThrow(/Invalid workspace at events/);
    expect(JSON.stringify(state)).toBe(before);
    expect(state.archives).toEqual([]);
  });

  it('rejects invalid workspace records at preview and commit without falling back to a fresh workspace', () => {
    const state = mixedState();
    const preview = previewRoadmapUpgrades(state);
    state.personalProof = [{
      id: 'invalid-proof', title: 'Synthetic proof', detail: 'Fictional test record.',
      source: '', url: '',
    }];
    const before = JSON.stringify(state);
    expect(() => previewRoadmapUpgrades(state)).toThrow('Invalid workspace at personalProof');
    expect(() => upgradeAllRoadmaps(state, preview)).toThrow('Invalid workspace at personalProof');
    expect(JSON.stringify(state)).toBe(before);
  });
});
