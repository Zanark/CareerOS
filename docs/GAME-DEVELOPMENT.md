# World Forge / Godot-first Game Development

The November 21 edition adds an available Game Development mission
that starts **Planned**. It supplies a complete learning route and an original
multiplayer-game comparison target, not a prebuilt or tested Godot game.
Publishing this learning material does not build the game or establish the
learner's competence.

[Guide](GUIDE.md) · [Architecture](ARCHITECTURE.md) ·
[Source register](OPERATION-SOURCES.md) · [Agent contract](AGENT_CONTRACT.md)

## Open it without starting it

Use **Missions → Planned → Game Development**, or `#/mission/gamedev`.
The card and saved checkpoint say Planned. **Full roadmap**, **Practice library**,
**Capstone benchmark**, source notes and search are available immediately.
There is no need to activate the mission just to inspect its content. A backup
with explicit valid game progress still restores that progress rather than
resetting it to Planned.

**Bring into focus** is the deliberate activation action. Until then, evidence,
primary-mission and blocker controls are disabled, the daily planner excludes
the mission, and the normal career graph shows its quiet hub rather than its
checkpoint cloud. **Show everything** is only a reversible graph-view choice.
Browsing, opening code, comparing the rubric or trying the tutorial grants no
completion, activity, recall or Discovery Atlas credit.

After deliberate activation, the existing artifact/criteria workflow applies.
Completion is self-attested; CareerOS cannot run or inspect the learner's game.
Starting this mission does not make it the primary mission or complete another
mission's prerequisites.

## The complete route

There are **65 core checkpoints in 14 phases**, plus five capstone references
and eight optional specialization studies: **78 browsable units and 156 applied/
changed-condition exercises**. Session-minute labels are starting-session sizes,
not deadlines or a predicted time to master game development.

| Phase | Checkpoints | Required progression |
| --- | --- | --- |
| Start from zero | GD-01-05 | Files and folders, pinned tools, terminal/Git, the game loop and basic debugging |
| Learn to program | GD-06-11 | Types, expressions, branches, loops, functions, containers, objects and rule tests |
| Space and time | GD-12-15 | Coordinate spaces, vectors, angles, rates, grids and conservation |
| Speak Godot | GD-16-20 | Nodes/scenes, lifecycle/physics, signals, resources and input ownership |
| Finish a 2D game | GD-21-25 | Movement, collision, camera, tiles, complete loop and export |
| Design the experience | GD-26-29 | Mechanics/feedback, scope, teaching levels, story and cooperation |
| Maintainable systems | GD-30-33 | Rule/presentation separation, state machines, safe saves and scene lifetime |
| Presentation | GD-34-38 | Readable art/rights, animation, audio/music, shaders and bounded effects |
| Living systems | GD-39-42 | AI, navigation, inventory transactions and reproducible generation |
| Include the player | GD-43-45 | Menus/settings, remapping, accessibility and observed playtesting |
| Cross into 3D | GD-46-49 | Transforms/cameras, imports/materials/light, movement and a complete microproject |
| Dependable multiplayer | GD-50-55 | Network models, peers/RPCs, lobby/readiness, authority, sequencing and recovery |
| Test, measure and ship | GD-56-59 | Automated/fault tests, profiling, reproducible exports and release preparation |
| Original capstone | GD-60-65 | Paper proof, greybox, network slice, campaign, qualification, delivery and self-grading |

Every core and optional study has a first-principles model, worked scenario,
failure mode, practical task and changed-condition retry. Early Node examples
include their scene callback; controller/shader examples state their different
setup. Code is inert, keyboard-focusable text with local horizontal scrolling,
not code executed by the website or a claim of Godot qualification.

The optional branch maps deeper rendering, character production, competitive
netcode, online services, procedural worlds/tools, engine extension, additional
platforms and studio/localization workflows. It does not silently add mandatory
checkpoints or promise mastery of every studio discipline.

## The original multiplayer benchmark

**Capstone benchmark** opens the five independently browsable reference units:
the complete original game/story/rulebook, concrete level atlas/worked route,
network/session contract, production/asset plan and acceptance/rubric worksheet.
The intended game is a bounded desktop cooperative project with Godot/GDScript
as its primary implementation path.

The reference defines controls, mechanics, goals, content, authority,
concurrency, communication, failure/recovery, safe checkpoint replacement,
client/server delivery and a complete ending. Its level fixtures have explicit
coordinates and an intended two-player route; four players must also be
supported. It is not a requirement to publish a server or buy hosting.

Use the **22 acceptance scenarios** and **100-point rubric** to compare actual
exported builds. Each of ten categories has distinct 0-4 anchors. Report points,
evidence coverage and remaining defects together. Missing or unverified critical
multiplayer, authority, conservation, recovery, delivery or ending evidence
means **Incomplete**, even if presentation points are high.

An independent discrete model checked the source-derived atlas and legal routes
with two/four actors. That is limited geometry/conservation evidence, **not**
Godot execution, actual networking, a complete timed-gate solver or a playtest.
The learner must produce those actual game observations. Original authorship
here does not establish market novelty or trademark clearance.

## Sources and safe practice

The source registry records **23 primary references**, reviewed November 21,
2026, with explicit complete/partial reading scopes. It covers Godot/GDScript,
engine/scene concepts, math/physics, 2D/3D, tiles, animation, audio/UI, shaders,
navigation, persistence, multiplayer, headless/export/CLI, performance, licenses,
accessibility and Git. The stable website identified Godot 4.7 at review;
aliases move, so pin the actual editor and matching export templates.

The sequence, exercises, game and rubric are authored learning design, not an
official Godot syllabus or certification. No PDF pages are invented. The site
does not install an engine, run GDScript, connect to a game, grade evidence or
verify independent competence.

Use disposable local fixtures and authorized participants. Local ENet tests do
not prove Internet/NAT behavior, secure public admission, browser networking,
cross-play or automatic host migration. Authentication, public hosting,
unknown-rights assets, real credentials and paid services are outside the
required first-project execution.

## Implementation and compatibility

`src/domain/gameDevelopment/outline.ts` supplies shared metadata;
`mission.ts` supplies `gameMission` and `createGameProgress`. The complete
`content.ts`/`capstone.ts` teaching bodies load through the existing lazy pack
loader. `sources.ts` retains source identities/scopes.

Stable mission ID `gamedev` is latest-only v3. Frozen old catalogues do not gain
a fabricated game edition. `Mission.planned` still means an unavailable
roadmap; this available curriculum instead declares `initialMode: 'planned'`.
Its Planned progress must be the canonical pristine first checkpoint, without
completions or a blocker. Deliberate activation permits the existing work flow.

`parseState` and strict schema-one migration add only a missing game cell,
preserving old focus, modes, records and dates. Explicit malformed game data
rejects instead of resetting. Normal backups retain it. Encrypted old baselines
normalize before replay, while incremental mission-cell deletion still fails;
competing progress changes remain conflicts. Schema 2 and
`careerhq.workspace.v1` are unchanged.

Four exact-checkpoint transfer comparisons reuse `careerSkillLinks.ts` for
related practice. They are navigation, not shared completion or hidden gates.
Native recall's supported missions and the Atlas catalogue are unchanged.
