import { useEffect, useMemo, useRef, useState } from 'react';
import type { WorkspaceModel } from '../useWorkspace';
import type { AppState } from '../domain/types';
import { STORAGE_KEY } from '../domain/engine';
import { serializeWorkspace } from '../workspaceFile';
import { appendWorkspace, createJournal, deriveJournalKey, unlockJournal } from './journal';
import type { UnlockedJournal } from './journal';
import {
  JOURNAL_FILENAME, MAX_JOURNAL_BYTES, parseJournal, unpublishedText,
} from './journalFormat';
import type { JournalFile } from './journalFormat';
import {
  makeJournalCache, parseJournalCache, REPOSITORY_SYNC_KEY, reviewJournal,
} from './journalCache';
import type { JournalCache, JournalReview } from './journalCache';
import { changeSummary, workspaceChanges } from './workspaceChanges';

function message(error: unknown) {
  return error instanceof Error ? error.message : 'An unexpected repository-sync error occurred.';
}

function loadCache(practice: boolean) {
  if (practice) return { cache: null, raw: null, error: '' };
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(REPOSITORY_SYNC_KEY);
    return { cache: raw === null ? null : parseJournalCache(raw), raw, error: '' };
  } catch (error) {
    return { cache: null, raw, error: `Repository sync could not open its saved metadata. Existing progress was not changed. ${message(error)}` };
  }
}

async function fetchPublished(signal: AbortSignal): Promise<JournalFile | null> {
  const url = new URL(`${import.meta.env.BASE_URL}${JOURNAL_FILENAME}`, location.origin);
  const response = await fetch(url, {
    signal, cache: 'no-store', credentials: 'omit', redirect: 'error', referrerPolicy: 'no-referrer',
  });
  if (!response.ok) throw new Error(`Published journal request failed (${response.status}). Local work was preserved. Try again after the Pages deployment finishes.`);
  const length = Number(response.headers.get('content-length'));
  if (Number.isFinite(length) && length > MAX_JOURNAL_BYTES) throw new Error('The published journal exceeds the 24 MB limit.');
  if (!response.body) return parseJournal(await response.text());
  const reader = response.body.getReader(), chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_JOURNAL_BYTES) {
        await reader.cancel();
        throw new Error('The published journal exceeds the 24 MB limit.');
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return parseJournal(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
}

interface Candidate { file: JournalFile; source: JournalReview['source'] }
type ReviewChoice = 'combined' | 'local' | 'published';

export function useRepositorySync(workspace: WorkspaceModel, practice: boolean) {
  const [initial] = useState(() => loadCache(practice));
  const [cache, setCache] = useState<JournalCache | null>(initial.cache);
  const cacheRef = useRef(cache), rawRef = useRef(initial.raw);
  const [error, setError] = useState(initial.error);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false), busyRef = useRef(false);
  const [unlocked, setUnlocked] = useState<UnlockedJournal | null>(null);
  const sessionRef = useRef<UnlockedJournal | null>(null), keyRef = useRef<CryptoKey | null>(null);
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [review, setReview] = useState<JournalReview | null>(null);
  const [exportText, setExportText] = useState('');
  const [exportSummary, setExportSummary] = useState<ReturnType<typeof changeSummary> | null>(null);
  const [metadataConflict, setMetadataConflict] = useState(false);
  const workspaceRef = useRef(workspace);
  workspaceRef.current = workspace;
  const generation = useRef(0), controller = useRef<AbortController | null>(null);

  useEffect(() => {
    if (practice) return;
    const changed = (event: StorageEvent) => {
      if ((event.key === REPOSITORY_SYNC_KEY || event.key === null) && event.newValue !== rawRef.current) {
        setMetadataConflict(true);
        setError('Repository sync changed in another tab. Reload before exporting or loading journal updates. Your browser progress is unchanged.');
      }
    };
    window.addEventListener('storage', changed);
    return () => {
      window.removeEventListener('storage', changed);
      generation.current += 1;
      controller.current?.abort();
      keyRef.current = null;
      sessionRef.current = null;
    };
  }, [practice]);

  function ensureMetadata() {
    if (practice) throw new Error('Repository sync is disabled in tutorial practice. Your real journal is untouched.');
    if (metadataConflict || localStorage.getItem(REPOSITORY_SYNC_KEY) !== rawRef.current) {
      setMetadataConflict(true);
      throw new Error('Repository sync changed in another tab. Reload before continuing.');
    }
  }

  function saveCache(next: JournalCache | null) {
    ensureMetadata();
    const raw = next === null ? null : JSON.stringify(next);
    if (raw === null) localStorage.removeItem(REPOSITORY_SYNC_KEY);
    else localStorage.setItem(REPOSITORY_SYNC_KEY, raw);
    rawRef.current = raw;
    cacheRef.current = next;
    setCache(next);
  }

  function freshWorkspace(): AppState {
    const model = workspaceRef.current;
    if (!model.state) throw new Error('Open a valid browser workspace before using repository sync.');
    if (model.conflict || localStorage.getItem(STORAGE_KEY) !== serializeWorkspace(model.state)) {
      throw new Error('Your browser workspace changed in another tab. Reload before loading or exporting journal updates.');
    }
    return model.state;
  }

  function setSession(journal: UnlockedJournal, key: CryptoKey) {
    keyRef.current = key;
    sessionRef.current = journal;
    setUnlocked(journal);
  }

  async function run(task: (check: () => void) => Promise<void>): Promise<boolean> {
    if (busyRef.current) return false;
    busyRef.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    const token = generation.current;
    const check = () => {
      if (token !== generation.current) throw new Error('The journal operation was cancelled by locking or leaving this workspace.');
      ensureMetadata();
    };
    try {
      check();
      await task(check);
      check();
      return true;
    } catch (cause) {
      if (token === generation.current) setError(`Repository sync: ${message(cause)}`);
      return false;
    } finally {
      if (token === generation.current) { busyRef.current = false; setBusy(false); }
    }
  }

  async function requestPublished(check: () => void) {
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    const timeout = window.setTimeout(() => request.abort(), 20_000);
    try {
      const file = await fetchPublished(request.signal);
      check();
      return file;
    } catch (cause) {
      if (request.signal.aborted) throw new Error('The published-journal request was cancelled or timed out. Your local work is unchanged.');
      throw cause;
    } finally {
      window.clearTimeout(timeout);
      if (controller.current === request) controller.current = null;
    }
  }

  function applyReview(value: JournalReview, choice: ReviewChoice, key: CryptoKey) {
    ensureMetadata();
    const model = workspaceRef.current;
    if (serializeWorkspace(freshWorkspace()) !== value.expectedWorkspace) {
      throw new Error('Your workspace changed while this review was open. Check the journal again before applying it; no newer work was overwritten.');
    }
    const next = choice === 'local' ? value.local : choice === 'published' ? value.incoming.state : value.merge?.state;
    if (!next) throw new Error('These changes cannot be combined automatically. Review the conflicts and choose a complete workspace explicitly.');
    const nextCache = makeJournalCache(value.nextJournal.file, value.confirmedCount);
    if (serializeWorkspace(next) !== value.expectedWorkspace) {
      const saved = model.commit(current => {
        if (serializeWorkspace(current) !== value.expectedWorkspace) throw new Error('Repository review is stale. Check the journal again.');
        return next;
      });
      if (!saved) throw new Error('Journal progress was not applied. The existing workspace save/conflict error must be resolved first.');
    }
    try { saveCache(nextCache); }
    catch (cause) {
      setReview(null);
      setCandidate({ file: value.nextJournal.file, source: value.source });
      throw new Error(`The reviewed workspace was saved, but its journal checkpoint could not be stored. Keep a private backup and retry the journal check. No publication was acknowledged. ${message(cause)}`);
    }
    setSession(value.nextJournal, key);
    setReview(null);
    setCandidate(null);
    setExportText('');
    setExportSummary(null);
    const source = value.source === 'published' ? 'Published journal checked.' : 'Journal file loaded locally; this does not confirm publication.';
    setNotice(`${source} ${choice === 'local' ? 'Your complete browser workspace was kept; export again to publish its differences.' :
      choice === 'published' ? 'The published snapshot was applied by your explicit choice.' : 'Compatible published and local changes are combined.'}${value.rebased ? ' Older copied exports are now stale: discard them and export again.' : ''}`);
  }

  async function receive(incoming: UnlockedJournal, source: Candidate['source'], key: CryptoKey, check: () => void) {
    check();
    const current = workspaceRef.current.state;
    if (!current) throw new Error('Open a valid browser workspace before loading journal progress.');
    const value = await reviewJournal(sessionRef.current, cacheRef.current?.confirmedCount ?? 0, incoming, current, source, key);
    check();
    if (!value.firstConnection && source === 'published' && value.merge?.state) {
      applyReview(value, 'combined', key);
    } else {
      keyRef.current = key;
      setReview(value);
      setNotice(value.firstConnection ? 'Journal unlocked. Review before connecting it to this browser.' :
        'Journal unlocked. A review is required; your workspace has not changed.');
    }
  }

  function checkPublished() {
    return run(async check => {
      const file = await requestPublished(check);
      if (!file) {
        if ((cacheRef.current?.confirmedCount ?? 0) > 0) {
          throw new Error('The published journal is empty and missing previously confirmed history. Your cached journal and local work were preserved. Restore the complete repository file before appending more updates.');
        }
        setNotice('No journal is published yet. Create one, append its initial export to the repository file, then commit, push and wait for deployment.');
        setCandidate(null);
        return;
      }
      if (keyRef.current && sessionRef.current) await receive(await unlockJournal(file, keyRef.current), 'published', keyRef.current, check);
      else {
        setCandidate({ file, source: 'published' });
        setNotice('A published encrypted journal is available. Unlock it to load progress; your current browser workspace is unchanged.');
      }
    });
  }

  function create(passphrase: string) {
    return run(async check => {
      if (cacheRef.current || rawRef.current !== null) throw new Error('Disconnect or recover the existing journal before creating another.');
      if (await requestPublished(check)) throw new Error('A journal is already published. Check and unlock that journal instead of creating a different history.');
      const current = freshWorkspace();
      const created = await createJournal(current, passphrase);
      check();
      freshWorkspace();
      saveCache(makeJournalCache(created.journal.file, 0));
      setSession(created.journal, created.key);
      setExportText(unpublishedText(created.journal.file, 0));
      setExportSummary(null);
      setCandidate(null);
      setReview(null);
      setNotice('Initial encrypted snapshot prepared. Nothing was uploaded or published. Copy or download it, then append it to the repository journal.');
    });
  }

  function unlock(passphrase: string) {
    return run(async check => {
      const existing = cacheRef.current;
      const file = existing ? parseJournal(existing.journal) : candidate?.file;
      if (!file) throw new Error('Check the published journal or choose an encrypted journal file first.');
      const key = await deriveJournalKey(passphrase, file.header);
      const journal = await unlockJournal(file, key);
      check();
      if (!existing) {
        await receive(journal, candidate?.source ?? 'file', key, check);
        return;
      }
      setSession(journal, key);
      if (candidate?.source === 'file') await receive(await unlockJournal(candidate.file, key), 'file', key, check);
      else {
        const published = await requestPublished(check);
        if (published) await receive(await unlockJournal(published, key), 'published', key, check);
        else if (existing.confirmedCount > 0) {
          throw new Error('The published journal is empty and missing previously confirmed history. The cached journal is unlocked, but no publication was acknowledged. Restore the complete repository file.');
        } else setNotice('Cached journal unlocked. No journal is published yet; local work and unconfirmed exports are retained.');
      }
    });
  }

  function exportUpdates() {
    return run(async check => {
      if (review) throw new Error('Finish or cancel the current journal review before exporting.');
      const journal = sessionRef.current, key = keyRef.current;
      if (!journal || !key || !cacheRef.current) throw new Error('Unlock and connect a journal before exporting updates.');
      const current = freshWorkspace();
      const changes = workspaceChanges(journal.state, current);
      const next = await appendWorkspace(journal, current, key);
      check();
      freshWorkspace();
      const nextCache = makeJournalCache(next.file, cacheRef.current.confirmedCount);
      saveCache(nextCache);
      setSession(next, key);
      const text = unpublishedText(next.file, nextCache.confirmedCount);
      setExportText(text);
      setExportSummary(changeSummary(changes));
      setNotice(text ? 'Encrypted updates prepared, not published. The export includes every unconfirmed batch so earlier exports are not lost. Repeated identical batches are safe to append.' :
        'No unpublished changes. Every exported batch is present in the last checked deployment.');
    });
  }

  function openFile(text: string) {
    return run(async check => {
      const file = parseJournal(text);
      if (!file) throw new Error('This journal file is empty.');
      if (keyRef.current && sessionRef.current) await receive(await unlockJournal(file, keyRef.current), 'file', keyRef.current, check);
      else {
        setCandidate({ file, source: 'file' });
        setNotice('Encrypted file selected. Unlock it for review. A file import does not acknowledge GitHub publication.');
      }
    });
  }

  function confirmReview(choice: ReviewChoice) {
    return run(async check => {
      if (!review || !keyRef.current) throw new Error('Unlock a journal and prepare a review first.');
      check();
      applyReview(review, choice, keyRef.current);
    });
  }

  function lock() {
    generation.current += 1;
    controller.current?.abort();
    keyRef.current = null;
    sessionRef.current = null;
    setUnlocked(null);
    setReview(null);
    setCandidate(null);
    setExportText('');
    setExportSummary(null);
    busyRef.current = false;
    setBusy(false);
    setNotice('Journal locked. The decryption key was not saved. Existing browser progress is still available and is not encrypted by this lock.');
  }

  async function disconnect() {
    const saved = await run(async check => {
      check();
      saveCache(null);
    });
    if (saved) {
      lock();
      setError('');
      setNotice('Repository sync disconnected on this browser only. Your workspace and published repository file were not deleted.');
    }
    return saved;
  }

  const pending = useMemo(() => unlocked && workspace.state ? workspaceChanges(unlocked.state, workspace.state) : [],
    [unlocked, workspace.state]);
  const cachedBatchCount = useMemo(() => cache ? parseJournal(cache.journal)!.batches.length : 0, [cache]);
  return {
    connected: cache !== null, unlocked: unlocked !== null, candidate, review, busy, error, notice,
    exportText, exportSummary, pendingCount: pending.length, pendingSummary: changeSummary(pending),
    unconfirmedCount: cache ? cachedBatchCount - cache.confirmedCount : 0,
    confirmedCount: cache?.confirmedCount ?? 0,
    recoveryRaw: initial.error ? initial.raw : null, cachedJournal: cache?.journal ?? '',
    metadataConflict, practice,
    create, unlock, checkPublished, exportUpdates, openFile, confirmReview, lock, disconnect,
    dismissReview: () => { setReview(null); setNotice('Review cancelled. Your workspace and journal checkpoint are unchanged.'); },
    reportError: (value: string) => setError(value),
    reportNotice: (value: string) => setNotice(value),
  };
}

export type RepositorySyncModel = ReturnType<typeof useRepositorySync>;
