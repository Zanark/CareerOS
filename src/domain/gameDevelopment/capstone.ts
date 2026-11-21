import type { PackSection } from '../roadmapPacks/types';

export const capstoneRubric = [
  { title: 'Conservation and core mechanics', weight: 15, levels: [
    'Observed core actions are absent or break tile/cargo identity.',
    'Lift/place is visible, but invalid actions or handoffs corrupt state.',
    'Normal lift/place/handoff works; important invalid/reserved cases remain incomplete.',
    'All required transactions and reset rules pass the documented normal and invalid cases.',
    'The same invariants survive stress, simultaneous actions and a changed valid layout, with explainable evidence.',
  ] },
  { title: 'Meaningful cooperation', weight: 10, levels: [
    'There is no actual cooperative task.',
    'Players coexist, but one can perform the intended shared task without coordination.',
    'Two-player cargo works, but communication or role transitions are confusing.',
    'Two and four players can coordinate terrain, cargo and pings without required voice chat.',
    'New pairs complete the teaching progression and explain their shared decisions; observed feedback informed a verified improvement.',
  ] },
  { title: 'Network authority and synchronization', weight: 20, levels: [
    'There are no independently connected clients or clients own critical outcomes.',
    'Clients share some state, but identity, ordering or authority can be bypassed.',
    'Normal synchronization works; duplicate, stale or concurrent command behavior is incomplete.',
    'Sender-derived identity, authority, sequence/epoch rules, bounded requests and required fault cases pass.',
    'Recorded multi-process fault/stress evidence shows consistent state and bounded traffic under the declared network envelope.',
  ] },
  { title: 'Sessions, checkpoints and recovery', weight: 10, levels: [
    'A connection or loading failure makes the game unusable or loses state silently.',
    'Happy-path lobby works, but disconnect/reset creates phantom players or items.',
    'Some recovery works, but a required host/client/late-load case is missing.',
    'Every required failure has the specified visible outcome and preserves the checkpoint/invariants.',
    'Repeated loss, restart and late messages recover reproducibly without leaked scenes, duplicate callbacks or hidden state.',
  ] },
  { title: 'Levels, teaching and story', weight: 10, levels: [
    'Required progression or ending is absent.',
    'A room exists, but its objective/rules are unclear or its intended route is blocked.',
    'The campaign is finishable, but levels repeat the same decision or story has no gameplay consequence.',
    'Tutorial and three stages teach/escalate the defined rules and reach the original thematic ending.',
    'Observed players learn the rules through layout/feedback; changed-case routes remain coherent and the narrative is integrated rather than a lore dump.',
  ] },
  { title: 'Usability and accessibility', weight: 10, levels: [
    'Essential play or menus cannot be operated reliably.',
    'Important actions rely on one fixed input, color, sound or a sustained hold.',
    'Basic settings exist but fail to persist or leave essential barriers.',
    'Remapping, same-input menus, captions/cues, text sizing, saved settings and toggle alternatives pass.',
    'Actual consented accessibility/usability feedback produces verified changes; remaining untested needs are documented honestly.',
  ] },
  { title: 'Art, animation and audio', weight: 5, levels: [
    'Presentation prevents understanding or required assets have unknown rights.',
    'Placeholder content is inconsistent or feedback routinely contradicts authority.',
    'Play is readable, but required states or audio controls are missing.',
    'Required silhouettes/states/cues, controlled mix and complete provenance/credits are coherent.',
    'Presentation adds clarity and atmosphere with measured cost, polished transitions and an equally usable reduced-effects/muted mode.',
  ] },
  { title: 'Tests and engineering evidence', weight: 10, levels: [
    'There is no reproducible test or the recorded evidence contradicts the claims.',
    'Only manual happy-path editor play is shown.',
    'Some automated rules and multi-process checks exist, with important acceptance gaps.',
    'Required matrix, regression defects and build/fixture/condition records are reproducible.',
    'Changed fixtures and deliberate defects demonstrate that the tests catch the intended failure, not only constants or a scripted happy path.',
  ] },
  { title: 'Measured performance', weight: 5, levels: [
    'The declared target cannot complete normal play or no performance was measured.',
    'Only an unqualified average FPS claim is supplied.',
    'Basic measurements exist but ignore spikes, network cost or target conditions.',
    'Declared frame/loading/memory/network budgets have repeatable observed evidence and no critical stalls.',
    'A measured bottleneck was improved without correctness loss, with percentile/soak and hardware limitations clearly reported.',
  ] },
  { title: 'Playable delivery and documentation', weight: 5, levels: [
    'There is no runnable exported multiplayer build.',
    'The project runs only on the author machine/editor or lacks required setup/credits.',
    'A build runs, but server/client identity, recovery or known limitations are unclear.',
    'Matching client/server packages, exact launch steps, source/build identity, credits and limitations are complete.',
    'A fresh authorized destination reproduces the documented full flow; the postmortem links every remaining gap to evidence and a bounded next step.',
  ] },
];

export const capstoneAcceptance = [
  ['BG-A01', 'Fresh delivery', 'Start the exported client and a separate matching headless authority from documented packages; reach a usable lobby without the editor or private credentials.'],
  ['BG-A02', 'Real multiplayer', 'Use two independent client processes and distinct peer IDs, then four. Shared-screen puppets are not the required multiplayer evidence.'],
  ['BG-A03', 'Readiness and capacity', 'Repeat ready/load messages, fail one load and attempt a fifth human connection. No duplicate readiness, phantom actor or unexplained overflow is accepted.'],
  ['BG-A04', 'Normal terrain transactions', 'Lift, place, hand off and bank valid tiles; after each accepted action compare the exact set of tile IDs and their single locations on authority and clients.'],
  ['BG-A05', 'Concurrent ownership', 'Two peers request the same tile in one authority tick. Exactly one wins; the loser receives a rejection and loses nothing.'],
  ['BG-A06', 'Replay and mutation', 'Repeat a sequence/payload, then reuse the sequence with different data. An exact replay is idempotent; inconsistent reuse is a protocol error, never a second mutation.'],
  ['BG-A07', 'Invalid geometry', 'Try an occupied/reserved/anchor tile, diagonal/out-of-bounds target, full hand and nonexistent ID. No partial movement or inventory change occurs.'],
  ['BG-A08', 'Cooperative cargo', 'One holder, an unready partner, an occupied destination and a missing floor all reject the whole formation step; an accepted step moves the full formation atomically.'],
  ['BG-A09', 'Authority boundaries', 'Attempt another actor ID, a spectator command, client-reported success/position and an excessive command rate in an isolated test. Server-derived identity and budgets remain authoritative.'],
  ['BG-A10', 'Gate safety', 'Close a timed gate while a player/cargo formation is on or reserved through it. Closure waits safely; no actor is crushed, teleported or duplicated.'],
  ['BG-A11', 'Client loss', 'Disconnect a cargo holder and a tile carrier separately. Pause, restore the last committed checkpoint and start a fresh epoch with no lost/duplicated terrain or archive.'],
  ['BG-A12', 'Host loss', 'Terminate the listen host/authority. Clients show session loss and a usable recovery/menu path; they do not claim continuing authoritative play or automatic migration.'],
  ['BG-A13', 'Late observation', 'Join a started level into an available human slot. Observe a complete consistent snapshot, but do not mutate until admitted at the next level/lobby boundary.'],
  ['BG-A14', 'Old messages', 'Deliver an old-epoch command/snapshot and a late scene-ready message after recall or a level change. They cannot change the new world or count readiness twice.'],
  ['BG-A15', 'Save safety', 'Try truncated, wrong-version and invalid-ID checkpoint files. Validate before replacement; preserve the prior valid file/session and expose an error.'],
  ['BG-A16', 'Tutorial route', 'Execute the exact introductory lift/handoff/bridge/cargo route in the level atlas using two actual clients, then repeat with reversed player duties.'],
  ['BG-A17', 'Complete campaign', 'Complete the tutorial and all three required stages with two players, then a four-player run. Reach the defined ending without console commands or developer intervention.'],
  ['BG-A18', 'Return the ground', 'In the finale, deliver COMMONS, bank all four portable IDs and place every active player on the destination island. Missing ground or a stranded player cannot trigger victory.'],
  ['BG-A19', 'Accessible play', 'Complete essential tasks muted, without color-only interpretation, with remapped controls, larger text, keyboard/controller menu navigation and carry-toggle alternatives.'],
  ['BG-A20', 'Network envelope', 'Record actual controlled latency/jitter/loss conditions and run the critical transaction/recovery tasks. A stubbed sequence test is useful but is not measured packet-loss or WAN evidence.'],
  ['BG-A21', 'Measured soak', 'Run a declared repeatable soak with observed frame percentiles, loading, memory, traffic and errors. Retain all failures and environment limits.'],
  ['BG-A22', 'Package and rights', 'Verify exported files, matching versions, runnable startup, controls, recovery, asset/engine notices and absent private credentials/saves on a fresh authorized destination.'],
];

export const capstoneSections: Record<string, PackSection[]> = {
  'gd-capstone-brief': [
    { heading: 'The complete target / an original working concept', paragraphs: [
      'Borrowed Ground: The Last Survey is a short, desktop, top-down 2D cooperative puzzle adventure for two to four people, made primarily with Godot 4 and GDScript. Players rebuild paths by physically borrowing limited floor tiles, then carry civic memory archives as a coordinated two-person formation. Every placed square leaves a real gap elsewhere.',
      'The required experience is a tutorial plus three authored stages, a complete lobby-to-ending loop and a separate headless server mode. Target a readable 15-25 minute experienced-team campaign, but measure actual playtime rather than claiming this estimate as a result. There is no mandatory combat, crafting economy, open world, account backend or paid service.',
      'This is an independently authored reference design, not a reskinned Godot sample, supplied game binary, executed playtest, market-novelty/trademark clearance or automatic grader. Build the actual game and compare observed evidence against this specification. Preserve its essential rules; equivalent original wording/art and justified usability refinements are welcome.',
    ], items: [] },
    { heading: 'Premise, characters and a complete story spine', paragraphs: [
      'Aster Quay is a city laid out on leased ground. At night, its Boundary Engine mistakenly classifies shared streets as unowned space and begins reclaiming them. A night-cartography crew must return three civic archives to the Public Foundry before the old map becomes permanent. Their tools cannot create land: they can only move it and account for what was borrowed.',
      'The playable crew has four equally capable cartographers with distinct silhouettes and symbols, not required gender, class powers or progression advantages. Vey, the map-room keeper, speaks through short text/radio cards. The antagonist is an erroneous ownership system, not an enemy requiring combat.',
    ], items: [
      'Opening: a street disappears from the map; Vey gives the crew a blank survey and a finite tile ledger. The first loss is shown in the environment, not only explained in lore.',
      'Tutorial: carry a training archive across a path built from three borrowed squares. Learn that the map remembers every source hole and destination tile.',
      'Stage 1 / PATHS: begin on opposite shores. Reconnect a street that neither shore can rebuild alone, then deliver the archive describing public routes.',
      'Stage 2 / NAMES: a narrow transfer island and a timed boundary gate force the crew to park cargo, reuse ground and communicate who moves next.',
      'Stage 3 / COMMONS: reach the Foundry with the last archive, then return every borrowed tile to the public reserve without leaving a cartographer behind.',
      'Ending: when the archives and conservation ledger reconcile, the engine recognizes common ground. The hub becomes one connected public square, the crew sets down its tools and a results/postmortem screen records actual deliveries, recalls and elapsed time.',
      'No branching morality system, voiced cinematics, romance, collectibles or extra chapters are mandatory. The complete thematic payoff comes from returning the ground, not from a final exposition wall.',
    ] },
    { heading: 'Original dialogue beats / adapt wording, preserve the meaning', paragraphs: [], items: [
      'Opening / Vey: "They called the ground empty because no one owned it."',
      'First lift / Vey: "Borrow a square. Leave a square missing. The map remembers both."',
      'First connected bridge: "A road is a promise made from two shores."',
      'PATHS delivery: "The streets were named for where we went, not who paid."',
      'Timed gate: "The bells count time. They do not decide who gets a turn."',
      'NAMES delivery: "Every borrowed address still belongs to somebody."',
      'Final delivery: "Bring back the records. Then bring back the ground."',
      'Ending: "Nothing was ours to keep. Everything is ours to share."',
      'All essential speech has readable, player-paced captions. Voice performance is optional, not a completion condition.',
    ] },
    { heading: 'Actions, controls and session flow', paragraphs: [
      'Use named InputMap actions. Suggested keyboard defaults are WASD/arrows for cardinal movement, E for interact/confirm, F for lift or place, Q for offer/accept handoff, C for ping, R for request recall, Tab for the survey and Escape for the local menu. These are defaults, not hardcoded rules; every essential action must be rebindable.',
      'Controller defaults use the stick/D-pad for cardinal movement and clearly labelled face/shoulder actions for interact, lift/place, handoff and ping. Show the actual mapped input in prompts rather than assuming one platform glyph. Carry readiness has a toggle alternative; gameplay must not require tightly simultaneous physical holds or voice chat.',
    ], items: [
      'Boot -> title/settings/credits -> host or join -> compatible lobby -> choose one of four readable crew symbols -> ready -> load acknowledgement -> tutorial/stage -> checkpoint/results -> next stage -> ending/results -> replay or menu.',
      'The local Escape/settings menu does not silently pause a shared world. It suppresses that player input and clearly says whether the session continues. Team recall/recovery is a separate authoritative state.',
      'A new match requires at least two active humans; the server process is not a player. Keep a maximum of four human connections, including late observers.',
      'Ping an adjacent/selected cell with an icon for help, tile, cargo or wait. Rate-limit and expire pings; retain useful text/shape cues without audio.',
      'The survey shows the board legend, current archive/dock, portable-tile count and every active crew member. It cannot grant an omniscient competitive advantage because this is cooperative.',
    ] },
    { heading: 'Exact terrain model and conservation invariant', paragraphs: [
      'The authoritative board uses integer cell coordinates, fixed floor, void, optional gate overlays and uniquely identified portable floor tiles. Characters and cargo occupy cells separately from the terrain. Visual sprites/TileMapLayer cells present this model; they are not the source of truth.',
      'Each portable tile ID has exactly one location: a board cell, one player hand, or the final-stage reserve. For a level, the union of those IDs must always equal its initial portable ID set, with no duplicates. Loading the next declared level is an explicit lifecycle transaction with a new level ID/epoch, not an accidental creation during a lift.',
    ], items: [
      'Movement is cardinal only. A single actor step requires an existing passable floor cell, no conflicting actor/cargo occupancy and no conflicting reservation.',
      'Lift requires an empty hand, an orthogonally adjacent portable tile and no actor, cargo or reservation on that tile. Fixed floor, docks, terminals and anchors cannot be lifted.',
      'Place requires a carried tile and an orthogonally adjacent in-bounds void cell without a portable tile, actor, cargo or reservation. A closed gate blocks movement, not the ability to prepare floor beneath its overlay.',
      'Handoff requires adjacent players, an explicit offer/accept pair for that tile and an empty recipient hand. The authority transfers the same ID atomically; neither client invents a copy.',
      'One actor can carry one portable tile or participate in cargo, not both. There is no stacking tiles onto existing floor and no hidden inventory expansion.',
      'A rejected action returns a reason and changes no tile, hand, score, position or cargo state. Two requests for the same object cannot both succeed.',
      'Reserve banking exists in the finale at declared fixed terminals. An adjacent actor transfers its carried tile ID into the level reserve atomically. Banking is not destruction and the HUD lists the accounted-for count.',
      'Players cannot step into void. This reference has no falling/death physics or health system. A poor tile arrangement can strand a player temporarily, but team recall always offers a bounded recovery.',
    ] },
    { heading: 'Cooperative archive cargo / precise formation rules', paragraphs: [
      'An archive occupies one authoritative cell and carries a stable archive ID. To lift it, two empty-handed players stand on opposite cardinal sides. They explicitly join the same formation and toggle ready. Choose a leader through an explicit ready interaction; no role has a permanent power advantage.',
      'The two holders and cargo form three collinear cells. A leader step translates all three by one cardinal cell only when both holders are ready and every destination is valid. Validate the union as one transaction, allowing cells vacated by that same formation but not unrelated occupied/reserved cells. No half-step or partial crate movement is allowed.',
    ], items: [
      'The model advances at 20 authority ticks per second. A move occupies four ticks (0.2 seconds); reserve all three destination cells before the presentation starts. These are authored tuning defaults, not Godot network guarantees.',
      'Clients interpolate presentation between confirmed transitions. They cannot report a new authoritative position, shorten the cooldown or award a delivery.',
      'Rotate the formation 90degrees only on a fully passable/unoccupied 3by3 area around the cargo, excluding its own current formation. Recompute all destinations atomically. The required atlas has straight routes, so rotation is taught/tested without making the campaign depend on precision controls.',
      'Either holder can revoke ready. Finish an already accepted atomic step, then stop; a local menu does not strand half a formation.',
      'Cargo can be parked only on declared fixed docks. Both participants release; the authority checks the complete dock state before committing a checkpoint.',
      'No mandatory puzzle requires a third player to hold a switch. Every required level must be solvable by two; four players can split bridge/cargo duties.',
      'Client loss, recall and level changes clear the entire formation and reservations through the recovery transaction, not through independent client-side drops.',
    ] },
    { heading: 'Gates, docks and the game clock', paragraphs: [
      'A gate is an overlay on an otherwise ordinary cell; it does not create floor. Each required gate uses a 320-tick/16-second cycle: open ticks 0-119, warning/open ticks 120-159, closed ticks 160-319. A stage may define an offset. Shape/text countdown cues accompany color and optional sound.',
      'A gate never closes onto an actor, cargo or an accepted reservation. At the closing boundary, remain passable for that occupancy until it clears, show a pending-close cue and then close. Deliberately holding a gate is a valid cooperative tactic, not a source of damage. The server owns phase and occupancy checks.',
    ], items: [
      'Dock positions are explicit in the atlas. A parked archive, no carried portable tiles, no outstanding movement reservations and valid actor positions form a checkpointable state.',
      'The checkpoint captures the complete board, tile locations/reserve, docked archive, active-stage progress and clock phase. Validate it as a whole before replacing the previous checkpoint file.',
      'Use an accessible visual warning and optional slower practice timing. The standard benchmark uses the stated clock; a different tested difficulty is recorded as a deliberate variant, not silently reported as the standard run.',
    ] },
    { heading: 'Recall, disconnect, failure and recovery', paragraphs: [
      'Recall is a team request to restore the most recent committed dock checkpoint, not a way to create free tiles. Show its consequences and require agreement from every currently active human; observers cannot vote. Expire an unanswered ordinary vote after 15 seconds with an explicit cancellation. On agreement, authority pauses inputs, restores one validated snapshot, clears pending requests/reservations/formations, advances the epoch and sends a full resynchronization.',
      'If a client disconnects, pause immediately and perform the same whole-checkpoint recovery. Restore surviving actors at their checkpoint cells and remove the departed actor exactly once. A committed checkpoint has no hand-carried tiles or formation, so removing that actor cannot destroy an item. If fewer than two active humans remain, wait in an explicit recovery/lobby state. A newly connected observer can become active only at a deliberate lobby/next-level boundary.',
    ], items: [
      'A failed save/load preserves the last valid checkpoint and shows an actionable error. Never delete current state before the complete replacement validates.',
      'Host/authority loss ends the authoritative session. Clients show the reason and return to a usable menu. Automatic host migration is explicitly out of scope.',
      'Manual restart may load the last valid host checkpoint into a new lobby with a fresh session/epoch. It is not seamless migration and must not reuse stale peer authority.',
      'A changed roster may resume a validated checkpoint only through that new lobby. Assign distinct free fixed-floor spawn cells within Manhattan distance two of the committed dock, excluding cargo/occupied cells, ordered by distance then y then x. Validate enough safe cells for the complete roster before starting; otherwise retain recovery with an error. This explicit roster-change spawn policy does not move surviving actors during an ordinary same-roster recall.',
      'A player may decline an ordinary recall vote. A disconnected/broken session uses an explicit host recovery action, with a visible notice, rather than waiting forever for a missing vote.',
      'The game has no global lives, irreversible softlock or mandatory failure timer. Rejected actions and recalls are recorded honestly in results; failure cannot be hidden by fabricating completion.',
    ] },
    { heading: 'Required ending and explicit non-goals', paragraphs: [
      'Tutorial success means the training archive reaches its destination dock. Stages 1 and 2 deliver PATHS and NAMES. The finale first delivers COMMONS, then requires all four portable IDs in the reserve and every active cartographer on the destination island. Only that complete predicate triggers the common-square ending.',
      'The ending contains the last original story beat, a visible environment change, actual results and replay/menu controls. A game that stops at the last puzzle without an ending or usable export is unfinished.',
      'Exclude matchmaking accounts, public chat/voice, inventories spanning accounts, procedural endless levels, monetization, cross-play, rollback and cloud autoscaling from the required first release. They are separate optional specialization work, not missing hidden requirements.',
    ], items: [] },
  ],
  'gd-capstone-levels': [
    { heading: 'Atlas notation and implementation contract', paragraphs: [
      'Coordinates are integer (x,y), origin at the upper-left, x increasing right and y increasing down. Ranges are inclusive. Everything inside the stated width/height is void unless included in a fixed-floor rectangle or a portable tile cell. Docks/terminals sit on fixed floor and never replace it with a gap.',
      'Portable tiles override their initially listed floor cells as liftable terrain, not a second stacked floor layer. Actors, archives, gates and terminal overlays are separate records. Stable IDs are scoped by level. Derive colliders/visuals from this one model; a painted decorative tile is not additional walkable ground.',
      'A normal client viewport starts at 1280 by 720 with a 32 pixel logical tile. Support a 960 by 600 window and text scaling through layout/camera changes without hiding the objective. Exact art pixels are not the gameplay grading contract.',
    ], items: [] },
    { heading: 'L0 / Training ledger /11 by 7 cells', paragraphs: [
      'Fixed-floor islands: x 0-3, y 1-5 and x 7-10, y 1-5. The three-cell channel x 4-6 is void. Portable tiles: T01 at (1,1), T02 at (2,1), T03 at (3,1). Fixed docks: source (2,3), destination (8,3). TRAINING starts at source. P1 starts (1,2), P2 starts (3,2); extra training players use (0,2) and (0,4). No gates or reserve banking.',
      'The intended bridge is (4,3),(5,3),(6,3). The level teaches lifting, source holes, a deliberate handoff, an entire two-person cargo move, parking and a successful checkpoint. All source holes leave alternate paths through the island.',
    ], items: [
      'Worked step 1: P2 at (3,2) lifts T03 from (3,1), walks to (3,3) and places it at (4,3). P2 then parks at (3,4), leaving the bridge entrance clear.',
      'Step 2: P1 at (1,2) lifts T01 from (1,1), walks via (2,2),(3,2) to (3,3), and offers it to adjacent P2 at (3,4). P2 accepts; the one tile ID changes hand once.',
      'Step 3: P1 vacates to (2,2). P2 walks via (3,3) to (4,3) and places T01 at (5,3), then returns via (3,3) to (3,4). Do not leave a player blocking the narrow bridge while the next tile approaches.',
      'Step 4: P1 lifts T02 from (2,1), walks via (3,2),(3,3),(4,3) to (5,3) and places it at (6,3). P1 returns via the upper-left island route to (1,3); P2 moves to (3,3). The archive at (2,3) blocks walking through that cell.',
      'Step 5: the players form a horizontal cargo team at (1,3),(2,3),(3,3), with P2 as front/leader. Both toggle ready. Six accepted eastward formation steps move cargo center to (8,3), holders to (7,3) and (9,3).',
      'Step 6: park TRAINING on the destination dock, commit a valid checkpoint and show tutorial success. Tile IDs remain exactly T01,T02,T03 at the three bridge cells, with empty hands and no outstanding reservations.',
      'This trace is a reference/model reasoning target, not a claim that a Godot game was run. Execute and record it on your own actual exported clients for BG-A 16.',
    ] },
    { heading: 'L1 / A Street Between Us /14 by 10 cells', paragraphs: [
      'Fixed floor: x 0-4, y 1-8 and x 9-13, y 1-8. Portable left tiles T11(1,1), T12(2,1), T13(3,1); right tiles T14(10,1), T15(11,1), T16(12,1). Source dock (3,5) holds PATHS; destination dock (11,5). P1 spawns (2,4), P2 spawns (11,4), P3 if present (3,4), P4 if present (10,4). No gate.',
      'The intended four-cell bridge is x 5-8, y 5. Neither shore owns four portable tiles, so the split crew must coordinate from both sides. After reconnecting, regroup as a horizontal team around the source archive and deliver it to (11,5). Other placements are allowed if all rules and the destination condition hold.',
    ], items: [
      'Teaching goal: pings, shared planning, complementary work and the difference between tile ownership and merely seeing an object.',
      'Reference solution shape: left crew builds toward x 5/x 6 and right crew toward x 8/x 7; leave enough island paths to regroup. Cargo moves east along y 5 with holders on either side.',
      'Required reveal: PATHS shows that streets were shared routes. Commit delivery and offer the next stage; do not require collecting optional decorations.',
      'Failure recovery: the source dock checkpoint restores the initial split roster and all six original tile locations. A disconnected client cannot leave one tile duplicated between shores.',
    ] },
    { heading: 'L2 / A Minute on Loan /16 by 12 cells', paragraphs: [
      'Fixed floor: x 0-4, y 1-10, x 7-10, y 1-10 and x 13-15, y 1-10. Only three portable tiles exist: T21(1,1), T22(2,1), T23(3,1). Docks are source (2,6), transfer (8,6), destination (14,6). NAMES starts at source. Spawn two/four players at distinct left-island cells near (1,5),(3,5),(1,7),(3,7). Gate overlay (11,6) uses the standard cycle with zero offset.',
      'The first bridge uses (5,6),(6,6), the second uses (11,6),(12,6). With only three tiles, two simultaneously complete bridges are impossible. Park cargo at the transfer dock, retrieve/reuse ground and time or hold the gate safely. This is the intended new decision, not a faster version of stage 1.',
    ], items: [
      'Build the first bridge with T21/T22, carry NAMES to the transfer dock and commit a checkpoint while no one holds a portable tile.',
      'Return one cartographer across the still-complete first bridge for spare T23. Bring it to the transfer island and place it at (11,6), even if the gate is currently closed.',
      'After parking, move the rear holder off the bridge exit at (7,6), for example to (7,5). Extra players can then cross and park at (8,8),(9,8), keeping (7,6),(7,7) clear for the next arrival. Bring the whole crew onto the transfer island before dismantling the first bridge; a four-player run must not strand someone on the left.',
      'From fixed floor (7,6), lift the now-unoccupied T22 at (6,6). Carry it through the transfer island and over T23 to place it at (12,6). T21 may remain at (5,6). All three IDs are still accounted for.',
      'Regroup around cargo at (8,6), watch the gate cue and move east to dock (14,6). A holder can keep a closing gate safely occupied while the accepted formation clears.',
      'A transfer-checkpoint recall restores a valid first crossing, the transfer-docked archive and original spare position. No special-case free tile or client-only timer may bypass the puzzle.',
    ] },
    { heading: 'L3 / Common Ground /18 by 14 cells', paragraphs: [
      'Fixed floor: x 0-4, y 1-12, x 7-10, y 1-12 and x 13-17, y 1-12. Four portable IDs T31,T32,T33,T34 start at (1,1),(2,1),(3,1),(4,1). Docks are (2,7),(8,7),(15,7); COMMONS starts at source. Use distinct left spawn cells (1,6),(3,6),(1,8),(3,8). Gate overlays are (5,7) with zero offset and (12,7) with 160-tick offset. Reserve terminals are (8,3) and (15,3).',
      'Build crossings at (5,7),(6,7) and (11,7),(12,7); park at the transfer dock if useful. Deliver COMMONS to (15,7). Delivery alone is not victory: all four portable IDs must enter the shared reserve and every active player must be on the destination island x 13-17, y 1-12.',
    ], items: [
      'Reclaim a bridge from its destination side: stand on its nearest portable square, lift the farther square, step onto fixed destination floor and bank that carried ID; then lift the nearest square from fixed floor and bank it.',
      'After delivering COMMONS, return a retrieval cartographer across the still-complete second crossing to the transfer island. Bring any extra players off the left island before cutting its route. Peel the left crossing from the transfer island and bank its two IDs at the transfer terminal.',
      'Move everyone across the second crossing. Peel its farther square while standing on its nearer square, bank it on the right, then reclaim/bank the last square.',
      'The reserve spans the two declared terminals as one authoritative ledger, not unlimited player inventory. Banking is visible, uses original IDs and cannot create walkable floor.',
      'Final predicate: COMMONS delivered AND reserve IDs exactly{T31,T32,T33,T34} AND every active player in the destination rectangle AND no pending movement/formation. Then play the complete common-square ending and show actual results.',
      'Other solutions may pass. Grade invariant correctness, cooperation, teaching and complete content rather than requiring identical art or a single memorized input sequence.',
    ] },
    { heading: 'Content validation before promising a playable level', paragraphs: [
      'Check all declared cells against bounds, place every dock/terminal/spawn on fixed floor, keep portable IDs unique and verify cargo formations at pickup/destination. Walk the intended routes with two players; additional players must not make a required two-player task impossible.',
      'Test reservation conflicts, temporary stranding, recall, gate closure and the finale return path. A connectivity check alone is not a full cooperative cargo solver or an actual playtest. Record model checks, editor runs and exported multi-client observations as different evidence.',
    ], items: [] },
  ],
  'gd-capstone-network': [
    { heading: 'One authority, separate local controls', paragraphs: [
      'Use the Godot 4 high-level multiplayer API with desktop ENet/UDP. Support a listen host and a separately exported headless authority. A dedicated server has no human avatar; a listen host may have one through the same validated intent path. Do not copy a lobby sample that counts the dedicated process as a player.',
      'Only authority mutates board cells, actor logical positions, tile locations, cargo formations, gate phases, checkpoints and victory. Local clients own input mapping, menus, camera, audio preferences and visual interpolation. Presentation/animation completion cannot grant a delivery.',
      'Organize a stable RPC root, server-owned WorldState/rule service, session/lobby controller, level-data loader, actor views, local input and UI. MultiplayerSpawner/Synchronizer may help spawn/replicate views; they must not give clients critical transform/inventory authority.',
    ], items: [] },
    { heading: 'Session and readiness protocol', paragraphs: [
      'Handshake with a protocol version and declared game/content build identity. Matching a hash prevents accidental incompatibility; it is not authentication. Default development connections are loopback/trusted local tests. Public admission/identity, secure transport, relay/NAT and hosting require a separate reviewed design.',
      'Freeze the active two-to-four-player roster when a level starts. Track loaded/ready peers by unique ID sets, not a counter incremented for each repeated message. A late connection in a free human slot receives a complete snapshot as an observer, with no mutation permission until a deliberate next-level/lobby admission.',
    ], items: [
      'State machine: disconnected -> connecting -> compatible lobby -> loading -> ready -> playing -> checkpoint/recovery -> next level or results. Failure from every asynchronous boundary returns an explicit usable state.',
      'A new server session has a unique session ID. Every load/reset/recall increments an epoch; every authoritative simulation update has a monotonic tick and world revision.',
      'Maximum four human connections, including observers. Reject a fifth visibly. Bounded names may be 24characters with sanitized UI; names never establish authority.',
      'Peer loss removes its readiness exactly once. Scene-ready messages from an old epoch cannot unblock a new level.',
    ] },
    { heading: 'Command envelope and transaction ownership', paragraphs: [
      'A command contains the current session ID, epoch, monotonic per-peer sequence, an allowlisted verb and only the bounded parameters that verb requires: cardinal direction, integer cell and/or stable object ID. Derive actor identity from the actual connection/remote sender, never from a trusted player_id field. Validate types, bounds, permissions, cooldown, capacity and current state before mutation.',
      'Suggested authored limits: at most 20 intents per second per peer with burst 8, a 512-byte application command budget and fixed finite ID/name lengths. Verify the actual encoded size and engine API behavior; these are project budgets, not universal ENet packet limits. Apply a clear bounded rejection/rate policy rather than silently accepting excess work.',
    ], items: [
      'Command verbs: STEP, LIFT, PLACE, OFFER_TILE, ACCEPT_TILE, JOIN_CARGO, SET_CARGO_READY, CARGO_STEP, ROTATE_CARGO, PARK_CARGO, BANK_TILE, PING and REQUEST_RECALL. Session ready/vote messages use their own state checks.',
      'Use reliable lifecycle/control traffic separately from reliable interactions, and a distinct unreliable_ordered snapshot stream. Document channel assignment and avoid one large message blocking all interactions.',
      'Keep the last 128 receipts per peer in the current session/epoch. Exact sequence/payload replay within that window returns the cached receipt without reapplying a transaction; inconsistent reuse is a protocol error. A sequence at or below the high-water mark with no retained receipt is stale and rejects without mutation. Fresh commands must increase the high-water mark; reconnect/reset starts a new validated stream rather than replaying old intent.',
      'For two valid requests in the same authority tick, process a documented deterministic order such as receipt tick then peer ID then sequence. The second request revalidates the changed world and may reject.',
      'A receipt includes epoch, sequence, acceptance/rejection reason, authoritative tick and resulting revision. Rejection changes no game state; a client cannot convert a lost reply into assumed success.',
      'Never accept wire-provided scene paths, arbitrary Resources/Objects, file paths or outcome/score values. Spawn/load only allowlisted content IDs.',
    ] },
    { heading: 'Ticks, snapshots and interpolation', paragraphs: [
      'Keep the engine physics settings explicit. One implementation can retain 60 Hz physics and advance the discrete rule model every third physics step for 20 Hz authority updates. Send snapshots at 10 Hz as an initial project budget. Do not claim that free rigid-body simulation becomes deterministic because every peer uses the same seed.',
      'Snapshots include session/epoch, tick/revision, level/content ID, acknowledged sequences, actor logical transitions, tile locations, cargo/holders, gate phase, dock/reserve state and match state. A joining observer needs a complete baseline before applying newer revisions. Ignore stale epochs and older ordered snapshots.',
      'Render actor transitions between confirmed states with a declared buffer, initially around 100-150 ms. This trades responsiveness for smoothness; measure it. Prediction/reconciliation can be a later specialization, but clients must never become authoritative to hide latency.',
    ], items: [
      'Keep a full snapshot bounded, initially 8 KiB for these small boards; measure real encoding and traffic. If larger, reduce data/change encoding deliberately rather than fragmenting unbounded payloads.',
      'UI distinguishes a pending action from confirmed ownership. Timeouts expose uncertainty and permit resynchronization; they do not duplicate commands with new identities automatically.',
      'On a new epoch, clear interpolation/pending input, install the validated full baseline and resume only after the required load/readiness acknowledgements.',
    ] },
    { heading: 'Failure rules and delivery boundaries', paragraphs: [
      'Client loss pauses, restores the last whole checkpoint, clears formations/reservations/queues and advances epoch. Continue only with a valid active roster; if fewer than two humans remain, show the recovery/lobby state. Host loss ends the session explicitly. A manual restart is a new session, not automatic host migration.',
      'Export a headless server mode selected by the dedicated_server feature or an explicitly implemented user argument. An example launch shape is Godot --headless --path <project> -- --server --port <port>; the arguments after -- require your own program handling. Verify actual binary help/version and launch behavior, because unknown flags may be ignored.',
      'ENet desktop UDP is not the same transport as a browser WebRTC/WebSocket build. Local processes do not prove LAN/WAN reachability; LAN does not prove Internet/NAT behavior. Do not expose an unauthenticated tutorial server or change the user firewall/router as a roadmap exercise.',
    ], items: [
      'Required local qualification: one listen-host flow, one separate headless authority plus two clients, a four-human-client run, defined command/failure tests and actual exported builds.',
      'Suggested controlled envelope:150 ms round-trip latency,30 ms jitter and 1% loss, measured using an authorized local test setup. Record unsupported/unexecuted emulation instead of pretending a stub proves real network loss.',
      'Public account authentication, encrypted admission, platform matchmaking, NAT traversal/relay, abuse operations and hosting cost/security are independent advanced work before any real public service.',
    ] },
  ],
  'gd-capstone-production': [
    { heading: 'Visual identity and complete minimum asset manifest', paragraphs: [
      'Use a readable paper-atlas-at-night direction: dark ink ground/void separation, cream map labels, copper survey seals and shape-coded crew/tool marks. This is an authored target, not a requirement to copy CareerOS artwork or a particular commercial game. Equivalent original art passes if its state/readability goals are met.',
      'A 32 pixel logical tile and compact sprites keep the reference build practical. Keep editable source, export settings and asset IDs. Placeholders are allowed in the greybox; the final build must be visually coherent and every distributed asset must have known rights.',
    ], items: [
      'Environment: fixed floor, void, portable floor, source hole treatment, dock, reserve terminal, open/warning/closed gate and goal/ending-square variation.',
      'Crew: four distinct silhouettes/symbols; idle, walk, tile-carry, cargo-ready, rejected-action and recovery states. Shared animation bases are allowed; color alone is not identity.',
      'Objects: training archive plus PATHS/NAMES/COMMONS labels or emblems; carried/parked/delivered states and visible holder/ownership cues.',
      'Interface: title, host/join, lobby/ready, load/failure/recovery, HUD, survey legend, ping menu, recall vote, settings/remap, credits and final results/replay.',
      'Effects: accepted placement/connection, rejection reason, pending request, checkpoint commit, safe gate warning, archive delivery and final public-square reveal; all have reduced-effects alternatives.',
      'Asset ledger: source/author, license, permitted redistribution, required notice and actual included file for every font, image, model, sound, music/sample and add-on. Include Godot/third-party notices appropriate to the exact build.',
    ] },
    { heading: 'Audio and written content manifest', paragraphs: [
      'Provide distinct move/lift/place/handoff/cargo-ready/cargo-step/rejection/ping/gate/checkpoint/delivery/menu cues. Reuse variations responsibly instead of producing dozens of unneeded files. Separate Music, SFX and UI buses beneath Master, keep clipping under control and persist user volume/mute.',
      'One exploration loop, one coordination/transition treatment and an ending resolution are enough for the required release. Original procedural music or correctly licensed assets are valid. Source samples and derived music each need rights; a numerical metric is not proof someone heard or approved the mix.',
    ], items: [
      'Write the eight story beats, short objectives for all four levels, every transaction rejection reason, host/join/load/loss/recovery notices and a readable controls/legend screen.',
      'No essential signal is audio-only. Captions cover important speech; gate/ready/ownership states have text or shapes. Voice performance and localization beyond one well-tested language are optional.',
      'Keep dialogue player-paced and short during play. Long technical design prose belongs in the reference/credits/help, not over the puzzle.',
    ] },
    { heading: 'Scene and data ownership / a practical project shape', paragraphs: [
      'Use an entry scene that chooses client or authority startup, a session controller, a server-owned rule model, a level-data loader and separate world/local-input/UI views. Persist settings independently of checkpoint state. The authoritative model uses finite IDs and simple data, not arbitrary serialized scene objects.',
      'A compact project might group scenes for bootstrap/lobby/world/actors/UI, scripts for rules/session/replication/views, validated level data, audio/art sources, tests and export presets. This is an ownership sketch, not a demand for a large architecture framework.',
    ], items: [
      'Rules own conservation, reservations, formation/gate predicates, delivery and final win state.',
      'Session owns peer-to-actor mapping, capacity/readiness, epoch changes, disconnect and server/client lifecycle.',
      'Replication owns bounded commands/receipts/snapshots and pending/interpolation buffers; it never replaces rule validation.',
      'Views own sprite/TileMapLayer rendering, animation, camera, local prompts and audio. They react to confirmed model changes.',
      'Persistence validates a complete allowlisted versioned checkpoint before replacing state; malformed input cannot load an arbitrary resource.',
    ] },
    { heading: 'Milestones and promotion gates', paragraphs: [
      'These are evidence gates, not invented calendar promises. The suggested minutes on curriculum checkpoints describe one starting session; a polished multiplayer project needs repeated sessions and iteration. Do not estimate mastery from the sum of those labels.',
    ], items: [
      'M0 / Paper proof: explain the rulebook, walk the tutorial and each intended level route, inventory assets/risks and map required tests. Gate: no unresolved rule contradiction or inaccessible two-player requirement.',
      'M1 / Local greybox: implement the exact small board, terrain transactions, cargo and recall in a testable model. Gate: conservation and invalid-operation tests pass without presentation.',
      'M2 / Network vertical slice: two exported clients complete one archive delivery through authority; command identity, contention and disconnect work. Gate: no client-authoritative shortcut before content/art expansion.',
      'M3 / Content complete: tutorial and three stages, complete story/ending, menus/settings, communication and minimum art/audio are playable. Gate: entire campaign without developer intervention.',
      'M4 / Quality candidate: required faults, actual two/four-client flows, accessibility tasks and measured performance/soak pass or expose explicit gaps. Gate: no critical authority, conservation, recovery or unusable-export defect.',
      'M5 / Reproducible delivery: exact client/server packages, rights/credits, setup/recovery, rubric evidence and postmortem. Gate: fresh-destination repeatability and every critical acceptance predicate observed.',
    ] },
    { heading: 'Performance budget / declared targets, not measured claims', paragraphs: [
      'Choose and record a target desktop, renderer, resolution, build and test scene. Initial authored goals are a 60 FPS experience at 1280 by 720, no recurring frame stalls over 100 ms during ordinary play, a level transition under 3 seconds on the declared machine and stable memory during a 30 minute repeated-play soak. Report actual frame-time percentiles/loading/memory instead of only average FPS.',
      'Networking starts with 20 Hz rule updates,10 Hz snapshots, a bounded 8 KiB full snapshot and 20 intents/second/peer with burst 8. Measure actual encoded traffic and authority cost with four clients. These are tunable project budgets, not guarantees of any Godot version or hardware.',
      'If the declared machine cannot meet a target, retain the result, investigate its real bottleneck and justify a changed target before scoring. A browser screenshot of CareerOS is not game performance evidence.',
    ], items: [] },
    { heading: 'Required delivery package and honest exclusions', paragraphs: [], items: [
      'Playable desktop client and separate headless authority packages with matching version/content identifiers and file hashes; source project and exact engine/export-template versions.',
      'A concise runbook: trusted local startup/join, two/four-client test setup, settings/controls, failure recovery, checkpoint paths and known limitations.',
      'Automated rule/regression results, actual multi-process acceptance matrix, measured performance conditions and a short recording demonstrating cooperation plus a real recovery path.',
      'Asset/license ledger and engine/third-party notices, original editable content where distributable, self-grading worksheet and evidence-based postmortem.',
      'No private saves, credentials, signing keys, hidden debug authority shortcuts or unverified-rights assets. A PCK/ZIP resource pack without a runnable executable is not the finished delivery.',
      'No obligation to publish, spend on hosting, create an account/store listing or expose the server. Public service readiness is a separate permission/security/operations task.',
    ] },
  ],
  'gd-capstone-rubric': [
    { heading: 'How to compare your actual project', paragraphs: [
      'Use the reference rulebook, atlas, network contract and production manifest as the comparison target. Implement the game yourself, run the actual exported builds and collect evidence. This page does not execute Godot, inspect your project, award points or verify a claim automatically.',
      'Keep a worksheet with requirement/scenario, exact build, environment, observed result, artifact link, remaining defect and score rationale. Mark unrun or unavailable checks unverified. A model/paper test, an editor test, an exported local multi-client test and a real network playtest are different evidence.',
      'Score each observed category from 0 to 4 against its anchors; points equal weight * level / 4. Leave unobserved categories unscored rather than silently treating them as passed or hiding their coverage. Report score and evidence coverage together.',
    ], items: [] },
    { heading: 'Critical completion gates / no averaging these away', paragraphs: [], items: [
      'The exported game runs through a complete host/join/play/ending/replay flow without the editor or undisclosed local setup.',
      'At least two independent network clients cooperate under an actual authority; a shared screen or separately animated puppets do not satisfy multiplayer.',
      'Terrain/cargo identity and server authority survive the required normal, concurrent, duplicate and invalid-request cases.',
      'Session/checkpoint/host-loss behavior is explicit and usable; no silent lost/duplicated state, permanent recovery dead end or claimed automatic migration.',
      'Tutorial plus all three stages and the final all-ground-returned/all-players-safe predicate are implemented and observed.',
      'Required controls/communication/menus are usable and distributed source/assets/engine notices have known rights.',
      'If a gate fails or is unverified, overall result is Incomplete regardless of arithmetic score. A speculative or auto-generated claim cannot fill the evidence gap.',
    ] },
    ...capstoneRubric.map(category => ({
      heading: `${category.title} / ${category.weight} points`,
      paragraphs: [`Award ${category.weight} * observed level / 4 points. Use these category-specific anchors and cite the actual evidence.`],
      items: category.levels.map((description, index) => `Level ${index}: ${description}`),
    })),
    { heading: 'Acceptance matrix / normal, invalid and recovery evidence', paragraphs: [
      'For every scenario below, record Passed, Failed or Unverified with the exact build and observation. Do not convert a missing environment into a passing stub. Required failures must be exercised intentionally only in your own authorized local/disposable test setup.',
    ], items: capstoneAcceptance.map(([id, title, condition]) => `${id} / ${title}: ${condition}`) },
    { heading: 'Results, deviations and a useful postmortem', paragraphs: [
      'A provisional 70/100 may guide a functional-review target and 85/100 a stronger showcase target, but only after every critical gate passes and all categories have observed coverage. These are authored self-study targets, not a certification, hiring signal or independent professional assessment.',
      'Describe deliberate deviations by requirement, reason, tradeoff and evidence. Equivalent art/dialogue can be valid; removing true multiplayer, conservation, the cooperative formation or the complete ending changes the project and cannot be called the same benchmark.',
      'Finish by explaining one failed design, one actual network fault, one accessibility finding, one measured bottleneck and the next bounded improvement. Record what you can independently rebuild with changed conditions, not only what you completed by following instructions.',
    ], items: [] },
  ],
};
