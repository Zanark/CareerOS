# Development workflow and GitHub tracking adoption

CareerOS adopts the current development/documentation manual on **2026-11-06**.
This adds maintainer tracking; it does not change the browser app, saved career
progress or the optional encrypted progress journal.

[Contributor contract](../AGENTS.md) · [Workstream index](../TODO/00_INDEX.todo) ·
[Pre-write inventory](tracking/2026-11-06-inventory.md) ·
[Adoption receipt](tracking/2026-11-06-adoption.md)

## Adopted repository and board

- Canonical public repository: `Zanark/CareerOS`, ID `1403603358`,
  node `R_kgDOU6lJng`, default branch `main`.
- Project: **[CareerOS #4](https://github.com/users/Zanark/projects/4)**, owned
  by Zanark, associated with CareerOS. The new board retains private visibility;
  its issues remain public. No existing board or access permission was changed.
- Primary view: **[Kanban](https://github.com/users/Zanark/projects/4/views/1)**,
  GitHub `BOARD_LAYOUT`. The owner's follow-up converted existing view 1 from
  Table rather than deleting/recreating the Project or any of its eight items.
  View identity/layout are recorded in the configuration; the sync runtime does
  not silently change view presentation.
- Project ID: `PVT_kwHOAe2wCs4BqeZy`.
- Status field ID: `PVTSSF_lAHOAe2wCs4BqeZyzho1YK8`.
- Runnable configuration: [`.github/todo-sync.json`](../.github/todo-sync.json).
  It records actual discovered option IDs, explicit public-safe workstreams and
  exclusions. They are identifiers, not credentials.
- Persistent mapping/recovery: [`.github/todo-sync-state.json`](../.github/todo-sync-state.json).
  Preserve it alongside the workstreams; it contains issue/item identities and
  hashes of the last verified managed state, not private workspace records.

There was no prior TODO directory, issue mapping or tracking synchronizer.
Files 01-07 are **new retrospective milestone groups** based on published
revisions and maintained public documentation, not recovered original TODOs.
File 08 is this adoption. This is not an exhaustive issue-per-commit history.
GitHub's new creation/closure timestamps are not historical product timestamps.

## Local contracts and status mapping

Keep `TODO/00_INDEX.todo`, stable numbered workstreams and
`TODO/09_DEVELOPMENT_LEDGER.todo`. Do not replace them with a flat checklist.
Every actual workstream retains Status, Milestone, Dependencies, Purpose, Tasks,
Acceptance criteria, Completion evidence and Completion log. Additional
`Workstream ID`, `Title` and `GitHub issue` fields support synchronization.
Use actual prerequisites, not file order, and never fabricate human approval.

| Exact local Status | Issue state / reason | Project Status |
|---|---|---|
| `NOT_STARTED` | open | Backlog |
| `READY` | open | Ready |
| `IN_PROGRESS` | open | In Progress |
| `IN_REVIEW` | open | In review |
| `DONE` | closed / completed | Done |
| `CANCELLED`, `SUPERSEDED` | closed / not_planned | Not planned |
| `BLOCKED` | open | explicit `Blocked stage` |

`BLOCKED` also requires a specific `Blocker:` field. Its stage must be Backlog,
Ready, In Progress or In review. The body preserves the blocking reason; no
silent completion or status guessing is permitted. Composite phrases such as
`DONE locally; deployment BLOCKED` are rejected: decide whether publication is
an acceptance criterion or separate follow-through and record that boundary.

Project's unused default `Todo` option remains available; default option IDs
were preserved. Cancellation has its own Not planned option and never masquerades
as completed work. Reopening locally reopens the existing issue and moves the
same item to its intended stage. Board movements do not rewrite local files.

## Public content and stable identity

The local TODO owns its managed issue description and completion. The issue
contains the workstream, tasks, dependencies, criteria, evidence and updates in
a bounded section. `GitHub issue` is omitted from that mirror to avoid circular
backlink churn. Line endings are normalized; all other source content is retained.
The source path is a repository-relative location, not a claim that uncommitted
tracking files are already available on the default branch.

Identity marker:
`<!-- careeros-todo:1403603358:stable-workstream-id -->`.
It uses the numeric repository ID and immutable Workstream ID, not title or
filename. Keep the ID when renaming/moving a workstream. Change the configured
path deliberately. Do not renumber completed work just to insert another file.

Issue comments and body text outside
`<!-- careeros-todo-managed:start -->` / `<!-- careeros-todo-managed:end -->`
are human-owned and preserved. Hashes of the managed body plus issue title,
state/reason and Project status establish the synchronization baseline.
Unexpected edits conflict; matching an already-intended target is safe to reuse.

Existing mappings and complete issue/Project inventories are consulted before
creation. Duplicate identity markers/items, a conflicting backlink, a removed
mapped item or an unmanaged issue with the same title require explicit review.
Do not delete remote objects when local files disappear. Preserve the record
and reconcile removal or use an explicit cancelled/superseded state.

To adopt an existing unmarked issue, first review the actual issue and preserve
all human content. Only with authority to manage that workstream, add its unique
identity and correctly bounded mirror, then preview. Do not change a baseline
hash merely to suppress a conflict. For a genuine remote correction, deliberately
reconcile the local contract before acknowledging the new verified baseline.

The runtime checks common credential-shaped values and private/local paths.
These checks are a safeguard, **not an exhaustive privacy classifier**.
`publicSafe: true` means the executing agent has actually reviewed the complete
workstream for the public repository. Re-review meaningful edits. Unreviewed
records are blocked; unknown new `.todo` files must be classified explicitly.
Never import `.agent-context`, conversations, private operational/personal
records, PDFs, browser exports or real encrypted progress into issues.

## Exact local commands

Run from `C:\devdesk\homedesk\CareerHQ`. Node and `gh` must already be available.
The synchronizer uses Node standard libraries and `gh`; it adds no packages.

The canonical credential runner is:
`C:\devdesk\homedesk\skill-library\skills\development-documentation-manual\scripts\with_github_token.py`.
Resolve the manual's documented rebased support root on another machine.
Never copy the credential file into this repository.

Read-only preview (the default, with an explicit optional local receipt):

```powershell
python "C:\devdesk\homedesk\skill-library\skills\development-documentation-manual\scripts\with_github_token.py" -- node "C:\devdesk\homedesk\CareerHQ\scripts\sync-todos.mjs" --preview --report docs\tracking\latest-preview.json
```

Apply one reviewed workstream:

```powershell
python "C:\devdesk\homedesk\skill-library\skills\development-documentation-manual\scripts\with_github_token.py" -- node "C:\devdesk\homedesk\CareerHQ\scripts\sync-todos.mjs" --apply --only tracker-foundation --report docs\tracking\latest-pilot.json
```

Apply all reviewed workstreams, only after the preview/pilot gate:

```powershell
python "C:\devdesk\homedesk\skill-library\skills\development-documentation-manual\scripts\with_github_token.py" -- node "C:\devdesk\homedesk\CareerHQ\scripts\sync-todos.mjs" --apply --report docs\tracking\latest-apply.json
```

Repeat the chosen apply to verify zero actions/creates and stable issue/item IDs.
Report arguments are repository-relative paths under `docs\tracking`; configuration
uses portable repository paths. A preview never changes remote state, recovery
baselines or backlinks; only an explicitly requested local report is written.

Focused, credential-free behavior tests:

```powershell
npm run test:tracking
```

Existing application checks remain `npm run validate`, `npm run build` and
`npm run test:e2e`. Do not rerun browser/GPU suites for documentation-only changes
or describe historical gate results as freshly executed tests.

## Credential, retry and concurrency boundaries

The runner internally resolves the manual's ignored/untracked local `.env`;
if absent, it follows its documented process/current-user fallback. Never view,
print, search, hash, copy, summarize or package the real credential file. Never
ask for its contents, dump environments, enable credential-revealing debugging,
persist global `GH_TOKEN`, or put a token in command arguments or artifacts.
The runner supplies credentials only to the reviewed trusted child command.

Initial adoption verified the owner account, public repository permissions,
Project edit access and advertised project/repo/workflow scope names. Workflow
capability did not authorize any Actions or secret changes. Local credentials
are not hosted secrets; missing/rejected credentials stop the operation.
The tool checks the adopted account and numeric repository identity before writes.

Issue creation, closure, Project membership/status and backlink writes are
separate recoverable steps, not a transaction. Expected targets are saved before
mutation; successful identities are saved as each step completes. Only complete
remote read-back plus persistent local backlink verification replaces the
verified baseline. Interrupted targets remain explicit recovery metadata.

After an uncertain timeout, **preview first**: complete paginated inventories
rediscover stable issue markers and membership before any later create.
Mutation requests are not blindly retried. Rate limits/permissions/invalid
responses fail explicitly; repair access or wait as appropriate, then preview
and resume. Up to three bounded read-backs tolerate short propagation delays;
a still-mismatched result remains partial, never success-shaped.

`creationPending` and `itemAdditionPending` persist before the respective
non-idempotent request. If an uncertain result is still invisible, even a
successful empty inventory does not authorize another create/add. Wait and
preview again; discovery of the original object resumes its identity. Definitive
HTTP rejections clear only that operation intent and remain retryable after the
access/input problem is repaired. If an uncertain object never appears, reconcile
the original operation explicitly before clearing its intent; never erase the
whole baseline or force a new create merely to get a green result.

An exclusive checkout-local `.github\todo-sync.lock` records the owner PID.
If a process is interrupted, inspect that exact PID and its receipt before
removing a confirmed stale lock. Never kill unrelated processes or clear a
possibly active lock. Atomic writes protect baseline/backlink files; concurrent
local workstream edits are detected and not overwritten.

This is **not a distributed transaction or cross-clone lock**. Coordinate writers
across machines; the tool re-reads before changes but cannot make GitHub issue
and Project APIs atomic against a simultaneous human/other-clone write.
Pagination covers all issues and Project items; a Project with over 100 linked
repositories or fields explicitly blocks pending a deliberate extension.
Conflicting items remain unchanged while independent safe items can proceed.

## Invocation, evidence and commit policy

For every new actual TODO, meaningful task/description/evidence change,
completion, reopening, cancellation or supersession:

1. Read the affected contract and preserve existing local/remote edits.
2. Update the eight fields, index and causal ledger; review publication safety.
3. Configure stable identity for new files, preview and apply within task authority.
4. Verify managed content, issue state/reason, exact Project item/status and backlink.
5. Retain the recovery mapping and public-safe execution receipt.

Do not claim synchronization succeeded after issue creation alone. Do not stage,
commit or push backlinks/mappings automatically. GitHub writes can be complete
while the local tracking source remains intentionally uncommitted. No Actions
definition, scheduler, unattended service or reverse writer was added.

Future separately authorized commits use local `Zanark` /
`32354314+Zanark@users.noreply.github.com`, verified with both `git var
GIT_AUTHOR_IDENT` and `git var GIT_COMMITTER_IDENT` immediately before committing.
Environment overrides must not change the intended attribution. Global settings
and historical authors stay unchanged; retain current required agent trailers.

See the adoption receipt for actual pilot/backfill counts, issues, validation
scope, failures and remaining limitations. Instructions alone do not activate
already-running sessions or continuous synchronization.
