/* =====================================================================
   Wedding invitation — scroll-driven frame animation + page behaviour.
   You do NOT need to edit this file. Wedding details live in js/config.js
   ===================================================================== */
(function () {
  'use strict';

  /* ---------- Frame sequence (relative paths: safe for GitHub Pages subpaths) ---------- */
  var FRAME_COUNT = 200;
  var FRAME_DIR = 'frames/';
  var FRAME_PREFIX = 'ezgif-frame-';
  var FRAME_EXT = '.jpg';
  function frameUrl(i) { return FRAME_DIR + FRAME_PREFIX + String(i + 1).padStart(3, '0') + FRAME_EXT; }

  var $ = function (id) { return document.getElementById(id); };
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var conn = navigator.connection || {};
  var slowNet = !!(conn.saveData || /(^|-)2g$|3g/.test(conn.effectiveType || ''));
  var isSmall = Math.min(screen.width || 0, window.innerWidth) < 700;

  try { if ('scrollRestoration' in history) history.scrollRestoration = 'manual'; } catch (e) {}

  /* =====================================================================
     1. Fill in content from config.js
     ===================================================================== */
  var CFG = window.WEDDING_CONFIG || {};
  var isPlaceholder = function (s) { return /\[[^\]]*\]/.test(String(s)); };
  function getPath(obj, path) {
    return path.split('.').reduce(function (o, k) { return o == null ? o : o[k]; }, obj);
  }
  function bindContent() {
    document.querySelectorAll('[data-bind]').forEach(function (el) {
      var v = getPath(CFG, el.getAttribute('data-bind'));
      if (typeof v !== 'string') return;
      el.textContent = v;
      el.classList.toggle('ph', isPlaceholder(v));
    });
    if (CFG.footer && CFG.footer.pageTitle) document.title = CFG.footer.pageTitle;

    // Optional items
    var venue = CFG.venue || {};
    var map = $('mapBtn');
    if (venue.mapUrl) { map.href = venue.mapUrl; map.hidden = false; }
    if (!venue.note) $('noteCard').hidden = true;
    if (CFG.footer && CFG.footer.hashtag) $('hashtag').hidden = false;

    // Schedule
    var ol = $('timeline');
    (CFG.schedule || []).forEach(function (ev) {
      var li = document.createElement('li');
      li.className = 'reveal';
      var t = document.createElement('div'); t.className = 't-time'; t.textContent = ev.time || '';
      var b = document.createElement('div'); b.className = 't-body';
      var h = document.createElement('h3'); h.className = 't-title'; h.textContent = ev.title || '';
      var p = document.createElement('p'); p.className = 't-desc'; p.textContent = ev.description || '';
      [[t, ev.time], [h, ev.title], [p, ev.description]].forEach(function (x) {
        if (isPlaceholder(x[1])) x[0].classList.add('ph');
      });
      b.appendChild(h); if (ev.description) b.appendChild(p);
      li.appendChild(t); li.appendChild(b); ol.appendChild(li);
    });

    // Guest count options
    var sel = $('rGuests'), max = Math.max(1, +((CFG.rsvp || {}).maxGuests) || 6);
    for (var n = 1; n <= max; n++) {
      var o = document.createElement('option'); o.value = n; o.textContent = n; sel.appendChild(o);
    }
  }

  /* =====================================================================
     2. Frame loading (coarse-to-fine so scrubbing works before 100%)
     ===================================================================== */
  var images = new Array(FRAME_COUNT);   // HTMLImageElement or undefined
  var KEYFRAMES = [0, 66, 133, 199];     // used when reduced motion is on

  function loadOrder() {
    if (reduceMotion) return KEYFRAMES.slice();
    var seen = {}, out = [];
    function add(i) { if (i < FRAME_COUNT && !seen[i]) { seen[i] = 1; out.push(i); } }
    add(0); add(FRAME_COUNT - 1);
    [40, 20, 10, 5, 1].forEach(function (step) { for (var i = 0; i < FRAME_COUNT; i += step) add(i); });
    return out;
  }

  function loadFrame(i, attempt) {
    return new Promise(function (resolve) {
      var img = new Image();
      img.decoding = 'async';
      img.onload = function () {
        var done = function () { images[i] = img; resolve(true); };
        if (img.decode) img.decode().then(done, done); else done();
      };
      img.onerror = function () {
        if (!attempt) setTimeout(function () { loadFrame(i, 1).then(resolve); }, 700);
        else resolve(false);
      };
      img.src = frameUrl(i);
    });
  }

  var loadedCount = 0, settledCount = 0, order = [], totalToLoad = 0;
  function startLoading(onProgress) {
    order = loadOrder(); totalToLoad = order.length;
    var next = 0, workers = slowNet ? 3 : (isSmall ? 5 : 8);
    return new Promise(function (resolve) {
      function pump() {
        if (next >= order.length) return;
        var i = order[next++];
        loadFrame(i, 0).then(function (ok) {
          settledCount++; if (ok) loadedCount++;
          onProgress(settledCount / totalToLoad);
          if (settledCount === totalToLoad) resolve(); else pump();
        });
      }
      for (var w = 0; w < Math.min(workers, order.length); w++) pump();
    });
  }

  function nearestLoaded(i) {
    if (images[i]) return i;
    for (var d = 1; d < FRAME_COUNT; d++) {
      if (i - d >= 0 && images[i - d]) return i - d;
      if (i + d < FRAME_COUNT && images[i + d]) return i + d;
    }
    return -1;
  }

  /* =====================================================================
     3. Renderer (canvas, contain-fit, never distorts)
     ===================================================================== */
  var track = $('track'), stage = $('stage'), canvas = $('canvas'), bgCanvas = $('bgCanvas');
  var ctx = canvas.getContext('2d'), bgCtx = bgCanvas.getContext('2d');
  var cw = 0, ch = 0, dpr = 1, trackTop = 0, maxScroll = 1;
  var lastDrawn = -2, curFrame = 0, targetFrame = 0, progress = 0, raf = 0, lastT = 0;
  var openEl = $('open'), cueEnd = $('cueEnd'), skipBtn = $('skip'), meter = $('meter'), nav = $('nav');
  var ready = false;

  function measure() {
    var w = stage.clientWidth, h = stage.clientHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    var nw = Math.round(w * dpr), nh = Math.round(h * dpr);
    if (nw !== cw || nh !== ch) {
      cw = canvas.width = nw; ch = canvas.height = nh;
      bgCanvas.width = 48; bgCanvas.height = Math.max(24, Math.round(48 * nh / nw));
      lastDrawn = -2; // force repaint after the canvas was cleared
    }
    var r = track.getBoundingClientRect();
    trackTop = r.top + window.pageYOffset;
    maxScroll = Math.max(1, track.offsetHeight - stage.clientHeight);
  }

  function draw(idx) {
    var img = images[idx];
    if (!img || !cw) return;
    var iw = img.naturalWidth, ih = img.naturalHeight;
    var s = Math.min(cw / iw, ch / ih);              // contain: keeps the original aspect ratio
    var dw = Math.round(iw * s), dh = Math.round(ih * s);
    var dx = Math.round((cw - dw) / 2), dy = Math.round((ch - dh) / 2);
    ctx.imageSmoothingQuality = 'high';
    if (dw < cw - 1 || dh < ch - 1) ctx.clearRect(0, 0, cw, ch);
    ctx.drawImage(img, dx, dy, dw, dh);

    // Soft blurred backdrop for the letterbox area (only when there is one)
    var letterbox = dw < cw - 1 || dh < ch - 1;
    bgCanvas.style.visibility = letterbox ? 'visible' : 'hidden';
    if (letterbox) {
      var bw = bgCanvas.width, bh = bgCanvas.height, k = Math.max(bw / iw, bh / ih);
      var w2 = iw * k, h2 = ih * k;
      bgCtx.drawImage(img, (bw - w2) / 2, (bh - h2) / 2, w2, h2);
    }
  }

  function updateUI() {
    var p = progress;
    openEl.style.opacity = clamp(1 - p / 0.045, 0, 1);
    openEl.style.visibility = p > 0.05 ? 'hidden' : 'visible';
    meter.style.transform = 'scaleY(' + p.toFixed(4) + ')';
    cueEnd.classList.toggle('is-on', p > 0.965);
    var pastStage = window.pageYOffset > trackTop + maxScroll - stage.clientHeight * 0.35;
    nav.classList.toggle('is-visible', pastStage);
    skipBtn.classList.toggle('is-off', pastStage || p < 0.05);
  }

  function tick(now) {
    raf = 0;
    var dt = lastT ? Math.min(64, now - lastT) : 16; lastT = now;
    if (reduceMotion) { curFrame = targetFrame; }
    else {
      // frame-rate independent easing toward the scroll position (smooth + reversible)
      curFrame += (targetFrame - curFrame) * (1 - Math.exp(-dt / 70));
      if (Math.abs(targetFrame - curFrame) < 0.03) curFrame = targetFrame;
    }
    var idx = nearestLoaded(clamp(Math.round(curFrame), 0, FRAME_COUNT - 1));
    if (idx >= 0 && idx !== lastDrawn) { draw(idx); lastDrawn = idx; }
    updateUI();
    if (curFrame !== targetFrame) raf = requestAnimationFrame(tick); else lastT = 0;
  }
  function schedule() { if (!raf) raf = requestAnimationFrame(tick); }

  function onScroll() {
    if (!ready) return;
    progress = clamp((window.pageYOffset - trackTop) / maxScroll, 0, 1);
    targetFrame = progress * (FRAME_COUNT - 1);
    schedule();
  }
  var resizeQueued = false;
  function onResize() {
    if (resizeQueued) return; resizeQueued = true;
    requestAnimationFrame(function () { resizeQueued = false; measure(); onScroll(); lastDrawn = -2; schedule(); });
  }

  /* =====================================================================
     4. Loader flow
     ===================================================================== */
  var loader = $('loader'), pctEl = $('loaderPct'), barEl = $('loaderBar'), noteEl = $('loaderNote'), enterBtn = $('loaderEnter');
  var entered = false, shownPct = -1;

  function showProgress(f) {
    var p = Math.round(f * 100);
    if (p === shownPct) return; shownPct = p;
    pctEl.textContent = p + '%';
    barEl.style.transform = 'scaleX(' + f.toFixed(3) + ')';
  }

  function enter() {
    if (entered) return; entered = true;
    if (loadedCount === 0) document.body.classList.add('no-frames');
    document.body.classList.remove('loading');
    measure(); window.scrollTo(0, 0);
    ready = true; progress = 0; targetFrame = curFrame = 0; lastDrawn = -2;
    var first = nearestLoaded(0); if (first >= 0) { draw(first); lastDrawn = first; }
    updateUI(); onScroll();
    loader.classList.add('is-done');
    setTimeout(function () { loader.style.display = 'none'; }, 1000);
  }

  function initLoader() {
    showProgress(0);
    if (slowNet) noteEl.textContent = 'Slow connection detected — you can enter early.';
    var slowTimer = setTimeout(function () {
      if (entered) return;
      noteEl.textContent = 'Taking a little longer than usual…';
      if (loadedCount > 0) enterBtn.hidden = false;
    }, slowNet ? 1500 : 7000);

    startLoading(showProgress).then(function () {
      clearTimeout(slowTimer);
      if (loadedCount === 0) { noteEl.textContent = 'The animation could not be loaded. Showing the invitation instead.'; setTimeout(enter, 1200); }
      else if (loadedCount < totalToLoad) { noteEl.textContent = 'Some frames were unavailable; playback will skip over them.'; setTimeout(enter, 900); }
      else setTimeout(enter, 350);
    });
    enterBtn.addEventListener('click', enter);
    // Absolute safety net: never trap a visitor on the loading screen
    setTimeout(function () { if (!entered && loadedCount > 0) enterBtn.hidden = false; }, 20000);
  }

  /* =====================================================================
     5. Page interactions (nav, cues, reveal, countdown, calendar, RSVP)
     ===================================================================== */
  function scrollToEl(el) { el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' }); }

  function initInteractions() {
    $('skip').addEventListener('click', function () { scrollToEl($('intro')); });
    cueEnd.addEventListener('click', function () { scrollToEl($('intro')); });
    $('cue').addEventListener('click', function () {
      window.scrollBy({ top: window.innerHeight * 0.9, behavior: reduceMotion ? 'auto' : 'smooth' });
    });
    document.querySelector('.skip-link').addEventListener('click', function (e) { e.preventDefault(); scrollToEl($('intro')); });

    // Reveal on scroll
    var items = document.querySelectorAll('.reveal');
    if ('IntersectionObserver' in window && !reduceMotion) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
      items.forEach(function (el) { io.observe(el); });
    } else items.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ---- Countdown + calendar (only when date.iso is set) ---- */
  function parseLocal(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(String(iso || '').trim());
    return m ? new Date(+m[1], m[2] - 1, +m[3], +m[4], +m[5]) : null;
  }
  function initDate() {
    var d = parseLocal((CFG.date || {}).iso);
    if (!d || isNaN(d)) return;
    var box = $('countdown');
    function upd() {
      var ms = d - Date.now();
      if (ms <= 0) { box.hidden = true; return false; }
      var s = Math.floor(ms / 1000);
      $('cdD').textContent = Math.floor(s / 86400);
      $('cdH').textContent = Math.floor(s % 86400 / 3600);
      $('cdM').textContent = Math.floor(s % 3600 / 60);
      $('cdS').textContent = s % 60;
      return true;
    }
    if (upd()) { box.hidden = false; setInterval(upd, reduceMotion ? 30000 : 1000); }

    var btn = $('calBtn'); btn.hidden = false;
    btn.addEventListener('click', function () {
      var pad = function (n) { return String(n).padStart(2, '0'); };
      var f = function (x) { return x.getFullYear() + pad(x.getMonth() + 1) + pad(x.getDate()) + 'T' + pad(x.getHours()) + pad(x.getMinutes()) + '00'; };
      var end = new Date(d.getTime() + (+CFG.date.durationHours || 4) * 3600000);
      var esc = function (t) { return String(t).replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n'); };
      var ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Wedding Invitation//EN', 'BEGIN:VEVENT',
        'UID:' + f(d) + '@wedding-invitation', 'DTSTAMP:' + f(new Date()), 'DTSTART:' + f(d), 'DTEND:' + f(end),
        'SUMMARY:' + esc((CFG.couple.partnerOne + ' & ' + CFG.couple.partnerTwo + ' — Wedding')),
        'LOCATION:' + esc(((CFG.venue || {}).name || '') + ' ' + ((CFG.venue || {}).address || '')),
        'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
      var url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
      var a = document.createElement('a'); a.href = url; a.download = 'wedding.ics';
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    });
  }

  /* ---- RSVP (mailto fallback — nothing is stored anywhere) ---- */
  function initRsvp() {
    var form = $('rsvpForm'), status = $('rsvpStatus'), rs = CFG.rsvp || {};
    var emailOk = /^[^\s@\[\]]+@[^\s@\[\]]+\.[^\s@\[\]]+$/.test(rs.email || '');

    function say(msg, err) { status.textContent = msg; status.hidden = false; status.classList.toggle('is-error', !!err); }
    function toggleGuests() {
      var decline = form.elements.attend.value === 'Regretfully declines';
      $('guestsField').hidden = decline;
    }
    form.addEventListener('change', toggleGuests);

    function build() {
      var f = form.elements;
      var name = f.name.value.trim();
      if (!name) { say('Please enter your name.', true); f.name.focus(); return null; }
      if (!f.attend.value) { say('Please let us know whether you will attend.', true); return null; }
      var cp = CFG.couple || {};
      var lines = ['RSVP for the wedding of ' + cp.partnerOne + ' & ' + cp.partnerTwo, '',
        'Name: ' + name, 'Response: ' + f.attend.value];
      if (f.attend.value === 'Joyfully accepts') lines.push('Guests: ' + f.guests.value);
      if (f.email.value.trim()) lines.push('Email: ' + f.email.value.trim());
      if (f.notes.value.trim()) lines.push('', 'Message / dietary needs:', f.notes.value.trim());
      return lines.join('\r\n');
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var body = build(); if (!body) return;
      if (!emailOk) {
        say('The couple’s RSVP email address has not been set up yet. Please use “Copy Reply Text” and send it to them directly.', true);
        return;
      }
      var href = 'mailto:' + encodeURIComponent(rs.email).replace('%40', '@') +
        '?subject=' + encodeURIComponent(rs.subject || 'Wedding RSVP') + '&body=' + encodeURIComponent(body);
      say('Opening your email app… please press Send there to deliver your reply. (Nothing is sent until you do.)');
      window.location.href = href;
    });

    $('copyBtn').addEventListener('click', function () {
      var body = build(); if (!body) return;
      var text = body.replace(/\r\n/g, '\n');
      function fallback() {
        var ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', '');
        ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0'; document.body.appendChild(ta); ta.select();
        var ok = false; try { ok = document.execCommand('copy'); } catch (x) {}
        ta.remove(); say(ok ? 'Reply copied. Paste it into a message or email to the couple.' : 'Could not copy automatically — please select and copy your answers manually.', !ok);
      }
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(function () { say('Reply copied. Paste it into a message or email to the couple.'); }, fallback);
      } else fallback();
    });
  }

  /* =====================================================================
     6. Boot
     ===================================================================== */
  bindContent();
  initInteractions();
  initDate();
  initRsvp();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', onResize);
  initLoader();
})();
