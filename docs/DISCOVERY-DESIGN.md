# Discovery Atlas: game progression and presentation

This is the bounded design basis for the revised, optional character layer.
It is not a claim that gamification improves this user's career outcomes.
The [guide](GUIDE.md) explains use; the final interactive tutorial teaches it.

## Current motion revision (2026-11-22)

The owner asked for a substantially more animated, inviting page. This revision
deliberately adds controllable **ambient CSS/SVG loops**, rather than repeating
the previous finite-only presentation rule.

Each real 3D chapter now has an original screen-space atmosphere: harbor
currents/motes, wind, drifting archive pages/orbits, rising bubbles, a sweeping
beacon, clouds/gusts or astral stars. These are decorative vector overlays,
not new 3D weather physics or additional saved-work signals. The camera and
terrain still move only through the existing renderer's deliberate inputs.
No new assets, animation library, textures, audio or 3D context are required.

The constellation has orbit rings, moving route dashes and gently varying
earned stars. Unowned signals stay unowned. The current waypoint has a soft
ring; the next reward floats and the work invitation catches a light sweep.
Cards arrive in a short stagger and respond to hover/keyboard focus with
lift, seal movement and a passing sheen. Text and counters remain stationary;
none of these effects creates an award or a newly earned label.

**Pause motion** is a visible keyboard-operable control. It freezes ambience,
settles entrances/reward sequences without losing rewards, and leaves manual
camera controls and all working tools available. **Play motion** resumes
ambience, not a previously settled level-up. This is a per-visit view choice,
not a new saved preference. System reduced motion stays authoritative and
changes while the page is open take effect immediately.

`motion.ts` owns the reduced-motion/document-visibility listener and small
IntersectionObserver regions. Offscreen ambience pauses; hidden documents
suspend it too. Discovery detail inspection also quiets the background;
an open native dialog freezes background decoration through a scoped CSS
rule, so recording a draft does not require cancelling it to stop movement.
Listeners/observers disconnect on unmount. The existing WebGL renderer still
has no idle requestAnimationFrame loop: visual motion comes from CSS/SVG,
which nevertheless has nonzero browser compositing/painting cost.

The pause mechanism follows the reviewed
[W3C Understanding SC 2.2.2 (Level A)](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html);
[interaction-animation guidance (Level AAA)](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html)
still informs reduced motion. Neither citation is a whole-site certification.
No camera shake, full-screen flashes, rapidly blinking counters or autoplay
sound is added. Native animation/paint and geometry checks are separate from
human aesthetic or motivational acceptance.

## Preserved progression revision (2026-11-21)

The 2026-11-21 redesign's
[six-game research and tradeoff document](ATLAS-PROGRESSION-RESEARCH.md) covers
Hades, Stardew Valley, Slay the Spire, Factorio, Celeste and Vampire Survivors,
with explicit developer/interpretation/research-access distinctions.

The original 24-discovery collection and seven authored 3D chapters remain.
The collection opens on **Discovered**, even when empty. Ordinary distinct work
now contributes to one **journey EXP** total: first checkpoint evidence 40,
first criteria-confirmed completion 80, first honest recall 40, each recorded
local day 20 and each discovery its existing 100. The thresholds remain
0/100/300/600/1,000/1,600/2,400 EXP. Existing records reconstruct this projection;
no old collection-derived character level is lost through the new formula.
Duplicates cannot farm a checkpoint award or the same day. The basic recall
award does not require reporting an independent outcome.

The selected expedition shows a real mission's current checkpoint, nearby
positions and distinct trace/finish awards. Route selection is view-only;
recording uses the existing evidence form and criteria. Planned curricula
remain planned; blockers and completed routes cannot be bypassed.
The compact constellation overview stays separate from the work invitation.

The next chapter's equipment/place are visible in a reward panel. A deliberate
**Preview reward** reuses the same viewer and clearly says **not earned**.
It cannot select a locked chapter as owned, enable its replay, add EXP or save
anything. This deliberately supersedes the earlier rule hiding all future
artwork: only the immediately next chapter is previewable, only on request.
The actual level/EXP remain visible, and **Current chapter** restores its scene.

`DiscoveryNotice` can now acknowledge a positive saved-work EXP difference
without a new collectible. Hydration stays silent; nothing takes focus or
waits for a claim. **Where your EXP comes from** exposes all five components
and five bounded recent source receipts. Real records, not another wallet,
remain authoritative through ordinary and encrypted backups.

The level-seven story no longer calls the collection complete: the character
can now reach its final form before every optional discovery. EXP can keep
reflecting records; real checkpoint expeditions continue without a prestige
reset, loss, deadline, random loot or new learning-tool gate.

## Earlier presentation iterations (2026-11-09)

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

Before the current revision, the collection remained derived from evidence and recall. Its seven thresholds
are 0, 1, 3, 6, 10, 16 and 24 discoveries. Cosmetic **collection EXP** displays
100 per discovery; it is a reversible unit conversion, not a second scoring
engine, spendable currency, career grade or saved XP ledger. Repeated records,
viewing and replay cannot farm it. No useful pre-existing tool is level-gated.

## Earlier presentation sources actually reviewed

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

Reward animations are deliberate, finite and view-only. The current ambient
layer is separately controllable as described above. A skip action settles all
rewards immediately. Reduced motion presents the final still/result, including
if the preference changes mid-sequence. No full-screen flashes, camera shake,
idle character/camera bobbing or autoplay audio. The small 3D viewer
uses the existing Three.js dependency: unlit vertex-coloured geometry, no
textures/shadow maps/postprocessing, capped 384-pixel internal width and 82,944
total pixels at DPR 1. One batched mesh holds each chapter's terrain and props.
Only interaction, resize, equipment changes and a finite 650ms equipment reveal
request frames. Offscreen/hidden rendering stops; all owned resources dispose
on unmount. Camera state survives chapters and reward phases.
Reload/history initialization is silent. Positive saved-work EXP changes can
produce a non-focus-stealing notice; the player chooses when to view the level-up.

Every unlocked stage can be revisited without changing the actual level.
Future chapters remain locked; an explicitly labelled next-reward preview
changes only the view. At the final level all seven scenes remain available,
whether or not every collection discovery is earned. There is no prestige
reset, decay or obligation to keep logging.

Automatic motion respects reduced motion; deliberate camera orbit remains
available. Explicit WebGL initialization/context-loss messages distinguish an
unavailable view from working 3D. A still fallback is labelled, not passed off
as a 3D model. Low cost is an engineering target to measure, not a promise of
zero GPU overhead on every device.

The character, terrain, equipment and pixel SVG effects/icons are original. The font's complete copyright and license
are retained in [`public/licenses/Silkscreen-OFL.txt`](../public/licenses/Silkscreen-OFL.txt)
and copied into the deployed static site; no proprietary game
artwork, paid component source or external runtime asset is used.
