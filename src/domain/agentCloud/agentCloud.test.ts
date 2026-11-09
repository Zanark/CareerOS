import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as catalog from '../catalog';
import { checkpointIdentity, getLatestMission, getMissionVersion, isVerifiedAppend } from '../catalog';
import {
  countCompletedCheckpoints, createInitialState, generatePlan, localDate, parseState,
  previewRoadmapUpgrades, recordEvidence, upgradeAllRoadmaps, upgradeRoadmap,
} from '../engine';
import { buildCareerGraph } from '../../graph/careerGraphModel';
import { loadRoadmapPack, loadSourceRoadmapPack } from '../roadmapPacks/load';
import { getPackOutline, getSourcePackOutline, packCheckpointId, searchRoadmapPacks } from '../roadmapPacks/registry';
import type { AppState } from '../types';
import { agentCloudUnits } from './outline';
import { agentCloudSources } from './sources';
import { getDiscoverySnapshot } from '../../discovery/model';
import { appendWorkspace, createJournal, unlockJournal } from '../../repositorySync/journal';
import { journalText, parseJournal } from '../../repositorySync/journalFormat';

const previous = getMissionVersion('neural', '3.0.0');
const latest = getLatestMission('neural');

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-11-09T12:00:00Z'));
});
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

function oldTracker(completed = 0): AppState {
  let state = createInitialState(false);
  state.missions.neural = {
    roadmapVersion: '3.0.0', checkpointId: previous.checkpoints[0].id,
    completedCheckpointIds: [], status: 'not-started', mode: 'background', blocker: '',
  };
  for (let index = 0; index < completed; index++) state = complete(state);
  return parseState(state);
}

function complete(state: AppState): AppState {
  return recordEvidence(state, {
    missionId: 'neural', checkpointId: state.missions.neural.checkpointId,
    title: 'Synthetic architecture evidence', summary: 'An invented local architecture artifact with a changed-case failure and checked criteria.',
    kind: 'diagram', url: '', advance: true, criteriaConfirmed: true,
  });
}

describe('research-backed AI Architect append', () => {
  it('retains the complete frozen source and exact checkpoint/stage prefix', async () => {
    const base = await loadSourceRoadmapPack('neural');
    const before = JSON.stringify(base);
    const pack = await loadRoadmapPack('neural');
    expect(JSON.stringify(base)).toBe(before);
    expect(base.units).toHaveLength(72);
    expect(getSourcePackOutline('neural')?.units).toHaveLength(72);
    expect(pack.units.slice(0, 72)).toEqual(base.units);
    expect(previous.checkpoints).toHaveLength(28);
    expect(Object.isFrozen(previous)).toBe(true);
    expect(latest.checkpoints).toHaveLength(40);
    expect(latest.checkpoints.slice(0, 28)).toEqual(previous.checkpoints);
    previous.checkpoints.forEach((checkpoint, index) => expect(latest.checkpoints[index]).toBe(checkpoint));
    expect(latest.stages?.slice(0, previous.stages?.length)).toEqual(previous.stages);
    expect(isVerifiedAppend(latest, previous)).toBe(true);
    expect(isVerifiedAppend(latest, getMissionVersion('neural', '2.0.0'))).toBe(false);
    expect(pack.units).toHaveLength(88);
    expect(pack.units.reduce((count, unit) => count + unit.exercises.length, 0)).toBe(869);
    expect(getPackOutline('neural')?.sourceKind).toBe('mixed');
  });

  it('links every authored unit to reviewed web evidence, never fabricated PDF pages', async () => {
    const pack = await loadRoadmapPack('neural');
    const ids = new Set(agentCloudSources.map(source => source.id));
    const used = new Set<string>();
    for (const outline of agentCloudUnits) {
      const unit = pack.units.find(candidate => candidate.id === outline.id)!;
      expect(unit.pages).toEqual([]);
      expect(unit.exercises).toHaveLength(outline.exerciseCount);
      expect(unit.exercises.every(exercise => exercise.page === undefined)).toBe(true);
      expect(unit.sections).toHaveLength(4);
      expect(unit.sourceIds?.length).toBeGreaterThan(0);
      unit.sourceIds?.forEach(id => { expect(ids.has(id), id).toBe(true); used.add(id); });
      const checkpoint = latest.checkpoints.find(item => item.id === packCheckpointId('neural', unit.id));
      if (unit.role === 'checkpoint') {
        expect(checkpoint?.source?.url).toMatch(/^https:\/\//);
        expect(checkpoint?.source?.page).toBeUndefined();
        expect(checkpoint?.criteria).toEqual(unit.criteria);
      } else expect(checkpoint).toBeUndefined();
    }
    expect(used).toEqual(ids);
    expect(searchRoadmapPacks('agent identity').some(item => item.route.includes('neural-agent-authority'))).toBe(true);
  });

  it.each([0, 3, 28])('loads an old tracker with %i completions unchanged, then explicitly carries only real prefix work', completed => {
    let old = oldTracker(completed);
    old.missions.neural.blocker = 'Synthetic retained blocker';
    old.plans[localDate()] = generatePlan(old);
    const before = JSON.stringify(old);
    expect(JSON.stringify(parseState(JSON.parse(before)))).toBe(before);
    const next = upgradeRoadmap(old, 'neural');
    expect(JSON.stringify(old)).toBe(before);
    expect(next.missions.neural.completedCheckpointIds).toEqual(old.missions.neural.completedCheckpointIds);
    expect(next.missions.neural.blocker).toBe(old.missions.neural.blocker);
    expect(next.missions.neural.mode).toBe(old.missions.neural.mode);
    expect(next.focusMissionId).toBe(old.focusMissionId);
    expect(next.evidence).toEqual(old.evidence);
    expect(next.plans).toEqual(old.plans);
    expect(next.archives[0].progress).toEqual(old.missions.neural);
    expect(next.missions.neural.checkpointId).toBe(completed === 28 ? latest.checkpoints[28].id : old.missions.neural.checkpointId);
    expect(next.missions.neural.status).toBe(completed === 28 ? 'not-started' : old.missions.neural.status);
    expect(countCompletedCheckpoints(next)).toBe(completed);
    expect(buildCareerGraph(next).stats.trackedCompleted).toBe(completed);
    expect(parseState(JSON.parse(JSON.stringify(next)))).toEqual(next);
  });

  it('canonicalizes inherited identities but never credits new work into the old archive', () => {
    const old = oldTracker(2);
    let next = upgradeRoadmap(old, 'neural');
    for (const checkpoint of previous.checkpoints) {
      expect(checkpointIdentity('neural', checkpoint.id, '4.0.0'))
        .toBe(checkpointIdentity('neural', checkpoint.id, '3.0.0'));
    }
    next = complete(next);
    expect(next.evidence.at(-1)?.roadmapVersion).toBe('4.0.0');
    expect(next.archives[0].progress.completedCheckpointIds).toHaveLength(2);
    expect(countCompletedCheckpoints(next)).toBe(3);
    expect(() => catalog.getCheckpoint('neural', latest.checkpoints[28].id, '3.0.0')).toThrow('Unknown checkpoint');
  });

  it('fails closed if a declared append changes original criteria', () => {
    const old = oldTracker(2);
    const corrupt = structuredClone(latest);
    corrupt.checkpoints[0].criteria.push('An incompatible requirement.');
    vi.spyOn(catalog, 'getLatestMission').mockReturnValue(corrupt);
    expect(() => upgradeRoadmap(old, 'neural')).toThrow('does not preserve');
    expect(old.missions.neural.roadmapVersion).toBe('3.0.0');
  });

  it('supports confirmed bulk append and rejects unsupported v4 missions', () => {
    const old = oldTracker(2);
    const preview = previewRoadmapUpgrades(old);
    expect(preview.upgrades).toEqual([expect.objectContaining({ missionId: 'neural', preservesProgress: true })]);
    expect(upgradeAllRoadmaps(old, preview).missions.neural.completedCheckpointIds).toEqual(old.missions.neural.completedCheckpointIds);
    const invalid = structuredClone(old);
    invalid.missions.system.roadmapVersion = '4.0.0';
    expect(() => parseState(invalid)).toThrow();
    expect(createInitialState(false).missions.neural.roadmapVersion).toBe('4.0.0');
    expect(createInitialState(false).schemaVersion).toBe(2);
  });

  it('keeps Atlas receipts and old cross-mission connections stable without duplicate prefix nodes', () => {
    const old = oldTracker(3);
    const before = getDiscoverySnapshot(old);
    const graph = buildCareerGraph(old);
    expect(graph.nodes.filter(node => node.missionId === 'neural' && node.kind === 'curriculum')).toHaveLength(12);
    const next = upgradeRoadmap(old, 'neural');
    expect(getDiscoverySnapshot(next)).toEqual(before);
    expect(buildCareerGraph(next).edges.filter(edge => edge.kind === 'shared-skill'))
      .toEqual(graph.edges.filter(edge => edge.kind === 'shared-skill'));
    expect(buildCareerGraph(next).nodes.filter(node => node.missionId === 'neural' && node.kind === 'checkpoint')).toHaveLength(40);
  });

  it('replays a v3 encrypted baseline and appends v4 work without rewriting old ciphertext or records', async () => {
    const old = oldTracker(28);
    const created = await createJournal(old, 'Synthetic agent-cloud test phrase only');
    const original = journalText(created.journal.file);
    const next = complete(upgradeRoadmap(created.journal.state, 'neural'));
    const appended = await appendWorkspace(created.journal, next, created.key);
    const wire = journalText(appended.file);
    expect(wire.startsWith(original)).toBe(true);
    const reopened = await unlockJournal(parseJournal(wire)!, created.key);
    expect(reopened.state).toEqual(next);
    expect(next.evidence.slice(0, 28)).toEqual(old.evidence);
    expect(next.evidence.at(-1)?.roadmapVersion).toBe('4.0.0');
    expect(countCompletedCheckpoints(reopened.state)).toBe(29);
  });
});
