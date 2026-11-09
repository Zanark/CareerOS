import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  checkpointIdentity, getLatestMission, getMission, getMissionVersion, getMissions, prerequisitesFor,
} from '../domain/catalog';
import { createInitialState, generatePlan, localDate, recordEvidence, upgradeRoadmap } from '../domain/engine';
import { freelanceVerdicts, missionIds, opportunityStages } from '../domain/types';
import type { AppState, DailyAction, Evidence, MissionId, PersonalProof, RoadmapVersion } from '../domain/types';
import { buildCareerGraph } from './careerGraphModel';
import type { CareerGraph, CareerGraphNode } from './careerGraphModel';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-04T12:00:00Z'));
});
afterEach(() => {
  vi.useRealTimers();
});

function saveEvidence(state: AppState, missionId: MissionId = 'pattern', advance = true): AppState {
  return recordEvidence(state, {
    missionId, checkpointId: state.missions[missionId].checkpointId,
    title: 'Synthetic test exercise', summary: 'A synthetic traced example with a checked result and an explanation.',
    kind: 'exercise', url: '', advance, criteriaConfirmed: advance,
  });
}

function checkpointId(missionId: MissionId, checkpoint: string, version: RoadmapVersion): string {
  return `checkpoint:${checkpointIdentity(missionId, checkpoint, version)}`;
}

function node(graph: CareerGraph, id: string): CareerGraphNode {
  const found = graph.nodes.find(candidate => candidate.id === id);
  expect(found, `Expected graph node ${id}`).toBeDefined();
  return found!;
}

function checkpoints(graph: CareerGraph, missionId?: MissionId): CareerGraphNode[] {
  return graph.nodes.filter(candidate => candidate.kind === 'checkpoint' && (!missionId || candidate.missionId === missionId));
}

function proof(id = 'synthetic-proof'): PersonalProof {
  return {
    id, title: 'Synthetic reviewed build', detail: 'A fictional project history record used only in tests.',
    source: 'Synthetic owner-reviewed source', date: '2025-06-01', url: 'https://example.com/history',
  };
}

function dailyAction(state: AppState, overrides: Partial<DailyAction> = {}): DailyAction {
  return {
    id: 'synthetic-action', date: localDate(), missionId: 'pattern',
    checkpointId: state.missions.pattern.checkpointId, roadmapVersion: state.missions.pattern.roadmapVersion,
    title: 'Synthetic short practice action', minutes: 15, reason: 'A small synthetic practice step.',
    completed: false, ...overrides,
  };
}

function freeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

describe('Career OS graph: real saved progress', () => {
  it('starts with every actual mission hub, zero achievements and only real tracked checkpoints', () => {
    const state = createInitialState(false);
    const graph = buildCareerGraph(state);
    const total = getMissions(state).reduce((sum, mission) => sum + mission.checkpoints.length, 0);
    expect(graph.stats).toEqual({ trackedTotal: total, trackedCompleted: 0, archivedCompleted: 0, pastWorkRecords: 0 });
    expect(graph.updates).toEqual([]);
    expect(graph.nodes).toHaveLength(total + missionIds.length + 1);
    expect(graph.orbits).toHaveLength(missionIds.length + 6);
    expect(graph.orbits.reduce((sum, orbit) => sum + (orbit.progress?.total ?? 0), 0)).toBe(total);
    expect(graph.nodes.some(item => item.id.startsWith('orbit:'))).toBe(false);
    expect(node(graph, 'core:careerhq')).toMatchObject({
      kind: 'core', status: 'reference', label: 'CareerOS', detail: state.objective, position: [0, 0, 0],
    });
    expect(node(graph, 'core:careerhq').context).toContain('Career OS');
    expect(graph.nodes.filter(item => item.status === 'complete')).toEqual([]);
    expect(graph.nodes.filter(item => item.kind === 'mission').map(item => item.missionId)).toEqual([...missionIds]);
    for (const mission of getMissions(state)) {
      expect(node(graph, `mission:${mission.id}`).status).toBe(mission.checkpoints.length ? 'incomplete' : 'reference');
      const tracked = checkpoints(graph, mission.id);
      expect(tracked).toHaveLength(mission.checkpoints.length);
      expect(tracked.filter(item => item.current)).toHaveLength(mission.checkpoints.length ? 1 : 0);
      expect(tracked.every(item => item.status === 'incomplete' && !item.archived)).toBe(true);
    }
    expect(node(graph, 'mission:algorithm').detail).toContain('0/34 tracked checkpoints');
  });

  it('uses saved completion IDs and preserves an unfinished current position in a blocked background mission', () => {
    let state = saveEvidence(createInitialState(false));
    state = saveEvidence(state, 'pattern', false);
    state.missions.pattern.mode = 'background';
    state.missions.pattern.blocker = 'Need to check the edge case.';
    const graph = buildCareerGraph(state);
    const mission = getMission('pattern', state);
    const first = node(graph, checkpointId('pattern', mission.checkpoints[0].id, mission.roadmapVersion));
    const current = node(graph, checkpointId('pattern', state.missions.pattern.checkpointId, mission.roadmapVersion));
    expect(first).toMatchObject({ status: 'complete', current: false, archived: false });
    expect(current).toMatchObject({ status: 'incomplete', current: true, roadmapVersion: '3.0.0' });
    expect(current.detail).toContain('Current saved position · background · in-progress');
    expect(current.detail).toContain(state.missions.pattern.blocker);
    expect(current.detail).toContain('roadmap v3.0.0');
    expect(current.detail).toContain(mission.checkpoints[1].source!.document);
    expect(checkpoints(graph, 'pattern').filter(item => item.current)).toEqual([current]);
    expect(node(graph, 'mission:pattern').status).toBe('incomplete');
    expect(graph.stats.trackedCompleted).toBe(1);
    expect(graph.nodes.filter(item => item.kind === 'evidence').every(item => item.status === 'reference')).toBe(true);
  });

  it('marks a fully completed tracked mission complete without counting its hub or evidence as tasks', () => {
    let state = createInitialState(false, '2.0.0');
    const mission = getMission('pattern', state);
    for (let index = 0; index < mission.checkpoints.length; index += 1) state = saveEvidence(state);
    const graph = buildCareerGraph(state);
    expect(state.missions.pattern.status).toBe('completed');
    expect(node(graph, 'mission:pattern').status).toBe('complete');
    expect(checkpoints(graph, 'pattern').every(item => item.status === 'complete' && !item.current)).toBe(true);
    expect(graph.stats.trackedCompleted).toBe(mission.checkpoints.length);
    expect(graph.nodes.filter(item => item.kind === 'curriculum' && item.missionId === 'pattern').every(item =>
      item.status === 'reference' && !item.current)).toBe(true);
    expect(graph.nodes.filter(item => item.status === 'complete')).toHaveLength(mission.checkpoints.length + 1);
  });

  it('deduplicates the verified DSA v2 prefix after explicit v3 adoption and promotes stable curriculum identities', () => {
    let state = saveEvidence(saveEvidence(createInitialState(false, '2.0.0')));
    const before = buildCareerGraph(state);
    const previous = getMissionVersion('pattern', '2.0.0');
    state = upgradeRoadmap(state, 'pattern');
    const graph = buildCareerGraph(state);
    expect(graph.stats.trackedCompleted).toBe(2);
    expect(graph.stats.archivedCompleted).toBe(0);
    expect(checkpoints(graph, 'pattern')).toHaveLength(getLatestMission('pattern').checkpoints.length);
    expect(graph.updates).not.toContain('pattern');
    for (const checkpoint of previous.checkpoints) {
      const id = checkpointId('pattern', checkpoint.id, '2.0.0');
      expect(id).toBe(checkpointId('pattern', checkpoint.id, '3.0.0'));
      expect(graph.nodes.filter(item => item.id === id)).toHaveLength(1);
      expect(node(graph, id)).toMatchObject({ archived: false, roadmapVersion: '3.0.0' });
      expect(node(graph, id).position).toEqual(node(before, id).position);
    }
    for (const preview of before.nodes.filter(item => item.kind === 'curriculum' && item.missionId === 'pattern')) {
      expect(node(graph, preview.id)).toMatchObject({
        kind: 'checkpoint', status: 'incomplete', archived: false, position: preview.position,
      });
    }
    expect(graph.stats.trackedTotal - before.stats.trackedTotal)
      .toBe(getLatestMission('pattern').checkpoints.length - previous.checkpoints.length);
    for (const evidence of state.evidence) {
      const evidenceNode = node(graph, `evidence:${evidence.id}`);
      expect(evidenceNode).toMatchObject({ status: 'reference', roadmapVersion: '2.0.0' });
      expect(evidenceNode.detail).toContain('Original checkpoint:');
      expect(graph.edges).toContainEqual(expect.objectContaining({
        source: checkpointId('pattern', evidence.checkpointId, '3.0.0'), target: evidenceNode.id, kind: 'evidence',
      }));
    }
  });

  it('retains different DSA v1 definitions as archived green work without resurrecting unfinished backlog', () => {
    let state = saveEvidence(createInitialState(false, '1.0.0'));
    const previous = getMission('pattern', state);
    const saved = previous.checkpoints[0];
    state = upgradeRoadmap(state, 'pattern');
    const graph = buildCareerGraph(state);
    const archiveId = checkpointId('pattern', saved.id, '1.0.0');
    expect(node(graph, archiveId)).toMatchObject({
      kind: 'checkpoint', status: 'complete', archived: true, current: false, roadmapVersion: '1.0.0', label: saved.title,
    });
    expect(node(graph, archiveId).detail).toContain(saved.action);
    expect(node(graph, archiveId).detail).toContain('no credit toward different current checkpoints');
    for (const unfinished of previous.checkpoints.slice(1)) {
      expect(graph.nodes.some(item => item.id === checkpointId('pattern', unfinished.id, '1.0.0'))).toBe(false);
    }
    expect(checkpoints(graph, 'pattern').filter(item => !item.archived).every(item => item.status === 'incomplete')).toBe(true);
    expect(graph.stats).toMatchObject({ trackedCompleted: 0, archivedCompleted: 1 });
  });

  it('does not map old System Design completions to new definitions; unrepresented practice links to its mission', () => {
    let state = saveEvidence(createInitialState(false, '2.0.0'), 'system');
    state = saveEvidence(state, 'system', false);
    const previous = getMission('system', state);
    const practice = state.evidence.at(-1)!;
    state = upgradeRoadmap(state, 'system');
    const graph = buildCareerGraph(state);
    const archivedId = checkpointId('system', previous.checkpoints[0].id, '2.0.0');
    expect(node(graph, archivedId)).toMatchObject({ status: 'complete', archived: true, roadmapVersion: '2.0.0' });
    expect(graph.nodes.some(item => item.id === checkpointId('system', practice.checkpointId, '2.0.0'))).toBe(false);
    const current = checkpoints(graph, 'system').filter(item => !item.archived);
    expect(current).toHaveLength(getLatestMission('system').checkpoints.length);
    expect(current.every(item => item.status === 'incomplete' && item.roadmapVersion === '3.0.0')).toBe(true);
    expect(current.filter(item => item.current)).toHaveLength(1);
    expect(graph.stats).toMatchObject({ trackedCompleted: 0, archivedCompleted: 1 });
    expect(graph.edges).toContainEqual(expect.objectContaining({
      source: 'mission:system', target: `evidence:${practice.id}`, kind: 'evidence',
    }));
    expect(graph.edges).toContainEqual(expect.objectContaining({
      source: archivedId, target: `evidence:${state.evidence[0].id}`, kind: 'evidence',
    }));
  });

  it('shows all unadopted latest identities only as curriculum references, never new unfinished work', () => {
    const state = createInitialState(false, '2.0.0');
    const graph = buildCareerGraph(state);
    expect(graph.updates).toEqual(missionIds.filter(id => id !== 'fde'));
    expect(graph.stats).toEqual({ trackedTotal: 135, trackedCompleted: 0, archivedCompleted: 0, pastWorkRecords: 0 });
    const references = graph.nodes.filter(item => item.kind === 'curriculum');
    const expectedPattern = getLatestMission('pattern').checkpoints.length - getMission('pattern', state).checkpoints.length;
    expect(references.filter(item => item.missionId === 'pattern')).toHaveLength(expectedPattern);
    expect(references.filter(item => item.missionId === 'system')).toHaveLength(getLatestMission('system').checkpoints.length);
    expect(references.every(item => item.status === 'reference' && !item.current && !item.archived)).toBe(true);
    for (const reference of references) {
      expect(reference.detail).toContain('has not been adopted');
      expect(reference.detail).toContain('no progress credit');
      expect(reference.roadmapVersion).toBe(getLatestMission(reference.missionId!).roadmapVersion);
    }
    expect(checkpoints(graph)).toHaveLength(135);
    expect(buildCareerGraph(state)).toEqual(graph);
  });

  it('preserves the saved forecast while exposing the new documented curriculum without progress credit', () => {
    const graph = buildCareerGraph(createInitialState(false, '1.0.0'));
    expect(graph.updates).toContain('algorithm');
    expect(node(graph, 'mission:algorithm').status).toBe('reference');
    const algorithm = graph.nodes.filter(item => item.missionId === 'algorithm');
    expect(algorithm).toHaveLength(35);
    expect(algorithm.every(item => item.status === 'reference')).toBe(true);
    expect(algorithm.filter(item => item.kind === 'curriculum')).toHaveLength(34);
  });
});

describe('Career OS graph: private records are not invented mastery', () => {
  it('distinguishes reviewed past accomplishments from reference evidence and keeps their sources intact', () => {
    const state = saveEvidence(createInitialState(false));
    state.personalProof = [proof(), { ...proof('another-proof'), date: undefined, url: '' }];
    const graph = buildCareerGraph(state);
    expect(graph.stats).toMatchObject({ trackedCompleted: 1, archivedCompleted: 0, pastWorkRecords: 2 });
    expect(graph.nodes.filter(item => item.kind === 'history')).toHaveLength(2);
    for (const record of state.personalProof) {
      const history = node(graph, `history:${record.id}`);
      expect(history).toMatchObject({ kind: 'history', status: 'complete', label: record.title, href: '#/perspective' });
      expect(history.detail).toContain(record.detail);
      expect(history.detail).toContain(record.source);
      expect(history.detail).toContain('not checkpoint credit');
      expect(history.missionId).toBeUndefined();
    }
    const saved = node(graph, `evidence:${state.evidence[0].id}`);
    expect(saved.status).toBe('reference');
    expect(saved.detail).toContain(state.evidence[0].summary);
    expect(saved.detail).toContain('not an automatic mastery assessment');
    expect(saved.href).toBe(`#/evidence/${state.evidence[0].id}`);
    expect(graph.nodes.some(item => state.events.some(event => item.id === event.id))).toBe(false);
  });

  it('resolves evidence without a version against legacy v1 instead of the latest tracker', () => {
    let state = saveEvidence(createInitialState(false, '1.0.0'));
    delete state.evidence[0].roadmapVersion;
    state = upgradeRoadmap(state, 'pattern');
    const graph = buildCareerGraph(state);
    const evidence = state.evidence[0];
    const saved = node(graph, `evidence:${evidence.id}`);
    expect(saved.roadmapVersion).toBe('1.0.0');
    expect(graph.edges).toContainEqual(expect.objectContaining({
      source: checkpointId('pattern', evidence.checkpointId, '1.0.0'), target: saved.id, kind: 'evidence',
    }));
  });

  it('preserves every actual pipeline stage and treats only Accepted as a completed outcome', () => {
    const state = createInitialState(false);
    state.opportunities = opportunityStages.map((stage, index) => ({
      id: `opportunity-${index}`, company: 'Synthetic company', role: 'Synthetic role', stage,
      url: 'https://example.com/role', notes: `Synthetic ${stage} note`, createdAt: state.updatedAt,
    }));
    const graph = buildCareerGraph(state);
    expect(graph.nodes.filter(item => item.kind === 'opportunity')).toHaveLength(opportunityStages.length);
    for (const opportunity of state.opportunities) {
      const item = node(graph, `opportunity:${opportunity.id}`);
      expect(item.label).toContain(opportunity.stage);
      expect(item.detail).toContain(opportunity.notes);
      expect(item.status).toBe(opportunity.stage === 'Accepted' ? 'complete'
        : ['Rejected', 'Withdrawn'].includes(opportunity.stage) ? 'reference' : 'incomplete');
      expect(item).toMatchObject({ missionId: 'escape', href: '#/pipeline' });
    }
    expect(graph.stats.trackedCompleted).toBe(0);
    expect(node(graph, 'mission:escape').status).toBe('incomplete');
  });

  it('keeps classified freelance leads unfinished except ignored references, never claiming paid work', () => {
    const state = createInitialState(false);
    state.freelanceOpportunities = freelanceVerdicts.map((verdict, index) => ({
      id: `lead-${index}`, title: 'Synthetic research lead', platform: 'Synthetic board',
      url: 'https://example.com/lead', skills: 'Synthetic skills', budget: 'Not assessed', verdict,
      notes: 'Synthetic research note', createdAt: state.updatedAt,
    }));
    const graph = buildCareerGraph(state);
    for (const lead of state.freelanceOpportunities) {
      const item = node(graph, `freelance:${lead.id}`);
      expect(item.status).toBe(lead.verdict === 'Ignore' ? 'reference' : 'incomplete');
      expect(item.label).toContain(lead.verdict);
      expect(item.detail).toContain('not paid work');
      expect(item.detail).toContain(lead.notes);
      expect(item).toMatchObject({ missionId: 'income', href: '#/freelance' });
    }
    expect(graph.nodes.filter(item => item.kind === 'freelance')).toHaveLength(freelanceVerdicts.length);
    expect(graph.stats).toMatchObject({ trackedCompleted: 0, pastWorkRecords: 0 });
    expect(node(graph, 'mission:income').status).toBe('incomplete');
  });

  it('includes every record without truncation or cross-scope user-ID collisions', () => {
    const state = saveEvidence(createInitialState(false), 'pattern', false);
    const example: Evidence = state.evidence[0];
    const count = 80;
    state.evidence = Array.from({ length: count }, (_, index) => ({ ...example, id: `record-${index}` }));
    state.personalProof = Array.from({ length: count }, (_, index) => proof(`record-${index}`));
    state.opportunities = Array.from({ length: count }, (_, index) => ({
      id: `record-${index}`, company: 'Synthetic company', role: 'Synthetic role', stage: 'Found',
      url: '', notes: '', createdAt: state.updatedAt,
    }));
    state.freelanceOpportunities = Array.from({ length: count }, (_, index) => ({
      id: `record-${index}`, title: 'Synthetic lead', platform: 'Synthetic board', url: '', skills: '',
      budget: '', verdict: 'Unreviewed', notes: '', createdAt: state.updatedAt,
    }));
    state.plans[localDate()] = Array.from({ length: count }, (_, index) => dailyAction(state, { id: `record-${index}` }));
    const graph = buildCareerGraph(state);
    for (const kind of ['history', 'evidence', 'opportunity', 'freelance', 'action'] as const) {
      expect(graph.nodes.filter(item => item.kind === kind)).toHaveLength(count);
    }
    expect(new Set(graph.nodes.map(item => item.id)).size).toBe(graph.nodes.length);
    expect(graph.stats).toMatchObject({ trackedCompleted: 0, archivedCompleted: 0, pastWorkRecords: count });
  });
});

describe('Career OS graph: daily work is distinct from checkpoint mastery', () => {
  it('shows real today actions and records completed practice without completing its checkpoint', () => {
    let state = createInitialState(false);
    const today = localDate();
    state.plans[today] = generatePlan(state);
    const action = state.plans[today].find(item => item.missionId === 'pattern')!;
    const before = buildCareerGraph(state);
    expect(node(before, `action:${action.id}`)).toMatchObject({ kind: 'action', status: 'incomplete', href: '#/plan' });
    state = recordEvidence(state, {
      missionId: action.missionId, checkpointId: action.checkpointId, actionId: action.id,
      title: 'Synthetic action evidence', summary: 'A synthetic practice result, not a completed checkpoint.',
      kind: 'exercise', url: '', advance: false, criteriaConfirmed: false,
    });
    const graph = buildCareerGraph(state);
    const finished = node(graph, `action:${action.id}`);
    expect(finished).toMatchObject({ status: 'complete', kind: 'action', label: action.title, href: '#/plan' });
    expect(finished.context).toContain(today);
    expect(finished.context).toContain('daily action');
    expect(finished.detail).toContain(action.reason);
    expect(finished.detail).toContain('not checkpoint completion');
    expect(finished.position).toEqual(node(before, finished.id).position);
    const source = checkpointId('pattern', action.checkpointId, action.roadmapVersion!);
    expect(node(graph, source)).toMatchObject({ status: 'incomplete', current: true });
    expect(graph.edges).toContainEqual(expect.objectContaining({ source, target: finished.id, kind: 'contains' }));
    expect(graph.stats).toEqual(before.stats);
    expect(graph.nodes.filter(item => item.kind === 'action')).toHaveLength(state.plans[today].length);
    expect(graph.nodes.filter(item => item.kind === 'action' && item.status === 'incomplete'))
      .toHaveLength(state.plans[today].length - 1);
  });

  it('includes only completed historical actions and all today actions, excluding missed or future work', () => {
    const state = createInitialState(false);
    const today = localDate();
    const yesterday = localDate(new Date(Date.now() - 86_400_000));
    const tomorrow = localDate(new Date(Date.now() + 86_400_000));
    state.plans = {
      [yesterday]: [
        dailyAction(state, { id: 'past-done', date: yesterday, completed: true }),
        dailyAction(state, { id: 'past-missed', date: yesterday }),
      ],
      [today]: [
        dailyAction(state, { id: 'today-done', completed: true }),
        dailyAction(state, { id: 'today-open' }),
      ],
      [tomorrow]: [
        dailyAction(state, { id: 'future-done', date: tomorrow, completed: true }),
        dailyAction(state, { id: 'future-open', date: tomorrow }),
      ],
    };
    const before = JSON.stringify(state);
    freeze(state);
    const graph = buildCareerGraph(state);
    expect(graph.nodes.filter(item => item.kind === 'action').map(item => item.id).sort())
      .toEqual(['action:past-done', 'action:today-done', 'action:today-open']);
    expect(node(graph, 'action:past-done')).toMatchObject({ status: 'complete', href: '#/history' });
    expect(node(graph, 'action:past-done').context).toContain(yesterday);
    expect(node(graph, 'action:today-open')).toMatchObject({ status: 'incomplete', href: '#/plan' });
    expect(graph.stats).toMatchObject({ trackedCompleted: 0, archivedCompleted: 0, pastWorkRecords: 0 });
    expect(JSON.stringify(state)).toBe(before);
  });

  it.each<[MissionId, RoadmapVersion, boolean]>([
    ['pattern', '2.0.0', true], ['pattern', '1.0.0', false], ['system', '2.0.0', false],
  ])('links %s v%s actions to their canonical checkpoint when represented, otherwise the mission', (missionId, version, represented) => {
    let state = saveEvidence(createInitialState(false, version), missionId, false);
    const action = dailyAction(state, {
      missionId, checkpointId: state.missions[missionId].checkpointId, roadmapVersion: version, completed: true,
    });
    if (version === '1.0.0') delete action.roadmapVersion;
    state.plans[action.date] = [action];
    state = upgradeRoadmap(state, missionId);
    const graph = buildCareerGraph(state);
    const saved = node(graph, `action:${action.id}`);
    expect(saved).toMatchObject({ kind: 'action', status: 'complete', roadmapVersion: version });
    expect(saved.detail).toContain(`roadmap v${version}`);
    expect(graph.edges).toContainEqual(expect.objectContaining({
      source: represented ? checkpointId(missionId, action.checkpointId, version) : `mission:${missionId}`,
      target: saved.id, kind: 'contains',
    }));
    expect(graph.stats).toMatchObject({ trackedCompleted: 0, archivedCompleted: 0, pastWorkRecords: 0 });
  });

  it('keeps completed action identity and geometry across day rollover without reviving unfinished plans', () => {
    const state = createInitialState(false);
    state.plans[localDate()] = [
      dailyAction(state, { id: 'done-action', completed: true }),
      dailyAction(state, { id: 'unfinished-action' }),
    ];
    const before = buildCareerGraph(state);
    vi.setSystemTime(new Date(Date.now() + 86_400_000));
    const after = buildCareerGraph(state);
    expect(node(after, 'action:done-action')).toMatchObject({
      kind: 'action', status: 'complete', href: '#/history', position: node(before, 'action:done-action').position,
    });
    expect(after.nodes.some(item => item.id === 'action:unfinished-action')).toBe(false);
    expect(after.stats).toEqual(before.stats);
  });

  it('retains more than ten thousand completed action records without silent truncation', () => {
    let state = createInitialState(false);
    const planMissions = ['pattern', 'system', 'escape'] as const;
    for (const missionId of planMissions) state = saveEvidence(state, missionId, false);
    const days = 3500;
    for (let index = 0; index < days; index += 1) {
      const date = localDate(new Date(Date.now() - index * 86_400_000));
      state.plans[date] = planMissions.map(missionId => dailyAction(state, {
        id: `past-${index}-${missionId}`, date, missionId, completed: true,
        checkpointId: state.missions[missionId].checkpointId, roadmapVersion: state.missions[missionId].roadmapVersion,
      }));
    }
    const graph = buildCareerGraph(state);
    const actions = graph.nodes.filter(item => item.kind === 'action');
    const ids = new Set(graph.nodes.map(item => item.id));
    expect(actions).toHaveLength(days * planMissions.length);
    expect(actions.length).toBeGreaterThan(10_000);
    expect(graph.orbits.find(orbit => orbit.kind === 'action')?.memberIds).toEqual(actions.map(item => item.id));
    expect(actions.every(item => item.status === 'complete' && item.position.every(Number.isFinite))).toBe(true);
    expect(ids.size).toBe(graph.nodes.length);
    expect(graph.edges.every(edge => ids.has(edge.source) && ids.has(edge.target))).toBe(true);
    expect(graph.stats).toMatchObject({ trackedCompleted: 0, archivedCompleted: 0, pastWorkRecords: 0 });
  });
});

describe('Career OS graph: stable true 3D and trustworthy connections', () => {
  it('places finite, genuinely three-dimensional mission clusters inside bounded world space', () => {
    const state = saveEvidence(createInitialState(false));
    state.personalProof = [proof()];
    const graph = buildCareerGraph(state);
    for (const item of graph.nodes) {
      expect(item.position.every(Number.isFinite)).toBe(true);
      expect(Math.hypot(...item.position)).toBeLessThan(120);
      if (item.kind === 'mission') {
        expect(Math.hypot(...item.position)).toBeGreaterThanOrEqual(45);
        expect(Math.hypot(...item.position)).toBeLessThanOrEqual(65);
      } else if (item.missionId) {
        const hub = node(graph, `mission:${item.missionId}`).position;
        const distance = Math.hypot(...item.position.map((value, index) => value - hub[index]));
        expect(distance).toBeGreaterThanOrEqual(15 - 1e-9);
        expect(distance).toBeLessThanOrEqual(24 + 1e-9);
      }
    }
    const depth = graph.nodes.map(item => item.position[2]);
    expect(Math.max(...depth) - Math.min(...depth)).toBeGreaterThan(70);
    expect(depth.filter(z => Math.abs(z) > 5).length).toBeGreaterThan(graph.nodes.length / 2);
    const [a, b, c] = graph.nodes.filter(item => item.kind === 'mission').map(item => item.position);
    const determinant = a[0] * (b[1] * c[2] - b[2] * c[1])
      - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0]);
    expect(Math.abs(determinant)).toBeGreaterThan(1000);
  });

  it('keeps every existing coordinate fixed through completion, modes, blockers, new records and time changes', () => {
    const initial = createInitialState(false);
    const before = buildCareerGraph(initial);
    let state = saveEvidence(initial);
    state.missions.pattern.mode = 'background';
    state.missions.pattern.blocker = 'Synthetic blocker';
    state.focusMissionId = 'system';
    state.personalProof = [proof()];
    const after = buildCareerGraph(state);
    for (const item of before.nodes) expect(node(after, item.id).position).toEqual(item.position);
    vi.setSystemTime(new Date('2035-01-01T12:00:00Z'));
    const future = buildCareerGraph(state);
    const withoutActivity = (graph: CareerGraph) => ({
      ...graph, orbits: graph.orbits.map(({ activity: _activity, ...orbit }) => orbit),
    });
    expect(withoutActivity(future)).toEqual(withoutActivity(after));
    expect(future.orbits.find(orbit => orbit.missionId === 'pattern')?.activity).toMatchObject({
      asOfDate: '2035-01-01', workedToday: false, streak: 0,
    });
    state = { ...state, evidence: [...state.evidence].reverse(), personalProof: [proof('new-proof'), ...state.personalProof] };
    const extended = buildCareerGraph(state);
    for (const item of after.nodes) expect(node(extended, item.id).position).toEqual(item.position);
  });

  it('uses only actual checkpoint prerequisites and deduplicated soft mission relationships', () => {
    const state = createInitialState(false);
    const graph = buildCareerGraph(state);
    const expectedRelationships = new Set<string>();
    for (const mission of getMissions(state)) {
      for (const related of mission.dependencies) expectedRelationships.add([mission.id, related].sort().join(':'));
      for (const checkpoint of mission.checkpoints) {
        const id = checkpointId(mission.id, checkpoint.id, mission.roadmapVersion);
        const incoming = graph.edges.filter(edge => edge.kind === 'prerequisite' && edge.target === id).map(edge => edge.source).sort();
        expect(incoming).toEqual(prerequisitesFor(mission, checkpoint).map(required =>
          checkpointId(mission.id, required, mission.roadmapVersion)).sort());
      }
    }
    const related = graph.edges.filter(edge => edge.kind === 'related');
    expect(new Set(related.map(edge => [node(graph, edge.source).missionId, node(graph, edge.target).missionId].sort().join(':'))))
      .toEqual(expectedRelationships);
    expect(related).toHaveLength(expectedRelationships.size);
    expect(graph.edges.filter(edge => edge.kind === 'prerequisite').every(edge =>
      node(graph, edge.source).kind === 'checkpoint' && node(graph, edge.target).kind === 'checkpoint')).toBe(true);
  });

  it('keeps all edge endpoints valid across simultaneous archive, curriculum and record layers', () => {
    let state = saveEvidence(createInitialState(false, '1.0.0'), 'system');
    state = upgradeRoadmap(state, 'system');
    state.personalProof = [proof()];
    const graph = buildCareerGraph(state);
    const ids = new Set(graph.nodes.map(item => item.id));
    expect(new Set(graph.edges.map(edge => edge.id)).size).toBe(graph.edges.length);
    for (const edge of graph.edges) {
      expect(ids.has(edge.source)).toBe(true);
      expect(ids.has(edge.target)).toBe(true);
      expect(edge.source).not.toBe(edge.target);
    }
    for (const item of graph.nodes.filter(item => item.kind !== 'core')) {
      expect(graph.edges.some(edge => edge.source === item.id || edge.target === item.id)).toBe(true);
    }
  });

  it('separates current checkpoint stats, additional archive completions and personal-history record counts', () => {
    let state = saveEvidence(saveEvidence(createInitialState(false, '2.0.0')));
    state = saveEvidence(state, 'system');
    state = upgradeRoadmap(upgradeRoadmap(state, 'pattern'), 'system');
    state.personalProof = [proof(), proof('another-proof')];
    state.opportunities = [{
      id: 'synthetic-accepted', company: 'Synthetic company', role: 'Synthetic role', stage: 'Accepted',
      url: '', notes: '', createdAt: state.updatedAt,
    }];
    const graph = buildCareerGraph(state);
    expect(graph.stats).toEqual({
      trackedTotal: getMissions(state).reduce((sum, mission) => sum + mission.checkpoints.length, 0),
      trackedCompleted: 2, archivedCompleted: 1, pastWorkRecords: 2,
    });
    expect(graph.nodes.filter(item => item.status === 'complete')).toHaveLength(6);
    expect(checkpoints(graph).filter(item => item.status === 'complete' && !item.archived)).toHaveLength(2);
    expect(checkpoints(graph).filter(item => item.archived)).toHaveLength(1);
  });

  it('does not mutate state or leak mutable coordinates between builds', () => {
    let state = saveEvidence(createInitialState(false, '2.0.0'), 'system');
    state = upgradeRoadmap(state, 'system');
    state.personalProof = [proof()];
    const before = JSON.stringify(state);
    freeze(state);
    const graph = buildCareerGraph(state);
    const originalUpdates = [...graph.updates];
    expect(JSON.stringify(state)).toBe(before);
    graph.nodes[0].position[0] = 900;
    graph.updates.push('income');
    graph.stats.trackedCompleted = 900;
    const rebuilt = buildCareerGraph(state);
    expect(rebuilt.nodes[0].position).toEqual([0, 0, 0]);
    expect(rebuilt.updates).toEqual(originalUpdates);
    expect(rebuilt.stats.trackedCompleted).toBe(0);
    expect(JSON.stringify(state)).toBe(before);
  });
});
