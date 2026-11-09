import { z } from 'zod';
import {
  checkpointIdentity, getLatestMission, getMission, getMissionVersion, getMissions, getProgressForVersion,
  isVerifiedAppend, LATEST_ROADMAP_VERSION, prerequisitesFor,
} from './catalog';
import {
  dateSchema, idSchema, parseLegacyV1, migrateLegacyToLatest, text, timestampSchema, urlSchema,
} from './legacyState';
import { freelanceVerdicts, missionIds, opportunityStages, readinessKeys, recallMissionIds } from './types';
import { createFdeProgress } from './forwardDeployed/mission';
import { personalProofListSchema } from './personalProofSchema';
import { focusDurationSchema, focusEventInputSchema, focusRecordSignature, FocusRecordReplacedError, focusSessionsSchema } from './focusSession';
import type {
  AppState, Checkpoint, CheckpointStatus, DailyAction, Evidence, EvidenceInput,
  FocusEventKind, Mission, MissionId, MissionProgress, RecallEntry, RoadmapVersion,
} from './types';

export const STORAGE_KEY = 'careerhq.workspace.v1';
const MAX_RECORDS = 5000;
const MAX_PLAN_DAYS = 3660;
const MAX_COMPLETED = 250;
const HOUR_MS = 60 * 60 * 1000;

const missionIdSchema = z.enum(missionIds);
const roadmapVersionSchema = z.enum(['1.0.0', '2.0.0', '3.0.0', '4.0.0']);
const kindSchema = z.enum(['code', 'diagram', 'explanation', 'exercise', 'project', 'application', 'interview', 'note']);
const statusSchema = z.enum(['not-started', 'in-progress', 'completed']);
const readinessSchema = z.enum(['unassessed', 'building', 'ready']);
const outcomeSchema = z.enum(['needs-review', 'partial', 'independent']);

const progressSchema = z.object({
  roadmapVersion: roadmapVersionSchema,
  checkpointId: z.union([idSchema, z.literal('')]),
  status: statusSchema,
  mode: z.enum(['active', 'background', 'planned']),
  completedCheckpointIds: z.array(idSchema).max(MAX_COMPLETED),
  blocker: text(1000, 0),
}).strict();

const actionSchema = z.object({
  id: idSchema,
  date: dateSchema,
  missionId: missionIdSchema,
  checkpointId: idSchema,
  title: text(200),
  minutes: z.number().int().min(1).max(120),
  reason: text(500),
  completed: z.boolean(),
  roadmapVersion: roadmapVersionSchema.optional(),
}).strict();

const evidenceSchema = z.object({
  id: idSchema,
  missionId: missionIdSchema,
  checkpointId: idSchema,
  title: text(120, 3),
  summary: text(4000, 10),
  kind: kindSchema,
  url: urlSchema,
  visibility: z.literal('local'),
  createdAt: timestampSchema,
  completedCheckpoint: z.boolean(),
  roadmapVersion: roadmapVersionSchema.optional(),
}).strict();

const eventSchema = z.object({
  id: idSchema,
  type: text(80),
  title: text(200),
  missionId: missionIdSchema.optional(),
  createdAt: timestampSchema,
}).strict();

const opportunitySchema = z.object({
  id: idSchema,
  company: text(120),
  role: text(160),
  stage: z.enum(opportunityStages),
  url: urlSchema,
  notes: text(4000, 0),
  createdAt: timestampSchema,
  lane: z.enum(['easy-apply', 'ats', 'referral', 'other']).optional(),
  resumeVariant: text(120, 0).optional(),
  effortMinutes: z.number().int().min(0).max(1440).optional(),
  frictionScore: z.number().int().min(0).max(10).optional(),
}).strict();

const archiveSchema = z.object({
  missionId: missionIdSchema,
  archivedAt: timestampSchema,
  progress: progressSchema,
}).strict();

const freelanceSchema = z.object({
  id: idSchema,
  title: text(160),
  platform: text(120),
  url: urlSchema,
  skills: text(500, 0),
  budget: text(120, 0),
  verdict: z.enum(freelanceVerdicts),
  notes: text(2000, 0),
  createdAt: timestampSchema,
}).strict();

const recallSchema = z.object({
  id: idSchema,
  missionId: missionIdSchema,
  roadmapVersion: roadmapVersionSchema,
  checkpointId: idSchema,
  outcome: outcomeSchema,
  checks: z.object({ explanation: z.boolean(), diagram: z.boolean(), exercise: z.boolean() }).strict(),
  notes: text(2000, 0),
  createdAt: timestampSchema,
}).strict();

const stateSchema = z.object({
  schemaVersion: z.literal(2),
  roadmapVersion: z.literal(LATEST_ROADMAP_VERSION),
  sampleData: z.boolean(),
  updatedAt: timestampSchema,
  objective: text(500),
  focusMissionId: missionIdSchema,
  capacity: z.enum(['gentle', 'steady', 'deep']),
  interviewMode: z.boolean(),
  missions: z.object({
    pattern: progressSchema, system: progressSchema, escape: progressSchema,
    fabric: progressSchema, blueprint: progressSchema, credential: progressSchema,
    neural: progressSchema, algorithm: progressSchema, income: progressSchema, fde: progressSchema,
  }).strict(),
  plans: z.record(dateSchema, z.array(actionSchema).max(3))
    .refine((plans) => Object.keys(plans).length <= MAX_PLAN_DAYS, 'Too many saved plan dates'),
  evidence: z.array(evidenceSchema).max(MAX_RECORDS),
  events: z.array(eventSchema).max(MAX_RECORDS),
  readiness: z.object({
    'Coding patterns': readinessSchema, 'System design': readinessSchema,
    'Resume defense': readinessSchema, 'STAR stories': readinessSchema, 'Sustained coding': readinessSchema,
  }).strict(),
  opportunities: z.array(opportunitySchema).max(500),
  archives: z.array(archiveSchema).max(500),
  freelanceOpportunities: z.array(freelanceSchema).max(MAX_RECORDS),
  recalls: z.array(recallSchema).max(MAX_RECORDS),
  personalProof: personalProofListSchema.optional(),
  focusSessions: focusSessionsSchema.optional(),
}).strict();

const evidenceInputSchema = z.object({
  missionId: missionIdSchema,
  checkpointId: idSchema,
  title: z.string().trim().pipe(text(120, 3)),
  summary: z.string().trim().pipe(text(4000, 10)),
  kind: kindSchema,
  url: z.string().trim().pipe(urlSchema),
  advance: z.boolean(),
  criteriaConfirmed: z.boolean(),
  actionId: idSchema.optional(),
}).strict();

const recallInputSchema = z.object({
  missionId: z.enum(recallMissionIds),
  roadmapVersion: roadmapVersionSchema,
  checkpointId: idSchema,
  outcome: outcomeSchema,
  checks: z.object({ explanation: z.boolean(), diagram: z.boolean(), exercise: z.boolean() }).strict(),
  notes: z.string().trim().pipe(text(2000, 0)),
}).strict();

export function localDate(now = new Date()): string {
  if (!Number.isFinite(now.getTime())) throw new Error('Cannot format an invalid date');
  return `${String(now.getFullYear()).padStart(4, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function ensure(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function findMissionVersion(id: MissionId, version: RoadmapVersion): Mission | undefined {
  try {
    return getMissionVersion(id, version);
  } catch {
    return undefined;
  }
}

function prerequisitesSatisfied(mission: Mission, checkpoint: Checkpoint, progress: MissionProgress): boolean {
  return prerequisitesFor(mission, checkpoint).every((id) => progress.completedCheckpointIds.includes(id));
}

// A checkpoint is a valid thing to hold evidence, a plan action, or a recall against
// whenever it is already completed, or whenever its prerequisites are already satisfied
// (which always includes the current checkpoint). Switching which checkpoint is
// "current" never revokes this for a checkpoint that was previously unlocked.
function referenceable(mission: Mission, checkpoint: Checkpoint, progress: MissionProgress): boolean {
  return progress.completedCheckpointIds.includes(checkpoint.id) || prerequisitesSatisfied(mission, checkpoint, progress);
}

function evidenceKey(missionId: MissionId, checkpointId: string, version: RoadmapVersion): string {
  return `${missionId}:${version}:${checkpointId}`;
}

function hasCheckpointEvidence(keys: Set<string>, missionId: MissionId, checkpointId: string, version: RoadmapVersion): boolean {
  // Inheritance is one-way: a new record must never invent work in an older archive.
  return keys.has(evidenceKey(missionId, checkpointId, version)) ||
    keys.has(checkpointIdentity(missionId, checkpointId, version));
}

function hasLearningEvidence(state: AppState, missionId: MissionId, checkpointId: string, version: RoadmapVersion): boolean {
  const keys = new Set([
    evidenceKey(missionId, checkpointId, version), checkpointIdentity(missionId, checkpointId, version),
  ]);
  return state.evidence.some(entry => keys.has(evidenceKey(entry.missionId, entry.checkpointId, entry.roadmapVersion ?? '1.0.0')));
}

function validateMissionProgress(
  mission: Mission, progress: MissionProgress, missionId: MissionId, version: RoadmapVersion,
  completions: Set<string>, practicedKeys: Set<string>,
): void {
  if (mission.planned) {
    ensure(progress.mode === 'planned' && progress.checkpointId === '' &&
      progress.status === 'not-started' && progress.completedCheckpointIds.length === 0 &&
      progress.blocker === '', `${mission.name} is planned and cannot have progress`);
    return;
  }
  ensure(progress.mode !== 'planned', `${mission.name} has an available roadmap and cannot be planned`);
  ensure(progress.completedCheckpointIds.length <= mission.checkpoints.length, `Too many completed checkpoints for ${mission.id}`);
  const completedSet = new Set(progress.completedCheckpointIds);
  ensure(completedSet.size === progress.completedCheckpointIds.length, `Duplicate completed checkpoint for ${mission.id}`);
  for (const id of progress.completedCheckpointIds) {
    const checkpoint = mission.checkpoints.find((candidate) => candidate.id === id);
    ensure(checkpoint, `Completed checkpoint is unknown for ${mission.id}: ${id}`);
    ensure(prerequisitesFor(mission, checkpoint).every((prerequisite) => completedSet.has(prerequisite)),
      `Completed checkpoint has unmet prerequisites for ${mission.id}: ${id}`);
    ensure(hasCheckpointEvidence(completions, missionId, id, version), `Completed checkpoint requires completion evidence: ${id}`);
  }
  const finished = mission.checkpoints.length > 0 && progress.completedCheckpointIds.length === mission.checkpoints.length;
  if (finished) {
    ensure(progress.status === 'completed', `Final completion status is inconsistent for ${mission.id}`);
    ensure(progress.checkpointId === progress.completedCheckpointIds.at(-1),
      `Current checkpoint is inconsistent with prerequisites for ${mission.id}`);
  } else {
    ensure(progress.status !== 'completed', `Final completion status is inconsistent for ${mission.id}`);
    const checkpoint = mission.checkpoints.find((candidate) => candidate.id === progress.checkpointId);
    ensure(checkpoint && !completedSet.has(progress.checkpointId) &&
      prerequisitesFor(mission, checkpoint).every((prerequisite) => completedSet.has(prerequisite)),
    `Current checkpoint is inconsistent with prerequisites for ${mission.id}`);
    ensure(progress.status !== 'not-started' || !hasCheckpointEvidence(practicedKeys, missionId, checkpoint.id, version),
      `A checkpoint with evidence must be started: ${checkpoint.id}`);
  }
}

function validateV2Relations(state: AppState): AppState {
  const ids = new Set<string>();
  const unique = (id: string) => {
    ensure(!ids.has(id), `Duplicate record identifier: ${id}`);
    ids.add(id);
  };

  const completions = new Set<string>();
  const completionIdentities = new Set<string>();
  const practicedKeys = new Set<string>();
  for (const evidence of state.evidence) {
    unique(evidence.id);
    const version = evidence.roadmapVersion ?? '1.0.0';
    const mission = findMissionVersion(evidence.missionId, version);
    ensure(mission, `Evidence references an unknown roadmap version: ${evidence.missionId} ${version}`);
    const checkpoint = mission.checkpoints.find((candidate) => candidate.id === evidence.checkpointId);
    ensure(checkpoint, `Evidence references an unknown checkpoint: ${evidence.checkpointId}`);
    const progress = getProgressForVersion(state, evidence.missionId, version);
    ensure(progress, `Evidence references a mission/version with no matching progress: ${evidence.missionId} ${version}`);
    ensure(referenceable(mission, checkpoint, progress), `Evidence references a locked checkpoint: ${evidence.checkpointId}`);
    if (evidence.checkpointId === progress.checkpointId) {
      ensure(progress.status !== 'not-started', `A checkpoint with evidence must be started: ${evidence.checkpointId}`);
    }
    practicedKeys.add(evidenceKey(evidence.missionId, evidence.checkpointId, version));
    if (evidence.completedCheckpoint) {
      const key = checkpointIdentity(evidence.missionId, evidence.checkpointId, version);
      ensure(progress.completedCheckpointIds.includes(evidence.checkpointId), `Completion evidence has no completed checkpoint: ${evidence.checkpointId}`);
      ensure(!completionIdentities.has(key), `Duplicate checkpoint completion: ${evidence.checkpointId}`);
      completionIdentities.add(key);
      completions.add(evidenceKey(evidence.missionId, evidence.checkpointId, version));
    }
  }

  for (const missionId of missionIds) {
    const progress = state.missions[missionId];
    const mission = findMissionVersion(missionId, progress.roadmapVersion);
    ensure(mission, `Unknown roadmap version for ${missionId}: ${progress.roadmapVersion}`);
    validateMissionProgress(mission, progress, missionId, progress.roadmapVersion, completions, practicedKeys);
    if (mission.appendFrom) {
      const previous = findMissionVersion(missionId, mission.appendFrom);
      const previousProgress = getProgressForVersion(state, missionId, mission.appendFrom);
      if (previous && previousProgress && isVerifiedAppend(mission, previous)) {
        ensure(previousProgress.completedCheckpointIds.every(id => progress.completedCheckpointIds.includes(id)),
          `Appended roadmap must preserve completed checkpoints for ${missionId}`);
      }
    }
  }

  const archiveKeys = new Set<string>();
  for (const archive of state.archives) {
    const key = `${archive.missionId}:${archive.progress.roadmapVersion}`;
    ensure(!archiveKeys.has(key), `Duplicate archive for ${archive.missionId} ${archive.progress.roadmapVersion}`);
    archiveKeys.add(key);
    ensure(archive.progress.roadmapVersion !== state.missions[archive.missionId].roadmapVersion,
      `Archive duplicates the active roadmap version for ${archive.missionId}`);
    const mission = findMissionVersion(archive.missionId, archive.progress.roadmapVersion);
    ensure(mission, `Archive references an unknown roadmap: ${archive.missionId} ${archive.progress.roadmapVersion}`);
    validateMissionProgress(mission, archive.progress, archive.missionId, archive.progress.roadmapVersion, completions, practicedKeys);
  }

  for (const [date, actions] of Object.entries(state.plans)) {
    const dayMissions = new Set<MissionId>();
    ensure(actions.reduce((sum, action) => sum + action.minutes, 0) <= 120, `Plan exceeds 120 minutes on ${date}`);
    for (const action of actions) {
      unique(action.id);
      ensure(action.date === date, `Action date does not match its plan: ${action.id}`);
      ensure(!dayMissions.has(action.missionId), `Duplicate mission in plan for ${date}: ${action.missionId}`);
      dayMissions.add(action.missionId);
      const version = action.roadmapVersion ?? '1.0.0';
      const mission = findMissionVersion(action.missionId, version);
      ensure(mission, `Plan references an unknown roadmap version: ${action.missionId} ${version}`);
      const checkpoint = mission.checkpoints.find((candidate) => candidate.id === action.checkpointId);
      ensure(checkpoint, `Plan references an unknown checkpoint: ${action.checkpointId}`);
      const progress = getProgressForVersion(state, action.missionId, version);
      ensure(progress, `Plan references a mission/version with no matching progress: ${action.missionId} ${version}`);
      ensure(referenceable(mission, checkpoint, progress), `Plan references a locked checkpoint: ${action.checkpointId}`);
      ensure(!action.completed || hasCheckpointEvidence(practicedKeys, action.missionId, action.checkpointId, version),
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
  for (const freelance of state.freelanceOpportunities) unique(freelance.id);
  for (const proof of state.personalProof ?? []) unique(proof.id);
  for (const session of state.focusSessions ?? []) {
    unique(session.id);
    for (const event of session.events) unique(event.id);
  }

  for (const recall of state.recalls) {
    unique(recall.id);
    ensure(recallMissionIds.some(id => id === recall.missionId),
      `Recall is only supported for pattern, system or fde: ${recall.missionId}`);
    const mission = findMissionVersion(recall.missionId, recall.roadmapVersion);
    ensure(mission, `Recall references an unknown roadmap version: ${recall.missionId} ${recall.roadmapVersion}`);
    const checkpoint = mission.checkpoints.find((candidate) => candidate.id === recall.checkpointId);
    ensure(checkpoint, `Recall references an unknown checkpoint: ${recall.checkpointId}`);
    const progress = getProgressForVersion(state, recall.missionId, recall.roadmapVersion);
    ensure(progress, `Recall references a mission/version with no matching progress: ${recall.missionId} ${recall.roadmapVersion}`);
    ensure(referenceable(mission, checkpoint, progress), `Recall references a locked checkpoint: ${recall.checkpointId}`);
    ensure(hasCheckpointEvidence(practicedKeys, recall.missionId, recall.checkpointId, recall.roadmapVersion),
      `Recall requires prior learning evidence: ${recall.checkpointId}`);
    if (recall.outcome === 'independent') {
      ensure(recall.checks.explanation && recall.checks.exercise &&
        (recall.missionId === 'pattern' || recall.checks.diagram),
      'Independent recall is missing its required self-checks');
    }
  }

  return state;
}

function parseV2Schema(value: unknown): AppState {
  const result = stateSchema.safeParse(value);
  if (!result.success) {
    const issue = result.error.issues[0];
    throw new Error(`Invalid workspace at ${issue.path.join('.') || 'root'}: ${issue.message}`);
  }
  return result.data;
}

export function parseState(value: unknown): AppState {
  if (isRecord(value) && value.schemaVersion === 1) {
    return validateV2Relations(parseV2Schema(migrateLegacyToLatest(parseLegacyV1(value))));
  }
  if (isRecord(value) && value.schemaVersion === 2 && isRecord(value.missions) &&
      !Object.hasOwn(value.missions, 'fde')) {
    value = { ...value, missions: { ...value.missions, fde: createFdeProgress() } };
  }
  return validateV2Relations(parseV2Schema(value));
}

function nextTimestamp(state: AppState): string {
  // A moved-back system clock must not reorder an imported event history.
  return new Date(Math.max(Date.now(), Date.parse(state.updatedAt) + 1,
    ...state.events.map((event) => Date.parse(event.createdAt) + 1),
    ...(state.focusSessions ?? []).map(session => Date.parse(session.events.at(-1)?.at ?? session.startedAt) + 1))).toISOString();
}

function nextId(state: AppState, prefix: string): string {
  const existing = new Set([
    ...state.evidence.map((entry) => entry.id),
    ...state.events.map((entry) => entry.id),
    ...state.opportunities.map((entry) => entry.id),
    ...state.freelanceOpportunities.map((entry) => entry.id),
    ...state.recalls.map((entry) => entry.id),
    ...(state.personalProof ?? []).map((entry) => entry.id),
    ...(state.focusSessions ?? []).flatMap(session => [session.id, ...session.events.map(event => event.id)]),
    ...Object.values(state.plans).flat().map((entry) => entry.id),
  ]);
  let sequence = state.evidence.length + state.events.length + state.freelanceOpportunities.length + state.recalls.length +
    (state.focusSessions ?? []).reduce((count, session) => count + 1 + session.events.length, 0) + 1;
  while (existing.has(`${prefix}-${sequence}`)) sequence += 1;
  return `${prefix}-${sequence}`;
}

export function startFocusSession(state: AppState, plannedSeconds: number): AppState {
  const duration = focusDurationSchema.parse(plannedSeconds);
  const now = nextTimestamp(state);
  return parseState({
    ...state, updatedAt: now,
    focusSessions: [...(state.focusSessions ?? []), {
      id: nextId(state, 'focus-session'), startedAt: now, plannedSeconds: duration, events: [],
    }],
  });
}

export function recordFocusSessionEvent(
  state: AppState,
  input: { sessionId: string; kind: FocusEventKind; elapsedMs: number },
  expectedSignature?: string,
): AppState {
  const value = focusEventInputSchema.parse(input);
  const sessions = state.focusSessions ?? [];
  const current = sessions.find(session => session.id === value.sessionId);
  if (expectedSignature !== undefined && (!current || focusRecordSignature(current) !== expectedSignature)) {
    throw new FocusRecordReplacedError();
  }
  ensure(current, 'That focus session does not exist.');
  const now = nextTimestamp(state);
  const event = { id: nextId(state, 'focus-event'), kind: value.kind, at: now, elapsedMs: value.elapsedMs };
  return parseState({
    ...state, updatedAt: now,
    focusSessions: sessions.map(session => session.id === value.sessionId
      ? { ...session, events: [...session.events, event] } : session),
  });
}

function sampleSummary(mission: Mission, checkpoint: Checkpoint): string {
  return `Synthetic practice example for ${mission.name}: ${checkpoint.action} `
    + 'This is a clearly fictional demonstration, not a personal baseline or a real credential.';
}

export function createInitialState(sampleData = true, version?: RoadmapVersion): AppState {
  const missionProgress = (id: MissionId): MissionProgress => {
    if (id === 'fde') return createFdeProgress();
    const mission = version === undefined || version === '3.0.0' || version === '4.0.0' ? getLatestMission(id)
      : getMissionVersion(id, id === 'income' ? '2.0.0' : version);
    return {
      roadmapVersion: mission.roadmapVersion,
      checkpointId: mission.planned ? '' : mission.checkpoints[0]?.id ?? '',
      status: 'not-started',
      mode: mission.planned ? 'planned' : (['pattern', 'system', 'escape'].includes(id) ? 'active' : 'background'),
      completedCheckpointIds: [],
      blocker: '',
    };
  };
  let state: AppState = {
    schemaVersion: 2,
    roadmapVersion: LATEST_ROADMAP_VERSION,
    sampleData,
    updatedAt: new Date().toISOString(),
    objective: 'Build evidence, one calm step at a time.',
    focusMissionId: 'pattern',
    capacity: 'steady',
    interviewMode: false,
    missions: Object.fromEntries(missionIds.map((id) => [id, missionProgress(id)])) as Record<MissionId, MissionProgress>,
    plans: {},
    evidence: [],
    events: [],
    readiness: Object.fromEntries(readinessKeys.map((key) => [key, 'unassessed'])) as AppState['readiness'],
    opportunities: [],
    archives: [],
    freelanceOpportunities: [],
    recalls: [],
  };
  if (!sampleData) return parseState(state);
  for (const id of (['pattern', 'system', 'escape'] as const)) {
    const mission = getMission(id, state);
    const checkpoint = mission.checkpoints.find((candidate) => candidate.id === state.missions[id].checkpointId);
    if (!checkpoint) continue;
    state = recordEvidence(state, {
      missionId: id,
      checkpointId: state.missions[id].checkpointId,
      title: `Fictional sample: ${checkpoint.title}`,
      summary: sampleSummary(mission, checkpoint),
      kind: 'explanation',
      url: '',
      advance: true,
      criteriaConfirmed: true,
    });
  }
  const practiceMission = getMission('pattern', state);
  const practiceCheckpoint = practiceMission.checkpoints.find((candidate) => candidate.id === state.missions.pattern.checkpointId);
  if (practiceCheckpoint) {
    state = recordEvidence(state, {
      missionId: 'pattern',
      checkpointId: state.missions.pattern.checkpointId,
      title: `Fictional sample: ${practiceCheckpoint.title} warm-up`,
      summary: sampleSummary(practiceMission, practiceCheckpoint),
      kind: 'explanation',
      url: '',
      advance: false,
      criteriaConfirmed: false,
    });
  }
  state.readiness['Coding patterns'] = 'building';
  state.readiness['System design'] = 'building';
  state.opportunities = [{
    id: 'sample-opportunity-1',
    company: 'Example Harbor Labs (fictional)',
    role: 'Software Engineer (sample)',
    stage: 'Found',
    url: 'https://example.com/careers',
    notes: 'Fictional demonstration only. No real application, employer, or interview is represented.',
    createdAt: state.updatedAt,
  }];
  return parseState(state);
}

export function getSaveState(mission: Mission, state: AppState): {
  stage: string;
  checkpoint: Checkpoint | undefined;
  status: CheckpointStatus;
  next: string;
  completed: number;
  total: number;
} {
  if (mission.planned) {
    return {
      stage: 'Planned', checkpoint: undefined, status: 'not-started',
      next: 'Awaiting canonical roadmap', completed: 0, total: 0,
    };
  }
  const progress = getProgressForVersion(state, mission.id, mission.roadmapVersion);
  if (!progress) {
    return {
      stage: 'Preview',
      checkpoint: undefined,
      status: 'not-started',
      next: mission.checkpoints[0]?.title ?? mission.completionLabel ?? 'Mission complete',
      completed: 0,
      total: mission.checkpoints.length,
    };
  }
  const checkpoint = mission.checkpoints.find((candidate) => candidate.id === progress.checkpointId);
  let next: string;
  if (progress.status === 'completed') {
    next = mission.completionLabel ?? 'Mission complete';
  } else {
    const hypothetical = new Set([...progress.completedCheckpointIds, progress.checkpointId]);
    const upcoming = mission.checkpoints.find((candidate) => !hypothetical.has(candidate.id) &&
      prerequisitesFor(mission, candidate).every((id) => hypothetical.has(id)));
    next = upcoming ? upcoming.title : (mission.completionLabel ?? 'Mission complete');
  }
  return {
    stage: checkpoint?.stage ?? 'Unavailable',
    checkpoint,
    status: progress.status,
    next,
    completed: progress.completedCheckpointIds.length,
    total: mission.checkpoints.length,
  };
}

export function countCompletedCheckpoints(state: AppState): number {
  const completed = new Set<string>();
  for (const missionId of missionIds) {
    const progress = state.missions[missionId];
    progress.completedCheckpointIds.forEach(id => completed.add(checkpointIdentity(missionId, id, progress.roadmapVersion)));
  }
  for (const { missionId, progress } of state.archives) {
    progress.completedCheckpointIds.forEach(id => completed.add(checkpointIdentity(missionId, id, progress.roadmapVersion)));
  }
  return completed.size;
}

export function generatePlan(state: AppState, date = localDate()): DailyAction[] {
  dateSchema.parse(date);
  if (Object.hasOwn(state.plans, date)) return state.plans[date];
  const interviewWeight: Partial<Record<MissionId, number>> = { escape: 3, system: 2, pattern: 1 };
  const candidates = getMissions(state).filter((mission) => {
    const progress = state.missions[mission.id];
    return !mission.planned && progress.mode === 'active' &&
      progress.status !== 'completed' && !progress.blocker.trim();
  }).sort((left, right) => {
    const focus = Number(right.id === state.focusMissionId) - Number(left.id === state.focusMissionId);
    if (focus) return focus;
    return state.interviewMode ? (interviewWeight[right.id] ?? 0) - (interviewWeight[left.id] ?? 0) : 0;
  });
  const actions: DailyAction[] = [];
  let remaining = state.capacity === 'gentle' ? 15 : state.capacity === 'steady' ? 75 : 120;
  for (const mission of candidates) {
    if (actions.length === (state.capacity === 'gentle' ? 1 : 3)) break;
    const checkpoint = getSaveState(mission, state).checkpoint;
    if (!checkpoint) continue;
    const minutes = state.capacity === 'gentle' ? Math.min(15, checkpoint.minutes) : checkpoint.minutes;
    if (minutes > remaining) continue;
    const reason = mission.id === state.focusMissionId ? 'Your focus mission.'
      : state.interviewMode && interviewWeight[mission.id] ? 'Prioritized for interview preparation.'
        : 'A small step in an active mission.';
    actions.push({
      id: `plan-${date}-${mission.id}-${mission.roadmapVersion}-${checkpoint.id}-${state.capacity}`,
      date, missionId: mission.id, checkpointId: checkpoint.id,
      title: state.capacity === 'gentle' ? checkpoint.recoveryAction : checkpoint.action,
      minutes,
      reason: `${reason} ${state.capacity === 'gentle' ? 'Recovery pace; no catch-up required.' : 'Only the current checkpoint; no overdue carryover.'}`,
      completed: false,
      roadmapVersion: mission.roadmapVersion,
    });
    remaining -= minutes;
  }
  return actions;
}

export function recordEvidence(state: AppState, input: EvidenceInput): AppState {
  const next = parseState(state);
  const data = evidenceInputSchema.parse(input);
  const mission = getMission(data.missionId, next);
  const progress = next.missions[data.missionId];
  const checkpoint = mission.checkpoints.find((candidate) => candidate.id === data.checkpointId);
  ensure(checkpoint, `Unknown checkpoint "${data.checkpointId}" for ${data.missionId}`);
  ensure(!mission.planned && (progress.mode === 'active' || progress.mode === 'background'), 'Evidence requires an available mission');
  ensure(data.actionId === undefined || progress.mode === 'active', 'Daily plan evidence requires an active mission');
  ensure(!progress.blocker.trim(), 'Resolve the mission blocker before recording evidence');
  ensure(progress.status !== 'completed', 'This mission is already complete');
  ensure(progress.checkpointId === data.checkpointId, 'Evidence must target the current checkpoint');
  ensure(!data.advance || data.criteriaConfirmed, 'Confirm all checkpoint criteria before advancing');
  const today = localDate();
  if (data.actionId !== undefined) {
    const action = next.plans[today]?.find((candidate) => candidate.id === data.actionId);
    ensure(action && !action.completed && action.missionId === data.missionId &&
      action.checkpointId === data.checkpointId && (action.roadmapVersion ?? '1.0.0') === progress.roadmapVersion,
    "This action is no longer available for today's current checkpoint");
  }
  const createdAt = nextTimestamp(next);
  const evidenceEntry: Evidence = {
    id: nextId(next, 'evidence'), missionId: data.missionId, checkpointId: data.checkpointId,
    title: data.title, summary: data.summary, kind: data.kind, url: data.url,
    visibility: 'local', createdAt, completedCheckpoint: data.advance,
    roadmapVersion: progress.roadmapVersion,
  };
  next.evidence.push(evidenceEntry);
  progress.status = 'in-progress';
  if (data.advance) {
    const completedIds = [...progress.completedCheckpointIds, data.checkpointId];
    progress.completedCheckpointIds = completedIds;
    const remaining = mission.checkpoints.filter((candidate) => !completedIds.includes(candidate.id));
    if (remaining.length === 0) {
      progress.checkpointId = data.checkpointId;
      progress.status = 'completed';
    } else {
      const eligible = remaining.find((candidate) => prerequisitesFor(mission, candidate).every((id) => completedIds.includes(id)));
      ensure(eligible, 'No eligible checkpoint is reachable next: check the roadmap for an unreachable prerequisite');
      const hasPriorEvidence = hasLearningEvidence(next, data.missionId, eligible.id, progress.roadmapVersion);
      progress.checkpointId = eligible.id;
      progress.status = hasPriorEvidence ? 'in-progress' : 'not-started';
    }
  }
  next.plans[today]?.forEach((action) => {
    if (action.missionId === data.missionId && action.checkpointId === data.checkpointId &&
      (action.roadmapVersion ?? '1.0.0') === progress.roadmapVersion &&
      (data.advance || action.id === data.actionId)) action.completed = true;
  });
  next.events.push({
    id: nextId(next, 'event'),
    type: data.advance ? 'checkpoint-completed' : 'evidence-recorded',
    title: data.advance ? `Completed: ${checkpoint.title}` : `Evidence: ${data.title}`,
    missionId: data.missionId, createdAt,
  });
  next.updatedAt = createdAt;
  return parseState(next);
}

export function recordChange(state: AppState, title: string, missionId?: MissionId): AppState {
  const next = parseState(state);
  const validatedTitle = z.string().trim().pipe(text(200)).parse(title);
  if (missionId !== undefined) missionIdSchema.parse(missionId);
  const createdAt = nextTimestamp(next);
  next.events.push({
    id: nextId(next, 'event'),
    type: 'workspace-change',
    title: validatedTitle,
    ...(missionId === undefined ? {} : { missionId }),
    createdAt,
  });
  next.updatedAt = createdAt;
  return parseState(next);
}

/**
 * Explicitly select a different, already-unlocked, uncompleted checkpoint on the
 * mission's active roadmap version - a source-defined branch choice, not a forced
 * completion of whatever was previously current. Never touches other missions,
 * archives, or completed checkpoints.
 */
export function activateCheckpoint(state: AppState, missionId: MissionId, checkpointId: string): AppState {
  const next = parseState(state);
  missionIdSchema.parse(missionId);
  idSchema.parse(checkpointId);
  const mission = getMission(missionId, next);
  const progress = next.missions[missionId];
  ensure(!mission.planned, 'Cannot activate a checkpoint on a planned mission');
  ensure(progress.status !== 'completed', 'This mission is already complete');
  const checkpoint = mission.checkpoints.find((candidate) => candidate.id === checkpointId);
  ensure(checkpoint, `Unknown checkpoint "${checkpointId}" for ${missionId}`);
  ensure(!progress.completedCheckpointIds.includes(checkpointId), 'This checkpoint is already completed');
  ensure(prerequisitesSatisfied(mission, checkpoint, progress), 'This checkpoint is locked by its prerequisites');
  const hasEvidence = hasLearningEvidence(next, missionId, checkpointId, progress.roadmapVersion);
  progress.checkpointId = checkpointId;
  progress.status = hasEvidence ? 'in-progress' : 'not-started';
  const createdAt = nextTimestamp(next);
  next.events.push({
    id: nextId(next, 'event'), type: 'checkpoint-activated',
    title: `Switched focus to: ${checkpoint.title}`, missionId, createdAt,
  });
  next.updatedAt = createdAt;
  return parseState(next);
}

/**
 * Adopt the latest canonical roadmap for a mission currently on an older one. The old
 * progress is archived exactly as-is. A verified append retains that progress; all other
 * updates start clean without granted completions. Existing records keep their original
 * versions. Already-generated plans remain historical until explicitly refreshed.
 */
export function upgradeRoadmap(state: AppState, missionId: MissionId): AppState {
  const next = parseState(state);
  missionIdSchema.parse(missionId);
  const progress = next.missions[missionId];
  const latest = getLatestMission(missionId);
  ensure(progress.roadmapVersion !== latest.roadmapVersion, 'This roadmap is already on the latest version');
  ensure(!next.archives.some((archive) => archive.missionId === missionId && archive.progress.roadmapVersion === progress.roadmapVersion),
    'This roadmap version is already archived');
  const previous = getMissionVersion(missionId, progress.roadmapVersion);
  const preservesProgress = isVerifiedAppend(latest, previous);
  ensure(latest.appendFrom !== previous.roadmapVersion || preservesProgress,
    'The declared roadmap append does not preserve the previous checkpoint definitions');
  const createdAt = nextTimestamp(next);
  next.archives.push({ missionId, archivedAt: createdAt, progress: { ...progress, completedCheckpointIds: [...progress.completedCheckpointIds] } });
  const newMode = latest.planned ? 'planned' : (progress.mode === 'planned' ? 'background' : progress.mode);
  if (preservesProgress) {
    next.missions[missionId] = { ...progress, roadmapVersion: latest.roadmapVersion };
    if (progress.status === 'completed') {
      const eligible = latest.checkpoints.find(checkpoint => !progress.completedCheckpointIds.includes(checkpoint.id) &&
        prerequisitesSatisfied(latest, checkpoint, progress));
      ensure(eligible, 'No eligible checkpoint is reachable after the roadmap append');
      next.missions[missionId].checkpointId = eligible.id;
      next.missions[missionId].status = 'not-started';
    }
  } else {
    next.missions[missionId] = {
      roadmapVersion: latest.roadmapVersion,
      checkpointId: latest.planned ? '' : latest.checkpoints[0]?.id ?? '',
      status: 'not-started',
      mode: newMode,
      completedCheckpointIds: [],
      blocker: '',
    };
  }
  next.events.push({
    id: nextId(next, 'event'), type: 'roadmap-upgraded',
    title: `Upgraded ${latest.name} to roadmap ${latest.roadmapVersion}`, missionId, createdAt,
  });
  next.updatedAt = createdAt;
  return parseState(next);
}

export interface RoadmapUpgrade {
  readonly missionId: MissionId;
  readonly name: string;
  readonly fromVersion: RoadmapVersion;
  readonly toVersion: RoadmapVersion;
  readonly preservesProgress: boolean;
}

export interface RoadmapUpgradePreview {
  readonly upgrades: readonly RoadmapUpgrade[];
  /** In-memory confirmation guard only; never persist or display this workspace snapshot. */
  readonly workspaceSignature: string;
}

/** Read-only preview; only the catalog's allowlisted verified appends retain progress. */
export function previewRoadmapUpgrades(state: AppState): RoadmapUpgradePreview {
  const current = parseState(state);
  return {
    upgrades: missionIds.flatMap(missionId => {
      const progress = current.missions[missionId];
      const latest = getLatestMission(missionId);
      if (progress.roadmapVersion === latest.roadmapVersion) return [];
      const previous = getMissionVersion(missionId, progress.roadmapVersion);
      return [{
        missionId, name: latest.name, fromVersion: previous.roadmapVersion,
        toVersion: latest.roadmapVersion, preservesProgress: isVerifiedAppend(latest, previous),
      }];
    }),
    workspaceSignature: JSON.stringify(current),
  };
}

/**
 * Run inside one workspace commit. Every upgrade uses the single-mission rules;
 * any stale confirmation or validation error discards the entire prospective result.
 */
export function upgradeAllRoadmaps(state: AppState, confirmed: RoadmapUpgradePreview): AppState {
  let next = parseState(state);
  const current = previewRoadmapUpgrades(next);
  ensure(current.workspaceSignature === confirmed.workspaceSignature &&
    JSON.stringify(current.upgrades) === JSON.stringify(confirmed.upgrades),
  'The workspace changed since this roadmap preview. Review the roadmaps again before adopting.');
  ensure(current.upgrades.length > 0, 'All documented roadmaps are already adopted.');
  for (const upgrade of current.upgrades) next = upgradeRoadmap(next, upgrade.missionId);
  return next;
}

/**
 * A read-only, self-reported spaced-repetition check-in: it can only reference a
 * checkpoint that already has learning evidence on the matching current or archived
 * snapshot, and it never mutates checkpoint completion or status.
 */
export function recordRecall(state: AppState, input: Omit<RecallEntry, 'id' | 'createdAt'>): AppState {
  const next = parseState(state);
  const data = recallInputSchema.parse(input);
  const mission = getMissionVersion(data.missionId, data.roadmapVersion);
  const checkpoint = mission.checkpoints.find((candidate) => candidate.id === data.checkpointId);
  ensure(checkpoint, `Unknown checkpoint "${data.checkpointId}" for ${data.missionId}`);
  const progress = getProgressForVersion(next, data.missionId, data.roadmapVersion);
  ensure(progress, `No ${data.roadmapVersion} roadmap progress exists for ${data.missionId}`);
  ensure(referenceable(mission, checkpoint, progress), 'Recall requires an unlocked or completed checkpoint');
  const hasPriorLearning = hasLearningEvidence(next, data.missionId, data.checkpointId, data.roadmapVersion);
  ensure(hasPriorLearning, 'Recall requires prior learning evidence for this checkpoint');
  if (data.outcome === 'independent') {
    if (data.missionId === 'pattern') {
      ensure(data.checks.explanation && data.checks.exercise, 'Independent pattern recall requires explanation and exercise checks');
    } else {
      ensure(data.checks.explanation && data.checks.diagram && data.checks.exercise,
        `Independent ${data.missionId === 'fde' ? 'FDE' : 'system'} recall requires all three checks`);
    }
  }
  const createdAt = nextTimestamp(next);
  next.recalls.push({
    id: nextId(next, 'recall'), missionId: data.missionId, roadmapVersion: data.roadmapVersion,
    checkpointId: data.checkpointId, outcome: data.outcome, checks: data.checks, notes: data.notes, createdAt,
  });
  next.events.push({
    id: nextId(next, 'event'), type: 'recall-reviewed', title: `Reviewed: ${checkpoint.title}`,
    missionId: data.missionId, createdAt,
  });
  next.updatedAt = createdAt;
  return parseState(next);
}

export interface RecallSummary {
  status: 'not-started' | 'learning' | 'practiced' | 'needs-review' | 'retained';
  nextReviewAt: string | null;
  lastReviewedAt?: string;
}

/**
 * A derived, self-reported retention status for one checkpoint - not an AI grade. It is
 * purely a function of this checkpoint's evidence and recall history:
 *  - no evidence at all: not-started.
 *  - evidence but no recall yet: learning, due 24h after the first evidence.
 *  - any recall: practiced, unless the most recent recall needs review.
 *  - the most recent recall needing review always reports needs-review, even after a
 *    prior retained result - it downgrades the retention flag without touching
 *    checkpoint completion.
 *  - retained requires two independent recalls: the first at least 24h after the first
 *    evidence, and the second at least 96h after the first evidence AND at least 48h
 *    after the first independent recall.
 */
export function recallSummary(state: AppState, missionId: MissionId, checkpointId: string, version: RoadmapVersion): RecallSummary {
  const validated = state;
  const mission = getMissionVersion(missionId, version);
  ensure(mission.checkpoints.some((candidate) => candidate.id === checkpointId),
    `Unknown checkpoint "${checkpointId}" for ${missionId} roadmap ${version}`);
  const referenceKeys = new Set([evidenceKey(missionId, checkpointId, version), checkpointIdentity(missionId, checkpointId, version)]);
  const evidenceForCheckpoint = validated.evidence
    .filter((entry) => referenceKeys.has(evidenceKey(entry.missionId, entry.checkpointId, entry.roadmapVersion ?? '1.0.0')))
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
  if (evidenceForCheckpoint.length === 0) return { status: 'not-started', nextReviewAt: null };
  const firstEvidenceAt = Date.parse(evidenceForCheckpoint[0].createdAt);

  const reviews = validated.recalls
    .filter((entry) => referenceKeys.has(evidenceKey(entry.missionId, entry.checkpointId, entry.roadmapVersion)))
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
  if (reviews.length === 0) {
    return { status: 'learning', nextReviewAt: new Date(firstEvidenceAt + 24 * HOUR_MS).toISOString() };
  }
  const lastReviewedAt = reviews.at(-1)!.createdAt;
  if (reviews.at(-1)!.outcome === 'needs-review') {
    return { status: 'needs-review', nextReviewAt: null, lastReviewedAt };
  }
  const independentReviews = reviews.filter((entry) => entry.outcome === 'independent' &&
    Date.parse(entry.createdAt) >= firstEvidenceAt + 24 * HOUR_MS);
  if (independentReviews.length === 0) {
    return { status: 'practiced', nextReviewAt: new Date(firstEvidenceAt + 24 * HOUR_MS).toISOString(), lastReviewedAt };
  }
  const firstIndependentAt = Date.parse(independentReviews[0].createdAt);
  const dueForSecond = new Date(Math.max(firstEvidenceAt + 96 * HOUR_MS, firstIndependentAt + 48 * HOUR_MS)).toISOString();
  if (independentReviews.length === 1) {
    return { status: 'practiced', nextReviewAt: dueForSecond, lastReviewedAt };
  }
  const retained = reviews.at(-1)!.outcome === 'independent' && independentReviews.some(first =>
    independentReviews.some(second => Date.parse(second.createdAt) >= firstEvidenceAt + 96 * HOUR_MS &&
      Date.parse(second.createdAt) >= Date.parse(first.createdAt) + 48 * HOUR_MS));
  if (retained) return { status: 'retained', nextReviewAt: null, lastReviewedAt };
  return { status: 'practiced', nextReviewAt: dueForSecond, lastReviewedAt };
}
