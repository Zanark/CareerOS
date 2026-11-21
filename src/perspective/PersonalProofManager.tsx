import { useRef, useState } from 'react';
import { Plus, Upload } from 'lucide-react';
import { Modal } from '../components';
import type { AppState, PersonalProof } from '../domain/types';
import { MAX_WORKSPACE_BYTES } from '../workspaceFile';
import { addPersonalProof, newPersonalProof, parsePersonalProofFile } from './personalProof';

export function PersonalProofManager({ state, commit, practice }: {
  state: AppState; commit: (transform: (state: AppState) => AppState) => boolean; practice: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [records, setRecords] = useState<PersonalProof[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function load(file: File) {
    setError('');
    setNotice('');
    try {
      if (file.size > MAX_WORKSPACE_BYTES) throw new Error('This history file is larger than the 5 MB limit.');
      const parsed = parsePersonalProofFile(JSON.parse(await file.text()));
      const pending = newPersonalProof(state, parsed);
      if (!pending.length) setNotice('These personal-history records are already saved. Nothing changed.');
      else setRecords(pending);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to read this history file.');
    } finally {
      if (input.current) input.current.value = '';
    }
  }

  function save(items: PersonalProof[]) {
    if (!commit(current => addPersonalProof(current, items))) {
      setError('History was not added. Check the workspace warning; existing records are unchanged.');
      return;
    }
    setRecords(null);
    setAdding(false);
    setError('');
    setNotice(practice ? 'Added to tutorial practice only.' : 'Personal history added. No mission progress was changed.');
  }

  return <div className="personal-proof-manager">
    <div className="button-row">
      <button type="button" className="button secondary" onClick={() => { setError(''); setNotice(''); input.current?.click(); }}><Upload size={16} />Load personal history</button>
      <button type="button" className="button secondary" onClick={() => { setError(''); setNotice(''); setAdding(true); }}><Plus size={16} />Add a past accomplishment</button>
      <a className="text-link" href="#/settings">Import an existing workspace backup</a>
    </div>
    <input ref={input} className="sr-only" type="file" accept=".json,application/json" aria-label="Choose personal-history file"
      onChange={event => { const file = event.target.files?.[0]; if (file) void load(file); }} />
    {error && !records && !adding && <p className="form-error" role="alert">{error}</p>}
    {notice && <p className="personal-proof-notice" role="status">{notice}</p>}
    {records && <Modal title="Review your personal history" subtitle="Only add records that accurately describe something you already did." onClose={() => setRecords(null)}>
      <div className="personal-proof-preview">
        {records.map(record => <article key={record.id}><h3>{record.title}</h3><p>{record.detail}</p><p className="muted small">Source: {record.source}</p>{record.date && <p className="small">Date supplied: {record.date}</p>}</article>)}
      </div>
      <p className="privacy-note">{practice ? 'Temporary practice only.' : 'Kept in this browser and included in your unencrypted workspace backups. Not uploaded.'} This adds history; it does not replace your workspace or complete checkpoints.</p>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="modal-footer"><button type="button" className="button secondary" onClick={() => setRecords(null)}>Cancel</button><button type="button" className="button primary" onClick={() => save(records)}>Add these records</button></div>
    </Modal>}
    {adding && <Modal title="Add past work" subtitle="Describe completed work, not a future goal. Dates are optional when you do not know them." onClose={() => setAdding(false)}>
      <form className="stack-form" onSubmit={event => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const date = String(data.get('date') ?? '').trim();
        save([{
          id: `personal-${crypto.randomUUID()}`,
          title: String(data.get('title')).trim(), detail: String(data.get('detail')).trim(),
          source: String(data.get('source')).trim(), url: String(data.get('url')).trim(),
          ...(date ? { date } : {}),
        }]);
      }}>
        <label>What did you accomplish?<input name="title" required minLength={3} maxLength={160} /></label>
        <label>What did you actually do?<textarea name="detail" required minLength={10} maxLength={2000} rows={4} /></label>
        <label>Evidence or source<input name="source" required minLength={3} maxLength={500} placeholder="A document, artifact, or your own dated account" /></label>
        <div className="form-row"><label>Date, if known<input type="date" name="date" /></label><label>Artifact link, optional<input type="url" name="url" maxLength={2048} placeholder="https://..." /></label></div>
        <p className="privacy-note">Private browser data, not a secure vault. Do not include confidential material. This records history without awarding mission completion.</p>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="modal-footer"><button type="button" className="button secondary" onClick={() => setAdding(false)}>Cancel</button><button className="button primary">Save past accomplishment</button></div>
      </form>
    </Modal>}
  </div>;
}
