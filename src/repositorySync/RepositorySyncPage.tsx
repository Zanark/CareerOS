import { useEffect, useRef, useState } from 'react';
import { ArrowDownToLine, ArrowRight, ClipboardCopy, FileLock2, LockKeyhole, RefreshCw, ShieldCheck } from 'lucide-react';
import { PageHeading, SectionTitle } from '../components';
import { countCompletedCheckpoints, localDate } from '../domain/engine';
import type { AppState } from '../domain/types';
import { downloadFile } from '../useWorkspace';
import { serializeWorkspace } from '../workspaceFile';
import { JOURNAL_FILENAME, MAX_JOURNAL_BYTES } from './journalFormat';
import type { RepositorySyncModel } from './useRepositorySync';
import './repository-sync.css';

function SnapshotSummary({ title, state }: { title: string; state: AppState }) {
  return <section className="repository-snapshot"><h3>{title}</h3><dl>
    <div><dt>Completed checkpoints</dt><dd>{countCompletedCheckpoints(state)}</dd></div>
    <div><dt>Evidence records</dt><dd>{state.evidence.length}</dd></div>
    <div><dt>Applications</dt><dd>{state.opportunities.length}</dd></div>
    <div><dt>Focus sessions</dt><dd>{state.focusSessions?.length ?? 0}</dd></div>
  </dl><details><summary>Inspect this decrypted snapshot</summary><pre>{JSON.stringify(state, null, 2)}</pre></details></section>;
}

export function RepositorySyncPage({ sync }: { sync: RepositorySyncModel }) {
  const [passphrase, setPassphrase] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [understood, setUnderstood] = useState(false);
  const [replaceAcknowledged, setReplaceAcknowledged] = useState(false);
  const [pasted, setPasted] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);

  async function submitPassphrase(create: boolean) {
    if (create && passphrase !== confirmation) {
      sync.reportError('Passphrases do not match. No journal was created.');
      return;
    }
    if (create) await sync.create(passphrase);
    else await sync.unlock(passphrase);
    setPassphrase('');
    setConfirmation('');
  }

  async function copyUpdates() {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard access is unavailable in this browser.');
      await navigator.clipboard.writeText(sync.exportText);
      sync.reportError('');
      sync.reportNotice('Encrypted updates copied. Append the complete block to the repository journal; copying does not publish it.');
    } catch (error) {
      sync.reportError(`Updates were not copied. Use Download updates or select the encrypted text below. ${error instanceof Error ? error.message : 'Clipboard permission was denied.'}`);
    }
  }

  async function importFile(file: File) {
    try {
      if (file.size > MAX_JOURNAL_BYTES) throw new Error('The encrypted journal exceeds the 24 MB limit.');
      await sync.openFile(await file.text());
    } catch (error) {
      sync.reportError(`Journal file not loaded. ${error instanceof Error ? error.message : 'Unable to read this file.'}`);
    } finally { if (fileInput.current) fileInput.current.value = ''; }
  }

  const creating = !sync.connected && !sync.candidate;
  const review = sync.review;
  const canCombine = !!review?.merge?.state && !review.firstConnection;
  const blocked = sync.busy || sync.metadataConflict;
  useEffect(() => { setReplaceAcknowledged(false); }, [review]);

  return <div className="repository-sync" data-tour="repository-sync">
    <PageHeading eyebrow="OPTIONAL / MANUAL PUBLICATION" title="Repository sync"
      description="An encrypted, append-only progress journal for your GitHub Pages site. Existing browser saving and ordinary backups stay exactly as they are." />
    {sync.practice ? <section className="panel"><h2>Real-journal controls are unavailable in tutorial practice.</h2>
      <p>The tutorial does not read, encrypt, export or replace your real repository journal. Exit practice to configure this optional feature.</p>
      <a className="text-link" href="#/settings">Return to practice backups<ArrowRight size={16} /></a></section> : <>
      <section className="panel repository-boundary">
        <ShieldCheck size={26} /><div><h2>Your browser encrypts. You publish.</h2>
          <p>Only encrypted journal text belongs in the public repository. Your passphrase and key are never saved there or uploaded.
            A strong, unique passphrase is essential: anyone can download the encrypted file and try guesses offline.</p>
          <p className="muted small">There is no password reset or server account. Keep your passphrase in a password manager and keep a private backup.
            Locking this journal does not encrypt or hide the app&apos;s existing browser-local workspace.</p></div>
      </section>
      <div className="repository-stats" aria-label="Repository sync status">
        <div><strong>{sync.unlocked ? 'Unlocked' : sync.connected ? 'Locked' : 'Not connected'}</strong><span>Journal on this browser</span></div>
        <div><strong>{sync.confirmedCount}</strong><span>Batches confirmed in deployment</span></div>
        <div><strong>{sync.unconfirmedCount}</strong><span>Exported batches not confirmed</span></div>
        <div><strong>{sync.unlocked ? sync.pendingCount : '-'}</strong><span>Local sections changed since export</span></div>
      </div>
      {sync.error && <div className="alert error" role="alert">{sync.error}</div>}
      {sync.notice && <div className="alert" role="status">{sync.notice}</div>}
      {sync.busy && <p role="status">Encrypting, validating or checking the journal. Your existing work remains saved.</p>}

      <div className="button-row repository-toolbar">
        <button className="button secondary" onClick={() => void sync.checkPublished()} disabled={blocked}>
          <RefreshCw size={16} />Check published updates
        </button>
        {(sync.unlocked || review) && <button className="button secondary" onClick={() => {
          sync.lock(); setPassphrase(''); setConfirmation(''); setReplaceAcknowledged(false);
        }}><LockKeyhole size={16} />Lock journal</button>}
        <a className="button secondary" href="#/settings">Ordinary backup & restore<ArrowRight size={16} /></a>
      </div>

      {!sync.unlocked && !review && !sync.recoveryRaw && <section className="panel repository-unlock">
        <SectionTitle title={creating ? 'Create your journal' : 'Unlock your journal'} />
        <p>{creating ? 'First device: capture your current workspace as an encrypted starting snapshot. If you already published a journal, check published updates instead.' :
          sync.connected ? 'Unlock once for this open workspace. The key stays only in memory, including while you visit other pages. Reloading, locking or entering tutorial practice discards it.' :
            `This ${sync.candidate?.source === 'file' ? 'selected file' : 'deployment'} contains an encrypted journal. Enter its existing passphrase, then review before connecting this browser.`}</p>
        <form className="stack-form" onSubmit={event => { event.preventDefault(); void submitPassphrase(creating); }}>
          <label>Journal passphrase<input type="password" autoComplete={creating ? 'new-password' : 'current-password'}
            value={passphrase} onChange={event => setPassphrase(event.target.value)} minLength={12} maxLength={1024} required disabled={blocked} /></label>
          {creating && <>
            <label>Confirm passphrase<input type="password" autoComplete="new-password" value={confirmation}
              onChange={event => setConfirmation(event.target.value)} minLength={12} maxLength={1024} required disabled={blocked} /></label>
            <label className="checkbox-label"><input type="checkbox" checked={understood} required
              onChange={event => setUnderstood(event.target.checked)} disabled={blocked} />
              <span>I will keep this passphrase and a private backup. A forgotten passphrase cannot be reset.</span></label>
          </>}
          <button className="button primary" disabled={blocked || (creating && !understood)}>
            <FileLock2 size={16} />{creating ? 'Create encrypted journal' : sync.connected ? 'Unlock & check published updates' : 'Unlock selected journal'}
          </button>
        </form>
      </section>}

      {review && <section className="panel repository-review" aria-label="Review repository progress">
        <SectionTitle title={review.firstConnection ? 'Connect this browser deliberately' : canCombine ? 'Review compatible updates' : 'Changes need your decision'} />
        <p>{review.source === 'published' ? 'This snapshot was read from the deployed site.' : 'This snapshot came from a local file, not a confirmed deployment.'}
          {' '}{review.firstConnection ? 'A new browser has no shared local baseline, so it will not guess how to merge existing work.' :
            canCombine ? 'Your independent local changes can be retained alongside this journal.' :
              'Nothing has been overwritten. Both complete snapshots remain available below; automatic merging is blocked.'}</p>
        {review.rebased && <p className="attention-text">New published history supersedes your earlier unpublished export chain.
          Discard old copied blocks after applying this review, then export again from the new baseline.</p>}
        {!!review.merge?.conflicts.length && <div role="alert"><h3>Conflicting sections</h3>
          <ul>{review.merge.conflicts.map(value => <li key={value}>{value}</li>)}</ul>
          <p>Offline devices can generate the same record ID. Different records with the same ID are a conflict, not a reason to drop one silently.</p></div>}
        {review.merge?.validationError && <p className="import-error" role="alert">The combined records fail workspace validation: {review.merge.validationError}</p>}
        <div className="repository-snapshots"><SnapshotSummary title="This browser" state={review.local} />
          <SnapshotSummary title="Incoming journal" state={review.incoming.state} /></div>
        <div className="button-row">
          <button className="button secondary" onClick={() => downloadFile(serializeWorkspace(review.local), `careerhq-backup-before-journal-${localDate()}.json`)}>
            Download private browser backup
          </button>
          <button className="button secondary" onClick={() => downloadFile(serializeWorkspace(review.incoming.state), `careerhq-backup-incoming-journal-${localDate()}.json`)}>
            Download private incoming backup
          </button>
        </div>
        <p className="muted small">These two backup downloads are unencrypted. Keep them private and never append them to the repository file.</p>
        {canCombine && <button className="button primary" disabled={blocked} onClick={() => void sync.confirmReview('combined')}>Apply combined updates</button>}
        <details><summary>{canCombine ? 'Choose a whole snapshot instead' : 'Choose which complete workspace to keep'}</summary>
          <p>Keeping this browser excludes incoming-only changes from the resulting workspace. Using the incoming snapshot replaces browser-only work.
            Neither choice edits GitHub; a later export records the chosen differences, including removals.</p>
          <label className="checkbox-label"><input type="checkbox" checked={replaceAcknowledged}
            onChange={event => setReplaceAcknowledged(event.target.checked)} disabled={blocked} />
            <span>I reviewed both snapshots and kept any private backups I need. This is a whole-workspace choice.</span></label>
          <div className="button-row">
            <button className="button secondary" disabled={blocked || !replaceAcknowledged} onClick={() => void sync.confirmReview('local')}>Keep this browser&apos;s workspace</button>
            <button className="button primary" disabled={blocked || !replaceAcknowledged} onClick={() => void sync.confirmReview('published')}>Use incoming workspace</button>
          </div>
        </details>
        <button className="text-button" disabled={blocked} onClick={() => { sync.dismissReview(); setReplaceAcknowledged(false); }}>Cancel review</button>
      </section>}

      {sync.unlocked && !review && <section className="panel repository-export">
        <SectionTitle title="Export repository updates" />
        <p>Prepare encrypted changes since the last export. Unconfirmed earlier batches are included again, so the latest block can be appended on its own.
          Exporting, copying and downloading do not mark anything published.</p>
        {!!sync.pendingSummary.removed && <p className="attention-text">The next export includes {sync.pendingSummary.removed} removed sections or records.
          A local reset or backup import can create removals; review before publishing.</p>}
        <button className="button primary" disabled={blocked} onClick={() => void sync.exportUpdates()}><FileLock2 size={16} />Prepare encrypted updates</button>
      </section>}

      {!!sync.exportText && !review && <section className="panel repository-output" aria-label="Encrypted repository export">
        <SectionTitle title="Append this complete block" />
        {sync.exportSummary && <p>{sync.exportSummary.added} added / {sync.exportSummary.changed} changed / {sync.exportSummary.removed} removed sections in the newly prepared batch.</p>}
        {!!sync.pendingCount && <p className="attention-text">More browser changes were saved after this export. They are still local; prepare another export to include them.</p>}
        <div className="button-row">
          <button className="button secondary" disabled={blocked} onClick={() => void copyUpdates()}><ClipboardCopy size={16} />Copy encrypted updates</button>
          <button className="button secondary" disabled={blocked} onClick={() => downloadFile(sync.exportText, `careeros-encrypted-updates-${localDate()}.jsonl`, 'application/x-ndjson')}>
            <ArrowDownToLine size={16} />Download encrypted updates
          </button>
        </div>
        <label>Encrypted appendable text<textarea readOnly rows={5} value={sync.exportText} spellCheck={false} onFocus={event => event.currentTarget.select()} /></label>
        <p>Append it at the end of <code>public\{JOURNAL_FILENAME}</code>. Keep line breaks; do not replace older lines or paste an ordinary backup here.
          Commit, push, wait for a successful Pages deployment, then check published updates on each device.</p>
      </section>}

      <details className="panel repository-file"><summary>Review a full journal file or pasted journal</summary>
        <p>Use this to check a combined file before committing, or to transfer an encrypted journal offline. It does not confirm that GitHub has published it.
          Use a complete journal including its header and starting snapshot, not an isolated incremental block.</p>
        <label>Encrypted journal file<input ref={fileInput} type="file" accept=".jsonl,.json,application/x-ndjson,application/json"
          disabled={blocked} onChange={event => { const file = event.target.files?.[0]; if (file) void importFile(file); }} /></label>
        <label>Paste a complete encrypted journal<textarea rows={4} value={pasted} onChange={event => setPasted(event.target.value)} disabled={blocked} spellCheck={false} /></label>
        <button className="button secondary" disabled={blocked || !pasted.trim()} onClick={() => void sync.openFile(pasted)}>Review pasted journal</button>
      </details>

      <section className="panel repository-instructions"><SectionTitle title="Laptop and phone workflow" />
        <ol><li>On your first device, create a journal and publish its initial encrypted block.</li>
          <li>On your phone, open Repository sync, check published updates, unlock with the same passphrase and review the first connection.</li>
          <li>Record work anywhere in CareerOS. Browser saving, completion criteria, focus reports and ordinary backups still work normally.</li>
          <li>Prepare and copy or download encrypted updates. Transfer the block to your laptop, append it to the repository file, commit and push.</li>
          <li>After deployment succeeds, unlock or check published updates. Only batches actually read from that deployment become confirmed.</li></ol>
        <p>Compatible independent edits combine automatically on connected browsers. Conflicts require review.
          If two offline exports branch from the same history, publish one, load it on the other browser and re-export; do not append stale branches.</p>
        <p className="muted small">The website cannot commit for you and stores no GitHub credentials. A cached journal or a downloaded block is not proof of publication.
          A journal is limited to 24 MB / 2,000 batches; keep backups before starting a new history. Encryption protects committed contents, not public file size or batch count.</p>
      </section>

      {(sync.connected || sync.recoveryRaw) && <details className="panel repository-disconnect"><summary>Encrypted recovery and disconnect</summary>
        <p>Disconnect removes only this browser&apos;s cached journal and unconfirmed export chain, not its current workspace or the repository file.
          Download the encrypted cache first if you need to preserve pending batches.</p>
        <div className="button-row">
          {!!sync.cachedJournal && <button className="button secondary" disabled={blocked} onClick={() => downloadFile(sync.cachedJournal, `careeros-encrypted-cache-${localDate()}.jsonl`, 'application/x-ndjson')}>Download encrypted cache</button>}
          {sync.recoveryRaw && <button className="button secondary" onClick={() => downloadFile(sync.recoveryRaw!, `careeros-sync-recovery-${localDate()}.json`)}>Download original sync metadata</button>}
          <button className="button secondary" disabled={blocked} onClick={() => {
            if (window.confirm('Disconnect repository sync on this browser? Download its encrypted cache first to keep unconfirmed export batches. Your current progress and the repository file will not be deleted.')) void sync.disconnect();
          }}>Disconnect repository sync</button>
        </div>
      </details>}
    </>}
  </div>;
}
