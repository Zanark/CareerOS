# Discovery Atlas: game progression and presentation

This is the bounded design basis for the revised, optional character layer.
It is not a claim that gamification improves this user's career outcomes.
The [guide](GUIDE.md) explains use; the final interactive tutorial teaches it.

## What changed after the prototype

The original vector mascot's entrance, bob and blink were rejected. A level-up
must communicate a threshold crossing and a worthwhile change, not simply play
the same idle animation beside a different number. The replacement uses an
original traveler, seven authored locations, distinct equipment/relics and a
different action/reveal at every level. After viewing the pixel prototype, the
owner explicitly requested a freely rotatable minimal PS1-style **3D avatar**.
Its earned equipment is cumulative, including actual side/back geometry.
The owner's subsequent request replaces the flat backdrop with a real movable
isometric diorama: seven authored environments share the character's renderer.
An orthographic starting view, free orbit, deliberate pan and zoom make the
terrain inspectable instead of merely rotating a picture.

The collection remains derived from evidence and recall. Its seven thresholds
are 0, 1, 3, 6, 10, 16 and 24 discoveries. Cosmetic **collection EXP** displays
100 per discovery; it is a reversible unit conversion, not a second scoring
engine, spendable currency, career grade or saved XP ledger. Repeated records,
viewing and replay cannot farm it. No useful pre-existing tool is level-gated.

## Sources actually reviewed

| Source | Authority and review scope | Transfer and limit |
|---|---|---|
| [Ian Schreiber, Advancement, Progression and Pacing](https://gamebalanceconcepts.wordpress.com/2010/08/18/level-7-advancement-progression-and-pacing/) | Primary game-design teaching; read the progression, perceived difficulty, PvE rewards, level-transition and story sections | Distinguish numerical power from player skill; interleave visual, item and story changes. Its psychological generalizations are not treated as measured career benefits. |
| [Jonasson/Purho, Juice It or Lose It](https://gdcvault.com/play/1016487/Juice-It-or-Lose-It) and [the authors' demonstration](https://github.com/grapefrukt/juicy-breakout) | Original conference description and complete demo README/license reviewed; not a claim of watching the full talk or running the old Flash demo | Feedback should respond to an action. Use anticipation, threshold, transformation and aftermath, not continuous decorative movement. No demo code/assets copied. |
| [The Art of Screenshake](https://gamedesign.gg/watch/art-of-screenshake/) | Secondary catalogue for Nijman's original INDIGO 2013 talk; original recording located, not fully watched | A locator and contextual example, not primary evidence for exact timing or an instruction to add camera shake. |
| [Pokémon Sword/Shield, Game UI Database](https://www.gameuidatabase.com/gameData.php?id=30) | Four actual captured menu, party/stat, character/move and inventory screens visually inspected | Keep identity, level, resources and changed equipment legible together. These static frames do not establish the game's level-up animation timing. No sprites, layouts or footage shipped. |
| [Xbox Accessibility Guideline 117](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/117) | Complete first-party guidance reviewed | Stop/disable moving UI; keep text readable; avoid camera shake/bobbing. Applies as accessibility guidance, not Xbox certification. |
| [Silkscreen](https://github.com/googlefonts/silkscreen) | Google Fonts stylesheet and complete SIL OFL 1.1 reviewed | Self-host the unmodified display font and its license; use it for short headings/numbers, not paragraphs. |

Research limits: Stardew Valley's Skills and the Sea of Stars community Level Up
pages returned HTTP 403. The original YouTube pages yielded bootstrap HTML, not
reviewable talk content. A bounded attempt to seek database video references
timed out before frames loaded. None is claimed as watched/read evidence.
Earlier learning/motivation research informs the existing evidence and recall
boundaries; it does not validate these authored aesthetic choices.

## Presentation contract

The RPG sequence separates filling the old EXP bar, reaching the threshold,
changing level and silhouette, a level-specific scene action, and a persistent
reward summary. Multi-level arrivals traverse every crossed level rather than
discarding intermediate rewards. Source progress is already saved before any
presentation starts; finishing the animation is never a save condition.

Animations are deliberate, finite and view-only. A skip action settles all
rewards immediately. Reduced motion presents the final still/result, including
if the preference changes mid-sequence. No full-screen flashes, camera shake,
idle bobbing, autoplay audio or perpetual animation loop. The small 3D viewer
uses the existing Three.js dependency: unlit vertex-coloured geometry, no
textures/shadow maps/postprocessing, capped 384-pixel internal width and 82,944
total pixels at DPR 1. One batched mesh holds each chapter's terrain and props.
Only interaction, resize, equipment changes and a finite 650ms equipment reveal
request frames. Offscreen/hidden rendering stops; all owned resources dispose
on unmount. Camera state survives chapters and reward phases.
Reload/history initialization is silent. New discoveries produce the existing
non-focus-stealing notice; the player chooses when to view the rank-up.

Every unlocked stage can be revisited without changing the actual level.
Future artwork remains hidden in the interface; thresholds stay legible.
At the final level, the completed collection and all seven scenes remain
available. There is no prestige reset, decay or obligation to keep logging.

Automatic motion respects reduced motion; deliberate camera orbit remains
available. Explicit WebGL initialization/context-loss messages distinguish an
unavailable view from working 3D. A still fallback is labelled, not passed off
as a 3D model. Low cost is an engineering target to measure, not a promise of
zero GPU overhead on every device.

The character, terrain, equipment and pixel SVG effects/icons are original. The font's complete copyright and license
are retained in [`public/licenses/Silkscreen-OFL.txt`](../public/licenses/Silkscreen-OFL.txt)
and copied into the deployed static site; no proprietary game
artwork, paid component source or external runtime asset is used.
