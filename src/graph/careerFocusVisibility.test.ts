import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createInitialState, localDate, parseState, recordEvidence, upgradeRoadmap } from '../domain/engine';
import type { AppState } from '../domain/types';
import { buildCareerGraph } from './careerGraphModel';
import { focusCareerGraph, getCareerFocusVisibility } from './careerFocusVisibility';
import { getDefaultHiddenCareerRingIds } from './careerVisibility';

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 9, 7, 12)); });
afterEach(() => vi.useRealTimers());

function fabricRecord(state: AppState, advance: boolean): AppState {
  const prepared = structuredClone(state);
  prepared.missions.fabric.mode = 'active';
  const saved = recordEvidence(prepared, { missionId: 'fabric', checkpointId: prepared.missions.fabric.checkpointId,
    title: 'Synthetic background work', summary: 'Fictional criteria-checked practice for focus visibility.',
    kind: 'exercise', url: '', advance, criteriaConfirmed: advance });
  saved.missions.fabric.mode = 'background';
  return parseState(saved);
}

describe('focus-first graph details', () => {
  it('retains every mission hub but excludes inactive checkpoint clouds, records and every attached edge', () => {
    const state = createInitialState(false);
    state.personalProof = [{ id: 'outside-record', title: 'Synthetic past work', detail: 'A fictional record.', source: 'Test', url: '' }];
    const graph = buildCareerGraph(state);
    const source = JSON.stringify(graph), raw = JSON.stringify(state);
    const eligibility = getCareerFocusVisibility(state, localDate());
    expect([...eligibility.activeMissionIds]).toEqual(['pattern', 'system', 'escape']);
    const view = focusCareerGraph(graph, eligibility.detailedMissionIds);
    expect(view.nodes.filter(node => node.kind === 'mission')).toHaveLength(10);
    expect(view.nodes.filter(node => node.missionId === 'fabric').map(node => node.kind)).toEqual(['mission']);
    expect(view.nodes.some(node => node.kind === 'history')).toBe(false);
    const visibleIds = new Set(view.nodes.map(node => node.id));
    for (const edge of view.edges) {
      expect(visibleIds.has(edge.source) && visibleIds.has(edge.target)).toBe(true);
      expect(view.disconnectedNodeIds?.has(edge.source) || view.disconnectedNodeIds?.has(edge.target)).toBe(false);
    }
    expect(view.disconnectedNodeIds?.size).toBe(7);
    expect(view.stats).toBe(graph.stats);
    expect(JSON.stringify(graph)).toBe(source);
    expect(JSON.stringify(state)).toBe(raw);
  });

  it('reveals the complete background mission graph today after completion, without changing focus or granting credit', () => {
    const state = fabricRecord(createInitialState(false), true);
    const before = JSON.stringify(state);
    const graph = buildCareerGraph(state);
    const today = getCareerFocusVisibility(state, localDate());
    expect(today.completedTodayMissionIds.has('fabric')).toBe(true);
    const shown = focusCareerGraph(graph, today.detailedMissionIds);
    expect(shown.nodes.filter(node => node.missionId === 'fabric'))
      .toEqual(graph.nodes.filter(node => node.missionId === 'fabric'));
    expect(shown.edges.some(edge => edge.source === 'mission:fabric' || edge.target === 'mission:fabric')).toBe(true);
    expect(getDefaultHiddenCareerRingIds(graph, today.completedTodayMissionIds).has('orbit:mission:fabric')).toBe(false);
    vi.setSystemTime(new Date(2026, 9, 8, 0, 1));
    const tomorrow = getCareerFocusVisibility(state, localDate());
    const collapsed = focusCareerGraph(graph, tomorrow.detailedMissionIds);
    expect(collapsed.nodes.filter(node => node.missionId === 'fabric').map(node => node.kind)).toEqual(['mission']);
    expect(collapsed.edges.some(edge => edge.source === 'mission:fabric' || edge.target === 'mission:fabric')).toBe(false);
    expect(JSON.stringify(state)).toBe(before);
  });

  it('does not reveal an inactive mission for partial evidence, browsing, plans, or a recall outcome', () => {
    const state = fabricRecord(createInitialState(false), false);
    expect(getCareerFocusVisibility(state, localDate()).detailedMissionIds.has('fabric')).toBe(false);
    const withRecall = { ...state, recalls: [{ missionId: 'fabric', createdAt: new Date().toISOString(), outcome: 'independent' }] };
    expect(getCareerFocusVisibility(withRecall, localDate()).detailedMissionIds.has('fabric')).toBe(false);
    expect(state.missions.fabric.completedCheckpointIds).toEqual([]);
  });

  it('uses local calendar dates, excludes tomorrow, and counts same-day archived completion without remapping checkpoint credit', () => {
    let state = fabricRecord(createInitialState(false, '2.0.0'), true);
    state = upgradeRoadmap(state, 'fabric');
    expect(getCareerFocusVisibility(state, localDate()).completedTodayMissionIds.has('fabric')).toBe(true);
    const future = structuredClone(state);
    future.evidence[0].createdAt = new Date(2026, 9, 8, 0, 1).toISOString();
    expect(getCareerFocusVisibility(future, localDate()).completedTodayMissionIds.has('fabric')).toBe(false);
    const early = structuredClone(state);
    early.evidence[0].createdAt = new Date(2026, 9, 7, 0, 0, 1).toISOString();
    expect(getCareerFocusVisibility(early, localDate()).completedTodayMissionIds.has('fabric')).toBe(true);
    expect(state.missions.fabric.completedCheckpointIds).toEqual([]);
  });

  it('keeps active missions detailed after the one-day completion exception expires', () => {
    const state = fabricRecord(createInitialState(false), true);
    state.missions.fabric.mode = 'active';
    const focusBefore = state.focusMissionId;
    vi.setSystemTime(new Date(2026, 9, 9, 12));
    const eligible = getCareerFocusVisibility(state, localDate());
    expect(eligible.completedTodayMissionIds.has('fabric')).toBe(false);
    expect(eligible.detailedMissionIds.has('fabric')).toBe(true);
    expect(state.focusMissionId).toBe(focusBefore);
  });
});
