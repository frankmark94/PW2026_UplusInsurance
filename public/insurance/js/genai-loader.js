/**
 * GenAI connection loader for Pega Web Messaging
 * ---------------------------------------------------------------
 * Replaces the widget's default "Establishing a secured connection"
 * spinner (shown while the chat connects) with a playful, on-brand
 * GenAI animation — a pulsing gradient "thinking" orb with an
 * orbiting spark — and a cycling status line à la Claude Code
 * ("Caramelizing onions…", "Whisking up answers…", …).
 *
 * It watches the SAME-ORIGIN widget iframe (#pegaChatWidget) for the
 * connecting state (a [role="progressbar"] / disabled composer) and
 * paints an animated overlay over the message area. A minimum display
 * time keeps the animation on screen long enough to read even when the
 * connection is near-instant, then it fades out and reveals the chat —
 * the live conversation itself is never modified.
 *
 * Presentation-layer only. Tweak live via:  window.GenAILoader.config
 */
(function () {
  'use strict';

  if (window.__genaiLoader) return;
  window.__genaiLoader = true;

  // ── Configuration ────────────────────────────────────────────
  var CONFIG = {
    iframeId: 'pegaChatWidget',

    brand: '#CA0000',
    brandDeep: '#7a0b0b',
    iconRed: '#980010',

    // Playful status phrases — the first is shown first, then they cycle.
    phrases: [
      'Caramelizing onions',
      'Warming up the neurons',
      'Consulting the policy oracle',
      'Reticulating splines',
      'Brewing a secure connection',
      'Aligning the actuaries'
    ],

    // Milliseconds each phrase is shown before cycling to the next.
    phraseInterval: 1700,

    // Keep the animation on screen at least this long, so it's readable
    // even when the connection completes almost instantly.
    minDisplayMs: 2800,

    enabled: true
  };

  // ── Iframe access (same-origin only) ─────────────────────────
  function getIframeDoc() {
    var f = document.getElementById(CONFIG.iframeId);
    if (!f) return null;
    try {
      return f.contentDocument || (f.contentWindow && f.contentWindow.document) || null;
    } catch (e) {
      return null;
    }
  }

  // ── Styles (injected once into the widget document) ──────────
  function ensureStyles(doc) {
    if (doc.getElementById('genai-loader-styles')) return;
    var brand = CONFIG.brand;
    var deep = CONFIG.brandDeep;
    var icon = CONFIG.iconRed;
    var style = doc.createElement('style');
    style.id = 'genai-loader-styles';
    style.textContent = [
      // Overlay that covers the message area while connecting.
      '.genai-overlay{position:absolute;left:0;right:0;bottom:0;z-index:9999;isolation:isolate;',
      'display:flex;flex-direction:column;align-items:center;justify-content:center;',
      'gap:20px;padding:24px;text-align:center;',
      'background:linear-gradient(160deg,#fdf4f4 0%,#faf6f8 38%,#f5f6fb 72%,#ffffff 100%);',
      'animation:genaiFade .35s ease both;}',
      '.genai-overlay.genai-out{animation:genaiFadeOut .4s ease both;}',

      // The "thinking" orb — layered conic + radial gradients that spin
      // A minimal sparkle — a soft star glyph that gently pulses and
      // rotates. Clean and light, not a glossy sphere.
      '.genai-spark{font-size:24px;line-height:1;font-family:system-ui,sans-serif;',
      'background:linear-gradient(135deg,' + icon + ',' + brand + ' 55%,' + deep + ');',
      '-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;',
      'filter:drop-shadow(0 1px 4px rgba(202,0,0,.30));',
      'animation:genaiSparkPulse 1.9s ease-in-out infinite;}',

      // Status line — gradient text with a shimmer sweep + cycling phrases.
      '.genai-status{position:relative;font-size:15px;font-weight:650;letter-spacing:.1px;',
      'font-family:"Inter",system-ui,sans-serif;',
      'background:linear-gradient(100deg,' + deep + ' 0%,' + brand + ' 30%,#ffd0d0 50%,' + brand + ' 70%,' + deep + ' 100%);',
      'background-size:220% 100%;',
      '-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;',
      'animation:genaiShimmer 2.6s linear infinite;',
      'min-height:20px;display:inline-flex;align-items:center;}',
      '.genai-status .genai-dots{display:inline-block;width:16px;text-align:left;-webkit-text-fill-color:' + brand + ';}',
      '.genai-status.genai-swap{animation:genaiShimmer 2.6s linear infinite, genaiTextSwap .45s ease both;}',

      // Subtle sub-label.
      '.genai-sub{font-size:11.5px;font-weight:500;color:#9a8a8d;letter-spacing:.2px;',
      'font-family:"Inter",system-ui,sans-serif;margin-top:-4px;}',

      '@keyframes genaiSparkPulse{0%,100%{transform:scale(.78) rotate(-8deg);opacity:.7;}50%{transform:scale(1) rotate(8deg);opacity:1;}}',
      '@keyframes genaiShimmer{0%{background-position:120% 0;}100%{background-position:-120% 0;}}',
      '@keyframes genaiFade{from{opacity:0;}to{opacity:1;}}',
      '@keyframes genaiFadeOut{from{opacity:1;}to{opacity:0;}}',
      '@keyframes genaiTextSwap{from{opacity:0;transform:translateY(4px);}to{opacity:1;transform:none;}}',

      // Hide the widget's original spinner + label while ours is up.
      '.genai-hide-original [role="progressbar"]{display:none !important;}'
    ].join('');
    (doc.head || doc.documentElement).appendChild(style);
  }

  // ── Loader content (orb + cycling text) ──────────────────────
  var dotTimer = null;
  var phraseTimer = null;

  function buildLoader(doc) {
    var wrap = doc.createElement('div');

    var orb = doc.createElement('div');
    orb.className = 'genai-spark';
    orb.textContent = '\u2726';

    var status = doc.createElement('div');
    status.className = 'genai-status';
    var label = doc.createElement('span');
    label.textContent = CONFIG.phrases[0];
    var dots = doc.createElement('span');
    dots.className = 'genai-dots';
    status.appendChild(label);
    status.appendChild(dots);

    var sub = doc.createElement('div');
    sub.className = 'genai-sub';
    sub.textContent = 'Securing your session';

    wrap.appendChild(orb);
    wrap.appendChild(status);
    wrap.appendChild(sub);

    var n = 0;
    clearInterval(dotTimer);
    dotTimer = setInterval(function () {
      n = (n + 1) % 4;
      dots.textContent = '.'.repeat(n);
    }, 360);

    var i = 0;
    clearInterval(phraseTimer);
    phraseTimer = setInterval(function () {
      i = (i + 1) % CONFIG.phrases.length;
      label.textContent = CONFIG.phrases[i];
      status.classList.remove('genai-swap');
      void status.offsetWidth;
      status.classList.add('genai-swap');
    }, CONFIG.phraseInterval);

    return wrap;
  }

  function teardownTimers() {
    clearInterval(dotTimer);
    clearInterval(phraseTimer);
    dotTimer = phraseTimer = null;
  }

  // ── State ────────────────────────────────────────────────────
  var state = { overlay: null, startedAt: 0, hideQueued: false };

  // Is the widget currently in its connecting/loading state?
  function isConnecting(doc) {
    // Only treat this as a "connecting" state for the INITIAL widget load.
    // The widget shows a progressbar plus its own "Establishing a secured
    // connection" label while it boots. We deliberately do NOT key off the
    // composer being disabled, because the textarea is also briefly disabled
    // every time the user sends a message (which would re-trigger the intro).
    var bar = doc.querySelector('[role="progressbar"]');
    if (!bar) return false;
    // Guard against false positives (e.g. a typing/typing-indicator progressbar
    // inside the message list): require the connecting label OR a disabled
    // composer AND the absence of any rendered messages.
    var hasMessages = !!doc.querySelector('[data-testid="text_message_csr"],[data-testid="text_message"]');
    if (hasMessages) return false;
    return true;
  }

  // The panel we anchor the overlay to (positioned below the header).
  function getPanel(doc) {
    return doc.querySelector('article') || doc.body;
  }

  function showOverlay(doc) {
    if (state.overlay) return;
    ensureStyles(doc);
    var panel = getPanel(doc);
    if (getComputedStyle(panel).position === 'static') panel.style.position = 'relative';

    var header = doc.querySelector('header,[class*="header" i]');
    var headerH = header ? Math.round(header.getBoundingClientRect().height) : 56;

    var ov = doc.createElement('div');
    ov.className = 'genai-overlay';
    ov.setAttribute('data-genai-loader', '1');
    ov.style.top = headerH + 'px';
    ov.appendChild(buildLoader(doc));

    panel.appendChild(ov);
    doc.documentElement.classList.add('genai-hide-original');
    state.overlay = ov;
    state.startedAt = Date.now();
    state.hideQueued = false;
  }

  function hideOverlay(doc) {
    if (!state.overlay || state.hideQueued) return;
    state.hideQueued = true;
    var elapsed = Date.now() - state.startedAt;
    var wait = Math.max(0, CONFIG.minDisplayMs - elapsed);
    setTimeout(function () {
      var ov = state.overlay;
      if (!ov) return;
      ov.classList.add('genai-out');
      setTimeout(function () {
        if (ov && ov.parentNode) ov.parentNode.removeChild(ov);
      }, 400);
      teardownTimers();
      if (doc) doc.documentElement.classList.remove('genai-hide-original');
      state.overlay = null;
      state.hideQueued = false;
    }, wait);
  }

  // ── Watch loop ───────────────────────────────────────────────
  function tick() {
    if (!CONFIG.enabled) return;
    var doc = getIframeDoc();
    if (!doc || !doc.body) return;
    if (isConnecting(doc)) {
      showOverlay(doc);
    } else if (state.overlay) {
      hideOverlay(doc);
    }
  }

  setInterval(tick, 120);
  tick();

  // ── Public API ───────────────────────────────────────────────
  window.GenAILoader = {
    config: CONFIG,
    enable: function () { CONFIG.enabled = true; },
    disable: function () {
      CONFIG.enabled = false;
      teardownTimers();
      var doc = getIframeDoc();
      if (doc && state.overlay && state.overlay.parentNode) {
        state.overlay.parentNode.removeChild(state.overlay);
        doc.documentElement.classList.remove('genai-hide-original');
      }
      state.overlay = null;
      state.hideQueued = false;
    },
    /** Preview the loader for N ms without reconnecting (default 4000). */
    preview: function (ms) {
      var doc = getIframeDoc();
      if (!doc) return;
      showOverlay(doc);
      setTimeout(function () { hideOverlay(doc); }, ms || 4000);
    }
  };

  console.log('[GenAILoader] loaded. Preview with window.GenAILoader.preview().');
})();
