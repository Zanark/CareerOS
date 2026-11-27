import { useCallback, useState } from 'react';
import { z } from 'zod';
import type { DiscoverySnapshot } from './model';

export const WAYFINDER_HISTORY_KEY = 'careerhq.wayfinder-view.v1';
const historySchema = z.object({
  version: z.literal(1),
  sourceId: z.string().min(1).max(500),
  xp: z.number().int().nonnegative().safe(),
}).strict();
export type WayfinderHistory = z.infer<typeof historySchema>;

export function parseWayfinderHistory(raw: string | null): WayfinderHistory | null {
  return raw === null ? null : historySchema.parse(JSON.parse(raw));
}

export function wayfinderSourceId(snapshot: DiscoverySnapshot): string | null {
  return snapshot.discoveries.find(item => item.id === 'first-footprint')?.sources[0]?.id ?? null;
}

export function unseenWayfinderFrom(history: WayfinderHistory | null, sourceId: string | null, xp: number): number {
  return history?.sourceId === sourceId ? Math.min(history.xp, xp) : 0;
}

export function useWayfinderHistory(snapshot: DiscoverySnapshot, practice: boolean) {
  const [initial] = useState(() => {
    if (practice) return { history: null, notice: '' };
    try {
      return { history: parseWayfinderHistory(localStorage.getItem(WAYFINDER_HISTORY_KEY)), notice: '' };
    } catch {
      return { history: null, notice: 'Atlas animation history could not be read. Celebrations may repeat after reload; your saved work is unchanged.' };
    }
  });
  const [history, setHistory] = useState<WayfinderHistory | null>(initial.history);
  const [notice, setNotice] = useState(initial.notice);
  const sourceId = wayfinderSourceId(snapshot);
  const from = unseenWayfinderFrom(history, sourceId, snapshot.journey.xp);

  const markViewed = useCallback((xp: number) => {
    if (practice || !sourceId) return;
    setHistory(current => {
      if (current?.sourceId === sourceId && current.xp >= xp) return current;
      return { version: 1, sourceId, xp };
    });
    try {
      const saved = parseWayfinderHistory(localStorage.getItem(WAYFINDER_HISTORY_KEY));
      if (saved?.sourceId === sourceId && saved.xp >= xp) return;
      const next: WayfinderHistory = { version: 1, sourceId, xp };
      localStorage.setItem(WAYFINDER_HISTORY_KEY, JSON.stringify(next));
      setNotice('');
    } catch {
      setNotice('Atlas animation history could not be saved. Celebrations may repeat after reload; your saved work is unchanged.');
    }
  }, [practice, sourceId]);

  return { sourceId, from, markViewed, notice };
}
