# Basalt Column Wall Generator

Interactive HTML/Canvas procedural texture generator for basalt columnar jointing,
designed as a printable game mat background for the Mongoose Traveller 2e scenario
**Cold Trail in Kethara's Reach** (Lakamsal, Imperial Year 1117).

## Quick Start

Open `index.html` in any modern browser. No build step, no server required.

## File Structure

```
basalt-wall/
├── index.html          — Controls and canvas layout
├── css/
│   └── style.css       — All layout and control styling
├── js/
│   ├── geometry.js     — Seeded PRNG, unit conversions, seam grid construction
│   ├── render.js       — Texture fill, grid overlay, TSU-9 port overlay, render loop
│   └── actions.js      — DOM wiring, parameter reading, scheduling, PNG download
└── README.md           — This file
```

**JS load order** (enforced in index.html): `geometry.js` → `render.js` → `actions.js`

---

## Controls

| Control | Description |
|---|---|
| Canvas W / H (m) | Wall dimensions in game meters. Default 36m × 45m = 24" × 30" print. |
| Print DPI | Output resolution. 100 DPI default (2400×3000px). Use 150–200 for final print. |
| Column (m) | Width of each basalt column in game meters. |
| Contrast | Brightness gap between lit and shadow columns. 0% = flat overcast, 100% = harsh. |
| Day / Night | Overall brightness and colour tint. Day = warm grey, Night = cool blue-grey. |
| XY roughness | How much the column edges deviate from straight vertical lines. |
| Texture | Density of mineral specks, scratches, and fracture lines per face. |
| Print grid | Overlay a dashed grid at 1 inch = 1.5 game meters. |
| Grid colour | Colour picker for the print grid lines. |
| Grid width | Line weight of the print grid. |
| TSU-9 ports | Overlay the 49 bore holes from the Cold Trail scenario (Appendix F). |
| Debug | Yellow dashed seam lines, column labels (lit/shd). |

---

## Scale

```
1 print inch = 1.5 game meters
1 game meter = DPI / 1.5 pixels

Default: 36m × 45m canvas at 100 DPI
  → 2400 × 3000 pixels
  → 24" × 30" printed output
  → 24 × 30 grid squares (each 1" × 1" = 1.5m × 1.5m in game)
```

---

## Version History

### v1.35 — Variable ground line, foreground column clusters, hex top caps
- Ground is raised 1.5 m from canvas bottom with controllable undulation variance (0–1.0 m).
- Foreground column clusters rendered in front of the main wall, offset from the background grid.
- Cluster widths in complete hex pairs (3–5 or 5–10 hex columns); heights randomised at 30–82%.
- Foreshortened hex top caps on each foreground column with basalt texture and view-angle skew.
- Render sequence formalised: background wall → foreground clusters → light wash → ports → grid → debug.
- Grid crosshairs now include all four canvas edges.
- Fixed SVY scope bug in drawPorts; fixed ctx state leaks between port/grid layers.

### v1.34 — Port font size control
- Added Port font slider (4–40px, default 10px). Controls all port text: port numbers, BIO/VEG labels, zone labels.
- BIO/VEG labels remain 10% larger than the base port font.

### v1.33 — Grain angle control with per-face jitter
- Added Grain angle slider (0°–180°). Default 90° = vertical grain (basalt columns run vertically).
- All grain elements rotate together: banding strips, scratch lines, fracture lines, speck elongation.
- Per-face seeded jitter ±5° applied on top of base angle for natural variation.
- Grain direction uses unit vector math so banding parallelograms tile correctly at any angle.

### v1.32 — TSU-9 ports visible by default
- Ports checkbox enabled at startup.

### v1.31 — View angle controls lit:dark column width ratio
- Added View angle slider (−59° to +59°). At 0° lit and dark columns are equal width (50:50).
- Ratio derived from cos(30°±θ) hexagonal prism projection via `viewAngleToRatio()` in geometry.js.
- `buildSeams()` now takes `litRatio` and alternates column widths accordingly.
- Info bar shows current lit:shd ratio (e.g. `lit:shd 53:47`).
- Specks per face scale proportionally to actual face width.

### v1.30 — Grid on by default, colour #dedede
- Print grid checkbox enabled at startup.
- Default grid colour changed from red #ff5050 to light grey #dedede (rgb 222,222,222).

### v1.29 — Title/info header row
- Added dedicated header bar above controls showing:
  `Basalt Wall v1.29 | 2400x3000px | 24.0x30.0" print | col=40px (0.6m)`
- App title and info update live as controls change.

### v1.28 — All controls in single top row
- Merged two control rows into one. Vertical separator (`.ctrl-sep`) divides
  basalt settings from grid/overlay settings. Info line moved to its own bar below.
  Wraps naturally on narrow viewports.

### v1.27 — Port numbers, larger clog labels, crosshair grid
- Each port labelled with zone-prefixed number below the bore: C01–C13, B01–B19, A01–A17.
- BIO/VEG clog labels increased 10% in size (multiplier 0.99 vs previous 0.9).
- Print grid replaced with crosshairs at each 1.5m intersection — arm length scales with grid line width control.

### v1.26 — Clogged port indicators
- ~20% of TSU-9 ports now show organic matter fill inside the bore hole.
- BIO type: dark reddish-brown fill with lighter speck texture (carbon/organic residue).
- VEG type: dark green fill with lighter speck texture (vegetation/moss growth).
- Small label (BIO or VEG) appears above clogged ports in matching colour.
- Clog condition seeded independently of tampered flag — both can coexist.
- Legend updated to describe all three port states.

### v1.25 — Removed grid labels
- Print grid no longer draws meter labels or scale reminder text. Lines only.

### v1.24 — Print grid solid lines
- Grid overlay changed from dashed `[6,4]` to solid lines.

### v1.23 — Multi-file refactor + alternating strip model
- **Simplified to alternating light/dark vertical rectangles.** No ridge seam,
  no two-face split, no view angle projection. Each column = one face,
  even columns lit, odd columns shadowed. Perturbed edges and basalt texture preserved.
- Split into separate files: `index.html`, `css/style.css`, `js/geometry.js`,
  `js/render.js`, `js/actions.js`.

### v1.22 — TSU-9 ports aligned to lit column faces
- Ports now snap to left-face (lit column) centre positions read from actual seam data.
- Boring machine drills into flat faces, never across a ridge seam or column boundary.

### v1.21 — Default 24"×30" board
- Default canvas 36m × 45m (= 24" × 30" at 1in = 1.5m scale), DPI 100.
- Pixel cap raised to 20M. Added print inches readout to info line.

### v1.20 — Fixed per-column contrast consistency
- Z now shifts column brightness only, not L/R contrast ratio.
- Every column gets the same left/right light split from view angle + contrast slider.
- Z roughness varies overall brightness per column without affecting face ratio.

### v1.19 — Honeycomb port overlay
- TSU-9: 49 ports in hex-offset pattern across 3 zones (A:17, B:19, C:13).
- 22cm diameter bore holes with flush cap ring. ~3 of 49 flagged tampered (orange ring).
- Ports only placed on lit column faces.

### v1.18 — Grid colour, width control, confirmed H+V lines
- Grid colour picker and line width slider added.
- Confirmed both horizontal and vertical grid lines drawn.

### v1.17 — Game meters, DPI, print grid overlay
- Column width and canvas dimensions now specified in game meters.
- Print DPI control. Unit conversion: `m2px(m, dpi) = m × dpi / 1.5`.
- Print grid overlay at 1in = 1.5m scale with game-meter labels.
- Download filename includes dimensions and DPI.

### v1.16 — Enhanced texture
- Wider speck brightness range: 4-tier system (bright flash, mid, dark inclusion, void).
- Scratches can be lighter or darker than base face (iron oxide deposits vs fresh interior).
- Wider banding variation in horizontal lightness strips.

### v1.15 — Face contrast control
- Slider lerps between flat overcast (0%) and full geometric contrast (100%).
- Average brightness stable across contrast range — redistributes between faces.

### v1.14 — Default canvas 500×2000

### v1.13 — Default view angle +8° clockwise

### v1.12 — Day/night brightness slider
- `lightParams(t)` function: base brightness, spread, floor/ceil, RGB tint.
- Day: faint warm tint. Night: blue-grey moonlight, compressed contrast.

### v1.11 — Live update
- Removed Render button. All controls fire `requestAnimationFrame` on input.
- `raf` guard coalesces rapid slider movement into single frame.

### v1.10 — View angle control
- Left/right face split per column via `cos(30° ± θ)` projection.
- Ridge seam introduced as shared vertex between left and right faces.
- Lighting factors `lightL` and `lightR` computed from view angle and contrast.

### v1.09 — Faces edge to edge, shadow from contrast only
- Removed groove panels entirely.
- Faces packed edge-to-edge. Shadow between columns from lightness step across shared seam.
- No strokes in production mode — all visual separation from fill values.

### v1.08 — Two-face model matching photo reference
- Matching photo of basalt columns: only two faces visible (front face + groove shadow).
- Groove rendered as single dark strip with left-to-right gradient.

### v1.07 — Compact debug labels
- Signed distance only (`+0.85` / `-0.73`), no "Z" word.
- Labels sit on seam lines, colour-coded orange (out) / blue (in).

### v1.06 — Z roughness
- Per-column Z depth variation with seeded noise.
- Z shifts overall column brightness; sign preserved (even = inset, odd = protrude).

### v1.05 — Finite-element perturbed vertex grid
- XY roughness slider controls perturbation magnitude.
- Shared Y grid ensures all quads are watertight (no gaps between columns).

### v1.04 — Fixed shared-panel overlap
- Side panel between col N and col N+1 drawn exactly once as `NR/N+1L`.
- Previous model drew it twice (once as right of N, once as left of N+1).

### v1.03 — Per-panel debug labels
- `0L`, `0C`, `0R` labels for every panel in every column.
- Stacked in three rows at bottom to avoid overlap on narrow panels.

### v1.02 — Debug overlay
- Yellow dashed seam lines. Column numbers at base of each face.
- `onchange="render()"` wired directly to debug checkbox.

### v1.01 — Fixed hex geometry
- Side panel width corrected to `f × cos(30°) = f × 0.866`.
- Previous v1.00 used `f × 0.5` (cos 60°, wrong face).

### v1.00 — Initial version
- Rectangular strips, fixed straight edges, 3-panel model (left side, face, right side).
- Canvas W/H in pixels. Texture density slider. Download PNG.

---

## Scenario Reference

The TSU-9 port layout (49 ports, 3 zones, irregular honeycomb) is documented in
**Appendix F, Sections F.5a–F.5f** of the Cold Trail in Kethara's Reach scenario.

- Zone A (8–12m AGL): 17 ports
- Zone B (13–18m AGL): 19 ports — most irregular due to cliff face bow
- Zone C (19–24m AGL): 13 ports — boring machine near end of service life

Port diameter: 0.22m. Scale: 1.5m per print inch.
