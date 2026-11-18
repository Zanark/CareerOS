import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getLatestMission, getMissionVersion, missions, v3Missions } from '../catalog';
import { createInitialState, generatePlan, localDate, parseState, recordChange, recordEvidence, recordRecall } from '../engine';
import { loadRoadmapPack } from '../roadmapPacks/load';
import { packCheckpointId, searchRoadmapPacks } from '../roadmapPacks/registry';
import { getDiscoverySnapshot } from '../../discovery/model';
import { buildCareerGraph } from '../../graph/careerGraphModel';
import { careerSkillLinks } from '../../graph/careerSkillLinks';
import { serializeWorkspace } from '../../workspaceFile';
import { appendWorkspace, createJournal, unlockJournal } from '../../repositorySync/journal';
import { journalText } from '../../repositorySync/journalFormat';
import { applyWorkspaceChanges, canonicalJson, mergeWorkspaces, workspaceChanges } from '../../repositorySync/workspaceChanges';
import { omscsCourses } from './courses';
import {
  getOmscsSchedule, getOmscsScheduleWarnings, getOmscsSummary, omscsPlanSchema,
  nextOmscsTerm, proposedOmscsPlan, setOmscsCourse, setOmscsRoute,
} from './model';
import type { OmscsCourseId, OmscsGrade, OmscsPlan } from './types';
import type { JournalFile } from '../../repositorySync/journalFormat';

const now = new Date('2026-11-19T10:00:00Z');
const phrase = 'A fictional GeoJack journal test phrase';
const entry = (id: OmscsCourseId, grade: OmscsGrade = 'B') => ({
  id, status: 'completed' as const, term: '' as const, grade,
});
const academic = (plan: OmscsPlan) => recordChange({
  ...createInitialState(false), omscsPlan: plan,
}, 'Synthetic academic entry', 'omscs');

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(now); });
afterEach(() => vi.useRealTimers());

describe('GeoJack compatibility and independent evidence boundaries', () => {
  it('adds only an unstarted background lane to a genuine earlier ten-mission workspace', () => {
    let current = createInitialState(false, '2.0.0');
    current = recordEvidence(current, {
      missionId: 'system', checkpointId: current.missions.system.checkpointId,
      title: 'Synthetic earlier design', summary: 'Synthetic retained evidence with explicitly checked criteria.',
      kind: 'diagram', url: '', advance: true, criteriaConfirmed: true,
    });
    current.missions.escape.blocker = 'Synthetic retained blocker';
    current.plans[localDate()] = generatePlan(current);
    const { omscs, ...oldMissions } = current.missions;
    const wire = { ...current, missions: oldMissions };
    const before = JSON.stringify(wire);
    expect(Object.keys(oldMissions)).toHaveLength(10);
    const restored = parseState(wire);
    expect(restored).toEqual({ ...wire, missions: { ...oldMissions, omscs } });
    expect(restored.missions.omscs).toMatchObject({
      mode: 'background', status: 'not-started', checkpointId: 'omscs-v3-omscs-route', completedCheckpointIds: [],
    });
    expect(Object.hasOwn(restored, 'omscsPlan')).toBe(false);
    expect(JSON.stringify(wire)).toBe(before);
    expect(parseState(JSON.parse(serializeWorkspace(restored)))).toEqual(restored);
    expect(getMissionVersion('omscs', '3.0.0')).toBe(getLatestMission('omscs'));
    expect(() => getMissionVersion('omscs', '1.0.0')).toThrow('No 1.0.0');
    expect(() => getMissionVersion('omscs', '2.0.0')).toThrow('No 2.0.0');
    expect(() => getMissionVersion('omscs', '4.0.0')).toThrow('No 4.0.0');
    expect(v3Missions.some(mission => mission.id === 'omscs')).toBe(false);
    expect(missions.filter(mission => mission.id !== 'omscs').reduce((n, mission) => n + mission.checkpoints.length, 0)).toBe(557);
  });

  it.each([undefined, '1.0.0', '2.0.0', '3.0.0', '4.0.0'] as const)('creates a %s fixture with no assumed academic data', version => {
    const state = createInitialState(false, version);
    expect(state.missions.omscs.mode).toBe('background');
    expect(state.missions.omscs.completedCheckpointIds).toEqual([]);
    expect(state.omscsPlan).toBeUndefined();
    expect(generatePlan(state).some(action => action.missionId === 'omscs')).toBe(false);
  });

  it('rejects explicit invalid new-mission data and required journal-cell deletion', () => {
    const state = createInitialState(false);
    for (const invalid of [undefined, null, {}, { ...state.missions.omscs, roadmapVersion: '2.0.0' },
      { ...state.missions.omscs, checkpointId: 'omscs-v3-omscs-readiness' }]) {
      expect(() => parseState({ ...state, missions: { ...state.missions, omscs: invalid } })).toThrow();
    }
    expect(() => applyWorkspaceChanges(state, [{
      key: 'mission/omscs', before: canonicalJson(state.missions.omscs), after: null,
    }], state.updatedAt)).toThrow('missing required mission: omscs');
  });

  it('never gives academic status or planning free checkpoint/Atlas credit', () => {
    const before = createInitialState(false);
    let plan = proposedOmscsPlan();
    for (const course of omscsCourses) plan = setOmscsCourse(plan, entry(course.id));
    const after = recordChange({ ...before, omscsPlan: plan }, 'Synthetic academic-only update', 'omscs');
    expect(getOmscsSummary(after.omscsPlan).qualifyingCredits).toBe(30);
    expect(getDiscoverySnapshot(after)).toEqual(getDiscoverySnapshot(before));
    expect(after.evidence).toEqual(before.evidence);
    expect(after.missions).toEqual(before.missions);
    expect(after.focusMissionId).toBe(before.focusMissionId);
    expect(after.plans).toEqual(before.plans);
    expect(parseState(JSON.parse(serializeWorkspace(after)))).toEqual(after);
  });

  it('keeps real background learning guards and source-derived Atlas participation', () => {
    const state = createInitialState(false);
    const input = {
      missionId: 'omscs' as const, checkpointId: state.missions.omscs.checkpointId,
      title: 'Synthetic independent slot map', summary: 'Synthetic original allocation with assumptions and an independently explained changed case.',
      kind: 'code' as const, url: '', advance: true, criteriaConfirmed: true,
    };
    expect(() => recordEvidence(state, { ...input, criteriaConfirmed: false })).toThrow();
    const after = recordEvidence(state, input);
    expect(after.missions.omscs).toMatchObject({ mode: 'background', checkpointId: 'omscs-v3-omscs-readiness' });
    expect(after.omscsPlan).toBeUndefined();
    expect(getDiscoverySnapshot(after).earned).toBeGreaterThan(0);
    expect(() => recordRecall(after, {
      missionId: 'omscs', roadmapVersion: '3.0.0', checkpointId: input.checkpointId, outcome: 'independent',
      checks: { explanation: true, diagram: true, exercise: true }, notes: '',
    })).toThrow();
  });
});

describe('proposed semesters and conditional degree accounting', () => {
  it('proposes from the actual calendar without writing or inventing a past term', () => {
    expect(nextOmscsTerm(now)).toBe('2027-spring');
    expect(nextOmscsTerm(new Date('2027-02-01T10:00:00Z'))).toBe('2027-summer');
    expect(proposedOmscsPlan(new Date('2027-02-01T10:00:00Z')).startTerm).toBe('2027-fall');
    expect(nextOmscsTerm(new Date('2027-06-01T10:00:00Z'))).toBe('2027-fall');
    expect(() => nextOmscsTerm(new Date('invalid'))).toThrow('invalid date');
    const plan = proposedOmscsPlan(now);
    expect(plan.courses).toEqual([]);
    const explicitSummer = getOmscsSchedule(setOmscsRoute(undefined, { startTerm: '2027-summer', includeSummer: false }));
    expect(explicitSummer.find(row => row.course.id === 'cs7641')?.term).toBe('2027-summer');
    expect(explicitSummer.find(row => row.course.id === 'cs6200')?.term).toBe('2027-fall');
    expect(explicitSummer.filter(row => row.term?.endsWith('summer'))).toHaveLength(1);
    const schedule = getOmscsSchedule(plan);
    expect(schedule.filter(row => row.term === null)).toHaveLength(3);
    expect(schedule.find(row => row.course.id === 'cs7641')?.term).toBe('2027-spring');
    expect(schedule.find(row => row.course.id === 'cs6200')?.term).toBe('2027-fall');
    expect(schedule.find(row => row.course.id === 'cs7295')?.term).toBe('2030-spring');
    expect(plan.courses).toEqual([]);
  });

  it('preserves entered terms and never compresses the route after recording a completion', () => {
    const base = proposedOmscsPlan();
    const before = getOmscsSchedule(base);
    let plan = setOmscsCourse(base, { ...entry('cs7641'), term: '2026-fall' });
    expect(getOmscsSchedule(plan).find(row => row.course.id === 'cs6200')?.term)
      .toBe(before.find(row => row.course.id === 'cs6200')?.term);
    plan = setOmscsRoute(plan, { startTerm: '2028-fall', includeSummer: true });
    expect(getOmscsSchedule(plan).find(row => row.course.id === 'cs7641')?.term).toBe('2026-fall');
    expect(getOmscsSchedule(plan).find(row => row.course.id === 'cs6200')?.term).toBe('2029-spring');
    expect(base.courses).toEqual([]);
  });

  it('distinguishes unknown grades, specialization B floors and free-elective C floors', () => {
    let plan = proposedOmscsPlan();
    for (const id of ['cs7637', 'cs7632', 'cs6457'] as const) plan = setOmscsCourse(plan, entry(id, 'unrecorded'));
    expect(getOmscsSummary(plan)).toMatchObject({ reportedCredits: 9, qualifyingCredits: 0, specializationCredits: 0, unknownGrades: 3 });
    plan = setOmscsCourse(plan, entry('cs7637', 'C'));
    plan = setOmscsCourse(plan, entry('cs7632', 'B'));
    plan = setOmscsCourse(plan, entry('cs6457', 'C'));
    expect(getOmscsSummary(plan)).toMatchObject({ reportedCredits: 9, qualifyingCredits: 6, specializationCredits: 3, unknownGrades: 0 });
    expect(getOmscsSummary(plan).problems[0]).toContain('CS 7637');
    plan = setOmscsCourse(plan, entry('cs6457', 'F'));
    expect(getOmscsSummary(plan)).toMatchObject({ reportedCredits: 6, qualifyingCredits: 3 });
  });

  it('replaces rather than duplicates a course and rejects malformed explicit academic records', () => {
    const plan = setOmscsCourse(undefined, entry('cs7641'));
    const replaced = setOmscsCourse(plan, entry('cs7641', 'A'));
    expect(replaced.courses).toHaveLength(1);
    expect(plan.courses[0].grade).toBe('B');
    for (const invalid of [
      null, { ...plan, secret: 'invalid' }, { ...plan, startTerm: '2098-fall' },
      { ...plan, startTerm: '2027-winter' }, { ...plan, courses: [...plan.courses, ...plan.courses] },
      { ...plan, courses: [{ ...plan.courses[0], id: 'cs7652' }] },
      { ...plan, courses: [{ ...plan.courses[0], status: 'planned', grade: 'A' }] },
      { ...plan, courses: [{ ...plan.courses[0], grade: 'B+' }] },
      { ...plan, courses: [{ ...plan.courses[0], term: '2027-13' }] },
    ]) expect(() => parseState({ ...createInitialState(false), omscsPlan: invalid })).toThrow();
    expect(omscsPlanSchema.parse(setOmscsRoute(undefined, { startTerm: '2097-fall', includeSummer: false }))).toBeDefined();
    expect(getOmscsSchedule(setOmscsRoute(undefined, { startTerm: '2097-fall', includeSummer: false }))
      .find(row => row.course.id === 'cs7295')?.term).toBe('2100-fall');
  });

  it('surfaces preparation-order and normal semester-load problems without guessing enrollment permission', () => {
    let plan = proposedOmscsPlan();
    for (const id of ['cs7643', 'cs7650', 'cs7637'] as const) {
      plan = setOmscsCourse(plan, { id, term: '2027-summer', status: 'planned', grade: 'unrecorded' });
    }
    const warnings = getOmscsScheduleWarnings(plan);
    expect(warnings.some(text => text.includes('CS 7643'))).toBe(false);
    expect(warnings.some(text => text.includes('exceed the default 1-course'))).toBe(true);
    plan = setOmscsCourse(plan, { id: 'cs7643', term: '2026-fall', status: 'planned', grade: 'unrecorded' });
    expect(getOmscsScheduleWarnings(plan).some(text => text.includes('CS 7643') && text.includes('not after'))).toBe(true);
  });
});

describe('academic journal preservation and complete source-linked study', () => {
  it('roundtrips optional academic data, preserves absence and detects a competing plan edit', () => {
    const base = createInitialState(false);
    const local = academic(setOmscsCourse(undefined, entry('cs7641')));
    const remote = academic(setOmscsCourse(undefined, entry('cs6200')));
    expect(workspaceChanges(base, local).some(row => row.key === 'setting/omscsPlan')).toBe(true);
    expect(applyWorkspaceChanges(base, workspaceChanges(base, local), local.updatedAt)).toEqual(local);
    const restored = applyWorkspaceChanges(local, workspaceChanges(local, base), base.updatedAt);
    expect(restored).toEqual(base);
    expect(Object.hasOwn(restored, 'omscsPlan')).toBe(false);
    expect(mergeWorkspaces(base, local, remote).conflicts).toContain('Setting: omscsPlan');
  });

  it('authentically replays an old ten-mission ciphertext baseline before appending new academic data', async () => {
    const state = createInitialState(false);
    const created = await createJournal(state, phrase);
    const { omscs: _omscs, ...oldMissions } = state.missions;
    const old = { ...state, missions: oldMissions };
    const file: JournalFile = { header: created.journal.file.header, batches: [] };
    const metadata = { id: crypto.randomUUID(), parent: null };
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt({
      name: 'AES-GCM', iv, tagLength: 128,
      additionalData: new TextEncoder().encode(JSON.stringify({ header: file.header, ...metadata })),
    }, created.key, new TextEncoder().encode(JSON.stringify({ kind: 'baseline', state: old, at: state.updatedAt })));
    file.batches.push({ type: 'encrypted-batch', ...metadata, iv: Buffer.from(iv).toString('base64'),
      ciphertext: Buffer.from(encrypted).toString('base64') });
    const unlocked = await unlockJournal(file, created.key);
    expect(unlocked.state).toEqual(state);
    expect(unlocked.state.omscsPlan).toBeUndefined();
    const original = journalText(file);
    const changed = recordChange({ ...unlocked.state, omscsPlan: setOmscsCourse(undefined, entry('cs7637')) },
      'Synthetic course entry', 'omscs');
    const appended = await appendWorkspace(unlocked, changed, created.key);
    expect(journalText(appended.file).startsWith(original)).toBe(true);
    expect((await unlockJournal(appended.file, created.key)).state).toEqual(changed);
  });

  it('exposes all selected course guides, meaningful lazy practice and actual citations without fictitious PDF pages', async () => {
    const pack = await loadRoadmapPack('omscs');
    const mission = getLatestMission('omscs');
    expect(pack.units.filter(unit => unit.role === 'checkpoint')).toHaveLength(24);
    expect(pack.units).toHaveLength(29);
    expect(mission.checkpoints).toHaveLength(24);
    expect(omscsCourses).toHaveLength(10);
    const sourceIds = new Set(pack.webSources?.map(source => source.id));
    for (const unit of pack.units) {
      expect(unit.pages).toEqual([]);
      expect(unit.sourceIds?.length).toBeGreaterThan(0);
      expect(unit.sourceIds?.every(id => sourceIds.has(id))).toBe(true);
      expect(unit.sections.flatMap(section => section.paragraphs).join(' ').length).toBeGreaterThan(300);
      expect(unit.exercises).toHaveLength(2);
      expect(unit.exercises.every(exercise => exercise.check && exercise.page === undefined)).toBe(true);
      if (unit.role === 'checkpoint') expect(mission.checkpoints.some(cp => cp.id === packCheckpointId('omscs', unit.id))).toBe(true);
    }
    expect(searchRoadmapPacks('Paxos').some(row => row.route.startsWith('practice/omscs/'))).toBe(true);
    const links = careerSkillLinks.filter(link => link.source.missionId === 'omscs' || link.target.missionId === 'omscs');
    expect(links).toHaveLength(6);
    for (const link of links) for (const peer of [link.source, link.target]) {
      expect(getMissionVersion(peer.missionId, peer.roadmapVersion).checkpoints.some(cp => cp.id === peer.checkpointId)).toBe(true);
    }
    const graph = buildCareerGraph(createInitialState(false));
    expect(graph.nodes.find(node => node.id === 'mission:omscs')?.label).toBe('Georgia Tech OMSCS');
  });
});
