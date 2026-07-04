/**
 * geometry.js — Basalt Column Wall Generator
 * Seeded random, seam construction, unit conversions, column layout.
 * v1.28 — Variable ground line + foreground column clusters.
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

// ── Ground line builder ───────────────────────────────────────────
// Returns an array groundY[seamIndex] giving the Y pixel at which the
// ground sits for each seam boundary.
//
// The ground is:
//   canvasH - m2px(1.5, dpi)          ← base raise (1.5 m up from bottom)
//   ± a random undulation of up to varianceM meters per seam
//
// varianceM: 0 = perfectly flat raised ground; 1.0 = ±1.0 m maximum swing
// The undulation is smoothed by averaging neighbours for a gentle roll.

function buildGroundLine(numSeams, canvasH, dpi, varianceM) {
  var baseY = canvasH - m2px(1.5, dpi);        // 1.5 m up
  var maxVar = m2px(Math.max(0, varianceM), dpi); // variance in pixels

  // Raw per-seam noise
  var raw = [];
  for (var s = 0; s < numSeams; s++) {
    var rng = seededRand(s * 48271 + 99991);
    raw[s] = baseY + (rng() - 0.5) * 2 * maxVar;
  }

  // Smooth with a simple 5-point moving average for gentle undulation
  var smoothed = [];
  for (var s = 0; s < numSeams; s++) {
    var sum = 0, cnt = 0;
    for (var d = -2; d <= 2; d++) {
      var idx = s + d;
      if (idx >= 0 && idx < numSeams) { sum += raw[idx]; cnt++; }
    }
    smoothed[s] = sum / cnt;
  }

  return smoothed;
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

function buildSeams(canvasW, canvasH, colWidthPx, xyRoughness, litRatio, xOffset) {
  // litRatio defaults to 0.5 if not supplied
  if (litRatio === undefined) litRatio = 0.5;
  litRatio = Math.max(0.05, Math.min(0.95, litRatio));
  if (xOffset === undefined) xOffset = 0;

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
  nomXs[0] = -pairW + xOffset; // start offset from left edge
  for (var s = 1; s < numSeams; s++) {
    var prevGap = (s - 1) % 2 === 0 ? litW : darkW;
    nomXs[s] = nomXs[s - 1] + prevGap;
  }

  for (var s = 0; s < numSeams; s++) {
    SVX[s] = [];
    SVY[s] = [];
    for (var r = 0; r < numRows; r++) {
      var rng = seededRand(s * 13337 + r * 1009 + 7 + Math.round(xOffset));
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

// ── Foreground cluster layout ─────────────────────────────────────
// Generates an array of foreground column clusters, each with:
//   xStart  — left edge pixel position
//   colCount — number of columns in this cluster
//   heightFrac — how far up the canvas the cluster reaches (0.3–0.85)
//   xOffset  — seam phase offset (keeps them off the main grid X)
//   seed     — unique seed per cluster
//
// clusterCount: number of clusters (2–8)
// canvasW, canvasH, colWidthPx: standard layout params
// mainPairW: width of a lit+dark pair in the main wall (for offset calc)

function buildForegroundClusters(clusterCount, canvasW, canvasH, colWidthPx, dpi) {
  var clusters = [];
  var pairW = colWidthPx * 2;

  for (var ci = 0; ci < clusterCount; ci++) {
    var rng = seededRand(ci * 57331 + 18181);

    // Cluster width: 3–5 cols (small) or 10–20 cols (large), biased small
    var isLarge = rng() > 0.6;
    var colCount = isLarge
      ? Math.round(10 + rng() * 10)   // 10–20
      : Math.round(3 + rng() * 2);    // 3–5

    // Position: spread across canvas width, avoid extreme edges
    var minX = canvasW * 0.05;
    var maxX = canvasW * 0.92;
    var xStart = minX + rng() * (maxX - minX);

    // X offset from main grid — shift by ~1.3 colWidths so seams don't align
    var xOffset = (rng() * 0.6 + 0.8) * colWidthPx;
    // Sometimes mirror: push offset further to stagger seams
    if (rng() > 0.5) xOffset = pairW - xOffset;

    // Height: clusters don't reach the top (0.30–0.82 of canvas height)
    var heightFrac = 0.30 + rng() * 0.52;

    clusters.push({
      xStart: xStart,
      colCount: colCount,
      heightFrac: heightFrac,
      xOffset: xOffset,
      seed: ci * 777 + 31337
    });
  }

  return clusters;
}
