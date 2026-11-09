import { createInitialState, parseState, recordEvidence, recordRecall } from '../domain/engine';
import type { AppState, EvidenceKind } from '../domain/types';

/** Explicit synthetic replacement for the in-memory tutorial only, never the saved workspace. */
export function createDiscoveryPracticeState(now = new Date()): AppState {
  let state = createInitialState(false);
  state.sampleData = true;
  state.objective = 'Tutorial example: a fictional collection of learning records.';
  function at(daysAgo: number) {
    const date = new Date(now);
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() - daysAgo);
    return date.toISOString();
  }
  function evidence(daysAgo: number, kind: EvidenceKind, advance = false) {
    state = recordEvidence(state, {
      missionId: 'pattern', checkpointId: state.missions.pattern.checkpointId,
      title: `Tutorial ${kind} example`, summary: 'Synthetic tutorial practice only; no real work or ability is claimed.',
      kind, url: '', advance, criteriaConfirmed: advance,
    });
    state.evidence.at(-1)!.createdAt = at(daysAgo);
    state.events.at(-1)!.createdAt = at(daysAgo);
  }
  evidence(21, 'explanation');
  const firstCheckpoint = state.missions.pattern.checkpointId;
  evidence(20, 'diagram');
  evidence(18, 'exercise', true);
  evidence(14, 'exercise');
  evidence(12, 'explanation', true);
  evidence(7, 'explanation');
  evidence(5, 'exercise');
  evidence(3, 'note');
  evidence(1, 'note');
  for (const [daysAgo, outcome] of [[19, 'partial'], [17, 'independent'], [10, 'independent']] as const) {
    state = recordRecall(state, {
      missionId: 'pattern', checkpointId: firstCheckpoint, roadmapVersion: state.missions.pattern.roadmapVersion,
      outcome, checks: { explanation: true, diagram: false, exercise: true },
      notes: 'Fictional spaced-recall example. Not a real assessment.',
    });
    state.recalls.at(-1)!.createdAt = at(daysAgo);
    state.events.at(-1)!.createdAt = at(daysAgo);
    state.events.sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
  }
  return parseState(state);
}
