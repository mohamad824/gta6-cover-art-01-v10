'use strict';
/* NEON VICE Cover Studio — canvas-rendered 7-panel GTA-style cover maker.
   The cover is drawn on a 1280x720 canvas (same draw code powers the live
   preview and every PNG export), so what you see is what you save. */

var CW = 1280, CH = 720, B = 6; /* cover size and dark border */
var NAVY = '#04081a', NAVY2 = '#050b18', PINK = '#ff2eaa', CYAN = '#17b6e6';
var SANS = '"Liberation Sans","DejaVu Sans",Arial,sans-serif';

var PHOTOS = ['hero.jpg', 'portrait.jpg', 'car.jpg', 'crew.jpg', 'heli.jpg', 'bike.jpg', 'gas.jpg'];
var NAMES = ['Hero', 'Portrait', 'Car', 'Crew', 'Heli', 'Bike', 'Gas'];

function defaultPanels() {
  return [
    { src: 'photos/hero.jpg',     place: 'NEON MILE',    time: '11:42 PM', flavor: 'FIRST DROP',      fx: 0.50, fy: 0.45, zoom: 1, dx: 0, dy: 0 },
    { src: 'photos/portrait.jpg', place: 'ROOFTOP 9',    time: '1:15 AM',  flavor: 'LAST LIGHT',      fx: 0.50, fy: 0.42, zoom: 1, dx: 0, dy: 0 },
    { src: 'photos/car.jpg',      place: 'INTERSTATE 6', time: '2:30 AM',  flavor: 'FULL THROTTLE',   fx: 0.50, fy: 0.55, zoom: 1, dx: 0, dy: 0 },
    { src: 'photos/crew.jpg',     place: 'PIER 26',      time: '12:10 AM', flavor: 'LOW TIDE',        fx: 0.50, fy: 0.45, zoom: 1, dx: 0, dy: 0 },
    { src: 'photos/heli.jpg',     place: 'TOWER 2',      time: '11:15 PM', flavor: 'SPOTLIGHT',       fx: 0.50, fy: 0.35, zoom: 1, dx: 0, dy: 0 },
    { src: 'photos/bike.jpg',     place: 'ALLEY 7',      time: '1:04 AM',  flavor: 'NO TURNING BACK', fx: 0.44, fy: 0.45, zoom: 1, dx: 0, dy: 0 },
    { src: 'photos/gas.jpg',      place: 'ROUTE 27',     time: '3:47 AM',  flavor: 'LIGHTS OUT',      fx: 0.50, fy: 0.50, zoom: 1, dx: 0, dy: 0 }
  ];
}

var state = {
  layout: 'story',
  night: true,
  wanted: true,
  title: 'NEON VICE',
  script: 'Midnight Rain',
  quote: 'THE CITY NEVER DRIES',
  source: 'VICE FM 99.9',
  tag: 'THE CITY NEVER DRIES · COMING SOON',
  panels: defaultPanels()
};

/* Panel rects per layout, in 1280x720 cover coordinates. */
var LAYOUTS = {
  story: {
    rects: [
      [6, 6, 642, 658], [654, 6, 308, 242], [968, 6, 306, 242], [654, 254, 620, 200],
      [654, 460, 204, 204], [864, 460, 204, 204], [1074, 460, 200, 204]
    ],
    title: [20, 470, 520, 120], script: [390, 585, 230, 71],
    burst: [648, 140, 36]
  },
  classic: {
    rects: [
      [6, 6, 760, 520], [772, 6, 502, 254], [772, 266, 502, 260], [6, 532, 860, 132],
      [872, 532, 402, 132]
    ],
    title: [20, 396, 480, 110], script: [520, 452, 220, 68],
    burst: [766, 140, 32]
  },
  hero: {
    rects: [
      [6, 6, 900, 658], [912, 6, 362, 214], [912, 226, 362, 214], [912, 446, 362, 218]
    ],
    title: [20, 470, 560, 129], script: [400, 588, 240, 74],
    burst: [906, 140, 36]
  }
};
/* Which default panel index each layout slot shows. */
var LAYOUT_PANELS = { story: [0, 1, 2, 3, 4, 5, 6], classic: [0, 1, 2, 3, 4], hero: [0, 1, 2, 4] };

/* ---------- image loading ---------- */
var cache = {};
function loadImage(src) {
  if (cache[src]) return cache[src];
  var p = new Promise(function (res, rej) {
    var im = new Image();
    im.onload = function () { res(im); };
    im.onerror = function () { rej(new Error('cannot load ' + src)); };
    im.src = src;
  });
  cache[src] = p;
  return p;
}
function loadAll() {
  var list = ['title.png', 'script.png'];
  state.panels.forEach(function (p) { if (list.indexOf(p.src) < 0) list.push(p.src); });
  return Promise.all(list.map(loadImage)).then(function () { return true; });
}

/* ---------- deterministic rain ---------- */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    var t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- cover drawing ---------- */
function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawPhoto(ctx, img, p, r, s) {
  var x = r[0] * s, y = r[1] * s, w = r[2] * s, h = r[3] * s;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  var iw = img.naturalWidth, ih = img.naturalHeight;
  var scale = Math.max(w / iw, h / ih) * p.zoom;
  var vw = w / scale, vh = h / scale;
  var cx = p.fx * iw + (p.dx / 100) * iw;
  var cy = p.fy * ih + (p.dy / 100) * ih;
  var sx = Math.max(0, Math.min(iw - vw, cx - vw / 2));
  var sy = Math.max(0, Math.min(ih - vh, cy - vh / 2));
  ctx.drawImage(img, sx, sy, vw, vh, x, y, w, h);
  /* night grade: cool the shadows, lift the neon */
  if (state.night) {
    ctx.fillStyle = 'rgba(20,40,110,0.10)';
    ctx.fillRect(x, y, w, h);
  } else {
    ctx.fillStyle = 'rgba(255,140,60,0.13)';
    ctx.fillRect(x, y, w, h);
  }
  ctx.restore();
}

function drawChip(ctx, text1, text2, x, y, s, alignRight) {
  ctx.save();
  ctx.font = '700 ' + Math.round(13 * s) + 'px ' + SANS;
  var w1 = ctx.measureText(text1).width;
  ctx.font = '700 ' + Math.round(10.5 * s) + 'px ' + SANS;
  var w2 = ctx.measureText(text2).width;
  var w = Math.max(w1, w2) + 18 * s;
  var h = 34 * s;
  var bx = alignRight ? x - w : x;
  ctx.fillStyle = 'rgba(4,10,24,0.86)';
  rr(ctx, bx, y, w, h, 5 * s);
  ctx.fill();
  ctx.strokeStyle = 'rgba(23,182,230,0.55)';
  ctx.lineWidth = 1 * s;
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 ' + Math.round(13 * s) + 'px ' + SANS;
  ctx.textBaseline = 'middle';
  ctx.fillText(text1, bx + 9 * s, y + 11 * s);
  ctx.fillStyle = CYAN;
  ctx.font = '700 ' + Math.round(10.5 * s) + 'px ' + SANS;
  ctx.fillText(text2, bx + 9 * s, y + 25 * s);
  ctx.restore();
}

function drawPill(ctx, text, x, y, s, fill, fg) {
  ctx.save();
  ctx.font = '700 ' + Math.round(13 * s) + 'px ' + SANS;
  var w = ctx.measureText(text).width + 20 * s;
  var h = 26 * s;
  ctx.fillStyle = fill;
  rr(ctx, x, y, w, h, h / 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.65)';
  ctx.lineWidth = 1 * s;
  ctx.stroke();
  ctx.fillStyle = fg;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + 10 * s, y + h / 2 + 0.5 * s);
  ctx.restore();
  return w;
}

function drawBurst(ctx, cx, cy, r, s, lines) {
  ctx.save();
  ctx.translate(cx * s, cy * s);
  ctx.beginPath();
  var N = 12;
  for (var i = 0; i < N * 2; i++) {
    var rad = (i % 2 === 0 ? r : r * 0.72) * s;
    var a = (Math.PI * i) / N - Math.PI / 2;
    var px = Math.cos(a) * rad, py = Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = PINK;
  ctx.shadowColor = PINK;
  ctx.shadowBlur = 14 * s;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#2a0430';
  ctx.lineWidth = 2 * s;
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '700 ' + Math.round(11 * s) + 'px ' + SANS;
  ctx.fillText(lines[0], 0, -7 * s);
  ctx.font = '700 ' + Math.round(13 * s) + 'px ' + SANS;
  ctx.fillText(lines[1], 0, 6 * s);
  ctx.restore();
}

function drawBarcode(ctx, x, y, w, h, s) {
  ctx.save();
  ctx.fillStyle = '#e8f1ff';
  var rnd = mulberry32(2026);
  var px = x;
  while (px < x + w) {
    var bw = (1 + Math.floor(rnd() * 3)) * s;
    if (rnd() > 0.42) ctx.fillRect(px, y, bw, h);
    px += bw + (1 + Math.floor(rnd() * 3)) * s;
  }
  ctx.restore();
}

function chromeText(ctx, text, x, y, w, h, s) {
  /* Fallback lettering when the title text is edited away from the default:
     canvas gradient fill + dark stroke + magenta glow. */
  var size = Math.round(h * 0.82);
  ctx.save();
  ctx.font = '700 ' + size + 'px ' + SANS;
  while (ctx.measureText(text).width > w && size > 24) {
    size -= 4;
    ctx.font = '700 ' + size + 'px ' + SANS;
  }
  var g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, '#f4f8ff');
  g.addColorStop(0.45, '#cfeefc');
  g.addColorStop(0.75, '#78dcf5');
  g.addColorStop(1, '#17b6e6');
  ctx.shadowColor = PINK;
  ctx.shadowBlur = 12 * s;
  ctx.lineWidth = Math.max(4, Math.round(7 * s));
  ctx.strokeStyle = '#050d1c';
  ctx.lineJoin = 'round';
  ctx.textBaseline = 'middle';
  ctx.strokeText(text, x, y + h / 2);
  ctx.shadowBlur = 0;
  ctx.fillStyle = g;
  ctx.fillText(text, x, y + h / 2);
  ctx.restore();
}

function drawCover(canvas, opts) {
  opts = opts || {};
  var ctx = canvas.getContext('2d');
  var W = canvas.width, H = canvas.height, s = W / CW;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = state.night ? NAVY : '#131c33';
  ctx.fillRect(0, 0, W, H);
  var L = LAYOUTS[state.layout];
  var slots = LAYOUT_PANELS[state.layout];
  var imgs = opts.imgs || {};
  slots.forEach(function (pi, i) {
    var p = state.panels[pi];
    var img = imgs[p.src];
    if (img) drawPhoto(ctx, img, p, L.rects[i], s);
  });
  /* rain streaks, deterministic */
  var rnd = mulberry32(90210);
  ctx.save();
  ctx.strokeStyle = 'rgba(210,230,255,0.10)';
  ctx.lineWidth = 1 * s;
  for (var k = 0; k < 90; k++) {
    var rx = rnd() * CW, ry = rnd() * CH, len = (14 + rnd() * 26);
    ctx.beginPath();
    ctx.moveTo(rx * s, ry * s);
    ctx.lineTo((rx - 3) * s, (ry + len) * s);
    ctx.stroke();
  }
  ctx.restore();
  /* caption chips on every visible panel */
  slots.forEach(function (pi, i) {
    var p = state.panels[pi];
    var r = L.rects[i];
    var label = p.place + ' · ' + p.time;
    if (i === 0) {
      drawChip(ctx, label, p.flavor, (r[0] + 8) * s, (r[1] + 8) * s, s, false);
    } else {
      drawChip(ctx, label, p.flavor, (r[0] + 8) * s, (r[1] + r[3] - 42) * s, s, false);
    }
  });
  /* WANTED pill: top of the heli slot, never over the title */
  if (state.wanted) {
    var heliSlot = slots.indexOf(4);
    if (heliSlot >= 0) {
      var hr = L.rects[heliSlot];
      drawPill(ctx, 'WANTED ★★★★★', (hr[0] + 8) * s, (hr[1] + 8) * s, s, 'rgba(120,8,40,0.92)', '#ffffff');
    }
  }
  /* 5-star pill on the car slot */
  var carSlot = slots.indexOf(2);
  if (carSlot >= 0) {
    var cr = L.rects[carSlot];
    ctx.save();
    ctx.font = '700 ' + Math.round(15 * s) + 'px ' + SANS;
    var tw = ctx.measureText('★★★★★').width;
    drawPill(ctx, '★★★★★', (cr[0] + cr[2] - tw - 28) * s, (cr[1] + 8) * s, s, 'rgba(4,10,24,0.88)', '#ffd94d');
    ctx.restore();
  }
  /* VOL. 10 chip on the gas slot (story layout only) */
  var gasSlot = slots.indexOf(6);
  if (gasSlot >= 0) {
    var gr = L.rects[gasSlot];
    drawPill(ctx, 'VOL. 10', (gr[0] + gr[2] - 78) * s, (gr[1] + 8) * s, s, 'rgba(4,10,24,0.88)', CYAN);
  }
  /* starburst at the hero / right-column seam */
  drawBurst(ctx, L.burst[0], L.burst[1], L.burst[2], s, ['EST.', '2026']);
  /* title + script (PIL-rendered PNGs for the default text) */
  var ti = imgs['title.png'], si = imgs['script.png'];
  var tr = L.title, sr = L.script;
  if (state.title === 'NEON VICE' && ti) {
    ctx.drawImage(ti, tr[0] * s, tr[1] * s, tr[2] * s, tr[3] * s);
  } else {
    chromeText(ctx, state.title, tr[0] * s, tr[1] * s, tr[2] * s, tr[3] * s, s);
  }
  if (state.script === 'Midnight Rain' && si) {
    ctx.drawImage(si, sr[0] * s, sr[1] * s, sr[2] * s, sr[3] * s);
  } else if (state.script) {
    ctx.save();
    ctx.font = 'italic 700 ' + Math.round(sr[3] * 0.62) + 'px ' + SANS;
    ctx.fillStyle = '#ff5ec4';
    ctx.shadowColor = PINK;
    ctx.shadowBlur = 10 * s;
    ctx.textBaseline = 'middle';
    ctx.fillText(state.script, sr[0] * s, (sr[1] + sr[3] / 2) * s);
    ctx.restore();
  }
  /* bottom strip: quote bar + tagline + barcode */
  ctx.fillStyle = state.night ? NAVY2 : '#101a30';
  ctx.fillRect(B * s, 668 * s, (CW - 2 * B) * s, 46 * s);
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 ' + Math.round(19 * s) + 'px ' + SANS;
  ctx.textBaseline = 'middle';
  var q = '★★★★★  “' + state.quote + '” — ' + state.source;
  ctx.fillText(q, 22 * s, 691 * s);
  ctx.fillStyle = CYAN;
  ctx.font = '700 ' + Math.round(11 * s) + 'px ' + SANS;
  ctx.textAlign = 'right';
  ctx.fillText(state.tag, 1108 * s, 691 * s);
  ctx.textAlign = 'left';
  drawBarcode(ctx, 1120 * s, 676 * s, 132 * s, 30 * s, s);
  /* dark outer border */
  ctx.strokeStyle = state.night ? '#02040c' : '#0a1230';
  ctx.lineWidth = B * s;
  ctx.strokeRect((B / 2) * s, (B / 2) * s, (CW - B) * s, (CH - B) * s);
  return ctx;
}

function letterboxed(width, height) {
  var c = document.createElement('canvas');
  c.width = width;
  c.height = height;
  var ctx = c.getContext('2d');
  ctx.fillStyle = NAVY;
  ctx.fillRect(0, 0, width, height);
  var off = document.createElement('canvas');
  off.width = CW;
  off.height = CH;
  drawCover(off, { imgs: window.__imgs });
  var scale = Math.min(width / CW, height / CH);
  var dw = CW * scale, dh = CH * scale;
  ctx.drawImage(off, (width - dw) / 2, (height - dh) / 2, dw, dh);
  return c;
}

/* ---------- editor ---------- */
var coverCanvas = document.getElementById('cover');
var selected = 0;

function render() {
  if (!window.__imgs) return;
  drawCover(coverCanvas, { imgs: window.__imgs });
}

function $(id) { return document.getElementById(id); }

function bindText(id, key) {
  $(id).addEventListener('input', function (e) {
    state[key] = e.target.value;
    render();
  });
}

function selectPanel(i) {
  selected = i;
  var p = state.panels[i];
  document.querySelectorAll('#panelPick button').forEach(function (b, j) {
    b.classList.toggle('on', j === i);
  });
  document.querySelectorAll('#thumbRow img').forEach(function (im, j) {
    im.classList.toggle('on', PHOTOS[j] === p.src.replace('photos/', ''));
  });
  $('fPlace').value = p.place;
  $('fTime').value = p.time;
  $('fFlavor').value = p.flavor;
  $('fZoom').value = p.zoom;
  $('fDx').value = p.dx;
  $('fDy').value = p.dy;
  $('zoomV').textContent = Number(p.zoom).toFixed(2) + '×';
  $('dxV').textContent = p.dx;
  $('dyV').textContent = p.dy;
}

function initEditor() {
  var pick = $('panelPick');
  NAMES.forEach(function (n, i) {
    var b = document.createElement('button');
    b.textContent = n;
    b.addEventListener('click', function () { selectPanel(i); });
    pick.appendChild(b);
  });
  var thumbs = $('thumbRow');
  PHOTOS.forEach(function (f, i) {
    var im = document.createElement('img');
    im.src = 'photos/' + f;
    im.alt = NAMES[i];
    im.addEventListener('click', function () {
      var p = state.panels[selected];
      p.src = 'photos/' + f;
      loadImage(p.src).then(function (img) {
        window.__imgs[p.src] = img;
        render();
        selectPanel(selected);
      });
    });
    thumbs.appendChild(im);
  });
  document.querySelectorAll('#layoutRow button').forEach(function (b) {
    b.addEventListener('click', function () {
      state.layout = b.getAttribute('data-layout');
      document.querySelectorAll('#layoutRow button').forEach(function (x) {
        x.classList.toggle('on', x === b);
      });
      render();
    });
  });
  $('nightBtn').addEventListener('click', function () {
    state.night = true;
    $('nightBtn').classList.add('on');
    $('dayBtn').classList.remove('on');
    render();
  });
  $('dayBtn').addEventListener('click', function () {
    state.night = false;
    $('dayBtn').classList.add('on');
    $('nightBtn').classList.remove('on');
    render();
  });
  $('wantedBtn').addEventListener('click', function () {
    state.wanted = !state.wanted;
    $('wantedBtn').classList.toggle('on', state.wanted);
    render();
  });
  bindText('fTitle', 'title');
  bindText('fScript', 'script');
  bindText('fQuote', 'quote');
  bindText('fSource', 'source');
  bindText('fTag', 'tag');
  [['fPlace', 'place'], ['fTime', 'time'], ['fFlavor', 'flavor']].forEach(function (pair) {
    $(pair[0]).addEventListener('input', function (e) {
      state.panels[selected][pair[1]] = e.target.value;
      render();
    });
  });
  $('fZoom').addEventListener('input', function (e) {
    state.panels[selected].zoom = Number(e.target.value);
    $('zoomV').textContent = Number(e.target.value).toFixed(2) + '×';
    render();
  });
  $('fDx').addEventListener('input', function (e) {
    state.panels[selected].dx = Number(e.target.value);
    $('dxV').textContent = e.target.value;
    render();
  });
  $('fDy').addEventListener('input', function (e) {
    state.panels[selected].dy = Number(e.target.value);
    $('dyV').textContent = e.target.value;
    render();
  });
  $('fUpload').addEventListener('change', function (e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      var src = String(reader.result);
      var p = state.panels[selected];
      p.src = src;
      p.zoom = 1; p.dx = 0; p.dy = 0;
      loadImage(src).then(function (img) {
        window.__imgs[src] = img;
        render();
        selectPanel(selected);
      });
    };
    reader.readAsDataURL(file);
  });
  document.querySelectorAll('[data-exp]').forEach(function (b) {
    b.addEventListener('click', function () {
      var parts = b.getAttribute('data-exp').split('x');
      var w = Number(parts[0]), h = Number(parts[1]);
      var out;
      if (w === CW && h === CH) {
        out = document.createElement('canvas');
        out.width = CW; out.height = CH;
        drawCover(out, { imgs: window.__imgs });
      } else if (w === 1920 && h === 1080) {
        out = document.createElement('canvas');
        out.width = 1920; out.height = 1080;
        drawCover(out, { imgs: window.__imgs });
      } else {
        out = letterboxed(w, h);
      }
      var a = document.createElement('a');
      a.download = 'neon-vice-' + w + 'x' + h + '.png';
      a.href = out.toDataURL('image/png');
      a.click();
    });
  });
  $('resetBtn').addEventListener('click', function () {
    var keep = state.layout;
    state.panels = defaultPanels();
    state.title = 'NEON VICE';
    state.script = 'Midnight Rain';
    state.quote = 'THE CITY NEVER DRIES';
    state.source = 'VICE FM 99.9';
    state.tag = 'THE CITY NEVER DRIES · COMING SOON';
    state.layout = keep;
    $('fTitle').value = state.title;
    $('fScript').value = state.script;
    $('fQuote').value = state.quote;
    $('fSource').value = state.source;
    $('fTag').value = state.tag;
    selectPanel(0);
    render();
  });
  selectPanel(0);
}

/* ---------- screenshot modes (?shot=cover|square|portrait) ---------- */
function shotMode() {
  var q = new URLSearchParams(window.location.search);
  return q.get('shot') || '';
}

function initShot() {
  var mode = shotMode();
  if (!mode) return false;
  document.body.classList.add('shot-' + mode);
  var sc = $('shot');
  if (mode === 'cover') {
    sc.width = 1280; sc.height = 720;
    drawCover(sc, { imgs: window.__imgs });
  } else if (mode === 'square') {
    var sq = letterboxed(1080, 1080);
    sc.width = 1080; sc.height = 1080;
    sc.getContext('2d').drawImage(sq, 0, 0);
  } else if (mode === 'portrait') {
    var po = letterboxed(1080, 1350);
    sc.width = 1024; sc.height = 1280;
    sc.getContext('2d').drawImage(po, 0, 0, 1024, 1280);
  }
  return true;
}

loadAll().then(function () {
  window.__imgs = {};
  var jobs = ['title.png', 'script.png'];
  state.panels.forEach(function (p) { if (jobs.indexOf(p.src) < 0) jobs.push(p.src); });
  return Promise.all(jobs.map(function (src) {
    return loadImage(src).then(function (img) { window.__imgs[src] = img; });
  }));
}).then(function () {
  if (shotMode()) {
    initShot();
  } else {
    initEditor();
    render();
  }
}).catch(function (err) {
  document.body.insertAdjacentHTML('beforeend', '<p style="color:#ff8080;padding:12px">Cover failed to load: ' + err.message + '</p>');
});
