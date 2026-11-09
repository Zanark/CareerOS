import type { MissionId } from '../types';

export const packMissionIds = ['escape', 'fabric', 'blueprint', 'credential', 'neural', 'algorithm', 'income', 'fde'] as const;
export type PackMissionId = typeof packMissionIds[number];

export interface WebStudySource {
  id: string;
  title: string;
  url: string;
  scope: string;
}

export interface PackSection {
  heading: string;
  paragraphs: string[];
  items: string[];
}

export interface PackExercise {
  title: string;
  level?: string;
  task: string;
  check?: string;
  page?: number;
}

export interface PackPhase {
  id: string;
  title: string;
  summary: string;
}

export interface PackUnit {
  id: string;
  sourceId: string;
  title: string;
  phaseId: string;
  role: 'checkpoint' | 'practice' | 'reference';
  pages: number[];
  summary: string;
  action: string;
  minutes: number;
  concepts: string[];
  sections: PackSection[];
  exercises: PackExercise[];
  criteria: string[];
  recovery: string;
  sourceIds?: string[];
}

export interface RoadmapPack {
  missionId: MissionId;
  document: string;
  title: string;
  pageCount: number;
  overview: string;
  sourceNotes: string[];
  phases: PackPhase[];
  units: PackUnit[];
  commonSections: PackSection[];
  sourceKind?: 'web-research';
  reviewedAt?: string;
  webSources?: WebStudySource[];
}

export type PackUnitOutline = Omit<PackUnit, 'sections' | 'exercises'> & { exerciseCount: number };
export type RoadmapPackOutline = Omit<RoadmapPack, 'units' | 'commonSections'> & {
  units: PackUnitOutline[];
  exerciseCount: number;
};
