import { describe, expect, it } from 'vitest';
import { createInitialState, localDate } from '../domain/engine';
import type { Evidence, PersonalProof } from '../domain/types';
import { getJournalEntries, groupJournalEntries } from './journal';

const checkpointId = createInitialState(false, '1.0.0').missions.pattern.checkpointId;
function work(id: string, createdAt: string, completedCheckpoint = false): Evidence {
  return {
    id, createdAt, completedCheckpoint, missionId: 'pattern', checkpointId,
    title: `Fictional ${id}`, summary: 'A synthetic account of a piece of work.',
    kind: 'note', url: '', visibility: 'local', roadmapVersion: '1.0.0',
  };
}
function memory(id: string, date?: string): PersonalProof {
  return {
    id, ...(date ? { date } : {}), title: `Fictional ${id}`,
    detail: 'A synthetic past accomplishment, not a future goal.', source: 'Test fixture', url: '',
  };
}

describe('Keep Going journal', () => {
  it('merges by descending date rather than completion, without sorting or changing saved arrays', () => {
    const state = {
      personalProof: [memory('undated'), memory('recent', '2026-04-20')],
      evidence: [work('old-completion', '2026-04-10T12:00:00Z', true), work('new-practice', '2026-04-15T12:00:00Z')],
    };
    const before = structuredClone(state);
    Object.freeze(state.personalProof); Object.freeze(state.evidence);
    expect(getJournalEntries(state).map(entry => entry.key)).toEqual([
      'personal:recent', 'evidence:new-practice', 'evidence:old-completion', 'personal:undated',
    ]);
    expect(state).toEqual(before);
  });

  it('keeps same-day times descending, preserves untimed ties and namespaces cross-source IDs', () => {
    const date = localDate(new Date('2026-04-15T12:00:00Z'));
    const state = {
      personalProof: [memory('shared', date), memory('next', date), memory('unknown-1'), memory('unknown-2')],
      evidence: [work('shared', '2026-04-15T12:00:00Z'), work('later', '2026-04-15T12:00:01Z'), work('tie', '2026-04-15T12:00:00Z')],
    };
    const entries = getJournalEntries(state);
    expect(entries.map(entry => entry.key)).toEqual([
      'evidence:later', 'evidence:shared', 'evidence:tie', 'personal:shared', 'personal:next', 'personal:unknown-1', 'personal:unknown-2',
    ]);
    expect(new Set(entries.map(entry => entry.key)).size).toBe(7);
    expect(entries.at(-1)?.day).toBeUndefined();
  });

  it('groups known months and retains an explicit final group for unknown dates', () => {
    const entries = getJournalEntries({
      personalProof: [memory('unknown'), memory('december', '2025-12-31'), memory('january', '2026-01-03')],
      evidence: [],
    });
    const groups = groupJournalEntries(entries);
    expect(groups.map(group => group.key)).toEqual(['2026-01', '2025-12', 'undated']);
    expect(groups.flatMap(group => group.entries.map(entry => entry.key))).toEqual(entries.map(entry => entry.key));
    expect(groups.at(-1)?.day).toBeUndefined();
  });
});
