/**
 * actions.js — Basalt Column Wall Generator
 * DOM wiring, parameter reading, render scheduling, PNG download.
 * v1.23 — Simplified alternating light/dark vertical rectangles.
 *
 * Depends on: geometry.js (m2px), render.js (render, lightParams)
 */

var VERSION = '1.24';
var MAX_PIXELS = 20000000;
var raf = null;

// ── DOM helpers ───────────────────────────────────────────────────

function $(id) {
  return document.getElementById(id);
}

function schedule() {
  if (!raf) {
    raf = requestAnimationFrame(function () {
      raf = null;
      render();
    });
  }
}

// ── Wire a slider/input to its label and the render loop ──────────

function wire(id, labelFn) {
  var el = $(id);
  el.oninput = function () {
    if (labelFn) {
      $(id + '-out').textContent = labelFn(el.value);
    }
    schedule();
  };
}

// ── Read all params from the DOM ──────────────────────────────────
// Called by render() each frame. Returns null if canvas too large.

function readParams() {
  var cvs = $('c');
  var ctx = cvs.getContext('2d');

  var Wm = Math.max(0.5, parseFloat($('cwm').value) || 36);
  var Hm = Math.max(0.5, parseFloat($('chm').value) || 45);
  var dpi = Math.max(72, parseInt($('dpi').value) || 100);
  var colM = Math.max(0.2, parseFloat($('colm').value) || 0.6);
  var ct = (parseInt($('ct').value) || 45) / 100;
  var bv = (parseInt($('bright').value) || 80) / 100;
  var er = (parseInt($('er').value) || 35) / 100;
  var tex = parseInt($('td').value) || 100;
  var showGrid = $('grid').checked;
  var gcol = $('gcol').value;
  var glw = parseFloat($('glw').value) || 1;
  var showPorts = $('ports').checked;
  var debug = $('dbg').checked;

  var W = Math.round(m2px(Wm, dpi));
  var H = Math.round(m2px(Hm, dpi));
  var T = Math.round(m2px(colM, dpi));

  // Info line
  var pWin = (W / dpi).toFixed(1);
  var pHin = (H / dpi).toFixed(1);
  $('info').textContent = 'v' + VERSION + ' | ' + W + 'x' + H + 'px | '
    + pWin + 'x' + pHin + '" print | col=' + T + 'px (' + colM + 'm)';

  if (W * H > MAX_PIXELS) {
    $('info').textContent += ' | TOO LARGE — lower DPI or dims';
    return null;
  }

  cvs.width = W;
  cvs.height = H;

  if (T < 4) {
    $('info').textContent += ' | col too small';
    return null;
  }

  var lp = lightParams(bv);

  return {
    ctx: ctx,
    W: W,
    H: H,
    T: T,
    dpi: dpi,
    contrast: ct,
    brightness: bv,
    xyRoughness: er,
    texDensity: tex,
    showGrid: showGrid,
    gridColour: gcol,
    gridLineWidth: glw,
    showPorts: showPorts,
    debug: debug,
    lp: lp
  };
}

// ── PNG download ──────────────────────────────────────────────────

function downloadPNG() {
  var a = document.createElement('a');
  var wm = $('cwm').value || 36;
  var hm = $('chm').value || 45;
  var dpi = $('dpi').value || 100;
  a.download = 'basalt_' + wm + 'x' + hm + 'm_' + dpi + 'dpi.png';
  a.href = $('c').toDataURL('image/png');
  a.click();
}

// ── Init ──────────────────────────────────────────────────────────

function init() {
  // Slider wiring
  wire('colm', function (v) { return parseFloat(v).toFixed(2) + 'm'; });
  wire('ct', function (v) { return v + '%'; });
  wire('bright', function (v) {
    var n = parseInt(v);
    if (n >= 75) return 'Day ' + n + '%';
    if (n >= 45) return 'Dusk ' + n + '%';
    if (n >= 20) return 'Moon ' + n + '%';
    return 'Night ' + n + '%';
  });
  wire('er', function (v) { return v + '%'; });
  wire('td', function (v) { return v; });
  wire('glw', function (v) { return v + 'px'; });

  // Number inputs and checkboxes — schedule on change
  $('cwm').onchange = schedule;
  $('chm').onchange = schedule;
  $('dpi').onchange = schedule;
  $('grid').onchange = schedule;
  $('gcol').onchange = schedule;
  $('ports').onchange = schedule;
  $('dbg').onchange = schedule;

  // Download button
  $('btn-dl').onclick = downloadPNG;

  // Initial render
  render();
}

// Run init when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
