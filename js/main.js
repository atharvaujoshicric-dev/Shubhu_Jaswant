/* Scroll-driven frame animation. Frames: frames/ezgif-frame-001.jpg … 200 (relative paths) */
(function () {
  'use strict';
  var N = 200;
  var url = function (i) { return 'frames/ezgif-frame-' + String(i + 1).padStart(3, '0') + '.jpg'; };
  var $ = function (id) { return document.getElementById(id); };
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var conn = navigator.connection || {};
  var slow = !!(conn.saveData || /2g|3g/.test(conn.effectiveType || ''));
  try { history.scrollRestoration = 'manual'; } catch (e) {}

  var images = new Array(N), loaded = 0, settled = 0, order = [];
  var KEYS = [0, 66, 133, 199];

  (function buildOrder() {
    if (reduce) { order = KEYS.slice(); return; }
    var seen = {};
    var add = function (i) { if (i < N && !seen[i]) { seen[i] = 1; order.push(i); } };
    add(0); add(N - 1);
    [40, 20, 10, 5, 1].forEach(function (s) { for (var i = 0; i < N; i += s) add(i); });
  })();

  function load(i, retry) {
    return new Promise(function (res) {
      var img = new Image(); img.decoding = 'async';
      img.onload = function () { var d = function () { images[i] = img; res(true); }; img.decode ? img.decode().then(d, d) : d(); };
      img.onerror = function () { retry ? res(false) : setTimeout(function () { load(i, true).then(res); }, 700); };
      img.src = url(i);
    });
  }
  function nearest(i) {
    if (images[i]) return i;
    for (var d = 1; d < N; d++) {
      if (i - d >= 0 && images[i - d]) return i - d;
      if (i + d < N && images[i + d]) return i + d;
    }
    return -1;
  }

  var track = $('track'), stage = $('stage'), canvas = $('canvas'), bg = $('bgCanvas'), cue = $('cue');
  var ctx = canvas.getContext('2d'), bctx = bg.getContext('2d');
  var cw = 0, ch = 0, top = 0, max = 1, last = -2, cur = 0, target = 0, prog = 0, raf = 0, t0 = 0, ready = false;

  function measure() {
    var dpr = Math.min(devicePixelRatio || 1, 2);
    var w = Math.round(stage.clientWidth * dpr), h = Math.round(stage.clientHeight * dpr);
    if (w !== cw || h !== ch) {
      cw = canvas.width = w; ch = canvas.height = h;
      bg.width = 48; bg.height = Math.max(24, Math.round(48 * h / w)); last = -2;
    }
    top = track.getBoundingClientRect().top + pageYOffset;
    max = Math.max(1, track.offsetHeight - stage.clientHeight);
  }
  function draw(i) {
    var img = images[i]; if (!img || !cw) return;
    var iw = img.naturalWidth, ih = img.naturalHeight, s = Math.min(cw / iw, ch / ih);   // contain: no distortion
    var dw = Math.round(iw * s), dh = Math.round(ih * s), box = dw < cw - 1 || dh < ch - 1;
    if (box) ctx.clearRect(0, 0, cw, ch);
    ctx.drawImage(img, Math.round((cw - dw) / 2), Math.round((ch - dh) / 2), dw, dh);
    bg.style.visibility = box ? 'visible' : 'hidden';
    if (box) { var k = Math.max(bg.width / iw, bg.height / ih); bctx.drawImage(img, (bg.width - iw * k) / 2, (bg.height - ih * k) / 2, iw * k, ih * k); }
  }
  function tick(now) {
    raf = 0;
    var dt = t0 ? Math.min(64, now - t0) : 16; t0 = now;
    if (reduce) cur = target;
    else { cur += (target - cur) * (1 - Math.exp(-dt / 70)); if (Math.abs(target - cur) < 0.03) cur = target; }
    var i = nearest(clamp(Math.round(cur), 0, N - 1));
    if (i >= 0 && i !== last) { draw(i); last = i; }
    cue.style.opacity = clamp(1 - prog / 0.04, 0, 1);
    if (cur !== target) raf = requestAnimationFrame(tick); else t0 = 0;
  }
  var go = function () { if (!raf) raf = requestAnimationFrame(tick); };
  function onScroll() {
    if (!ready) return;
    prog = clamp((pageYOffset - top) / max, 0, 1); target = prog * (N - 1); go();
  }
  var rq = false;
  function onResize() {
    if (rq) return; rq = true;
    requestAnimationFrame(function () { rq = false; measure(); last = -2; onScroll(); go(); });
  }

  var loader = $('loader'), pct = $('loaderPct'), bar = $('loaderBar'), note = $('loaderNote'), btn = $('loaderEnter');
  var entered = false, shown = -1;
  function progress(f) {
    var p = Math.round(f * 100); if (p === shown) return; shown = p;
    pct.textContent = p + '%'; bar.style.transform = 'scaleX(' + f.toFixed(3) + ')';
  }
  function enter() {
    if (entered) return; entered = true;
    if (!loaded) document.body.classList.add('no-frames');
    document.body.classList.remove('loading');
    measure(); scrollTo(0, 0); ready = true; prog = 0; cur = target = 0; last = -2; go();
    loader.classList.add('is-done'); setTimeout(function () { loader.style.display = 'none'; }, 1000);
  }

  progress(0);
  if (slow) note.textContent = 'Slow connection — you can enter early.';
  var timer = setTimeout(function () { if (!entered) { note.textContent = 'Taking a little longer than usual…'; if (loaded) btn.hidden = false; } }, slow ? 1500 : 7000);
  btn.addEventListener('click', enter);
  setTimeout(function () { if (!entered && loaded) btn.hidden = false; }, 20000);

  var next = 0;
  function pump() {
    if (next >= order.length) return;
    load(order[next++], false).then(function (ok) {
      settled++; if (ok) loaded++;
      progress(settled / order.length);
      if (settled === order.length) {
        clearTimeout(timer);
        if (!loaded) note.textContent = 'The animation could not be loaded.';
        setTimeout(enter, loaded === order.length ? 350 : 900);
      } else pump();
    });
  }
  for (var w = 0, nw = slow ? 3 : innerWidth < 700 ? 5 : 8; w < Math.min(nw, order.length); w++) pump();

  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onResize);
  addEventListener('orientationchange', onResize);
})();
