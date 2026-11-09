# Tracking adoption: pre-write inventory

Observed 2026-11-06, before any issue or Project mutations.

## Authority and source boundary

The owner authorizes local tracking/tooling/documentation, repository-local Git
attribution and repository-specific issue/Project creation and updates. No
application feature, commit, push, workflow activation, deployment, schedule or
secret provisioning is part of this migration.

Canonical public repository: `Zanark/CareerOS`, database ID `1403603358`,
node ID `R_kgDOU6lJng`, default branch `main`.
The remote and authenticated repository response agree. The required credential
runner reports the owner account and repository administration permission.
Only capability names were examined; no credential content was inspected.

## Existing state

- Clean source at `9b2903b0f1362e2318e9f8a81da379bc557f1309`.
- All 62 reachable commits were inventoried by subject/date. Relevant maintained
  guide, architecture, appearance, agent contract and source-mapping text was read.
- No local TODO directory, `.todo` workstreams, issue mappings or development
  tracking synchronizer exists. The browser's encrypted progress journal is a
  different feature and will not be changed or used for issue tracking.
- Complete paginated repository issue inventory: zero issues.
- Complete owner Project inventory: two Projects, each linked to another
  repository. Complete repository-linked Project inventory: zero.
- `gh project list` failed with `unknown owner type`; direct GraphQL discovery
  succeeded. The failed command was not treated as an empty inventory.
- Historical Pages run
  [41529974393](https://github.com/Zanark/CareerOS/actions/runs/41529974393)
  was read back as successful at the exact source above. That is historical
  qualification, not an application test or deployment performed today.

## Proposed bounded writes

Create one owner-owned Project named CareerOS, retain its default private
visibility, associate only CareerOS, discover its actual field IDs and preserve
existing options while adding missing stages. Do not reuse another board.

Because there are no original workstream files, author seven **retrospective
milestone groups**, plus the current adoption workstream. These are new tracking
records, not recovered original TODOs or an exhaustive issue-per-commit history.
Use public product documentation and published source revisions only. Historical
dates remain attributed content; GitHub creation/closure dates will be today.

| Stable workstream | Source basis | Issue / Project target |
|---|---|---|
| tracker-foundation | `4a05f8a`, `c96b0b0`; current guide/architecture | Closed/completed; Done |
| appearance-and-identity | `187a43c`, `e0bcc60`, `c087544`, `c9a461d`, `6943781`; appearance guide | Closed/completed; Done |
| versioned-roadmaps | `ec43468`, `b879cc4`, `9ade200`, `8cf0889`, `71cc430`; operation-source register | Closed/completed; Done |
| career-graph | `8cf0889`, `efdc7e6`, `091d751`, `2c3e4e7`, `78e0732`; current graph guide | Closed/completed; Done |
| focus-room | `9b22994`, `fdfb477`, `091d751`; focus architecture/guide | Closed/completed; Done |
| tutorial-and-help | `b7ae40d`, `adafb54`, `9fe0cfd`, `78e0732`; current guide | Closed/completed; Done |
| encrypted-progress-journal | `fb5b1a3`, `9b2903b`; journal documentation and successful gate | Closed/completed; Done |
| github-tracking-adoption | This authorized local migration | Initially open/In progress; completed only after verified reconciliation |

Pilot: `tracker-foundation`. First preview all work, then apply only that
workstream, verify all three surfaces and repeat without mutation. Only then
backfill the other unambiguous workstreams.

## Explicit exclusions and limitations

- `TODO/00_INDEX.todo`: navigation, no feature issue.
- `TODO/09_DEVELOPMENT_LEDGER.todo`: perpetual history, no feature issue.
- Private continuity, PDFs, personal records, browser storage, backups, encrypted
  journal contents, conversations and machine-local evidence: not imported.
- Curriculum checkpoints are user learning records, not software workstreams.
- No speculative unfinished product backlog or user acceptance is invented.
- Human visual acceptance, real-user progress and new runtime qualification are
  not completion claims of this tracking migration.
- Local backlinks/configuration remain uncommitted unless separately authorized.

The executable preview and verified pilot/backfill receipts are recorded
separately. This inventory alone does not claim remote synchronization.
