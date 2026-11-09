import { describe, expect, it } from 'vitest';
import { getMissionVersion, v2Missions as missions, prerequisitesFor } from './catalog';
import { missionIds } from './types';

const pages: Record<string, number> = {
  'Career_HQ_Operating_System.pdf': 119,
  'Operation_Algorithm_Forge_Realistic_Timeline.pdf': 2,
  'Operation_Blueprint_Career_HQ_Mission_Handoff.pdf': 13,
  'Operation_Credential_Forge_Mission_Handoff.pdf': 9,
  'Operation_Escape_Velocity_Career_HQ_Handoff.pdf': 6,
  'Operation_Fabric_Core_Career_HQ_Handoff.pdf': 15,
  'Operation_Neural_Edge_AI_Architect_Roadmap.pdf': 2,
  'Operation_Pattern_Forge_Career_HQ_Handoff.pdf': 10,
  'Operation_System_Forge_Career_HQ_Handoff.pdf': 9,
  'operation_side_income_starting_sprint.pdf': 2,
};

describe('operation-document catalog', () => {
  it('includes every supplied operation without inventing a competitive-coding curriculum', () => {
    expect(missions.map(mission => mission.id)).toEqual(missionIds.filter(id => id !== 'fde'));
    expect(Object.fromEntries(missions.map(mission => [mission.id, mission.checkpoints.length]))).toEqual({
      pattern: 5, system: 28, escape: 1, fabric: 32, blueprint: 5, credential: 6, neural: 7, algorithm: 0, income: 3,
    });
    expect(getMissionVersion('algorithm', '2.0.0').planned).toBe(true);
    expect(getMissionVersion('algorithm', '2.0.0').coverage).toBe('forecast');
    expect(getMissionVersion('income', '2.0.0').completionLabel).toContain('starting sprint');
  });

  it('uses explicit, valid source references and durable unique checkpoint IDs', () => {
    const ids = new Set<string>();
    const documents = new Set<string>();
    for (const mission of missions) {
      expect(mission.roadmapVersion).toBe('2.0.0');
      const references = [...mission.sources ?? [], ...mission.stages?.map(stage => stage.source) ?? []];
      expect(references.length).toBeGreaterThan(0);
      for (const reference of references) {
        expect(pages[reference.document], reference.document).toBeDefined();
        expect(reference.section.length).toBeGreaterThan(0);
        expect(reference.page).toBeGreaterThanOrEqual(1);
        expect(reference.page).toBeLessThanOrEqual(pages[reference.document]);
        documents.add(reference.document);
      }
      for (const checkpoint of mission.checkpoints) {
        expect(ids.has(checkpoint.id), checkpoint.id).toBe(false);
        ids.add(checkpoint.id);
        expect(checkpoint.id).toMatch(/^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/);
        expect(checkpoint.action.length).toBeLessThanOrEqual(200);
        expect(checkpoint.recoveryAction.length).toBeGreaterThan(0);
        expect(checkpoint.minutes).toBeGreaterThan(0);
        expect(checkpoint.minutes).toBeLessThanOrEqual(75);
        expect(checkpoint.criteria.length).toBeGreaterThan(0);
        for (const parent of prerequisitesFor(mission, checkpoint)) {
          const parentIndex = mission.checkpoints.findIndex(item => item.id === parent);
          expect(parentIndex).toBeGreaterThanOrEqual(0);
          expect(parentIndex).toBeLessThan(mission.checkpoints.indexOf(checkpoint));
        }
      }
      expect(mission.stages?.flatMap(stage => stage.checkpointIds)).toEqual(mission.checkpoints.map(checkpoint => checkpoint.id));
    }
    expect(ids.size).toBe(87);
    expect(documents.size).toBe(10);
  });

  it('preserves the later HashMap objective and its explicit branch', () => {
    const mission = getMissionVersion('pattern', '2.0.0');
    const frequency = mission.checkpoints.find(checkpoint => checkpoint.sourceId === '2.2')!;
    const complement = mission.checkpoints.find(checkpoint => checkpoint.sourceId === '2.3')!;
    const grouping = mission.checkpoints.find(checkpoint => checkpoint.sourceId === '2.4')!;
    expect(complement.title).toContain('Complement');
    expect(grouping.title).toContain('Grouping');
    expect(prerequisitesFor(mission, complement)).toEqual([frequency.id]);
    expect(prerequisitesFor(mission, grouping)).toEqual([frequency.id]);
    expect(mission.checkpoints.some(checkpoint => /two pointers/i.test(checkpoint.title))).toBe(false);
  });

  it('keeps optional credentials and incomplete planning material outside required gates', () => {
    const credential = getMissionVersion('credential', '2.0.0');
    const optional = credential.stages!.filter(stage => stage.optional);
    expect(optional).toHaveLength(3);
    expect(optional.every(stage => stage.checkpointIds.length === 0)).toBe(true);
    expect(getMissionVersion('blueprint', '2.0.0').checkpoints.every(checkpoint => checkpoint.granularity === 'phase')).toBe(true);
    expect(getMissionVersion('escape', '2.0.0').checkpoints[0].granularity).toBe('workflow');
    expect(getMissionVersion('algorithm', '2.0.0').stages).toHaveLength(4);
  });

  it('does not embed source-specific private biography or employment targets in public definitions', () => {
    const text = JSON.stringify(missions);
    expect(text).not.toMatch(/mishrad|LSEG|SDE-1|matrimon|burnout|salary|compensation|manager connects|notice period/i);
    expect(missions.every(mission => !Object.hasOwn(mission, 'saveState') && !Object.hasOwn(mission, 'progress'))).toBe(true);
  });
});
