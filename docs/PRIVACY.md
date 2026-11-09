# Privacy and local data

## What is public

The published static app ships source-aligned roadmap definitions, public problem-reference
links, authored study material and exercise prompts, and clearly labeled fictional sample records only.
The original PDFs, including all documents in the expanded roadmap pack, are excluded.
Private source documents and personal baseline information must not be copied into the
site, repository, screenshots, or tests.

The application has no login, cloud workspace, AI service, analytics integration,
or automatic upload. Hosting providers still receive normal page/asset requests.
Opening an external artifact, job or research-source link leaves the app and uses that destination's
privacy rules. “No app upload” is not a promise that web hosting has no access logs.

**Optional repository sync** is a separate, explicitly enabled encrypted export. The browser
can encrypt your complete starting workspace and subsequent changes for you to append manually
to `public\careeros-progress.jsonl`, commit and publish. Only that ciphertext is intended to
be public; ordinary backups, raw personal-history files and source PDFs remain private.
The app never commits, pushes or uploads progress for you, and it stores no GitHub credentials.
Opening Repository sync may fetch that one same-origin journal file; it sends no workspace or
passphrase in the request.

**Keep going** reads personal history and saved work from the visible workspace only.
Past accomplishments are never bundled in the public source or sent to a remote service.
A personal-history file is read locally, previewed, and added only after confirmation.
It does not replace the workspace or award checkpoint credit. Artifact links open
only when clicked, without a referrer.

The DSA practice library also uses bundled references. Browsing sections and filtering
problems sends no progress to LeetCode. Clicking a problem link opens LeetCode in a new
tab without a referrer; that destination may have its own login or subscription rules.

The seven expanded practice workbooks load static study chunks from the same host.
These requests contain no workspace records. Search, filters, source-unit links and
reference inspection do not upload work or alter progress. Source save-state examples
and personal baseline material are not used as seed data.

The 3D career graph is rendered locally from the visible workspace. It does not
upload nodes, records or progress. **Copy brief for AI** writes to the local
clipboard only after you click it; review the contents before sharing elsewhere.
The application has no connected AI backend. Renderer diagnostics must not include
private record text.

Graph visibility checkboxes are temporary presentation choices, not deletion or
access control. Hidden items remain in this browser's workspace, backups and any
applicable copied mission brief. Review exports and clipboard contents before sharing.

## What stays in this browser

Progress, evidence text and links, plans, history, readiness, and opportunities are
stored under `careerhq.workspace.v1` in **localStorage**. Evidence is text/links, not
an uploaded file archive. The focus countdown is tab-local; its saved event log is not.
The compatible storage key now holds data format v2, including previous-roadmap archives,
private freelance leads, optional application effort fields, and recall records.
An optional `personalProof` collection holds user-supplied past accomplishments and
their sources. It is included in ordinary unencrypted workspace backups. Existing
workspaces without this collection are left unchanged until history is explicitly added.

An optional `focusSessions` collection records starts, planned durations and ordered
pause/resume/distraction/ending events. A distraction timestamp is the time of the
button report, not an automatically detected onset. Elapsed milliseconds describe the
running timer, not measured attention. No keystrokes, applications, browsing activity,
distraction causes or inferred mental-health scores are collected.

Discovery Atlas reads existing evidence and recall to derive its optional collection
and recent-day ribbon. It stores no extra profile, score, achievement ledger or
viewing analytics, and makes no external requests. Discovery receipts show only
source records already in this browser. Normal backups and the optional encrypted
journal carry those records; confirmed replacement/reset recalculates the collection.
Collection completion is not independently assessed ability or current retention.

These personal activity records travel in ordinary unencrypted workspace exports.
Resetting the timer preserves them; explicitly replacing/resetting the whole workspace
can remove them, with the same backup warnings as other records. A missing ending
after a closed tab is not reconstructed as completed work. Tutorial reports remain
in the isolated practice workspace.

**localStorage is not encrypted or a secure vault.** Saved work is ordinary browser
data. Anyone with suitable access to the browser,
extensions, developer tools, or same-origin JavaScript may read or modify it.

GitHub Pages project paths are **not separate origins**. For example, another site
running under `https://zanark.github.io/` can access storage used by `/CareerOS/`
(and the previous `/CareerHQ/` path).
A distinct storage key avoids accidental collisions; it is not access control.

Do not store passwords, tokens, credentials, confidential employer material, or
sensitive personal information. Prefer synthetic examples and non-sensitive summaries.
There is no automatic cloud sync, account recovery, or automatic server backup. Clearing site data,
using private browsing, browser cleanup, or storage failure can lose local work.

The optional repository journal adds **manual cross-device publication**, not a cloud-sync
service. It does not change the default storage or existing recovery tools. Its separately
stored cache (`careerhq.repository-journal.v1`) contains encrypted batches and a publication
checkpoint, never the passphrase or decrypted key. Normal backups do not include that cache.
The decrypted workspace still uses the existing unencrypted browser storage.

Journal keys are derived locally with PBKDF2-SHA-256 and used with AES-256-GCM, fresh random
salt/IVs and authenticated batch/parent metadata. The key is non-extractable and remains in
memory only while unlocked; locking/reloading or entering tutorial practice discards it.
This does not make the browser a vault or protect against malicious same-origin JavaScript.
Anyone may download ciphertext and try guessing its passphrase offline. Public file sizes,
batch counts and repository history are not hidden; deleting a file does not erase older Git
revisions. Keep a strong unique passphrase and private recovery backup: there is no password reset.

Compatible incoming updates retain local pending work; ambiguous edits and colliding record IDs
require explicit review. First connections and whole-workspace conflict choices require
confirmation. Exporting/copying/downloading is not publication; only a deployed-file check can
acknowledge a batch. File-only review cannot do so. An old or damaged journal never justifies
silently clearing the browser workspace.

Normal UI updates at the same origin preserve compatible saved data; a new browser,
device, scheme/domain/port or hosted-versus-local address is a separate storage location.
Export/import is the supported transfer mechanism. Future format changes must provide
an explicit migration; unsupported state must be recoverable rather than silently reset.

## Tutorial

The guided tutorial uses in-memory practice data, not the stored workspace. Its actual
forms, checkpoint completions, opportunities, imports and resets affect only that example.
Theme changes are temporary too. Exiting discards practice state and restores the real
view without writing over newer data from another tab.

Practice exports are labeled `careerhq-tutorial-example-*`; they are not real backups.
Do not enter sensitive information in the tutorial either: if you export what you typed,
it is still readable in that downloaded file.

## Backups, imports, and reset

- **Export** downloads plaintext JSON containing the whole local workspace. Keep it
  private and protect it yourself. Do not commit it, attach it to public issues, or
  put it in the deployed build.
- **Import** reads a selected file locally, checks schema/version and record references,
  and asks before **replacing the whole workspace**. It does not merge. Invalid input
  must fail without overwriting the existing workspace.
- **Reset** destroys the current local workspace after confirmation. Export first.
  Removing sample records is not the same as removing your saved backups from disk.
- **Recovery** does not silently overwrite unreadable storage. Download the original
  data before choosing a clean replacement.
- **Multiple tabs** can become stale. Reload the warned tab before editing; do not
  treat localStorage conflict checks as a synchronization service.

Validation prevents malformed application state, not malicious modification by
someone who controls the browser. An accepted backup is not cryptographic proof of
the events or achievements it describes.

Implementation references: `src/domain/catalog.ts` (`missions`),
`src/domain/engine.ts` (`createInitialState`, `parseState`),
`src/useWorkspace.ts` (`loadWorkspace`, `replace`, `downloadFile`),
`src/dialogs.tsx` (`EvidenceDialog`, `OpportunityDialog`), and
`src/pages.tsx` (`DataPage`).
