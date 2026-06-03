/**
 * Modern U+ theme for the Pega Web Messaging widget
 * ---------------------------------------------------------------
 * Presentation-layer "skin" that restyles the SAME-ORIGIN widget iframe
 * (#pegaChatWidget) to feel modern and on-brand for U+ Insurance —
 * a flowing gradient backdrop (à la the U+ customer-service portal),
 * a gradient header, frosted agent bubbles, brand-gradient customer
 * bubbles, and an elevated input bar.
 *
 * It does NOT touch any markup or behavior — it only injects a <style>
 * into the widget document. The widget is built with styled-components
 * (randomized class names), so bubbles are targeted structurally with
 * :has() against the stable data-testid spans the widget already emits.
 *
 * Tweak / toggle live from the console via:  window.WidgetTheme
 */
(function () {
  'use strict';

  if (window.__widgetTheme) return;
  window.__widgetTheme = true;

  // ── Configuration ────────────────────────────────────────────
  var CONFIG = {
    iframeId: 'pegaChatWidget',

    // U+ brand palette.
    iconRed: '#980010',   // sampled from the U+ widget icon (gradient start)
    brand: '#CA0000',
    brandDeep: '#7a0b0b',
    brandMaroon: '#2a0808',

    // Active typography preset (see FONT_PRESETS below).
    font: 'modern',

    enabled: true
  };

  // ── Font presets ─────────────────────────────────────────────
  // Each preset pairs a UI/chrome typeface with a conversation ("message")
  // typeface and the Google Fonts query needed to load them. `msgKind`
  // controls the message fallback stack (serif vs sans).
  //   • modern    — Inter throughout (the U+ web app's own font).
  //   • pega      — Open Sans, Pega Constellation's default UI font.
  //   • brand     — Lato, a clean stand-in for Pega's Sailec brand display.
  //   • editorial — Inter chrome + Fraunces serif messages (high-contrast, chic).
  //   • classic   — Inter chrome + Lora serif messages (warm, literary).
  var FONT_PRESETS = {
    modern: {
      label: 'Modern — Inter',
      ui: "'Inter'", msg: "'Inter'", msgKind: 'sans',
      google: 'Inter:wght@400;500;600;700'
    },
    pega: {
      label: 'Pega — Open Sans',
      ui: "'Open Sans'", msg: "'Open Sans'", msgKind: 'sans',
      google: 'Open+Sans:wght@400;500;600;700'
    },
    brand: {
      label: 'Brand — Lato',
      ui: "'Lato'", msg: "'Lato'", msgKind: 'sans',
      google: 'Lato:wght@400;700;900'
    },
    editorial: {
      label: 'Editorial — Fraunces',
      ui: "'Inter'", msg: "'Fraunces'", msgKind: 'serif',
      google: 'Inter:wght@400;500;600;700&family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600'
    },
    classic: {
      label: 'Classic — Lora',
      ui: "'Inter'", msg: "'Lora'", msgKind: 'serif',
      google: 'Inter:wght@400;500;600;700&family=Lora:wght@400;500;600;700'
    }
  };

  function activeFont() {
    return FONT_PRESETS[CONFIG.font] || FONT_PRESETS.modern;
  }

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

  // ── The theme stylesheet ─────────────────────────────────────
  function css() {
    var brand = CONFIG.brand;
    var deep = CONFIG.brandDeep;
    var maroon = CONFIG.brandMaroon;
    var icon = CONFIG.iconRed;

    // Flowing header gradient — starts at the icon's crimson on the LEFT
    // (next to the logo) and shifts through the brand red into deep maroon
    // as it travels to the right.
    var headerGrad = 'linear-gradient(95deg,' + icon + ' 0%,' + brand + ' 42%,' + deep + ' 78%,' + maroon + ' 100%)';
    // Soft, warm backdrop for the conversation surface.
    var bodyGrad =
      'radial-gradient(120% 80% at 100% 0%, rgba(202,0,0,.10) 0%, rgba(202,0,0,0) 45%),' +
      'radial-gradient(120% 90% at 0% 100%, rgba(42,8,8,.10) 0%, rgba(42,8,8,0) 50%),' +
      'linear-gradient(160deg,#fdf4f4 0%,#faf6f8 38%,#f5f6fb 72%,#ffffff 100%)';
    // Customer bubble gradient.
    var custGrad = 'linear-gradient(135deg,' + brand + ' 0%,' + deep + ' 100%)';

    // Typeface stacks driven by the active preset. Inter/Open Sans/Lato for
    // the modern UI chrome; the message copy can be a serif (Fraunces/Lora)
    // or sans depending on the chosen preset.
    var fp = activeFont();
    var sans = fp.ui + ",system-ui,-apple-system,'Segoe UI',Roboto,sans-serif";
    var serif = fp.msgKind === 'serif'
      ? fp.msg + ",Georgia,'Times New Roman',serif"
      : fp.msg + ",system-ui,-apple-system,'Segoe UI',Roboto,sans-serif";
    // Fraunces exposes optical-size / softness axes for a warmer, chicer cut.
    var msgExtra = fp.msg.indexOf('Fraunces') !== -1
      ? "font-weight:400 !important;font-variation-settings:'opsz' 32,'SOFT' 40,'WONK' 0 !important;"
      : '';

    return [
      // ── Typography ──
      // Default the whole widget to the modern sans, then give the message
      // copy the chosen face (serif for editorial/classic presets).
      'html,body,.wm-root,article,button,input,textarea,h1,h2,h3,h4,h5,h6{' +
        'font-family:' + sans + ' !important;-webkit-font-smoothing:antialiased;' +
        'text-rendering:optimizeLegibility;}',
      // Header title: crisp, tightly-tracked sans.
      'h2[data-testid="chat_heading"],[data-testid="chat_heading"]{' +
        'font-weight:600 !important;font-size:16px !important;letter-spacing:-.01em !important;}',
      // Conversation copy — the configurable "main message bubble" font.
      '[data-testid="text_message_csr"],[data-testid="text_message_csr"] *,' +
        '[data-testid="text_message"],[data-testid="text_message"] *{' +
        'font-family:' + serif + ' !important;font-size:15px !important;' +
        'line-height:1.55 !important;letter-spacing:.002em !important;' + msgExtra + '}',
      // Timestamps: tiny, quiet, uppercase.
      '[class*="timestamp" i],[data-testid*="timestamp" i],[class*="time" i]{' +
        'font-family:' + sans + ' !important;font-size:10.5px !important;' +
        'font-weight:500 !important;letter-spacing:.04em !important;' +
        'color:#a89498 !important;}',

      // ── Conversation backdrop: flowing gradient on the CARD ──
      // Keep the document (and the iframe's padding frame) fully transparent
      // so there is no gray box framing the widget — the card floats cleanly.
      // Paint the decorative gradient on the card itself so it still shows
      // through the (transparent) message list behind the bubbles.
      'html,body,.wm-root{background:transparent !important;}',
      'article{background:' + bodyGrad + ' !important;}',
      // The widget's message scroll area (aria-live region) paints an opaque
      // white background that would hide the gradient — make it transparent
      // so the card gradient shows through behind the bubbles.
      '[aria-live="polite"]{background:transparent !important;}',

      // ── Header: gradient bar with U+ depth ──
      'header,[class*="header" i],[data-testid*="header" i]{',
      'background:' + headerGrad + ' !important;',
      'box-shadow:0 2px 14px rgba(42,8,8,.28) !important;',
      'border-bottom:none !important;color:#fff !important;}',
      'header *,[class*="header" i] *{color:#fff !important;}',

      // ── Agent / GenAI (CSR) bubbles: frosted glass ──
      // The visible Pega bubble is the OUTER wrapper (span's grandparent).
      // Style it, and neutralize the inner wrapper so we don't get a
      // gray-framed double layer.
      'div:has(> div > [data-testid="text_message_csr"]){',
      'background:rgba(255,255,255,.86) !important;',
      'backdrop-filter:blur(8px) saturate(1.1) !important;',
      '-webkit-backdrop-filter:blur(8px) saturate(1.1) !important;',
      'border:1px solid rgba(255,255,255,.65) !important;',
      'border-radius:4px 18px 18px 18px !important;',
      'box-shadow:0 6px 18px rgba(42,8,8,.10) !important;',
      'color:#241016 !important;}',
      'div:has(> [data-testid="text_message_csr"]){',
      'background:transparent !important;box-shadow:none !important;border:none !important;}',
      '[data-testid="text_message_csr"]{color:#241016 !important;}',

      // ── Customer bubbles: brand gradient (same outer/inner pattern) ──
      'div:has(> div > [data-testid="text_message"]){',
      'background:' + custGrad + ' !important;',
      'border-radius:18px 4px 18px 18px !important;',
      'box-shadow:0 6px 18px rgba(202,0,0,.28) !important;',
      'border:none !important;color:#fff !important;}',
      'div:has(> [data-testid="text_message"]){',
      'background:transparent !important;box-shadow:none !important;border:none !important;}',
      '[data-testid="text_message"]{color:#fff !important;}',

      // ── Avatars: soft ring ──
      'img[class*="avatar" i],[class*="avatar" i] img,[data-testid*="avatar" i] img{',
      'border-radius:50% !important;box-shadow:0 2px 8px rgba(42,8,8,.22) !important;}',

      // ── Input bar: soft frosted field that blends into the card ──
      // Give the whole composer row a subtle frosted strip with a hairline
      // top divider, then make the field itself flat/inset so it no longer
      // pops off the card like a floating pill.
      '.sc-dExYaf{background:rgba(255,255,255,.55) !important;' +
        'backdrop-filter:blur(8px) !important;-webkit-backdrop-filter:blur(8px) !important;' +
        'border-top:1px solid rgba(202,0,0,.10) !important;}',
      'textarea,input[type="text"]{',
      'border-radius:22px !important;',
      'border:1px solid rgba(42,8,8,.10) !important;',
      'background:rgba(255,255,255,.75) !important;',
      'box-shadow:inset 0 1px 2px rgba(42,8,8,.05) !important;',
      'min-height:80px !important;padding:14px 16px !important;' +
        'line-height:1.4 !important;resize:none !important;',
      'transition:border-color .15s,box-shadow .15s,background .15s !important;}',
      'textarea:focus,input[type="text"]:focus{',
      'border-color:rgba(202,0,0,.45) !important;',
      'background:#fff !important;',
      'box-shadow:0 0 0 3px rgba(202,0,0,.10) !important;outline:none !important;}',

      // ── Send button: clean borderless arrow (no circle) ──
      '[data-testid*="send" i],button[aria-label*="send" i]{',
      'background:transparent !important;',
      'border:none !important;border-radius:50% !important;',
      'box-shadow:none !important;',
      'transition:background .15s,transform .15s !important;}',
      '[data-testid*="send" i]:hover,button[aria-label*="send" i]:hover{',
      'background:rgba(202,0,0,.10) !important;transform:translateY(-1px) !important;}',
      '[data-testid*="send" i] svg,button[aria-label*="send" i] svg{fill:' + brand + ' !important;color:' + brand + ' !important;}',

      // ── Footer / disclaimer text: muted ──
      '[class*="footer" i],[class*="disclaimer" i]{color:#8a7a7d !important;}',

      // ── Custom scrollbar to match ──
      '::-webkit-scrollbar{width:8px;}',
      '::-webkit-scrollbar-thumb{background:rgba(202,0,0,.28);border-radius:8px;}',
      '::-webkit-scrollbar-thumb:hover{background:rgba(202,0,0,.45);}'
    ].join('');
  }

  function applyTheme(doc) {
    if (!CONFIG.enabled) return;
    ensureFonts(doc);
    var style = doc.getElementById('uplus-widget-theme');
    if (!style) {
      style = doc.createElement('style');
      style.id = 'uplus-widget-theme';
      (doc.head || doc.documentElement).appendChild(style);
    }
    style.textContent = css();
  }

  // ── Web fonts ────────────────────────────────────────────────
  // Pull the active preset's families (UI + message face) into the widget
  // document. Re-points the same <link> when the preset changes.
  function ensureFonts(doc) {
    var fp = activeFont();
    var href = 'https://fonts.googleapis.com/css2?family=' + fp.google + '&display=swap';
    var link = doc.getElementById('uplus-widget-fonts');
    if (!link) {
      link = doc.createElement('link');
      link.id = 'uplus-widget-fonts';
      link.rel = 'stylesheet';
      (doc.head || doc.documentElement).appendChild(link);
    }
    if (link.getAttribute('href') !== href) link.setAttribute('href', href);
  }

  // ── Host-page stylesheet ─────────────────────────────────────
  // The iframe's outer height is controlled by the widget's own host-page
  // CSS (.wm-iframe.wm-size-max-large). Grow it so the taller message
  // composer has room WITHOUT stealing from the conversation area. The
  // widget is bottom-anchored, so the extra height extends the panel
  // upward.
  function hostCss() {
    return '.wm-iframe.wm-size-max-large{height:812px !important;}';
  }

  function applyHostTheme() {
    if (!CONFIG.enabled) { removeHostTheme(); return; }
    var style = document.getElementById('uplus-widget-host-theme');
    if (!style) {
      style = document.createElement('style');
      style.id = 'uplus-widget-host-theme';
      (document.head || document.documentElement).appendChild(style);
    }
    style.textContent = hostCss();
  }

  function removeHostTheme() {
    var style = document.getElementById('uplus-widget-host-theme');
    if (style) style.remove();
  }

  function removeTheme(doc) {
    var style = doc.getElementById('uplus-widget-theme');
    if (style) style.remove();
  }

  // ── Attach / re-attach to the iframe document ────────────────
  var attached = { doc: null };

  function ensureAttached() {
    var doc = getIframeDoc();
    if (!doc || !doc.body) return;
    if (attached.doc !== doc) {
      attached.doc = doc;
      console.log('[WidgetTheme] attached to widget iframe.');
    }
    if (CONFIG.enabled) applyTheme(doc);
    else removeTheme(doc);
    applyHostTheme();
  }

  setInterval(ensureAttached, 600);
  ensureAttached();

  // ── Public API ───────────────────────────────────────────────
  window.WidgetTheme = {
    config: CONFIG,
    fonts: FONT_PRESETS,
    enable: function () { CONFIG.enabled = true; var d = getIframeDoc(); if (d) applyTheme(d); applyHostTheme(); },
    disable: function () { CONFIG.enabled = false; var d = getIframeDoc(); if (d) removeTheme(d); removeHostTheme(); },
    /** Re-apply after tweaking CONFIG colors in the console. */
    refresh: function () { var d = getIframeDoc(); if (d) applyTheme(d); applyHostTheme(); },
    /** Switch the typography preset (modern | pega | brand | editorial | classic). */
    setFont: function (id) {
      if (!FONT_PRESETS[id]) return false;
      CONFIG.font = id;
      var d = getIframeDoc();
      if (d) { ensureFonts(d); applyTheme(d); }
      return true;
    }
  };

  console.log('[WidgetTheme] loaded. Toggle with window.WidgetTheme.disable()/enable().');
})();
