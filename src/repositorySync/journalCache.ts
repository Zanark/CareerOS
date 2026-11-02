import { z } from 'zod';
import type { AppState } from '../domain/types';
import { serializeWorkspace } from '../workspaceFile';
import { journalText, parseJournal, sharedBatchCount, MAX_JOURNAL_BYTES } from './journalFormat';
import type { JournalFile } from './journalFormat';
import { unlockJournal } from './journal';
import type { UnlockedJournal } from './journal';
import { mergeWorkspaces } from './workspaceChanges';
import type { WorkspaceMerge } from './workspaceChanges';

export const REPOSITORY_SYNC_KEY = 'careerhq.repository-journal.v1';
const cacheSchema = z.object({
  version: z.literal(1),
  journal: z.string().max(MAX_JOURNAL_BYTES),
  confirmedCount: z.number().int().min(0).max(2000),
}).strict();
export type JournalCache = z.infer<typeof cacheSchema>;

export function parseJournalCache(raw: string): JournalCache {
  const cache = cacheSchema.parse(JSON.parse(raw));
  const file = parseJournal(cache.journal);
  if (!file || cache.confirmedCount > file.batches.length) throw new Error('The saved repository-sync checkpoint is invalid.');
  return cache;
}

export function makeJournalCache(file: JournalFile, confirmedCount: number): JournalCache {
  return parseJournalCache(JSON.stringify({ version: 1, journal: journalText(file), confirmedCount }));
}

export interface JournalReview {
  expectedWorkspace: string;
  local: AppState;
  incoming: UnlockedJournal;
  nextJournal: UnlockedJournal;
  confirmedCount: number;
  source: 'published' | 'file';
  firstConnection: boolean;
  rebased: boolean;
  merge: WorkspaceMerge | null;
}

export async function reviewJournal(
  known: UnlockedJournal | null, confirmedCount: number, incoming: UnlockedJournal,
  local: AppState, source: JournalReview['source'], key: CryptoKey,
): Promise<JournalReview> {
  const result = {
    expectedWorkspace: serializeWorkspace(local), local, incoming, nextJournal: incoming,
    confirmedCount: source === 'published' ? incoming.file.batches.length : confirmedCount,
    source, firstConnection: known === null, rebased: false, merge: null,
  };
  if (!known) return result;
  const common = sharedBatchCount(known.file, incoming.file);
  if (common < confirmedCount) {
    throw new Error('This journal is missing or changes previously confirmed history. It may be an older deployment or a rewritten file. Your local work and cached journal were preserved.');
  }
  if (common === 0) throw new Error('The journal has a different starting snapshot. Your local work was preserved.');
  if (common === incoming.file.batches.length) {
    return {
      ...result, nextJournal: known,
      confirmedCount: source === 'published' ? Math.max(confirmedCount, common) : confirmedCount,
      merge: { state: local, conflicts: [], validationError: '', localChanges: 0, publishedChanges: 0 },
    };
  }
  const base = common === known.file.batches.length ? known.state : (await unlockJournal(known.file, key, common)).state;
  return {
    ...result,
    rebased: common < known.file.batches.length,
    merge: mergeWorkspaces(base, local, incoming.state),
  };
}
