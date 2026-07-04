/**
 * geometry.js — Basalt Column Wall Generator
 * Seeded random, seam construction, unit conversions, column layout.
 * v1.23 — Simplified alternating light/dark vertical rectangles.
 */

// ── Unit conversions ──────────────────────────────────────────────
// Scale: 1 print inch = 1.5 game meters
// So 1 game meter = (1/1.5) inches = DPI/1.5 pixels

function m2px(meters, dpi) {
  return meters * dpi / 1.5;
}

function px2m(pixels, dpi) {
  return pixels * 1.5 / dpi;
}

// ── Seeded PRNG ───────────────────────────────────────────────────
// Deterministic: same seed → same sequence. Used everywhere so the
// texture is stable across re-renders when only controls change.

function seededRand(seed) {
  let s = (seed ^ 0xdeadbeef) >>> 0;
  return function () {
    s = Math.imul(s ^ (s >>> 16), 0x45d9f3b);
    s = Math.imul(s ^ (s >>> 16), 0x45d9f3b);
    s ^= s >>> 16;
    return (s >>> 0) / 0x100000000;
  };
}

// ── Face width ratio from view angle ─────────────────────────────
// At view angle θ (degrees), the lit face projects wider and the shadow
// face narrower. Returns litRatio in [0,1] where 0.5 = equal widths.
// Based on cos(30° ± θ) hexagonal prism projection.

function viewAngleToRatio(angleDeg) {
  var theta = angleDeg * Math.PI / 180;
  var litW = Math.cos(Math.PI / 6 - theta);
  var darkW = Math.cos(Math.PI / 6 + theta);
  litW = Math.max(0.05, litW);
  darkW = Math.max(0.05, darkW);
  return litW / (litW + darkW);
}

// ── Seam construction ─────────────────────────────────────────────
// Each column boundary is a perturbed vertical polyline.
// Adjacent columns share the same Y grid so quads are watertight.
// litRatio (0–1): fraction of each lit+dark pair that is lit.
//   0.5 = equal widths (straight-on view)
//   >0.5 = lit face wider (angled to show more lit face)
//
// Returns:
//   SVX[seamIndex][row] — x position of vertex
//   SVY[seamIndex][row] — y position of vertex (shared across all seams)
//   numSeams, numCols, numRows, litW, darkW

function buildSeams(canvasW, canvasH, colWidthPx, xyRoughness, litRatio) {
  // litRatio defaults to 0.5 if not supplied
  if (litRatio === undefined) litRatio = 0.5;
  litRatio = Math.max(0.05, Math.min(0.95, litRatio));

  // Each light+dark pair spans colWidthPx * 2 total
  var pairW = colWidthPx * 2;
  var litW  = pairW * litRatio;
  var darkW = pairW * (1 - litRatio);

  // numCols: how many individual column strips fit
  var numCols = Math.ceil(canvasW / colWidthPx) + 4;
  var numSeams = numCols + 1;
  var numRows = Math.max(5, Math.round(canvasH / Math.max(18, colWidthPx * 0.7))) + 1;

  // Shared Y positions
  var sharedY = [];
  sharedY[0] = 0;
  sharedY[numRows - 1] = canvasH;
  for (var r = 1; r < numRows - 1; r++) {
    var nomY = r * (canvasH / (numRows - 1));
    var rng = seededRand(r * 7919 + 3571);
    sharedY[r] = nomY + (rng() - 0.5) * xyRoughness * (canvasH / (numRows - 1)) * 0.4;
  }

  var SVX = [];
  var SVY = [];
  var mag   = xyRoughness * colWidthPx * 0.18;
  var maxDx = colWidthPx * 0.15;

  // Build nominal X positions: seam 0 is off-screen left.
  // Even seam gaps (between seam s and s+1 where s is even) = litW
  // Odd seam gaps = darkW
  var nomXs = [];
  nomXs[0] = -pairW; // start well off left edge
  for (var s = 1; s < numSeams; s++) {
    var prevGap = (s - 1) % 2 === 0 ? litW : darkW;
    nomXs[s] = nomXs[s - 1] + prevGap;
  }

  for (var s = 0; s < numSeams; s++) {
    SVX[s] = [];
    SVY[s] = [];
    for (var r = 0; r < numRows; r++) {
      var rng = seededRand(s * 13337 + r * 1009 + 7);
      var ang = rng() * Math.PI * 2;
      var rad = rng() * mag;
      var dx = (r === 0 || r === numRows - 1)
        ? 0
        : Math.max(-maxDx, Math.min(maxDx, Math.cos(ang) * rad));
      SVX[s][r] = nomXs[s] + dx;
      SVY[s][r] = sharedY[r];
    }
  }

  return {
    SVX: SVX,
    SVY: SVY,
    numSeams: numSeams,
    numCols: numCols,
    numRows: numRows,
    litW: litW,
    darkW: darkW
  };
}
