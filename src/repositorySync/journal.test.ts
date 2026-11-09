import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  createInitialState, parseState, recordChange, recordEvidence, startFocusSession, upgradeRoadmap,
} from '../domain/engine';
import { appendWorkspace, createJournal, deriveJournalKey, unlockJournal } from './journal';
import { journalText, parseJournal, unpublishedText } from './journalFormat';
import { makeJournalCache, parseJournalCache, reviewJournal } from './journalCache';
import { applyWorkspaceChanges, canonicalJson, mergeWorkspaces, workspaceChanges } from './workspaceChanges';
import type { JournalFile } from './journalFormat';
import { getMissionVersion } from '../domain/catalog';

const phrase = 'A synthetic test phrase, never a real secret';

function fixture() {
  let state = createInitialState(false);
  state = recordEvidence(state, {
    missionId: 'pattern', checkpointId: state.missions.pattern.checkpointId,
    title: 'Private synthetic artifact', summary: 'Synthetic evidence that must exist only inside the encrypted payload.',
    kind: 'exercise', url: '', advance: true, criteriaConfirmed: true,
  });
  state.personalProof = [{ id: 'private-test-proof', title: 'Synthetic previous work',
    detail: 'A non-personal fixture.', source: 'Test source', url: '' }];
  return startFocusSession(parseState(state), 600);
}

describe('encrypted append-only repository journal', () => {
  it('replays a genuine nine-mission wire baseline and old batch before appending FDE work to the same encrypted chain', async () => {
    const base = fixture();
    base.missions.neural = { ...base.missions.neural, roadmapVersion: '3.0.0',
      checkpointId: getMissionVersion('neural', '3.0.0').checkpoints[0].id };
    const created = await createJournal(base, phrase);
    const { fde: _fde, ...oldMissions } = base.missions;
    const old = { ...base, missions: oldMissions };
    const changed = recordChange({ ...base, objective: 'Synthetic old-client direction' }, 'Synthetic old-client change');
    const file: JournalFile = { header: created.journal.file.header, batches: [] };
    for (const payload of [
      { kind: 'baseline', state: old, at: base.updatedAt },
      { kind: 'changes', changes: workspaceChanges(base, changed), updatedAt: changed.updatedAt, at: changed.updatedAt },
    ]) {
      const metadata = { id: crypto.randomUUID(), parent: file.batches.at(-1)?.id ?? null };
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encrypted = await crypto.subtle.encrypt({
        name: 'AES-GCM', iv, tagLength: 128,
        additionalData: new TextEncoder().encode(JSON.stringify({ header: file.header, ...metadata })),
      }, created.key, new TextEncoder().encode(JSON.stringify(payload)));
      file.batches.push({ type: 'encrypted-batch', ...metadata,
        iv: Buffer.from(iv).toString('base64'), ciphertext: Buffer.from(encrypted).toString('base64') });
    }
    const original = journalText(file);
    const unlocked = await unlockJournal(parseJournal(original)!, created.key);
    expect(unlocked.state).toEqual(changed);
    const fde = recordEvidence(unlocked.state, {
      missionId: 'fde', checkpointId: unlocked.state.missions.fde.checkpointId,
      title: 'Synthetic background fieldwork', summary: 'Synthetic first Fieldcraft attempt after an older encrypted journal replay.',
      kind: 'code', url: '', advance: false, criteriaConfirmed: false,
    });
    const appended = await appendWorkspace(unlocked, fde, created.key);
    expect(journalText(appended.file).startsWith(original)).toBe(true);
    expect((await unlockJournal(appended.file, created.key)).state).toEqual(fde);
    const review = await reviewJournal(unlocked, 2, appended, changed, 'published', created.key);
    expect(review.merge?.state).toEqual(fde);
    expect(fde.focusMissionId).toBe(base.focusMissionId);
    expect(fde.missions.fde.mode).toBe('background');
  });
  it('encrypts the full baseline and incremental changes, with duplicate-safe append and unchanged input', async () => {
    const state = fixture(), original = JSON.stringify(state);
    const created = await createJournal(state, phrase);
    const first = journalText(created.journal.file);
    expect(first).not.toContain('Private synthetic artifact');
    expect(first).not.toContain(phrase);
    expect(created.key.extractable).toBe(false);
    const changed = recordChange({ ...state, objective: 'A different synthetic goal' }, 'Synthetic direction change');
    const next = await appendWorkspace(created.journal, changed, created.key);
    const block = unpublishedText(next.file, 1);
    expect(block.trim().split('\n')).toHaveLength(1);
    const duplicated = parseJournal(first + block + first + block)!;
    expect(duplicated.batches).toHaveLength(2);
    expect((await unlockJournal(duplicated, created.key)).state).toEqual(changed);
    expect(await appendWorkspace(next, changed, created.key)).toBe(next);
    expect(JSON.stringify(state)).toBe(original);
  });

  it('rejects a wrong passphrase and authenticated ciphertext/header metadata tampering', async () => {
    const created = await createJournal(createInitialState(false), phrase);
    const wrong = await deriveJournalKey('A completely different synthetic phrase', created.journal.file.header);
    await expect(unlockJournal(created.journal.file, wrong)).rejects.toThrow(/passphrase.*damaged/);
    const damaged = structuredClone(created.journal.file);
    const bytes = Buffer.from(damaged.batches[0].ciphertext, 'base64');
    bytes[0] ^= 1;
    damaged.batches[0].ciphertext = bytes.toString('base64');
    await expect(unlockJournal(damaged, created.key)).rejects.toThrow(/damaged/);
    const renamed = structuredClone(created.journal.file);
    renamed.batches[0].id = crypto.randomUUID();
    await expect(unlockJournal(renamed, created.key)).rejects.toThrow(/damaged/);
  });

  it('rejects broken lines, modified duplicate IDs, foreign headers and stale exported branches', async () => {
    const created = await createJournal(createInitialState(false), phrase);
    const a = await appendWorkspace(created.journal, { ...created.journal.state, objective: 'First branch goal' }, created.key);
    const b = await appendWorkspace(created.journal, { ...created.journal.state, objective: 'Second branch goal' }, created.key);
    expect(() => parseJournal(journalText(a.file) + unpublishedText(b.file, 1))).toThrow(/branches/);
    const duplicate = { ...a.file.batches[0], ciphertext: 'AAAAAAAAAAAAAAAAAAAAAAAA' };
    expect(() => parseJournal(journalText(a.file) + JSON.stringify(duplicate))).toThrow(/different contents/);
    const foreign = { ...a.file.header, journalId: crypto.randomUUID() };
    expect(() => parseJournal(journalText(a.file) + JSON.stringify(foreign))).toThrow(/different journals/);
    expect(() => parseJournal(journalText(a.file) + '{"broken"')).toThrow(/Invalid JSON/);
    expect(parseJournal('\r\n \n')).toBeNull();
    expect(() => parseJournal(JSON.stringify(a.file.header))).toThrow(/no encrypted starting/);
  });

  it('acknowledges only deployed batches, retains pending exports and rebases independent local work', async () => {
    const created = await createJournal(createInitialState(false), phrase);
    const localState = { ...created.journal.state, objective: 'Pending local goal' };
    const local = await appendWorkspace(created.journal, localState, created.key);
    const notPublished = await reviewJournal(local, 1, created.journal, localState, 'published', created.key);
    expect(notPublished.nextJournal).toBe(local);
    expect(notPublished.confirmedCount).toBe(1);
    expect(unpublishedText(local.file, notPublished.confirmedCount)).not.toBe('');
    const remoteState = { ...created.journal.state, capacity: 'gentle' as const };
    const remote = await appendWorkspace(created.journal, remoteState, created.key);
    const review = await reviewJournal(local, 1, remote, localState, 'published', created.key);
    expect(review.rebased).toBe(true);
    expect(review.merge?.state?.objective).toBe(localState.objective);
    expect(review.merge?.state?.capacity).toBe('gentle');
    expect(review.confirmedCount).toBe(2);
    const imported = await reviewJournal(created.journal, 1, remote, created.journal.state, 'file', created.key);
    expect(imported.confirmedCount).toBe(1);
    await expect(reviewJournal(remote, 2, created.journal, remoteState, 'published', created.key)).rejects.toThrow(/previously confirmed/);
  });

  it('validates cache boundaries and the actual deployable journal without needing a secret in CI', async () => {
    const created = await createJournal(createInitialState(false), phrase);
    const cache = makeJournalCache(created.journal.file, 0);
    expect(parseJournalCache(JSON.stringify(cache))).toEqual(cache);
    expect(() => parseJournalCache(JSON.stringify({ ...cache, confirmedCount: 2 }))).toThrow(/checkpoint/);
    const deployed = readFileSync(new URL('../../public/careeros-progress.jsonl', import.meta.url), 'utf8');
    expect(() => parseJournal(deployed)).not.toThrow();
  });

  it('rejects weakened or unsupported encryption parameters and short passphrases', async () => {
    await expect(createJournal(createInitialState(false), 'short')).rejects.toThrow(/12/);
    const created = await createJournal(createInitialState(false), phrase);
    const weak = structuredClone(created.journal.file);
    const altered = { ...weak.header, kdf: { ...weak.header.kdf, iterations: 1 } };
    expect(() => parseJournal(`${JSON.stringify(altered)}\n${JSON.stringify(weak.batches[0])}\n`)).toThrow(/supported.*header/);
  });

  it('retains previous-roadmap archives and genuine evidence during encrypted replay', async () => {
    let state = createInitialState(false, '2.0.0');
    state = recordEvidence(state, {
      missionId: 'system', checkpointId: state.missions.system.checkpointId,
      title: 'Synthetic old-edition evidence', summary: 'An explicitly checked synthetic previous-version demonstration.',
      kind: 'diagram', url: '', advance: true, criteriaConfirmed: true,
    });
    const created = await createJournal(state, phrase);
    const adopted = upgradeRoadmap(state, 'system');
    const next = await appendWorkspace(created.journal, adopted, created.key);
    const replay = (await unlockJournal(next.file, created.key)).state;
    expect(replay).toEqual(adopted);
    expect(replay.archives[0].progress.completedCheckpointIds).toEqual(state.missions.system.completedCheckpointIds);
    expect(replay.missions.system.completedCheckpointIds).toEqual([]);
    expect(replay.evidence).toEqual(state.evidence);
  });
});

describe('workspace journal reconciliation', () => {
  it('rejects mission deletion instead of silently resetting FDE through old-backup normalization', () => {
    const state = createInitialState(false);
    expect(() => applyWorkspaceChanges(state, [{
      key: 'mission/fde', before: canonicalJson(state.missions.fde), after: null,
    }], state.updatedAt)).toThrow('missing required mission: fde');
    expect(() => applyWorkspaceChanges(state, [{
      key: 'mission/fde', before: canonicalJson(state.missions.fde),
      after: canonicalJson({ ...state.missions.fde, roadmapVersion: '2.0.0' }),
    }], state.updatedAt)).toThrow('Unknown roadmap version');
    expect(state.missions.fde.checkpointId).toBe('fde-v3-fde-01');
  });
  it('preserves all versioned records and optional collections through a diff roundtrip', () => {
    const base = createInitialState(false), changed = fixture();
    expect(applyWorkspaceChanges(base, workspaceChanges(base, changed), changed.updatedAt)).toEqual(changed);
    expect(workspaceChanges(changed, { ...changed, updatedAt: new Date().toISOString() })).toEqual([]);
    expect(canonicalJson({ z: 1, A: 2, a: 3 })).toBe('{"A":2,"a":3,"z":1}');
  });

  it('merges independent record additions, sorts history and refuses stale or duplicate changes', () => {
    const base = createInitialState(false);
    const local = recordChange({ ...base, capacity: 'gentle' }, 'A local setting');
    const remote = { ...base, readiness: { ...base.readiness, 'Coding patterns': 'building' as const } };
    const result = mergeWorkspaces(base, local, remote);
    expect(result.state?.capacity).toBe('gentle');
    expect(result.state?.readiness['Coding patterns']).toBe('building');
    const changes = workspaceChanges(base, local);
    expect(() => applyWorkspaceChanges(base, [...changes, changes[0]], local.updatedAt)).toThrow(/twice/);
    expect(() => applyWorkspaceChanges(local, changes, local.updatedAt)).toThrow(/parent/);
  });

  it('surfaces conflicting settings and offline record-ID collisions without changing either workspace', () => {
    const base = createInitialState(false);
    const local = recordChange({ ...base, objective: 'Local selected direction' }, 'Local direction');
    const remote = recordChange({ ...base, objective: 'Published selected direction' }, 'Published direction');
    const before = [JSON.stringify(local), JSON.stringify(remote)];
    const merged = mergeWorkspaces(base, local, remote);
    expect(merged.state).toBeNull();
    expect(merged.conflicts).toContain('Setting: objective');
    expect(merged.conflicts.some(value => value.startsWith('History record:'))).toBe(true);
    expect([JSON.stringify(local), JSON.stringify(remote)]).toEqual(before);
  });

  it('rejects a structurally mergeable but semantically invalid completion instead of inventing credit', () => {
    const base = createInitialState(false), local = fixture();
    const remote = structuredClone(local);
    remote.objective = base.objective;
    remote.evidence[0].id = 'different-completion-evidence';
    const result = mergeWorkspaces(base, local, remote);
    expect(result.state).toBeNull();
    expect(result.validationError).toContain('Duplicate checkpoint completion');
  });
});
