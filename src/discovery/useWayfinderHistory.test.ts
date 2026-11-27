import { describe, expect, it } from 'vitest';
import { createInitialState, recordEvidence } from '../domain/engine';
import { getDiscoverySnapshot } from './model';
import { parseWayfinderHistory, unseenWayfinderFrom, wayfinderSourceId } from './useWayfinderHistory';

describe('Wayfinder presentation history', () => {
  it('remembers a valid presentation without treating a missing preference as earned work', () => {
    expect(parseWayfinderHistory(null)).toBeNull();
    const history = parseWayfinderHistory('{"version":1,"sourceId":"synthetic-evidence","xp":440}');
    expect(unseenWayfinderFrom(history, 'synthetic-evidence', 780)).toBe(440);
    expect(unseenWayfinderFrom(null, 'synthetic-evidence', 440)).toBe(0);
  });

  it('rejects malformed or incompatible preferences instead of repairing them silently', () => {
    for (const raw of ['{', 'null', '{"version":2,"sourceId":"sample","xp":440}',
      '{"version":1,"sourceId":"","xp":440}', '{"version":1,"sourceId":"sample","xp":-1}',
      '{"version":1,"sourceId":"sample","xp":1.5}', '{"version":1,"sourceId":"sample","xp":440,"credit":true}']) {
      expect(() => parseWayfinderHistory(raw)).toThrow();
    }
  });

  it('does not reuse another source collection or present more EXP than the current source permits', () => {
    const history = { version: 1 as const, sourceId: 'earlier-collection', xp: 2400 };
    expect(unseenWayfinderFrom(history, 'replacement-collection', 440)).toBe(0);
    expect(unseenWayfinderFrom(history, 'earlier-collection', 440)).toBe(440);
  });

  it('anchors presentation to the first qualifying evidence, not the latest record or current EXP', () => {
    let state = createInitialState(false);
    expect(wayfinderSourceId(getDiscoverySnapshot(state))).toBeNull();
    const input = {
      missionId: 'pattern' as const, checkpointId: state.missions.pattern.checkpointId,
      title: 'Synthetic arrival evidence', summary: 'Synthetic code with an explicitly confirmed completion.',
      kind: 'code' as const, url: '', advance: true, criteriaConfirmed: true,
    };
    state = recordEvidence(state, input);
    const original = wayfinderSourceId(getDiscoverySnapshot(state));
    state = recordEvidence(state, { ...input, checkpointId: state.missions.pattern.checkpointId });
    expect(wayfinderSourceId(getDiscoverySnapshot(state))).toBe(original);
    expect(state.evidence).toHaveLength(2);
  });
});
