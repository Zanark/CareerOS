# README media

The front page pairs the website's actual logo with a **Cormorant Garamond
Semibold** wordmark and one long capture of the real Three.js graph. A static
first frame is supplied for readers whose browser applies reduced motion to
the `<picture>` source. The application defaults are unchanged.

## Graph preset and loop

The producer uses a new, disposable browser context and a validated fictional
workspace: all twelve available missions are active, with no evidence, events
or academic profile. It never uses an existing browser profile or owner records.

| Setting | Capture value |
|---|---|
| Mission ring speeds | 60, 90, 120, 150, 180, 210, 240, 270, 300, 80, 140, 200 percent |
| Spark dots / spark lines | 40% / 20% |
| Core heartbeat | Enabled; the existing ten-second travelling mesh ripple |
| Camera auto-rotate | Off, so individual ring movement remains the focus |
| Node labels | Off for the clean showcase |
| Source / output | 44 seconds at 20 fps / 40-second infinite GIF at 15 fps |
| GIF encoding | 800px wide, fixed 128-color palette and transparent frame deltas |
| Loop join | Four-second circular cross-dissolve; no reversal or black fade |

These are presentation choices for the illustration, not evidence of completed
work. Ring speed is relative to each ring's existing distinct base velocity.
The capture removes only the canvas's explanatory corner annotation; it uses
the actual renderer, graph, camera, shaders, controls and saved-data validation.

The canonical producer is [`capture-readme-graph.mjs`](../scripts/capture-readme-graph.mjs).
Use the running loopback development preview, existing Playwright/Edge and a
local FFmpeg executable. Supply an owned artifact directory and the reviewed
font file; no new application dependency is required:

```powershell
node scripts\capture-readme-graph.mjs --output "<owned-artifact-directory>" --font "<reviewed-font.ttf>" --ffmpeg "<ffmpeg.exe>" --probe
```

The probe makes a two-second lossless source and wordmark. For the full edition,
omit `--probe` and choose a **different, empty output directory**. If only GIF
encoding failed after a completed capture, reuse that directory with
`--encode-only`; do not recapture unchanged footage. Source frames, settings
and diagnostics stay outside publishable assets. Promote only qualified final
images into `docs\images`.

## Typeface and logo

- **Logo:** the original [`careerhq-mark.svg`](../src/assets/careerhq-mark.svg)
  used by the website, not a third-party emblem.
- **Typeface:** [Cormorant Garamond](https://github.com/google/fonts/tree/main/ofl/cormorantgaramond),
  weight 600, distributed under the
  [SIL Open Font License 1.1](images/licenses/CormorantGaramond-OFL.txt).
  The raster wordmark needs no installed font or remote font request on GitHub.
- **Reviewed font:** `CormorantGaramond[wght].ttf`, Git blob
  `d992a83ce525c330fad3a19087746bcb2dc038ee`, SHA-256
  `b20b7d9626dd956b2c5e558692ad328b1f19e3275e2782db4fa07670d83f35e0`.
  The producer rejects changed font bytes rather than silently substituting.

The previous four PNG/SVG illustrations remain historical source assets; they
are no longer embedded on the front page. Native media checks, manual visual
inspection, human design approval and publication are separate evidence.
