import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createInitialState, generatePlan, recordEvidence, recordRecall, upgradeRoadmap,
} from './engine';
import { getMissionActivity, getRecordedWorkHistory } from './missionActivity';
import { missionIds } from './types';
import type { AppState, Evidence, EvidenceInput, MissionId, RecallEntry } from './types';

function at(day: string, time = '12:00:00'): Date {
  return new Date(`${day}T${time}`);
}

function evidence(day: string, overrides: Partial<Evidence> = {}): Evidence {
  return {
    id: `evidence-${day}`, missionId: 'pattern', checkpointId: 'synthetic-checkpoint',
    title: 'Synthetic saved work', summary: 'An unfinished example with recorded progress.',
    kind: 'exercise', url: '', visibility: 'local', createdAt: at(day).toISOString(),
    completedCheckpoint: false, roadmapVersion: '3.0.0', ...overrides,
  };
}

function recall(day: string, overrides: Partial<RecallEntry> = {}): RecallEntry {
  return {
    id: `recall-${day}`, missionId: 'pattern', checkpointId: 'synthetic-checkpoint',
    roadmapVersion: '3.0.0', outcome: 'needs-review',
    checks: { explanation: false, diagram: false, exercise: false },
    notes: 'Synthetic review', createdAt: at(day).toISOString(), ...overrides,
  };
}

function evidenceInput(state: AppState, missionId: MissionId = 'pattern'): EvidenceInput {
  return {
    missionId, checkpointId: state.missions[missionId].checkpointId,
    title: 'Synthetic saved work', summary: 'An unfinished example with recorded progress.',
    kind: 'exercise', url: '', advance: false, criteriaConfirmed: false,
  };
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
  vi.setSystemTime(at('2026-10-06'));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('recorded mission activity', () => {
  it('projects actual day intensity and contiguous history without changing frozen records', () => {
    const state = freeze({
      evidence: [evidence('2026-10-06'), evidence('2026-10-01'), evidence('2026-10-05'),
        evidence('2026-10-02'), evidence('2026-10-07')],
      recalls: [recall('2026-10-02', { missionId: 'system' }), recall('2026-10-05')],
    });
    const history = getRecordedWorkHistory(state, undefined, at('2026-10-06'));
    expect(history.days.map(day => day.date)).toEqual(['2026-10-01', '2026-10-02', '2026-10-05', '2026-10-06']);
    expect(history.days[1]).toEqual({
      date: '2026-10-02', evidenceIds: ['evidence-2026-10-02'], recallIds: ['recall-2026-10-02'],
      missionIds: ['pattern', 'system'],
    });
    expect(history.runs).toEqual([
      { start: '2026-10-01', end: '2026-10-02', days: 2, running: false },
      { start: '2026-10-05', end: '2026-10-06', days: 2, running: true },
    ]);
    expect(history).toMatchObject({ streak: 2, longestStreak: 2, workedToday: true });
    expect(state.evidence.map(record => record.createdAt)).toHaveLength(5);
  });

  it('keeps global work history separate from a mission filter and retains yesterday continuity', () => {
    const state = { evidence: [
      evidence('2026-10-03', { missionId: 'system' }),
      evidence('2026-10-04'), evidence('2026-10-05', { missionId: 'system' }),
    ], recalls: [] };
    expect(getRecordedWorkHistory(state, undefined, at('2026-10-06'))).toMatchObject({
      streak: 3, longestStreak: 3, workedToday: false,
      runs: [{ start: '2026-10-03', end: '2026-10-05', days: 3, running: true }],
    });
    expect(getRecordedWorkHistory(state, 'pattern', at('2026-10-06'))).toMatchObject({
      streak: 0, longestStreak: 1,
      runs: [{ start: '2026-10-04', end: '2026-10-04', days: 1, running: false }],
    });
    expect(getRecordedWorkHistory(state, 'system', at('2026-10-06')).streak).toBe(1);
  });

  it('joins real leap and year boundaries on calendar days and keeps an empty history honest', () => {
    expect(getRecordedWorkHistory({ evidence: [
      evidence('2028-02-28'), evidence('2028-02-29'), evidence('2028-03-01'),
    ], recalls: [] }, undefined, at('2028-03-02')).runs).toEqual([
      { start: '2028-02-28', end: '2028-03-01', days: 3, running: true },
    ]);
    expect(getRecordedWorkHistory({ evidence: [evidence('2026-12-31'), evidence('2027-01-01')], recalls: [] },
      undefined, at('2027-01-01')).streak).toBe(2);
    expect(getRecordedWorkHistory({ evidence: [], recalls: [] }, undefined, at('2026-10-06'))).toEqual({
      asOfDate: '2026-10-06', workedToday: false, streak: 0, lastWorkedOn: null, days: [], runs: [], longestStreak: 0,
    });
  });

  it('returns an honest empty summary from only the required collections', () => {
    expect(getMissionActivity({ evidence: [], recalls: [] }, 'pattern', at('2026-10-06'))).toEqual({
      asOfDate: '2026-10-06', workedToday: false, streak: 0, lastWorkedOn: null,
    });
  });

  it('defaults to the current local date', () => {
    expect(getMissionActivity({ evidence: [evidence('2026-10-06')], recalls: [] }, 'pattern')).toEqual({
      asOfDate: '2026-10-06', workedToday: true, streak: 1, lastWorkedOn: '2026-10-06',
    });
  });

  it.each([false, true])('counts evidence regardless of checkpoint completion (%s)', completedCheckpoint => {
    const state = { evidence: [evidence('2026-10-06', { completedCheckpoint })], recalls: [] };
    expect(getMissionActivity(state, 'pattern', at('2026-10-06'))).toMatchObject({
      workedToday: true, streak: 1, lastWorkedOn: '2026-10-06',
    });
  });

  it.each(['needs-review', 'partial', 'independent'] as const)('counts a %s recall review', outcome => {
    const state = {
      evidence: [],
      recalls: [recall('2026-10-06', {
        outcome, checks: { explanation: outcome === 'independent', diagram: false, exercise: outcome === 'independent' },
      })],
    };
    expect(getMissionActivity(state, 'pattern', at('2026-10-06'))).toMatchObject({
      workedToday: true, streak: 1, lastWorkedOn: '2026-10-06',
    });
  });

  it('deduplicates multiple unsorted evidence and recall records on each day', () => {
    const state = {
      evidence: [
        evidence('2026-10-06'), evidence('2026-10-04'), evidence('2026-10-05'),
        evidence('2026-10-06', { id: 'another-evidence', createdAt: at('2026-10-06', '23:59:59').toISOString() }),
      ],
      recalls: [recall('2026-10-05'), recall('2026-10-06'), recall('2026-10-04')],
    };
    expect(getMissionActivity(state, 'pattern', at('2026-10-06'))).toEqual({
      asOfDate: '2026-10-06', workedToday: true, streak: 3, lastWorkedOn: '2026-10-06',
    });
  });

  it('separates missions even when records reference the same checkpoint name', () => {
    const state = {
      evidence: [evidence('2026-10-05'), evidence('2026-10-06', { missionId: 'system' })],
      recalls: [recall('2026-10-04'), recall('2026-10-06', { missionId: 'system' })],
    };
    expect(getMissionActivity(state, 'pattern', at('2026-10-06'))).toMatchObject({
      workedToday: false, streak: 2, lastWorkedOn: '2026-10-05',
    });
    expect(getMissionActivity(state, 'system', at('2026-10-06'))).toMatchObject({
      workedToday: true, streak: 1, lastWorkedOn: '2026-10-06',
    });
    expect(getMissionActivity(state, 'fabric', at('2026-10-06'))).toMatchObject({
      workedToday: false, streak: 0, lastWorkedOn: null,
    });
  });

  it.each([undefined, '1.0.0', '2.0.0', '3.0.0'] as const)('includes evidence saved with version %s', roadmapVersion => {
    const state = { evidence: [evidence('2026-10-06', { roadmapVersion })], recalls: [] };
    expect(getMissionActivity(state, 'pattern', at('2026-10-06')).streak).toBe(1);
  });

  it.each(['pattern', 'system'] as const)('retains real %s activity across roadmap adoption and archived recall', missionId => {
    vi.setSystemTime(at('2026-10-04'));
    let state = createInitialState(false, '2.0.0');
    state = recordEvidence(state, evidenceInput(state, missionId));
    const checkpointId = state.missions[missionId].checkpointId;
    const savedEvidence = structuredClone(state.evidence);
    state = upgradeRoadmap(state, missionId);
    vi.setSystemTime(at('2026-10-05'));
    state = recordRecall(state, {
      missionId, checkpointId, roadmapVersion: '2.0.0', outcome: 'needs-review',
      checks: { explanation: false, diagram: false, exercise: false }, notes: '',
    });
    const savedRecall = structuredClone(state.recalls);

    expect(state.archives.some(archive => archive.missionId === missionId)).toBe(true);
    expect(getMissionActivity(state, missionId, at('2026-10-06'))).toMatchObject({
      workedToday: false, streak: 2, lastWorkedOn: '2026-10-05',
    });

    vi.setSystemTime(at('2026-10-06'));
    state = recordEvidence(state, evidenceInput(state, missionId));
    expect(getMissionActivity(state, missionId)).toEqual({
      asOfDate: '2026-10-06', workedToday: true, streak: 3, lastWorkedOn: '2026-10-06',
    });
    expect(state.evidence.slice(0, 1)).toEqual(savedEvidence);
    expect(state.recalls).toEqual(savedRecall);
    expect(state.missions[missionId].completedCheckpointIds).toEqual([]);
  });

  it('counts completing a daily action through evidence without completing a checkpoint', () => {
    let state = createInitialState(false);
    state.plans['2026-10-06'] = generatePlan(state, '2026-10-06');
    const action = state.plans['2026-10-06'].find(entry => entry.missionId === 'pattern')!;
    state = recordEvidence(state, { ...evidenceInput(state), actionId: action.id });
    expect(state.plans['2026-10-06'].find(entry => entry.id === action.id)?.completed).toBe(true);
    expect(state.evidence[0].completedCheckpoint).toBe(false);
    expect(Date.parse(state.evidence[0].createdAt)).toBeGreaterThan(Date.now());
    expect(getMissionActivity(state, 'pattern').streak).toBe(1);
  });

  it('ignores plans, history titles, proof, timers, settings, readiness and undated progress in a full state', () => {
    const state = createInitialState(false);
    const createdAt = at('2026-10-06').toISOString();
    state.updatedAt = createdAt;
    state.focusMissionId = 'system';
    state.capacity = 'deep';
    state.interviewMode = true;
    state.readiness['Coding patterns'] = 'ready';
    state.missions.pattern.status = 'completed';
    state.missions.pattern.completedCheckpointIds = [state.missions.pattern.checkpointId];
    state.archives.push({
      missionId: 'pattern', archivedAt: createdAt,
      progress: { ...state.missions.pattern, roadmapVersion: '1.0.0' },
    });
    state.plans['2026-10-06'] = generatePlan(createInitialState(false), '2026-10-06')
      .map(action => ({ ...action, completed: true }));
    state.events = ['evidence-recorded', 'recall-reviewed', 'plan-created', 'settings-changed', 'browsed']
      .map((type, index) => ({
        id: `event-${index}`, type, title: 'Completed checkpoint and saved evidence',
        missionId: 'pattern', createdAt,
      }));
    state.personalProof = [{
      id: 'proof', title: 'Synthetic past work', detail: 'Not a mission record.',
      source: 'Synthetic fixture', date: '2026-10-06', url: '',
    }];
    state.focusSessions = [{
      id: 'focus', startedAt: at('2026-10-06', '11:59:00').toISOString(), plannedSeconds: 60,
      events: [
        { id: 'focus-distraction', kind: 'distraction', at: createdAt, elapsedMs: 60_000 },
        { id: 'focus-complete', kind: 'complete', at: createdAt, elapsedMs: 60_000 },
      ],
    }];
    state.opportunities = [{
      id: 'application', company: 'Synthetic company', role: 'Example role', stage: 'Accepted',
      url: '', notes: '', createdAt,
    }];
    state.freelanceOpportunities = [{
      id: 'freelance', title: 'Synthetic project', platform: 'Example', url: '', skills: '',
      budget: '', verdict: 'Apply Now', notes: '', createdAt,
    }];

    for (const missionId of missionIds) {
      expect(getMissionActivity(state, missionId, at('2026-10-06'))).toEqual({
        asOfDate: '2026-10-06', workedToday: false, streak: 0, lastWorkedOn: null,
      });
    }
  });

  it('does not mutate a deeply frozen state, records, order or supplied clock', () => {
    const state = freeze({
      ...createInitialState(false),
      evidence: [evidence('2026-10-06'), evidence('2026-10-04'), evidence('2026-10-05')],
      recalls: [recall('2026-10-05'), recall('2026-10-06')],
    });
    const before = JSON.stringify(state);
    const now = Object.freeze(at('2026-10-06'));
    const beforeTime = now.getTime();
    expect(getMissionActivity(state, 'pattern', now).streak).toBe(3);
    expect(JSON.stringify(state)).toBe(before);
    expect(now.getTime()).toBe(beforeTime);
  });
});

describe('local calendar streaks', () => {
  it.each([
    { name: 'today alone', days: ['2026-10-06'], streak: 1, workedToday: true, lastWorkedOn: '2026-10-06' },
    { name: 'yesterday alone', days: ['2026-10-05'], streak: 1, workedToday: false, lastWorkedOn: '2026-10-05' },
    { name: 'yesterday grace', days: ['2026-10-03', '2026-10-04', '2026-10-05'], streak: 3, workedToday: false, lastWorkedOn: '2026-10-05' },
    { name: 'today and yesterday after a gap', days: ['2026-10-03', '2026-10-05', '2026-10-06'], streak: 2, workedToday: true, lastWorkedOn: '2026-10-06' },
    { name: 'today after a gap', days: ['2026-10-04', '2026-10-06'], streak: 1, workedToday: true, lastWorkedOn: '2026-10-06' },
    { name: 'a gap before yesterday', days: ['2026-10-03', '2026-10-04'], streak: 0, workedToday: false, lastWorkedOn: '2026-10-04' },
  ])('handles $name', ({ days, streak, workedToday, lastWorkedOn }) => {
    const state = { evidence: days.map(day => evidence(day)), recalls: [] };
    expect(getMissionActivity(state, 'pattern', at('2026-10-06'))).toEqual({
      asOfDate: '2026-10-06', workedToday, streak, lastWorkedOn,
    });
  });

  it('expires worked-today at midnight, retains the grace streak, then expires it after a gap', () => {
    const state = { evidence: [evidence('2026-10-05'), evidence('2026-10-06')], recalls: [] };
    expect(getMissionActivity(state, 'pattern', at('2026-10-06', '23:59:59.999'))).toMatchObject({
      workedToday: true, streak: 2,
    });
    expect(getMissionActivity(state, 'pattern', at('2026-10-07', '00:00:00'))).toEqual({
      asOfDate: '2026-10-07', workedToday: false, streak: 2, lastWorkedOn: '2026-10-06',
    });
    expect(getMissionActivity(state, 'pattern', at('2026-10-08', '00:00:00'))).toEqual({
      asOfDate: '2026-10-08', workedToday: false, streak: 0, lastWorkedOn: '2026-10-06',
    });
  });

  it('excludes future calendar days from both activity and last-worked dates', () => {
    const state = {
      evidence: [evidence('2026-10-08'), evidence('2026-10-05')],
      recalls: [recall('2026-10-07')],
    };
    expect(getMissionActivity(state, 'pattern', at('2026-10-06'))).toEqual({
      asOfDate: '2026-10-06', workedToday: false, streak: 1, lastWorkedOn: '2026-10-05',
    });
    expect(getMissionActivity({ evidence: [evidence('2026-10-07')], recalls: [recall('2026-10-08')] }, 'pattern', at('2026-10-06'))).toEqual({
      asOfDate: '2026-10-06', workedToday: false, streak: 0, lastWorkedOn: null,
    });
  });

  it.each(['evidence', 'recalls'] as const)('includes a same-day %s timestamp one millisecond ahead of now', collection => {
    const createdAt = new Date(Date.now() + 1).toISOString();
    const state = {
      evidence: collection === 'evidence' ? [evidence('2026-10-06', { createdAt })] : [],
      recalls: collection === 'recalls' ? [recall('2026-10-06', { createdAt })] : [],
    };
    expect(getMissionActivity(state, 'pattern')).toMatchObject({ workedToday: true, streak: 1 });
  });

  it.each([
    { name: 'month', days: ['2026-04-29', '2026-04-30', '2026-05-01'] },
    { name: 'year', days: ['2025-12-30', '2025-12-31', '2026-01-01'] },
    { name: 'leap year', days: ['2028-02-27', '2028-02-28', '2028-02-29', '2028-03-01'] },
    { name: 'non-leap year', days: ['2026-02-27', '2026-02-28', '2026-03-01'] },
    { name: 'non-leap century', days: ['2100-02-28', '2100-03-01'] },
    { name: 'leap century', days: ['2000-02-28', '2000-02-29', '2000-03-01'] },
  ])('counts consecutive days across a $name boundary', ({ days }) => {
    const last = days.at(-1)!;
    expect(getMissionActivity({ evidence: days.map(day => evidence(day)), recalls: [] }, 'pattern', at(last))).toEqual({
      asOfDate: last, workedToday: true, streak: days.length, lastWorkedOn: last,
    });
  });
});

describe('timezone and daylight-saving boundaries', () => {
  it.each([
    { zone: 'America/New_York', midnight: '2026-10-06T04:00:00Z' },
    { zone: 'Asia/Kolkata', midnight: '2026-10-05T18:30:00Z' },
    { zone: 'Pacific/Kiritimati', midnight: '2026-10-05T10:00:00Z' },
    { zone: 'Pacific/Honolulu', midnight: '2026-10-06T10:00:00Z' },
  ])('maps UTC timestamps to local dates near midnight in $zone', ({ zone, midnight }) => {
    vi.stubEnv('TZ', zone);
    const start = Date.parse(midnight);
    const now = new Date(start + 60_000);
    const state = {
      evidence: [evidence('2026-10-06', { createdAt: midnight })],
      recalls: [recall('2026-10-05', { createdAt: new Date(start - 1).toISOString() })],
    };
    expect(now.getHours()).toBe(0);
    expect(getMissionActivity(state, 'pattern', now)).toEqual({
      asOfDate: '2026-10-06', workedToday: true, streak: 2, lastWorkedOn: '2026-10-06',
    });
    expect(getMissionActivity(state, 'pattern', new Date(start - 1))).toEqual({
      asOfDate: '2026-10-05', workedToday: true, streak: 1, lastWorkedOn: '2026-10-05',
    });
  });

  it('converts offset-bearing timestamps rather than treating their written date as local', () => {
    vi.stubEnv('TZ', 'UTC');
    const state = {
      evidence: [evidence('2026-10-06', { createdAt: '2026-10-06T00:15:00+05:30' })],
      recalls: [recall('2026-10-06', { createdAt: '2026-10-05T23:45:00-04:00' })],
    };
    expect(getMissionActivity(state, 'pattern', at('2026-10-06'))).toEqual({
      asOfDate: '2026-10-06', workedToday: true, streak: 2, lastWorkedOn: '2026-10-06',
    });
  });

  it.each([
    { zone: 'America/New_York', name: 'spring forward', days: ['2026-03-07', '2026-03-08', '2026-03-09'], hours: 23 },
    { zone: 'America/New_York', name: 'fall back', days: ['2026-10-31', '2026-11-01', '2026-11-02'], hours: 25 },
    { zone: 'Australia/Lord_Howe', name: 'half-hour fall back', days: ['2026-04-04', '2026-04-05', '2026-04-06'], hours: 24.5 },
    { zone: 'Australia/Lord_Howe', name: 'half-hour spring forward', days: ['2026-10-03', '2026-10-04', '2026-10-05'], hours: 23.5 },
  ])('uses calendar steps over $name in $zone', ({ zone, days, hours }) => {
    vi.stubEnv('TZ', zone);
    const last = days.at(-1)!;
    const now = at(last, '00:15:00');
    expect((at(last, '00:00:00').getTime() - at(days[1], '00:00:00').getTime()) / 3_600_000).toBe(hours);
    const state = {
      evidence: days.map(day => evidence(day, { createdAt: at(day, '00:00:00').toISOString() })),
      recalls: [],
    };
    expect(getMissionActivity(state, 'pattern', now)).toEqual({
      asOfDate: last, workedToday: true, streak: 3, lastWorkedOn: last,
    });
    expect(getMissionActivity({ ...state, evidence: state.evidence.slice(0, -1) }, 'pattern', now)).toEqual({
      asOfDate: last, workedToday: false, streak: 2, lastWorkedOn: days[1],
    });
  });
});

describe('invalid activity dates', () => {
  it('rejects an invalid supplied clock even when no records exist', () => {
    expect(() => getMissionActivity({ evidence: [], recalls: [] }, 'pattern', new Date(NaN))).toThrow('invalid date');
  });

  it.each(['evidence', 'recalls'] as const)('rejects invalid %s timestamps instead of rolling over dates or ingesting NaN', collection => {
    for (const createdAt of [
      '', 'not-a-timestamp', '2026-10-06', '2026-10-06T12:00:00',
      '2026-02-30T12:00:00Z', '2026-13-01T12:00:00Z', '2026-10-06T12:00:00+25:00',
    ]) {
      const state = {
        evidence: collection === 'evidence' ? [evidence('2026-10-06', { createdAt })] : [],
        recalls: collection === 'recalls' ? [recall('2026-10-06', { createdAt })] : [],
      };
      expect(() => getMissionActivity(state, 'pattern', at('2026-10-06')), createdAt).toThrow();
    }
  });
});
