# CareerOS appearance

**DeepSeaFoam** is the default dark theme. The header switch changes to **Harbor
Daylight**, its warm-paper and sea-glass light companion, with a brief sunrise or
sunset. Reduced-motion preferences suppress that animation.

## Frosted-glass material and motion

The website's material direction is **frosted glass**. New animations and
special effects must follow it: translucent layers, static background blur,
fine light-catching borders and restrained highlights. DeepSeaFoam and Harbor
Daylight remain the palette authority; frost is a material treatment, not a
replacement color scheme or a reason to shrink text.

Atlas celebration chrome uses this treatment in
[`src/discovery/frosted-glass.css`](../src/discovery/frosted-glass.css):
the console, chapter/reward cards, banner and camera controls share square-edged
translucent surfaces. Frost is independent of geometry: new cards and panels
have sharp corners, while intentional graph rings, circular nodes and icon
controls retain their shapes. The original seven chapter worlds, equipment,
pixel artwork and meaningful colors remain content, not blurred decoration.
The inverse deep-water console stays readable in either outer theme, like the
existing graph stage; collection cards follow their surrounding theme.

Blur and saturation remain static. The new finite celebration highlight moves
only transform/opacity, without a flash, bouncing text or animated blur.
Pause, system reduced motion, actual screen visibility and native-dialog draft
protection remain authoritative. Browsers without backdrop filtering receive
intentional opaque material rather than unreadable transparent text. No
additional WebGL context, idle render loop or external effect service is added.

## Appearance switch

The north-up scene uses **east on the right and west on the left**. The sun rises
from the right and sets on the left, continuing counter-clockwise over successive
days. Retargeting uses the actual current angle and the next matching phase, so
quick clicks do not restart the motion or accumulate extra revolutions.

The sun and moon share one compositor-friendly orbit with a 1.2-second easing
curve. Sky, stars and two small daytime clouds fade locally; clouds also drift
slightly. Six transform/opacity effects animate the control.
The pale-blue daytime sky, outlined yellow sun and soft daylight clouds use the
same palette lineage. Night retains the deep-water sky with clouds hidden.

The rest of the page changes through one composited opacity layer: a short
350 ms cover in the deep-water color, followed by a 1050 ms gentle reveal.
The palette switches only while fully covered, preventing a sudden light flash.
A cutout leaves the sun/cloud scene visible, and the layer does not block clicks.
Rapid requests are coalesced or queued rather than cutting a fade off abruptly.
Reduced-motion settings skip the page fade. This uses standard Web Animations,
not per-element color transitions or native snapshot transitions that block
interaction on some browsers. Tutorial exit and external preference changes
cancel any pending practice fade safely.

The local preference uses `careerhq.theme.v1`, separately from career workspace
data. Workspace export, import and reset do not include or change appearance.
Theme switches during the tutorial are temporary and do not overwrite that preference.
If preference storage is unavailable, switching still works for the current tab
and the interface explains that it could not save the choice.

## Career OS identity

CareerOS is a **career operating system**, not a general life-management operating system.
The logo is an original orbital network around a luminous ivory core,
using blue, violet, orange and rose identity hues. It replaces the earlier
interlocking-loop mark. Film-reference images are not used as application assets.

[`src/assets/careerhq-mark.svg`](../src/assets/careerhq-mark.svg) is the single
editable source for navigation, safe recovery and the favicon. Vite emits a
content-hashed asset so updated tabs and the app use the same mark. It echoes the
current graph: blue, violet and orange orbital lanes, flat glowing dots with
same-color circumference borders, a smaller rose inner orbit, and orange network connections behind an opaque
ivory core. The deep-water tile and canonical DeepSeaFoam colors stay consistent in both themes;
the surrounding wordmark follows the current theme's heading and muted roles. The logo is
static artwork, not a display of today's workspace activity; its dots have no sphere lighting.

The home graph is a real WebGL 3D scene with an original procedural core, meaningful
data orbits, sparks and luminous depth. Its stage remains deep-water in both themes.
The canvas-first layout uses a compact toolbar, a floating camera dock and bounded
on-demand panels instead of permanent filter/list stacks. Controls keep their
accessible names on small screens; graph-only sizing does not change other pages.
Bright green `#45D072` is reserved for **completed checkpoints**, including archived ones;
orange marks unfinished checkpoints. Mission hubs keep their mission hue and records
use their collection hue, even for a done daily action or past accomplishment.
Names/status labels still explain those records; notes do not award mastery.
Real connections use fine, glowing DeepSeaFoam orange
`#F34B00` strokes; hovering bends their interiors away from the cursor without detaching
their endpoints. The maximum push is 56 CSS pixels at the fitted view, tapering
with the square root of relative camera distance as you zoom in.
Nine mission ring identities use the saved roadmap's stages and checkpoint statuses.
Only active/in-focus mission rings start visible. Background/planned mission rings
start hidden and can be shown explicitly; showing them does not activate a mission.
Non-mission collections have no ring representation. Their actual record nodes keep
their own nongreen collection hues and remain available through existing pages/details.
Out-of-focus missions are isolated hubs without checkpoint clouds or connection/tether
lines. A real checkpoint completion temporarily reveals that mission's full graph for
today only, without changing its saved focus mode; unfinished evidence or recall is not
enough for this reveal. Explicit layer/item hiding still applies.
The nine mission hues match the Missions interface. Ring checkpoint ticks vary in intensity,
not by repainting the ring green. Background/planned missions retain those hues on their
rings, dots, ticks and tethers, but use smaller near-core radii and no independent animation.
Focus mode controls placement and motion, not loss of color or saved completion.
Stage marks stay together as active rings turn.
Their moving anchors remain attached to genuine hubs or selected members by
stretching membership tethers. These are derived views, excluded from work totals.
Orbit anchors are **flat glowing dots** with an even-color body and thicker same-color
circumference border (32 CSS pixels including the edge, 36 when selected). No directional
sphere lighting or planet shading remains. A mission border is bright after any saved
evidence/progress or recall result today and dim otherwise; selection does not fabricate
a worked day. The shader uses border strength 1 for worked today and 0.18 otherwise.
Saved-status packets remain small and separate.
Selection adds a brighter, thicker full-circumference glow in the ring's hue,
including when a single stage/group is selected. It follows the real ring geometry,
retains quiet-ring stillness, and respects Rings visibility and Clear center.
Full-shell projection is the default; **Clear center** masks ring paths rather
than their data anchors. **Rings** hides the orbit paths, anchors and tethers;
**Sparks** independently hides the decorative particles. Both start enabled.
**Checkpoints**, also on by default, hides tracked, archived and untracked curriculum
checkpoint nodes without hiding mission hubs, records or rings. It preserves framing
and is view-only; explicit reveal can restore this layer without enabling Sparks.
Spark dots and spark lines have independent 0-100% sliders, both defaulting to 10%.
Dot defaults are 180 desktop / 90 compact in the main view and 30 / 18 in focus.
Short decorative line defaults are 60 / 30 in the main view and 12 / 7 in focus.
The original dot maximum is unchanged; line maxima are 600 / 300 and 120 / 70.
Both percentages survive the shared Sparks visibility toggle and responsive resizing.
Spark lines are warm, soft-ended streaks, never connections between work nodes.
Neither removes real work nodes, connection glow or the actual core-node aura.
The white CareerOS center and its inner halo are opaque, so underlying connection
lines cannot show through; only the outer glow has a soft falloff.
An optional ten-second core heartbeat sends a travelling radial displacement through
the meshes from that same node. It does not draw a standalone white ring: the meshes
move gently outward and return without layout drift. The core stays fixed and opaque,
work-node status colors stay unchanged, and labels/picking follow the displayed positions.
Quiet mission rings remain fixed during the heartbeat, with tethers still attached
to the displayed work nodes.
Focus mode centers the camera on the core and removes viewport-dependent backdrop
offsets, keeping the ripple source centered behind the frosted timer.
Its graph is a fixed snapshot taken on opening. The shared local-date gate dims stale
mission activity borders after midnight in both main and focus views, even while paused,
without rebuilding the focus snapshot. The timer card uses 8px backdrop frost so the
remaining mission-only motion is visible without relying on removed collection dots.
The spacing control redistributes local node neighborhoods within a bounded composition,
with more central clearance and wider outer-ring separation. It is not a global zoom.
Each active mission ring also has a 0-300% rotation-speed control. Independent integrated
ring phases preserve position during speed changes and keep selected arcs, highlights and
membership tethers together. 100% retains its seeded rate and direction; 0% stops only
that ring. Inactive rings and globally paused/reduced-motion scenes remain still.
Streaks describe recorded local-calendar work
days, not attention, checkpoint completion or live telemetry.
Glow and sparks remain decorative; orbit motion is not evidence of a connected AI
or progress by itself. **Pause animation** is separate from camera orbit and inspection.
Reduced motion starts paused, while direct pointer/keyboard navigation remains available.
The Three.js runtime is distributed with its [MIT notice](../public/licenses/Three-MIT.txt).

## Roles and integration

`src/themes.css` loads after the existing layout stylesheet. The root contract is
`html[data-theme="dark"|"light"]`; prefixed `--dsf-*` tokens supply page, surface,
paper, reading ink, headings, controls and status colors. Layout and typography
remain in `src/styles.css`. The switch owns its decorative animation separately.

Canonical theme-role solids are copied without recoloring. Mission/collection identities
use the separate application palette below, not a claim that every added identity hue is
a canonical DeepSeaFoam token. Dark cards use the panel role;
daylight cards use paper, distinct from structural sea-glass surfaces. Hero,
north-star and guide panels deliberately remain inverse in both modes.

### The full accent palette

The neutral workspace stays deep-water / warm-paper, but teal is not the only
content color. `src/missionVisuals.ts` supplies the shared mission accents and graph
collection identities; `missionAccentStyle` supplies the same mission `--accent` to UI
components. `src/accents.css` carries those accents into visible headings,
card borders, navigation identities, daily rows and roadmap stages, including
when a workspace has zero completed checkpoints.

| Mission / operation | Identity hue |
| --- | --- |
| DSA / Pattern Forge | Blue `#268BD2` |
| System Design / System Forge | Violet `#6C71C4` |
| Job Switch / Escape Velocity | Orange `#F34B00` |
| Service Fabric / Fabric Core | Rose `#E84A5F` |
| Architecture / Blueprint | Magenta `#D33682` |
| Certifications / Credential Forge | Yellow `#EBE565` |
| AI Engineering / Neural Edge | Cyan `#28B7C9` |
| Competitive programming / Algorithm Forge | Lavender `#A989D8` |
| Freelance / Side Income | Amber `#C89459` |

| Graph collection | Identity hue |
| --- | --- |
| Daily work | Pink `#F4A6B8` |
| Saved evidence | Sky blue `#85BADB` |
| Applications | Copper `#D97938` |
| Freelance leads | Silver `#C3CCD4` |
| Past accomplishments | Orchid `#B65CBE` |
| Untracked curriculum | Slate `#829AA6` |

These stable identities do not depend on mission mode or completion. Silver/slate
collection hues do not mean a mission is in the background. Navigation, timer,
primary-action and semantic theme roles remain separate from graph identities.
Colored ink is an explicit application adaptation: mix the
identity color with the current heading ink (72% accent in dark mode, 28% in
daylight). This keeps small labels readable instead of putting raw yellow or
violet text on an unsuitable background. These derived inks and 9% paper washes
are not new canonical palette solids.

Overview counters and personal-history cards have distinct accents. Full-map
stage bands aid scanning; the actual current checkpoint still has its labeled
seafoam glow, and completed states still use the green status signal. A rose
mission border is an identity, not an error. Errors retain their explicit
messages and boundaries; color never replaces a name, status label, or icon.
Primary actions, keyboard focus and tutorial glows stay seafoam for consistency.
Print uses light paper and ink even when the on-screen theme is dark.

Implementation references: [`MISSION_COLORS` / `COLLECTION_COLORS`](../src/missionVisuals.ts#L7),
[`careerNodeColor`](../src/graph/careerGraphColors.ts#L4),
[`flatDotFragment` / `activityPresentation`](../src/graph/CareerOrbitVisuals.ts#L110),
[`shared logo`](../src/assets/careerhq-mark.svg#L38),
[`theme roles`](../src/themes.css) and [`accent presentation`](../src/accents.css).

These mappings are not a blanket accessibility certification. Check actual
composited states, keyboard operation, responsive layouts and reduced motion.

## Provenance and license

- [DeepSeaFoam](https://github.com/Zanark/DeepSeaFoam):
  [dark palette](https://github.com/Zanark/DeepSeaFoam/blob/main/palette/deepseafoam.json),
  [Harbor Daylight palette](https://github.com/Zanark/DeepSeaFoam/blob/main/palette/harbor-daylight.json)
  and [light-role safeguards](https://github.com/Zanark/DeepSeaFoam/blob/main/docs/HARBOR-DAYLIGHT.md).
- Origin: [SpriteCanvas](https://github.com/Zanark/SpriteCanvas).
- Palette lineage: [Ethan Schoonover's Solarized](https://ethanschoonover.com/solarized/).
  Harbor Daylight is a companion, not an inversion or a Solarized Light import.
- The upstream [MIT notice](https://github.com/Zanark/DeepSeaFoam/blob/main/licenses/MIT.txt)
  is copied to [`public/licenses/DeepSeaFoam-MIT.txt`](../public/licenses/DeepSeaFoam-MIT.txt).

Everything needed at runtime is bundled in CareerOS. No sibling checkout,
external fonts, images, music, network theme service or private source-document
assets are required. Theme integration does not establish GitHub Pages
deployment; repository Pages configuration remains a separate owner action.
