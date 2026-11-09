import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createInitialState, localDate, recordEvidence } from '../domain/engine';
import { missionIds } from '../domain/types';
import type { AppState, DailyAction, RoadmapVersion } from '../domain/types';
import { buildCareerGraph } from './careerGraphModel';
import type { CareerGraph } from './careerGraphModel';
import {
  createCareerVisibilityGroups, getCareerVisibilityItemIds, getCareerVisibilitySelection, getDefaultHiddenCareerRingIds, setCareerItemsVisible,
} from './careerVisibility';

const versions: RoadmapVersion[] = ['1.0.0', '2.0.0', '3.0.0'];

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-04T12:00:00Z'));
});
afterEach(() => vi.useRealTimers());

function action(state: AppState, id = 'synthetic-action'): DailyAction {
  return {
    id, date: localDate(), missionId: 'pattern', checkpointId: state.missions.pattern.checkpointId,
    roadmapVersion: state.missions.pattern.roadmapVersion, title: 'Synthetic visibility exercise',
    minutes: 15, reason: 'Synthetic saved action for a view-only test.', completed: false,
  };
}

function fixture(version: RoadmapVersion = '3.0.0'): AppState {
  const state = recordEvidence(createInitialState(false, version), {
    missionId: 'pattern', checkpointId: createInitialState(false, version).missions.pattern.checkpointId,
    title: 'Synthetic saved exercise', summary: 'A checked synthetic result and its explanation.',
    kind: 'exercise', url: '', advance: true, criteriaConfirmed: true,
  });
  state.evidence.push({
    id: 'synthetic-system-evidence', missionId: 'system', checkpointId: state.missions.system.checkpointId,
    roadmapVersion: version, title: 'Synthetic design note', summary: 'A fictional supporting reference.',
    kind: 'note', url: '', visibility: 'local', createdAt: state.updatedAt, completedCheckpoint: false,
  });
  state.missions.system.status = 'in-progress';
  state.plans[localDate()] = [action(state)];
  state.opportunities = [{
    id: 'synthetic-application', company: 'Example company', role: 'Example role', stage: 'Found',
    url: '', notes: 'Synthetic application record.', createdAt: state.updatedAt,
  }];
  state.freelanceOpportunities = [{
    id: 'synthetic-lead', title: 'Example lead', platform: 'Example platform', url: '', skills: '',
    budget: '', verdict: 'Unreviewed', notes: 'Synthetic research record.', createdAt: state.updatedAt,
  }];
  state.personalProof = [{
    id: 'synthetic-history', title: 'Example reviewed project', detail: 'A fictional historical record.',
    source: 'Synthetic test fixture', url: '',
  }];
  return state;
}

function freeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

function group(graph: CareerGraph, id: string) {
  const found = createCareerVisibilityGroups(graph).find(candidate => candidate.id === id);
  expect(found, `Expected visibility group ${id}`).toBeDefined();
  return found!;
}

describe('mission-only ring defaults', () => {
  it.each(versions)('defaults only saved active mission rings on in v%s without hiding records', version => {
    const graph = freeze(buildCareerGraph(fixture(version)));
    const before = JSON.stringify(graph);
    const hidden = getDefaultHiddenCareerRingIds(graph);
    expect(hidden.size).toBe(13);
    expect(graph.orbits.filter(orbit => !hidden.has(orbit.id)).map(orbit => orbit.missionId)).toEqual(['pattern', 'system', 'escape']);
    expect(graph.orbits.filter(orbit => orbit.kind !== 'mission').every(orbit => hidden.has(orbit.id))).toBe(true);
    expect(graph.nodes.every(node => !hidden.has(node.id))).toBe(true);
    expect(getCareerVisibilitySelection(getCareerVisibilityItemIds(graph), hidden)).toMatchObject({
      chosen: graph.nodes.length + 3, total: graph.nodes.length + 10,
    });
    expect(JSON.stringify(graph)).toBe(before);
    expect(getDefaultHiddenCareerRingIds(graph)).not.toBe(hidden);
  });

  it('reveals one inactive mission without activating it or allowing Select all to expose collections', () => {
    const graph = buildCareerGraph(fixture());
    const defaults = getDefaultHiddenCareerRingIds(graph);
    const shown = setCareerItemsVisible(defaults, ['orbit:mission:fabric'], true);
    expect(shown.size).toBe(12);
    expect(shown.has('orbit:mission:fabric')).toBe(false);
    expect(graph.orbits.find(orbit => orbit.missionId === 'fabric')?.missionMode).toBe('background');
    expect(defaults.size).toBe(13);
    expect(getDefaultHiddenCareerRingIds(graph)).toEqual(defaults);
    const all = setCareerItemsVisible(shown, getCareerVisibilityItemIds(graph), true);
    expect(all.size).toBe(6);
    expect(graph.orbits.filter(orbit => !all.has(orbit.id))).toHaveLength(10);
    expect(graph.orbits.filter(orbit => !all.has(orbit.id)).every(orbit => orbit.kind === 'mission')).toBe(true);
  });

  it('ignores the primary focus ID and reflects saved modes when defaults are rebuilt', () => {
    const state = fixture();
    state.focusMissionId = 'fabric';
    const original = getDefaultHiddenCareerRingIds(buildCareerGraph(state));
    expect(original.has('orbit:mission:fabric')).toBe(true);
    expect(original.has('orbit:mission:pattern')).toBe(false);
    state.missions.fabric.mode = 'active';
    state.missions.pattern.mode = 'background';
    const changed = getDefaultHiddenCareerRingIds(buildCareerGraph(state));
    expect(changed.has('orbit:mission:fabric')).toBe(false);
    expect(changed.has('orbit:mission:pattern')).toBe(true);
    expect(original.has('orbit:mission:fabric')).toBe(true);
  });
});

describe('Career visibility: complete source membership', () => {
  it.each(versions)('covers every real v%s node and ring, with unique universe IDs and deduplicated groups', version => {
    const graph = buildCareerGraph(fixture(version));
    const groups = createCareerVisibilityGroups(graph);
    const universe = getCareerVisibilityItemIds(graph);
    const sourceIds = [...graph.nodes.map(node => node.id), ...graph.orbits.filter(orbit => orbit.kind === 'mission').map(orbit => orbit.id)];
    expect(groups).toHaveLength(missionIds.length + 7);
    expect(groups.map(item => item.id)).toEqual([
      'core', ...missionIds.map(id => `mission:${id}`),
      'collection:action', 'collection:evidence', 'collection:opportunity', 'collection:freelance',
      'collection:history', 'collection:curriculum',
    ]);
    expect(universe).toHaveLength(sourceIds.length);
    expect(new Set(universe)).toEqual(new Set(sourceIds));
    expect(new Set(groups.flatMap(item => item.itemIds))).toEqual(new Set(universe));
    expect(group(graph, 'core')).toMatchObject({ label: 'CareerOS core', itemIds: ['core:careerhq'] });
    for (const item of groups) {
      expect(item.itemIds).toHaveLength(new Set(item.itemIds).size);
      expect(item.itemIds.every(id => universe.includes(id))).toBe(true);
      expect(getCareerVisibilitySelection(item.itemIds, new Set())).toEqual({
        chosen: item.itemIds.length, total: item.itemIds.length, checked: item.itemIds.length > 0, mixed: false,
      });
    }
    for (const orbit of graph.orbits) {
      const mission = orbit.kind === 'mission';
      const item = group(graph, mission ? `mission:${orbit.missionId}` : `collection:${orbit.kind}`);
      const matchingNodes = graph.nodes.filter(node => mission ? node.missionId === orbit.missionId : node.kind === orbit.kind);
      expect(item.label).toBe(orbit.label);
      expect(item.color).toBe(orbit.color);
      expect(new Set(item.itemIds)).toEqual(new Set([...(mission ? [orbit.id] : []), ...matchingNodes.map(node => node.id)]));
      for (const id of orbit.memberIds) expect(item.itemIds).toContain(id);
    }
    expect(groups.some(item => item.id === 'other')).toBe(false);
  });

  it('includes saved, archived, curriculum, current, evidence and action identities in the same mission choice', () => {
    const state = fixture('1.0.0');
    state.archives.push({ missionId: 'pattern', archivedAt: state.updatedAt, progress: state.missions.pattern });
    state.missions.pattern = createInitialState(false, '2.0.0').missions.pattern;
    const graph = buildCareerGraph(state);
    const pattern = group(graph, 'mission:pattern');
    const nodes = graph.nodes.filter(node => node.missionId === 'pattern');
    expect(nodes.some(node => node.archived && node.roadmapVersion === '1.0.0')).toBe(true);
    expect(nodes.some(node => node.current && node.roadmapVersion === '2.0.0')).toBe(true);
    expect(nodes.some(node => node.kind === 'curriculum' && node.roadmapVersion === '3.0.0')).toBe(true);
    expect(new Set(nodes.map(node => node.kind))).toEqual(new Set(['mission', 'checkpoint', 'curriculum', 'evidence', 'action']));
    expect(new Set(pattern.itemIds)).toEqual(new Set(['orbit:mission:pattern', ...nodes.map(node => node.id)]));
    expect(pattern.itemIds).toHaveLength(nodes.length + 1);
    for (const kind of ['evidence', 'action', 'curriculum'] as const) {
      const collection = group(graph, `collection:${kind}`);
      for (const node of nodes.filter(node => node.kind === kind)) expect(collection.itemIds).toContain(node.id);
    }
  });

  it('keeps empty record groups empty instead of inventing a selectable ring or a record count', () => {
    const graph = buildCareerGraph(createInitialState(false));
    for (const orbit of graph.orbits.filter(item => item.kind !== 'mission')) {
      expect(group(graph, `collection:${orbit.kind}`).itemIds).toEqual([]);
      expect(getCareerVisibilityItemIds(graph)).not.toContain(orbit.id);
      expect(getCareerVisibilitySelection([], new Set())).toEqual({ chosen: 0, total: 0, checked: false, mixed: false });
    }
  });

  it('uses real collection members and kinds, deduplicating source references without including missing nodes', () => {
    const graph = buildCareerGraph(fixture());
    const evidence = graph.orbits.find(orbit => orbit.kind === 'evidence')!;
    const realIds = graph.nodes.filter(node => node.kind === 'evidence').map(node => node.id);
    evidence.memberIds = [realIds[0], realIds[0], 'evidence:not-in-source'];
    graph.nodes.push(graph.nodes[0]);
    graph.orbits.push(evidence);
    const ids = getCareerVisibilityItemIds(graph);
    expect(ids).toHaveLength(new Set(ids).size);
    const groups = createCareerVisibilityGroups(graph);
    expect(groups).toHaveLength(missionIds.length + 7);
    expect(group(graph, 'collection:evidence').itemIds).toEqual(realIds);
    expect(groups.flatMap(item => item.itemIds)).not.toContain('evidence:not-in-source');
  });

  it('adds Other nodes only for genuinely ungrouped source items', () => {
    const graph = buildCareerGraph(createInitialState(false));
    expect(createCareerVisibilityGroups(graph).some(item => item.id === 'other')).toBe(false);
    const checkpoint = graph.nodes.find(node => node.kind === 'checkpoint')!;
    graph.nodes.push({ ...checkpoint, id: 'checkpoint:synthetic-unassigned', missionId: undefined });
    expect(group(graph, 'other')).toMatchObject({ label: 'Other nodes', itemIds: ['checkpoint:synthetic-unassigned'] });
    expect(new Set(createCareerVisibilityGroups(graph).flatMap(item => item.itemIds)))
      .toEqual(new Set(getCareerVisibilityItemIds(graph)));
  });

  it('does not manufacture groups or source items for an empty graph', () => {
    const graph = { ...buildCareerGraph(createInitialState(false)), nodes: [], orbits: [], edges: [] };
    expect(createCareerVisibilityGroups(graph)).toEqual([]);
    expect(getCareerVisibilityItemIds(graph)).toEqual([]);
  });

  it('never mutates frozen source state or graph, and group arrays do not alias source membership', () => {
    const state = freeze(fixture('2.0.0'));
    const stateBefore = JSON.stringify(state);
    const graph = freeze(buildCareerGraph(state));
    const graphBefore = JSON.stringify(graph);
    const groups = createCareerVisibilityGroups(graph);
    const ids = getCareerVisibilityItemIds(graph);
    groups.forEach(item => item.itemIds.reverse());
    ids.reverse();
    setCareerItemsVisible(new Set(), ids, false);
    expect(JSON.stringify(state)).toBe(stateBefore);
    expect(JSON.stringify(graph)).toBe(graphBefore);
  });

  it('retains more than 10,000 actual records in both mission and collection groups without truncation', () => {
    const state = createInitialState(false);
    state.plans[localDate()] = Array.from({ length: 10_500 }, (_, index) => action(state, `synthetic-action-${index}`));
    const graph = buildCareerGraph(state);
    const universe = getCareerVisibilityItemIds(graph);
    const actions = graph.nodes.filter(node => node.kind === 'action');
    const mission = group(graph, 'mission:pattern');
    const collection = group(graph, 'collection:action');
    expect(actions).toHaveLength(10_500);
    expect(collection.itemIds).toHaveLength(10_500);
    const missionIds = new Set(mission.itemIds);
    expect(actions.every(node => missionIds.has(node.id))).toBe(true);
    expect(universe).toHaveLength(graph.nodes.length + 10);
    expect(new Set(createCareerVisibilityGroups(graph).flatMap(item => item.itemIds))).toEqual(new Set(universe));
    const hidden = setCareerItemsVisible(new Set(), collection.itemIds, false);
    expect(getCareerVisibilitySelection(collection.itemIds, hidden)).toEqual({
      chosen: 0, total: 10_500, checked: false, mixed: false,
    });
    const restored = setCareerItemsVisible(hidden, universe, true);
    expect(restored.size).toBe(0);
    expect(getCareerVisibilitySelection(universe, restored).chosen).toBe(universe.length);
  });
});

describe('Career visibility: canonical view choices', () => {
  it('reports all, none and mixed native checkbox states with no completion inference', () => {
    const ids = Object.freeze(['node:first', 'node:second', 'orbit:one']);
    expect(getCareerVisibilitySelection(ids, new Set())).toEqual({ chosen: 3, total: 3, checked: true, mixed: false });
    expect(getCareerVisibilitySelection(ids, new Set(['node:second']))).toEqual({ chosen: 2, total: 3, checked: false, mixed: true });
    expect(getCareerVisibilitySelection(ids, new Set(ids))).toEqual({ chosen: 0, total: 3, checked: false, mixed: false });
    expect(getCareerVisibilitySelection([], new Set())).toEqual({ chosen: 0, total: 0, checked: false, mixed: false });
    expect(getCareerVisibilitySelection(['node:first', 'node:first'], new Set(['unrelated'])))
      .toEqual({ chosen: 1, total: 1, checked: true, mixed: false });
  });

  it('updates a new set without mutating frozen inputs, existing sets or unrelated choices', () => {
    const hidden = new Set(['node:old', 'node:shared']);
    const add = vi.spyOn(hidden, 'add');
    const remove = vi.spyOn(hidden, 'delete');
    const clear = vi.spyOn(hidden, 'clear');
    Object.freeze(hidden);
    const ids = Object.freeze(['node:shared', 'node:new', 'node:new']);
    const next = setCareerItemsVisible(hidden, ids, false);
    expect(next).not.toBe(hidden);
    expect([...next]).toEqual(['node:old', 'node:shared', 'node:new']);
    expect([...setCareerItemsVisible(hidden, ids, true)]).toEqual(['node:old']);
    expect([...hidden]).toEqual(['node:old', 'node:shared']);
    expect(ids).toEqual(['node:shared', 'node:new', 'node:new']);
    expect(add).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
    expect(clear).not.toHaveBeenCalled();
    expect(setCareerItemsVisible(hidden, [], true)).not.toBe(hidden);
  });

  it('reflects shared evidence in both groups and lets either group restore the same canonical item', () => {
    const graph = buildCareerGraph(fixture());
    const pattern = group(graph, 'mission:pattern');
    const evidence = group(graph, 'collection:evidence');
    const shared = graph.nodes.find(node => node.kind === 'evidence' && node.missionId === 'pattern')!.id;
    const initial = setCareerItemsVisible(new Set(), [shared], false);
    expect(getCareerVisibilitySelection(pattern.itemIds, initial)).toMatchObject({ chosen: pattern.itemIds.length - 1, mixed: true });
    expect(getCareerVisibilitySelection(evidence.itemIds, initial)).toMatchObject({ chosen: evidence.itemIds.length - 1, mixed: true });
    const missionHidden = setCareerItemsVisible(initial, pattern.itemIds, false);
    expect(getCareerVisibilitySelection(pattern.itemIds, missionHidden)).toMatchObject({ chosen: 0, checked: false, mixed: false });
    expect(getCareerVisibilitySelection(evidence.itemIds, missionHidden).mixed).toBe(true);
    const evidenceRestored = setCareerItemsVisible(missionHidden, evidence.itemIds, true);
    expect(evidenceRestored.has(shared)).toBe(false);
    expect(evidenceRestored.has('orbit:mission:pattern')).toBe(true);
    expect(getCareerVisibilitySelection(pattern.itemIds, evidenceRestored)).toMatchObject({ chosen: 1, checked: false, mixed: true });
    expect(getCareerVisibilitySelection(evidence.itemIds, evidenceRestored).checked).toBe(true);
    const restored = setCareerItemsVisible(evidenceRestored, pattern.itemIds, true);
    expect(getCareerVisibilitySelection(evidence.itemIds, restored).checked).toBe(true);
    expect(getCareerVisibilitySelection(pattern.itemIds, restored).checked).toBe(true);
    expect(restored.size).toBe(0);
  });

  it('allows hiding an individual ring independently of its hub, member nodes and other rings', () => {
    const graph = buildCareerGraph(fixture());
    const orbit = graph.orbits.find(item => item.missionId === 'pattern')!;
    const hiddenRing = setCareerItemsVisible(new Set(), [orbit.id], false);
    expect(hiddenRing.size).toBe(1);
    expect(hiddenRing.has(orbit.hubNodeId)).toBe(false);
    expect(orbit.memberIds.every(id => !hiddenRing.has(id))).toBe(true);
    const hiddenNode = setCareerItemsVisible(new Set(), [orbit.memberIds[0]], false);
    expect(hiddenNode.has(orbit.id)).toBe(false);
    expect(getCareerVisibilitySelection([orbit.id], hiddenNode).checked).toBe(true);
    expect(getCareerVisibilitySelection(group(graph, 'mission:pattern').itemIds, hiddenRing).mixed).toBe(true);
    expect(getCareerVisibilitySelection(group(graph, 'mission:pattern').itemIds, hiddenNode).mixed).toBe(true);
  });

  it('supports core-only hiding, all-hide, core-only restoration and full restoration without touching progress', () => {
    const state = freeze(fixture());
    const graph = freeze(buildCareerGraph(state));
    const before = JSON.stringify({ state, graph });
    const allIds = getCareerVisibilityItemIds(graph);
    const core = group(graph, 'core');
    const noCore = setCareerItemsVisible(new Set(), core.itemIds, false);
    expect([...noCore]).toEqual(['core:careerhq']);
    expect(getCareerVisibilitySelection(allIds, noCore).chosen).toBe(allIds.length - 1);
    const none = setCareerItemsVisible(noCore, allIds, false);
    expect(getCareerVisibilitySelection(allIds, none)).toEqual({ chosen: 0, total: allIds.length, checked: false, mixed: false });
    expect(graph.nodes.filter(node => !none.has(node.id))).toEqual([]);
    expect(graph.orbits.filter(orbit => orbit.kind === 'mission' && !none.has(orbit.id))).toEqual([]);
    const coreOnly = setCareerItemsVisible(none, core.itemIds, true);
    expect(getCareerVisibilitySelection(allIds, coreOnly).chosen).toBe(1);
    expect(graph.nodes.filter(node => !coreOnly.has(node.id)).map(node => node.id)).toEqual(['core:careerhq']);
    const restored = setCareerItemsVisible(coreOnly, allIds, true);
    expect(restored.size).toBe(0);
    expect(getCareerVisibilitySelection(allIds, restored).checked).toBe(true);
    expect(JSON.stringify({ state, graph })).toBe(before);
  });

  it('preserves choices across progress changes and defaults newly represented items to chosen', () => {
    const state = fixture();
    const before = buildCareerGraph(state);
    const checkpoint = before.nodes.find(node => node.current && node.missionId === 'pattern')!;
    const hidden = setCareerItemsVisible(new Set(), [checkpoint.id, 'orbit:mission:pattern'], false);
    const completed = recordEvidence(state, {
      missionId: 'pattern', checkpointId: state.missions.pattern.checkpointId,
      title: 'Another synthetic exercise', summary: 'Synthetic checked result with an explanation.',
      kind: 'exercise', url: '', advance: true, criteriaConfirmed: true,
    });
    const after = buildCareerGraph(completed);
    expect(after.nodes.find(node => node.id === checkpoint.id)?.status).toBe('complete');
    expect(hidden.has(checkpoint.id)).toBe(true);
    expect(hidden.has('orbit:mission:pattern')).toBe(true);
    const oldIds = new Set(getCareerVisibilityItemIds(before));
    const newIds = getCareerVisibilityItemIds(after).filter(id => !oldIds.has(id));
    expect(newIds).toHaveLength(1);
    expect(getCareerVisibilitySelection(newIds, hidden).checked).toBe(true);
  });
});
