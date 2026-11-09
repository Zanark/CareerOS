import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getLatestMission, getMissionVersion, prerequisitesFor, v2Missions } from '../catalog';
import { createInitialState, generatePlan, localDate, parseState, recallSummary, recordEvidence, recordRecall } from '../engine';
import { missionIds } from '../types';
import type { AppState, EvidenceInput } from '../types';
import { loadRoadmapPack } from '../roadmapPacks/load';
import { packCheckpointId, searchRoadmapPacks } from '../roadmapPacks/registry';
import { getDiscoverySnapshot, getWayfinderProgress } from '../../discovery/model';
import { careerSkillLinks } from '../../graph/careerSkillLinks';
import { buildCareerGraph } from '../../graph/careerGraphModel';
import { getMissionActivity } from '../missionActivity';
import { serializeWorkspace } from '../../workspaceFile';
import { createCompleteDiscoveryFixture } from '../../../tests/discovery-fixture';

const start = new Date('2026-11-01T12:00:00Z');
const hour = 3600_000;

function attempt(state: AppState, overrides: Partial<EvidenceInput> = {}) {
  return recordEvidence(state, {
    missionId: 'fde', checkpointId: state.missions.fde.checkpointId,
    title: 'Synthetic fieldwork comparison',
    summary: 'Synthetic test artifact comparing customer responsibilities, actual evidence and role-specific requirements.',
    kind: 'code', url: '', advance: false, criteriaConfirmed: false, ...overrides,
  });
}

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(start); });
afterEach(() => vi.useRealTimers());

describe('Fieldcraft mission and old-workspace compatibility', () => {
  it.each([undefined, '1.0.0', '2.0.0', '3.0.0'] as const)('adds only an unstarted background FDE when creating a %s fixture', version => {
    const state = createInitialState(false, version);
    expect(state.missions.fde).toEqual({
      roadmapVersion: '3.0.0', checkpointId: 'fde-v3-fde-01',
      status: 'not-started', mode: 'background', completedCheckpointIds: [], blocker: '',
    });
    expect(state.focusMissionId).toBe('pattern');
    expect(state.evidence).toEqual([]);
    expect(state.events).toEqual([]);
    expect(generatePlan(state).some(action => action.missionId === 'fde')).toBe(false);
    expect(v2Missions.some(mission => mission.id === 'fde')).toBe(false);
    expect(() => getMissionVersion('fde', '1.0.0')).toThrow('No 1.0.0');
    expect(() => getMissionVersion('fde', '2.0.0')).toThrow('No 2.0.0');
  });

  it('normalizes an old nine-mission backup without rewriting any existing value or adding migration history', () => {
    let current = createInitialState(false, '2.0.0');
    current = recordEvidence(current, {
      missionId: 'system', checkpointId: current.missions.system.checkpointId,
      title: 'Synthetic prior-edition design', summary: 'A prior-edition test record with actual checked criteria.',
      kind: 'diagram', url: '', advance: true, criteriaConfirmed: true,
    });
    current.focusMissionId = 'fabric';
    current.missions.fabric.mode = 'active';
    current.missions.pattern.mode = 'background';
    current.missions.escape.blocker = 'Synthetic existing blocker';
    current.plans[localDate()] = generatePlan(current);
    const { fde, ...oldMissions } = current.missions;
    const old = { ...current, missions: oldMissions };
    const before = JSON.stringify(old);
    const restored = parseState(old);
    expect(restored).toEqual({ ...old, missions: { ...oldMissions, fde } });
    expect(JSON.stringify(old)).toBe(before);
    expect(parseState(restored)).toEqual(restored);
    expect(parseState(JSON.parse(serializeWorkspace(restored)))).toEqual(restored);
  });

  it('rejects explicit invalid FDE state rather than treating it as missing historical data', () => {
    const state = createInitialState(false);
    for (const invalid of [
      null, undefined, {}, { ...state.missions.fde, mode: 'planned' },
      { ...state.missions.fde, roadmapVersion: '2.0.0' },
      { ...state.missions.fde, checkpointId: 'fde-v3-fde-02' },
      { ...state.missions.fde, completedCheckpointIds: ['fde-v3-fde-01'] },
      { ...state.missions.fde, undocumented: true },
    ]) expect(() => parseState({ ...state, missions: { ...state.missions, fde: invalid } })).toThrow();
    const { fde: _fde, pattern: _pattern, ...incomplete } = state.missions;
    expect(() => parseState({ ...state, missions: incomplete })).toThrow();
  });

  it('records background work, criteria-based advancement and native recall without changing other missions or focus', () => {
    const before = createInitialState(false);
    before.plans[localDate()] = generatePlan(before);
    const practiced = attempt(before);
    expect(practiced.missions.fde.status).toBe('in-progress');
    expect(practiced.missions.fde.completedCheckpointIds).toEqual([]);
    const review = {
      missionId: 'fde' as const, roadmapVersion: '3.0.0' as const,
      checkpointId: practiced.missions.fde.checkpointId, outcome: 'independent' as const,
      checks: { explanation: true, diagram: false, exercise: true }, notes: 'Synthetic changed-case self-report.',
    };
    expect(() => recordRecall(practiced, review)).toThrow('all three checks');
    expect(() => recordRecall(before, { ...review, checks: { ...review.checks, diagram: true } })).toThrow('prior learning');
    let reviewed = practiced;
    for (const hours of [25, 97]) {
      vi.setSystemTime(new Date(start.getTime() + hours * hour));
      reviewed = recordRecall(reviewed, { ...review, checks: { ...review.checks, diagram: true } });
    }
    expect(recallSummary(reviewed, 'fde', review.checkpointId, '3.0.0').status).toBe('retained');
    const completed = attempt(reviewed, { advance: true, criteriaConfirmed: true });
    expect(completed.missions.fde).toMatchObject({
      mode: 'background', checkpointId: 'fde-v3-fde-02', completedCheckpointIds: ['fde-v3-fde-01'],
    });
    for (const id of missionIds.filter(id => id !== 'fde')) expect(completed.missions[id]).toEqual(before.missions[id]);
    expect(completed.focusMissionId).toBe(before.focusMissionId);
    expect(completed.plans).toEqual(before.plans);
    expect(getMissionActivity(completed, 'fde').workedToday).toBe(true);
    expect(parseState(completed)).toEqual(completed);
  });

  it('keeps criteria, blocker and prior-learning guards on the new mission', () => {
    const state = createInitialState(false);
    expect(() => attempt(state, { advance: true })).toThrow();
    state.missions.fde.blocker = 'Synthetic approval is missing';
    expect(() => attempt(state)).toThrow(/block/i);
    state.missions.fde.blocker = '';
    expect(() => attempt(state, { checkpointId: 'fde-v3-fde-48' })).toThrow();
  });
});

describe('research-backed learning and existing Atlas participation', () => {
  it('can reach every existing discovery and final cosmetic level using only background FDE records', () => {
    const now = new Date();
    const fixture = createCompleteDiscoveryFixture(now);
    const fresh = createInitialState(false);
    const pattern = getLatestMission('pattern');
    const fde = getLatestMission('fde');
    const translate = (id: string) => {
      const position = pattern.checkpoints.findIndex(checkpoint => checkpoint.id === id);
      if (position < 0 || !fde.checkpoints[position]) throw new Error(`Unknown synthetic checkpoint translation: ${id}`);
      return fde.checkpoints[position].id;
    };
    const progress = fixture.missions.pattern;
    const state = parseState({
      ...fixture,
      missions: {
        ...fixture.missions,
        pattern: fresh.missions.pattern,
        fde: { ...progress, mode: 'background', checkpointId: translate(progress.checkpointId),
          completedCheckpointIds: progress.completedCheckpointIds.map(translate) },
      },
      evidence: fixture.evidence.map(entry => ({ ...entry, missionId: 'fde', checkpointId: translate(entry.checkpointId) })),
      recalls: fixture.recalls.map(entry => ({ ...entry, missionId: 'fde', checkpointId: translate(entry.checkpointId),
        checks: { ...entry.checks, diagram: true } })),
      events: fixture.events.map(entry => ({ ...entry, missionId: entry.missionId === 'pattern' ? 'fde' : entry.missionId })),
    });
    const snapshot = getDiscoverySnapshot(state, now);
    expect(snapshot.earned).toBe(24);
    expect(getWayfinderProgress(snapshot.earned)).toMatchObject({ level: 7, nextAt: null, remaining: 0 });
    expect(snapshot.discoveries.flatMap(discovery => discovery.sources).every(source => source.missionId === 'fde')).toBe(true);
    expect(state.missions.pattern.completedCheckpointIds).toEqual([]);
    expect(state.missions.fde.mode).toBe('background');
  });
  it('exposes a fully sourced, lazy curriculum without pretending web sources are physical PDF pages', async () => {
    const pack = await loadRoadmapPack('fde');
    const mission = getLatestMission('fde');
    expect(pack.sourceKind).toBe('web-research');
    expect(pack.units.filter(unit => unit.role === 'checkpoint')).toHaveLength(48);
    expect(pack.units.filter(unit => unit.role === 'practice')).toHaveLength(8);
    expect(new Set(pack.units.map(unit => unit.id)).size).toBe(pack.units.length);
    const sourceIds = new Set(pack.webSources?.map(source => source.id));
    for (const source of pack.webSources ?? []) {
      expect(new URL(source.url).protocol).toBe('https:');
      expect(source.scope.length).toBeGreaterThan(50);
    }
    for (const unit of pack.units) {
      expect(pack.phases.some(phase => phase.id === unit.phaseId)).toBe(true);
      expect(unit.pages).toEqual([]);
      expect(unit.sourceIds?.length).toBeGreaterThan(0);
      expect(unit.sourceIds?.every(id => sourceIds.has(id))).toBe(true);
      expect(unit.sections.flatMap(section => section.paragraphs).join(' ').length).toBeGreaterThan(250);
      expect(unit.exercises).toHaveLength(2);
      expect(unit.exercises.every(exercise => exercise.page === undefined && !!exercise.check)).toBe(true);
      const checkpoint = mission.checkpoints.find(item => item.id === packCheckpointId('fde', unit.id));
      if (unit.role === 'checkpoint') {
        expect(checkpoint?.criteria).toEqual(unit.criteria);
        expect(checkpoint?.source?.page).toBeUndefined();
        expect(checkpoint?.source?.url).toMatch(/^https:\/\//);
        for (const id of prerequisitesFor(mission, checkpoint!)) {
          expect(mission.checkpoints.findIndex(item => item.id === id)).toBeLessThan(mission.checkpoints.indexOf(checkpoint!));
        }
      } else expect(checkpoint).toBeUndefined();
    }
    expect(searchRoadmapPacks('customer discovery').some(item => item.route.startsWith('practice/fde/'))).toBe(true);
    const peers = careerSkillLinks.filter(link => link.source.missionId === 'fde' || link.target.missionId === 'fde')
      .map(link => link.source.missionId === 'fde' ? link.target.missionId : link.source.missionId);
    expect(new Set(peers)).toEqual(new Set(missionIds.filter(id => id !== 'fde')));
  });

  it('derives Atlas receipts and cosmetic levels from FDE work and reconstructs them from a normal backup', () => {
    const state = attempt(createInitialState(false));
    const snapshot = getDiscoverySnapshot(state);
    expect(snapshot.total).toBe(24);
    expect(snapshot.earned).toBeGreaterThan(0);
    expect(getWayfinderProgress(snapshot.earned).level).toBeGreaterThan(1);
    const working = snapshot.discoveries.find(item => item.id === 'working-thought')!;
    expect(working.sources).toHaveLength(1);
    expect(working.sources[0]).toMatchObject({ missionId: 'fde', checkpointId: state.missions.fde.checkpointId });
    expect(state.missions.fde.completedCheckpointIds).toEqual([]);
    expect(getDiscoverySnapshot(parseState(JSON.parse(serializeWorkspace(state))))).toEqual(snapshot);
    expect(buildCareerGraph(state).nodes.find(node => node.id === 'mission:fde')?.label).toBe('Forward Deployed Engineering');
  });
});
