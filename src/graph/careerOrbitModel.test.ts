import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { checkpointIdentity, getLatestMission, getMission, getMissions } from '../domain/catalog';
import { createInitialState, localDate, recordEvidence, upgradeRoadmap } from '../domain/engine';
import { freelanceVerdicts, missionIds, opportunityStages } from '../domain/types';
import type { AppState, DailyAction, Evidence, MissionId, RoadmapVersion } from '../domain/types';
import { buildCareerGraph } from './careerGraphModel';
import type { CareerGraph } from './careerGraphModel';
import { buildCareerOrbits } from './careerOrbitModel';
import type { CareerOrbit } from './careerOrbitTypes';
import { missionColor } from '../missionVisuals';
import { getMissionActivity } from '../domain/missionActivity';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-04T12:00:00Z'));
});
afterEach(() => vi.useRealTimers());

const collectionKinds = ['action', 'evidence', 'opportunity', 'freelance', 'history', 'curriculum'] as const;
const versions: RoadmapVersion[] = ['1.0.0', '2.0.0', '3.0.0'];
const recordId = (kind: string, id: string) => `${kind}:${encodeURIComponent(id)}`;
const checkpointId = (missionId: MissionId, id: string, version: RoadmapVersion) =>
  `checkpoint:${checkpointIdentity(missionId, id, version)}`;

function orbit(graph: CareerGraph, kind: CareerOrbit['kind'], missionId?: MissionId): CareerOrbit {
  const found = graph.orbits.find(candidate => candidate.kind === kind && (!missionId || candidate.missionId === missionId));
  expect(found).toBeDefined();
  return found!;
}

function complete(state: AppState, missionId: MissionId = 'pattern'): AppState {
  return recordEvidence(state, {
    missionId, checkpointId: state.missions[missionId].checkpointId, title: 'Synthetic completion',
    summary: 'Synthetic checked exercise and explanation for tests.', kind: 'exercise', url: '',
    advance: true, criteriaConfirmed: true,
  });
}

function action(state: AppState, overrides: Partial<DailyAction> = {}): DailyAction {
  return {
    id: 'synthetic-action', date: localDate(), missionId: 'pattern',
    checkpointId: state.missions.pattern.checkpointId, roadmapVersion: state.missions.pattern.roadmapVersion,
    title: 'Synthetic action', reason: 'Synthetic saved explanation', minutes: 15, completed: false, ...overrides,
  };
}

function evidence(state: AppState, missionId: MissionId, overrides: Partial<Evidence> = {}): Evidence {
  return {
    id: `synthetic-evidence-${missionId}`, missionId, checkpointId: state.missions[missionId].checkpointId,
    roadmapVersion: state.missions[missionId].roadmapVersion, title: 'Synthetic saved evidence',
    summary: 'Synthetic practice record', kind: 'exercise', url: '', visibility: 'local',
    createdAt: state.updatedAt, completedCheckpoint: false, ...overrides,
  };
}

function freeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

function expectExactMembership(graph: CareerGraph) {
  const byId = new Map(graph.nodes.map(node => [node.id, node]));
  for (const item of graph.orbits) {
    expect(byId.has(item.hubNodeId)).toBe(true);
    expect(item.memberIds).toEqual(item.segments.flatMap(segment => segment.members.map(member => member.nodeId)));
    expect(new Set(item.memberIds).size).toBe(item.memberIds.length);
    expect(new Set(item.segments.map(segment => segment.id)).size).toBe(item.segments.length);
    for (const segment of item.segments) {
      expect(segment.members.length).toBeGreaterThan(0);
      expect(segment.summary.length).toBeGreaterThan(0);
      expect(segment.detail.length).toBeGreaterThan(0);
      expect(segment.href).toMatch(/^#\/(?:mission\/[a-z]+|plan|evidence|pipeline|freelance|perspective|sources\/[a-z]+)$/);
      for (const member of segment.members) {
        const node = byId.get(member.nodeId)!;
        expect(node).toBeDefined();
        expect(member).toEqual({ nodeId: node.id, status: node.status, current: node.current === true });
        expect(node.kind).toBe(item.kind === 'mission' ? 'checkpoint' : item.kind);
        if (item.kind === 'mission') {
          expect(node).toMatchObject({ missionId: item.missionId, roadmapVersion: item.roadmapVersion, archived: false });
        }
      }
    }
    if (item.currentNodeId) {
      expect(item.memberIds).toContain(item.currentNodeId);
      expect(byId.get(item.currentNodeId)?.current).toBe(true);
    }
    if (item.kind !== 'mission') {
      expect(item).not.toHaveProperty('progress');
      expect(item).not.toHaveProperty('currentNodeId');
      expect(item.hubNodeId).toBe('core:careerhq');
      expect([...item.memberIds].sort()).toEqual(graph.nodes.filter(node => node.kind === item.kind).map(node => node.id).sort());
      const copy = [item.label, item.summary, item.detail,
        ...item.segments.flatMap(segment => [segment.label, segment.summary, segment.detail])].join('\n');
      expect(copy).not.toMatch(/\d\s*%/);
    }
  }
}

describe('Career orbits: stable read-only graph views', () => {
  it.each(versions)('always returns every saved mission and six collections with stable identities for v%s', version => {
    const state = createInitialState(false, version);
    state.missions = Object.fromEntries(Object.entries(state.missions).reverse()) as AppState['missions'];
    const graph = buildCareerGraph(state);
    expect(graph.orbits).toHaveLength(missionIds.length + 6);
    expect(graph.orbits.map(item => item.index)).toEqual(Array.from({ length: missionIds.length + 6 }, (_, index) => index));
    expect(graph.orbits.map(item => item.kind)).toEqual([...missionIds.map(() => 'mission'), ...collectionKinds]);
    expect(graph.orbits.map(item => item.id)).toEqual([
      ...missionIds.map(id => `orbit:mission:${id}`), ...collectionKinds.map(kind => `orbit:${kind}`),
    ]);
    expect(graph.orbits.slice(0, missionIds.length).map(item => item.missionId)).toEqual([...missionIds]);
    expect(graph.orbits.slice(missionIds.length).map(item => item.label)).toEqual([
      'Daily work', 'Saved evidence', 'Applications', 'Freelance leads', 'Past accomplishments', 'Untracked curriculum',
    ]);
    for (const item of graph.orbits) expect(item.color).toMatch(/^#[0-9A-F]{6}$/);
    expect(graph.orbits.slice(0, missionIds.length).map(item => item.color)).toEqual(missionIds.map(missionColor));
    expect(new Set(graph.orbits.map(item => item.color)).size).toBe(missionIds.length + 6);
    expect(graph.orbits.slice(0, missionIds.length).map(item => item.missionMode)).toEqual(missionIds.map(id => state.missions[id].mode));
    expect(graph.orbits.slice(missionIds.length).every(item => item.missionMode === undefined)).toBe(true);
    expectExactMembership(graph);
  });

  it.each(versions)('uses every saved mission mode, not primary focus, without recoloring work or changing v%s membership', version => {
    const state = complete(createInitialState(false, version));
    const before = buildCareerGraph(state);
    for (const mode of ['background', 'active'] as const) {
      for (const id of missionIds) state.missions[id].mode = getMission(id, state).planned ? 'planned' : mode;
      state.focusMissionId = 'pattern';
      const raw = JSON.stringify(state);
      const graph = buildCareerGraph(state);
      expect(JSON.stringify(state)).toBe(raw);
      expect(graph.stats).toEqual(before.stats);
      expect(graph.nodes.map(node => ({ id: node.id, position: node.position, status: node.status })))
        .toEqual(before.nodes.map(node => ({ id: node.id, position: node.position, status: node.status })));
      expect(graph.orbits.slice(missionIds.length)).toEqual(before.orbits.slice(missionIds.length));
      for (const id of missionIds) {
        const item = orbit(graph, 'mission', id);
        const original = orbit(before, 'mission', id);
        const expectedMode = state.missions[id].mode;
        expect(item.missionMode).toBe(expectedMode);
        expect(item.color).toBe(missionColor(id));
        expect(item.detail).toContain(expectedMode === 'active' ? 'colored outer ring' : 'smaller ring in its mission color near the core');
        expect(item.memberIds).toEqual(original.memberIds);
        expect(item.segments).toEqual(original.segments);
        expect(item.progress).toEqual(original.progress);
        expect(item.currentNodeId).toEqual(original.currentNodeId);
      }
      expect(orbit(graph, 'mission', 'algorithm').color).toBe(missionColor('algorithm'));
    }
  });

  it.each(versions)('partitions exactly the actual saved v%s checkpoints into actual definition stages', version => {
    const state = complete(createInitialState(false, version));
    const graph = buildCareerGraph(state);
    for (const mission of getMissions(state)) {
      const item = orbit(graph, 'mission', mission.id);
      const expectedIds = mission.checkpoints.map(checkpoint => checkpointId(mission.id, checkpoint.id, mission.roadmapVersion));
      expect([...item.memberIds].sort()).toEqual(expectedIds.sort());
      expect(item.href).toBe(`#/mission/${mission.id}`);
      expect(item.hubNodeId).toBe(`mission:${mission.id}`);
      expect(item.detail).toContain(`roadmap v${mission.roadmapVersion}`);
      if (mission.checkpoints.length) {
        expect(item.progress).toEqual({
          completed: mission.checkpoints.filter(checkpoint => state.missions[mission.id].completedCheckpointIds.includes(checkpoint.id)).length,
          total: mission.checkpoints.length,
        });
        expect(item.detail).toContain('user-recorded completion');
        expect(item.detail).toContain('not assessed mastery');
      } else {
        expect(item).not.toHaveProperty('progress');
        expect(item.segments).toEqual([]);
      }
      if (mission.stages?.length) {
        const stages = mission.stages.filter(stage => stage.checkpointIds.length);
        expect(item.segments.map(segment => segment.label)).toEqual(stages.map(stage => stage.title));
        expect(item.segments.map(segment => segment.id)).toEqual(stages.map(stage =>
          `${item.id}:${mission.roadmapVersion}:stage:${encodeURIComponent(stage.id)}`));
        item.segments.forEach((segment, index) => expect(segment.members.map(member => member.nodeId)).toEqual(
          stages[index].checkpointIds.map(id => checkpointId(mission.id, id, mission.roadmapVersion)),
        ));
      } else {
        const labels = [...new Set(mission.checkpoints.map(checkpoint => checkpoint.stage))];
        expect(item.segments.map(segment => segment.label)).toEqual(labels);
        item.segments.forEach(segment => {
          expect(segment.id).toBe(`${item.id}:${mission.roadmapVersion}:checkpoint-stage:${encodeURIComponent(segment.label)}`);
          expect(segment.members.map(member => member.nodeId)).toEqual(
            mission.checkpoints.filter(checkpoint => checkpoint.stage === segment.label)
              .map(checkpoint => checkpointId(mission.id, checkpoint.id, mission.roadmapVersion)),
          );
        });
      }
    }
    expect(graph.orbits.reduce((sum, item) => sum + (item.progress?.total ?? 0), 0)).toBe(graph.stats.trackedTotal);
    expect(graph.orbits.reduce((sum, item) => sum + (item.progress?.completed ?? 0), 0)).toBe(graph.stats.trackedCompleted);
    expectExactMembership(graph);
  });

  it('preserves the current saved checkpoint in a blocked background mission without copying its blocker', () => {
    const state = complete(createInitialState(false));
    state.missions.pattern.mode = 'background';
    state.missions.pattern.blocker = 'PRIVATE BLOCKER SENTINEL';
    const graph = buildCareerGraph(state);
    const item = orbit(graph, 'mission', 'pattern');
    const mission = getMission('pattern', state);
    const current = mission.checkpoints.find(checkpoint => checkpoint.id === state.missions.pattern.checkpointId)!;
    expect(item.currentNodeId).toBe(checkpointId('pattern', current.id, mission.roadmapVersion));
    expect(item.segments.flatMap(segment => segment.members).filter(member => member.current)).toEqual([
      { nodeId: item.currentNodeId, status: 'incomplete', current: true },
    ]);
    expect(item.summary).toContain('1/48 checkpoints marked complete');
    expect(item.summary).toContain(current.stage);
    expect(item.summary).toContain(current.title);
    expect(item.detail).toContain('background');
    expect(JSON.stringify(item)).not.toContain(state.missions.pattern.blocker);
    state.missions.pattern.mode = 'active';
    expect(orbit(buildCareerGraph(state), 'mission', 'pattern').currentNodeId).toBe(item.currentNodeId);
  });

  it('has no invented activity or progress for empty records and a saved forecast-only mission', () => {
    const fresh = buildCareerGraph(createInitialState(false));
    for (const item of fresh.orbits.slice(missionIds.length)) {
      expect(item.memberIds).toEqual([]);
      expect(item.segments).toEqual([]);
      expect(item.summary).toBe(item.kind === 'curriculum' ? 'No untracked curriculum' : 'No records');
      expect(item).not.toHaveProperty('progress');
    }
    const graph = buildCareerGraph(createInitialState(false, '2.0.0'));
    const forecast = orbit(graph, 'mission', 'algorithm');
    expect(forecast.summary).toBe('No tracked checkpoints · reference only');
    expect(forecast).not.toHaveProperty('progress');
    expect(forecast).not.toHaveProperty('currentNodeId');
    expect(forecast.memberIds).toEqual([]);
    expect(orbit(graph, 'curriculum').segments.find(segment => segment.label === forecast.label)?.members).toHaveLength(34);
    expect(orbit(graph, 'mission', 'credential').segments.length)
      .toBeLessThan(getMission('credential', createInitialState(false, '2.0.0')).stages!.length);
  });
});

describe('Career orbits: exact-version completion boundaries', () => {
  it('keeps a mixed v1/v2/v3 workspace pinned while previews and archived completions stay separate', () => {
    let state = complete(createInitialState(false, '1.0.0'), 'system');
    state = upgradeRoadmap(state, 'system');
    state.missions.pattern = createInitialState(false, '2.0.0').missions.pattern;
    state = complete(state);
    const graph = buildCareerGraph(state);
    expect(orbit(graph, 'mission', 'pattern')).toMatchObject({ roadmapVersion: '2.0.0', progress: { completed: 1, total: 5 } });
    expect(orbit(graph, 'mission', 'system')).toMatchObject({ roadmapVersion: '3.0.0', progress: { completed: 0, total: 72 } });
    expect(orbit(graph, 'mission', 'escape').roadmapVersion).toBe('1.0.0');
    expect(graph.stats.archivedCompleted).toBe(1);
    const tracked = graph.orbits.filter(item => item.kind === 'mission').flatMap(item => item.memberIds);
    for (const node of graph.nodes.filter(node => node.archived || node.kind === 'curriculum')) {
      expect(tracked).not.toContain(node.id);
    }
    expectExactMembership(graph);
  });

  it('deduplicates the unchanged DSA prefix when explicit v2-to-v3 adoption carries recorded completions', () => {
    let state = complete(complete(createInitialState(false, '2.0.0')));
    const before = buildCareerGraph(state);
    const oldOrbit = orbit(before, 'mission', 'pattern');
    expect(oldOrbit.progress).toEqual({ completed: 2, total: 5 });
    const preview = orbit(before, 'curriculum').segments.find(segment => segment.label === oldOrbit.label)!;
    expect(preview.members).toHaveLength(43);
    expect(preview.members.every(member => member.status === 'reference' && !member.current)).toBe(true);
    state = upgradeRoadmap(state, 'pattern');
    const after = buildCareerGraph(state);
    const adopted = orbit(after, 'mission', 'pattern');
    expect(adopted).toMatchObject({ id: oldOrbit.id, index: oldOrbit.index, progress: { completed: 2, total: 48 } });
    expect(adopted.currentNodeId).toBe(oldOrbit.currentNodeId);
    expect(adopted.memberIds.slice(0, 5)).toEqual(oldOrbit.memberIds);
    expect(adopted.segments.slice(0, 2).map(segment => segment.id)).toEqual(oldOrbit.segments.map(segment =>
      segment.id.replace(':2.0.0:', ':3.0.0:')));
    expect(adopted.segments.flatMap(segment => segment.members).filter(member => member.status === 'complete')).toHaveLength(2);
    expect(orbit(after, 'curriculum').segments.some(segment => segment.label === oldOrbit.label)).toBe(false);
    expect(after.stats.archivedCompleted).toBe(0);
    expectExactMembership(after);
  });

  it.each([['pattern', '1.0.0'], ['system', '2.0.0']] as const)(
    'does not credit archived %s v%s completions to different current definitions',
    (missionId, version) => {
      let state = complete(createInitialState(false, version), missionId);
      const before = orbit(buildCareerGraph(state), 'mission', missionId);
      const completedId = before.segments.flatMap(segment => segment.members).find(member => member.status === 'complete')!.nodeId;
      state = upgradeRoadmap(state, missionId);
      const graph = buildCareerGraph(state);
      const after = orbit(graph, 'mission', missionId);
      expect(after.progress).toEqual({ completed: 0, total: getLatestMission(missionId).checkpoints.length });
      expect(after.memberIds).not.toContain(completedId);
      expect(orbit(graph, 'curriculum').memberIds).not.toContain(completedId);
      expect(graph.nodes.find(node => node.id === completedId)).toMatchObject({ archived: true, status: 'complete' });
      expectExactMembership(graph);
    },
  );

  it('finishing v2 counts only its real checkpoints and leaves unadopted v3 references uncompleted', () => {
    let state = createInitialState(false, '2.0.0');
    for (let index = 0; index < 5; index += 1) state = complete(state);
    const graph = buildCareerGraph(state);
    const item = orbit(graph, 'mission', 'pattern');
    expect(item.progress).toEqual({ completed: 5, total: 5 });
    expect(item).not.toHaveProperty('currentNodeId');
    expect(item.segments.flatMap(segment => segment.members).every(member => member.status === 'complete' && !member.current)).toBe(true);
    expect(item.summary).toContain('All tracked checkpoints marked complete');
    const references = orbit(graph, 'curriculum').segments.find(segment => segment.label === item.label)!;
    expect(references.members).toHaveLength(43);
    expect(references.members.every(member => member.status === 'reference' && !member.current)).toBe(true);
  });
});

describe('Career orbits: truthful saved collections', () => {
  it('groups all actual opportunity stages and freelance verdicts without granting mission credit', () => {
    const state = createInitialState(false);
    state.opportunities = opportunityStages.map(stage => ({
      id: `shared /%:${stage}`, company: 'Synthetic company', role: 'Synthetic role', stage,
      url: '', notes: 'Accepted and Ignore are prose, not the actual saved classification.', createdAt: state.updatedAt,
    }));
    state.freelanceOpportunities = freelanceVerdicts.map(verdict => ({
      id: `shared /%:${verdict}`, title: 'Synthetic lead', platform: 'Synthetic board', url: '', skills: '',
      budget: '', verdict, notes: 'Private research, not completion data.', createdAt: state.updatedAt,
    }));
    const graph = buildCareerGraph(state);
    const applications = orbit(graph, 'opportunity');
    expect(applications.segments.map(segment => segment.label)).toEqual([...opportunityStages]);
    expect(applications.summary).toBe('10 records · 1 accepted · 2 closed references');
    for (const record of state.opportunities) {
      const segment = applications.segments.find(segment => segment.label === record.stage)!;
      expect(segment.members).toEqual([{
        nodeId: recordId('opportunity', record.id), current: false,
        status: record.stage === 'Accepted' ? 'complete' : ['Rejected', 'Withdrawn'].includes(record.stage) ? 'reference' : 'incomplete',
      }]);
      expect(segment.detail).toContain(record.stage);
      if (record.stage === 'Accepted') expect(segment.detail).toContain('not assessed mastery');
    }
    const freelance = orbit(graph, 'freelance');
    expect(freelance.segments.map(segment => segment.label)).toEqual([...freelanceVerdicts]);
    expect(freelance.summary).toBe('5 records · 1 ignored reference');
    for (const record of state.freelanceOpportunities) {
      const segment = freelance.segments.find(segment => segment.label === record.verdict)!;
      expect(segment.members).toEqual([{
        nodeId: recordId('freelance', record.id), current: false, status: record.verdict === 'Ignore' ? 'reference' : 'incomplete',
      }]);
      expect(segment.detail).toContain('No paid work');
    }
    expect(graph.stats.trackedCompleted).toBe(0);
    expectExactMembership(graph);
  });

  it('groups evidence by its own mission and past accomplishments as reviewed records, not checkpoint credit', () => {
    const legacy = createInitialState(false, '1.0.0');
    const state = createInitialState(false);
    const rawId = 'shared /%:record';
    state.evidence = [
      evidence(legacy, 'pattern', { id: rawId, roadmapVersion: undefined }),
      evidence(state, 'pattern'),
      evidence(state, 'system'),
    ];
    state.personalProof = [
      { id: rawId, title: 'Synthetic history', detail: 'Undated past work', source: 'Synthetic source', url: '' },
      { id: 'dated-proof', title: 'Other synthetic history', detail: 'Past work', source: 'Synthetic source', date: '2024-01-02', url: '' },
    ];
    const graph = buildCareerGraph(state);
    const saved = orbit(graph, 'evidence');
    expect(saved.segments.map(segment => segment.label)).toEqual(['DSA', getMission('system', state).name]);
    expect(saved.segments[0].members.map(member => member.nodeId)).toEqual(state.evidence.slice(0, 2).map(record => recordId('evidence', record.id)));
    expect(saved.segments.flatMap(segment => segment.members).every(member => member.status === 'reference')).toBe(true);
    expect(saved.detail).toContain('older roadmap versions');
    const history = orbit(graph, 'history');
    expect(history.segments).toHaveLength(1);
    expect(history.segments[0].label).toBe('User-reviewed past work');
    expect(history.memberIds).toContain(recordId('history', rawId));
    expect(history.segments[0].members.every(member => member.status === 'complete' && !member.current)).toBe(true);
    expect(history.detail).toContain('no checkpoint credit');
    expect(history.detail).toContain('without inferring dates');
    expect(graph.stats.trackedCompleted).toBe(0);
    expectExactMembership(graph);
  });

  it('includes only the graph’s today actions and completed past work, not future or missed plans', () => {
    const state = createInitialState(false);
    const today = localDate();
    const yesterday = localDate(new Date(Date.now() - 86_400_000));
    const tomorrow = localDate(new Date(Date.now() + 86_400_000));
    state.plans = {
      [yesterday]: [
        action(state, { id: 'past /done', date: yesterday, completed: true }),
        action(state, { id: 'past-open', date: yesterday }),
      ],
      [today]: [action(state, { id: 'today /done', completed: true }), action(state, { id: 'today-open' })],
      [tomorrow]: [action(state, { id: 'future-done', date: tomorrow, completed: true }), action(state, { id: 'future-open', date: tomorrow })],
    };
    const graph = buildCareerGraph(state);
    const daily = orbit(graph, 'action');
    expect(daily.label).toBe('Daily work');
    expect(daily.summary).toBe('3 records · 2 done · 1 unfinished');
    expect(daily.segments.map(segment => segment.label)).toEqual(['Done', 'Unfinished']);
    expect(daily.segments[0].members.map(member => member.nodeId)).toEqual([
      recordId('action', 'past /done'), recordId('action', 'today /done'),
    ]);
    expect(daily.segments[1].members).toEqual([{ nodeId: 'action:today-open', status: 'incomplete', current: false }]);
    const snapshot = buildCareerOrbits(state, graph.nodes);
    vi.setSystemTime(new Date('2035-01-01T12:00:00Z'));
    const later = buildCareerOrbits(state, graph.nodes);
    expect(later.map(({ activity: _activity, ...item }) => item))
      .toEqual(snapshot.map(({ activity: _activity, ...item }) => item));
    expect(later.filter(item => item.kind === 'mission').every(item => item.activity?.asOfDate === localDate())).toBe(true);
    expectExactMembership(graph);
  });

  describe('mission orbit daily work projection', () => {
    it('adds the same recorded-work summary as mission pages without changing membership or state', () => {
      const state = complete(createInitialState(false));
      const raw = JSON.stringify(state);
      const graph = buildCareerGraph(state);
      for (const id of missionIds) {
        expect(orbit(graph, 'mission', id).activity).toEqual(getMissionActivity(state, id));
      }
      expect(orbit(graph, 'mission', 'pattern').activity).toMatchObject({ workedToday: true, streak: 1 });
      expect(graph.orbits.filter(item => item.kind !== 'mission').every(item => item.activity === undefined)).toBe(true);
      expectExactMembership(graph);
      expect(JSON.stringify(state)).toBe(raw);
    });
  });

  it('retains all 10,500 represented daily records rather than truncating a view', () => {
    const state = createInitialState(false);
    state.plans[localDate()] = Array.from({ length: 10_500 }, (_, index) =>
      action(state, { id: `action /${index}`, completed: index % 2 === 0 }));
    const graph = buildCareerGraph(state);
    const daily = orbit(graph, 'action');
    expect(daily.memberIds).toHaveLength(10_500);
    expect(daily.segments.map(segment => segment.members.length)).toEqual([5250, 5250]);
    expect(new Set(daily.memberIds).size).toBe(10_500);
    expect(new Set(daily.memberIds)).toEqual(new Set(graph.nodes.filter(node => node.kind === 'action').map(node => node.id)));
    expect(daily).not.toHaveProperty('progress');
    expect(graph.stats.trackedCompleted).toBe(0);
  });

  it('never mines private prose to classify or explain collection membership', () => {
    const state = createInitialState(false);
    const marker = 'PRIVATE PROSE: Accepted completed Ignore expert mastery 99%';
    state.objective = marker;
    state.missions.pattern.blocker = marker;
    state.evidence = [evidence(state, 'pattern', { title: marker, summary: marker })];
    state.plans[localDate()] = [action(state, { title: marker, reason: marker })];
    state.personalProof = [{ id: 'private-proof', title: marker, detail: marker, source: marker, url: '' }];
    state.opportunities = [{ id: 'private-application', company: marker, role: marker, stage: 'Found', notes: marker, url: '', createdAt: state.updatedAt }];
    state.freelanceOpportunities = [{
      id: 'private-lead', title: marker, platform: marker, skills: marker, budget: marker, notes: marker,
      verdict: 'Unreviewed', url: '', createdAt: state.updatedAt,
    }];
    const graph = buildCareerGraph(state);
    expect(JSON.stringify(graph.orbits)).not.toContain(marker);
    expect(orbit(graph, 'opportunity').segments.map(segment => segment.label)).toEqual(['Found']);
    expect(orbit(graph, 'freelance').segments.map(segment => segment.label)).toEqual(['Unreviewed']);
    expect(orbit(graph, 'action').segments[0].label).toBe('Unfinished');
    expect(graph.stats.trackedCompleted).toBe(0);
  });

  it('does not mutate frozen state or graph data and returns independent deterministic views', () => {
    const state = complete(createInitialState(false, '2.0.0'));
    state.plans[localDate()] = [action(state)];
    const graph = buildCareerGraph(state);
    const stateBefore = JSON.stringify(state);
    const nodesBefore = JSON.stringify(graph.nodes);
    freeze(state);
    freeze(graph.nodes);
    const first = buildCareerOrbits(state, graph.nodes);
    expect(first).toEqual(graph.orbits);
    first[0].memberIds.push('not-a-node');
    first[0].segments[0].members[0].status = 'reference';
    first[0].progress!.completed = 999;
    expect(buildCareerOrbits(state, graph.nodes)).toEqual(graph.orbits);
    expect(JSON.stringify(state)).toBe(stateBefore);
    expect(JSON.stringify(graph.nodes)).toBe(nodesBefore);
  });
});
