import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createInitialState, generatePlan, parseState } from '../domain/engine';
import { buildCareerGraph } from './careerGraphModel';
import { opportunityStages } from '../domain/types';

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 9, 7, 12)); });
afterEach(() => vi.useRealTimers());

describe('complete graph record coverage', () => {
  it('includes unfinished historical and future saved actions only in the explicit all-record view', () => {
    const state = createInitialState(false);
    for (const date of ['2026-10-05', '2026-10-07', '2026-10-09']) state.plans[date] = generatePlan(state, date);
    const before = JSON.stringify(state);
    const normal = buildCareerGraph(state);
    const full = buildCareerGraph(state, { includeAllRecords: true });
    const allActions = Object.values(state.plans).flat();
    expect(normal.nodes.filter(node => node.kind === 'action')).toHaveLength(state.plans['2026-10-07'].length);
    expect(full.nodes.filter(node => node.kind === 'action')).toHaveLength(allActions.length);
    expect(full.nodes.filter(node => node.context.includes('past unfinished plan'))).toHaveLength(state.plans['2026-10-05'].length);
    expect(full.nodes.filter(node => node.context.includes('future saved plan'))).toHaveLength(state.plans['2026-10-09'].length);
    expect(full.nodes.filter(node => node.kind === 'action').every(node => node.status === 'incomplete')).toBe(true);
    expect(full.stats).toEqual(normal.stats);
    expect(full.orbits.find(orbit => orbit.kind === 'action')?.memberIds).toHaveLength(allActions.length);
    expect(JSON.stringify(state)).toBe(before);
    expect(parseState(state)).toEqual(state);
    expect(buildCareerGraph(state)).toEqual(normal);
  });

  it('keeps every evidence, pipeline stage, lead verdict and historical record without changing checkpoint credit', () => {
    const state = createInitialState(false);
    state.opportunities = opportunityStages.map((stage, index) => ({
      id: `full-application-${index}`, company: 'Fictional company', role: 'Fictional role', stage,
      notes: '', url: '', createdAt: state.updatedAt,
    }));
    state.freelanceOpportunities = [{ id: 'ignored-full-lead', title: 'Fictional ignored lead', platform: 'Test',
      skills: '', budget: '', verdict: 'Ignore', notes: '', url: '', createdAt: state.updatedAt }];
    state.personalProof = [{ id: 'full-past-work', title: 'Fictional past work', detail: 'Test-only record.', source: 'Fixture', url: '' }];
    const full = buildCareerGraph(parseState(state), { includeAllRecords: true });
    expect(full.nodes.filter(node => node.kind === 'opportunity')).toHaveLength(opportunityStages.length);
    expect(full.nodes.filter(node => node.kind === 'freelance')).toHaveLength(1);
    expect(full.nodes.filter(node => node.kind === 'history')).toHaveLength(1);
    expect(full.stats.trackedCompleted).toBe(0);
    expect(full.orbits.filter(orbit => orbit.kind === 'mission')).toHaveLength(10);
  });
});
