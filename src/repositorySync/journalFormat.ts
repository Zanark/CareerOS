import { z } from 'zod';

export const JOURNAL_FILENAME = 'careeros-progress.jsonl';
export const JOURNAL_ITERATIONS = 600_000;
export const MAX_JOURNAL_BYTES = 24 * 1024 * 1024;
export const MAX_JOURNAL_BATCHES = 2000;
const base64 = /^[A-Za-z0-9+/]+={0,2}$/;

const headerSchema = z.object({
  format: z.literal('careeros-encrypted-journal'),
  version: z.literal(1),
  journalId: z.string().uuid(),
  cipher: z.literal('AES-GCM-256'),
  kdf: z.object({
    name: z.literal('PBKDF2'), hash: z.literal('SHA-256'),
    iterations: z.literal(JOURNAL_ITERATIONS),
    salt: z.string().length(24).regex(base64),
  }).strict(),
}).strict();

const batchSchema = z.object({
  type: z.literal('encrypted-batch'),
  id: z.string().uuid(),
  parent: z.string().uuid().nullable(),
  iv: z.string().length(16).regex(base64),
  ciphertext: z.string().min(24).max(16 * 1024 * 1024).regex(base64),
}).strict();

export type JournalHeader = z.infer<typeof headerSchema>;
export type JournalBatch = z.infer<typeof batchSchema>;
export interface JournalFile { header: JournalHeader; batches: JournalBatch[] }

export function journalText(file: JournalFile): string {
  return `${[JSON.stringify(file.header), ...file.batches.map(batch => JSON.stringify(batch))].join('\n')}\n`;
}

export function parseJournal(text: string): JournalFile | null {
  if (new TextEncoder().encode(text).byteLength > MAX_JOURNAL_BYTES) {
    throw new Error('The encrypted journal exceeds the 24 MB limit. Keep a private backup and start a new journal instead of truncating history.');
  }
  const lines = text.split(/\r?\n/).filter(line => line.trim());
  if (!lines.length) return null;
  let header: JournalHeader;
  try { header = headerSchema.parse(JSON.parse(lines[0])); }
  catch { throw new Error('Not a supported CareerOS encrypted journal header. Your workspace is unchanged.'); }
  const batches: JournalBatch[] = [];
  const seen = new Map<string, string>();
  for (let index = 1; index < lines.length; index += 1) {
    let value: unknown;
    try { value = JSON.parse(lines[index]); }
    catch { throw new Error(`Invalid JSON on journal line ${index + 1}. Append complete exported lines only.`); }
    const repeatedHeader = headerSchema.safeParse(value);
    if (repeatedHeader.success) {
      if (JSON.stringify(repeatedHeader.data) !== JSON.stringify(header)) {
        throw new Error('Two different journals were combined. Append only exports from the same journal.');
      }
      continue;
    }
    const parsed = batchSchema.safeParse(value);
    if (!parsed.success) throw new Error(`Unsupported or damaged encrypted batch on journal line ${index + 1}.`);
    const batch = parsed.data, encoded = JSON.stringify(batch), previous = seen.get(batch.id);
    if (previous !== undefined) {
      if (previous !== encoded) throw new Error('The same batch ID has different contents. The journal was not loaded.');
      continue;
    }
    if (batch.parent !== (batches.at(-1)?.id ?? null)) {
      throw new Error(`Journal branches on line ${index + 1}. These updates came from an older history. Remove the newly appended block, load the latest published journal on its source browser, and export again.`);
    }
    seen.set(batch.id, encoded);
    batches.push(batch);
    if (batches.length > MAX_JOURNAL_BATCHES) throw new Error('The journal exceeds its 2,000-batch limit. Keep a private backup before starting a new journal.');
  }
  if (!batches.length) throw new Error('The journal has a header but no encrypted starting snapshot.');
  return { header, batches };
}

export function sharedBatchCount(a: JournalFile, b: JournalFile): number {
  if (JSON.stringify(a.header) !== JSON.stringify(b.header)) throw new Error('This is a different encrypted journal. Disconnect the current journal before connecting another; your browser workspace stays unchanged.');
  let count = 0;
  while (count < a.batches.length && count < b.batches.length) {
    if (a.batches[count].id !== b.batches[count].id) break;
    if (JSON.stringify(a.batches[count]) !== JSON.stringify(b.batches[count])) {
      throw new Error('A previously known batch changed its contents. The journal was not loaded.');
    }
    count += 1;
  }
  return count;
}

export function unpublishedText(file: JournalFile, confirmedCount: number): string {
  if (!Number.isInteger(confirmedCount) || confirmedCount < 0 || confirmedCount > file.batches.length) {
    throw new Error('Invalid published-journal checkpoint.');
  }
  const lines = file.batches.slice(confirmedCount).map(batch => JSON.stringify(batch));
  if (!lines.length) return '';
  if (confirmedCount === 0) lines.unshift(JSON.stringify(file.header));
  return `${lines.join('\n')}\n`;
}
