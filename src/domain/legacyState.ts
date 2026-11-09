// Everything needed to strictly recognize a schemaVersion 1 workspace (the original
// eight-mission, five-checkpoint-per-mission prototype) and safely lift it into the
// current schemaVersion 2 shape. A payload only ever lands here when its root
// `schemaVersion` is literally `1`; anything else is handled by the current schema in
// engine.ts. Nothing in this file ever mutates or re-interprets existing evidence,
// events, plans, or opportunities values - it only adds the new, empty v2 collections
// and stamps `roadmapVersion: '1.0.0'` onto the eight original mission progress records.
// Later missions receive empty canonical lanes, never fabricated historical definitions.
import { z } from 'zod';
import { legacyMissions } from './legacyCatalog';
import { getMissionVersion, LATEST_ROADMAP_VERSION } from './catalog';
import { missionIds, opportunityStages, readinessKeys } from './types';
import type { AppState, MissionId, MissionProgress } from './types';
import { createFdeProgress } from './forwardDeployed/mission';

export const LEGACY_ROADMAP_VERSION = '1.0.0' as const;
const LEGACY_MAX_RECORDS = 5000;
const LEGACY_MAX_PLAN_DAYS = 3660;
const LEGACY_MAX_COMPLETED = 5;

export type LegacyMissionId = Exclude<MissionId, 'income' | 'fde'>;
export const legacyMissionIds = legacyMissions.map((mission) => mission.id) as LegacyMissionId[];

export function isDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000')) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export const dateSchema = z.string().length(10).refine(isDate, 'Use a valid calendar date: YYYY-MM-DD');
export const timestampSchema = z.string().max(35).datetime({ offset: true });
export const idSchema = z.string().min(1).max(128).regex(/^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/, 'Invalid identifier');
export const text = (max: number, min = 1) => z.string().min(min).max(max)
  .refine((value) => min === 0 || value.trim().length >= min, 'Text is too short');
export const urlSchema = z.string().max(2048).refine((value) => {
  if (value === '') return true;
  if (!/^https?:\/\//i.test(value) || /[\s\\\u0000-\u001f\u007f]/.test(value)) return false;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && !!url.hostname && !url.username && !url.password;
  } catch {
    return false;
  }
}, 'Use an http:// or https:// URL without credentials, or leave it empty');

const legacyMissionIdSchema = z.enum(legacyMissionIds as [LegacyMissionId, ...LegacyMissionId[]]);
const kindSchema = z.enum(['code', 'diagram', 'explanation', 'exercise', 'project', 'application', 'interview', 'note']);
const statusSchema = z.enum(['not-started', 'in-progress', 'completed']);
const readinessSchema = z.enum(['unassessed', 'building', 'ready']);

const legacyProgressSchema = z.object({
  checkpointId: z.union([idSchema, z.literal('')]),
  status: statusSchema,
  mode: z.enum(['active', 'background', 'planned']),
  completedCheckpointIds: z.array(idSchema).max(LEGACY_MAX_COMPLETED),
  blocker: text(1000, 0),
}).strict();

const legacyActionSchema = z.object({
  id: idSchema,
  date: dateSchema,
  missionId: legacyMissionIdSchema,
  checkpointId: idSchema,
  title: text(200),
  minutes: z.number().int().min(1).max(120),
  reason: text(500),
  completed: z.boolean(),
}).strict();

const legacyEvidenceSchema = z.object({
  id: idSchema,
  missionId: legacyMissionIdSchema,
  checkpointId: idSchema,
  title: text(120, 3),
  summary: text(4000, 10),
  kind: kindSchema,
  url: urlSchema,
  visibility: z.literal('local'),
  createdAt: timestampSchema,
  completedCheckpoint: z.boolean(),
}).strict();

const legacyEventSchema = z.object({
  id: idSchema,
  type: text(80),
  title: text(200),
  missionId: legacyMissionIdSchema.optional(),
  createdAt: timestampSchema,
}).strict();

const legacyOpportunitySchema = z.object({
  id: idSchema,
  company: text(120),
  role: text(160),
  stage: z.enum(opportunityStages),
  url: urlSchema,
  notes: text(4000, 0),
  createdAt: timestampSchema,
}).strict();

const legacyStateSchema = z.object({
  schemaVersion: z.literal(1),
  roadmapVersion: z.literal(LEGACY_ROADMAP_VERSION),
  sampleData: z.boolean(),
  updatedAt: timestampSchema,
  objective: text(500),
  focusMissionId: legacyMissionIdSchema,
  capacity: z.enum(['gentle', 'steady', 'deep']),
  interviewMode: z.boolean(),
  missions: z.object({
    pattern: legacyProgressSchema,
    system: legacyProgressSchema,
    escape: legacyProgressSchema,
    fabric: legacyProgressSchema,
    blueprint: legacyProgressSchema,
    credential: legacyProgressSchema,
    neural: legacyProgressSchema,
    algorithm: legacyProgressSchema,
  }).strict(),
  plans: z.record(dateSchema, z.array(legacyActionSchema).max(3))
    .refine((plans) => Object.keys(plans).length <= LEGACY_MAX_PLAN_DAYS, 'Too many saved plan dates'),
  evidence: z.array(legacyEvidenceSchema).max(LEGACY_MAX_RECORDS),
  events: z.array(legacyEventSchema).max(LEGACY_MAX_RECORDS),
  readiness: z.object({
    'Coding patterns': readinessSchema,
    'System design': readinessSchema,
    'Resume defense': readinessSchema,
    'STAR stories': readinessSchema,
    'Sustained coding': readinessSchema,
  }).strict(),
  opportunities: z.array(legacyOpportunitySchema).max(500),
}).strict();

export type LegacyV1State = z.infer<typeof legacyStateSchema>;

function ensure(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function legacyCheckpointIndex(missionId: MissionId, checkpointId: string): number {
  const mission = legacyMissions.find((candidate) => candidate.id === missionId);
  ensure(mission, `Unknown checkpoint "${checkpointId}" for ${missionId}`);
  const index = mission.checkpoints.findIndex((checkpoint) => checkpoint.id === checkpointId);
  ensure(index >= 0, `Unknown checkpoint "${checkpointId}" for ${missionId}`);
  return index;
}

/**
 * Strictly validate a payload against the original schemaVersion 1 wire format: exactly
 * the original eight missions, the original five-checkpoint starter catalog, and none of
 * the schemaVersion 2 fields (archives, freelanceOpportunities, recalls, or any
 * roadmapVersion stamped on an individual record). Throws with the same style of message
 * as the current-schema validator on any mismatch - a legacy-shaped payload with corrupt
 * internals is an error, never a silent reset.
 */
export function parseLegacyV1(value: unknown): LegacyV1State {
  const result = legacyStateSchema.safeParse(value);
  if (!result.success) {
    const issue = result.error.issues[0];
    throw new Error(`Invalid workspace at ${issue.path.join('.') || 'root'}: ${issue.message}`);
  }
  const state = result.data;
  const ids = new Set<string>();
  const unique = (id: string) => {
    ensure(!ids.has(id), `Duplicate record identifier: ${id}`);
    ids.add(id);
  };
  const completions = new Set<string>();
  const evidenceRefs = new Set<string>();
  for (const evidence of state.evidence) {
    unique(evidence.id);
    const index = legacyCheckpointIndex(evidence.missionId, evidence.checkpointId);
    const progress = state.missions[evidence.missionId];
    ensure(index <= progress.completedCheckpointIds.length, `Evidence references a locked checkpoint: ${evidence.checkpointId}`);
    const reference = `${evidence.missionId}:${evidence.checkpointId}`;
    evidenceRefs.add(reference);
    if (evidence.completedCheckpoint) {
      ensure(progress.completedCheckpointIds.includes(evidence.checkpointId), `Completion evidence has no completed checkpoint: ${evidence.checkpointId}`);
      ensure(!completions.has(reference), `Duplicate checkpoint completion: ${evidence.checkpointId}`);
      completions.add(reference);
    }
  }
  for (const mission of legacyMissions) {
    const progress = state.missions[mission.id as LegacyMissionId];
    if (mission.planned) {
      ensure(progress.mode === 'planned' && progress.checkpointId === '' &&
        progress.status === 'not-started' && progress.completedCheckpointIds.length === 0 &&
        progress.blocker === '', `${mission.name} is planned and cannot have progress`);
      continue;
    }
    ensure(progress.mode !== 'planned', `${mission.name} has an available roadmap and cannot be planned`);
    const completed = progress.completedCheckpointIds;
    ensure(completed.length <= mission.checkpoints.length, `Too many completed checkpoints for ${mission.id}`);
    completed.forEach((id, index) => {
      ensure(id === mission.checkpoints[index].id, `Broken sequential prerequisite for ${mission.id}: ${id}`);
      ensure(completions.has(`${mission.id}:${id}`), `Completed checkpoint requires completion evidence: ${id}`);
    });
    const finished = completed.length === mission.checkpoints.length;
    const expected = mission.checkpoints[finished ? completed.length - 1 : completed.length];
    ensure(progress.checkpointId === expected.id, `Current checkpoint is inconsistent with prerequisites for ${mission.id}`);
    ensure((progress.status === 'completed') === finished, `Final completion status is inconsistent for ${mission.id}`);
    ensure(progress.status !== 'not-started' || !evidenceRefs.has(`${mission.id}:${progress.checkpointId}`),
      `A checkpoint with evidence must be started: ${progress.checkpointId}`);
  }
  for (const [date, actions] of Object.entries(state.plans)) {
    const dayMissions = new Set<MissionId>();
    ensure(actions.reduce((sum, action) => sum + action.minutes, 0) <= 120, `Plan exceeds 120 minutes on ${date}`);
    for (const action of actions) {
      unique(action.id);
      ensure(action.date === date, `Action date does not match its plan: ${action.id}`);
      ensure(!dayMissions.has(action.missionId), `Duplicate mission in plan for ${date}: ${action.missionId}`);
      dayMissions.add(action.missionId);
      const index = legacyCheckpointIndex(action.missionId, action.checkpointId);
      ensure(index <= state.missions[action.missionId].completedCheckpointIds.length,
        `Plan references a locked checkpoint: ${action.checkpointId}`);
      ensure(!action.completed || evidenceRefs.has(`${action.missionId}:${action.checkpointId}`),
        `Completed action requires evidence: ${action.id}`);
    }
  }
  let previousEventTime = -Infinity;
  for (const event of state.events) {
    unique(event.id);
    const time = Date.parse(event.createdAt);
    ensure(time >= previousEventTime, 'History events must be in chronological order');
    previousEventTime = time;
  }
  for (const opportunity of state.opportunities) unique(opportunity.id);
  return state;
}

/**
 * Safely lift a validated schemaVersion 1 workspace into the current schemaVersion 2
 * shape: the eight original missions keep their exact progress plus a stamped
 * `roadmapVersion: '1.0.0'`, income retains its original v2 starting lane, and
 * FDE starts fresh on its only existing v3 definition. Both are background and
 * unstarted; the v2-only collections start empty. Every existing
 * evidence, event, plan, and opportunity value is carried over completely unchanged: no
 * migration event is appended, no record gains a retroactive roadmapVersion, and
 * `updatedAt` is preserved rather than bumped.
 */
export function migrateLegacyToLatest(legacy: LegacyV1State): AppState {
  const incomeMission = getMissionVersion('income', LATEST_ROADMAP_VERSION);
  const missions = Object.fromEntries(missionIds.map((id): [MissionId, MissionProgress] => {
    if (id === 'fde') return [id, createFdeProgress()];
    if (id === 'income') {
      return [id, {
        roadmapVersion: LATEST_ROADMAP_VERSION,
        checkpointId: incomeMission.planned ? '' : incomeMission.checkpoints[0]?.id ?? '',
        status: 'not-started',
        mode: incomeMission.planned ? 'planned' : 'background',
        completedCheckpointIds: [],
        blocker: '',
      }];
    }
    return [id, { ...legacy.missions[id], roadmapVersion: LEGACY_ROADMAP_VERSION }];
  })) as Record<MissionId, MissionProgress>;
  return {
    schemaVersion: 2,
    roadmapVersion: LATEST_ROADMAP_VERSION as '2.0.0',
    sampleData: legacy.sampleData,
    updatedAt: legacy.updatedAt,
    objective: legacy.objective,
    focusMissionId: legacy.focusMissionId,
    capacity: legacy.capacity,
    interviewMode: legacy.interviewMode,
    missions,
    plans: legacy.plans,
    evidence: legacy.evidence,
    events: legacy.events,
    readiness: legacy.readiness,
    opportunities: legacy.opportunities,
    archives: [],
    freelanceOpportunities: [],
    recalls: [],
  };
}
