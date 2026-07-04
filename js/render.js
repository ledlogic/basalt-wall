/**
 * render.js — Basalt Column Wall Generator
 * Face texture fill, print grid overlay, TSU-9 port overlay, main render.
 * v1.23 — Simplified alternating light/dark vertical rectangles.
 *
 * Depends on: geometry.js (seededRand, buildSeams, m2px)
 */

// ── Light parameters ──────────────────────────────────────────────
// t: 0 = full night, 1 = full day
// Returns base brightness, contrast spread, floor/ceil clamps,
// and RGB multipliers for warm (day) → blue-grey (night) tint.

function lightParams(t) {
  return {
    base:   28 + t * 107,
    spread: 0.25 + t * 0.75,
    floor:  20 + t * 40,
    ceil:   80 + t * 135,
    rm: t >= 0.5 ? 1.0 + (t - 0.5) * 0.04 : 1.0 - (0.5 - t) * 0.06,
    gm: t >= 0.5 ? 1.0 + (t - 0.5) * 0.02 : 1.0 - (0.5 - t) * 0.02,
    bm: t >= 0.5 ? 0.97 - (t - 0.5) * 0.02 : 1.0 + (0.5 - t) * 0.12
  };
}

// ── Colour helper ─────────────────────────────────────────────────
// Clamps a grey value to [floor, ceil], applies RGB tint, returns
// rgb() or rgba() string. Never produces pure black.

function colourString(v, lp, alpha) {
  var c = Math.max(lp.floor, Math.min(lp.ceil, Math.round(v)));
  var r = Math.max(0, Math.min(255, Math.round(c * lp.rm)));
  var g = Math.max(0, Math.min(255, Math.round(c * lp.gm)));
  var b = Math.max(0, Math.min(255, Math.round(c * lp.bm)));
  if (alpha === undefined) {
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }
  return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
}

// ── Fill a single face quad with basalt texture ───────────────────
// Quad defined by four corners (ax,ay)→(bx,by)→(cx,cy)→(dx,dy).
// Clips to the quad, fills with banded lightness, specks (4-tier:
// bright flash, mid, dark inclusion, void), scratches (light and dark),
// and horizontal fracture lines.

function fillFace(ctx, ax, ay, bx, by, cx, cy, dx, dy, baseL, specks, seed, lp, grainAngle) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(bx, by);
  ctx.lineTo(cx, cy);
  ctx.lineTo(dx, dy);
  ctx.closePath();
  ctx.clip();

  var x0 = Math.min(ax, bx, cx, dx);
  var x1 = Math.max(ax, bx, cx, dx);
  var y0 = Math.min(ay, by, cy, dy);
  var y1 = Math.max(ay, by, cy, dy);
  var w = x1 - x0;
  var h = y1 - y0;

  if (w < 1 || h < 1) { ctx.restore(); return; }

  var rng = seededRand(seed);

  // Per-face seeded jitter: ±5° on top of the base grain angle
  var jitterDeg = (rng() - 0.5) * 10;   // ±5°
  var gRad = ((grainAngle || 90) + jitterDeg) * Math.PI / 180;

  // Grain direction unit vector — grain runs along this axis
  var gx = Math.cos(gRad);   // component along grain
  var gy = Math.sin(gRad);   // component along grain
  // Cross-grain unit vector (perpendicular, used for banding offsets)
  var cx2 = -gy;
  var cy2 =  gx;

  // Centre of the face for rotating banding
  var fcx = (x0 + x1) * 0.5;
  var fcy = (y0 + y1) * 0.5;

  // Banded lightness — strips perpendicular to grain direction
  // Project each strip position onto the cross-grain axis
  var bands = 14;
  var bandLen = Math.abs(w * cx2) + Math.abs(h * cy2); // extent along cross-grain
  for (var i = 0; i < bands; i++) {
    var t0 = (i / bands) - 0.5;
    var t1 = ((i + 1) / bands) - 0.5;
    var v = colourString(baseL + (rng() - 0.5) * 22 * lp.spread, lp);

    // Draw as a filled parallelogram strip oriented to grain
    var hw = (w * 0.5 + 4);
    var hh = (h * 0.5 + 4);
    var off0 = t0 * bandLen;
    var off1 = t1 * bandLen;
    // Four corners of the strip in face space
    var p0x = fcx + cx2 * off0 - gx * hw;
    var p0y = fcy + cy2 * off0 - gy * hw;
    var p1x = fcx + cx2 * off0 + gx * hw;
    var p1y = fcy + cy2 * off0 + gy * hw;
    var p2x = fcx + cx2 * off1 + gx * hw;
    var p2y = fcy + cy2 * off1 + gy * hw;
    var p3x = fcx + cx2 * off1 - gx * hw;
    var p3y = fcy + cy2 * off1 - gy * hw;

    ctx.fillStyle = v;
    ctx.beginPath();
    ctx.moveTo(p0x, p0y); ctx.lineTo(p1x, p1y);
    ctx.lineTo(p2x, p2y); ctx.lineTo(p3x, p3y);
    ctx.closePath();
    ctx.fill();
  }

  // Mineral specks — 4 tiers (position-only, unaffected by grain angle)
  for (var i = 0; i < specks; i++) {
    var sx = x0 + rng() * w;
    var sy = y0 + rng() * h;
    var roll = rng();
    var sz = rng() * 2.6 + 0.3;
    var lv;
    if (roll > 0.75)      lv = baseL + 50 * lp.spread + rng() * 35;
    else if (roll > 0.40) lv = baseL + rng() * 16 * lp.spread;
    else if (roll > 0.15) lv = baseL - 25 * lp.spread - rng() * 12;
    else                  lv = baseL - 40 * lp.spread - rng() * 10;
    ctx.fillStyle = colourString(lv, lp, 0.35 + rng() * 0.65);
    ctx.beginPath();
    // Elongate specks along grain direction
    ctx.ellipse(sx, sy, sz, sz * (0.2 + rng() * 0.45), gRad + (rng() - 0.5) * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }

  // Scratch lines — run along grain angle ± small random spread
  var scratchCount = Math.max(1, Math.floor(specks / 6));
  for (var i = 0; i < scratchCount; i++) {
    var sx = x0 + rng() * w;
    var sy = y0 + rng() * h;
    var len = 6 + rng() * 35;
    // Scratches run along grain with ±15° spread
    var ang = gRad + (rng() - 0.5) * 0.52;
    var bright = rng() > 0.4;
    var lv = bright
      ? baseL + 22 * lp.spread + rng() * 18
      : baseL - 20 * lp.spread - rng() * 10;
    ctx.strokeStyle = colourString(lv, lp, 0.15 + rng() * 0.35);
    ctx.lineWidth = 0.3 + rng() * 1.1;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + Math.cos(ang) * len, sy + Math.sin(ang) * len);
    ctx.stroke();
  }

  // Fracture lines — run along grain angle, span full face width
  for (var sg = 0; sg < 10; sg++) {
    var rng2 = seededRand(seed * 100 + sg * 31);
    // Start point: random position along cross-grain axis
    var offset = (rng2() - 0.5) * bandLen;
    var startX = fcx + cx2 * offset - gx * (w * 0.6 + 4);
    var startY = fcy + cy2 * offset - gy * (w * 0.6 + 4);
    // End point: follow grain, slight perpendicular drift
    var fracLen = w * (0.4 + rng2() * 0.7);
    var drift = (rng2() - 0.5) * 11;
    var endX = startX + gx * fracLen + cx2 * drift;
    var endY = startY + gy * fracLen + cy2 * drift;
    ctx.strokeStyle = colourString(baseL - 20 * lp.spread + rng2() * 6, lp, 0.4);
    ctx.lineWidth = 0.5 + rng2() * 0.7;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
  }

  ctx.restore();
}

// ── Print grid overlay ────────────────────────────────────────────
// Crosshairs at each 1.5m (1 inch) intersection instead of full lines.
// Crosshair arm length = 6px each side by default, scales with line width.

function drawGrid(ctx, W, H, dpi, gridColour, gridLineWidth) {
  var step = dpi; // 1 inch = 1.5m in pixels
  var arm = Math.max(4, Math.round(gridLineWidth * 5 + 3)); // crosshair arm length px

  ctx.save();
  ctx.strokeStyle = gridColour;
  ctx.lineWidth = gridLineWidth;
  ctx.setLineDash([]);

  for (var x = step; x < W; x += step) {
    var xi = Math.round(x) + 0.5;
    for (var y = step; y < H; y += step) {
      var yi = Math.round(y) + 0.5;
      // Horizontal arm
      ctx.beginPath();
      ctx.moveTo(xi - arm, yi);
      ctx.lineTo(xi + arm, yi);
      ctx.stroke();
      // Vertical arm
      ctx.beginPath();
      ctx.moveTo(xi, yi - arm);
      ctx.lineTo(xi, yi + arm);
      ctx.stroke();
    }
  }

  ctx.restore();
}

// ── TSU-9 port overlay ────────────────────────────────────────────
// 49 ports in hex-offset honeycomb across 3 zones.
// Ports placed only on LIT columns (even index).
// Zone C (13 ports, top), Zone B (19, middle), Zone A (17, bottom).
// ~6% tampered (orange dashed ring). ~20% clogged:
//   BIO = dark brown carbon/organic residue fill
//   VEG = dark green vegetation/moss fill

function drawPorts(ctx, W, H, dpi, lp, SVX, numSeams, numCols, numRows, portFont) {
  var portRadius = Math.max(2, m2px(0.22, dpi) / 2);
  var midR = Math.floor(numRows / 2);
  var fnt = portFont || 10;

  var zones = [
    { name: 'C', count: 13, yStart: 0.04, yEnd: 0.28, rows: 2 },
    { name: 'B', count: 19, yStart: 0.32, yEnd: 0.62, rows: 3 },
    { name: 'A', count: 17, yStart: 0.66, yEnd: 0.92, rows: 3 }
  ];

  // Collect lit column centre positions
  var litCols = [];
  for (var col = 0; col < numCols; col++) {
    if (col % 2 === 0) {
      var cx = (SVX[col][midR] + SVX[col + 1][midR]) * 0.5;
      if (cx > 0 && cx < W) litCols.push({ col: col, cx: cx });
    }
  }

  ctx.save();

  for (var zi = 0; zi < zones.length; zi++) {
    var z = zones[zi];
    var yTop = H * z.yStart;
    var yBot = H * z.yEnd;
    var rowH = (yBot - yTop) / z.rows;
    var placed = 0;
    var portsPerRow = Math.ceil(z.count / z.rows);

    for (var row = 0; row < z.rows && placed < z.count; row++) {
      var y = yTop + rowH * 0.5 + row * rowH;
      var isOdd = row % 2 === 1;
      var thisRow = Math.min(portsPerRow, z.count - placed);

      for (var p = 0; p < thisRow; p++) {
        var idx = Math.round((p + 0.5) * litCols.length / thisRow) + (isOdd ? 1 : 0);
        idx = Math.max(0, Math.min(litCols.length - 1, idx));
        var fc = litCols[idx];
        if (!fc) continue;

        var rng = seededRand(zi * 10000 + row * 1000 + p * 7 + 42);
        var faceW = SVX[fc.col + 1][midR] - SVX[fc.col][midR];
        var jx = (rng() - 0.5) * faceW * 0.35;
        var jy = (rng() - 0.5) * rowH * 0.2;
        var px = fc.cx + jx;
        var py = y + jy;
        var tampered = rng() < 0.06;

        // Global port number — sequential across all zones, 1-indexed
        var portNum = placed + 1;
        // Prefix by zone: C01-C13, B01-B19, A01-A17
        var portLabel = z.name + (portNum < 10 ? '0' : '') + portNum;

        // Clogged: seeded separately so it's independent of tampered.
        // ~20% of ports have organic/vegetation matter blocking them.
        var rng2 = seededRand(zi * 10000 + row * 1000 + p * 7 + 99);
        var clogRoll = rng2();
        var clogged = clogRoll < 0.20;
        // Vary the clog type: vegetation (green) vs carbon/organic residue (brown)
        var clogVeg = rng2() > 0.45; // 55% brown carbon, 45% green vegetation

        // Dark bore hole
        ctx.beginPath();
        ctx.arc(px, py, portRadius, 0, Math.PI * 2);
        var holeL = Math.max(lp.floor * 0.5, 18 + lp.base * 0.08);
        ctx.fillStyle = colourString(holeL, lp);
        ctx.fill();

        // Clog fill — organic matter inside the bore hole
        if (clogged) {
          var clogR = portRadius * (0.60 + rng2() * 0.30);
          var clogOx = (rng2() - 0.5) * portRadius * 0.25;
          var clogOy = (rng2() - 0.5) * portRadius * 0.25;
          ctx.fillStyle = clogVeg ? 'rgba(72,98,52,0.82)' : 'rgba(88,52,28,0.85)';
          ctx.beginPath();
          ctx.arc(px + clogOx, py + clogOy, clogR, 0, Math.PI * 2);
          ctx.fill();
          for (var cs = 0; cs < 4; cs++) {
            var sx = px + (rng2() - 0.5) * portRadius * 1.2;
            var sy = py + (rng2() - 0.5) * portRadius * 1.2;
            var sr = rng2() * portRadius * 0.25 + 0.5;
            ctx.fillStyle = clogVeg
              ? 'rgba(110,140,70,' + (0.4 + rng2() * 0.4) + ')'
              : 'rgba(130,80,40,' + (0.35 + rng2() * 0.4) + ')';
            ctx.beginPath();
            ctx.arc(sx, sy, sr, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // Flush cap ring
        ctx.beginPath();
        ctx.arc(px, py, portRadius + Math.max(1, portRadius * 0.35), 0, Math.PI * 2);
        ctx.strokeStyle = colourString(lp.base * 0.75, lp, 0.7);
        ctx.lineWidth = Math.max(0.8, portRadius * 0.2);
        ctx.stroke();

        // Tampered indicator — orange dashed outer ring
        if (tampered) {
          ctx.beginPath();
          ctx.arc(px, py, portRadius + Math.max(2, portRadius * 0.6), 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(255,160,40,0.7)';
          ctx.lineWidth = Math.max(1, portRadius * 0.25);
          ctx.setLineDash([3, 2]);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Port number — below the port
        ctx.save();
        ctx.font = 'bold ' + fnt + 'px monospace';
        ctx.textAlign = 'center';
        ctx.shadowColor = '#000';
        ctx.shadowBlur = 2;
        ctx.fillStyle = 'rgba(255,220,100,0.85)';
        ctx.fillText(portLabel, px, py + portRadius + fnt + 1);
        ctx.restore();

        // BIO/VEG clog label — above the port, 10% larger
        if (clogged) {
          var clogFnt = Math.round(fnt * 1.1);
          ctx.save();
          ctx.font = 'bold ' + clogFnt + 'px monospace';
          ctx.textAlign = 'center';
          ctx.shadowColor = '#000';
          ctx.shadowBlur = 2;
          ctx.fillStyle = clogVeg ? 'rgba(140,200,90,0.9)' : 'rgba(200,130,70,0.9)';
          ctx.fillText(clogVeg ? 'VEG' : 'BIO', px, py - portRadius - Math.max(2, portRadius * 0.5));
          ctx.restore();
        }

        placed++;
      }
    }

    // Zone label
    ctx.save();
    ctx.font = 'bold ' + Math.round(fnt * 1.2) + 'px monospace';
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(255,200,80,0.6)';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 3;
    ctx.fillText('Zone ' + z.name + ' (' + z.count + ')', W - 6, H * z.yStart + 14);
    ctx.restore();
  }

  // Legend
  ctx.save();
  ctx.font = 'bold 9px monospace';
  ctx.fillStyle = 'rgba(255,200,80,0.5)';
  ctx.textAlign = 'left';
  ctx.fillText('TSU-9: 49 ports | orange ring=tampered | BIO=carbon clog (brown) | VEG=vegetation clog (green)', 4, H - 4);
  ctx.restore();

  ctx.restore();
}

// ── Debug overlay ─────────────────────────────────────────────────

function drawDebug(ctx, W, H, SVX, SVY, numSeams, numCols, numRows) {
  // Seam lines
  for (var s = 0; s < numSeams; s++) {
    ctx.save();
    ctx.strokeStyle = '#ffe84d';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(SVX[s][0], SVY[s][0]);
    for (var r = 1; r < numRows; r++) ctx.lineTo(SVX[s][r], SVY[s][r]);
    ctx.stroke();
    ctx.restore();
  }

  // Column labels: "0 lit" / "1 shd"
  var midR = Math.floor(numRows / 2);
  for (var col = 0; col < numCols; col++) {
    var cx = (SVX[col][midR] + SVX[col + 1][midR]) * 0.5;
    if (cx > 0 && cx < W) {
      var isLight = col % 2 === 0;
      ctx.save();
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#000';
      ctx.shadowBlur = 3;
      ctx.fillStyle = isLight ? '#ffe84d' : '#44bbff';
      ctx.fillText(col + (isLight ? ' lit' : ' shd'), cx, H - 8);
      ctx.restore();
    }
  }
}

// ── Main render ───────────────────────────────────────────────────

function render() {
  var params = readParams();
  if (!params) return;

  var ctx = params.ctx;
  var W = params.W;
  var H = params.H;
  var T = params.T;
  var lp = params.lp;

  // Background — matches mid-tone so sub-pixel seam gaps are invisible
  var bg = Math.round(lp.floor * 0.7);
  ctx.fillStyle = colourString(bg * 0.85, lp);
  ctx.fillRect(0, 0, W, H);

  // Build perturbed seam grid — pass litRatio for correct face proportions
  var seams = buildSeams(W, H, T, params.xyRoughness, params.litRatio);
  var SVX = seams.SVX;
  var SVY = seams.SVY;
  var numCols = seams.numCols;
  var numRows = seams.numRows;
  var numSeams = seams.numSeams;
  var litW  = seams.litW;
  var darkW = seams.darkW;

  var specsPerCell = Math.max(3, Math.round(params.texDensity * (T * H) / 18000));

  // Alternating: even = light, odd = dark
  // Specks scale with actual face width so narrower faces aren't over-speckled
  var lightBase = lp.base * (1 + params.contrast * 0.25);
  var darkBase  = lp.base * (1 - params.contrast * 0.25);

  for (var col = 0; col < numCols; col++) {
    var isLight = col % 2 === 0;
    var faceL = Math.max(lp.floor, Math.min(lp.ceil, isLight ? lightBase : darkBase));
    var faceW = isLight ? litW : darkW;

    var rng = seededRand(col * 98317 + 42);
    var vary = (rng() - 0.5) * 8 * lp.spread;
    var finalL = Math.max(lp.floor, Math.min(lp.ceil, faceL + vary));

    // Scale specks proportionally to face width
    var sp = Math.max(1, Math.round(specsPerCell * (faceW / (T * 2)) / numRows * 2));

    for (var r = 0; r < numRows - 1; r++) {
      fillFace(
        ctx,
        SVX[col][r], SVY[col][r],
        SVX[col + 1][r], SVY[col + 1][r],
        SVX[col + 1][r + 1], SVY[col + 1][r + 1],
        SVX[col][r + 1], SVY[col][r + 1],
        finalL, sp, (col * 7001 + r * 13) * 100, lp, params.grainAngle
      );
    }
  }

  // Overlays
  if (params.showPorts) {
    drawPorts(ctx, W, H, params.dpi, lp, SVX, numSeams, numCols, numRows, params.portFont);
  }
  if (params.showGrid) {
    drawGrid(ctx, W, H, params.dpi, params.gridColour, params.gridLineWidth);
  }
  if (params.debug) {
    drawDebug(ctx, W, H, SVX, SVY, numSeams, numCols, numRows);
  }

  // Subtle left-light wash
  var grad = ctx.createLinearGradient(0, 0, W * 0.07, 0);
  grad.addColorStop(0, 'rgba(255,255,255,' + (0.02 + params.brightness * 0.04) + ')');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
}
