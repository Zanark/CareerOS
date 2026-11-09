import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createInitialState, parseState, recallSummary, recordChange, recordEvidence, recordRecall, upgradeRoadmap } from '../domain/engine';
import type { AppState, EvidenceInput, RecallEntry } from '../domain/types';
import { serializeWorkspace } from '../workspaceFile';
import { getDiscoverySnapshot, getWayfinderProgress } from './model';
import { createDiscoveryPracticeState } from './practice';
import { createCompleteDiscoveryFixture } from '../../tests/discovery-fixture';

const DAY = 86_400_000;
const now = () => new Date(2026, 10, 9, 14, 0);
const item = (state: AppState, id: string, date = now()) => getDiscoverySnapshot(state, date).discoveries.find(discovery => discovery.id === id)!;

function evidence(state: AppState, input: Partial<EvidenceInput> = {}) {
  return recordEvidence(state, {
    missionId: 'pattern', checkpointId: state.missions.pattern.checkpointId,
    title: 'Synthetic learning evidence', summary: 'A real-form-shaped synthetic attempt with a traced example.',
    kind: 'exercise', url: '', advance: false, criteriaConfirmed: false, ...input,
  });
}

function recall(state: AppState, outcome: RecallEntry['outcome'] = 'independent') {
  return recordRecall(state, {
    missionId: 'pattern', checkpointId: state.evidence[0].checkpointId,
    roadmapVersion: state.evidence[0].roadmapVersion!, outcome,
    checks: { explanation: true, diagram: false, exercise: true }, notes: 'Synthetic self-check only.',
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(now());
});
afterEach(() => vi.useRealTimers());

describe('record-derived discoveries', () => {
  it('levels the fictional character only from actual discoveries and permits a complete collection in one mission', () => {
    let state = createInitialState(false);
    expect(getWayfinderProgress(getDiscoverySnapshot(state).earned).level).toBe(1);
    state = evidence(state, { kind: 'code' });
    const first = getWayfinderProgress(getDiscoverySnapshot(state).earned);
    expect(first.level).toBeGreaterThan(1);
    state = evidence(state, { kind: 'code' });
    expect(getWayfinderProgress(getDiscoverySnapshot(state).earned)).toEqual(first);
    const complete = createCompleteDiscoveryFixture(now());
    const snapshot = getDiscoverySnapshot(complete, now());
    expect(snapshot.earned).toBe(snapshot.total);
    expect(snapshot.recordedDays).toBe(21);
    expect(getWayfinderProgress(snapshot.earned)).toMatchObject({ level: 7, nextAt: null, remaining: 0, percent: 100 });
    expect(Object.entries(complete.missions).filter(([, progress]) => progress.completedCheckpointIds.length).map(([id]) => id)).toEqual(['pattern']);
    expect(() => getWayfinderProgress(-1)).toThrow('valid');
    expect(() => getWayfinderProgress(NaN)).toThrow('valid');
  });

  it('does not award browsing-shaped state, plans, readiness, history or elapsed time', () => {
    let state = createInitialState(false);
    state = recordChange({ ...state, readiness: { ...state.readiness, 'Coding patterns': 'ready' } }, 'Synthetic setting changed');
    const snapshot = getDiscoverySnapshot(state, now());
    expect(snapshot.earned).toBe(0);
    expect(snapshot.recordedDays).toBe(0);
    expect(getDiscoverySnapshot(state, new Date(2027, 10, 9)).earned).toBe(0);
  });

  it('recognizes unfinished work without completing a checkpoint or farming duplicate records', () => {
    let state = evidence(createInitialState(false), { kind: 'code' });
    for (let index = 0; index < 8; index++) state = evidence(state, { kind: 'code' });
    expect(item(state, 'first-footprint').earnedAt).not.toBeNull();
    expect(item(state, 'working-thought').earnedAt).not.toBeNull();
    expect(item(state, 'working-library').current).toBe(1);
    expect(item(state, 'second-lens').current).toBe(1);
    expect(item(state, 'follow-through').earnedAt).toBeNull();
    expect(getDiscoverySnapshot(state).recordedDays).toBe(1);
    expect(state.missions.pattern.completedCheckpointIds).toEqual([]);
  });

  it('requires different evidence kinds on the same checkpoint and retains the actual first proof', () => {
    let state = evidence(createInitialState(false), { kind: 'code' });
    state = evidence(state, { kind: 'diagram' });
    const earned = item(state, 'second-lens');
    expect(earned.sources.map(source => source.id)).toEqual(state.evidence.map(record => record.id));
    state = evidence(state, { kind: 'explanation', advance: true, criteriaConfirmed: true });
    state = evidence(state, { kind: 'project' });
    expect(item(state, 'three-dimensions').current).toBe(3);
    expect(item(state, 'second-lens').sources).toEqual(earned.sources);
    expect(item(state, 'second-lens').earnedAt).toBe(earned.earnedAt);
    expect(item(state, 'three-dimensions').sources.every(source => source.checkpointId === state.evidence[0].checkpointId)).toBe(true);
  });

  it('deduplicates unchanged v2/v3 DSA lineage without discarding its historical completion', () => {
    let state = evidence(createInitialState(false, '2.0.0'), { advance: true, criteriaConfirmed: true });
    state = upgradeRoadmap(state, 'pattern');
    state = recordRecall(state, {
      missionId: 'pattern', checkpointId: state.evidence[0].checkpointId, roadmapVersion: '3.0.0',
      outcome: 'partial', checks: { explanation: false, diagram: false, exercise: false }, notes: '',
    });
    expect(getDiscoverySnapshot(state).practicedCheckpoints).toBe(1);
    expect(item(state, 'trail-builder').current).toBe(1);
    expect(item(state, 'first-echo').current).toBe(1);
    expect(parseState(state)).toEqual(state);
  });

  it('keeps unrelated roadmap editions distinct rather than inventing equivalence', () => {
    let state = evidence(createInitialState(false, '1.0.0'));
    state = upgradeRoadmap(state, 'pattern');
    state = evidence(state);
    expect(getDiscoverySnapshot(state).practicedCheckpoints).toBe(2);
    expect(item(state, 'working-library').sources.map(source => source.roadmapVersion)).toEqual(['1.0.0', '3.0.0']);
  });

  it('counts nonconsecutive local days once and excludes future calendar days', () => {
    vi.setSystemTime(new Date(2026, 10, 1, 12));
    let state = evidence(createInitialState(false));
    state = evidence(state);
    vi.setSystemTime(new Date(2026, 10, 5, 12));
    state = evidence(state);
    vi.setSystemTime(new Date(2026, 10, 15, 12));
    state = evidence(state, { kind: 'project' });
    const snapshot = getDiscoverySnapshot(state, now());
    expect(snapshot.recordedDays).toBe(2);
    expect(item(state, 'another-day').earnedAt).not.toBeNull();
    expect(item(state, 'something-real').earnedAt).toBeNull();
    expect(snapshot.recentDays.filter(day => day.evidence > 0).map(day => day.date)).toEqual(['2026-11-01', '2026-11-05']);
    expect(snapshot.recentDays.find(day => day.date === '2026-11-01')!.evidence).toBe(2);
  });

  it('does not turn immediate independent attempts or merely waiting into spaced practice', () => {
    let state = evidence(createInitialState(false));
    state = recall(state);
    state = recall(state);
    expect(item(state, 'without-the-map').earnedAt).not.toBeNull();
    for (const id of ['sleep-on-it', 'spaced-signal', 'long-echo']) {
      expect(item(state, id).earnedAt).toBeNull();
      expect(item(state, id, new Date(2027, 10, 9)).earnedAt).toBeNull();
    }
  });

  it('uses elapsed hours for actual spaced reviews and includes both reviews and the learning record', () => {
    vi.setSystemTime(new Date(2026, 9, 1, 12));
    let state = evidence(createInitialState(false));
    const learnedAt = Date.parse(state.evidence[0].createdAt);
    vi.setSystemTime(learnedAt + DAY);
    state = recall(state);
    const firstAt = Date.parse(state.recalls[0].createdAt);
    expect(item(state, 'sleep-on-it').earnedAt).not.toBeNull();
    vi.setSystemTime(firstAt + 3 * DAY - 1);
    state = recall(state);
    expect(item(state, 'spaced-signal').current).toBe(1);
    vi.setSystemTime(firstAt + 3 * DAY);
    state = recall(state);
    const spaced = item(state, 'spaced-signal');
    expect(spaced.current).toBe(2);
    expect(spaced.sources.map(source => source.id)).toEqual([state.evidence[0].id, state.recalls[0].id, state.recalls[2].id]);
    expect(item(state, 'long-echo').earnedAt).toBeNull();
  });

  it('preserves a historical discovery without overriding a later Needs review status', () => {
    let state = createDiscoveryPracticeState(now());
    const earned = item(state, 'long-echo');
    expect(earned.earnedAt).not.toBeNull();
    state = recall(state, 'needs-review');
    expect(item(state, 'long-echo').earnedAt).toBe(earned.earnedAt);
    expect(recallSummary(state, 'pattern', state.evidence[0].checkpointId, state.missions.pattern.roadmapVersion).status).toBe('needs-review');
    expect(getDiscoverySnapshot(state, new Date(2028, 1, 1)).earned).toBe(getDiscoverySnapshot(state).earned);
  });

  it('reconstructs the same collection from existing backups without mutating or adding schema fields', () => {
    const state = createDiscoveryPracticeState(now());
    const before = serializeWorkspace(state);
    const snapshot = getDiscoverySnapshot(state, now());
    expect(serializeWorkspace(state)).toBe(before);
    const restored = parseState(JSON.parse(before));
    expect(getDiscoverySnapshot(restored, now())).toEqual(snapshot);
    expect(Object.keys(restored)).toEqual(Object.keys(state));
    expect(snapshot.earned).toBeGreaterThan(0);
    expect(snapshot.earned).toBeLessThan(snapshot.total);
    expect(item(state, 'working-thought').earnedAt).toBeNull();
    expect(snapshot.recentDays).toHaveLength(28);
  });

  it('keeps proofs and rendered data bounded at the workspace record limits', () => {
    vi.useRealTimers();
    const state = createInitialState(false);
    state.missions.pattern.status = 'in-progress';
    const checkpointId = state.missions.pattern.checkpointId;
    const reference = new Date();
    const timestamp = (index: number) => new Date(reference.getTime() - (35 - index % 35) * DAY).toISOString();
    state.evidence = Array.from({ length: 5000 }, (_, index) => ({
      id: `stress-evidence-${index}`, missionId: 'pattern', checkpointId, roadmapVersion: '3.0.0',
      title: 'Synthetic repeated exercise', summary: 'Synthetic maximum-record fixture; not user activity.',
      kind: 'exercise', url: '', visibility: 'local', completedCheckpoint: false, createdAt: timestamp(index),
    }));
    state.recalls = Array.from({ length: 5000 }, (_, index) => ({
      id: `stress-recall-${index}`, missionId: 'pattern', checkpointId, roadmapVersion: '3.0.0',
      outcome: 'independent', checks: { explanation: true, diagram: false, exercise: true },
      notes: 'Synthetic maximum-record fixture.', createdAt: timestamp(index),
    }));
    const valid = parseState(state);
    const start = performance.now();
    const snapshot = getDiscoverySnapshot(valid, reference);
    const elapsedMs = performance.now() - start;
    expect(snapshot.practicedCheckpoints).toBe(1);
    expect(snapshot.recentDays).toHaveLength(28);
    expect(snapshot.recentDays.every(day => day.sources.length <= 5)).toBe(true);
    expect(snapshot.discoveries.every(discovery => discovery.sources.length <= 21)).toBe(true);
    expect(snapshot.discoveries).toHaveLength(24);
    console.info(`Discovery projection: 10000 synthetic records, ${elapsedMs.toFixed(1)} ms, 24 discoveries / 28 recent tiles.`);
  });
});
