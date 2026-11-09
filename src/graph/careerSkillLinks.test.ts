import { describe, expect, it } from 'vitest';
import { checkpointIdentity, getCheckpoint, getMissionVersion } from '../domain/catalog';
import { createInitialState, recordEvidence, upgradeRoadmap } from '../domain/engine';
import { missionIds } from '../domain/types';
import { buildCareerGraph } from './careerGraphModel';
import { careerSkillLinks } from './careerSkillLinks';
import type { CareerSkillAnchor } from './careerSkillLinks';

const nodeId = (anchor: CareerSkillAnchor) =>
  `checkpoint:${checkpointIdentity(anchor.missionId, anchor.checkpointId, anchor.roadmapVersion)}`;
const shared = (state = createInitialState(false)) =>
  buildCareerGraph(state).edges.filter(edge => edge.kind === 'shared-skill');

describe('Curated career skill connections', () => {
  it('resolves every explicit anchor to a cited v3 checkpoint, never a title guess or private record', () => {
    expect(careerSkillLinks.length).toBeGreaterThan(0);
    expect(new Set(careerSkillLinks.map(link => link.id)).size).toBe(careerSkillLinks.length);
    for (const link of careerSkillLinks) {
      expect(link.source.missionId).not.toBe(link.target.missionId);
      expect(link.concept.trim().length).toBeGreaterThan(0);
      expect(link.reason.trim().length).toBeGreaterThan(30);
      for (const anchor of [link.source, link.target]) {
        expect(anchor.roadmapVersion).toBe('3.0.0');
        const checkpoint = getCheckpoint(anchor.missionId, anchor.checkpointId, anchor.roadmapVersion);
        expect(checkpoint.source?.document).toBeTruthy();
        expect(checkpoint.source?.section).toBeTruthy();
        if (anchor.missionId === 'fde') {
          expect(checkpoint.source?.page).toBeUndefined();
          expect(checkpoint.source?.url).toMatch(/^https:\/\//);
        } else expect(checkpoint.source?.page).toBeGreaterThan(0);
        expect(getMissionVersion(anchor.missionId, anchor.roadmapVersion).checkpoints).toContain(checkpoint);
      }
    }
  });

  it('creates one undirected edge per declared pair and preserves every reason and both source citations', () => {
    const edges = shared();
    const pairs = new Set(careerSkillLinks.map(link => JSON.stringify([nodeId(link.source), nodeId(link.target)].sort())));
    expect(edges).toHaveLength(pairs.size);
    expect(new Set(edges.map(edge => edge.id)).size).toBe(edges.length);
    expect(edges.flatMap(edge => edge.reasons.map(reason => reason.id)).sort())
      .toEqual(careerSkillLinks.map(link => link.id).sort());
    for (const link of careerSkillLinks) {
      const endpoints = [nodeId(link.source), nodeId(link.target)].sort();
      const edge = edges.find(candidate => candidate.source === endpoints[0] && candidate.target === endpoints[1]);
      expect(edge).toBeDefined();
      expect(edge!.reasons).toContainEqual({
        id: link.id, concept: link.concept, reason: link.reason,
        sources: [link.source, link.target].map(anchor => ({
          nodeId: nodeId(anchor),
          reference: getCheckpoint(anchor.missionId, anchor.checkpointId, anchor.roadmapVersion).source,
        })),
      });
    }
  });

  it.each(['1.0.0', '2.0.0'] as const)('keeps %s saved definitions out of new-version relationships', version => {
    const state = createInitialState(false, version);
    const graph = buildCareerGraph(state);
    const nodes = new Map(graph.nodes.map(node => [node.id, node]));
    for (const edge of graph.edges.filter(edge => edge.kind === 'shared-skill')) {
      for (const id of [edge.source, edge.target]) {
        const node = nodes.get(id)!;
        expect(node).toMatchObject(node.missionId === 'fde'
          ? { kind: 'checkpoint', status: 'incomplete', roadmapVersion: '3.0.0', archived: false }
          : { kind: 'curriculum', status: 'reference', roadmapVersion: '3.0.0', archived: false });
      }
    }
    expect(graph.stats.trackedCompleted).toBe(0);
    expect(state.missions.system.roadmapVersion).toBe(version);
  });

  it('preserves link identities on adoption without transferring old completions or linking archives', () => {
    let state = createInitialState(false, '2.0.0');
    state = recordEvidence(state, {
      missionId: 'system', checkpointId: state.missions.system.checkpointId,
      title: 'Synthetic design exercise', summary: 'A test-only completed design exercise with explicitly confirmed criteria.',
      kind: 'exercise', url: '', advance: true, criteriaConfirmed: true,
    });
    const before = shared(state);
    for (const missionId of missionIds.filter(id => id !== 'fde')) state = upgradeRoadmap(state, missionId);
    const graph = buildCareerGraph(state);
    expect(shared(state)).toEqual(before);
    const archived = new Set(graph.nodes.filter(node => node.archived).map(node => node.id));
    expect(archived.size).toBeGreaterThan(0);
    expect(shared(state).every(edge => !archived.has(edge.source) && !archived.has(edge.target))).toBe(true);
    expect(graph.stats).toMatchObject({ trackedCompleted: 0, archivedCompleted: 1 });
  });

  it('never derives connections from personal prose, alters stored data or repositions existing nodes', () => {
    const state = createInitialState(false);
    const before = buildCareerGraph(state);
    state.personalProof = [{
      id: 'synthetic-overlap', title: 'Synthetic curriculum keyword overlap',
      detail: careerSkillLinks.map(link => link.concept).join(', '), source: 'Synthetic test fixture', url: '',
    }];
    const raw = JSON.stringify(state);
    const after = buildCareerGraph(state);
    expect(JSON.stringify(state)).toBe(raw);
    expect(after.edges.filter(edge => edge.kind === 'shared-skill')).toEqual(before.edges.filter(edge => edge.kind === 'shared-skill'));
    expect(after.stats.trackedCompleted).toBe(0);
    const nodes = new Map(after.nodes.map(node => [node.id, node]));
    for (const node of before.nodes) expect(nodes.get(node.id)).toEqual(node);
    expect(buildCareerGraph(state)).toEqual(after);
  });
});
