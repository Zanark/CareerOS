import { describe, expect, it } from 'vitest';
import { createInitialState } from '../engine';
import { createAcademicStarter, initializeAcademicStarter } from './starter';
import { createPracticeState } from '../../usePracticeWorkspace';
import { getDiscoverySnapshot } from '../../discovery/model';
import { createDiscoveryPracticeState } from '../../discovery/practice';

describe('public academic starter without invented learning', () => {
  it('initializes academic data while leaving every learning/evidence/activity source unstarted', () => {
    const state = createInitialState(false);
    expect(state.omscsPlan).toEqual(createAcademicStarter());
    expect(state.evidence).toEqual([]);
    expect(state.events).toEqual([]);
    expect(state.recalls).toEqual([]);
    expect(Object.values(state.missions).every(row => row.completedCheckpointIds.length === 0)).toBe(true);
    expect(getDiscoverySnapshot(state).earned).toBe(0);
  });

  it('fills only an absent profile and preserves explicit empty/custom records and existing career data', () => {
    const original = createInitialState(false);
    const { omscsPlan, ...legacy } = original;
    const next = initializeAcademicStarter(legacy);
    expect(next.omscsPlan).toEqual(omscsPlan);
    for (const key of ['missions', 'evidence', 'events', 'plans', 'recalls', 'opportunities'] as const) expect(next[key]).toBe(legacy[key]);
    const explicit = { ...original, omscsPlan: { ...omscsPlan!, startTerm: '2028-fall' as const, courses: [] } };
    expect(initializeAcademicStarter(explicit)).toBe(explicit);
    expect(initializeAcademicStarter(createInitialState(true)).omscsPlan).toBeUndefined();
  });

  it('keeps starter copies independent and practice without academic history or an already-saved proposal', () => {
    const first = createAcademicStarter();
    first.courses[0].grade = 'F';
    expect(createAcademicStarter().courses[0].grade).not.toBe('F');
    expect(createPracticeState().omscsPlan).toBeUndefined();
    expect(createDiscoveryPracticeState().omscsPlan).toBeUndefined();
  });
});
