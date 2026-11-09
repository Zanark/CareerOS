import { describe, expect, it } from 'vitest';
import { getLatestMission, getMissionVersion, missions, prerequisitesFor, v2Missions } from '../catalog';
import { createInitialState, generatePlan, localDate, parseState, recordEvidence, recordRecall, upgradeRoadmap } from '../engine';
import { buildCareerGraph } from '../../graph/careerGraphModel';
import { loadRoadmapPack } from './load';
import { formatPackPages, getPackOutline, packCheckpointId, packUnitForCheckpoint, searchRoadmapPacks } from './registry';
import { packMissionIds } from './types';

const expected = {
  escape: { pages: 103, checkpoints: 34, units: 127, exercises: 633 },
  fabric: { pages: 112, checkpoints: 32, units: 92, exercises: 641 },
  blueprint: { pages: 168, checkpoints: 92, units: 150, exercises: 974 },
  credential: { pages: 156, checkpoints: 53, units: 132, exercises: 1091 },
  neural: { pages: 144, checkpoints: 28, units: 72, exercises: 809 },
  algorithm: { pages: 120, checkpoints: 34, units: 104, exercises: 740 },
  income: { pages: 162, checkpoints: 104, units: 129, exercises: 1056 },
};
const sourceBookIds = packMissionIds.filter(id => id !== 'fde');

describe('the complete seven-book roadmap pack', () => {
  it.each(sourceBookIds)('preserves every reviewed %s unit, exercise and physical-page citation', async id => {
    const pack = await loadRoadmapPack(id);
    const outline = getPackOutline(id)!;
    const mission = getLatestMission(id);
    expect(pack.pageCount).toBe(expected[id].pages);
    expect(pack.units).toHaveLength(expected[id].units);
    expect(pack.units.reduce((sum, unit) => sum + unit.exercises.length, 0)).toBe(expected[id].exercises);
    expect(outline.exerciseCount).toBe(expected[id].exercises);
    expect(mission.checkpoints).toHaveLength(expected[id].checkpoints);
    expect(mission.roadmapVersion).toBe('3.0.0');
    expect(mission.planned).toBe(false);
    expect(mission.appendFrom).toBeUndefined();
    expect(new Set(pack.units.map(unit => unit.id)).size).toBe(pack.units.length);
    for (const unit of pack.units) {
      expect(pack.phases.some(phase => phase.id === unit.phaseId), unit.id).toBe(true);
      expect(unit.pages.length).toBeGreaterThan(0);
      expect(unit.pages.every(page => Number.isInteger(page) && page >= 1 && page <= pack.pageCount)).toBe(true);
      expect(unit.exercises.every(exercise => exercise.page !== undefined && exercise.page >= 1 && exercise.page <= pack.pageCount)).toBe(true);
      const checkpoint = mission.checkpoints.find(candidate => candidate.id === packCheckpointId(id, unit.id));
      if (unit.role === 'checkpoint') {
        expect(checkpoint, unit.id).toBeDefined();
        expect(checkpoint?.source?.document).toBe(pack.document);
        expect(checkpoint?.source?.page).toBe(unit.pages[0]);
        expect(checkpoint?.criteria).toEqual(unit.criteria);
        expect(checkpoint?.topics).toEqual(unit.concepts);
        expect(packUnitForCheckpoint(id, checkpoint)?.id).toBe(unit.id);
      } else {
        expect(checkpoint, unit.id).toBeUndefined();
      }
    }
    for (const checkpoint of mission.checkpoints) {
      for (const predecessor of prerequisitesFor(mission, checkpoint)) {
        expect(mission.checkpoints.some(candidate => candidate.id === predecessor)).toBe(true);
      }
    }
  });

  it('keeps credential study distinct from optional exam spending and supplementary practice', async () => {
    const neural = await loadRoadmapPack('neural');
    const neuralCredentialModules = neural.units.filter(unit => /^6\.[1-3]$/.test(unit.sourceId));
    expect(neuralCredentialModules).toHaveLength(3);
    expect(neuralCredentialModules.every(unit => unit.role === 'checkpoint')).toBe(true);
    const credential = await loadRoadmapPack('credential');
    const dataModules = credential.units.filter(unit => /^6\.[1-6]$/.test(unit.sourceId));
    const awsModules = credential.units.filter(unit => /^7\.[1-6]$/.test(unit.sourceId));
    expect(dataModules).toHaveLength(6);
    expect(dataModules.every(unit => unit.role !== 'checkpoint')).toBe(true);
    expect(awsModules).toHaveLength(6);
    expect(awsModules.every(unit => unit.role === 'checkpoint')).toBe(true);
    const blueprint = await loadRoadmapPack('blueprint');
    const extensions = blueprint.units.filter(unit => ['blueprint-ai', 'blueprint-sf'].includes(unit.phaseId));
    expect(extensions).toHaveLength(16);
    expect(extensions.every(unit => unit.role !== 'checkpoint')).toBe(true);
  });

  it('retains the frozen nine-mission catalog while adding Fieldcraft only to the latest curriculum', () => {
    expect(v2Missions.reduce((sum, mission) => sum + mission.checkpoints.length, 0)).toBe(87);
    expect(getMissionVersion('algorithm', '2.0.0').planned).toBe(true);
    expect(missions.filter(mission => mission.id !== 'fde').reduce((sum, mission) => sum + mission.checkpoints.length, 0)).toBe(497);
    expect(missions.reduce((sum, mission) => sum + mission.checkpoints.length, 0)).toBe(545);
    const state = createInitialState(false);
    expect(parseState(state)).toEqual(state);
    expect(state.schemaVersion).toBe(2);
    expect(state.roadmapVersion).toBe('2.0.0');
    for (const progress of Object.values(state.missions)) {
      expect(progress.roadmapVersion).toBe('3.0.0');
      expect(progress.completedCheckpointIds).toEqual([]);
      expect(progress.status).toBe('not-started');
    }
    expect(buildCareerGraph(state).stats).toMatchObject({ trackedTotal: 545, trackedCompleted: 0 });
  });

  it.each(sourceBookIds)('archives %s v2 without changing recorded work or inventing v3 credit', id => {
    let state = createInitialState(false, '2.0.0');
    const recallCheckpoint = state.missions.pattern.checkpointId;
    state = recordEvidence(state, {
      missionId: 'pattern', checkpointId: recallCheckpoint, title: 'Synthetic recall preparation',
      summary: 'A fictional existing practice observation that must survive another mission upgrade.',
      kind: 'exercise', url: '', advance: false, criteriaConfirmed: false,
    });
    state = recordRecall(state, {
      missionId: 'pattern', roadmapVersion: '2.0.0', checkpointId: recallCheckpoint, outcome: 'partial',
      checks: { explanation: true, diagram: false, exercise: false }, notes: 'Synthetic recall observation.',
    });
    const old = getMissionVersion(id, '2.0.0');
    if (!old.planned) {
      state.missions[id].mode = 'active';
      state.focusMissionId = id;
      state.plans[localDate()] = generatePlan(state);
      const checkpointId = state.missions[id].checkpointId;
      state = recordEvidence(state, {
        missionId: id, checkpointId, title: 'Synthetic previous-edition exercise',
        summary: 'A fictional test artifact with explicit source criteria and an independently recorded attempt.',
        kind: 'exercise', url: '', advance: true, criteriaConfirmed: true,
      });
    }
    const before = JSON.stringify(state);
    const next = upgradeRoadmap(state, id);
    expect(JSON.stringify(state)).toBe(before);
    expect(parseState(next)).toEqual(next);
    expect(next.archives.find(archive => archive.missionId === id)?.progress).toEqual(state.missions[id]);
    expect(next.evidence).toEqual(state.evidence);
    expect(next.recalls).toEqual(state.recalls);
    expect(next.plans).toEqual(state.plans);
    expect(next.missions[id].roadmapVersion).toBe('3.0.0');
    expect(next.missions[id].checkpointId).toBe(getLatestMission(id).checkpoints[0].id);
    expect(next.missions[id].completedCheckpointIds).toEqual([]);
    expect(next.missions[id].status).toBe('not-started');
  });

  it('makes every new curriculum visible as references before explicit adoption', () => {
    const state = createInitialState(false, '2.0.0');
    const before = JSON.stringify(state);
    const graph = buildCareerGraph(state);
    for (const id of sourceBookIds) {
      const nodes = graph.nodes.filter(node => node.missionId === id && node.kind === 'curriculum');
      expect(nodes).toHaveLength(expected[id].checkpoints);
      expect(nodes.every(node => node.status === 'reference' && !node.current)).toBe(true);
    }
    expect(graph.stats.trackedTotal).toBe(87 + getLatestMission('fde').checkpoints.length);
    expect(JSON.stringify(state)).toBe(before);
  });

  it('supports source-aware lookup and honest non-contiguous page ranges', () => {
    expect(formatPackPages([7, 2, 3, 4, 7, 9])).toBe('2-4, 7, 9');
    expect(formatPackPages([])).toBe('');
    expect(searchRoadmapPacks('')).toEqual([]);
    const result = searchRoadmapPacks('Replica lifecycle');
    expect(result.some(entry => entry.route.startsWith('practice/'))).toBe(true);
    expect(packUnitForCheckpoint('fabric', getMissionVersion('fabric', '2.0.0').checkpoints[0])).toBeUndefined();
  });
});
