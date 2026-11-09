# CareerOS contributor contract

Read `docs/AGENT_CONTRACT.md`, `docs/DEVELOPMENT.md`, `TODO/00_INDEX.todo`
and the affected workstream before changing this repository. Preserve unrelated
work, browser records, frozen roadmap editions and the approved illustrated README.

## Development and documentation

Keep a live local CareerOS preview running whenever developing the website, and
share its actual URL so the user can watch changes. Verify readiness and current
source before calling it available. Reuse a verified existing preview; otherwise
start the documented development command and leave it running for the user.
Keep temporary test servers separate, never stop an unrelated process to reclaim
a port, and never inspect/reset/import the user's browser data to prepare a preview.
See `docs/DEVELOPMENT.md` for the established loopback URL and command.

Use the current `development-documentation-manual` skill and its supporting
GitHub tracking guide. Preserve the existing focused guide/architecture/source
register conventions; do not generate a book or implement deferred features
as a tracking/documentation side effect.

Retain stable numbered `.todo` workstreams and their eight required fields.
Each actual public-safe workstream maps to one repository issue and the same
issue in the configured CareerOS Project. The index and perpetual ledger are
excluded. Keep technical completion, human approval and publication separate.
Use the existing CareerOS Project's primary **Kanban** view (Board layout);
preserve the Project, issue and item identities when changing presentation.

When creating/updating/completing/reopening/cancelling a workstream, update its
tasks/evidence/log and run the documented preview, authorized apply and read-back.
Configure new IDs/files deliberately; preserve IDs through renames. Never copy
private context, real progress, backups or PDFs into issues. Stop conflicting
items instead of overwriting human edits; continue independent safe work.

This is agent-invoked tracking, not a background service. Do not introduce a
scheduler, Actions trigger or two-way board-to-file writer without separate
authorization. A missing credential/permission is a blocker, not an empty board.

## Credentials and Git attribution

Use only the manual's reviewed credential runner for authorized GitHub tracking.
Never read/copy/print its real `.env`, dump environments, change global `GH_TOKEN`
or pass token values in commands/files. See the exact commands and recovery
policy in `docs/DEVELOPMENT.md`.

All future commits in this repository must use repository-local configuration:

```powershell
git config --local user.name "Zanark"
git config --local user.email "32354314+Zanark@users.noreply.github.com"
git var GIT_AUTHOR_IDENT
git var GIT_COMMITTER_IDENT
```

Verify **both effective identities**, including environment overrides, before
any separately authorized commit. Do not change global identity, rewrite history
or use a `.mailmap` workaround. Preserve current execution-environment-required
co-author/session trailers; never copy a historical session's trailer.

Tracking writes and attribution configuration do **not** authorize staging,
committing, pushing, releases, deployments, workflow activation or secret
provisioning. Backlinks and recovery state may intentionally remain local.
