import type { PackMissionId, RoadmapPack } from './types';

const loaders: Record<PackMissionId, () => Promise<{ default: RoadmapPack }>> = {
  algorithm: () => import('./data/algorithm'),
  blueprint: () => import('./data/blueprint'),
  credential: () => import('./data/credential'),
  escape: () => import('./data/escape'),
  fabric: () => import('./data/fabric'),
  income: () => import('./data/income'),
  neural: () => import('./data/neural'),
  fde: () => import('../forwardDeployed/content'),
};

export async function loadRoadmapPack(missionId: PackMissionId): Promise<RoadmapPack> {
  const module = await loaders[missionId]();
  return module.default;
}
