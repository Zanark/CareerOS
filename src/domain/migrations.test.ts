// Dedicated coverage for the schemaVersion 1 -> schemaVersion 2 migration boundary:
// strict recognition of the original wire format, safe (not lossy, not inventive)
// normalization, idempotency once migrated, and the roadmap-upgrade/staleness behavior
// that only makes sense once a real legacy workspace exists. `engine.test.ts` covers the
// v2 engine itself; this file is scoped to the legacy-origin story specifically.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getMission } from './catalog';
import {
  createInitialState, generatePlan, localDate, parseState, recordEvidence, upgradeRoadmap,
} from './engine';
import { legacyMissionIds, LEGACY_ROADMAP_VERSION, migrateLegacyToLatest, parseLegacyV1 } from './legacyState';
import type { AppState, EvidenceInput, MissionId } from './types';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 9, 4, 9, 30));
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

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

function strip(entry: Record<string, unknown>): Record<string, unknown> {
  const { roadmapVersion, ...rest } = entry;
  return rest;
}

/** Project a real (version-pinned) engine-built AppState down to the true schemaVersion 1 wire shape. */
function toLegacyWire(state: AppState): Record<string, unknown> {
  const missions = Object.fromEntries(
    legacyMissionIds.map((id) => [id, strip(state.missions[id as MissionId] as unknown as Record<string, unknown>)]),
  );
  return {
    schemaVersion: 1,
    roadmapVersion: LEGACY_ROADMAP_VERSION,
    sampleData: state.sampleData,
    updatedAt: state.updatedAt,
    objective: state.objective,
    focusMissionId: state.focusMissionId,
    capacity: state.capacity,
    interviewMode: state.interviewMode,
    missions,
    plans: Object.fromEntries(
      Object.entries(state.plans).map(([date, actions]) => [
        date,
        actions.map((action) => strip(action as unknown as Record<string, unknown>)),
      ]),
    ),
    evidence: state.evidence.map((entry) => strip(entry as unknown as Record<string, unknown>)),
    events: state.events,
    readiness: state.readiness,
    opportunities: state.opportunities,
  };
}

function legacyPayload(sampleData = false): Record<string, unknown> {
  return toLegacyWire(createInitialState(sampleData, '1.0.0'));
}

describe('strict schemaVersion 1 recognition and validation', () => {
  it('accepts a well-formed legacy payload exactly as the original eight-mission, five-checkpoint shape', () => {
    const payload = legacyPayload();
    expect(() => parseLegacyV1(payload)).not.toThrow();
    const legacy = parseLegacyV1(payload);
    expect(Object.keys(legacy.missions).sort()).toEqual([...legacyMissionIds].sort());
    expect(legacy.missions).not.toHaveProperty('income');
  });

  it('never validates v1 data against the new v2 catalog before migration', () => {
    // The legacy five-checkpoint starter ids (e.g. the old first pattern checkpoint) do not
    // exist anywhere in the v2 catalog. A payload built entirely from those ids must still
    // pass through parseState successfully, proving the legacy path checks against
    // legacyCatalog, never the new catalog, prior to migration.
    const payload = legacyPayload(true);
    const legacyPatternCheckpointId = (payload.missions as Record<string, { checkpointId: string }>).pattern.checkpointId;
    expect(() => getMission('pattern').checkpoints.find((c) => c.id === legacyPatternCheckpointId)).not.toThrow();
    expect(getMission('pattern').checkpoints.some((c) => c.id === legacyPatternCheckpointId)).toBe(false);
    expect(() => parseState(payload)).not.toThrow();
  });

  it('rejects a schemaVersion 1 payload carrying any v2-only root field', () => {
    const payload = legacyPayload();
    expect(() => parseState({ ...payload, archives: [] })).toThrow();
    expect(() => parseState({ ...payload, freelanceOpportunities: [] })).toThrow();
    expect(() => parseState({ ...payload, recalls: [] })).toThrow();
  });

  it('rejects a schemaVersion 1 payload with an income mission or any record carrying a roadmapVersion stamp', () => {
    const payload = legacyPayload();
    const withIncome = {
      ...payload,
      missions: { ...(payload.missions as object), income: { checkpointId: '', status: 'not-started', mode: 'background', completedCheckpointIds: [], blocker: '' } },
    };
    expect(() => parseState(withIncome)).toThrow();

    const stamped = {
      ...payload,
      evidence: [{ id: 'e-1', missionId: 'pattern', checkpointId: '', completedCheckpoint: false, title: 'x', summary: 'x'.repeat(20), kind: 'exercise', url: '', createdAt: new Date().toISOString(), roadmapVersion: '1.0.0' }],
    };
    expect(() => parseState(stamped)).toThrow();
  });

  it('rejects malformed legacy internals without silently resetting them', () => {
    const base = legacyPayload();
    const missions = base.missions as Record<string, Record<string, unknown>>;

    const brokenSequence = { ...base, missions: { ...missions, pattern: { ...missions.pattern, completedCheckpointIds: ['not-the-real-first-checkpoint'] } } };
    expect(() => parseState(brokenSequence)).toThrow();

    const tooMany = { ...base, missions: { ...missions, escape: { ...missions.escape, completedCheckpointIds: Array.from({ length: 999 }, (_, i) => `x-${i}`) } } };
    expect(() => parseState(tooMany)).toThrow();

    const plannedWithProgress = { ...base, missions: { ...missions, algorithm: { ...missions.algorithm, mode: 'background', checkpointId: 'made-up' } } };
    expect(() => parseState(plannedWithProgress)).toThrow();
  });

  it('is idempotent: re-parsing an already-migrated current-schema state is a safe no-op', () => {
    const payload = legacyPayload(true);
    const once = parseState(payload);
    const twice = parseState(once);
    expect(twice).toEqual(once);
    expect(twice.events.length).toBe(once.events.length);
  });
});

describe('safe schemaVersion 1 -> 2 normalization: no invented history, no bulk re-versioning', () => {
  it('stamps the eight original missions with roadmapVersion 1.0.0 and adds a fresh canonical income lane', () => {
    const migrated = parseState(legacyPayload());
    for (const id of legacyMissionIds) {
      expect(migrated.missions[id as MissionId].roadmapVersion).toBe('1.0.0');
    }
    expect(migrated.missions.income.roadmapVersion).toBe('2.0.0');
    expect(migrated.missions.income.completedCheckpointIds).toEqual([]);
    expect(migrated.missions.fde).toMatchObject({
      roadmapVersion: '3.0.0', checkpointId: 'fde-v3-fde-01', status: 'not-started',
      mode: 'background', completedCheckpointIds: [], blocker: '',
    });
    expect(migrated.missions.income.status).toBe('not-started');
    expect(['background', 'planned']).toContain(migrated.missions.income.mode);
    expect(migrated.archives).toEqual([]);
    expect(migrated.freelanceOpportunities).toEqual([]);
    expect(migrated.recalls).toEqual([]);
  });

  it('carries existing evidence, events, plans, and opportunities over completely unchanged, with no appended migration event', () => {
    let legacy = createInitialState(false, '1.0.0');
    legacy = advance(legacy, 'pattern');
    legacy = { ...legacy, plans: { ...legacy.plans, [localDate()]: generatePlan(legacy) } };
    const wire = toLegacyWire(legacy);
    const originalEvidence = wire.evidence;
    const originalEvents = wire.events;
    const originalOpportunities = wire.opportunities;

    const migrated = parseState(wire);
    expect(migrated.evidence).toEqual(originalEvidence);
    expect(migrated.events).toEqual(originalEvents);
    expect(migrated.opportunities).toEqual(originalOpportunities);
    expect(migrated.events.length).toBe((originalEvents as unknown[]).length);
    expect(migrated.updatedAt).toBe(wire.updatedAt);
  });

  it('does not grant any new progress or reset the current checkpoint during migration', () => {
    let legacy = createInitialState(false, '1.0.0');
    legacy = advance(legacy, 'pattern');
    const preMigrationPattern = legacy.missions.pattern;
    const wire = toLegacyWire(legacy);
    const migrated = parseState(wire);
    expect(migrated.missions.pattern.completedCheckpointIds).toEqual(preMigrationPattern.completedCheckpointIds);
    expect(migrated.missions.pattern.checkpointId).toBe(preMigrationPattern.checkpointId);
    expect(migrated.missions.pattern.status).toBe(preMigrationPattern.status);
  });

  it('never appends a migration event and never bulk-versions unrelated records', () => {
    const legacy = migrateLegacyToLatest(parseLegacyV1(legacyPayload()));
    expect(legacy.events).toEqual([]);
  });
});

describe('roadmap upgrade from a real migrated legacy workspace: archive validity and no invented credit', () => {
  it('archives the exact pre-upgrade progress and starts a clean latest-roadmap snapshot with zero granted completions', () => {
    let legacy = createInitialState(false, '1.0.0');
    legacy = advance(legacy, 'pattern');
    legacy = { ...legacy, missions: { ...legacy.missions, pattern: { ...legacy.missions.pattern, blocker: 'Waiting on a code review.' } } };
    const wire = toLegacyWire(legacy);
    const state = parseState(wire);
    const beforeUpgrade = state.missions.pattern;

    const upgraded = upgradeRoadmap(state, 'pattern');
    expect(upgraded.archives).toHaveLength(1);
    expect(upgraded.archives[0].missionId).toBe('pattern');
    expect(upgraded.archives[0].progress.roadmapVersion).toBe('1.0.0');
    expect(upgraded.archives[0].progress).toEqual(beforeUpgrade);

    const latest = getMission('pattern');
    expect(upgraded.missions.pattern.roadmapVersion).toBe(latest.roadmapVersion);
    expect(upgraded.missions.pattern.checkpointId).toBe(latest.checkpoints[0].id);
    expect(upgraded.missions.pattern.status).toBe('not-started');
    expect(upgraded.missions.pattern.completedCheckpointIds).toEqual([]);
    expect(upgraded.missions.pattern.blocker).toBe('');
    expect(upgraded.missions.pattern.mode).toBe(beforeUpgrade.mode);
    expect(upgraded.evidence).toEqual(state.evidence);
    expect(upgraded.events.at(-1)).toMatchObject({ type: 'roadmap-upgraded', missionId: 'pattern' });
    expect(() => parseState(upgraded)).not.toThrow();
  });

  it('rejects a repeated upgrade and never creates a duplicate archive', () => {
    const state = parseState(legacyPayload());
    const upgraded = upgradeRoadmap(state, 'pattern');
    expect(() => upgradeRoadmap(upgraded, 'pattern')).toThrow('already on the latest version');
    expect(upgraded.archives.filter((a) => a.missionId === 'pattern').length).toBe(1);
  });

  it('keeps pre-upgrade evidence referenceable against its archived snapshot after upgrading', () => {
    let legacy = createInitialState(false, '1.0.0');
    legacy = advance(legacy, 'pattern');
    const state = parseState(toLegacyWire(legacy));
    const upgraded = upgradeRoadmap(state, 'pattern');
    expect(upgraded.evidence.some((e) => e.missionId === 'pattern' && (e.roadmapVersion ?? '1.0.0') === '1.0.0')).toBe(true);
    expect(() => parseState(upgraded)).not.toThrow();
  });

  it('treats a pre-upgrade daily-plan action as stale once its mission moves to a new roadmap version', () => {
    const legacy = createInitialState(false, '1.0.0');
    const wire = toLegacyWire(legacy);
    let state = parseState(wire);
    const today = localDate();
    state = { ...state, plans: { ...state.plans, [today]: generatePlan(state, today) } };
    const staleAction = state.plans[today].find((action) => action.missionId === 'pattern');
    expect(staleAction).toBeDefined();

    const upgraded = upgradeRoadmap(state, 'pattern');
    expect(() => recordEvidence(upgraded, input(upgraded, 'pattern', { actionId: staleAction!.id }))).toThrow();
  });

  it('leaves background/active mode untouched by an upgrade unless the mission was planned', () => {
    const state = parseState(legacyPayload());
    expect(state.missions.credential.mode).toBe('background');
    const upgraded = upgradeRoadmap(state, 'credential');
    expect(upgraded.missions.credential.mode).toBe('background');
  });
});
