import type { PackSection, RoadmapPack } from '../roadmapPacks/types';
import { gameOutline } from './outline';
import { capstoneAcceptance, capstoneRubric, capstoneSections } from './capstone';

type Study = {
  model: string;
  example: string;
  pitfall: string;
  transfer: string;
  check: string;
  code?: string;
};

const study: Record<string, Study> = {
  'gd-01': {
    model: 'A program is a set of instructions; a running process is one execution of it. A folder organizes files, and a file extension suggests a format rather than proving its contents. Your Godot source project contains scripts, scenes and source assets. Imported caches can be rebuilt. A playable export packages the runtime and game data for a target platform. Learn these boundaries before collecting tools.',
    example: 'Create a practice folder with a notes.txt file and empty scenes/art folders. Write one line in the note, close it, locate it in the file manager and reopen it. You do not need Godot yet: the next lesson creates a real project.godot through the installed editor. That future editable project, its generated import cache and its playable export answer different needs.',
    pitfall: 'Renaming an image to a script extension does not convert it. An export is not a substitute for keeping editable source and asset originals.',
    transfer: 'Move a copy of the practice folder and note to a new location. Reopen the copy, edit it and explain why it is now separate from the original.',
    check: 'You can find, reopen and describe the real files without relying on a Recent files shortcut or pretending an engine project already exists.',
  },
  'gd-02': {
    model: 'Use the standard GDScript edition of a stable Godot 4 release as the primary tool. The renderer is the graphics path; export templates are platform runtimes used to produce playable packages. Editor and template versions must match deliberately. Additional languages, SDKs and plugins are choices, not prerequisites for printing a value or moving a rectangle.',
    example: 'Record the actual editor version, operating system and selected renderer in a small project note. Create an empty 2D scene, save it as the main scene, run and stop it. If the graphics path fails, investigate its documented hardware requirements or a compatible renderer instead of randomly installing add-ons.',
    pitfall: 'The current documentation label does not prove which version is installed. Downloading a resource pack does not create a runnable export.',
    transfer: 'Explain what changes when the editor opens a project but export reports a missing matching template. Write the narrow fix rather than reinstalling everything.',
    check: 'The documented toolchain corresponds to an actual run, and an unavailable feature has an explicit diagnosis rather than a claimed success.',
  },
  'gd-03': {
    model: 'A terminal runs commands in a working directory. Arguments are data to the command, and spaces/quoting matter. Git records selected source snapshots and their differences. It does not automatically publish a repository, upload a private project or preserve uncommitted changes elsewhere. Keep generated caches and credentials out of tracked source.',
    example: 'In a disposable practice repository, run the project, inspect Git status, change one scene property and inspect the diff. Make one meaningful local checkpoint, change the property again and restore only that practice file after checking what would be lost. Keep your real projects out of destructive experiments.',
    pitfall: 'A command copied into the wrong directory can modify the wrong files. A clean Git status is not proof of an off-machine backup or permission to push.',
    transfer: 'Recreate the same small project from its tracked source in a separate temporary directory, including documented setup and a safe missing-tool error.',
    check: 'Another reader can distinguish running, testing, local versioning and public publication from your instructions.',
  },
  'gd-04': {
    model: 'Think of a game as state plus rules plus player input plus feedback. State records what is true now; rules decide which changes are legal; input expresses an intention; presentation tells the player what happened. A goal and a reason to choose one action over another make the loop more than a moving picture.',
    example: 'On paper, put a courier, a parcel, two gaps and three floor tokens on a small board. Decide what counts as a move, when a parcel can be collected and how to restart. Try changing carrying capacity from one to two. The interesting observation is how the route decisions change, not whether the token looks attractive.',
    pitfall: 'A long backstory or many features cannot rescue a loop whose actions have no understandable consequences.',
    transfer: 'Give the paper rules to a willing tester, or label a self-role-play honestly. Observe one ambiguous rule and rewrite it before adding art.',
    check: 'A complete start/action/consequence/goal/restart cycle is playable from the rules alone.',
  },
  'gd-05': {
    model: 'Debugging starts with a prediction and a concrete observation. Narrow the first place they differ. A syntax error, runtime error and wrong result are different failures; inspect the actual message, relevant variables and smallest reproducible input. Change one hypothesis at a time and preserve a case that proves the defect.',
    example: 'Attach this small script to a root Node and run that scene; Godot calls _ready once when it is ready. Predict one Output message. First duplicate the print line and explain the two observations, then remove a closing quote, read the actual parse error and restore it. The callback is a starting template; functions and the full node lifecycle are explained in later lessons.',
    pitfall: 'Suppressing the error message or returning a default success can make a broken game harder to diagnose.',
    transfer: 'Introduce a different harmless defect into the practice scene, predict its observation and produce a minimal reproduction before correcting it.',
    check: 'Your explanation identifies the cause, demonstrates the corrected case and still exposes a new failure visibly.',
    code: 'extends Node\n\nfunc _ready() -> void:\n    print("practice ready")',
  },
  'gd-06': {
    model: 'A variable names a value that may change. Types communicate which operations make sense: an integer count, fractional duration, text label and true/false flag are not interchangeable. An expression computes a value; assignment stores it, while comparison asks a question. GDScript has its own syntax and semantics even when indentation resembles Python.',
    example: 'A courier starts with three tiles and spends two. Predict remaining count and whether a further two-tile action is affordable. Repeat at zero and at the exact cost. Print named values rather than an unexplained stream of numbers. Use a float for seconds and an integer for tile identity/count.',
    pitfall: 'A variable called seconds containing milliseconds creates a unit bug that a plausible number can hide.',
    transfer: 'Change the action cost and add a fractional elapsed time. Explain every resulting type and boundary before running it.',
    check: 'Predictions match the observed values, and invalid or insufficient resources do not silently become successful purchases.',
    code: 'extends Node\n\nfunc _ready() -> void:\n    var tiles: int = 3\n    var cost: int = 2\n    var seconds: float = 0.25\n    var can_pay: bool = tiles >= cost\n    print("remaining: ", tiles - cost)\n    print("can pay: ", can_pay)\n    print("seconds: ", seconds)',
  },
  'gd-07': {
    model: 'A branch selects behavior when a condition is true. A loop repeats a body while preserving an intended invariant and making progress toward termination. Counted loops are useful when the work size is known. A while loop needs a condition that can actually become false; game rules must not depend on an unbounded retry eventually getting lucky.',
    example: 'Process three delivery requests. Accept a request only when stock covers its cost, otherwise show a refusal. Trace stock after every request. For a retrying connection, count attempts and stop at a chosen limit with an explicit failure instead of freezing the scene forever.',
    pitfall: 'An off-by-one boundary can grant one extra move or fail the final valid attempt. An infinite loop blocks the main game thread.',
    transfer: 'Change the request list to include zero, an exact-cost request and an impossible request. Trace every branch and termination condition.',
    check: 'Every input is accounted for and the impossible case terminates without an invented success.',
    code: 'extends Node\n\nfunc _ready() -> void:\n    var stock: int = 4\n    for cost in [1, 3, 2]:\n        if cost <= stock:\n            stock -= cost\n            print("accepted")\n        else:\n            print("not enough stock")\n    print("stock: ", stock)',
  },
  'gd-08': {
    model: 'A function is a named contract: inputs, responsibility, output and invalid-input policy. Parameters make dependencies explicit. Local variables belong to that call, while object/global state lasts elsewhere. Small rule functions are easier to test than a large scene callback that changes many unrelated things.',
    example: 'Write can_afford with count and cost inputs. The exact-cost case should succeed and a negative cost should not create resources. A separate command applies the purchase only after the rule accepts it. This separates deciding whether an action is legal from mutating state and playing a sound.',
    pitfall: 'A function that secretly reads a different global inventory may pass one scene test and fail when reused.',
    transfer: 'Use the function for a second inventory with different values, then reject a negative cost without changing either inventory.',
    check: 'The input/output table explains normal, exact, insufficient and invalid cases without hidden dependencies.',
    code: 'extends Node\n\nfunc can_afford(count: int, cost: int) -> bool:\n    return count >= 0 and cost >= 0 and count >= cost\n\nfunc _ready() -> void:\n    print(can_afford(3, 2))\n    print(can_afford(2, 2))\n    print(can_afford(1, 2))\n    print(can_afford(3, -1))',
  },
  'gd-09': {
    model: 'An Array preserves a sequence, such as command order. A Dictionary maps a key to a value, such as tile ID to its location. Stable identity answers which entity this is; a display name answers what the player sees. Use the structure that matches the operation rather than searching every label for every action.',
    example: 'Track T01 on the board and T02 in a hand using a dictionary, with pending command IDs in an array. Rename the visible label of T01 without changing its key. Reject inserting the same ID twice. Missing T03 is not the same as an existing item with quantity zero.',
    pitfall: 'Using a player name as the unique network key breaks when names duplicate or change. Duplicating a container may not duplicate every referenced object inside it.',
    transfer: 'Process an out-of-order duplicate command and a renamed item. Preserve the chosen order and exactly one location per ID.',
    check: 'You can explain lookup/order costs and demonstrate that renaming cannot orphan ownership.',
    code: 'extends Node\n\nfunc _ready() -> void:\n    var locations: Dictionary = {"T01": "board:2,3", "T02": "hand:7"}\n    var pending: Array[int] = [10, 11]\n    if locations.has("T01"):\n        print(locations["T01"])\n    print("next command: ", pending[0])',
  },
  'gd-10': {
    model: 'An object combines related state with methods that operate on it. A class describes a kind of object; instances hold their own runtime state. Composition assembles smaller responsibilities, while inheritance shares a meaningful base contract. Shared configuration and independent mutable instance data must not be confused.',
    example: 'Two switches use the same visual/configuration definition but keep separate pressed flags. Pressing one should report its own event, not change the other. A door can depend on a small switch interface without inheriting from every possible switch variant.',
    pitfall: 'A shared mutable Resource used as every actor inventory can make one pickup appear in all inventories.',
    transfer: 'Instantiate a second differently configured switch in another scene and prove its state remains independent.',
    check: 'The artifact identifies who owns each mutable value and why removing one instance does not corrupt another.',
  },
  'gd-11': {
    model: 'A test supplies a controlled input and checks an observable outcome. Pure rule tests are fast and independent of drawing. Integration tests cross real boundaries, such as input to persistence or client to authority. Keep fixtures small and make the test process signal failure. Debug assertions alone may not execute in release builds.',
    example: 'Test that a two-tile purchase from three leaves one, an exact purchase leaves zero and an invalid purchase preserves the old count. Deliberately change the subtraction into addition and verify the runner fails. A scene animation appearing once would not catch that arithmetic defect reliably.',
    pitfall: 'A test that only repeats a constant or never fails its process can report a green run while the intended rule is broken.',
    transfer: 'Add a changed input and a deliberately broken rule. Record the command, actual failure exit and successful correction on the pinned engine/build.',
    check: 'Your runner catches the actual defect and does not rely on an untested assertion configuration.',
  },
  'gd-12': {
    model: 'A coordinate is meaningful relative to an origin and axes. Godot 2D commonly uses positive y downward. A child local position is relative to its parent, while a global position describes the composed world transform. A board cell and a pixel position are different units even if both use two numbers.',
    example: 'With32 pixel cells, cell (3,2) has a chosen center offset plus three tile widths right and two down. Moving the world parent changes the rendered/global location but not the logical cell. Write that mapping explicitly so camera movement cannot accidentally alter the board state.',
    pitfall: 'Subtracting a screen-space mouse position from a world-space actor position produces a plausible but wrong direction after the camera moves.',
    transfer: 'Translate and rotate a parent, then predict the logical cell, local position and global position separately.',
    check: 'Each number has a space/unit, and the same logical action remains valid after a presentation-only camera change.',
  },
  'gd-13': {
    model: 'A vector carries direction and magnitude. Subtract positions to obtain an offset; its length is distance and a normalized nonzero offset is direction. Summing raw cardinal inputs makes a diagonal longer, so choose whether movement is cardinal or normalized eight-direction explicitly. A zero direction means no movement.',
    example: 'A raw input (1,1) has length greater than (1,0). Multiplying both by the same speed makes diagonal travel faster. Normalize when the design wants equal directional speed. For the discrete capstone, instead select one cardinal step and validate its destination; do not smuggle a diagonal into the grid.',
    pitfall: 'Normalizing a position is not the same as finding a direction toward a target. Always define the source and target spaces.',
    transfer: 'Move the target onto the actor, then test a distant diagonal target and explain the zero case and speed policy.',
    check: 'Your measured/predicted movement agrees with the declared units and design, including no-input behavior.',
    code: 'extends Node\n\nfunc _ready() -> void:\n    var origin: Vector2 = Vector2(10, 20)\n    var target: Vector2 = Vector2(40, 60)\n    var offset: Vector2 = target - origin\n    var direction: Vector2 = offset.normalized()\n    print("distance: ", offset.length())\n    print("direction: ", direction)',
  },
  'gd-14': {
    model: 'Angles describe orientation; radians are common in engine APIs. Interpolation blends values between known states, while a rate describes change per unit time. These tools make movement and feedback readable, but smoothing must not become authority for whether an action actually occurred. Angle wrap needs a shortest-path policy.',
    example: 'Rotate a pointer from just below a full turn to just above zero. A naive numerical interpolation may spin almost a full circle, whereas an angle-aware approach takes the short route. For a confirmed grid step, interpolate only the displayed sprite between the old and new cells over its known duration.',
    pitfall: 'Adding a fixed visual distance each rendered frame changes speed with frame rate. Repeatedly blending toward a target without a finish rule can also leave an asymptotic tail.',
    transfer: 'Repeat a transition with different display frame rates and a target crossing the angle boundary. Explain which logical state stays unchanged.',
    check: 'The final state and duration meet the declared behavior without extra spins or an unending transition.',
  },
  'gd-15': {
    model: 'A grid replaces unrestricted positions with integer cells and explicit neighbors. This makes adjacency, occupancy and conservation easy to state. A tile is not destroyed when picked up: its unique location changes from a board cell to a hand. Count and identity invariants must hold even when an attempted action fails.',
    example: 'On a 3 by 3 board, the upper-left cell has only two in-bounds cardinal neighbors. Lift T01 into an empty hand and leave void at its old cell; then place that same ID in a valid adjacent gap. A second lift of T01 must reject rather than creating a second copy.',
    pitfall: 'Updating the hand before checking the destination can leave a tile both in inventory and on the board after an error.',
    transfer: 'Try a corner, out-of-bounds destination, occupied cell and full hand. Compare complete before/after state for every rejection.',
    check: 'Every initial tile ID exists once in exactly one allowed location after normal and failed transactions.',
  },
  'gd-16': {
    model: 'A node has a responsibility; a scene is a reusable tree of nodes that can represent an actor, menu or whole level. Instancing creates a runtime copy. Structure parent/child relationships around ownership: if deleting a parent should not delete an object, reconsider the lifetime relationship.',
    example: 'A player scene combines a character body, collision shape and sprite. The level provides its spawn configuration and connects events. Run two copies in separate small levels; neither should require a hardcoded path to a particular level root.',
    pitfall: 'A reusable scene that reaches upward through many exact names is coupled to an environment it does not own.',
    transfer: 'Instance the actor beneath a different parent and remove one copy while the other continues working.',
    check: 'The scene explains its dependencies and cleans up its own children without assuming unrelated nodes exist.',
  },
  'gd-17': {
    model: 'Initialization happens when objects enter their intended lifecycle, presentation updates at display rate and physics runs on a fixed tick. Use the correct boundary and units. Godot 4 CharacterBody move_and_slide already uses its timestep for velocity, while acceleration such as gravity is still multiplied by delta.',
    example: 'For this controller preview, attach the script to a CharacterBody2D with a CollisionShape2D and a visible child. Add move_left, move_right, move_up and move_down in Project Settings > Input Map before running it. Set velocity in pixels per second and call move_and_slide in physics processing. If gravity is present, accumulate gravity times delta into velocity. Direct position displacement instead uses velocity times delta; do not apply one recipe everywhere.',
    pitfall: 'Multiplying CharacterBody velocity by delta before move_and_slide scales time twice and makes motion incorrectly slow.',
    transfer: 'Run the same motion at two display frame rates and inspect initialization/exit events during repeated scene changes.',
    check: 'Distance and lifecycle ownership remain correct, with no duplicate timers or hidden per-frame logging flood.',
    code: 'extends CharacterBody2D\n\n@export var speed: float = 180.0\n\nfunc _physics_process(_delta: float) -> void:\n    var input_axis := Input.get_vector("move_left", "move_right", "move_up", "move_down")\n    velocity = input_axis * speed\n    move_and_slide()',
  },
  'gd-18': {
    model: 'A signal reports an event; a method asks an object to do something. Let a parent context connect child events to related systems rather than forcing each child to know the entire scene. Keep event lifetime clear so repeated loading does not accumulate duplicate reactions.',
    example: 'A switch emits activated with its own stable ID. The room connects that event to a door rule. A second room can connect the same switch to a different rule without changing the switch script. When the room exits, its owned instances and event relationships end deliberately.',
    pitfall: 'Connecting on every update or repeatedly on scene re-entry can make one button press execute several transactions.',
    transfer: 'Load/unload the room repeatedly, then press once. Show exactly one intended reaction and a still-usable independent instance.',
    check: 'The event source and owning connection are identifiable, and no global event bus is needed for a tiny local relationship.',
    code: 'extends Node\nsignal activated(switch_id: String)\n\n@export var switch_id: String = "switch-a"\n\nfunc activate() -> void:\n    activated.emit(switch_id)',
  },
  'gd-19': {
    model: 'A Resource describes reusable data such as an item definition or animation. A live actor owns mutable runtime state such as carried item and cooldown. Imported asset caches are derived from editable originals and import settings. Understand reference sharing before deciding that two instances have independent data.',
    example: 'Two item instances use one TileDefinition with an icon and label, but each runtime inventory stores its own tile ID/location. Change an inventory and verify the definition and other instance remain unchanged. Move/rename an asset through supported editor workflows and reopen the project to catch broken references.',
    pitfall: 'Mutating a shared definition as if it were per-player inventory can change every player at once.',
    transfer: 'Create a second configured item, reopen from tracked source and diagnose one missing-asset reference without copying caches as a fix.',
    check: 'Configuration, identity, live state, editable source and imported output have explicit owners.',
  },
  'gd-20': {
    model: 'Named input actions separate player intent from physical devices. UI focus determines which control receives an action; gameplay input must respect a menu or remapping screen. A debugging scene can expose actual action state and runtime node ownership before these are hidden under polished art.',
    example: 'Map move_left to a key and controller direction. Rebind the key and verify actual motion changes. Open a focused menu and press its confirm key: it should operate the menu, not also lift a tile in the world. Check the real node tree rather than only trusting the saved scene.',
    pitfall: 'A settings label saying remapped is not evidence that the game stopped reading the old hardcoded key.',
    transfer: 'Repeat with only the controller, then change focus using the keyboard. Exercise press/release and a disconnected input device.',
    check: 'Each essential action has an input path and visible result, and focus prevents unintended background actions.',
  },
  'gd-21': {
    model: 'A controller translates input into a designed motion policy. Start with immediate movement and stopping, then introduce acceleration or friction only when their effect is understood. Keep the logical collision body, visual sprite and camera responsibilities separate.',
    example: 'Move a simple rectangle around a small room using a named input vector and a declared speed. Release input, pause/open a menu and re-enter the scene. The actor should stop predictably, not keep a stale direction or receive input twice from duplicated controllers.',
    pitfall: 'Adding many smoothing parameters before testing basic movement makes a collision or input bug look like a game-feel problem.',
    transfer: 'Change room dimensions and target frame rate, then repeat wall approaches and start/stop behavior.',
    check: 'The measured behavior matches a short movement specification and uses correct velocity/time units.',
  },
  'gd-22': {
    model: 'Collision detection asks whether shapes meet; response decides what happens next. Use Area2D for sensing, static bodies for fixed obstacles, scripted character bodies for controlled movement and rigid bodies for simulated dynamics. Layers declare where an object belongs; masks declare what it checks.',
    example: 'A courier collides with walls, senses pickup areas and ignores decorative particles. Write a small layer/mask matrix and test every intended pair. A rigid box reacts to forces, while the courier uses its controller; do not drive both with the same arbitrary position assignment.',
    pitfall: 'Physics is not guaranteed deterministic across peers. A shared seed is not a complete synchronization solution.',
    transfer: 'Add an overlapping trigger and a moving prop; prove no duplicate pickup and no unintended collision pair.',
    check: 'Observed interactions match the matrix, with visible shapes and explicit event handling rather than guessed flags.',
  },
  'gd-23': {
    model: 'A camera frames the relevant world; UI controls live in an intentional screen-space layout. Viewport size, aspect ratio and scale affect what the player can read. A camera effect must not change the authoritative cell or object state.',
    example: 'Build one room with an objective at its edge and a HUD showing the goal. Resize to a smaller window and change aspect ratio. Keep the goal discoverable, text readable and menus reachable; do not simply shrink every element until it technically fits.',
    pitfall: 'A screenshot of a centered actor does not prove the far objective or an expanded menu remains visible.',
    transfer: 'Test the widest/farthest interaction and larger UI text with camera movement or zoom disabled.',
    check: 'The actual task can be completed in each declared viewport without lost controls or world/UI coordinate confusion.',
  },
  'gd-24': {
    model: 'A TileSet defines reusable tiles; TileMapLayer instances arrange them into a level. Separate decorative layers from collision and authoritative rule data. Shared tile resources aid consistency, but deleting a visual tile should not silently remove an unrelated inventory entry.',
    example: 'Create fixed ground, a portable-floor visual and decoration layers. Store the portable tile ID/location in the game model and render it into the appropriate cell. When a rule moves that ID, update visuals from the accepted result. The editor painting tools are not network authority.',
    pitfall: 'Overlapping navigation meshes do not behave like visual layers. Agent avoidance and pathfinding also solve different problems.',
    transfer: 'Reuse the TileSet in another board and remove a decorative object; verify movement and tile counts remain correct.',
    check: 'The model/render/collision responsibilities and import dependencies can each be explained and tested separately.',
  },
  'gd-25': {
    model: 'Finishing means a complete usable loop, not many partially implemented systems. A tiny arcade game still needs understandable rules, start, feedback, failure/win, retry and an executable. Use the official tutorial to learn, then change conditions independently to prove transfer.',
    example: 'Complete the official small 2D sample or an equivalent guided practice. Then build a collect-and-return variation with a different objective/obstacle rule. Add a title, end state and clean retry. Run the export without the editor and note any missing input or resource behavior.',
    pitfall: 'A project that only works after the developer sets up an editor scene is not a delivered game.',
    transfer: 'Change the pickup condition or room layout, reproduce the full exported loop and explain your code changes.',
    check: 'Another authorized tester can launch, understand, finish/fail and retry the deliberately small game.',
  },
  'gd-26': {
    model: 'A mechanic changes available actions or consequences. Feedback makes those rules legible. Test what a rule encourages: cooperation, waiting, risk, exploration or unintended repetition. Aesthetic preference and observed player behavior are different evidence.',
    example: 'Compare unlimited floor placement with a conserved three-tile supply. In the first version, players can erase the puzzle by spamming tiles; in the second, they must plan which route can be dismantled. Observe the actual decision, then make rejection and ownership feedback understandable.',
    pitfall: 'Adding a particle burst to a meaningless action does not make the decision interesting.',
    transfer: 'Change one cost/capacity rule and observe a new route or exploit without changing art and controls at the same time.',
    check: 'The experiment names the hypothesis, observation, interpretation and next change rather than reporting vague fun.',
  },
  'gd-27': {
    model: 'Scope is a contract for what the first complete version contains and deliberately excludes. A vertical slice tests the riskiest meaningful interaction through real systems. Building final art before proving a multiplayer transaction can waste the most expensive work.',
    example: 'For the capstone, the first slice is two independent clients moving one conserved tile and delivering one archive. It is not a world map, account system or character shop. Keep a must-have list tied to the benchmark and a separate optional list with explicit revisit conditions.',
    pitfall: 'Calling every exciting idea a stretch goal still creates pressure if the finish line silently depends on it.',
    transfer: 'Cut half the decorative/content budget while preserving the original mechanic, cooperation, recovery and ending.',
    check: 'The smallest deliverable still tests the project identity and every cut has an honest consequence.',
  },
  'gd-28': {
    model: 'A teaching level introduces a rule under safe conditions, asks the player to use it and combines it with an earlier rule. Readable layout and feedback can teach more effectively than constant instruction. Recovery is a design responsibility, especially when terrain can be rearranged.',
    example: 'First provide a visible gap and one portable tile. Next place tiles on two shores so neither player can finish alone. Later require parking cargo to reuse a short bridge. In each room, preserve an intended route and a clear recall path rather than relying on an invisible developer reset.',
    pitfall: 'A route that works only with three players violates a required two-player design even if the four-player demo looks good.',
    transfer: 'Reposition a spare tile and ask a new pair to find a different legal route; record confusion and softlocks separately.',
    check: 'Every room teaches a distinct decision and its objective/recovery can be understood without unexplained prerequisites.',
  },
  'gd-29': {
    model: 'Narrative is strongest when it gives meaning to the actual actions. Cooperative design creates interdependence while retaining agency and accessible communication. Write a compact game design document with rules, content, state/failure behavior and a complete ending, not only a premise.',
    example: 'In Borrowed Ground, moving land creates a debt the team must account for. Carrying an archive needs two people; returning every square makes the shared-commons ending a played action. A ping and readiness toggle let players coordinate without requiring microphones or perfectly synchronized physical holds.',
    pitfall: 'Four differently colored characters doing separate solo tasks do not automatically create meaningful cooperation.',
    transfer: 'Explain the loop and ending without quoting the story text, then show how a silent pair can complete the first shared task.',
    check: 'The story, mechanics, level progression and communication rules reinforce one coherent experience.',
  },
  'gd-30': {
    model: 'Separate rule decisions from scene presentation. A model can describe tile IDs, cells, hands and transactions without knowing sprite paths or animation state. A view renders accepted model changes; a session boundary decides who may request them. Keep interfaces small enough to test.',
    example: 'A lift rule checks adjacency, empty hand and unoccupied portable terrain, then returns a new valid state/result. Only after acceptance does the sprite animate carrying. Run the same rule with no rendered scene and confirm a rejection leaves every field unchanged.',
    pitfall: 'If an animation callback directly grants inventory, a skipped or repeated animation can alter game rules.',
    transfer: 'Replace the visual tile with a different asset and run the same rule tests, then add a deliberately invalid request.',
    check: 'Correctness does not depend on frame rate, animation completion or a particular scene hierarchy.',
  },
  'gd-31': {
    model: 'A state machine defines allowed states, transitions, guards and ownership. Match and actor states are related but distinct. A connecting client is not loaded, loaded is not ready, and a local settings menu is not permission to stop a shared world.',
    example: 'Allow lobby -> loading -> ready -> playing only when each roster member satisfies the current epoch. Reject another Start during loading. For an actor, distinguish empty hand, tile carrying and cargo participation so incompatible actions cannot overlap.',
    pitfall: 'Several independent booleans can express impossible combinations such as playing and disconnected or carrying a tile and cargo simultaneously.',
    transfer: 'Deliver a late ready message after recall and attempt a second Start while the first load is pending.',
    check: 'Every transition has a guard/result and stale events cannot reactivate an obsolete state.',
  },
  'gd-32': {
    model: 'Persist a small versioned data model and player settings separately. Decode and validate the entire replacement before changing live state. Allowlist entity/content IDs; do not load an arbitrary resource named by an untrusted file. Keep the prior valid state/file available when validation or writing fails.',
    example: 'Save a checkpoint containing level ID, tile locations and archive state. Load it into temporary data, check version, bounds, unique IDs and conservation, then commit. A truncated file shows an error while the current session remains usable. Use a settings-oriented format for volume/remapping instead of mixing them into world state.',
    pitfall: 'A tutorial that deletes current objects before parsing each line is a learning example, not the required safe replacement design.',
    transfer: 'Try a duplicate tile ID, unsupported version and interrupted write. Show what remains valid after each failure.',
    check: 'No invalid file produces a partially replaced world or a false success notification.',
  },
  'gd-33': {
    model: 'Scene lifetime determines which state, objects, callbacks and timers survive a transition. A parent should own the things that should disappear with it. Keep local input, persistent settings and shared world/session responsibilities distinct rather than using one global singleton for everything.',
    example: 'Transition between two rooms repeatedly while the session and settings remain stable. Remove each old room and verify its signals/timers no longer produce events. If loading the next room fails, retain or return to an explicit safe state instead of claiming the new level started.',
    pitfall: 'Duplicating a player controller or forgetting an old callback can make one input generate two commands after several transitions.',
    transfer: 'Run repeated enter/exit cycles, fail one resource load and disconnect during another load.',
    check: 'The actual scene/process inventory matches the intended owners and recovery remains usable.',
  },
  'gd-34': {
    model: 'Art direction chooses a small consistent language for shape, value, color, scale and feedback. It is not the number of purchased assets. Readable silhouettes and patterns distinguish gameplay roles even without color. Keep original/editable sources and a record of what you may actually redistribute.',
    example: 'Give fixed floor a solid border, portable floor a hatch mark, docks a seal and each cartographer a different symbol/silhouette. Test the board in grayscale and at the smallest target size. A borrowed free sprite still needs its actual license and required notice recorded.',
    pitfall: 'Four colors on the same tiny shape are not a complete player-identity system. A download marked free does not establish redistribution rights.',
    transfer: 'Replace one required asset with an original placeholder and preserve the same state/readability contract.',
    check: 'A player can identify roles and critical states without color alone, and every included external file has known provenance.',
  },
  'gd-35': {
    model: 'Animation turns state into a readable action over time. Keyframes, sprite frames and transitions should express an already accepted rule outcome. Keep visual state synchronized with the model, including interruption, scene re-entry and rejection. Shared animation resources need intentional reset/blending behavior.',
    example: 'An accepted lift changes the authoritative tile location, then a short lift-to-carry animation displays it. A rejected request shows a concise cue without leaving a tile sprite in the hand. Reload the scene and check that idle/carry presentation comes from current state, not the last editor preview pose.',
    pitfall: 'An animation finishing twice must not deliver the archive twice. AnimationPlayer tracks are not inventory authority.',
    transfer: 'Interrupt a visual transition with recall or a scene change and reconstruct the correct pose from the new model.',
    check: 'No visual state claims ownership or completion that the model does not hold, with coherent RESET/loop behavior.',
  },
  'gd-36': {
    model: 'An audio bus groups related sounds for routing, effects and user control. Keep Music, SFX and UI responsibilities distinct beneath Master. Manage simultaneous sound count and headroom so the mix does not clip. Amplitude, decibels and perceived loudness are related but not interchangeable fixed ratios.',
    example: 'Route placement and cargo steps to SFX, confirmation/rejection to UI and a background loop to Music. Lower Music independently and restart to verify the preference persists. Trigger several legal actions together, inspect the actual mix and listen for clipping while ensuring muted play remains understandable.',
    pitfall: 'A renamed bus may break a player reference and unexpectedly route to Master. A silent bus or numerical score is not proof of a good listening result.',
    transfer: 'Mute all sound and complete an essential warning/ready task, then re-enable a conservative mix with simultaneous cues.',
    check: 'The intended controls affect the correct sounds and no critical instruction depends on hearing alone.',
  },
  'gd-37': {
    model: 'Music supports an emotional and temporal arc rather than continuously maximizing intensity. Loops need intentional endpoints and transitions, and dynamic layers need a clear trigger/ownership policy. Keep composition, source samples and final distribution rights separate.',
    example: 'Use sparse exploration music while planning a route, a restrained coordination layer during cargo movement and a short resolution for the common-square ending. Crossfade through a controlled bus or player policy without restarting the whole soundtrack on every tiny state update.',
    pitfall: 'A long repeated loop can become tiring even when its notes are mathematically compatible. More layers can obscure the useful interaction sounds.',
    transfer: 'Remove half the musical layers, compare the actual task/listening experience and record one change grounded in observation.',
    check: 'Transitions, volume preferences and source rights are documented, with actual listening approval distinguished from automatic measurements.',
  },
  'gd-38': {
    model: 'A shader computes how geometry/fragments are drawn in parallel. It is a presentation program, not a persistent gameplay ledger. Godot shader types and processor functions have different contexts; start with a small canvas_item effect and explicit parameters. Particles also need bounded counts, lifetime and a reason to exist.',
    example: 'Highlight an adjacent valid placement cell using a uniform set from a confirmed local preview/rule result. Use a short placement puff after acceptance, not before. Turn effects down or off and retain an outline/text cue so the action is still understandable.',
    pitfall: 'A visually glowing cell does not establish that the server accepted a placement. A screen-wide effect can hide the actual puzzle or dominate frame cost.',
    transfer: 'Disable the effect and double the visible object count on the declared hardware; compare readability and measured cost.',
    check: 'The rule remains correct independently of the shader and the effect has a usable reduced-intensity path.',
    code: 'shader_type canvas_item;\nuniform vec4 mark_color : source_color = vec4(1.0, 0.8, 0.4, 1.0);\nuniform float mark_amount : hint_range(0.0, 1.0) = 0.0;\n\nvoid fragment() {\n    vec4 base = texture(TEXTURE, UV);\n    COLOR = mix(base, vec4(mark_color.rgb, base.a), mark_amount);\n}',
  },
  'gd-39': {
    model: 'Game AI can be a small understandable decision system. Separate observation, decision and action. A finite-state helper might patrol, investigate a relevant event and return when its target disappears. Machine learning or an external model is not necessary for this core competence.',
    example: 'A practice drone follows a short route, notices a nearby ping and investigates only a valid reachable cell. If the target disappears, it returns instead of moving forever toward invalid coordinates. Show state/target diagnostics in a practice view so decisions are explainable.',
    pitfall: 'An agent that sees everything or teleports to solve a problem may look active without implementing the intended perception or path rules.',
    transfer: 'Remove the target mid-route, block its path and present two competing events; explain the explicit priority and recovery.',
    check: 'Each state/action follows actual allowed information, with no-target and no-path behavior tested.',
  },
  'gd-40': {
    model: 'Pathfinding chooses a sequence of valid positions; movement follows it and avoidance handles nearby moving agents. A grid graph is useful for discrete cells; a navigation mesh suits continuous walkable areas. When terrain changes, the old route may no longer be legal. Engine navigation data also needs its documented synchronization boundary.',
    example: 'Find a route around one gap on a small board, then remove a portable tile from the route. Recompute or stop before entering the gap. Compare your hand-traced search with AStarGrid2D for a practice grid. A NavigationAgent helper does not automatically make every suggested next position valid under custom cargo rules.',
    pitfall: 'Avoidance obstacles do not necessarily alter pathfinding. A path for one actor is not automatically a legal route for a three-cell cargo formation.',
    transfer: 'Block the goal, then change the actor footprint. Explain why no path and an invalid formation route are distinct results.',
    check: 'The actual movement respects current terrain/footprint and an impossible path becomes an explicit outcome.',
  },
  'gd-41': {
    model: 'An interaction is a transaction: validate the entire intended change, commit it once and report the result. Ownership and stable IDs prevent two actors from taking the same object. Treat rejection as a first-class result with unchanged state, not an animation that later tries to repair itself.',
    example: 'P1 and P2 request T01 during one authority tick. The first accepted request moves its location from the board to one hand. The next request revalidates the changed state and rejects. If the first receipt is delayed, repeating its sequence returns the same result rather than creating another tile.',
    pitfall: 'Separately subtracting world inventory and adding a hand value can leave half a transaction applied when another check fails.',
    transfer: 'Try a handoff into a full hand and an action on a reserved cell. Compare complete before/after models for both rejected requests.',
    check: 'Normal, duplicate, concurrent and failed actions preserve every entity exactly once and expose the actual reason.',
  },
  'gd-42': {
    model: 'A random generator produces variation, but content still needs constraints and a reproducible identity. Record the algorithm/version, seed and input parameters. A seed alone does not force nondeterministic physics or all clients into the same result. Keep authored reliable levels as a baseline.',
    example: 'Generate small practice boards with a fixed tile budget. Validate bounds, connected start/goal and an explicit solvability approximation, and retain the seed of a failure. Label a simple connectivity test as weaker than a full cooperative cargo solver.',
    pitfall: 'Retrying an unconstrained generator forever hides both a performance risk and the absence of a valid fallback policy.',
    transfer: 'Change board dimensions and budget, reproduce a failing seed and show a bounded failure or declared valid fallback.',
    check: 'The report distinguishes generated, structurally valid, model-solvable and actually playtested content.',
  },
  'gd-43': {
    model: 'Menus are a real input system with layout, focus, state and persistence. Use Control/container relationships instead of hardcoded screen positions where appropriate. A player should reach every essential screen with the same device used for gameplay. Settings are local preferences, not authority to change the shared match.',
    example: 'Move from title to join form to lobby using the keyboard or controller. Cancel a failed join, open settings and remap lift. After restart, verify the new action and volume actually apply. Resize with larger text and keep confirm/back/error controls reachable.',
    pitfall: 'An offscreen focused button or a preference that saves only its label can pass a visual screenshot while failing the task.',
    transfer: 'Complete the essential menu path using a second input method and a failed network connection, without touching developer controls.',
    check: 'Focus, actual input behavior, saved preferences and explicit errors agree in the real running game.',
  },
  'gd-44': {
    model: 'Accessibility changes rules and interaction, not only colors. Avoid required voice chat, audio-only warnings, color-only roles and precise sustained/combined holds. Provide readable text, captions, remapping, same-device menus, reduced effects and saved preferences. A checklist is a useful starting point, not proof every player can use the game.',
    example: 'Replace a required two-button hold with a toggle-ready cargo state, with a clear way to revoke it. Give the gate an icon/countdown as well as color/sound. Test a complete essential task muted and with larger text instead of just inspecting the settings page.',
    pitfall: 'A toggle that silently disables the mechanic or a colorblind mode that changes only decorative backgrounds does not remove the original barrier.',
    transfer: 'Identify one actual task barrier through consented feedback or a labelled simulation, change it and retest that task.',
    check: 'Observed support and remaining untested needs are recorded honestly without claiming certification or universal usability.',
  },
  'gd-45': {
    model: 'A playtest observes someone trying a task. Separate the participant action/statement from your interpretation and solution. Avoid leading instructions that explain away the very confusion you need to see. Ask consent for recording and use only authorized notes/footage.',
    example: 'Ask a new pair to deliver the training archive without voice chat. Notice whether they discover the handoff and who controls cargo. If they cannot identify the leader, improve that cue and repeat the same task with a fresh or carefully accounted-for pair rather than only asking whether the new art looks better.',
    pitfall: 'The developer succeeding on a memorized route or a tester politely saying nice is not evidence that the onboarding works.',
    transfer: 'Write one neutral task, identify an observed failure and retest one focused change while retaining the original result.',
    check: 'The iteration log contains actual conditions, observation, uncertainty and changed behavior, not invented user approval.',
  },
  'gd-46': {
    model: 'Three-dimensional work adds depth, orientation and camera projection to the same ownership/time reasoning. Node3D transforms compose through parents; a mesh, collision shape and camera may use different local origins. Learn a simple coordinate/camera setup before building a world.',
    example: 'Place a cube above a floor and a camera looking toward it. Move/rotate the parent and predict local versus global position. Change the camera perspective without changing the rule model. A floor that appears underneath an actor in the image is not proof its collider is correctly aligned.',
    pitfall: 'Mixing world and local axes can make movement depend on an unintended parent rotation.',
    transfer: 'Reparent or rotate the test scene and explain each changed transform and unchanged logical relationship.',
    check: 'Your coordinate/camera predictions match the observed scene and no presentation transform rewrites gameplay authority.',
  },
  'gd-47': {
    model: 'A model pipeline includes editable geometry, scale/orientation, UVs/textures, materials and import settings. Lighting and renderer capabilities affect readability. Retain the source and verify the actual imported result; a successful import message is not a visual or rights audit.',
    example: 'Import a simple original or correctly licensed crate/model. Check its dimensions against a known primitive, inspect normals/material links and light it for a gameplay task. Compare a missing-texture case with a primitive substitute to isolate import from scene configuration.',
    pitfall: 'An attractive model at the wrong scale or an asset without redistribution permission is not ready for the final package.',
    transfer: 'Change an import setting and reimport a copy, then document what is editable source versus generated output.',
    check: 'The declared renderer shows the intended object at the right scale with known rights and reproducible settings.',
  },
  'gd-48': {
    model: 'A 3D controller still needs explicit input, units, fixed-step movement and ownership, but depth, slopes and camera-relative directions add new failure cases. Keep collision reliable before adding an elaborate character rig. The visual pose follows the rule state rather than supplying hidden movement authority.',
    example: 'Move a capsule across a floor and up a simple slope using CharacterBody3D, then add two visual animation states. Approach walls at angles, change camera orientation and re-enter the scene. The controller should not duplicate input or inherit an unintended transform.',
    pitfall: 'Moving the mesh instead of the collision body can make the character appear to walk through obstacles while its actual body stays behind.',
    transfer: 'Change slope/room scale and repeat the exact movement/collision specification, including correct delta use.',
    check: 'The body, visual state, camera and exported behavior agree on the tested cases.',
  },
  'gd-49': {
    model: 'Finish a small 3D microproject to prove basic transfer, but retain an achievable primary capstone. Production skill includes choosing the smallest medium that tests the intended mechanic. Turning a verified 2D network slice into an unbounded 3D world can discard the strongest evidence.',
    example: 'Build one 3D room with a collect-or-avoid objective, title, failure/success and retry. Export it and complete a fresh run. Compare its asset/camera/collision costs with the top-down capstone, then explicitly keep the capstone 2D while listing a separately scoped 3D adaptation.',
    pitfall: 'A beautiful unfinished room is not stronger delivery evidence than a small complete playable game.',
    transfer: 'Cut the 3D content to one room and one meaningful interaction while preserving the complete user loop.',
    check: 'The microproject is independently runnable and the capstone scope remains an explicit defended choice.',
  },
  'gd-50': {
    model: 'A networked game separates peers and the authority that decides important state. Latency is delay, jitter is variation and loss means messages may not arrive. Reliable transport behavior does not automatically provide low latency, secure identity, encryption or correct game rules. Choose a model before replicating every transform.',
    example: 'Draw two clients and one server owning a single shared tile. Clients request a lift and display its confirmed owner. Compare that with each client deciding independently: simultaneous requests can create contradictory inventories. Estimate messages per second and size before adding the entire world.',
    pitfall: 'Two processes on localhost do not prove Internet reachability or realistic latency. UDP/ENet alone does not provide NAT traversal or authenticated accounts.',
    transfer: 'Compare listen-host and dedicated-server failure/ownership paths and calculate a changed snapshot frequency budget.',
    check: 'The architecture identifies authority, traffic, failure and trust boundaries without claiming unsupported production features.',
  },
  'gd-51': {
    model: 'Godot high-level networking uses a MultiplayerPeer and SceneTree-associated MultiplayerAPI. RPC endpoints need compatible declarations/paths and explicit authority/transfer choices. Treat remote parameters as untrusted; derive sender identity from the actual connection rather than a claimed actor field.',
    example: 'Start a local authority and two clients with one stable RPC node path. A client requests a bounded tile interaction; the server checks sender, state, target and capacity, then emits a result. Test an unknown target and another-player claim. Neither may become a world mutation.',
    pitfall: 'Adding any_peer to a function only permits a call; it does not validate the request or make client-reported state trustworthy.',
    transfer: 'Change one RPC path/signature intentionally, diagnose the actual connection/call failure, then exercise malformed and denied requests.',
    check: 'The observed authority rejects forbidden intent with a bounded outcome and still accepts a valid request.',
  },
  'gd-52': {
    model: 'A peer connection, compatible build, loaded level and ready player are different states. Use unique-ID membership sets for the current epoch so repeated messages do not count twice. Authority owns spawn/despawn and the active roster; local UI presents pending and failure states honestly.',
    example: 'Two clients join a four-slot lobby. One repeats ready three times while the other has not loaded. The match must still wait. If a level load fails, do not spawn a phantom actor or leave everyone in an unexplained loading state. A dedicated server is not one of the human ready players.',
    pitfall: 'Incrementing players_loaded for every repeated message can start a match before all distinct peers are ready.',
    transfer: 'Attempt a fifth connection, send an incompatible content version and disconnect during loading.',
    check: 'Capacity, compatibility, readiness and actual world actor counts remain consistent across the transitions.',
  },
  'gd-53': {
    model: 'Authority validates intent and owns the final state. A client view can be smooth and responsive without being allowed to decide terrain, inventory, collisions or victory. Keep the model small enough to compare exact IDs/locations, and apply each accepted transaction atomically.',
    example: 'Two clients lift T01 in the same authority tick. A documented ordering selects one request, moves T01 once and rejects the other after revalidation. Both clients converge on the same board/hand state. A direct client message saying delivered=true is not a valid command.',
    pitfall: 'Synchronizing a client-owned player transform into the server can quietly bypass the very movement rules the server is supposed to enforce.',
    transfer: 'Send an impossible cell, forged actor and duplicate pickup against an isolated test session. Record the actual authority outcomes.',
    check: 'Every gameplay-critical mutation is explainable from an accepted server-side rule and the clients agree afterward.',
  },
  'gd-54': {
    model: 'Commands need identity, sessions need epochs and snapshots need ordering. Sequence numbers distinguish a replay from a new action; an epoch distinguishes the current world from an obsolete reset/level. Interpolation displays confirmed movement smoothly, but cannot create new logical authority.',
    example: 'A lift succeeds but its reply is delayed. Resending the same sequence returns the prior receipt without another lift. After recall increments the epoch, that old command cannot take a tile in the restored world. A snapshot older than the installed ordered revision cannot rewind the client.',
    pitfall: 'Retrying every timeout with a new command ID may duplicate a completed action. A seed or timestamp alone is not a complete synchronization protocol.',
    transfer: 'Reorder snapshots, duplicate commands and deliver old-epoch input after reset; compare exact authoritative state and visible pending/confirmed cues.',
    check: 'The recorded trace explains every accepted, rejected, duplicate and ignored message with bounded buffers and traffic.',
  },
  'gd-55': {
    model: 'A dependable multiplayer loop defines peer loss, host loss, resynchronization and restart explicitly. A headless authority needs no local avatar or graphics. Recover to a complete known snapshot rather than independently dropping half a formation on several clients. Public hosting is a separate operations/security boundary.',
    example: 'Disconnect one cargo holder. Pause, restore the latest validated dock snapshot, clear queues/formations, advance epoch and resync remaining peers. If too few humans remain, show recovery/lobby. If authority disappears, clients show session loss rather than pretending they can keep authoritative play running.',
    pitfall: 'Restarting a process from a checkpoint is not automatic host migration. A tutorial listen-host lobby may incorrectly count a headless server as a player.',
    transfer: 'Run a separate headless export plus two clients, then exercise a failed load, late observer and host termination.',
    check: 'Actual process/peer roles, world invariants and recovery UI match the documented policy without public network exposure.',
  },
  'gd-56': {
    model: 'Use several test layers for different questions: pure rule invariants, scene/data boundaries and exported multi-process user tasks. Fault tests should break a specific assumption and observe the real result. A test stub helps reproduce ordering but does not establish actual packet-loss or WAN behavior.',
    example: 'Inject a deliberate duplicate-inventory defect and prove a conservation test fails. Then run two actual exported clients through host/join/lift/deliver and disconnect a holder. Keep exact build, level, seed/inputs and outcome records so the failure can be reproduced.',
    pitfall: 'A long list of green constant checks can miss the transaction boundary where state actually corrupts.',
    transfer: 'Change the fixture and repeat the earliest failing action, then demonstrate that the corrected regression still catches a reintroduced defect.',
    check: 'The evidence maps each important requirement to an observation at the right layer, including unrun conditions.',
  },
  'gd-57': {
    model: 'Performance is constrained by actual work and hardware. Separate recurring frame cost, intermittent spikes, loading, memory growth and network cost. CPU and GPU can limit different scenes. Measure a repeatable scenario, change the biggest relevant bottleneck and retest correctness and cost.',
    example: 'With four clients, record frame-time percentiles, loading and encoded traffic in the same stage. If expensive visual effects dominate GPU time, replacing a dictionary lookup will not solve the frame issue. If scene transitions leak nodes, a short average FPS sample may hide the later failure.',
    pitfall: 'An authored 60 FPS goal is not a measured result, and a single average hides stalls and degraded low-end behavior.',
    transfer: 'Disable one measured cost or change one data access pattern, then compare the same actual scenario and a repeated-play soak.',
    check: 'Conditions, before/after observations and tradeoffs are explicit, with no claim for unavailable hardware or unmeasured networks.',
  },
  'gd-58': {
    model: 'A delivery includes the executable runtime, correct resources and reproducible configuration, not just a source folder or PCK. Pin engine/templates and identify exact client/server builds. Inspect included files and distinguish supported platforms from platforms that merely have an export preset.',
    example: 'Export a desktop client and dedicated headless package. Copy them to a clean authorized destination and follow the runbook to start a local session with two clients. Remove developer-only setup assumptions and verify missing-resource/error behavior without copying private saves or credentials.',
    pitfall: 'A resource ZIP without its runtime is not necessarily a playable game; a successful editor run is not an exported multi-process test.',
    transfer: 'Rebuild from documented source/version inputs and compare identity plus actual behavior, recording platform-specific differences.',
    check: 'The actual supplied artifacts support the documented loop and contain only intended rights-cleared files.',
  },
  'gd-59': {
    model: 'Release preparation turns a private working project into a clear candidate someone else can use and evaluate. Include setup, controls, accessibility, credits, recovery and known limits. Publication, account creation and public hosting require a separate deliberate decision; they are not automatic consequences of a passing test.',
    example: 'Prepare a candidate archive with build identifiers, local startup, asset notices and the acceptance report. A portfolio entry says implemented authoritative two-client tile transactions under the tested conditions, not production-scale secure global multiplayer if that was never observed.',
    pitfall: 'A screenshot, speculative score or generated testimonial cannot stand in for actual play, rights or approval.',
    transfer: 'Have an authorized reader follow the candidate instructions on a fresh destination and revise one observed ambiguity.',
    check: 'Every consequential claim links to an artifact or explicitly states its unverified boundary.',
  },
  'gd-60': {
    model: 'The capstone integrates earlier skills into one complete project. Read the actual reference before implementing a different interpretation. Preserve the distinctive conservation rule, two-person cargo, authored progression and played ending; constrain optional ambitions through explicit scope decisions.',
    example: 'Walk the tutorial on paper, including each tile ID, source hole, handoff and formation step. Map the riskiest invalid/concurrent action to a test. Place art, music and advanced online services after the two-client vertical-slice gate so they cannot conceal an unsolved core rule.',
    pitfall: 'A convincing lore document with no legal two-player route is not implementation-ready preproduction.',
    transfer: 'Swap player duties and change one allowed tile starting position on a paper copy; explain a new legal route or a discovered contradiction.',
    check: 'The plan accounts for every critical requirement and separates original design intent, model reasoning and future actual play evidence.',
  },
  'gd-61': {
    model: 'A greybox tests the mechanic with simple shapes and exact state. Build the smallest authoritative model first: bounds, floor, portable IDs/locations, actors, cargo and transaction results. Integrate presentation only after the rule can expose valid and invalid outcomes clearly.',
    example: 'Implement the tutorial board exactly. Lift T03, hand off T01, complete the three-cell bridge and carry TRAINING through it with two holders. Before adding networking, test conservation, occupied/reserved tiles, a full hand and a blocked formation destination.',
    pitfall: 'Special-casing the worked solution or spawning an extra tile when a route is difficult defeats the benchmark invariant.',
    transfer: 'Use a different legal action order and a deliberately invalid request. Compare complete state after each transaction.',
    check: 'The model supports the general stated rules, not only one memorized trace, and rejection is atomic.',
  },
  'gd-62': {
    model: 'The vertical slice crosses actual input, network, authority, model, replication and presentation boundaries. Two processes must reach the same result through validated intent. Keep the world small while observing messages and exact entity identity; this is the point where architecture assumptions become evidence.',
    example: 'Start a local authority and two independent exported clients. Complete one tutorial archive delivery. Issue simultaneous lifts, repeat one sequence and disconnect a holder; compare resulting tile/cargo state and the recovery epoch on every peer.',
    pitfall: 'Animating a second player locally or trusting a client transform may look multiplayer while bypassing the required network contract.',
    transfer: 'Reverse the peers performing each duty, use the separate headless server mode and repeat an old-epoch command after recall.',
    check: 'Real multi-process observations support authority, consistency and recovery before further content production.',
  },
  'gd-63': {
    model: 'Once the risky slice works, produce a small coherent campaign rather than many disconnected test rooms. Implement each stage objective, teaching beat, checkpoint and original ending. Art/audio, communication and settings must describe actual state and remain usable under the declared accessibility options.',
    example: 'Stage 1 introduces the split shore, stage 2 reuses scarce ground through a transfer dock/gate and the finale asks the crew to return all borrowed ground. Add Vey dialogue and the common-square reveal only where the corresponding played events actually occur.',
    pitfall: 'A final cinematic cannot compensate for a missing ending predicate, required screen or two-player route.',
    transfer: 'Run the whole progression muted with remapped input and reduced effects, noting every place instructions or layout fail.',
    check: 'The complete original reference is present and playable without developer intervention, with known rights for distributed content.',
  },
  'gd-64': {
    model: 'A release candidate is the complete project subjected to its acceptance conditions. Record Passed, Failed and Unverified separately. Reproduce the earliest broken invariant, fix its owner and rerun affected conditions; do not lower authority/recovery requirements because the art is ready.',
    example: 'Execute the 22 scenario matrix with actual exported two/four-client flows. A late observer cannot mutate, a duplicate ready does not double-count, a lost cargo holder restores one whole checkpoint and every final-stage tile ID reaches reserve before victory.',
    pitfall: 'Testing only the best-case path or treating a simulated packet fault as measured WAN qualification creates a success-shaped gap.',
    transfer: 'Change one map/peer timing condition and repeat the important failure, then run a complete clean campaign on the corrected candidate.',
    check: 'No critical gate is failed/unverified, exact build/conditions are recorded and all remaining noncritical limitations are honest.',
  },
  'gd-65': {
    model: 'Delivery closes the loop with an actual runnable artifact and a defensible assessment. The rubric is a structured self-comparison, not an automatic grade or professional credential. High presentation scores cannot average away missing multiplayer, authority, recovery or a usable export.',
    example: 'Package matching client/server builds, source/version records, notices, runbook, tests, performance evidence and a short cooperative/failure demonstration. Give each observed category an anchor-based score and link its evidence. If a critical gate is unrun, write Incomplete rather than inventing the missing result.',
    pitfall: 'Finishing the CareerOS checklist is not proof that the game ran, a player approved it or the same understanding transfers to a new problem.',
    transfer: 'Choose the weakest observed category, propose a bounded improvement and explain how a changed-case retry would prove learning rather than repetition.',
    check: 'The build is reproducible, every critical gate is observed and the postmortem distinguishes independent competence from guided completion.',
  },
  'gd-advanced-rendering': {
    model: 'Advanced rendering is a separate specialization in geometry, materials, lighting, draw submission and GPU memory/bandwidth. Keep the measured target and renderer capabilities explicit. A more complex shader is not automatically more attractive or faster.',
    example: 'Profile a repeated decorative object field, compare instancing/batching and record GPU cost under the same camera/resolution. Preserve visual meaning and exact gameplay rules while changing presentation architecture.',
    pitfall: 'An optimization benchmark that changes scene content or hardware at the same time cannot isolate the claimed improvement.',
    transfer: 'Change object count and resolution independently, then explain which resource becomes limiting.',
    check: 'Observed before/after data and correctness support the chosen rendering change with stated hardware limits.',
  },
  'gd-advanced-character': {
    model: 'A production character pipeline includes design, modelling, topology, UVs, textures, rigging, skin weights, animation and engine integration. Each boundary can fail independently. Start with one tested character and animation contract rather than a large unqualified asset collection.',
    example: 'Import a simple rights-cleared rig, verify scale/orientation, test a locomotion blend and inspect a joint deformation. Separate a skin-weight defect from a gameplay controller defect.',
    pitfall: 'A successful file import or attractive still does not establish animation, runtime rig compatibility or redistribution rights.',
    transfer: 'Test another animation and an extreme pose, documenting actual artifacts and limitations.',
    check: 'The source-to-runtime pipeline is reproducible and the observed motion meets a declared character-use case.',
  },
  'gd-advanced-netcode': {
    model: 'Prediction, reconciliation, rollback and lag compensation solve different latency/consistency problems. Each needs a state/input history, authority policy and cost budget. Do not promise deterministic general physics or add competitive assumptions to a small cooperative prototype without evidence.',
    example: 'Build an isolated deterministic movement toy and compare confirmed-only rendering with prediction/reconciliation under controlled delay. Record corrections and fairness/cost tradeoffs before considering a real combat game.',
    pitfall: 'A shared seed does not make arbitrary Godot physics rollback-safe, and trusting the client is not prediction.',
    transfer: 'Change delay/loss and introduce a misprediction, preserving a clear server-authority outcome.',
    check: 'The experiment explains both the improvement and the failure envelope without claiming a production competitive network stack.',
  },
  'gd-advanced-online': {
    model: 'A public online service adds identity/admission, secure transport, matchmaking, relay/NAT, abuse handling, privacy, cost and operations. These responsibilities are not supplied automatically by a local ENet lobby. Choose a bounded threat/ownership model before exposing any endpoint.',
    example: 'Write a design for invited private sessions with explicit identity, expiry, server ownership, logs/retention and shutdown budget. Test local admission logic with synthetic identities, not real secrets or uncontrolled public traffic.',
    pitfall: 'Port forwarding an unauthenticated tutorial server is not a complete Internet product or safe default practice.',
    transfer: 'Compare direct hosting, a managed relay and a dedicated service, including unavailable capabilities and required approvals.',
    check: 'The artifact distinguishes reviewed design, local simulation, actual network qualification and unapproved operations.',
  },
  'gd-advanced-worlds': {
    model: 'Larger worlds add chunk ownership, streaming, generation constraints and editor tools. The player should never rely on a chunk that was unloaded without a clear handoff. Reproducibility requires versions/inputs as well as a seed.',
    example: 'Stream a small chain of validated practice chunks with a bounded memory budget. Keep persistent actor state outside disposable visual chunks and retain a reproducible invalid-layout case.',
    pitfall: 'An endless-looking generator can still create an unsolvable route, memory leak or invalid object reference.',
    transfer: 'Reverse travel direction, revisit an unloaded chunk and change the generator version explicitly.',
    check: 'State/lifetime, content validity and measured budgets remain correct through the actual streamed route.',
  },
  'gd-advanced-engine': {
    model: 'C#, native extensions, threads and data-oriented designs introduce interop, lifetime and synchronization costs. Choose them for a measured capability or bottleneck, not because they sound more professional. Keep engine/version/build boundaries explicit.',
    example: 'Isolate one expensive pure computation, measure it and compare a clear GDScript implementation with a separately scoped alternative. Preserve inputs/results and account for interop and setup costs.',
    pitfall: 'Moving scene-tree operations onto arbitrary worker threads can introduce correctness failures that a faster toy benchmark misses.',
    transfer: 'Change input size and platform/build conditions, recording actual toolchain availability and failures.',
    check: 'A real measured need and preserved behavior justify the added complexity; untested native/platform claims stay unverified.',
  },
  'gd-advanced-platforms': {
    model: 'Web, mobile, consoles and XR change rendering, input, networking, packaging, certification and physical-user constraints. An export preset is only one part of platform support. Review the current SDK/engine/platform rules and test actual authorized target hardware.',
    example: 'Scope a web adaptation and identify the change from raw ENet/UDP to an appropriate WebRTC/WebSocket design. Separately test input/audio/rendering and do not claim cross-play until compatible clients complete the real protocol.',
    pitfall: 'A desktop executable, emulated screen size or successful pack generation does not establish another platform or device is supported.',
    transfer: 'Choose one target and document its required changes, observed qualification and remaining blockers.',
    check: 'The result names exactly which platform behavior was implemented and observed without an unsupported universal claim.',
  },
  'gd-advanced-studio': {
    model: 'Studio work coordinates source, large assets, content formats, localization, builds, review and long-lived player data. Stable IDs and explicit ownership reduce accidental overwrites. Updates need compatibility/recovery and truthful communication rather than silent replacement.',
    example: 'Have two contributors work on separate scenes/data, review a controlled merge and ship a versioned test patch. Exercise a long translated string and an older checkpoint against the changed build.',
    pitfall: 'A clean merge or generated localization catalogue does not prove scene behavior, text fit or save compatibility.',
    transfer: 'Change one content schema and one UI language fixture, then reproduce the exact migration/layout failure and recovery.',
    check: 'The actual collaborative/build/content process preserves state and communicates source/version/qualification limits.',
  },
};

const commonSections: PackSection[] = [
  { heading: 'Use the route without creating a second tracker', paragraphs: [
    'Start with the first unchecked core lesson. Open its model, worked example and failure mode, attempt the practical task and then solve the changed-condition exercise. Record actual artifacts on the existing mission tracker only when you choose to activate it.',
    'World Forge starts Planned with its complete curriculum available. Browsing, reading the capstone or scoring a paper example changes no learning state. Bring the mission into focus deliberately when ready; planned does not mean the curriculum is missing.',
    'The suggested minutes are a starting-session size, not the time to master a topic or ship the full game. Expect repeated attempts and integration work. Other missions are related practice, never prerequisite completion locks.',
  ], items: [] },
  { heading: 'What completion and the benchmark mean', paragraphs: [
    'The core includes programming/math, Godot 2D/3D, design, art/audio, systems, accessibility, multiplayer and delivery. Optional advanced paths cover deeper specialties without making every studio discipline a hidden graduation requirement.',
    'The final project is the original Borrowed Ground reference game. Its complete rulebook, atlas, protocol, production manifest and rubric are separate reference units. The website supplies a target and evidence structure, not a prebuilt game or automatic Godot assessment.',
    'A saved checkbox is self-attested. Preserve actual build/test/play observations and unknowns. A tutorial result, model trace or timer does not demonstrate independent mastery or a tested exported multiplayer game.',
  ], items: [] },
  { heading: 'Versions, sources and safe practice', paragraphs: [
    'Use a pinned stable Godot 4/GDScript toolchain and matching export templates. Reviewed stable pages identified 4.7 on 2026-11-21; aliases and APIs may change. Source scopes are explicit and include partial reference reviews, not a claim that every engine API was audited.',
    'Illustrative code is inert teaching text and has not been executed by CareerOS in Godot. The early extends Node examples each replace the script on one root Node; run that scene and read Output. Keep indentation. The controller and shader examples name their different contexts. Verify every example on your pinned engine. Official sample games are practice references, not the original capstone.',
    'Use local disposable fixtures and authorized participants. No real credentials, private saves, unknown-rights assets, public-server exposure, paid services or publication are required by the core. Public Internet operation requires separate identity, security and operations work.',
  ], items: [] },
];

const pack: RoadmapPack = {
  ...gameOutline,
  commonSections,
  units: gameOutline.units.map(unit => {
    const reference = capstoneSections[unit.id];
    if (reference) return {
      ...unit, sections: reference,
      exercises: [
        { title: 'Compare real evidence', level: 'Reference', task: unit.action,
          check: 'Identify the exact requirement, actual observation, artifact and remaining gap; do not turn an unrun scenario into a pass.' },
        { title: 'Challenge the specification', level: 'Transfer',
          task: unit.id === 'gd-capstone-rubric'
            ? 'A fictional project earns 90 presentation-heavy points but has no independent network clients. Apply the critical gates and explain the honest overall result.'
            : unit.id === 'gd-capstone-levels'
              ? 'Move one portable tile in a paper copy while preserving its ID. Find a changed legal route and identify any new stranding/recovery condition.'
              : unit.id === 'gd-capstone-network'
                ? 'A command succeeds but its reply is delayed; the client resends it after a recall. Trace sequence, epoch, receipt and invariant checks.'
                : unit.id === 'gd-capstone-production'
                  ? 'Cut half the decorative budget and lose one target platform. Preserve the required game identity and state exactly what evidence no longer exists.'
                  : 'Two players request one occupied tile and then a handoff to a full hand. Explain why neither rejection may create or lose a tile.',
          check: 'Reason from the actual rule/acceptance contract and retain the distinction between a paper model and an executed game.' },
      ],
    };
    const lesson = study[unit.id];
    if (!lesson) throw new Error(`Missing World Forge study guidance: ${unit.id}`);
    return {
      ...unit,
      sections: [
        { heading: 'First-principles model', paragraphs: [lesson.model], items: [] },
        { heading: 'Worked example / practice scenario', paragraphs: [lesson.example], items: [], ...(lesson.code ? { code: lesson.code } : {}) },
        { heading: 'Failure mode to understand', paragraphs: [lesson.pitfall], items: [] },
      ],
      exercises: [
        { title: 'Build the evidence', level: 'Applied', task: unit.action, check: unit.criteria.length ? unit.criteria.join(' ') : lesson.check },
        { title: 'Change the conditions', level: 'Transfer', task: lesson.transfer, check: lesson.check },
      ],
    };
  }),
};

export { capstoneAcceptance, capstoneRubric };
export default pack;
