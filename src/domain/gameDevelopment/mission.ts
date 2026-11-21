import { defineOperation } from '../operationBuilder';
import type { MissionProgress } from '../types';
import { gameOutline } from './outline';
import { gameSources } from './sources';

export const gameMission = defineOperation({
  id: 'gamedev', name: 'Game Development', operation: 'World Forge',
  description: gameOutline.overview,
  purpose: 'Learn game development from first principles, finish Godot 2D/3D practice and build an original authoritative multiplayer game against an explicit self-grading benchmark.',
  color: 'blue', icon: 'gamepad', owner: 'You', initialMode: 'planned',
  dependencies: ['pattern', 'system', 'blueprint'], coverage: 'documented',
  completionLabel: 'World Forge checkpoints completed (self-confirmed, not an automatic game assessment)',
  sourceNotes: gameOutline.sourceNotes,
  sources: gameSources.map(source => ({ document: source.title, section: source.scope, url: source.url })),
  resources: [
    { label: 'Godot / learn GDScript from zero', url: gameSources[0].url },
    { label: 'Godot / high-level multiplayer', url: gameSources.find(source => source.id === 'gd-network')!.url },
    { label: 'Game Accessibility Guidelines', url: gameSources.find(source => source.id === 'gd-access')!.url },
  ],
  referenceGroups: [
    { title: 'Original multiplayer capstone / complete benchmark', kind: 'projects',
      items: gameOutline.units.filter(unit => unit.phaseId === 'gd-benchmark').map(unit => ({
        title: unit.title, detail: `${unit.summary} Reference only; build and verify your own actual project.`,
        href: `#/practice/gamedev/${unit.id}`,
      })) },
    { title: 'Optional game-development specializations', kind: 'parallel',
      items: gameOutline.units.filter(unit => unit.phaseId === 'gd-advanced').map(unit => ({
        title: unit.title, detail: `${unit.summary} Not an additional completion gate.`,
        href: `#/practice/gamedev/${unit.id}`,
      })) },
  ],
  stages: gameOutline.phases.map(phase => ({
    id: `gamedev-pack-${phase.id}`, title: phase.title, summary: phase.summary,
    topics: gameOutline.units.filter(unit => unit.phaseId === phase.id).map(unit => unit.title),
    optional: !gameOutline.units.some(unit => unit.phaseId === phase.id && unit.role === 'checkpoint'),
    source: { document: gameOutline.document, section: `Authored learning sequence: ${phase.title}` },
    checkpoints: gameOutline.units.filter(unit => unit.phaseId === phase.id && unit.role === 'checkpoint').map(unit => {
      const source = gameSources.find(source => source.id === unit.sourceIds?.[0]);
      if (!source) throw new Error(`Missing World Forge primary reference: ${unit.id}`);
      return {
        id: unit.id, title: unit.title, action: unit.action, recoveryAction: unit.recovery,
        sourceId: unit.sourceId, minutes: unit.minutes, criteria: unit.criteria,
        topics: unit.concepts, granularity: 'topic-group',
        source: { document: source.title, section: `Authored study task: ${unit.title}`, url: source.url },
      };
    }),
  })),
}, '3.0.0');

export function createGameProgress(): MissionProgress {
  return { roadmapVersion: gameMission.roadmapVersion, checkpointId: gameMission.checkpoints[0].id,
    status: 'not-started', mode: 'planned', completedCheckpointIds: [], blocker: '' };
}
