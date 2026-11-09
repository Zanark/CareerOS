import type { CSSProperties } from 'react';
import type { MissionId } from './domain/types';
import type { CareerOrbitKind } from './graph/careerOrbitTypes';

export const CHECKPOINT_COMPLETE_COLOR = '#45D072';

export const MISSION_COLORS: Readonly<Record<MissionId, string>> = Object.freeze({
  pattern: '#268BD2',
  system: '#6C71C4',
  escape: '#F34B00',
  fabric: '#E84A5F',
  blueprint: '#D33682',
  credential: '#EBE565',
  neural: '#28B7C9',
  algorithm: '#A989D8',
  income: '#C89459',
  fde: '#E8AC83',
});

export const COLLECTION_COLORS: Readonly<Record<Exclude<CareerOrbitKind, 'mission'>, string>> = Object.freeze({
  action: '#F4A6B8',
  evidence: '#85BADB',
  opportunity: '#D97938',
  freelance: '#C3CCD4',
  history: '#B65CBE',
  curriculum: '#829AA6',
});

export function missionColor(id: MissionId): string {
  return MISSION_COLORS[id];
}

export function missionAccentStyle(id: MissionId): CSSProperties & { '--accent': string } {
  return { '--accent': missionColor(id) };
}
