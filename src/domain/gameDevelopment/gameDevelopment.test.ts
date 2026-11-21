import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getLatestMission, getMissionVersion, prerequisitesFor, v2Missions, v3Missions } from '../catalog';
import { activateCheckpoint, createInitialState, generatePlan, localDate, parseState, recordChange, recordEvidence } from '../engine';
import { legacyMissionIds } from '../legacyState';
import { missionIds } from '../types';
import type { AppState, EvidenceInput } from '../types';
import { loadRoadmapPack } from '../roadmapPacks/load';
import { getPackOutline, packCheckpointId, searchRoadmapPacks } from '../roadmapPacks/registry';
import { serializeWorkspace } from '../../workspaceFile';
import { buildCareerGraph } from '../../graph/careerGraphModel';
import { getCareerFocusVisibility } from '../../graph/careerFocusVisibility';
import { getDiscoverySnapshot } from '../../discovery/model';
import { getMissionActivity } from '../missionActivity';
import { appendWorkspace, createJournal, unlockJournal } from '../../repositorySync/journal';
import { journalText } from '../../repositorySync/journalFormat';
import type { JournalFile } from '../../repositorySync/journalFormat';
import { applyWorkspaceChanges, canonicalJson, mergeWorkspaces, workspaceChanges } from '../../repositorySync/workspaceChanges';
import { capstoneAcceptance, capstoneRubric } from './capstone';

const now = new Date('2026-11-21T08:00:00Z');
const phrase = 'A synthetic World Forge fixture phrase, not a real credential';

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(now); });
afterEach(() => vi.useRealTimers());

function activate(state: AppState) {
  return recordChange({ ...state, missions: { ...state.missions, gamedev: { ...state.missions.gamedev, mode: 'active' } } },
    'Synthetic deliberate mission activation', 'gamedev');
}

function input(state: AppState, overrides: Partial<EvidenceInput> = {}): EvidenceInput {
  return { missionId: 'gamedev', checkpointId: state.missions.gamedev.checkpointId,
    title: 'Synthetic independent game-learning artifact',
    summary: 'Synthetic fixture demonstrating an actual attempted rule and its changed-condition observation.',
    kind: 'code', url: '', advance: false, criteriaConfirmed: false, ...overrides };
}

describe('World Forge / complete available roadmap starts Planned', () => {
  it.each([undefined, '1.0.0', '2.0.0', '3.0.0', '4.0.0'] as const)('starts Planned in a %s workspace without inferred work or focus changes', version => {
    const state = createInitialState(false, version);
    const mission = getLatestMission('gamedev');
    expect(mission.planned).toBe(false);
    expect(state.missions.gamedev).toEqual({ roadmapVersion: '3.0.0',
      checkpointId: mission.checkpoints[0].id, status: 'not-started', mode: 'planned',
      completedCheckpointIds: [], blocker: '' });
    expect(state.focusMissionId).toBe('pattern');
    expect(state.events).toEqual([]);
    expect(state.evidence).toEqual([]);
    expect(generatePlan(state).some(action => action.missionId === 'gamedev')).toBe(false);
    expect(getMissionActivity(state, 'gamedev', now).workedToday).toBe(false);
    expect(v2Missions.some(item => item.id === 'gamedev')).toBe(false);
    expect(v3Missions.some(item => item.id === 'gamedev')).toBe(false);
    expect(() => getMissionVersion('gamedev', '2.0.0')).toThrow('No 2.0.0');
  });

  it('adds only the missing Planned lane to a genuine previous eleven-mission wire payload', () => {
    let current = createInitialState(false);
    current = recordEvidence(current, { ...input(current), missionId: 'pattern',
      checkpointId: current.missions.pattern.checkpointId, advance: true, criteriaConfirmed: true });
    current.missions.escape.blocker = 'Synthetic retained blocker';
    current.plans[localDate(now)] = generatePlan(current);
    const { gamedev, ...oldMissions } = current.missions;
    expect(Object.keys(oldMissions)).toHaveLength(11);
    const wire = { ...current, missions: oldMissions }, raw = JSON.stringify(wire);
    const restored = parseState(wire);
    expect(restored).toEqual({ ...wire, missions: { ...oldMissions, gamedev } });
    expect(JSON.stringify(wire)).toBe(raw);
    expect(parseState(JSON.parse(serializeWorkspace(restored)))).toEqual(restored);
    expect(restored.omscsPlan).toEqual(current.omscsPlan);
  });

  it('normalizes the original strict schema-one shape without inventing legacy game history', () => {
    const current = createInitialState(false, '1.0.0');
    const legacy = { schemaVersion: 1, roadmapVersion: '1.0.0', sampleData: false, updatedAt: current.updatedAt,
      objective: current.objective, focusMissionId: current.focusMissionId,
      capacity: current.capacity, interviewMode: current.interviewMode,
      missions: Object.fromEntries(legacyMissionIds.map(id => {
        const { roadmapVersion: _version, ...progress } = current.missions[id];
        return [id, progress];
      })),
      plans: {}, evidence: [], events: [], readiness: current.readiness, opportunities: [] };
    const raw = JSON.stringify(legacy), restored = parseState(legacy);
    expect(restored.missions.gamedev).toEqual(current.missions.gamedev);
    expect(restored.updatedAt).toBe(current.updatedAt);
    expect(restored.focusMissionId).toBe(current.focusMissionId);
    expect(restored.events).toEqual([]);
    expect(Object.hasOwn(restored, 'omscsPlan')).toBe(false);
    expect(JSON.stringify(legacy)).toBe(raw);
    for (const id of legacyMissionIds) expect(restored.missions[id]).toEqual(current.missions[id]);
  });

  it('rejects explicit invalid, started or noncanonical Planned game data instead of resetting it', () => {
    const state = createInitialState(false), progress = state.missions.gamedev;
    for (const invalid of [undefined, null, {}, { ...progress, roadmapVersion: '2.0.0' },
      { ...progress, checkpointId: 'gamedev-v3-gd-02' }, { ...progress, status: 'in-progress' },
      { ...progress, completedCheckpointIds: [progress.checkpointId] }, { ...progress, blocker: 'A blocker before activation' },
      { ...progress, undocumented: true }]) {
      expect(() => parseState({ ...state, missions: { ...state.missions, gamedev: invalid } })).toThrow();
    }
    expect(() => parseState({ ...state, missions: { ...state.missions, fde: { ...state.missions.fde, mode: 'planned' } } }))
      .toThrow('available roadmap');
    expect(() => recordEvidence(state, input(state))).toThrow('available mission');
    expect(() => activateCheckpoint(state, 'gamedev', progress.checkpointId)).toThrow('Bring this mission into focus');
  });

  it('requires deliberate activation before work, then preserves existing other missions and academic data', () => {
    const before = createInitialState(false);
    const active = activate(before);
    expect(active.missions.gamedev.mode).toBe('active');
    expect(active.missions.gamedev.status).toBe('not-started');
    expect(active.focusMissionId).toBe(before.focusMissionId);
    expect(() => recordEvidence(active, input(active, { advance: true }))).toThrow();
    const completed = recordEvidence(active, input(active, { advance: true, criteriaConfirmed: true }));
    expect(completed.missions.gamedev.completedCheckpointIds).toEqual(['gamedev-v3-gd-01']);
    expect(completed.missions.gamedev.checkpointId).toBe('gamedev-v3-gd-02');
    expect(completed.omscsPlan).toEqual(before.omscsPlan);
    for (const id of missionIds.filter(id => id !== 'gamedev')) expect(completed.missions[id]).toEqual(before.missions[id]);
    expect(parseState(JSON.parse(serializeWorkspace(completed)))).toEqual(completed);
    expect(before.missions.gamedev.mode).toBe('planned');
  });

  it('does not turn a browsing/reference projection into activity, Atlas credit or a scheduled action', async () => {
    const state = createInitialState(false), raw = JSON.stringify(state), discoveries = getDiscoverySnapshot(state, now);
    const pack = await loadRoadmapPack('gamedev');
    const graph = buildCareerGraph(state);
    expect(pack.units.some(unit => unit.id === 'gd-capstone-brief')).toBe(true);
    expect(graph.orbits.find(orbit => orbit.missionId === 'gamedev')?.missionMode).toBe('planned');
    expect(getCareerFocusVisibility(state, localDate(now)).detailedMissionIds.has('gamedev')).toBe(false);
    expect(graph.nodes.filter(node => node.missionId === 'gamedev' && node.status === 'complete')).toEqual([]);
    expect(generatePlan(state).some(action => action.missionId === 'gamedev')).toBe(false);
    expect(getDiscoverySnapshot(state, now)).toEqual(discoveries);
    expect(JSON.stringify(state)).toBe(raw);
  });
});

describe('World Forge / complete referenced content and preserved journal identity', () => {
  it('maps every substantive core lesson to its sequential checkpoint while reference/advanced units stay optional', async () => {
    const pack = await loadRoadmapPack('gamedev'), mission = getLatestMission('gamedev');
    const outline = getPackOutline('gamedev')!;
    expect(pack.sourceKind).toBe('web-research');
    expect(mission.checkpoints).toHaveLength(65);
    expect(pack.units).toHaveLength(78);
    expect(pack.units.filter(unit => unit.role === 'reference')).toHaveLength(5);
    expect(pack.units.filter(unit => unit.role === 'practice')).toHaveLength(8);
    expect(new Set(pack.units.map(unit => unit.id)).size).toBe(pack.units.length);
    expect(pack.units.reduce((sum, unit) => sum + unit.exercises.length, 0)).toBe(outline.exerciseCount);
    const sources = new Set(pack.webSources!.map(source => source.id));
    for (const unit of pack.units) {
      expect(unit.pages).toEqual([]);
      expect(unit.sections.length, unit.id).toBeGreaterThan(0);
      expect(unit.sections.every(section => section.paragraphs.length + section.items.length > 0 || Boolean(section.code)), unit.id).toBe(true);
      expect(unit.exercises).toHaveLength(2);
      expect(unit.exercises.every(exercise => exercise.task && exercise.check), unit.id).toBe(true);
      expect(unit.sourceIds?.every(id => sources.has(id)), unit.id).toBe(true);
      const checkpoint = mission.checkpoints.find(item => item.id === packCheckpointId('gamedev', unit.id));
      if (unit.role === 'checkpoint') {
        expect(checkpoint?.criteria).toEqual(unit.criteria);
        expect(checkpoint?.topics).toEqual(unit.concepts);
      } else expect(checkpoint).toBeUndefined();
    }
    mission.checkpoints.forEach((checkpoint, index) => {
      expect(prerequisitesFor(mission, checkpoint)).toEqual(index ? [mission.checkpoints[index - 1].id] : []);
    });
    expect(searchRoadmapPacks('Godot').some(entry => entry.route.startsWith('practice/gamedev/'))).toBe(true);
    expect(searchRoadmapPacks('Borrowed Ground').some(entry => entry.route.includes('gd-capstone'))).toBe(true);
  });

  it('provides a complete weighted comparison target with critical gates and distinct real failure scenarios', async () => {
    const pack = await loadRoadmapPack('gamedev');
    expect(capstoneRubric.reduce((sum, category) => sum + category.weight, 0)).toBe(100);
    expect(capstoneRubric.every(category => category.levels.length === 5 && new Set(category.levels).size === 5)).toBe(true);
    expect(new Set(capstoneAcceptance.map(row => row[0])).size).toBe(capstoneAcceptance.length);
    const references = pack.units.filter(unit => unit.phaseId === 'gd-benchmark');
    expect(references).toHaveLength(5);
    expect(references.every(unit => unit.sections.length >= 5)).toBe(true);
    const rubric = references.find(unit => unit.id === 'gd-capstone-rubric')!;
    expect(rubric.sections.find(section => section.heading.startsWith('Critical completion'))?.items.length).toBeGreaterThan(0);
    expect(rubric.exercises[1].task).toContain('no independent network clients');
    expect(rubric.sections.flatMap(section => section.paragraphs).join(' ')).toContain('does not execute Godot');
  });

  it('retains the required mission-cell deletion guard and reports competing game progress rather than overwriting it', () => {
    const base = createInitialState(false), local = activate(base);
    const remote = recordEvidence(local, input(local));
    expect(() => applyWorkspaceChanges(base, [{
      key: 'mission/gamedev', before: canonicalJson(base.missions.gamedev), after: null,
    }], base.updatedAt)).toThrow('missing required mission: gamedev');
    const merged = mergeWorkspaces(base, local, remote);
    expect(merged.state).toBeNull();
    expect(merged.conflicts).toContain('Mission: gamedev');
    expect(base.missions.gamedev.mode).toBe('planned');
  });

  it('replays a genuine previous eleven-mission encrypted baseline and appends actual activated game work to the same chain', async () => {
    const state = createInitialState(false), created = await createJournal(state, phrase);
    const { gamedev: _game, ...oldMissions } = state.missions;
    const payload = { kind: 'baseline', state: { ...state, missions: oldMissions }, at: state.updatedAt };
    const metadata = { id: crypto.randomUUID(), parent: null };
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, tagLength: 128,
      additionalData: new TextEncoder().encode(JSON.stringify({ header: created.journal.file.header, ...metadata })) },
    created.key, new TextEncoder().encode(JSON.stringify(payload)));
    const file: JournalFile = { header: created.journal.file.header, batches: [{ type: 'encrypted-batch', ...metadata,
      iv: Buffer.from(iv).toString('base64'), ciphertext: Buffer.from(encrypted).toString('base64') }] };
    const original = journalText(file), unlocked = await unlockJournal(file, created.key);
    expect(unlocked.state).toEqual(state);
    const completed = recordEvidence(activate(unlocked.state), input(unlocked.state, { advance: true, criteriaConfirmed: true }));
    const appended = await appendWorkspace(unlocked, completed, created.key);
    expect(journalText(appended.file).startsWith(original)).toBe(true);
    expect(journalText(appended.file)).not.toContain('Synthetic independent game-learning artifact');
    expect((await unlockJournal(appended.file, created.key)).state).toEqual(completed);
    expect(workspaceChanges(state, activate(state)).some(change => change.key === 'mission/gamedev')).toBe(true);
  });
});
