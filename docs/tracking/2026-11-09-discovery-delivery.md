# Discovery Atlas - implementation and delivery receipt

## Scope and authority

The owner authorized additive gamification, a final tutorial chapter, an original
evolving character and animations, plus workstream tracking, commit, push and
GitHub Pages deployment. Existing browser records, frozen roadmaps, criteria,
ordinary backups and the optional encrypted journal remain authoritative.
The approved illustrated README and deployment workflow are unchanged.

Workstream: [10_DISCOVERY_ATLAS.todo](../../TODO/10_DISCOVERY_ATLAS.todo).
Issue: [#9](https://github.com/Zanark/CareerOS/issues/9), in the existing CareerOS
Project 4 / Kanban view. No replacement Project or draft item was created.

## Supersession

The first character presentation was rejected after source revision
`abcbabdeb71bb8788f36adb8efdbdc377edb734d` was committed and pushed.
Workstream #9 was reopened for research-led game-style level-ups with distinct
content at every level, followed by the owner's explicit PS1-style 3D request. Pages run
[42598017993](https://github.com/Zanark/CareerOS/actions/runs/42598017993)
was intentionally cancelled before deployment. The prototype checks retained
below do not establish aesthetic acceptance. The replacement's separate local
qualification follows; exact-source publication is authorized and pending.

## Revised result and local qualification

- Seven original chapter scenes, relics and cumulative 3D equipment bundles.
  Collection EXP is exactly 100 times the existing discovery count, not a new
  saved score, currency, ability assessment or professional rank.
- A minimal original PS1-style character supports actual mouse, keyboard and
  native touch orbit/pan/zoom/reset. Seven real low-poly isometric dioramas
  replace the flat backgrounds, with chapter-specific terrain and props batched
  into one mesh. Back and side views show real equipment geometry. Chapter
  changes and reward phases retain one orthographic camera/context.
- Level-ups fill the old bar, cross the threshold, reveal a level-specific
  equipment effect and keep a reward summary. Catch-up keeps every crossed level.
  Skip, replay, prologue and chapter inspection never change source records.
- Reduced motion settles automatic effects while retaining deliberate camera
  input. Offscreen/hidden views stop requesting frames; route cleanup releases
  geometry, materials, controls, observers and the owned context. Unavailable
  WebGL is explicitly distinguished from the labelled still fallback.
- Existing Three.js is reused with no textures, shadows, model downloads,
  lighting passes or postprocessing. The renderer is lazy-loaded only when
  mounted. The unmodified Silkscreen display font is self-hosted with its
  complete deployed OFL notice.
- Fresh `npm run validate`: **TypeScript and 689 unit cases passed**.
  Unchanged tracking behavior retains its **22-case** qualification.
  Production build passed.
- Final affected browser gate: **24 passed**, including all discovery/avatar
  cases, the complete **170-step** tutorial at 1440px, the final chapter at
  320px, ordinary independent-browser backup transfer, the encrypted
  laptop-to-phone append workflow and tutorial/journal isolation.
- Dark/light 1440px, 1024px dark, 780px light, 390px dark and 320px light
  layouts were exercised. Actual seven-chapter/reveal sheets, four native
  orbit views and phone views were visually inspected with synthetic records.
- The new browser tests initially needed explicit `HTMLCanvasElement` guards;
  type validation caught this and the guards were added, not bypassed.
- The new reset lesson exposed a genuine asynchronous gate race in both
  desktop and 320px chapter cases: the camera reset succeeded after the coach's
  scan. Observing the actual discovery UI attributes fixes it without polling
  or relaxing assertions. Both cases and the final full gate then passed.
- A focused seven-chapter rerun confirms an actual new WebGL paint before each
  frozen-clock reveal capture; a changed DOM model label alone is insufficient.

The original 150 lessons remain in order. Twenty appended lessons teach
the new layer. Domain schema, storage keys, frozen roadmaps, ordinary exports,
encrypted journal, approved illustrated README and deployment workflow are unchanged.

### Bounded performance evidence

The full level-seven character, equipment and terrain submitted **1,292
triangles / eight draw calls** using a **332x248**, DPR-1 buffer. All seven
scenes fit the tested <1,600-triangle / eight-call / 82,944-pixel budgets.
A Windows Edge probe performing actual orbit
input observed **zero additional frames during one second idle** and another
**one second offscreen**. Source workspace bytes remained unchanged.

After warm-up, 52 CPU-time samples around `renderer.render` had median **0.4ms**,
p95 **0.5ms**, maximum **0.6ms**. These measurements exclude startup/shader
compilation and asynchronous GPU completion. They are not frame-latency
measurements, real-phone qualification or an assurance of zero overhead on every
device. Native touch/pinch was exercised through browser mobile emulation.

Design sources, actual read scopes and inaccessible-source limits are recorded
in [DISCOVERY-DESIGN.md](../DISCOVERY-DESIGN.md).

The earlier avatar-only qualification (688 units, 169 steps, 1,028 triangles,
384x216 and 0.3ms median CPU submission) predates the terrain request. The
full-diorama observations above supersede those figures without erasing them.

## Prototype result

- Twenty-four optional discoveries derive from existing evidence/recall, exact
  checkpoint identity, real recorded kinds and nonconsecutive local days.
- Hidden clues can be inspected/revealed without progress; qualifying cards retain
  their actual first source receipt. Same-day and same-checkpoint repetition
  cannot multiply distinct-day/checkpoint milestones.
- The themed SVG/CSS map, medals, recent-day ribbon, real next-step links and
  seven-level fictional Wayfinder use no extra WebGL context or new dependency.
- Character equipment follows collection count, not professional capability.
  Arrival, movement, blink and spark animations end; replay earns nothing and
  reduced motion keeps the character still.
- The original 150 tutorial steps remain in order. Fourteen appended lessons
  bring the isolated tour to 164 steps / 29 chapters. The explicit discovery
  fixture and its timer replacement affect practice only.
- No workspace schema, storage key, artifact upload, separate achievement ledger,
  currency, leaderboard, deadline or automatic publication was introduced.

## Prototype technical and visual evidence

- Fresh `npm run validate`: TypeScript and **685 unit cases passed**.
- Fresh `npm run test:tracking`: **22 behavior cases passed**.
- The earlier affected **56-case browser gate passed**, including the complete
  then-162-step tour at 1440/390/320px, workspace recovery and the actual
  plaintext/encrypted publication workflows.
- After the character follow-up, the final **13-case local browser gate passed**:
  all twelve discovery cases plus every step of the final 164-step tour at
  1440px. The appended chapter also ran completely at 320px.
- Responsive discovery cases exercised 1440px dark/light, 1024px dark, 780px
  light, 390px dark and 320px light. Actual synthetic captures were visually
  inspected, including the final earned character form.
- Browser cases cover keyboard/modal focus, actual source links, view-only
  inspection/replay, notifications that do not block normal evidence recording,
  reduced motion, bounded animations, source-only persistence and no new canvas.
- A valid synthetic source fixture reaches all 24 discoveries and the final
  character form within DSA alone. No offer, paid credential, cross-mission
  grinding or completion of all roadmaps is required.
- A 10,000-record fixture verifies bounded 24-discovery / 28-tile output and
  bounded receipts. Observed timings are machine/load-specific, not a universal
  frame-rate or device-performance guarantee.

Visual review caught a low-contrast light-mode heading caused by the shared
heading cascade. Scoping the existing inverse heading role fixed it; an actual
computed-color assertion now guards the outcome. Plot-relative positioning
keeps its count centred independently of caption wrapping. A nested test
registration was caught and moved to module scope; assertions were not weakened.

## Acceptance and publication

Technical qualification is not user visual approval or evidence of improved
career outcomes. No real user workspace, private PDF or passphrase was accessed.
All browser verification used isolated synthetic records.

Replacement publication is authorized and pending. The successful source revision, exact
Pages run and hosted read-back will be recorded here after they exist.
