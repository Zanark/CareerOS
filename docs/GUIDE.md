# CareerOS guide

Track current checkpoints, daily actions, and saved work.
Built with React, TypeScript, and Vite; data stays in your browser.

The site and repository are now named **CareerOS**, at `/CareerOS/`. The previous
`/CareerHQ/` address is no longer the deployment path. Storage keys and backup format
remain unchanged: both paths use the same `https://zanark.github.io` origin, so the
same browser profile retains its existing progress. Do not clear site data to fix a
loading problem. Different browsers/devices still need a private backup transfer.

[Website](https://zanark.github.io/CareerOS/) ·
[Overview](../README.md) · [Architecture](ARCHITECTURE.md) · [Themes](THEMES.md) · [Privacy](PRIVACY.md) ·
[Agent contract](AGENT_CONTRACT.md) · [Operation sources](OPERATION-SOURCES.md) ·
[Contributor workflow](DEVELOPMENT.md) · [FDE research](FDE-RESEARCH.md)

## What this prototype does

- Keeps one current checkpoint per mission, with source-defined prerequisites.
- Uses a branching mission tree and top-down checkpoint flowcharts, with connected nodes,
  an evidence/criteria decision, and a practice loop. Includes responsive and printable views.
- Separates **practice recorded** from **checkpoint completed**. Completion requires
  an artifact and explicit confirmation of every criterion; it is not AI-graded.
- Builds up to three daily actions. Gentle capacity offers at most one small action,
  within 15 minutes. Background missions keep their place.
- Provides evidence search/filtering, event history, a tab-local focus timer,
  an opportunity pipeline, and self-assessed interview readiness.
- Saves browser-local state and supports private JSON backup/export and replacement import.
- Tracks freelance research and spaced recall separately from checkpoint completion.
- Offers an optional Discovery Atlas: a finite hidden collection derived from saved
  evidence and recall, with source receipts rather than a career or mastery score.
- Preserves previous roadmap versions and requires confirmation before adopting new definitions.
- Shows each mission's recorded-work streak from saved evidence/progress or any recall result,
  including work that does not complete a checkpoint.
- Provides an interactive **Tutorial** using a separate, temporary practice workspace.
  Try real controls without changing your progress, theme preference, or existing focus session.
- Includes an optional **Keep going** page before Overview: your supplied past
  accomplishments and actual saved work, with sources rather than motivational quotes.
- Uses **DeepSeaFoam** dark and **Harbor Daylight** light palettes. The header switch
  animates sunrise/sunset, remembers your choice, and respects reduced motion.

The supplied operation documents define the original nine missions. Research-backed
**Fieldcraft** adds Forward Deployed Engineering as an unstarted background mission
without changing your primary focus or existing progress. Tracking granularity is explicit:

| Mission | Documented tracking |
| --- | --- |
| Pattern Forge | 48 checkpoints: the unchanged 5-checkpoint HashMap start plus 43 DSA topic reviews, across 14 stages |
| System Forge | 72 modules across 9 phases, plus 15 independently selectable case-study references and a separate concepts map |
| Escape Velocity | 34 checkpoints, plus 45 independent labs, cases, diagnostics and capstones |
| Fabric Core | 32 canonical checkpoints across 5 stages, with detailed study material and 20 additional lab playbooks |
| Blueprint | 91 numbered modules plus Day 0; supplemental AI/SF practice and eight capstones stay outside the required chain |
| Credential Forge | 53 core study modules; the Data learning branch is optional and paid exams are separate decisions |
| Neural Edge | 40 checkpoints: the unchanged 28 across 7 source phases, then 12 agent-cloud checkpoints; four new cases remain optional |
| Algorithm Forge | 34 checkpoints across the complete 6-stage contest curriculum; older forecast versions remain available |
| Side Income | 104 modules across 13 stages, with cases, templates and the separate private freelance ledger |
| Forward Deployed Engineering / Fieldcraft | 48 checkpoints across 12 phases, eight optional specialization labs and 112 authored exercises informed by 24 reviewed primary sources |

The latest editions contain **557 tracked checkpoints**, including Fieldcraft's 48.
The original seven expanded mission workbooks
also provide **806 browsable source units and 5,944 practice, transfer and diagnostic prompts**.
Repeated source exercise contexts are retained; this is not a claim of 5,944 distinct autograded problems.
Study material and tracking definitions are not imported personal achievements.
The original PDFs and private progress/biographical sections are not published. See the source notes
for conflicts, granularity choices and unverified certification availability.
There is no actual AI agent, cloud workspace, authentication, or multi-device sync.
The AI-engineering mission is a learning roadmap, not a connected AI service.

### AI Architect: agent-native cloud extension

Open **Neural Edge** and its practice library to browse Phases 7-9: cloud for
agents, governed engineering/operations with agents, and independently measured
performance/economics. Twelve checkpoints and four optional cases add 60
exercises informed by 30 reviewed primary sources. The original workbook is
unchanged; Neural's complete library now has 88 units and 869 exercises.

Existing v3 trackers stay on their saved edition. In **PDFs & sources**, select
Neural Edge and confirm **Append expanded roadmap** to adopt v4. Its verified
identical 28-checkpoint prefix preserves your actual progress, position, blocker
and records once, with an exact old archive. A completed v3 track resumes at
unconfirmed 7.1. Earlier incompatible versions archive without guessed credit.
Browsing or adoption earns no Atlas discovery or EXP.

New lessons disclose actual web sources; original lessons keep physical PDF
pages. Case laboratories and connected learning are practice, not extra unlock
gates. Use invented local fixtures; no production account or model call is
required. See [the curriculum, evidence and limitations](AGENT-CLOUD-RESEARCH.md).

### Fieldcraft: customer problem to operable system

Open **Missions → Forward Deployed Engineering** or
[`#/mission/fde`](https://zanark.github.io/CareerOS/#/mission/fde).
It stays background unless you explicitly bring it into focus. You can save
standalone evidence or complete a criteria-checked current checkpoint without
activating it; Daily plan still uses only in-focus missions.

The route covers role/skill diagnostics, customer discovery, full-stack delivery,
SQL/data quality, enterprise integration, responsible AI evaluation, bounded
tools/approvals, release/observability, adoption, handoff, reusable product
patterns and truthful portfolio/interview practice. Four final checkpoints
integrate those artifacts into one synthetic customer engagement.

**Open practice library** provides 56 units, mental models, worked scenarios,
applied and changed-constraint exercises, recovery guidance and each lesson's
reviewed sources. The web-source scope disclosures replace PDF page labels;
the sequence and criteria are authored learning design, not employer mandates.
Foundry, inference infrastructure and six other terrain labs are optional.
All units have a local/free synthetic route; real customer access, paid APIs
and production changes require separate permission.

**Connected learning** and Career graph **Connections** explain thirteen
specific comparisons spanning all nine earlier missions. Transfer your
understanding, but demonstrate the new FDE criteria separately: links do not
grant equivalent completion or create extra prerequisite gates.

FDE evidence appears in Saved work, history, activity and the same Discovery
Atlas source receipts/Wayfinder levels. **Recall practice** includes FDE after
prior evidence; independent recall needs explanation, diagram and a changed
exercise. Normal backups and the optional encrypted journal retain those
records. The appended **Fieldcraft** tutorial chapter demonstrates the real
controls on isolated examples. Read [the research and its limits](FDE-RESEARCH.md)
before interpreting completion as career readiness.

## Start using it

### Find an answer without running the tutorial

**Help & glossary** is a searchable reference, separate from the guided tutorial.
Search terms such as rings, streaks, references or backups; select a topic heading to
expand its explanation, then follow its link to the relevant page. Quick shortcuts
open the graph, Missions, roadmap updates or Settings. Searching, expanding and
navigating do not modify progress. **Start tutorial** opens isolated practice when
you want a hands-on walkthrough instead.

### Your 3D career view

The website now opens **[Career graph](https://zanark.github.io/CareerOS/#/home)**.
Drag to rotate the network in genuine 3D, scroll or pinch to zoom, and select a
node for its record. **Frame all** restores the whole view; **Focus node** centers
the selected item. The canvas now fills the available app viewport instead of sitting
below a stack of controls. Frame, zoom, animation and fullscreen controls stay in a
small camera dock; Focus node / Focus ring appear when an item is selected.

The compact toolbar opens one panel at a time: **View** contains filters, both spark amounts,
motion options, keyboard rotation, the legend and clipboard brief; **Rings** opens
the ring views; **Nodes** opens visibility choices; **Work** opens the named search/list.
Panels overlay the canvas without resizing or moving it, and keep their settings
when closed. Selecting a ring or work item closes its panel and shows the inspector.
Escape dismisses a panel; native fullscreen retains the browser's escape behavior.
**Overview** remains the compact tracker at `#/hq`, also linked from View.

The **Labels** checkbox beside the checkpoint/node counts hides the floating text
tags on mission hubs, ring dots and hovered/selected nodes. It does not hide nodes,
change picking or close the inspector. The named **Work** list remains available.

**View → Show everything** temporarily includes every available graph node and connection:
all ten mission rings, unfinished and completed checkpoints, untracked curriculum,
archived completions, evidence, applications at every stage, freelance leads and past work.
It also includes all saved daily actions, even unfinished older actions and future saved
plans. It bypasses focus, mission scope, layer filters and individual hiding without
changing any saved mode, status or progress. Rings still represent missions only.

While enabled, conflicting filters and item checkboxes are disabled; Labels, Rings
and Sparks are shown and Clear center is off. Your previous choices return when you
uncheck it. Camera, spacing, pause/reduced-motion preferences and chosen spark percentages
remain independent. “Everything” means data visibility, **not** 100% completion or
automatically turning either spark amount to 100%. It resets on leaving the graph page;
the focus room keeps its own focused snapshot.

**View → Node spacing** adjusts relative spread from **1.0x to 3.0x**.
It unfolds tangled clouds into separate mission/stage groups rather than scaling the
entire graph. The default preserves the compact view with central clearance and
separation between work and outer mission rings. Higher spread organizes related nodes
into clearer fan-shaped neighborhoods;
connections and membership tethers remain attached. **Frame all** returns to the
clearest starting angle. Other rotated views can still overlap, and real links remain.
**1.0x** resets the spread. Arrow keys adjust by 0.1x; Home/End select the limits.
The setting stays while this graph page is open, including fullscreen and filter changes,
but is not saved in your workspace. The focus-room snapshot independently uses the
new default layout, not your custom spread value.

Green is reserved for **completed checkpoints**, including archived completions;
orange marks unfinished checkpoints. Mission hubs and the six record/reference
collections keep their own identity colors, even when a record describes a completed action
or past accomplishment. Notes and untracked curriculum are not extra completed tasks.
Archived completions retain their version context, and the preserved DSA prefix
is not double-counted. Daily actions and past accomplishments do not automatically
complete their associated checkpoints. Mission and layer filters only affect the view.
Fine, glowing orange links represent actual graph connections. **Rings represent missions
only.** Active/in-focus missions start visible in both the main graph and focus backdrop;
background/planned mission rings start disabled. This uses each mission's saved
**Bring into focus / Move to background** mode, not the single primary mission.
The default graph shows checkpoint clouds and connections only for in-focus missions.
Other missions remain **isolated mission nodes**: no checkpoints, record cloud, core
link, shared-skill link or ring membership tether. An optional inactive ring does not
override that rule.

If you **complete a checkpoint** in a background mission, its **full checkpoint graph
is revealed for the rest of that local calendar day**, including its connections and
default ring. Its saved focus mode is not changed. After midnight it collapses to its
mission node unless it is now in focus. Existing item/layer choices remain respected.
Saving unfinished practice or a recall still counts for the work streak, but does
**not** trigger this completion-only graph reveal. You can record background work from
the normal mission page without first bringing it into focus; blocked or reference-only
missions remain unavailable.

All ten missions remain in **Rings**. To show an inactive ring without activating
the mission, inspect it and choose **Reveal orbit and members**, or check its ring in
**Nodes → Individual nodes and rings → Ring views**. **Select all items** can show all
ten mission rings, never collection rings. These choices last for the current graph page.
Daily work, evidence, applications, freelance leads, past accomplishments and untracked
curriculum no longer have rings. Their records remain on their existing pages, in named
node inspection and relevant checkpoint connections; nothing is deleted or reclassified.
Mission rings summarize the stages, recorded completion and current checkpoint of
your **saved roadmap edition**. Archived completions and unadopted curriculum do
not inflate that progress.

Only **active missions** have revolving outer rings. **Background** and
**planned** missions, when explicitly shown, retain smaller stationary rings,
in their own mission color. The ten mission hues match the **Missions** interface.
This follows **Bring into focus / Move to background**, not just the single
**Make primary mission** choice. Their saved checkpoints, completion and evidence
remain intact and inspectable.

Each ring has a **flat glowing dot**, not a shaded sphere, in its own ring color.
The thicker border around a **mission dot** is bright when evidence/progress or any
recall result is saved for that mission today, and dim otherwise. Completion is not
required. This is recorded activity, not an inference about your attention or offline work.
The logo echoes the flat-dot
design but is a static mark, not a live activity indicator.
Select a dot or a card in **Rings / Explore ring views**
to highlight the **entire ring** with a thicker, bright glow. Choosing a stage
keeps the whole ring highlighted while its detailed tethers show only
that stage's members. Inspect a member or open its mission.
Selection does not move the camera, change focus mode, or start a stationary ring.
Each mission's inspector includes **Rotation speed**, from **0% to 300%** of that
ring's normal speed. **100%** is the default; **0%** stops that ring alone.
Changing speed keeps its current position rather than jumping around its orbit, and
other rings keep their own settings. Background/planned rings stay stationary, so
their slider is disabled until that mission is active. Global pause and reduced
motion still take precedence. These are current-page visual settings, not saved work.
An available, unblocked mission also offers **Record evidence**, using the same existing
form and explicit completion criteria without leaving the graph.
**Focus ring** brings its anchor into view. Ring tethers stretch as active rings
revolve while your inner work nodes keep their positions. They mean membership,
not an additional prerequisite or task. Detailed member connections belong to the
selected mission/stage rather than an always-on web across every collection.
The inspector distinguishes global members from those visible through your filters;
**Reveal orbit and members** explicitly adjusts the view without changing progress.
For an outside-focus mission without a completion today, checkpoint inspection is
read-only detail: reveal does not force its hidden checkpoint cloud or connections on.

Full-shell paths remain visible by default. **Clear center** masks projected ring
paths without hiding data anchors or membership links. Sparks and glow are still
atmosphere, not extra nodes. In **View**, **Rings** and **Sparks** are separate, default-on switches:
hide ring paths, anchors and membership tethers without hiding the decorative sparks,
or hide only the sparks while keeping the rings and their dots. Real work nodes, their connections,
core glow and your zoom stay unchanged. **Clear center** and **Focus ring** depend
only on Rings. Re-enabling Rings restores your selected Clear center mode, and
**Reveal orbit and members** never changes the Sparks setting. Like the other
graph filters, these are view-only choices, not saved-progress changes.

**View → Checkpoints** is a separate, default-on layer switch. Turning it off hides
current tracked checkpoints, archived checkpoints and untracked curriculum checkpoint
nodes, together with their displayed connections. Mission hubs, rings and work records
remain available; **References** being on does not override this switch. The remaining
layout and camera framing stay stable. Re-enable Checkpoints to restore the layer;
other mission, reference and individual-item filters still apply. **Reveal and inspect**
or **Reveal orbit and members** may explicitly turn Checkpoints on to show requested
members, without turning Sparks on. These choices last only while the graph page is open
and never change progress or backups.

View has separate **Spark dots** and **Spark lines** sliders, each **0-100%** and
each starting at **10%**. Dots are glowing particles; lines are short decorative
streaks, not connections between work nodes. Set either to 0% to remove just that type.
Arrow keys adjust by 5%; Home/End select the limits. The **Sparks** checkbox hides both,
disabling their sliders while retaining both amounts. Resizing retains percentages.
The focus backdrop also starts with both at 10%. No work, ring speeds or timer records change.

**Nodes / Choose visible nodes and rings** opens checkboxes for every mission/collection group, individual
work node and ring, including the CareerOS core. Groups are batch choices over
their current items; a partly checked group has mixed choices. An evidence node
can belong to both its mission and Saved evidence, so its choice updates both groups.
Expand **Individual nodes and rings** to search by name/context or limit the list
to nodes or ring views. Hidden items stay in this chooser so you can restore them.
**Select all items / Clear all items** change these choices, not the layer switches.
The existing mission/layer filters still apply; chosen items suppressed by those
filters say **Hidden by another filter**. Sparks remain separately controlled above.

Hiding an item removes its displayed connections without moving remaining nodes,
rings or the camera. Hiding the core also hides its glow and stops its heartbeat.
Visibility choices last only while this graph page is open; new items start chosen.
They do not delete records, change completion, or remove anything from backups.
The existing **Reveal and inspect** and **Reveal orbit and members** actions restore
the requested hidden items without changing your Sparks choice.

Connection lines bend away from your cursor but stay attached to their endpoints.
The push is stronger at the normal view and gradually weakens as you zoom closer.
Zooming, dragging and inspecting do not pause automatic motion. **Pause animation**
is a separate dock control; **Auto-rotate** in View controls the camera orbit. Reduced motion
starts paused, and manual navigation remains available.

**Core heartbeat** sends an outward ripple from the actual white CareerOS node
every ten seconds. There is no separate luminous ring: a soft travelling wave
temporarily pushes nodes, links, moving orbits and sparks outward, then they settle back
to their normal positions. Labels and picking follow the displayed meshes;
connections remain attached. The saved layout and progress never move.
Quiet background/planned rings stay still even during the heartbeat; their tethers
remain attached to any moving work-node endpoints. Camera rotation still changes your view of them.
Its toggle affects only that visual rhythm, not the rotating data orbits or
saved-status completion pulses. Pause animation
and reduced motion stop it; it is not an attention measure or evidence of AI activity.

**Shared skill links** connect specifically related checkpoints across the
roadmaps. Select a node and expand **Connections** to see the reason, the two
curriculum citations, and a button to inspect its neighbor. These are curated
comparisons, not source-declared prerequisites or equivalent mastery. Different
roadmap versions and archived work are not guessed into new relationships.
The toggle hides these lines without hiding nodes or changing progress. Connections
outside your current filters remain listed with an explicit **Reveal and inspect**
action; it reveals the necessary view filters. The inspector stays collapsible.

**Copy brief for AI** copies a local snapshot for you to review and paste into your
chosen assistant. CareerOS does not send it to an AI service or automatically make
career decisions. If WebGL is unavailable, the page says so and keeps the named
node list and ring-view index usable; it does not pretend a flat fallback is a 3D visualization.

**CareerOS provides study material and tracks evidence; it is not an autonomous teacher or grader.**
Use the built-in prompts with your editor, authorized lab or coach. Record actual results
on the saved tracker. No reading, diagram click or elapsed time proves the work was done.

### The focus room and distraction log

Open **Daily plan -> Full screen focus**. The large timer sits in front of frosted
glass, with the current full-shell 3D career graph centered on its white core behind it. The background moves
gently as soon as the room opens, independently of the timer; **Ambient motion**
can stop it without pausing your session. Reduced motion starts it still, with
an explicit opt-in through that checkbox. The room uses finer orange connections,
subdued glow and fewer particles to keep the timer readable.
The room's **Core heartbeat** toggle controls the same ten-second mesh ripple.
Turning **Ambient motion** off stops all background motion, including the heartbeat,
without changing the timer or saved distraction reports.
It is visual ambience, not an AI processing work. If browser fullscreen or WebGL is
unavailable, the window-filling room still provides the timer and recording controls.

The backdrop snapshots work and mission modes when the room opens; logging reports does not rebuild it.
At the next local-date check after midnight (normally every 30 seconds), yesterday's
mission-dot activity borders dim in both the main graph and this fixed snapshot,
even when animation or Ambient motion is paused. The snapshot is not refreshed into
a new data snapshot merely to dim its borders. Midnight also removes the temporary
outside-focus checkpoint graph revealed by that snapshot's completion today; the
captured records, renderer and framing remain intact. Reopen for fresh workspace data.

**I got distracted** saves one self-reported button press immediately. Its session,
timestamp and elapsed running-clock time are retained, including whether it was
reported while paused. It does not infer the onset, duration or cause of a distraction.
Only a successful write increases the saved count; storage failures are visible.

The room and compact timer share one countdown. Closing the room does not stop it.
Pause/continue preserve its length; a changed capacity applies to the next session.
**Reset** resets the clock, not the saved reports. **Focus history** on Daily plan
shows recent records, and normal **Export backup / Import backup** includes the full
session/event log for later analysis, not just the displayed count.

The countdown is tab-local. A reload starts a ready timer, while saved reports remain.
An earlier record with no ending is labeled as such, not assumed completed or still
running. A timer ending is not evidence of uninterrupted attention or checkpoint mastery.
The log has bounded record limits and the same 5 MiB workspace limit; a full store
rejects new writes explicitly rather than deleting old records.

Tutorial focus records stay in the temporary practice workspace. A real timer can
continue while the tutorial is open, but an automatic ending is saved only after
leaving practice, subject to the normal storage/conflict protections.

### The complete mission workbooks

Open **[Practice libraries](https://zanark.github.io/CareerOS/#/practice)** from Missions
or Operation documents. Each expanded mission has its own source-based library with
mental models, worked reasoning, concepts, exercises, transfer tasks, diagnostics,
mastery evidence and recovery guidance.

Search the full selected workbook, filter by stage/reference group or material type,
then choose a module, case, lab bank or reference. Source page numbers remain visible.
Shared learning rules are factored into **How to use this roadmap**. Missing source
fixtures, inconsistent labels and other limitations are stated rather than filled with
invented source content. The app does not run labs, grade answers or verify credentials.

The seven new editions are v3. An older tracker remains unchanged until you explicitly
**Adopt documented roadmap**; export a backup first. Adoption archives the exact old
position and preserves saved records, but does not guess that a broader old milestone
proves a different detailed module. DSA's verified append remains its separate exception.
Independent references are available even before adoption and never become fake progress.

### The appended DSA roadmap

**Using the sourcebook with NotebookLM:** the optional **NotebookLM companion - keep
one tracker** panel appears on DSA and its practice library. Keep day-by-day coaching
in NotebookLM; copy its short handoff into the existing evidence description rather
than maintaining a second tracker. Relevant sections include a few correctness reminders.
No 90-day checklist, R0 checkpoint, progress reset or extra recording fields are added.
The sourcebook's coaching/retention labels do not replace CareerOS's existing recall rules.

The expanded 105-page DSA/LeetCode PDF, now named **LeetCode_RoadMap.pdf**, is part of **Pattern Forge v3**.
The original five HashMap checkpoints and their branches are unchanged.
The extension adds 43 topic reviews in the dependency-aware order from Appendix A,
not the chapter-number order.

If your DSA tracker is already v2, open **DSA → Append expanded roadmap** and
review the confirmation. It preserves your genuine HashMap completions, current
checkpoint, blocker, saved work and history. If all five were finished, the next
checkpoint becomes the foundation bridge; those five are counted once, not again
because an archive exists. Existing v1 trackers still use the older explicit
archive-and-start adoption path. Export a backup before either operation.

**[DSA practice library](https://zanark.github.io/CareerOS/#/dsa/1)** includes all
50 source sections, 939 problem appearances and 371 distinct problem IDs. Repeated
appearances are intentional. Use the section selector, row-difficulty filter and
problem search; **Open practice set** on the mission opens the relevant section.
The full roadmap inspector links to each appended topic's practice too.

The sets are curated choices, not 939 required completions. Foundation/Core/Stress
are the source's group labels and do not always match a row's Easy/Medium/Hard label.
Both are preserved. Opening links or browsing ahead never records work or unlocks
checkpoints. Actual practice is logged through the current mission checkpoint.
Some source problems use later techniques: follow the section guidance rather than
treating an early Hard example as a prerequisite for learning the basics.

The requested append places a **foundation bridge** after the retained HashMap
track rather than inserting retroactive requirements. The source omits a phase
placement for Divide & Conquer; its core is placed after recursion and sorting,
with advanced counting revisited later. These are explicit integration decisions.
Topic order within each phase is the app's conservative learning sequence, not a
claim that the PDF specifies a formal prerequisite edge between every pair.
Protocol, revision, practice ladder and other study-method sections remain available
throughout, not a mandatory late checklist.

### First, find the PDF content

**System Design has two supplied sources:** the one-page `system-design.pdf` is
the concepts map; the 183-page `SystemDesign_RoadMap.pdf` is the problem-solving
curriculum. **System Design → Full roadmap** offers **Problems & exercises**,
**Concepts**, and **My saved tracker**, regardless of your saved version.
The concepts view preserves 20 source sections and 160 concept placements.
The problems view includes 72 tracked modules and all 15 case-study references.

Use **Find a concept** to center a term at readable size. **My saved tracker**
returns to your actual System Forge checkpoints. The [concept browser](https://zanark.github.io/CareerOS/#/system-concepts)
also presents every branch at ordinary text size, with search and source attribution.
Repeated patterns stay under each source category. The source asks for an overview
of the cloud patterns, not mastery of all of them. This concepts reference adds no
checkpoint gates and records no completion. The [problems browser](https://zanark.github.io/CareerOS/#/system-practice)
provides all 146 module practice prompts, 15 cases with 195 scope/deep-dive prompts,
transfer drills, module-specific gates and eight periodic diagnostics.

Existing System v1/v2 users must explicitly **Adopt documented roadmap** to start
the module tracker. Their old position, completion evidence, plans and recall
records remain archived; they are not guessed into completion of the more detailed
modules. New modules start unconfirmed. Export a backup before adopting.
Case studies remain independently selectable practice, not mandatory serial
checkpoints; the source does not prescribe case-to-case prerequisites. Record actual
case work as evidence for the active relevant module rather than treating a link
click as a completed case. Source component outlines are discussion prompts, not
production execution diagrams. Specialized patterns begin at overview depth and
are deepened when an exercise needs them.

1. Open [Operation documents](https://zanark.github.io/CareerOS/#/sources).
2. Choose an area from **Mission**. For example, **DSA · Pattern Forge**.
3. Read **Sources, scope and supporting material**, then use **Roadmap stage** to
   browse its stages. Expand **Topics and completion criteria in this stage** for the detail.
4. Compare **Documented roadmap** with **Active tracker**. If the active tracker is
   older than the documented edition, export a backup, review the new definition, then select **Adopt documented
   roadmap** only when you want to switch. Old progress is archived, not guessed into
   different topics. Verified DSA v2→v3 and Neural v3→v4 **Append expanded roadmap** are the exceptions
   described above. If the versions match, no adoption is needed.
5. Select **Open current tracker** to work on that mission.

### Adopt all documented roadmaps safely

In **Operation documents**, **Adopt all documented roadmaps** opens a native review
dialog listing every pending mission and its old/new versions. Opening it does not save
anything. Export a private backup in **Settings** first; no backup is downloaded automatically.

- **Cancel**, the close button or Escape leaves the trackers unchanged. Individual
  adoption remains available below.
- **Confirm all roadmaps** applies every reviewed pending update in one workspace save.
  Already-current missions are unchanged. DSA v2→v3 carries only its verified unchanged
  HashMap prefix, retaining genuine progress, evidence and blocker; a completed prefix
  continues at the first new topic. Neural v3→v4 likewise preserves its verified
  28-checkpoint prefix. Other older versions, including DSA v1, archive
  the exact previous position and start the new tracker unconfirmed, without guessed credit.
- Evidence, recalls, prior plans, history, personal accomplishments and focus records
  stay intact. Primary focus and active/background modes are preserved; a previously
  planned mission with newly available curriculum becomes **background**, not active.
  Refresh an untouched daily plan separately when ready.
- A confirmation is valid only for the exact workspace reviewed. If that workspace
  changes, reopen and review a fresh preview. Validation, record/size limits, archive
  collisions, stale-tab conflicts or storage failures reject the entire adoption;
  no subset of the roadmaps is saved. Adoption itself earns neither a work day nor
  completion credit.

This is an all-or-none application save, not cross-tab synchronization. Use one editing
tab at a time. The tutorial demonstrates **preview then Cancel** before its separate
Fabric v1 adoption/archive exercise.

### Inspect the complete map without adopting

On a mission page, **Full roadmap** beside its name opens every stage together.
For **DSA**, it opens the complete curriculum from the **EXPANDED** PDF even when
your saved tracker is still v1 or v2. **Roadmap view → My saved tracker** shows your
older position; **Complete curriculum** is a read-only preview until you explicitly
adopt it. Previewing never resets, remaps or awards progress. **System Design**
opens the complete problem curriculum, with Concepts and the saved tracker available separately.
All seven expanded missions also open the complete current curriculum, with the genuine
saved version separately selectable. Independent practice/reference nodes link to their
full study pages without adding completion gates.

It starts at **Fit all**, not a stage filter. Use **Find a topic** to jump directly
to DFS, BFS, DP or another DSA topic at readable size, with its requirements and
practice-set link below. On a tracked version, the actual current checkpoint has
a bright, gently pulsing **You are here** highlight; an unadopted preview does not
invent a current step or mark its topics complete.
Use **Current checkpoint** for a readable close-up, **+ / -** or **100%** to change zoom,
and drag, scroll or swipe to explore. Select a node for its action and completion criteria;
this only inspects it and never changes the current checkpoint. **Escape** or **Close dialog**
returns to the mission. Reduced-motion settings keep the highlight static.
**Hide details** collapses the entire bottom section to a small bar and gives that
space back to the graph. **Show details** restores it. A manual choice stays in
effect while selecting other nodes or switching roadmap views, without changing
zoom, progress or your backup. This applies to checkpoint, case-study and concepts views.
During the **Full mission roadmap** lesson, a compact coach guides the map controls.
If you open the map from another tutorial chapter, a **Back to tutorial** bar pauses
that lesson without changing its step. Both layouts leave room for the map.

Optional and forecast stages remain visible without invented progress. A completed track
has no current-step glow. Existing DSA v1/v2 workspaces retain their actual tracker under
**My saved tracker**; adopting the complete version remains the separate confirmed action
described above.

You do **not** need to upload the PDFs or import a JSON file to obtain these roadmaps.
They are already part of the website. **Reload sample is not a PDF import**: it replaces
the current workspace with fictional examples. A new browser starts without assumed
progress; an existing workspace is preserved.

### Learn the controls safely

Click **Tutorial** in the header or sidebar. Follow the glowing target and pointing
hand, perform the indicated action, then select **Next**. Back, Skip and Exit are
available throughout. Exit returns to your real workspace; practice changes are discarded.
Highlight borders sit outside the content with breathing room around headings and controls.
The coach also uses padded, bordered panels; the overlay never changes the target's layout.
Use **Drag to move** at the top of the floating coach to move it with a mouse or
touch. Your chosen position stays across steps while the tutorial is open and is
kept inside the viewport. **Reset position** returns to automatic placement.
With the handle focused, arrow keys move it, Shift moves farther, and Home resets;
Escape cancels an active drag. The compact full-roadmap bars remain docked to keep
the map canvas clear. Position is not written to your workspace or backup.

The tutorial has **182 steps across 31 chapters**, covering actual controls with temporary data. Its files are named
`careerhq-tutorial-example-*`, not real backups. It teaches the interface, not the
mission subjects. A deliberately older **practice** Service Fabric tracker lets you
preview, adopt and inspect an archived roadmap without changing your real version.
The bulk-adoption lesson only opens and cancels its preview, preserving that exercise.

Use the **Chapter** menu to work on one area at a time:

| Chapter | What you practice |
| --- | --- |
| 3D career graph | Focused default, isolated inactive hubs, today-only completion reveal, status colors and actual Checkpoints hide/restore |
| Graph layers & Show everything | Labels, reversible all-data override, restored previous choices, visible node spread, work/reference layers and shared-skill links |
| Graph sparks & motion | Independent Rings/Sparks, separate dot/line densities and 10% defaults, Auto-rotate versus Pause, ten-second heartbeat and Clear center |
| Inspect rings & connections | Mission-only ring selection, individual ring speeds, saved-edition stages, full-circle glow, member search, Focus ring, current checkpoint and cited connection reasons |
| Choose individual nodes | Mission groups, hidden-item search, an individual checkbox, mixed groups, and Select all items versus Show everything |
| Graph camera & fullscreen | Named-node search, Focus node, real zoom/rotation/drag/frame actions, keyboard guidance, native fullscreen/exit and manual clipboard handoff |
| Keep going | Your own past accomplishments, completed work versus practice, and private history that never awards checkpoint credit |
| DSA practice library | Source sections, printed difficulty, reference-versus-progress boundaries and the optional NotebookLM companion without a second tracker |
| System Design concepts | The supplied concepts map, source grouping, pattern-overview guidance and contextual search |
| System Design problems | Module practice sets, changing constraints, source gates, diagnostics and independently selectable case studies |
| PDFs & roadmap updates | Bulk preview-and-cancel, then source selection, individual confirmed adoption, archives, stages, criteria and supporting references |
| Complete practice workbooks | Detailed source units, independent practice, exercise checks, shared learning guidance and evidence boundaries |
| Fieldcraft / new background mission | Research sources, optional terrain, background evidence, native recall, connected learning and the existing Atlas |
| AI Architect / agent-native cloud | Explicit preserved-prefix adoption, actual web citations, optional cases, connected learning and no credit for browsing |
| Focus room & distractions | Frosted fullscreen room, shared countdown, immediate self-reported distraction records and exported history |
| Full mission roadmap | Opening all stages, zooming, read-only inspection, the glowing current step, panning, Fit all and closing |
| Review & roadmap | Saved-work filtering, recall preparation, partial and independent self-checks, and the mission tree |
| Recording evidence | Practice without completion, the recorded-work streak explanation, and separately confirmed checkpoint completion |
| Mission control | Focus/primary/blocker choices, saving background practice, criteria-confirmed background completion and its temporary full graph reveal |
| Opportunities | Optional application fields, saving a lead, moving its stage and finding the saved metadata |
| Freelance research | A ten-lead fictional research set, filters, selecting five rows and copying a review brief |
| Settings & backup / How data is stored | Example export/import, replacement warnings, and the real hosted-site device-transfer routine |
| Discovery Atlas | A fictional collection, meaningful stars and families, a rotatable/movable isometric PS1 diorama, cumulative character equipment, staged/skippable level-ups and chapter replay, hidden clues, source receipts and private portability |

Practice-only example buttons make independent chapter visits usable. They add labeled
fictional records only when you click them. They do not create real applications, verify
mastery, or complete source milestones. Clipboard access is optional: if the browser blocks
Copy brief, use the text preview and Skip step rather than treating a failed copy as success.

Each graph chapter opens its real panel; **Show this step** returns from another page without
writing work or automatically submitting a form. View-only lessons check actual checkbox,
slider, selection or expanded-details state. Camera lessons require an input on the named
control and an actual rendered camera change, not merely focusing a button. If WebGL or
fullscreen is unavailable, the lesson stays unearned: use **Skip step**. Named work, rings,
member details and source comparisons still work without graphics.

The Show everything exercise first hides Labels, enables the override, then disables it so
you can see the previous hidden-label choice restored. It covers all saved daily actions and
current, reference and archived-complete graph content, but never creates collection rings,
changes focus modes or forces spark density to 100%. The separate Nodes exercise demonstrates
why **Select all items** still obeys broader focus and layer filters.

The background-work exercise deliberately saves two fictional Fabric records: an unfinished
note and a criteria-confirmed v1 checkpoint completion. Only the latter reveals its full graph
for the current local day; both count toward recorded-work activity. Later confirmed adoption
preserves that old completion in the archive while new v3 work starts unconfirmed.

### Discover useful signals without changing the tracker

Open **Discovery Atlas** under Career, or choose **Discovery Atlas**
in the tutorial. The collection has 24 discoveries across tangible work, depth,
recall and recorded days. Its percentage describes only this finite collection,
not the percentage of your career, mastery or interview readiness.

Hidden cards offer a clue. Open one and optionally choose **Reveal the trail**
to see its name, exact requirement and current progress. Looking and filtering
never earn anything. A discovered card includes its first qualifying date and
the actual supporting records, with links to Saved work or Recall practice.
Old records can reveal discoveries immediately; a reload does not announce them
as newly earned work.

Repeated notes cannot multiply distinct-checkpoint or same-day milestones.
Only the verified unchanged DSA v2/v3 append shares checkpoint identity; other
editions stay separate. Rhythm discoveries use different local-calendar days,
not a continuous streak. The 28-day ribbon shows recent evidence/recall, while
its all-history count is cumulative. Inspect a day or use arrow keys, Home and End.
A blank tile means no saved learning record, not no work.

Recall discoveries recognise recorded attempts and explicitly spaced independent
self-checks; they are not current retention assessments. A later **Needs review**
still matters in Recall practice and does not erase the earlier event. No currency,
leaderboard, countdown, lost points, automatic readiness or completion was added.
The next-step panel opens your existing primary checkpoint or saved work; it never
changes focus, makes a new plan or bypasses a blocker.

No separate collection data is stored: normal backup/import and optional encrypted
journal publication carry the existing source records. Confirmed replacement/reset
recalculates the collection from those records. In the final tutorial, **Load discovery
example** replaces only temporary examples and discards the practice timer; nothing
is copied to your real workspace. The atlas map and ribbon use data-bearing SVG/CSS;
the requested avatar and its isometric diorama share one small 3D view. There is no external asset
service or continuous idle animation loop.

Your original fictional **Wayfinder** has seven collection levels, each with a
different chapter, realm, equipment bundle and relic. The minimal PS1-style
**3D character** keeps its earned equipment: turn it around to see the pack,
rolled map and later additions. Its background is a real low-poly **isometric
diorama**, not a flat image. Drag or use arrow keys on the focused canvas to
orbit the whole world; scroll, pinch or use plus/minus to zoom. **Move diorama**
switches a one-finger/left drag to pan. Right-drag or Shift plus arrow keys also
moves the view. **Reset diorama view** or Home restores the isometric angle,
position, zoom and rotation mode, not any saved progress.

Each discovered card supplies **100 collection EXP**, purely a cosmetic display
of the same collection count. It is not a career level, independently assessed
ability, currency or a separate saved score. New records can offer **View level-up**
without stealing focus. The sequence fills the old bar, crosses the threshold,
reveals the equipment and keeps a reward summary. Every crossed level is retained
in a multi-level arrival. **Skip animation** shows all rewards immediately;
**Replay level-up** and **Play prologue** never earn anything.

Click an unlocked chapter to revisit its outfit and scene; **Current chapter**
returns to the actual level. Future artwork stays hidden. Reduced motion removes
automatic effects while leaving deliberate manual orbit available. The viewer
has no idle animation loop and pauses rendering offscreen. Small texture-free
geometry and a capped 82,944-pixel internal buffer minimize cost; no promise of zero
GPU cost or universal device performance is made. If WebGL cannot initialize,
an explicit notice distinguishes the still fallback from real 3D.

The final form is attainable within one learning mission; no job offer, paid
credential or completion of every roadmap is required. The original 150 lessons
remain in order; twenty Discovery Atlas lessons, seven later Fieldcraft lessons
and five agent-cloud lessons bring the current tour to 182 steps.
See [the scoped design and research basis](DISCOVERY-DESIGN.md).

### A normal working session

**For work you did before using CareerOS:** open **Keep going**. Use **Load personal
history** to review a privately supplied history file, or **Add a past accomplishment**
to record it yourself with its source. The history import adds records without replacing
the workspace; duplicate IDs are not added again, and conflicting replacements are rejected.
Dates are optional rather than guessed. This is separate from mission checkpoint evidence.
Personal history is included in your normal **Export backup** and restored by importing
that workspace backup on another machine. Nothing personal is bundled in the public website.

1. Open a mission. Use **Bring into focus** if it is in the background, then **Make
   primary mission** if you want it considered first. Leave other areas in the background
   when you do not want daily actions for them.
2. Open [Daily plan](https://zanark.github.io/CareerOS/#/plan), choose **Gentle**,
   **Steady**, or **Deep focus**, and select **Refresh plan** if today's untouched plan
   needs your latest priorities. A plan with logged actions stays intact.
3. Select **Open checkpoint** and do its **Next action** outside the tracker.
   Read the **Completion criteria** before deciding the checkpoint is finished.
4. Return to that daily action and select **Log progress**. Add an artifact title,
   a truthful description of the work, and optionally an HTTP(S) link. Leave **This
   checkpoint is complete** unchecked to record practice without advancing.
5. When your work demonstrates every criterion, check **This checkpoint is complete**,
   confirm each criterion, and select **Complete & unlock next**.
6. Find the record in **Saved work** and the event in **History**. Use **Export backup**
   in **Settings & data** to keep a private copy.

For example, the documented first DSA checkpoint is **HashMap Fundamentals**:
practice adding, updating and looking up values in a small C# `Dictionary`.
An evidence title might be `Dictionary add/update/lookup practice`; describe what
you actually implemented and what still confused you. Do not paste an example as proof
of work you have not done.

**Daily action done, checkpoint complete, retained recall, and interview ready are
different states.** Logging through a daily action records that action; standalone
mission evidence is not automatically linked back to a daily-plan row. The focus timer
does not log work. Its session is tab-local, and the planned minutes are authored
estimates, not measured learning time.

### Recorded-work days and streaks

Each mission page shows a **recorded-work streak** and **Work recorded today** or
**No work recorded today**. Expand **How this is counted** for the rule:

- Any saved progress/evidence entry or **any recall result** counts, including Partial
  and Needs review. No checkpoint completion is required.
- Dates come from those records' timestamps in the browser's **local calendar**.
  Multiple records on one day count once, across current and archived roadmap versions.
  Future calendar days are excluded. This is not a rolling 24-hour timer.
- With work today, count consecutive days ending today. Without work today, yesterday's
  consecutive streak is retained for today's grace period. If neither today nor yesterday
  has a record, the streak is zero; a new record today starts again at one.
- Browsing, settings, adoption, timer/distraction events, plan generation and personal
  history do not count. An action contributes through its saved evidence, not merely
  because it appeared in a plan.

For example: a Monday note gives one day; Tuesday with no note still shows one day,
but a dim border. Wednesday with no Tuesday/Wednesday record shows zero. Saving evidence
on Wednesday starts a new one-day streak and brightens the mission dot. **No work recorded
today** describes the tracker, not whether you worked elsewhere. Neither a streak nor
a bright border proves mastery. Roadmap completion counts remain version-specific even
though recorded-work days span versions.

Implementation references: [`getMissionActivity`](../src/domain/missionActivity.ts#L19),
[`MissionWorkStreak`](../src/MissionWorkStreak.tsx#L7),
[`activityPresentation`](../src/graph/CareerOrbitVisuals.ts#L170),
[`missionVisuals`](../src/missionVisuals.ts#L5), and
[`OperationSourcesPage`](../src/SourcePanel.tsx#L78).

### Where the other information goes

| Page | Use it for | What it does not do |
| --- | --- | --- |
| Career graph | Rotate and inspect your career work in 3D, filter missions and records, or copy a private AI brief | No invented progress, automatic AI decisions, or completion from clicking a node |
| Keep going | Read your own source-linked past accomplishments and actual saved work; load private history after reviewing it | No research quotes, generic motivation, invented wins, or automatic checkpoint credit |
| DSA practice library | Browse all 50 expanded DSA sections and curated problem links | No automatic solve tracking, completion credit, or requirement to clear every listed problem |
| System Design concepts | Browse or search the attached one-page roadmap and its repeated pattern contexts | No automatic mastery claims, new required checkpoint gates, or changes to the saved System Forge tracker |
| System Design problems | Work through the 72-module source progression and browse 15 cases, prompts, transfer tasks and diagnostics | No AI assessment, automatic adoption, or mandatory case-to-case completion chain |
| Practice libraries | Browse seven expanded workbooks and the research-backed Fieldcraft guide; search study content and open modules, labs or references | No automatic completion, execution of source instructions, exam booking or guaranteed outcomes |
| Roadmap | Browse the goal, mission tree and stage flowcharts | Clicking a diagram does not complete work |
| Recall practice | Revisit saved DSA/System Design/FDE work from memory | No AI grading or automatic insertion into Daily plan |
| Discovery Atlas | Explore optional discoveries and the saved records behind them | No career score, independently assessed mastery, record mutation or separate export |
| Opportunities | Record roles, application stages and optional effort/resume details | No job search, application submission or resume evaluation |
| Freelance ledger | Research ten leads, classify them, select five and copy a review brief | Adding leads does not complete the Side Income checkpoints |
| Interview readiness | Self-assess five interview skill areas | Ratings are not computed from evidence or completion |
| Settings & data | Change the goal, export and restore private records | Goal text does not instruct an AI planner |

The expanded missions measure source-defined capabilities, not guaranteed income,
employment, contest ratings or professional credentials. AI portfolio choices and
independent case banks are not automatically completed builds. Required certification
study does not imply a required paid exam. Older sprint, phase-review and forecast-only
definitions remain valid for their saved versions and archives.

### A small first review

Start with **one mission**, not all ten. Review its first action and criteria for
clarity and suitability, try saving practice in the tutorial, then locate the result
in Saved work. Also check whether the source page shows the roadmap version you expected.

Useful feedback is: **page/checkpoint + what you expected + what happened**, with a
cropped screenshot if helpful. No private backup or complete PDF is needed to report
an interface problem.

**Local is not encrypted.** Saved work is not a secure vault.
Other JavaScript on the same GitHub Pages origin can read the same localStorage.
Do not enter credentials, confidential material, or sensitive personal information.
Keep exported backups private. Read [Privacy](PRIVACY.md) before entering real data.
Saving and exporting share a 5 MiB compact UTF-8 limit so accepted workspaces remain importable.
Larger writes fail without replacing the previous saved workspace.

### Current boundaries worth knowing

The documents' full teaching, coached assessment, exercise ladders and strategic
planning rules are not implemented. Some checkpoints summarize a broad topic group or
phase; completing that short checklist is not proof of mastery of the whole subject.
Use the original learning material for the full practice progression.
The [integration review](OPERATION-SOURCES.md#review-findings-structure-is-not-a-complete-course)
lists specific content gaps, including narrowed Service Fabric requirements, missing
hands-on obligations and phase reviews that are not next-lesson instructions.

There is no normal edit/delete interface for saved evidence or lead details; opportunity
stages and freelance verdicts can be changed. Standalone evidence can be added to an active
or background, unblocked mission's current unfinished checkpoint; linked daily-plan
actions still require active mode. After a documented track is complete,
its ordinary evidence workflow cannot record more practice. Recall remains available
for eligible previous DSA/System Design/FDE work.

Recall is self-reported. A failed review flags **Needs review**, but the present algorithm
can reuse older spaced successes when a subsequent independent review restores
**Retained**; it does not require a fresh spaced recovery cycle. Treat that badge as a
tracking aid rather than an assessment.

## Persistence and changing machines

There are **no user profiles, accounts, or automatic cloud sync**. Mission recorded-work
streaks are derived locally from the saved evidence and recall records, not a server account.
Progress uses localStorage for the current browser and site origin (scheme, domain,
and port), not a server account. Refreshing retains compatible data. This revision safely
converts v1 storage to data format v2 while keeping its previous roadmap positions, evidence,
plans and history. The storage key remains compatible with existing installations.

Adopting a documented roadmap is a separate, confirmed action on its mission or Operation
documents page. It archives the previous position and starts the new definition without
inventing completion credit, except for the verified unchanged DSA and Neural append prefixes.
Saved work remains visible by its original version. Future
schema or roadmap changes require explicit migrations, not silent resets.

To move devices or browsers, export a backup, transfer it privately, and import it
on the destination. Moving from the local preview to GitHub Pages also requires this:
they are different origins. Clearing site data or deleting a browser profile can
remove local progress. Export regularly; import replaces the destination after confirmation.

### Optional encrypted repository sync

**Settings & data -> Open repository sync** is an additional workflow, not a replacement
for ordinary saving, JSON backups, imports, reset, tutorial practice, or completion criteria.
The website still has no server account and cannot commit or push for you.

On the first device:

1. Keep a normal private backup, then open Repository sync and create a journal with a
   strong, unique passphrase of at least 12 characters. Store the passphrase in a password
   manager; there is no password reset.
2. The browser encrypts a starting snapshot of the current workspace. Use **Copy encrypted
   updates** or **Download encrypted updates**.
3. Append the **entire block**, including its header on the first export, to
   `public\careeros-progress.jsonl`. The shipped file is deliberately empty. Do not put an
   ordinary plaintext backup in this file, remove old lines, or manually edit encrypted records.
4. Commit and push, wait for the Pages deployment to succeed, then **Check published updates**.
   The export becomes confirmed only when this browser reads its batches from the deployed site.

On a phone or another browser, open Repository sync, **Check published updates**, and enter
the same passphrase. The first connection previews both the current browser and incoming
workspace. Back up anything needed and explicitly choose which complete workspace to keep.
It does not guess whether a different browser's existing records belong to the same history.

Record work using the existing pages. Returning to Repository sync during that open workspace
does not require another unlock. **Prepare encrypted updates** exports the new differences and
any earlier unconfirmed batches. Transfer the downloaded file or copied text to your laptop,
append it to the same repository file, commit and push. Repeating an identical exported batch
is safe: it is replayed only once. An export is a snapshot of changes at preparation time;
later local work remains pending until another export includes it.

The passphrase-derived, non-extractable key stays in memory only. Reloading, **Lock journal**,
or entering tutorial practice discards it. Existing browser progress remains usable while
the repository journal is locked; the ordinary local workspace is still unencrypted.
Unlocking a connected browser also checks the deployed journal. Compatible new published
changes combine with unpublished local work; nothing is uploaded automatically.

Conflicts are explicit:

- Mission progress, each dated plan, each record, and each setting are compared against the
  shared journal baseline. Different edits to the same section require review. Existing record
  IDs are not silently rewritten, so two offline devices creating different records with the same
  sequential ID also conflict. Coupled evidence/progress rules are revalidated after a merge.
- A conflict preserves both complete snapshots for inspection and private backup. A whole-workspace
  choice requires acknowledgement and does not publish by itself. Keeping the browser version can
  create removals in the next export; inspect the added/changed/removed summary.
- If two devices export branches from the same old head, do not append both branches. Publish
  one, load that deployment on the other browser, review/rebase, discard older copied blocks,
  then prepare a fresh export. A branched journal is rejected, not resolved by file order.
- A missing or modified previously confirmed prefix is rejected on a connected browser. A fresh
  device has no earlier trusted head and cannot independently prove that a valid file is the newest.

**Review a full journal file or pasted journal** validates/decrypts a combined file locally
before committing or for offline transfer. It does not confirm publication. **Download encrypted
cache** retains staged batches. **Disconnect repository sync** removes only this browser's
sync cache, not its workspace or the repository file; download the cache before disconnecting.
Normal backups do not contain the sync cache or key, and normal backup import/reset do not
silently disconnect it. Their resulting workspace changes remain eligible for a later explicit
journal export.

The journal has a 24 MiB / 2,000-batch limit, while each workspace retains its existing 5 MiB
portable-backup limit and domain record limits. Browser storage can fill before those limits;
failed writes are reported, never claimed published. If a reviewed workspace saves but the
separate sync-cache write fails, the error says so and no publication is acknowledged: keep a
private backup and retry the journal connection/check.

Only the ciphertext journal is intended for Git. It uses browser Web Crypto, AES-256-GCM and
PBKDF2-SHA-256 (600,000 iterations), with random salt and per-batch IVs and authenticated journal/
batch/parent metadata. File size, record count and Git history remain public. A weak passphrase
can be guessed offline. Encryption does not protect an unlocked browser, compromised same-origin
scripts, or an already-leaked plaintext backup. Do not enter credentials or confidential employer
material. Ordinary backups remain plaintext and private.

The existing validation suite checks the committed journal's envelope, chain and duplicate IDs.
It cannot decrypt your personal journal in CI because the passphrase is intentionally absent.
Use the browser's full-file review before publication; damaged ciphertext is rejected at unlock
without replacing local work.

## Develop and verify

Use a current Node.js LTS release and npm.

Text uses `rem` units and the shared `--type-scale` value in `src/typography.css`.
The current scale is **1.5×** the original typography, without page zoom. Keep new
font sizes relative to this scale; layouts should wrap rather than shrink the text.

```sh
npm ci
npm run dev
npm run validate
npm run test:e2e
npm run build
```

The development site is `http://127.0.0.1:5173/CareerOS/`.
Playwright builds the production app and manages Vite preview on port `4173`, reusing
an existing server outside CI. Use a production preview at that address, not a dev server:
the browser tests should exercise the shipped content-security policy.
Local E2E tests use installed Microsoft Edge (`msedge`); CI uses Playwright
Chromium. If the required browser is genuinely absent, install it before testing:
`npx playwright install chromium` for CI, or install Microsoft Edge for local runs.
CI runs browser cases one at a time so concurrent software-WebGL captures do not
starve each other. Cross-tab scenarios still exercise their multiple pages within
one case; assertion timeouts and coverage are unchanged.
If port `4173` belongs to another process, leave it alone and set `CAREERHQ_E2E_PORT`
to a free port before running the tests (PowerShell: `$env:CAREERHQ_E2E_PORT='4174'`).

Browser coverage includes navigation and deep-link reload, desktop screenshots,
390px/320px layouts, local persistence, evidence/criteria, capacity, filters,
pipeline changes, backup replacement/rejection, and stale-tab protection.
Screenshots and failure traces are in `test-results`;
the HTML report is in `playwright-report`. Test contexts use only synthetic records.

## Deployment and troubleshooting

The Vite base is `/CareerOS/`, matching the repository name. Routes use hashes, such as
`/CareerOS/#/mission/pattern`, so reloading a deep link does not require server rewrites.
`npm run build` produces `dist`; **only that build output belongs in the Pages artifact**.
Do not publish local backups, browser reports, source-reference documents, or context stores.

For the first deployment, a repository administrator must select **Settings → Pages →
Build and deployment → Source: GitHub Actions**. The `Validate and deploy CareerOS`
workflow then validates, builds, runs browser coverage, and deploys on pushes to `main`.
It can also be run manually from Actions. If a run happened before Pages was enabled,
rerun it after selecting that source.

The production HTML carries a restrictive content-security policy and makes no external
runtime requests. Only Vite development mode removes that policy to allow its inline
hot-refresh preamble; the built static HTML retains the policy.

The application is at **https://zanark.github.io/CareerOS/**, not the GitHub repository
file listing. Use the exact `/CareerOS/` project path.

If the website is missing or appears outdated:

1. Open [repository Pages settings](https://github.com/Zanark/CareerOS/settings/pages).
   An administrator must select **GitHub Actions** as the build source.
2. Open [Validate and deploy CareerOS](https://github.com/Zanark/CareerOS/actions/workflows/deploy.yml).
   Select the latest `main` run and inspect **both** `build` and `deploy`.
3. If the source setting was just corrected, use **Re-run all jobs** on that run, or
   **Run workflow** with branch `main`. A green build alone does not establish deployment.
4. If either job fails, open its failed step. Fix the reported error rather than clearing
   browser storage or rerunning blindly. The old "Read Pages configuration: Not Found"
   error means Pages needs the source setting above.
5. After both jobs succeed, open the website link and hard-refresh with **Ctrl+Shift+R**.
   Do not clear site data: that can delete your private progress.

Failed browser runs retain their synthetic test reports and traces in the
`browser-failure-diagnostics` Actions artifact for seven days. Inspect the failing
test rather than treating a successful compile as a successful deployment.

Repository administration and Git push permissions can differ. A user who can push
may still need the owner to change Pages settings.

Implementation entry points: `src/App.tsx` (`Workspace`), `src/dialogs.tsx`
(`EvidenceDialog`), `src/useWorkspace.ts` (`useWorkspace`), `src/domain/catalog.ts`
(`missions`), and `src/domain/engine.ts` (`parseState`, `generatePlan`, `recordEvidence`).

## README artwork

The root README uses original editorial illustrations, not screenshots or personal
progress. Each panel explains one idea: the tracker, document-derived roadmaps, the
working loop, or manual data portability. Native Markdown supplies links and the
important limitations; image alt text provides a text alternative.

Editable sources are `docs/images/readme-*.svg`. Their `readme-*.png` counterparts are
rendered with the existing Playwright dependency:

```sh
node scripts/render-readme.mjs
```

The renderer uses Microsoft Edge on Windows and Chromium elsewhere. Keep fonts local
and text large enough for a narrow README column. Older `overview.png`, `roadmap.png`,
and `tutorial.png` remain genuine fresh-workspace/practice screenshots, not user records.
