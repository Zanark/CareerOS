import { z } from 'zod';
import { parseState } from '../domain/engine';
import { timestampSchema } from '../domain/legacyState';
import type { AppState } from '../domain/types';
import { MAX_WORKSPACE_BYTES, serializeWorkspace } from '../workspaceFile';
import {
  JOURNAL_ITERATIONS, journalText, parseJournal,
} from './journalFormat';
import type { JournalBatch, JournalFile, JournalHeader } from './journalFormat';
import { applyWorkspaceChanges, workspaceChanges, workspaceChangeSchema } from './workspaceChanges';

const MAX_PAYLOAD_BYTES = MAX_WORKSPACE_BYTES * 2 + 1024 * 1024;
const payloadSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('baseline'), state: z.unknown(), at: timestampSchema }).strict(),
  z.object({
    kind: z.literal('changes'), changes: z.array(workspaceChangeSchema).min(1).max(60_000),
    updatedAt: timestampSchema, at: timestampSchema,
  }).strict(),
]);
type Payload = z.infer<typeof payloadSchema>;

export interface UnlockedJournal {
  file: JournalFile;
  state: AppState;
}

function subtle() {
  if (!globalThis.crypto?.subtle) throw new Error('Browser encryption is unavailable. Use a current browser on HTTPS (or localhost for development).');
  return globalThis.crypto.subtle;
}

function encode(bytes: Uint8Array): string {
  let value = '';
  for (let offset = 0; offset < bytes.length; offset += 16384) {
    value += String.fromCharCode(...bytes.subarray(offset, offset + 16384));
  }
  return btoa(value);
}

function decode(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value);
  if (btoa(binary) !== value) throw new Error('Non-canonical encrypted journal encoding.');
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

function additionalData(header: JournalHeader, batch: Pick<JournalBatch, 'id' | 'parent'>) {
  return new TextEncoder().encode(JSON.stringify({ header, id: batch.id, parent: batch.parent }));
}

export async function deriveJournalKey(passphrase: string, header: JournalHeader): Promise<CryptoKey> {
  if (passphrase.length < 12 || passphrase.length > 1024) throw new Error('Use a passphrase between 12 and 1,024 characters. It is case-sensitive and spaces count.');
  const bytes = new TextEncoder().encode(passphrase);
  try {
    const salt = decode(header.kdf.salt);
    if (salt.length !== 16) throw new Error('Invalid journal salt.');
    const material = await subtle().importKey('raw', bytes, 'PBKDF2', false, ['deriveKey']);
    return await subtle().deriveKey({
      name: 'PBKDF2', hash: 'SHA-256', salt, iterations: header.kdf.iterations,
    }, material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  } finally { bytes.fill(0); }
}

async function encryptPayload(file: JournalFile, key: CryptoKey, payload: Payload): Promise<JournalBatch> {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  if (bytes.byteLength > MAX_PAYLOAD_BYTES) throw new Error('This batch is too large. Keep a private backup before starting a new journal.');
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const metadata = { id: crypto.randomUUID(), parent: file.batches.at(-1)?.id ?? null };
  const encrypted = await subtle().encrypt({
    name: 'AES-GCM', iv, additionalData: additionalData(file.header, metadata), tagLength: 128,
  }, key, bytes);
  return { type: 'encrypted-batch', ...metadata, iv: encode(iv), ciphertext: encode(new Uint8Array(encrypted)) };
}

export async function unlockJournal(file: JournalFile, key: CryptoKey, count = file.batches.length): Promise<UnlockedJournal> {
  if (!Number.isInteger(count) || count < 1 || count > file.batches.length) throw new Error('Invalid journal replay boundary.');
  let state: AppState | undefined;
  for (const [index, batch] of file.batches.slice(0, count).entries()) {
    let plaintext: ArrayBuffer;
    try {
      plaintext = await subtle().decrypt({
        name: 'AES-GCM', iv: decode(batch.iv), additionalData: additionalData(file.header, batch), tagLength: 128,
      }, key, decode(batch.ciphertext));
    } catch (error) {
      if (error instanceof Error && (error.name === 'OperationError' || error.name === 'InvalidCharacterError' ||
        error.message.includes('encoding'))) {
        throw new Error('Unable to unlock: the passphrase is incorrect or the journal is damaged. Your workspace is unchanged.');
      }
      throw error;
    }
    if (plaintext.byteLength > MAX_PAYLOAD_BYTES) throw new Error('Decrypted journal batch exceeds the supported size.');
    const payload = payloadSchema.parse(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(plaintext)));
    if (index === 0) {
      if (payload.kind !== 'baseline') throw new Error('The journal must start with an encrypted workspace snapshot.');
      state = parseState(payload.state);
      serializeWorkspace(state);
    } else {
      if (payload.kind !== 'changes') throw new Error('Only the first journal batch may contain a starting snapshot.');
      if (!state) throw new Error('Missing starting snapshot.');
      state = applyWorkspaceChanges(state, payload.changes, payload.updatedAt);
    }
  }
  if (!state) throw new Error('The journal has no starting snapshot.');
  return { file: { header: file.header, batches: file.batches.slice(0, count) }, state };
}

export async function createJournal(state: AppState, passphrase: string) {
  subtle();
  const valid = parseState(state);
  serializeWorkspace(valid);
  const header: JournalHeader = {
    format: 'careeros-encrypted-journal', version: 1, journalId: crypto.randomUUID(), cipher: 'AES-GCM-256',
    kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations: JOURNAL_ITERATIONS,
      salt: encode(crypto.getRandomValues(new Uint8Array(16))) },
  };
  const key = await deriveJournalKey(passphrase, header);
  const file: JournalFile = { header, batches: [] };
  file.batches.push(await encryptPayload(file, key, { kind: 'baseline', state: valid, at: new Date().toISOString() }));
  const checked = parseJournal(journalText(file));
  if (!checked) throw new Error('The starting journal could not be created.');
  return { key, journal: { file: checked, state: valid } satisfies UnlockedJournal };
}

export async function appendWorkspace(journal: UnlockedJournal, state: AppState, key: CryptoKey): Promise<UnlockedJournal> {
  const valid = parseState(state);
  serializeWorkspace(valid);
  const changes = workspaceChanges(journal.state, valid);
  if (!changes.length) return journal;
  const batch = await encryptPayload(journal.file, key, {
    kind: 'changes', changes, updatedAt: valid.updatedAt, at: new Date().toISOString(),
  });
  const file = parseJournal(journalText({ header: journal.file.header, batches: [...journal.file.batches, batch] }));
  if (!file) throw new Error('The updated journal could not be created.');
  return { file, state: valid };
}
