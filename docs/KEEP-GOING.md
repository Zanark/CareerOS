# Keep Going journal

[Open Keep Going](https://zanark.github.io/CareerOS/#/perspective)

Keep Going presents actual personal history and saved work as a chronological
journal. It does not generate achievements, grade learning or infer how you feel.

## Reading the journal

Known dates appear newest first, grouped by month. Completed checkpoints do not
jump ahead of newer practice. Within a shared day, timed recordings come first
in descending time; date-only memories retain their existing relative order.

Personal history uses the calendar date supplied with the memory. Saved work
is labelled **Recorded**, because its timestamp says when it was saved, not
necessarily when the underlying work happened. Date-only history does not shift
through UTC when displayed in another time zone.

Memories without a supplied date remain in **Date not recorded**. That is not
a claim that they happened earlier than every dated entry. They stay visible
while **Show older memories** reveals additional dated records.

Longer accounts can be expanded in place. **About this memory** or **About this
record** exposes sources, date/version context and the existing record type.
Practice, sample-containing workspaces and tutorial examples retain their labels.
Reading, expanding and loading more journal entries do not save progress.

## Adding or managing history

Use **Add a memory** for work already done. Dates remain optional. The existing
title, detail and source validation still applies; optional writing hints do not
add new required fields.

Under **History options**, **Load personal history** previews the existing
private JSON format before confirmation. Duplicate IDs are not appended again,
and conflicting replacements are rejected. The workspace-backup link remains
available there too.

Removing a personal memory requires confirmation and leaves mission progress
and saved-work evidence untouched. The full saved-work page remains separate.

## Data boundaries

The view merges records for display without rewriting the stored arrays.
Expanded text, open source disclosures and pagination are temporary view state.
The workspace schema, storage key, history-file format and backup/journal
serialization are unchanged.

This version uses text and explicitly opened artifact links. It does not fetch
image previews, upload photographs, add favorites or save layout preferences.
Those would require separate storage, privacy and backup decisions.

Ordinary workspace backups remain unencrypted. Tutorial practice stays in its
isolated temporary workspace. No motivational or clinical outcome is promised.

## Implementation

`src/perspective/journal.ts` derives the merged ordering and month groups.
`Perspective.tsx` renders the journal; `PersonalProofManager.tsx` retains the
existing explicit history commands. Styling is scoped to the page and
preserves the canonical themes and readable type scale.

[User guide](GUIDE.md) · [Architecture](ARCHITECTURE.md) · [Privacy](PRIVACY.md)
