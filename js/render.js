/**
 * render.js — Basalt Column Wall Generator
 * v1.28 — Variable ground line + foreground column clusters.
 */

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

function colourString(v, lp, alpha) {
  var c = Math.max(lp.floor, Math.min(lp.ceil, Math.round(v)));
  var r = Math.max(0, Math.min(255, Math.round(c * lp.rm)));
  var g = Math.max(0, Math.min(255, Math.round(c * lp.gm)));
  var b = Math.max(0, Math.min(255, Math.round(c * lp.bm)));
  if (alpha === undefined) return 'rgb(' + r + ',' + g + ',' + b + ')';
  return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
}

function fillFace(ctx, ax, ay, bx, by, cx, cy, dx, dy, baseL, specks, seed, lp, grainAngle) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.lineTo(cx, cy); ctx.lineTo(dx, dy);
  ctx.closePath(); ctx.clip();

  var x0 = Math.min(ax, bx, cx, dx), x1 = Math.max(ax, bx, cx, dx);
  var y0 = Math.min(ay, by, cy, dy), y1 = Math.max(ay, by, cy, dy);
  var w = x1 - x0, h = y1 - y0;
  if (w < 1 || h < 1) { ctx.restore(); return; }

  var rng = seededRand(seed);
  var jitterDeg = (rng() - 0.5) * 10;
  var gRad = ((grainAngle || 90) + jitterDeg) * Math.PI / 180;
  var gx = Math.cos(gRad), gy = Math.sin(gRad);
  var cx2 = -gy, cy2 = gx;
  var fcx = (x0 + x1) * 0.5, fcy = (y0 + y1) * 0.5;
  var bands = 14;
  var bandLen = Math.abs(w * cx2) + Math.abs(h * cy2);

  for (var i = 0; i < bands; i++) {
    var t0 = (i / bands) - 0.5, t1 = ((i + 1) / bands) - 0.5;
    var v = colourString(baseL + (rng() - 0.5) * 22 * lp.spread, lp);
    var hw = w * 0.5 + 4;
    var off0 = t0 * bandLen, off1 = t1 * bandLen;
    ctx.fillStyle = v;
    ctx.beginPath();
    ctx.moveTo(fcx + cx2*off0 - gx*hw, fcy + cy2*off0 - gy*hw);
    ctx.lineTo(fcx + cx2*off0 + gx*hw, fcy + cy2*off0 + gy*hw);
    ctx.lineTo(fcx + cx2*off1 + gx*hw, fcy + cy2*off1 + gy*hw);
    ctx.lineTo(fcx + cx2*off1 - gx*hw, fcy + cy2*off1 - gy*hw);
    ctx.closePath(); ctx.fill();
  }

  for (var i = 0; i < specks; i++) {
    var sx = x0 + rng() * w, sy = y0 + rng() * h;
    var roll = rng(), sz = rng() * 2.6 + 0.3, lv;
    if (roll > 0.75)      lv = baseL + 50 * lp.spread + rng() * 35;
    else if (roll > 0.40) lv = baseL + rng() * 16 * lp.spread;
    else if (roll > 0.15) lv = baseL - 25 * lp.spread - rng() * 12;
    else                  lv = baseL - 40 * lp.spread - rng() * 10;
    ctx.fillStyle = colourString(lv, lp, 0.35 + rng() * 0.65);
    ctx.beginPath();
    ctx.ellipse(sx, sy, sz, sz * (0.2 + rng() * 0.45), gRad + (rng() - 0.5) * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }

  var scratchCount = Math.max(1, Math.floor(specks / 6));
  for (var i = 0; i < scratchCount; i++) {
    var sx = x0 + rng() * w, sy = y0 + rng() * h;
    var len = 6 + rng() * 35;
    var ang = gRad + (rng() - 0.5) * 0.52;
    var bright = rng() > 0.4;
    var lv = bright ? baseL + 22 * lp.spread + rng() * 18 : baseL - 20 * lp.spread - rng() * 10;
    ctx.strokeStyle = colourString(lv, lp, 0.15 + rng() * 0.35);
    ctx.lineWidth = 0.3 + rng() * 1.1;
    ctx.beginPath();
    ctx.moveTo(sx, sy); ctx.lineTo(sx + Math.cos(ang) * len, sy + Math.sin(ang) * len);
    ctx.stroke();
  }

  for (var sg = 0; sg < 10; sg++) {
    var rng2 = seededRand(seed * 100 + sg * 31);
    var offset = (rng2() - 0.5) * bandLen;
    var startX = fcx + cx2 * offset - gx * (w * 0.6 + 4);
    var startY = fcy + cy2 * offset - gy * (w * 0.6 + 4);
    var fracLen = w * (0.4 + rng2() * 0.7);
    var drift = (rng2() - 0.5) * 11;
    ctx.strokeStyle = colourString(baseL - 20 * lp.spread + rng2() * 6, lp, 0.4);
    ctx.lineWidth = 0.5 + rng2() * 0.7;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(startX + gx * fracLen + cx2 * drift, startY + gy * fracLen + cy2 * drift);
    ctx.stroke();
  }

  ctx.restore();
}

// Draw columns with ground-clip bottom
function drawColumns(ctx, SVX, SVY, numCols, numRows, litW, darkW,
                     groundY, bottomY, darken, specsPerCell,
                     lightBase, darkBase, lp, contrast, grainAngle, seedOffset) {
  if (seedOffset === undefined) seedOffset = 0;
  if (darken === undefined) darken = 0;

  for (var col = 0; col < numCols; col++) {
    var isLight = col % 2 === 0;
    var faceW = isLight ? litW : darkW;
    var faceL = Math.max(lp.floor, Math.min(lp.ceil, (isLight ? lightBase : darkBase) - darken));
    var rng = seededRand((col + seedOffset) * 98317 + 42);
    var finalL = Math.max(lp.floor, Math.min(lp.ceil, faceL + (rng() - 0.5) * 8 * lp.spread));
    var sp = Math.max(1, Math.round(specsPerCell * (faceW / (litW + darkW)) / numRows * 2));

    for (var r = 0; r < numRows - 1; r++) {
      var ax = SVX[col][r],     ay = SVY[col][r];
      var bx = SVX[col+1][r],   by = SVY[col+1][r];
      var cx = SVX[col+1][r+1], cy = SVY[col+1][r+1];
      var dx = SVX[col][r+1],   dy = SVY[col][r+1];

      var gL = groundY ? groundY[col]   : bottomY;
      var gR = groundY ? groundY[col+1] : bottomY;

      if (ay > gL && by > gR) continue;
      var clippedDy = Math.min(dy, gL);
      var clippedCy = Math.min(cy, gR);
      if (Math.abs(clippedDy - ay) < 0.5 && Math.abs(clippedCy - by) < 0.5) continue;

      fillFace(ctx, ax, ay, bx, by, cx, clippedCy, dx, clippedDy,
        finalL, sp, ((col + seedOffset) * 7001 + r * 13) * 100, lp, grainAngle);
    }
  }
}

// Draw soil fill and edge line below ground
function drawGroundEdge(ctx, SVX, SVY, numSeams, groundY, canvasH, lp) {
  if (!groundY || numSeams < 2) return;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(SVX[0][0], groundY[0]);
  for (var s = 1; s < numSeams; s++) ctx.lineTo(SVX[s][0], groundY[s]);
  ctx.lineTo(SVX[numSeams-1][0], canvasH + 2);
  ctx.lineTo(SVX[0][0], canvasH + 2);
  ctx.closePath();
  ctx.fillStyle = colourString(Math.round(lp.floor * 0.4), lp, 0.92);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(SVX[0][0], groundY[0]);
  for (var s = 1; s < numSeams; s++) ctx.lineTo(SVX[s][0], groundY[s]);
  ctx.strokeStyle = colourString(lp.base * 0.45, lp, 0.55);
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}

function drawGrid(ctx, W, H, dpi, gridColour, gridLineWidth) {
  var step = dpi;
  var arm = Math.max(4, Math.round(gridLineWidth * 5 + 3));
  ctx.save();
  ctx.strokeStyle = gridColour;
  ctx.lineWidth = gridLineWidth;
  ctx.setLineDash([]);
  ctx.shadowBlur = 0;
  ctx.shadowColor = 'transparent';
  for (var x = 0; x <= W; x += step) {
    var xi = Math.round(x) + 0.5;
    for (var y = 0; y <= H; y += step) {
      var yi = Math.round(y) + 0.5;
      ctx.beginPath(); ctx.moveTo(xi - arm, yi); ctx.lineTo(xi + arm, yi); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(xi, yi - arm); ctx.lineTo(xi, yi + arm); ctx.stroke();
    }
  }
  ctx.restore();
}

function drawPorts(ctx, W, H, dpi, lp, SVX, SVY, numSeams, numCols, numRows, portFont) {
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

        var portNum = placed + 1;
        var portLabel = z.name + (portNum < 10 ? '0' : '') + portNum;

        var rng2 = seededRand(zi * 10000 + row * 1000 + p * 7 + 99);
        var clogged = rng2() < 0.20;
        var clogVeg = rng2() > 0.45;

        // Dark bore hole
        ctx.beginPath();
        ctx.arc(px, py, portRadius, 0, Math.PI * 2);
        var holeL = Math.max(lp.floor * 0.5, 18 + lp.base * 0.08);
        ctx.fillStyle = colourString(holeL, lp);
        ctx.fill();

        // Clog fill
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
        ctx.save();
        ctx.beginPath();
        ctx.arc(px, py, portRadius + Math.max(1, portRadius * 0.35), 0, Math.PI * 2);
        ctx.strokeStyle = colourString(lp.base * 0.75, lp, 0.7);
        ctx.lineWidth = Math.max(0.8, portRadius * 0.2);
        ctx.stroke();
        ctx.restore();

        // Tampered indicator
        if (tampered) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(px, py, portRadius + Math.max(2, portRadius * 0.6), 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(255,160,40,0.7)';
          ctx.lineWidth = Math.max(1, portRadius * 0.25);
          ctx.setLineDash([3, 2]);
          ctx.stroke();
          ctx.restore();
        }

        // Port label
        ctx.save();
        ctx.font = 'bold ' + fnt + 'px monospace';
        ctx.textAlign = 'center';
        ctx.shadowColor = '#000';
        ctx.shadowBlur = 2;
        ctx.fillStyle = 'rgba(255,220,100,0.85)';
        ctx.fillText(portLabel, px, py + portRadius + fnt + 1);
        ctx.restore();

        // Clog label
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

function drawDebug(ctx, W, H, SVX, SVY, numSeams, numCols, numRows) {
  for (var s = 0; s < numSeams; s++) {
    ctx.save(); ctx.strokeStyle = '#ffe84d'; ctx.lineWidth = 1; ctx.setLineDash([5,4]);
    ctx.beginPath(); ctx.moveTo(SVX[s][0], SVY[s][0]);
    for (var r = 1; r < numRows; r++) ctx.lineTo(SVX[s][r], SVY[s][r]);
    ctx.stroke(); ctx.restore();
  }
  var midR = Math.floor(numRows / 2);
  for (var col = 0; col < numCols; col++) {
    var cxm = (SVX[col][midR] + SVX[col+1][midR]) * 0.5;
    if (cxm > 0 && cxm < W) {
      var isLight = col % 2 === 0;
      ctx.save(); ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center';
      ctx.shadowColor = '#000'; ctx.shadowBlur = 3;
      ctx.fillStyle = isLight ? '#ffe84d' : '#44bbff';
      ctx.fillText(col + (isLight ? ' lit' : ' shd'), cxm, H - 8);
      ctx.restore();
    }
  }
}

// Render foreground clusters
function renderForegroundClusters(ctx, W, H, dpi, clusters, T, xyRoughness,
                                  litRatio, groundY, mainNumSeams,
                                  specsPerCell, lightBase, darkBase,
                                  lp, contrast, grainAngle, viewAngleDeg) {
  for (var ci = 0; ci < clusters.length; ci++) {
    var cl = clusters[ci];
    var clH = H * cl.heightFrac;   // height of this cluster in pixels
    var yTop = H - clH;            // Y offset: clusters are anchored at the BOTTOM

    var clW = cl.colCount * T * 2 + T * 4;
    // Build seams using the full canvas height so fracture rows match the background.
    // We pass H so SVY goes 0→H; we'll translate everything by yTop.
    var clSeams = buildSeams(clW, H, T, xyRoughness, litRatio, cl.xOffset);

    // Shift seam X by cluster's xStart; shift seam Y down by yTop
    var clSVX = [], clSVY = [];
    for (var s = 0; s < clSeams.numSeams; s++) {
      clSVX[s] = [];
      clSVY[s] = [];
      for (var r = 0; r < clSeams.numRows; r++) {
        clSVX[s][r] = clSeams.SVX[s][r] + cl.xStart;
        // SVY[s][r] is in 0..H; translate so the cluster top aligns to yTop
        clSVY[s][r] = clSeams.SVY[s][r];  // keep native Y — SVY already spans 0..H
      }
    }

    // Per-seam ground Y: interpolate main wall groundY at cluster seam X positions
    var clGroundY = [];
    for (var s = 0; s < clSeams.numSeams; s++) {
      var t = Math.max(0, Math.min(1, clSVX[s][0] / W));
      var mi = Math.max(0, Math.min(mainNumSeams - 2, Math.floor(t * (mainNumSeams - 1))));
      var frac = t * (mainNumSeams - 1) - mi;
      var gMain = groundY[mi] * (1 - frac) + groundY[Math.min(mi + 1, mainNumSeams - 1)] * frac;
      // Cluster top is yTop; its bottom follows the same ground as the main wall
      clGroundY[s] = gMain;
    }

    // Small fixed darken — just enough to read as "in front" without killing texture
    var darkenAmount = 6 + ci * 2;
    var usedCols = Math.min(cl.colCount, clSeams.numCols);

    // Cap height needed above yTop (must match drawHexTopCaps calculation)
    var capH = (clSeams.litW + clSeams.darkW) / 2 * 0.28;

    // Clip canvas to cluster columns + cap height above + ground below
    ctx.save();
    ctx.beginPath();
    ctx.rect(cl.xStart - T * 2, yTop - capH - 4, clW + T * 4, H - yTop + capH + 4);
    ctx.clip();

    drawColumns(ctx, clSVX, clSVY, usedCols, clSeams.numRows,
      clSeams.litW, clSeams.darkW, clGroundY, H, darkenAmount, specsPerCell,
      lightBase, darkBase, lp, contrast, grainAngle, cl.seed);

    // Hex top caps — foreshortened top face of each column, drawn above yTop
    drawHexTopCaps(ctx, clSVX, clSVY, usedCols, clSeams.numRows,
      clSeams.litW, clSeams.darkW, yTop, lp,
      lightBase, darkBase, grainAngle, viewAngleDeg, cl.seed);

    ctx.restore();
    // No drawGroundEdge here — main wall ground fill already handles the soil strip
  }
}

// ── Hex top caps for foreground clusters ─────────────────────────
// Each column gets a foreshortened top face drawn above yTop,
// simulating an oblique view of the hexagonal prism top.
//
// The cap is a quadrilateral:
//   bottom edge = the column's two seam X values at yTop (full width)
//   top edge    = inset slightly and raised by capH pixels
//
// Lit columns (even): top face catches light — brighter than the front face.
// Dark columns (odd): top face is mid-tone, partly shadowed.
// Each cap uses fillFace for basalt texture consistency.
//
// viewAngleDeg controls the horizontal skew of the top edge:
//   positive angle tilts the top edge to the right (light from upper-left).
// capH is derived from colWidth and a fixed oblique elevation (~20°).

function drawHexTopCaps(ctx, SVX, SVY, numCols, numRows, litW, darkW,
                        yTop, lp, lightBase, darkBase, grainAngle,
                        viewAngleDeg, seedOffset) {
  if (seedOffset === undefined) seedOffset = 0;

  // Cap height: simulate ~18° elevation angle — sin(18°) ≈ 0.31
  // Use the average column width as the reference dimension
  var pairW = litW + darkW;
  var colW   = pairW / 2;
  var capH   = colW * 0.28;   // vertical pixel depth of the top face
  // Horizontal skew: top edge shifts right as view angle increases
  // (the far edge of the hex top is displaced by tan(viewAngle) * capH)
  var skewX  = Math.tan((viewAngleDeg || 0) * Math.PI / 180) * capH * 0.6;

  // Helper: interpolate seam X at a given Y
  function seamXatY(seam, y) {
    if (!SVX[seam]) return 0;
    for (var r = 0; r < numRows - 1; r++) {
      if (SVY[seam][r] <= y && SVY[seam][r + 1] >= y) {
        var frac = (y - SVY[seam][r]) / (SVY[seam][r + 1] - SVY[seam][r]);
        return SVX[seam][r] + frac * (SVX[seam][r + 1] - SVX[seam][r]);
      }
    }
    return SVX[seam][0];
  }

  for (var col = 0; col < numCols; col++) {
    if (!SVX[col] || !SVX[col + 1]) continue;

    var isLight = col % 2 === 0;
    var faceW = isLight ? litW : darkW;

    // Bottom edge of cap at yTop
    var bL = seamXatY(col,     yTop);
    var bR = seamXatY(col + 1, yTop);

    // Top edge of cap: raised by capH, inset by a small fraction (hex foreshortening)
    // The inset makes the top face narrower than the column face — hex geometry.
    // For a regular hex viewed obliquely, the top face width = column face width * cos(30°) ≈ 0.866
    // We approximate by insetting each edge by ~7% of column width.
    var inset  = faceW * 0.07;
    var tL = bL + inset  + skewX * 0.5;
    var tR = bR - inset  + skewX * 0.5;
    var tY = yTop - capH;

    // Skip degenerate caps
    if (Math.abs(bR - bL) < 2 || capH < 1) continue;

    // Brightness: top face of a hex column catches more light than the front face.
    // Lit columns: top is noticeably brighter. Dark columns: top is mid-tone.
    var topBase = isLight
      ? Math.min(lp.ceil, lightBase * 1.18)   // brighter — lit top face
      : Math.min(lp.ceil, (lightBase + darkBase) * 0.52); // mid-tone

    var rng = seededRand((col + seedOffset) * 55441 + 7);
    var vary = (rng() - 0.5) * 10 * lp.spread;
    var finalL = Math.max(lp.floor, Math.min(lp.ceil, topBase + vary));

    var sp = Math.max(1, Math.round(faceW * capH / 800));

    // Draw using fillFace for full basalt texture
    // Quad: bottom-left, bottom-right, top-right, top-left
    fillFace(
      ctx,
      bL, yTop,       // bottom-left
      bR, yTop,       // bottom-right
      tR, tY,         // top-right
      tL, tY,         // top-left
      finalL, sp,
      (col + seedOffset) * 33331 + 9901,
      lp,
      0   // grain angle 0° (horizontal) — top face grain runs across the column
    );

    // Thin dark seam line along the bottom of the cap (where top meets front face)
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(bL, yTop);
    ctx.lineTo(bR, yTop);
    ctx.strokeStyle = colourString(lp.base * 0.38, lp, 0.7);
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();

    // Thin highlight along the top ridge of the cap
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(tL, tY);
    ctx.lineTo(tR, tY);
    ctx.strokeStyle = colourString(lp.ceil * 0.72, lp, 0.45);
    ctx.lineWidth = 0.8;
    ctx.stroke();
    ctx.restore();
  }
}

// Main render
function render() {
  var params = readParams();
  if (!params) return;

  var ctx = params.ctx, W = params.W, H = params.H, T = params.T, lp = params.lp;

  ctx.fillStyle = colourString(Math.round(lp.floor * 0.7) * 0.85, lp);
  ctx.fillRect(0, 0, W, H);

  var seams = buildSeams(W, H, T, params.xyRoughness, params.litRatio);
  var SVX = seams.SVX, SVY = seams.SVY;
  var numCols = seams.numCols, numRows = seams.numRows, numSeams = seams.numSeams;

  var groundY = buildGroundLine(numSeams, H, params.dpi, params.groundVariance);

  var specsPerCell = Math.max(3, Math.round(params.texDensity * (T * H) / 18000));
  var lightBase = lp.base * (1 + params.contrast * 0.25);
  var darkBase  = lp.base * (1 - params.contrast * 0.25);

  // ── LAYER 1: background wall ──────────────────────────────────────
  drawColumns(ctx, SVX, SVY, numCols, numRows, seams.litW, seams.darkW,
    groundY, H, 0, specsPerCell, lightBase, darkBase, lp, params.contrast, params.grainAngle, 0);
  drawGroundEdge(ctx, SVX, SVY, numSeams, groundY, H, lp);

  // ── LAYER 2: foreground column clusters (extensible for more layers) ──
  if (params.clusterCount > 0) {
    var clusters = buildForegroundClusters(params.clusterCount, W, H, T, params.dpi);
    renderForegroundClusters(ctx, W, H, params.dpi, clusters, T, params.xyRoughness,
      params.litRatio, groundY, numSeams, specsPerCell, lightBase, darkBase,
      lp, params.contrast, params.grainAngle, params.viewAngleDeg);
  }

  // ── LAYER 3: subtle left-light wash (stone only, under labels) ────
  var grad = ctx.createLinearGradient(0, 0, W * 0.07, 0);
  grad.addColorStop(0, 'rgba(255,255,255,' + (0.02 + params.brightness * 0.04) + ')');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // ── LAYER 4: TSU-9 port labels ────────────────────────────────────
  if (params.showPorts) drawPorts(ctx, W, H, params.dpi, lp, SVX, SVY, numSeams, numCols, numRows, params.portFont);

  // ── LAYER 5: print grid ───────────────────────────────────────────
  if (params.showGrid)  drawGrid(ctx, W, H, params.dpi, params.gridColour, params.gridLineWidth);

  // ── LAYER 6: debug overlay ────────────────────────────────────────
  if (params.debug)     drawDebug(ctx, W, H, SVX, SVY, numSeams, numCols, numRows);
}
