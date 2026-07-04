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

function fillFace(ctx, ax, ay, bx, by, cx, cy, dx, dy, baseL, specks, seed, lp) {
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

  // Banded lightness — horizontal strips with slight variation
  for (var i = 0; i < 14; i++) {
    var ya = y0 + (i / 14) * h;
    var yb = y0 + ((i + 1) / 14) * h;
    ctx.fillStyle = colourString(baseL + (rng() - 0.5) * 22 * lp.spread, lp);
    ctx.fillRect(x0, Math.round(ya), Math.ceil(w), Math.ceil(yb - ya) + 1);
  }

  // Mineral specks — 4 tiers
  for (var i = 0; i < specks; i++) {
    var sx = x0 + rng() * w;
    var sy = y0 + rng() * h;
    var roll = rng();
    var sz = rng() * 2.6 + 0.3;
    var lv;
    if (roll > 0.75)      lv = baseL + 50 * lp.spread + rng() * 35;   // bright flash
    else if (roll > 0.40) lv = baseL + rng() * 16 * lp.spread;         // mid
    else if (roll > 0.15) lv = baseL - 25 * lp.spread - rng() * 12;   // dark inclusion
    else                  lv = baseL - 40 * lp.spread - rng() * 10;   // void
    ctx.fillStyle = colourString(lv, lp, 0.35 + rng() * 0.65);
    ctx.beginPath();
    ctx.ellipse(sx, sy, sz, sz * (0.2 + rng() * 0.55), rng() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }

  // Scratch lines — both lighter and darker than base
  var scratchCount = Math.max(1, Math.floor(specks / 6));
  for (var i = 0; i < scratchCount; i++) {
    var sx = x0 + rng() * w;
    var sy = y0 + rng() * h;
    var len = 6 + rng() * 35;
    var ang = (rng() - 0.5) * 0.5;
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

  // Horizontal fracture lines
  for (var sg = 0; sg < 10; sg++) {
    var rng2 = seededRand(seed * 100 + sg * 31);
    var fy = y0 + rng2() * h * 0.93;
    var fx = x0 + w * (0.08 + rng2() * 0.84);
    var fey = fy + (rng2() - 0.5) * 11;
    ctx.strokeStyle = colourString(baseL - 20 * lp.spread + rng2() * 6, lp, 0.4);
    ctx.lineWidth = 0.5 + rng2() * 0.7;
    ctx.beginPath();
    ctx.moveTo(x0, fy);
    ctx.lineTo(fx, fey);
    ctx.stroke();
  }

  ctx.restore();
}

// ── Print grid overlay ────────────────────────────────────────────
// Dashed lines every 1.5 game meters (= 1 print inch = dpi pixels).
// Horizontal AND vertical. Labels show cumulative game meters.

function drawGrid(ctx, W, H, dpi, gridColour, gridLineWidth) {
  var step = dpi; // 1 inch in pixels
  ctx.save();
  ctx.strokeStyle = gridColour;
  ctx.lineWidth = gridLineWidth;
  ctx.setLineDash([]);

  // Vertical lines
  for (var x = step; x < W; x += step) {
    ctx.beginPath();
    ctx.moveTo(Math.round(x) + 0.5, 0);
    ctx.lineTo(Math.round(x) + 0.5, H);
    ctx.stroke();
  }
  // Horizontal lines
  for (var y = step; y < H; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, Math.round(y) + 0.5);
    ctx.lineTo(W, Math.round(y) + 0.5);
    ctx.stroke();
  }

  // Labels
  ctx.font = 'bold 10px monospace';
  ctx.fillStyle = gridColour;
  ctx.globalAlpha = 0.8;
  ctx.textAlign = 'left';
  for (var i = 1; i * step < W; i++) {
    ctx.fillText((i * 1.5).toFixed(1) + 'm', Math.round(i * step) + 3, 12);
  }
  for (var i = 1; i * step < H; i++) {
    ctx.fillText((i * 1.5).toFixed(1) + 'm', 3, Math.round(i * step) - 3);
  }

  // Scale reminder
  ctx.textAlign = 'right';
  ctx.globalAlpha = 0.6;
  ctx.font = 'bold 9px monospace';
  ctx.fillText('1 sq = 1.5m = 1in @ ' + dpi + 'dpi', W - 4, H - 4);
  ctx.restore();
}

// ── TSU-9 port overlay ────────────────────────────────────────────
// 49 ports in hex-offset honeycomb across 3 zones.
// Ports placed only on LIT columns (even index).
// Zone C (13 ports, top), Zone B (19, middle), Zone A (17, bottom).
// ~3 of 49 flagged as tampered (orange dashed ring).

function drawPorts(ctx, W, H, dpi, lp, SVX, numSeams, numCols, numRows) {
  var portRadius = Math.max(2, m2px(0.22, dpi) / 2);
  var midR = Math.floor(numRows / 2);

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

        // Dark bore hole
        ctx.beginPath();
        ctx.arc(px, py, portRadius, 0, Math.PI * 2);
        var holeL = Math.max(lp.floor * 0.5, 18 + lp.base * 0.08);
        ctx.fillStyle = colourString(holeL, lp);
        ctx.fill();

        // Flush cap ring
        ctx.beginPath();
        ctx.arc(px, py, portRadius + Math.max(1, portRadius * 0.35), 0, Math.PI * 2);
        ctx.strokeStyle = colourString(lp.base * 0.75, lp, 0.7);
        ctx.lineWidth = Math.max(0.8, portRadius * 0.2);
        ctx.stroke();

        // Tampered indicator
        if (tampered) {
          ctx.beginPath();
          ctx.arc(px, py, portRadius + Math.max(2, portRadius * 0.6), 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(255,160,40,0.7)';
          ctx.lineWidth = Math.max(1, portRadius * 0.25);
          ctx.setLineDash([3, 2]);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        placed++;
      }
    }

    // Zone label
    ctx.save();
    ctx.font = 'bold ' + Math.max(10, Math.round(portRadius * 1.5)) + 'px monospace';
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
  ctx.fillText('TSU-9: 49 ports on lit faces | 22cm bore | orange=tampered', 4, H - 4);
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

  // Build perturbed seam grid
  var seams = buildSeams(W, H, T, params.xyRoughness);
  var SVX = seams.SVX;
  var SVY = seams.SVY;
  var numCols = seams.numCols;
  var numRows = seams.numRows;
  var numSeams = seams.numSeams;

  var specsPerCell = Math.max(3, Math.round(params.texDensity * (T * H) / 18000));

  // Simple alternating: even = light, odd = dark
  var lightBase = lp.base * (1 + params.contrast * 0.25);
  var darkBase = lp.base * (1 - params.contrast * 0.25);

  for (var col = 0; col < numCols; col++) {
    var isLight = col % 2 === 0;
    var faceL = Math.max(lp.floor, Math.min(lp.ceil, isLight ? lightBase : darkBase));

    // Per-column slight variation
    var rng = seededRand(col * 98317 + 42);
    var vary = (rng() - 0.5) * 8 * lp.spread;
    var finalL = Math.max(lp.floor, Math.min(lp.ceil, faceL + vary));

    var sp = Math.max(1, Math.round(specsPerCell / numRows));

    for (var r = 0; r < numRows - 1; r++) {
      fillFace(
        ctx,
        SVX[col][r], SVY[col][r],
        SVX[col + 1][r], SVY[col + 1][r],
        SVX[col + 1][r + 1], SVY[col + 1][r + 1],
        SVX[col][r + 1], SVY[col][r + 1],
        finalL, sp, (col * 7001 + r * 13) * 100, lp
      );
    }
  }

  // Overlays
  if (params.showPorts) {
    drawPorts(ctx, W, H, params.dpi, lp, SVX, numSeams, numCols, numRows);
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
