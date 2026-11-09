# Architecture

CareerOS separates an authored roadmap from a person's changing browser workspace.
That makes a checkpoint resumable without treating activity, time spent, or a generated
plan as proof of capability.

## Boundaries

| Layer | Responsibility |
| --- | --- |
| `src/domain/catalog.ts`, `operations/*`, `roadmapPacks/*`, `forwardDeployed/*`, `agentCloud/*`, `legacyCatalog.ts` | Exact-version definitions: frozen v1/v2/v3 references, verified DSA and Neural appends, System v3 modules, seven independently adopted workbooks and latest-only Fieldcraft. Existing saved versions never silently change. |
| `src/domain/types.ts` — `AppState` | Versioned runtime shape: progress, plans, evidence, history, readiness, opportunities. |
| `src/domain/engine.ts` — `parseState` | Schema and cross-reference validation before accepting persisted or imported state. |
| `src/domain/engine.ts` — `generatePlan`, `recordEvidence` | Capacity-bounded planning and evidence-gated, prerequisite-aware completion. |
| `src/domain/engine.ts` — `previewRoadmapUpgrades`, `upgradeAllRoadmaps` | Exact-workspace confirmation preview and all-or-none adoption through the existing single-mission rules. |
| `src/domain/missionActivity.ts` — `getMissionActivity`; `src/MissionWorkStreak.tsx` | Read-only local-calendar work days from evidence/recalls across editions, shown separately from mastery. |
| `src/discovery/model.ts` — `getDiscoverySnapshot` | Finite discovery projection over validated evidence/recall: canonical identities, chronological first-qualified receipts, nonconsecutive local days and bounded provenance. No workspace fields or writes. |
| `src/discovery/DiscoveryPage.tsx`, `DiscoverySeal.tsx`, `DiscoveryNotice.tsx` | Read-only themed SVG/CSS collection, inspectable source receipts, keyboard activity ribbon and non-focus-stealing notices for newly visible discoveries. No WebGL or render loop. |
| `src/discovery/Wayfinder.tsx`, `WayfinderViewer.tsx`, `wayfinderGeometry.ts` | Source-derived collection EXP, bounded reward timeline and an event-driven low-resolution PS1-style 3D avatar with cumulative equipment; transient camera/chapter choices only. |
| `src/missionVisuals.ts` | Shared ten-mission/six-collection nongreen identity palette and the separate completed-checkpoint green. |
| `src/useWorkspace.ts` — `useWorkspace` | Browser load/save, storage errors, date rollover, stale-tab detection, explicit replacement. |
| `src/usePracticeWorkspace.ts` | Separate in-memory tutorial data using the same schema and domain operations, without storage writes. |
| `src/tutorial/*` | Guided steps, state-derived completion gates, real-control highlighting and dialog-aware coaching. |
| `src/roadmaps/*` | Read-only mission tree and top-down checkpoint flowcharts, using accessible HTML nodes and locally drawn SVG connections. |
| `src/perspective/*`, `personalProofSchema.ts` | Personal evidence page: supplied past accomplishments and saved work. Strictly validated, confirmed history imports merge without changing checkpoint progress; no research or motivational filler. |
| `src/dsa/*`, `operations/dsaStudy*`, `dsaProblemSets.ts` | Read-only 50-section DSA practice reference, preserving source group/difficulty/URL/page and intentional repeats. No per-problem achievements are inferred. |
| `src/system/*` | The supplied System Design concept tree and readable/searchable browser, separate from versioned checkpoint progress. Source reading-route and grouping edges are not prerequisite gates. |
| `operations/systemPractice*`, `src/system/SystemPractice.tsx` | The 72-module System v3 source progression, 15 read-only cases, complete practice prompts and diagnostics. Context links connect the separate concepts source without inventing case prerequisites. |
| `src/domain/roadmapPacks/*`, `src/practice/*` | Typed outlines generate 377 new-edition checkpoints; seven lazy study chunks preserve 806 source units and 5,944 exercise occurrences. Reference/practice roles stay outside required checkpoint identity. |
| `src/domain/forwardDeployed/*` | Original web-source research registry, latest-only 48-checkpoint mission, eight independent labs and 112 exercises. Outline metadata is shared; full teaching prose is a lazy chunk. No fictitious PDF provenance. |
| `src/domain/agentCloud/*` | Original public-source Neural v4 extension: exact v3 prefix plus 12 checkpoints/four optional cases/60 exercises. Mixed PDF/web library, 30 source receipts and a separate lazy teaching chunk; no new workspace schema or model integration. |
| `src/roadmaps/useMapViewport.ts` | Shared fit/zoom, pointer panning, focus/centering, resize measurement and lifecycle cleanup for both tracked and concept maps. |
| `src/graph/*` | Read-only career graph model, stable 3D positions and Three.js rendering. Mission/collection identities remain distinct; green is reserved for completed checkpoints, including archived ones. |
| `src/graph/careerOrbitModel.ts`, `careerOrbitTypes.ts` | Sixteen derived data views: ten exact saved-mission stages and six record/reference collections. Membership reuses real graph IDs, never new task identities or completion gates. |
| `src/domain/focusSession.ts`, focus operations in `engine.ts` | Optional, bounded focus-session event records, strict chronology/state/ID validation and conditional ownership checks before appending reports. |
| `src/focus/*` | One tab-local controller shared by compact/fullscreen timers, immediately persisted self-reports, retained history, and an inert calm-profile 3D backdrop. |
| `src/workspaceFile.ts` — `serializeWorkspace` | Identical compact JSON encoding for saved and exported state, with a shared 5 MiB UTF-8 limit also used by import. |
| `src/repositorySync/*` | Optional encrypted append-only journal, pure change/reconciliation model, local encrypted outbox, session-only key, explicit review and same-origin static-file loading. Existing browser/backup APIs are retained. |
| `src/App.tsx`, `src/pages.tsx`, `src/dialogs.tsx` | Hash navigation, views, accessible forms, and user-confirmed commands. |
| `src/SourcePanel.tsx` — `OperationSourcesPage` | Native Modal for reviewing all pending roadmap versions before one confirmed commit; per-mission adoption stays separate. |
| `vite.config.ts` | `/CareerOS/` asset base matching the renamed repository; Vite emits the static deployment into `dist`. |

Large DSA problem references and System practice summaries are emitted into a
separately cacheable static data chunk. They remain local bundled content, not a
runtime service or a request containing personal progress.
The expanded outlines have their own cacheable chunk; full study prose loads only for
the selected workbook. Loading failures are explicit and offer a reload without
replacing workspace data. Search/filter/navigation remain read-only.
The Three.js renderer is loaded separately for the Career graph route. The named
node list remains available while loading or when WebGL is unavailable.
Only `graph.edges` supplies node-to-node line geometry. `careerSkillLinks.ts` is a
curated, exact-version registry of cross-mission comparisons, with a specific reason
and both checkpoint citations on each shared-skill edge. It never reads private prose,
changes the domain prerequisites, awards progress or substitutes an archived definition.
Multiple reasons for the same unordered pair share one edge. View filters may hide
lines, but the collapsible connection inspector retains reasons and explicit reveal actions.
Pinned connection endpoints may resolve a later edition only through verified
identical-prefix `checkpointIdentity`; archived or unrelated definitions never
masquerade as current nodes.

`CareerGraph.orbits` is a read-only projection shared by home and the focus snapshot.
The graph page uses a graph-only viewport flex layout, leaving other routes unchanged.
View, Rings, Nodes and Work panels stay mounted but are hidden until requested;
one panel overlays the canvas at a time without rebuilding the renderer or changing its bounds.
Selection restores the inspector without page scrolling. The page exposes a small
imperative panel handle so tutorial commands can reveal the real Work search before
measuring or gating it, including direct jumps and Show this step.

Mission progress includes only current saved-version checkpoints, not archived
completions or latest-version previews. Collection membership follows the graph's
record-inclusion rules, and collection groups do not get invented progress percentages.
Orbits are not added to `nodes`, `edges` or completion statistics. Their separate
tethers mean collection membership, with actual graph endpoints; filtered-out members
stay listed with explicit reveal actions instead of silently becoming "no records."

Mission orbits carry their saved `missionMode`: only `active` missions revolve
outside the enclosing data sphere. Background/planned mission rings use smaller
stable radii near the core and no independent animation, but retain their mission hue.
`MISSION_COLORS` and `COLLECTION_COLORS` supply distinct nongreen node identities;
`missionAccentStyle` uses the same mission hue throughout the Missions UI.
`careerNodeColor` reserves green for `kind === 'checkpoint' && status === 'complete'`,
including archived checkpoints, not mission hubs, completed actions or personal history.
Ring ticks represent member status through intensity in the ring hue, not completion green.
The single `focusMissionId` does not override this mode. Only mission orbits are
rendered or offered as ring choices. Collection metadata still supports record grouping,
but never produces a ring, dot, tether or ring-selector option.
Full-shell projection is the default; Clear center masks orbit paths but not
their useful anchors. The accessible ring index and inspector work without WebGL.
The animation pause control is independent of inspection and camera manipulation.
Separate view-only Rings and Sparks switches control `CareerOrbitVisuals` and
the `HolographicCore` particle object independently. Ring picking, labels, focus
and explicit reveal follow only ring visibility; core glow is outside both switches.
The default-on Checkpoints switch filters both `checkpoint` and `curriculum` node kinds,
including completed archives, but not hubs, rings or records. Other scope, reference,
record and individual-item filters still compose with it. Explicit node/ring-member
reveal may re-enable Checkpoints without enabling Sparks.
The Labels checkbox beside the graph counts hides only the three DOM text-label
layers; renderer geometry, marker diagnostics, picking and named inspection stay intact.
Spark density is a validated 0-100% view setting, default 10. It changes only the
existing particle geometry's draw range; resizing preserves density and recomputes
the appropriate profile/compact budget without reallocating or reseeding particles.
The independently seeded spark-line batch has its own percentage and draw range, while
sharing the same visibility master, outer-shell transform, ripple uniforms and disposal
lifecycle. It does not enter graph edges, node counts or saved state.
Per-ring speed percentages are validated and held by identity. `CareerOrbitVisuals`
integrates independent rotation times rather than multiplying the current global phase;
changing the slider cannot teleport an anchor. All ring paths, stage markers, highlights,
tether endpoints and picking read the same integrated time. Global pause/reduced motion
and quiet-mission rules still apply; hidden identities retain their prior phase.
Orbit selection highlights the complete orbit, independent of the selected stage/group.
The selection glow is presentation geometry, not another ring, work node or prerequisite;
membership tethers remain scoped to the selected group, with unchanged data and camera.
Per-item visibility is an in-memory set of existing node/orbit IDs, outside workspace
data. Tri-state groups derive from the same set, including overlapping mission and
collection membership. The full source catalog stays searchable; only the rendered
node/orbit arrays and edges with two visible endpoints are filtered.
`getDefaultHiddenCareerRingIds` initializes hidden ring choices from non-active missions
and non-mission identities. Active mission rings and all real nodes remain chosen.
Explicit per-ring selection/reveal changes this local set; workspace saves do not
reapply defaults. Select all items can restore ten mission rings, not collection rings.
The focus room applies the same ring defaults once when taking its snapshot, retaining
the full node/edge data and its existing independent presentation settings.
`getCareerFocusVisibility` derives detailed mission IDs from saved active modes plus
missions with an actual `completedCheckpoint` evidence record on the current local date.
`focusCareerGraph` keeps every mission hub but includes checkpoint/record clouds only
for those detailed missions. It filters every incident edge of a quiet hub, not just
checkpoint links. `disconnectedNodeIds` also excludes those hubs from renderer orbit
tether targets. Unscoped history remains on its existing page, not a focus graph cloud.
The full source graph still supplies framing and read-only detail inspection.
An explicit Show everything mode bypasses focus eligibility, mission scope, layer flags
and hidden item choices. It uses the full source graph with no disconnected-hub set,
but still supplies only mission orbits to the renderer. Disabled conflicting controls
show effective full visibility while their saved-in-component preferences remain intact
for toggling off. No workspace fields, mission modes or completion records are written.
The optional `buildCareerGraph(..., { includeAllRecords: true })` includes every saved
daily action with truthful future/past-unfinished context; default graph inclusion is unchanged.
Explicit visibility choices overlay current defaults, so new same-day completion can
reveal a previously default-hidden mission without overriding deliberately hidden items.
Completing outside focus does not change saved mode, primary focus or daily planning.

`recordEvidence` accepts available background missions as well as active ones. It still
requires the current checkpoint, an unblocked mission, version validation and all
completion criteria. Evidence tied to a daily-plan action remains active-only. Explicit
mission selection never silently falls back to another eligible mission.
`framingNodes` supplies bounds before the individual-item and Checkpoints filters so those choices do not shift
remaining orbit geometry or zoom. Heartbeat/core glow still require the actually
visible core, not a framing-only node. One non-animated initial render may occur
below the fold to finish initialization; subsequent offscreen frames stay suspended.
`careerNodeSpacing.ts` deterministically redistributes nodes before scope/item filtering.
A fixed home-view basis retains genuine 3D depth and a clear central area. The 100
baseline preserves the compact packing. Higher values unfold it into separate mission
fans ordered by existing stage/checkpoint membership, shortening tangled prerequisite
paths rather than uniformly magnifying the scene. Saved records use separate inner lanes
so new notes do not consume checkpoint slots or enlarge their framing. Polar interpolation
travels around the core. Bounded cell allocation and stable ordering avoid an all-pairs
force simulation; dense imports adapt to finite available space. Every value derives
from the source graph, never a previously expanded result. Rotating does not relayout
nodes; other angles can overlap, and all genuine edges remain visible.
IDs, statuses, edges and activity remain unchanged. The renderer rebuilds attached
geometry without replacing the canvas, automatically reframing or resetting orbit phase.
Outer ring radii and Frame all clearance are derived together. The focus snapshot uses
default spread independently; custom slider state remains main-page-only.
Cursor repulsion bends real edge interiors, not their endpoint identities or stored positions.
The optional periodic core heartbeat is separate from saved-status completion pulses.
Its source is the real core node and its ten-second cadence uses active elapsed time.
A shared radial deformation moves rendered meshes outward and back without changing
model coordinates; node/edge/orbit endpoints, labels and picking must use equivalent
positions. Quiet mission rings do not deform; their tether ring ends remain fixed
while work-node ends follow the same field as their actual nodes.
No standalone luminous wave ring is drawn. It never creates graph records
or focus events. Focus framing targets the core; the main graph retains its camera.

There is no backend, authentication layer, remote database, agent execution service,
or model call. All ten latest missions have documented tracking units, totaling
557 checkpoints. Historical forecast-only definitions remain frozen. A cross-mission link expresses a related
capability, not a lock.
Prerequisites within a mission control availability. Unspecified relationships follow the
documented order; explicit source branches can expose more than one available checkpoint,
but the progress record still holds exactly one current checkpoint.

The roadmap tree branches by the existing focus/background/planned settings, not invented
curriculum dependencies. Selecting a node only changes which flowchart is displayed.
The checkpoint decision/return loop illustrates the evidence-confirmation rule; it never
performs an unlock or assessment itself. [Mermaid reference](checkpoint-flow.mmd) documents
that small workflow; the website has no Mermaid runtime or external rendering dependency.

## Runtime flow

1. `loadWorkspace` reads `careerhq.workspace.v1` from localStorage. Missing data creates
   an empty v2 workspace; v1 data is strictly validated and safely normalized while its original
   roadmap positions remain active. Unreadable data produces recovery UI.
2. `parseState` checks the schema and roadmap version, identifiers, record limits,
   dates, URLs, prerequisites, and active/archived evidence and plan references.
3. `generatePlan` derives today's bounded actions from active, unblocked missions.
   Existing plans are retained; a new local calendar day gets its own plan, not a backlog.
4. User commands pass through `commit`/`replace`. A stale storage snapshot blocks
   saving and asks for a reload rather than silently overwriting a newer tab.
5. `recordEvidence` appends an artifact and a history event. Ordinary action progress
   leaves mastery unchanged. Explicit completion plus all criteria advances one checkpoint.

The roadmap is **configuration in source control**; progress is **runtime state in a browser**.
Changing the configuration is not a progress update. Future schema or roadmap revisions
need an explicit migration story; unsupported backups must not be silently coerced.

The DSA v3 definition declares its exact v2 prefix. Only verified identical
checkpoints can share evidence identity through that append lineage. Explicit
v2→v3 adoption preserves original records and carries genuine progress, while
new topics start unconfirmed. Completion totals deduplicate shared identities
across the active tracker and archives; other upgrades do not guess a mapping.
Neural v4 similarly declares and verifies its entire 28-checkpoint v3 prefix;
the twelve new checkpoint identities stay v4-only. `v3Missions` and the original
source outlines/loaders remain separately resolvable. Workspace schema/catalog
stays 2; accepting per-record v4 never makes unsupported System v4 valid.
System and the seven expanded workbook editions therefore archive v1/v2 on explicit
adoption and start detailed modules unconfirmed. Case references are deliberately outside checkpoint identity,
completion counts and evidence validation.

### Fieldcraft identity and additive compatibility

FDE exists only at v3; no v1/v2 definition is fabricated. `createFdeProgress`
supplies its canonical unstarted background position for new workspaces and the
strict legacy migration. `parseState` adds it to schema-two data only when the
mission property is absent. An explicit null, undefined, malformed progress,
unknown version or unsupported checkpoint fails normal validation. All other
mission values, records, focus settings and dates are preserved; normal
load-time generation of a missing current-day plan remains separate.

The journal normalizes its old authenticated baseline before projecting change
cells. Thus an old nine-mission chain replays without rewriting ciphertext and
can accept later FDE changes. `workspaceChanges.assemble` requires every mission
cell before parsing: an incremental deletion cannot masquerade as an old backup
and silently reset FDE. Unknown archive/version combinations still fail relational
validation. Existing whole-workspace import remains explicitly confirmed replacement.

`SourceReference.url` and pack `sourceKind/webSources/reviewedAt/sourceIds`
distinguish research citations from physical PDF references. The original seven
workbooks retain their page-based data and source checks. FDE lessons have no
invented page numbers; full prose remains lazy-loaded.

FDE is explicitly added to native recall after prior evidence, requiring all
three independent self-checks. The original DSA/System rules and retention
computation remain intact. Discovery Atlas, mission activity, ordinary backups
and the encrypted journal consume the actual records through their existing
shared paths; no separate score or new persisted achievement fields exist.
Thirteen new exact-checkpoint transfer comparisons touch the original nine
missions. `RelatedPractice` exposes the same curated explanations as the graph;
neither view awards equivalence or deduplicates all semantic overlap.

The new mission also extends the finite orbit-plane inventory and label coverage.
Original ring seeds/speeds remain fixed. A smaller inter-fan gap recovers room
for the denser mixed-version catalog; unchanged fitted-spacing and dense-import
requirements guard readability rather than increasing the containing scene alone.
See [research and source limits](FDE-RESEARCH.md).

### Optional encrypted repository journal

`RepositorySyncPage` is a separate hash route linked from Settings. The saved-workspace
`useRepositorySync` hook retains a key while navigating pages; practice gets an isolated,
disabled instance. No workspace schema field, credential API, backend or external request is
added. The only journal URL is the fixed same-origin Vite-base-relative
`careeros-progress.jsonl`, served from `public`. Requests omit credentials, refuse redirects,
bypass the browser cache, time out and enforce a bounded response size.

`journalFormat.ts` defines strict version-one JSONL envelopes. The first record is a public
KDF/cipher header; the first encrypted batch is a complete validated baseline. Later encrypted
batches contain old/new values at allowlisted workspace cells, not appended ordinary backups.
Header + batch ID + parent are GCM additional authenticated data. Random 16-byte salt,
600,000-iteration PBKDF2-SHA-256 and random 12-byte per-batch IVs produce non-extractable
AES-256-GCM keys. Parameters, payload sizes, IDs, count limits and replay parents are validated.
Identical repeated header/batch records are deduplicated; changed duplicate IDs and branching
parents are errors. Replay uses bounded current-state memory, not one full snapshot per batch.

`workspaceChanges.ts` uses locale-independent canonical value comparison. Mission progress
and dated plans are atomic cells; independent records are keyed by existing IDs. Archives
retain exact mission/version identities. Events are ordered chronologically before strict
`parseState` validation. Optional collections retain presence, and all normal domain/5 MiB
constraints still apply. IDs and checkpoint evidence are never invented or renamed to hide
collisions. Structurally independent but semantically incompatible merges fail explicitly.

`journalCache.ts` compares the common prefix with the last acknowledged count. The encrypted
local outbox includes unconfirmed exports, which are re-exported with stable batch IDs.
Only a deployment fetch acknowledges publication, never export or local-file review. Safe
incoming changes are three-way merged against the common base; unpublished local chains may
be rebased, invalidating previously copied blocks. Incompatible values/record-ID collisions
require an explicit whole-workspace decision, with both private backup downloads available.
A new device has no shared local baseline and therefore always reviews its first connection.

The hook checks sidecar freshness, main-workspace freshness and the exact reviewed snapshot.
Workspace application uses the existing guarded `commit`; no artificial learning/history
event is awarded for sync. The encrypted cache is written only after that succeeds. These
are separate localStorage writes, not an atomic multi-key transaction: a later cache failure
is reported as a saved workspace with an unsaved journal checkpoint, with no acknowledged
publication and an explicit retry path. A stale/failed review never overwrites newer local work.
Lock/practice/unmount invalidate in-flight operations so late decryption cannot restore a key
or apply data after cancellation.

Normal backup/reset/import, theme state, timer storage, roadmap adoption and tutorial lessons
retain their original behavior. A later explicit journal export can represent changes made
by ordinary backup import/reset, including removals; the UI reports that fact. The public
file ships empty. A unit gate validates its encrypted envelope/chain without a CI secret;
full-file browser review validates authentication and domain semantics locally.

### Reviewed bulk adoption

[`OperationSourcesPage`](../src/SourcePanel.tsx#L78) derives a read-only
[`previewRoadmapUpgrades`](../src/domain/engine.ts#L789) result: pending mission IDs,
names, old/new versions, verified-append flags and a signature of the entire validated
workspace. The signature remains in memory; it is neither displayed nor persisted.
Opening **Adopt all documented roadmaps** sets this preview and opens the existing
native `Modal`; Cancel/close discards it without a commit.

**Confirm all roadmaps** calls `commit(current => upgradeAllRoadmaps(current, preview))`
exactly once. [`upgradeAllRoadmaps`](../src/domain/engine.ts#L810) revalidates both the
exact workspace signature and upgrade list, then runs `upgradeRoadmap` against successive
prospective copies. An unrelated workspace change also invalidates the confirmation;
the UI closes the stale preview and requires a fresh review.

No intermediate result is saved. Archive collisions, schema/record limits or any
upgrade failure reject the whole transform. `useWorkspace.replace` performs the normal
stale-storage check, full validation and 5 MiB serialization check before its single
`localStorage.setItem`; state is published only after that write succeeds. Thus storage
failure also leaves no partially adopted set. This is application-level all-or-none
behavior, not a new localStorage multi-writer transaction.

Only verified unchanged DSA v2→v3 and Neural v3→v4 prefixes carry real progress; all other older
definitions archive/reset without guessed equivalence. Already-current missions are
untouched. Existing evidence, recalls, plans, history, personal proof and focus sessions
retain their original records. Primary focus and active/background modes remain;
previously planned missions with newly available curriculum become background rather
than active. New checkpoints stay unconfirmed. Backup is recommended before either
individual or bulk adoption; no automatic export or plan refresh is implied.

### Recorded-work projection and date rollover

[`getMissionActivity`](../src/domain/missionActivity.ts#L19) reads only `evidence` and
`recalls`, selecting by mission ID across all roadmap versions. Each validated `createdAt`
timestamp is converted to a browser-local calendar day and deduplicated in a set.
Local date components are placed on a UTC day-number axis so daylight-saving transitions
do not turn a consecutive day into a 23/25-hour gap. Future calendar days are excluded;
slightly later timestamps on the same local day still belong to that day.

Any evidence/progress entry and every recall outcome counts, without requiring checkpoint
completion. The consecutive streak ends today if work exists today; otherwise it starts
checking yesterday for a one-day grace period. If both days are absent it is zero.
Browsing, settings, roadmap adoption, timer/distraction events, generated plans and
personal-history records never enter this calculation. `MissionWorkStreak` renders the
derived count and an explicit recorded-today/no-record-today label; there is no stored
streak field, schema migration or mastery inference.

`buildCareerOrbits` attaches the same summary, including `asOfDate`, to each mission
orbit. [`CareerOrbitVisuals.activityPresentation`](../src/graph/CareerOrbitVisuals.ts#L170)
uses it for a flat, same-color glowing dot: the thicker circumference border is bright
only when `workedToday` belongs to the current supplied date, dim otherwise. Selecting
a ring highlights the ring path separately; it cannot manufacture a bright work-today border.

The existing workspace local-date state refreshes every 30 seconds, independently of
animation. The main graph derives fresh activity from `[state, date]`.
Both main and focus scenes also receive `activityDate`, whose `setActivityDate` updates
border presentation and requests a frame even while paused. A stale snapshot's work-today
claim is dimmed, not relabeled as fresh activity. The focus room keeps its original graph
object until reopened; date rollover changes the presentation gate, not the snapshot,
focus log or timer state.
The focus room additionally captures its active IDs, today's completed IDs and date.
At midnight, its view drops the completion-only extra IDs and recomputes the visible
projection from that same captured graph. It never imports newer work into an open snapshot.

`defineOperation` defaults to v2 to preserve every original definition and accepts an
explicit v3 for new books. Per-checkpoint citations override stage-level citations.
`documentedPackMission` includes only source units marked `checkpoint`; practice and
reference units remain visible in the library and complete map without invented gates.
The complete latest map is the default across missions; saved-version inspection is separate.

## History and authority

Normal commands append history events, and existing evidence/events have no edit UI.
This is an **immutable audit record in the application workflow**, not a tamper-proof,
signed ledger. Someone with browser access can edit localStorage, and an explicitly
confirmed backup import or reset replaces the whole workspace.

The browser's current validated workspace is the local authority. An exported JSON file
is a snapshot, not a synchronization channel. Storage-event checks and a pre-write
snapshot comparison catch stale tabs; localStorage does not provide an atomic
multi-writer transaction. Use one editing tab at a time.

The focus countdown belongs to the app shell, so navigating between routes or closing
the focus room does not cancel it. Its length is fixed once begun. A page reload does
not resume the old countdown, but its saved session/distraction records remain.
An unended record is not assumed completed. An evidence draft
left open across midnight keeps its text and becomes standalone checkpoint evidence;
it does not silently complete an action in yesterday's plan.

Completion criteria and interview readiness are self-attested. Neither proves mastery
externally. The focus timer belongs to the current tab and does not award progress.

### Focus records and failure boundaries

`focusSessions` is optional and absent in older workspace serialization. Each record
has an ID, start timestamp, planned seconds and ordered events. Pause, resume,
distraction, complete and reset events carry a globally unique ID, timestamp and
elapsed running-clock milliseconds. Source records can support later charts without
inventing an attention score or treating elapsed time as learning evidence.

Every report is committed before acknowledgment. The controller's monotonic clock
excludes pauses and writes only on events, not every tick. Timer reset retains
history. Failed saves do not increment counts; failed natural endings remain visibly
pending with an explicit retry. A replaced record stops its previous timer. The
record signature is checked inside the commit transaction, not only in a later effect.

The room snapshots the actual career graph when opened, so logging does not rebuild
the background on every press. Its focus profile uses the current full-shell geometry
and fine orange strokes, with subdued glow, fewer particles and slower but visible motion.
Labels and picking stay disabled. Ambient motion is independent of the countdown;
reduced motion starts it still and requires an explicit opt-in. Closing releases the scene.
The separately supplied local-date gate still dims yesterday's activity borders while
that snapshot and its camera remain fixed.

## Practice isolation

The tutorial creates a fresh `AppState` only in `usePracticeWorkspace` memory. The real
storage hook remains mounted for conflict detection, but pauses automatic plan writes.
Actual forms and domain operations operate on the selected model; practice commits,
imports and resets never call the real model's writer. Exiting switches models rather
than writing an old snapshot back, so it cannot overwrite a newer tab's data.

The practice workspace has its own focus timer. The real timer remains mounted.
Real automatic focus-ending writes are deferred while practice is active; practice
events use only the temporary model. Exiting can then persist the real timer's own
ending without copying any practice reports.
`useTheme(preview)` changes appearance without writing the preference; exit restores the
current stored preference. Workspace subtrees remount across the boundary so practice
dialogs and drafts cannot accidentally carry into a real save.

Coaching portals into an open native dialog so controls remain usable in the top layer.
Highlights follow actual controls, with state-derived Next gates and optional skips.
No real-workspace achievement is recorded to make a step pass. Exported practice files
are explicitly labeled examples. Practice state itself is not saved across reloads.

The 182-step, 31-chapter walkthrough keeps Fabric deliberately on v1 initially. Its
bulk-update lesson opens the real review Modal and **cancels**, so the later individual
adoption and archive exercise remains meaningful. Checkpoints lessons gate on the actual
View checkbox in both directions; the work-streak lesson expands its actual explanation
after saving practice evidence without completion. Tutorial target lookup can point first
to the closed View panel's opener, then to Checkpoints, or to the native bulk dialog's
Cancel button. These lessons do not need new app commands or automatic adoption.

The original 150 steps remain in order. Twenty Discovery Atlas lessons
exercise the actual family filter, mystery/reveal controls, normal evidence form,
source receipt and local-day detail. `discovery/practice.ts` creates a clearly
fictional historical example only on an explicit practice-only button. The current
practice timer is discarded before that temporary replacement; the real model and
timer remain separate. Viewing a clue never changes evidence or completion.
Seven appended Fieldcraft lessons use the real source disclosure, optional-unit
selector, background evidence form and recall filter. They use the existing
in-memory workspace; no real records, theme preference or journal are copied
into practice or written by those lessons.
Five further agent-cloud lessons keep the previous 177 in order, use the actual
mixed-source library/case controls, and explain explicit append and unchanged
Atlas evidence rules without adding tutorial commands.

`getDiscoverySnapshot` sorts eligible evidence/recall chronologically and updates
small indexed metrics. It reuses `checkpointIdentity`, including only verified DSA
and Neural append lineage, and captures the actual source set on the first qualifying event.
One local day counts once; later calendar days are excluded as in mission activity.
Spacing uses elapsed hours between the relevant records, not the current time merely
passing. Historical recognition never overrides `recallSummary` or readiness.
The projection is memoized on the workspace and local day; the chart has 24 stars
and 28 activity tiles regardless of record count. Provenance is bounded, with explicit
continuation for larger first-qualified receipts. No new persistence is required:
the existing backup and encrypted journal already carry its source records.

`getWayfinderProgress` derives seven fictional character levels and cosmetic
collection EXP (100 per discovery) without a new ledger or workspace field.
`getWayfinderCrossings` retains every crossed chapter for catch-up presentations.
`Wayfinder.tsx` owns a bounded, skippable threshold/reward timeline and transient
unlocked-chapter inspection. The canvas remains mounted across phases and chapter
changes, preserving the user's camera and avoiding repeated context creation.

`wayfinderGeometry.ts` authors the original low-poly traveler, six cumulative
equipment bundles and seven real chapter dioramas. Each equipment bundle is one
vertex-coloured mesh; the entire terrain/props of a chapter are batched into
one additional mesh sharing the same unlit material. Face shading is baked
into vertex colours; there are no textures, lights, shadow maps, model downloads,
postprocessing or new dependencies.
`WayfinderViewer.tsx` reuses the installed Three.js/OrbitControls and starts with
an orthographic isometric camera. Orbit moves the viewpoint around character
and scenery together. Move mode, right drag and Shift+arrows pan the view;
reset restores angle, target, zoom and default rotation mode. Internal width
is capped at 384 pixels and total buffer area at 82,944 pixels, with DPR 1.
The viewer is lazy-loaded only
when the avatar is mounted, not for notifications or non-3D routes. Render invalidation coalesces
input, resize and equipment updates; there is no idle requestAnimationFrame loop.
Only a finite 650ms new-equipment flourish requests consecutive frames. Offscreen,
hidden-tab, reduced-motion and disposal boundaries settle or stop that work.
Geometry/materials, observers, input handlers, controls and the owned WebGL context
are disposed on unmount. An explicit initialization/context-loss message never
masquerades a still SVG as working 3D. Manual camera input remains available under
reduced motion. Small SVG/CSS effects accompany only the finite reward sequence;
the scenery itself is real depth-bearing geometry in the same context.
The discovery chapter observes its view-state attributes explicitly, so a
post-frame camera reset can satisfy its action gate independently of click
timing or unrelated DOM changes.

Tutorial cues share that portal: an animated opacity halo traces the current target,
and a transform-animated pointing hand indicates buttons. They track scroll/resize
without a continuous JavaScript animation loop, never intercept pointer events, and
point to Next after an action completes. Reduced motion retains static cues.

## Delivery and verification

Hash routes keep deep links compatible with GitHub Pages project hosting. Deploy only
Vite's `dist` output; the source repository and private browser exports are not runtime
data sources. There is no service worker or guaranteed offline installation.

`src/domain/engine.test.ts` tests domain invariants. `tests/workspace.spec.ts` exercises
the production build through Vite preview, including its content-security policy,
real UI, and persistence in a browser. It rejects unexpected external requests and
console/page errors, and captures desktop/mobile screenshots. Playwright uses Edge
locally and Chromium in CI; screenshot captures are inspection artifacts, not
pixel-baseline visual regression assertions.

See [Privacy](PRIVACY.md) for storage risks and [Agent contract](AGENT_CONTRACT.md)
for boundaries on future automation.
