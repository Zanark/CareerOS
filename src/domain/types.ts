export const missionIds = ['pattern', 'system', 'escape', 'fabric', 'blueprint', 'credential', 'neural', 'algorithm', 'income', 'fde'] as const;
export type MissionId = typeof missionIds[number];
export const recallMissionIds = ['pattern', 'system', 'fde'] as const;
export type RoadmapVersion = '1.0.0' | '2.0.0' | '3.0.0' | '4.0.0';
export type Capacity = 'gentle' | 'steady' | 'deep';
export type MissionMode = 'active' | 'background' | 'planned';
export type CheckpointStatus = 'not-started' | 'in-progress' | 'completed';
export type EvidenceKind = 'code' | 'diagram' | 'explanation' | 'exercise' | 'project' | 'application' | 'interview' | 'note';
export type Readiness = 'unassessed' | 'building' | 'ready';
export const readinessKeys = ['Coding patterns', 'System design', 'Resume defense', 'STAR stories', 'Sustained coding'] as const;
export const opportunityStages = ['Found', 'Screening', 'Recruiter', 'Technical', 'System design', 'Onsite', 'Offer', 'Accepted', 'Rejected', 'Withdrawn'] as const;
export type OpportunityStage = typeof opportunityStages[number];

export interface Checkpoint {
  id: string;
  stage: string;
  title: string;
  action: string;
  recoveryAction: string;
  minutes: number;
  criteria: string[];
  sourceId?: string;
  /** Section 1-50 in the expanded DSA study source; absent on retained checkpoints. */
  studySection?: number;
  topics?: string[];
  prerequisites?: string[];
  source?: SourceReference;
  granularity?: 'checkpoint' | 'topic-group' | 'phase' | 'workflow' | 'sprint';
}

export interface SourceReference {
  document: string;
  section: string;
  page?: number;
  url?: string;
}

export interface RoadmapStage {
  id: string;
  title: string;
  summary: string;
  topics: string[];
  checkpointIds: string[];
  optional?: boolean;
  source: SourceReference;
}

export interface ReferenceGroup {
  title: string;
  kind: 'optional' | 'future' | 'parallel' | 'projects' | 'forecast';
  items: { title: string; detail: string; href?: string }[];
}

export interface Mission {
  id: MissionId;
  name: string;
  operation: string;
  description: string;
  purpose: string;
  color: string;
  icon: string;
  owner: string;
  roadmapVersion: RoadmapVersion;
  appendFrom?: RoadmapVersion;
  planned: boolean;
  dependencies: MissionId[];
  checkpoints: Checkpoint[];
  stages?: RoadmapStage[];
  sources?: SourceReference[];
  sourceNotes?: string[];
  referenceGroups?: ReferenceGroup[];
  resources?: { label: string; url: string }[];
  coverage?: 'documented' | 'phase-level' | 'partial' | 'sprint' | 'forecast';
  completionLabel?: string;
}

export interface MissionProgress {
  roadmapVersion: RoadmapVersion;
  checkpointId: string;
  status: CheckpointStatus;
  mode: MissionMode;
  completedCheckpointIds: string[];
  blocker: string;
}

export interface DailyAction {
  id: string;
  date: string;
  missionId: MissionId;
  checkpointId: string;
  title: string;
  minutes: number;
  reason: string;
  completed: boolean;
  roadmapVersion?: RoadmapVersion;
}

export interface Evidence {
  id: string;
  missionId: MissionId;
  checkpointId: string;
  title: string;
  summary: string;
  kind: EvidenceKind;
  url: string;
  visibility: 'local';
  createdAt: string;
  completedCheckpoint: boolean;
  roadmapVersion?: RoadmapVersion;
}

export interface HistoryEvent {
  id: string;
  type: string;
  title: string;
  missionId?: MissionId;
  createdAt: string;
}

export interface Opportunity {
  id: string;
  company: string;
  role: string;
  stage: OpportunityStage;
  url: string;
  notes: string;
  createdAt: string;
  lane?: 'easy-apply' | 'ats' | 'referral' | 'other';
  resumeVariant?: string;
  effortMinutes?: number;
  frictionScore?: number;
}

export interface RoadmapArchive {
  missionId: MissionId;
  archivedAt: string;
  progress: MissionProgress;
}

export const freelanceVerdicts = ['Unreviewed', 'Apply Now', '1-Week Ramp', '1-Month Ramp', 'Ignore'] as const;
export interface FreelanceOpportunity {
  id: string;
  title: string;
  platform: string;
  url: string;
  skills: string;
  budget: string;
  verdict: typeof freelanceVerdicts[number];
  notes: string;
  createdAt: string;
}

export interface RecallEntry {
  id: string;
  missionId: MissionId;
  roadmapVersion: RoadmapVersion;
  checkpointId: string;
  outcome: 'needs-review' | 'partial' | 'independent';
  checks: { explanation: boolean; diagram: boolean; exercise: boolean };
  notes: string;
  createdAt: string;
}

export interface PersonalProof {
  id: string;
  title: string;
  detail: string;
  source: string;
  date?: string;
  url: string;
}

export type FocusEventKind = 'pause' | 'resume' | 'distraction' | 'complete' | 'reset';

export interface FocusSessionEvent {
  id: string;
  kind: FocusEventKind;
  at: string;
  elapsedMs: number;
}

export interface FocusSessionRecord {
  id: string;
  startedAt: string;
  plannedSeconds: number;
  events: FocusSessionEvent[];
}

export interface AppState {
  schemaVersion: 2;
  roadmapVersion: '2.0.0';
  sampleData: boolean;
  updatedAt: string;
  objective: string;
  focusMissionId: MissionId;
  capacity: Capacity;
  interviewMode: boolean;
  missions: Record<MissionId, MissionProgress>;
  plans: Record<string, DailyAction[]>;
  evidence: Evidence[];
  events: HistoryEvent[];
  readiness: Record<typeof readinessKeys[number], Readiness>;
  opportunities: Opportunity[];
  archives: RoadmapArchive[];
  freelanceOpportunities: FreelanceOpportunity[];
  recalls: RecallEntry[];
  personalProof?: PersonalProof[];
  focusSessions?: FocusSessionRecord[];
}

export interface EvidenceInput {
  missionId: MissionId;
  checkpointId: string;
  title: string;
  summary: string;
  kind: EvidenceKind;
  url: string;
  advance: boolean;
  criteriaConfirmed: boolean;
  actionId?: string;
}
