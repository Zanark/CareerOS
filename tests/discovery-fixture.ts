import { parseState, recordEvidence, recordRecall } from '../src/domain/engine';
import type { EvidenceKind } from '../src/domain/types';
import { createDiscoveryPracticeState } from '../src/discovery/practice';

/** Test-only, explicitly synthetic proof that every discovery is attainable in one learning mission. */
export function createCompleteDiscoveryFixture(now = new Date()) {
  let state = createDiscoveryPracticeState(now);
  function add(kind: EvidenceKind, advance = false) {
    state = recordEvidence(state, {
      missionId: 'pattern', checkpointId: state.missions.pattern.checkpointId,
      title: 'Synthetic complete-collection fixture', summary: 'Synthetic test record only; no real user work or assessment.',
      kind, url: '', advance, criteriaConfirmed: advance,
    });
  }
  add('code');
  add('project');
  for (let index = 0; index < 5; index++) add('exercise', true);
  for (const checkpointId of state.missions.pattern.completedCheckpointIds.slice(1, 3)) {
    state = recordRecall(state, {
      missionId: 'pattern', checkpointId, roadmapVersion: state.missions.pattern.roadmapVersion,
      outcome: 'independent', checks: { explanation: true, diagram: false, exercise: true },
      notes: 'Synthetic independent-recall fixture.',
    });
  }
  for (const daysAgo of [2, 4, 6, 8, 9, 11, 13, 15]) {
    add('note');
    const date = new Date(now);
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() - daysAgo);
    state.evidence.at(-1)!.createdAt = date.toISOString();
    state.events.at(-1)!.createdAt = date.toISOString();
    state.events.sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
  }
  return parseState(state);
}
