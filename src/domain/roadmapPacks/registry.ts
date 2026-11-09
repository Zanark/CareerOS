import type { Checkpoint } from '../types';
import { roadmapPackOutlines as sourceBookOutlines } from './outlines';
import { fdeOutline } from '../forwardDeployed/outline';
import { packMissionIds } from './types';
import type { PackMissionId } from './types';

export const PACK_ROADMAP_VERSION = '3.0.0' as const;
export const roadmapPackOutlines = [...sourceBookOutlines, fdeOutline];

export function isPackMissionId(value: string | undefined): value is PackMissionId {
  return packMissionIds.some(id => id === value);
}

export function getPackOutline(missionId: string) {
  return roadmapPackOutlines.find(pack => pack.missionId === missionId);
}

export function packCheckpointId(missionId: string, unitId: string) {
  return `${missionId}-v3-${unitId}`;
}

export function packUnitForCheckpoint(missionId: string, checkpoint?: Checkpoint) {
  return checkpoint ? getPackOutline(missionId)?.units.find(unit =>
    unit.role === 'checkpoint' && packCheckpointId(missionId, unit.id) === checkpoint.id) : undefined;
}

export function packUnitHref(missionId: string, unitId?: string) {
  return `#/practice/${missionId}${unitId ? `/${unitId}` : ''}`;
}

export function formatPackPages(pages: number[]) {
  const sorted = [...new Set(pages)].sort((a, b) => a - b);
  const ranges: string[] = [];
  for (let index = 0; index < sorted.length; index++) {
    const start = sorted[index];
    let end = start;
    while (sorted[index + 1] === end + 1) end = sorted[++index];
    ranges.push(start === end ? String(start) : `${start}-${end}`);
  }
  return ranges.join(', ');
}

const searchEntries = roadmapPackOutlines.flatMap(pack => pack.units.map(unit => ({
  label: unit.title,
  detail: `${pack.title} / ${unit.role === 'checkpoint' ? 'Curriculum' : 'Practice reference'}`,
  route: `practice/${pack.missionId}/${unit.id}`,
  search: [unit.title, unit.sourceId, unit.summary, ...unit.concepts].join(' ').toLowerCase(),
})));

export function searchRoadmapPacks(query: string, limit = 4) {
  const term = query.trim().toLowerCase();
  return term ? searchEntries.filter(entry => entry.search.includes(term)).slice(0, limit) : [];
}
