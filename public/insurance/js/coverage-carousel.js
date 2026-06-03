/**
 * Coverage Limits Carousel for Pega Web Messaging
 * ---------------------------------------------------------------
 * When the agent recommends coverage limits (Step 4 of the demo flow),
 * this drops a branded, horizontally-swipeable carousel into the
 * conversation that VISUALIZES those limits — it does not alter the
 * agent's own message. Mirrors the "carousel" rich message type from the
 * DMS Web Messaging widget, styled with U+ Insurance branding.
 *
 * Cards shown:
 *   • $250K / $500K  Liability
 *   • $500 deductible  Comprehensive & Collision
 *   • $250K / $500K  Uninsured Motorist
 *
 * Trigger: an agent (CSR) message recommending the coverage limits.
 *
 * Presentation-layer only — injected into the SAME-ORIGIN widget iframe
 * (#pegaChatWidget), matching the approach used by agentic-offers.js /
 * policy-bind.js.
 *
 * Tweak live from the console via:  window.CoverageCarousel.config
 */
(function () {
  'use strict';

  if (window.__coverageCarousel) return;
  window.__coverageCarousel = true;

  // ── Configuration ────────────────────────────────────────────
  var CONFIG = {
    iframeId: 'pegaChatWidget',

    // Agent (CSR) message that arms this step. Matched loosely (lowercased,
    // whitespace/punctuation-normalized, substring) so wording can vary.
    triggerPhrases: [
      'recommend matching your existing coverage limits',
      'matching your existing coverage limits'
    ],

    brandColor: '#CA0000',
    introText: "Here's a closer look at your recommended coverage:",

    // Coverage cards to visualize.
    cards: [
      {
        id: 'liability',
        icon: 'shield',
        eyebrow: 'Bodily Injury & Property',
        title: 'Liability',
        value: '$250K / $500K',
        detail: 'Per person / per accident. Covers injury and property damage you\u2019re liable for.'
      },
      {
        id: 'comp_collision',
        icon: 'car',
        eyebrow: 'Comprehensive & Collision',
        title: 'Deductible',
        value: '$500',
        detail: 'What you pay out of pocket before coverage kicks in for damage to your RAV4.'
      },
      {
        id: 'uninsured',
        icon: 'umbrella',
        eyebrow: 'Uninsured Motorist',
        title: 'Protection',
        value: '$250K / $500K',
        detail: 'Covers you if an at-fault driver has little or no insurance.'
      }
    ],

    // Chat bubble text spans, by data-testid (CSR = agent, plain = customer).
    messageSelectors: [
      '[data-testid="text_message_csr"]',
      '[data-testid="text_message"]'
    ],

    enabled: true
  };

  function normalize(s) {
    return (s || '').replace(/\s+/g, ' ').replace(/[.!?,;:]+$/g, '').trim().toLowerCase();
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

  function detectBrandColor(doc) {
    try {
      var candidates = doc.querySelectorAll('header, [class*="header" i], [data-testid*="header" i]');
      for (var i = 0; i < candidates.length; i++) {
        var bg = doc.defaultView.getComputedStyle(candidates[i]).backgroundColor;
        if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
          var m = bg.match(/rgba?\(([^)]+)\)/);
          if (m) {
            var p = m[1].split(',').map(function (n) { return parseFloat(n); });
            var max = Math.max(p[0], p[1], p[2]), min = Math.min(p[0], p[1], p[2]);
            if (max - min > 25 && max > 40) return bg;
          }
        }
      }
    } catch (e) { /* ignore */ }
    return CONFIG.brandColor;
  }

  // ── Icons (inline SVG, inherit currentColor) ─────────────────
  var ICONS = {
    shield:
      '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
      '<path d="M12 3l7 3v5c0 4.4-3 8.4-7 9.6C8 19.4 5 15.4 5 11V6l7-3z" fill="currentColor"/>' +
      '<path d="M9.5 12l1.8 1.8L15 10" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    car:
      '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
      '<path d="M5 11l1.4-4.2A2 2 0 0 1 8.3 5.4h7.4a2 2 0 0 1 1.9 1.4L19 11" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="M4 16v-1.4a2 2 0 0 1 1.2-1.83l.6-.27a2 2 0 0 1 .8-.17h10.8a2 2 0 0 1 .8.17l.6.27A2 2 0 0 1 20 14.6V16a1 1 0 0 1-1 1h-1v1a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1v-1H9v1a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-1H5a1 1 0 0 1-1-1z" fill="currentColor"/>' +
      '<circle cx="7.5" cy="14.6" r="1" fill="#fff"/><circle cx="16.5" cy="14.6" r="1" fill="#fff"/></svg>',
    umbrella:
      '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
      '<path d="M12 4c4.4 0 8 3.2 8.5 7.3.05.4-.3.7-.7.7H4.2c-.4 0-.75-.3-.7-.7C4 7.2 7.6 4 12 4z" fill="currentColor"/>' +
      '<path d="M12 12v5.5a2.2 2.2 0 0 1-4.4 0" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>'
  };

  // ── Styles ───────────────────────────────────────────────────
  function injectStyles(doc) {
    if (doc.getElementById('cc-carousel-styles')) return;
    var brand = detectBrandColor(doc);
    var brandDeep = '#7a0b0b';

    var style = doc.createElement('style');
    style.id = 'cc-carousel-styles';
    style.textContent = [
      '@keyframes ccRise{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}',
      // Inherit the widget's active typeface (driven by the theme font picker).
      '.cc-msg,.cc-msg *{font-family:inherit;}',
      // Agent message row + frosted outer bubble (matches the modern CSR bubble).
      '.cc-msg{margin:0 0 6px;padding:0 8px;animation:ccRise .3s ease both;}',
      '.cc-bubble{background:rgba(255,255,255,.86);color:#241016;border-radius:4px 18px 18px 18px;',
      'backdrop-filter:blur(8px) saturate(1.1);-webkit-backdrop-filter:blur(8px) saturate(1.1);',
      'border:1px solid rgba(255,255,255,.65);box-shadow:0 6px 18px rgba(42,8,8,.10);',
      'padding:12px 14px;max-width:calc(100% - 24px);overflow:hidden;}',
      '.cc-bubble-text{font-size:13px;font-weight:500;line-height:1.5;margin:0 0 12px;padding:0 2px;color:#3a2a2e;}',
      // Track: horizontal scroll-snap carousel.
      '.cc-track{display:flex;gap:12px;overflow-x:auto;scroll-snap-type:x mandatory;',
      '-webkit-overflow-scrolling:touch;padding:2px 2px 12px;scrollbar-width:none;}',
      '.cc-track::-webkit-scrollbar{display:none;}',
      // Card — soft white with a hairline border + elevated shadow.
      '.cc-card{scroll-snap-align:center;flex:0 0 86%;max-width:86%;background:#fff;border-radius:18px;',
      'border:1px solid rgba(42,8,8,.06);box-shadow:0 8px 24px rgba(42,8,8,.12);',
      'overflow:hidden;display:flex;flex-direction:column;}',
      // Branded header band — brand gradient instead of flat fill.
      '.cc-card-top{background:linear-gradient(120deg,' + brand + ' 0%,' + brandDeep + ' 100%);',
      'color:#fff;padding:13px 15px;display:flex;align-items:center;gap:10px;}',
      '.cc-icon{flex-shrink:0;width:28px;height:28px;}',
      '.cc-icon svg{width:28px;height:28px;display:block;}',
      '.cc-brand{margin-left:auto;font-size:11px;font-weight:700;letter-spacing:.3px;opacity:.92;}',
      '.cc-brand b{font-weight:800;}',
      '.cc-eyebrow{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.4px;}',
      // Body.
      '.cc-card-body{padding:15px;}',
      '.cc-value{font-size:25px;font-weight:800;line-height:1.1;color:#241016;letter-spacing:-.01em;}',
      '.cc-title{font-size:12.5px;font-weight:700;color:' + brand + ';margin-top:3px;}',
      '.cc-detail{font-size:11.5px;font-weight:500;color:#8a7a7d;line-height:1.45;margin-top:9px;}',
      // Dots.
      '.cc-dots{display:flex;justify-content:center;gap:6px;margin-top:4px;}',
      '.cc-dot{width:7px;height:7px;border-radius:50%;background:rgba(42,8,8,.18);transition:background .2s,transform .2s;}',
      '.cc-dot.is-active{background:' + brand + ';transform:scale(1.2);}'
    ].join('');
    (doc.head || doc.documentElement).appendChild(style);
  }

  // ── Scroll helper ────────────────────────────────────────────
  function scrollToBottom(node) {
    var el = node.parentElement;
    while (el) {
      if (el.scrollHeight > el.clientHeight + 4) { el.scrollTop = el.scrollHeight; return; }
      el = el.parentElement;
    }
  }

  // ── Build the carousel ───────────────────────────────────────
  function buildCard(doc) {
    var msg = doc.createElement('div');
    msg.className = 'cc-msg';
    msg.setAttribute('data-cc-card', '1');

    var bubble = doc.createElement('div');
    bubble.className = 'cc-bubble';

    var intro = doc.createElement('p');
    intro.className = 'cc-bubble-text';
    intro.textContent = CONFIG.introText;
    bubble.appendChild(intro);

    var track = doc.createElement('div');
    track.className = 'cc-track';

    CONFIG.cards.forEach(function (c) {
      var card = doc.createElement('div');
      card.className = 'cc-card';

      var top = doc.createElement('div');
      top.className = 'cc-card-top';
      var icon = doc.createElement('span');
      icon.className = 'cc-icon';
      icon.innerHTML = ICONS[c.icon] || ICONS.shield;
      var eyebrow = doc.createElement('span');
      eyebrow.className = 'cc-eyebrow';
      eyebrow.textContent = c.eyebrow;
      var brandTag = doc.createElement('span');
      brandTag.className = 'cc-brand';
      brandTag.innerHTML = 'U+<b>Insurance</b>';
      top.appendChild(icon);
      top.appendChild(eyebrow);
      top.appendChild(brandTag);
      card.appendChild(top);

      var body = doc.createElement('div');
      body.className = 'cc-card-body';
      var value = doc.createElement('div');
      value.className = 'cc-value';
      value.textContent = c.value;
      var title = doc.createElement('div');
      title.className = 'cc-title';
      title.textContent = c.title;
      var detail = doc.createElement('div');
      detail.className = 'cc-detail';
      detail.textContent = c.detail;
      body.appendChild(value);
      body.appendChild(title);
      body.appendChild(detail);
      card.appendChild(body);

      track.appendChild(card);
    });

    bubble.appendChild(track);

    // Pagination dots that follow the active card.
    var dots = doc.createElement('div');
    dots.className = 'cc-dots';
    var dotEls = [];
    CONFIG.cards.forEach(function (_, i) {
      var d = doc.createElement('span');
      d.className = 'cc-dot' + (i === 0 ? ' is-active' : '');
      dots.appendChild(d);
      dotEls.push(d);
    });
    bubble.appendChild(dots);

    track.addEventListener('scroll', function () {
      var cards = track.children;
      if (!cards.length) return;
      var cardW = cards[0].offsetWidth + 10; // width + gap
      var idx = Math.round(track.scrollLeft / cardW);
      idx = Math.max(0, Math.min(dotEls.length - 1, idx));
      for (var i = 0; i < dotEls.length; i++) {
        dotEls[i].classList.toggle('is-active', i === idx);
      }
    });

    msg.appendChild(bubble);
    return msg;
  }

  // ── Inject under the agent's coverage message ────────────────
  function injectInto(doc, afterNode) {
    if (!CONFIG.enabled) return;
    injectStyles(doc);
    var card = buildCard(doc);

    var scroller = afterNode.parentElement;
    while (scroller && scroller !== doc.body) {
      if (scroller.scrollHeight > scroller.clientHeight + 8) break;
      scroller = scroller.parentElement;
    }
    if (!scroller) scroller = doc.body;

    var row = afterNode;
    while (row && row.parentElement && row.parentElement !== scroller) {
      row = row.parentElement;
    }

    if (row && row.parentElement === scroller) {
      scroller.insertBefore(card, row.nextSibling);
    } else if (afterNode && afterNode.parentElement) {
      var wrap = afterNode.parentElement;
      wrap.parentElement
        ? wrap.parentElement.insertBefore(card, wrap.nextSibling)
        : wrap.appendChild(card);
    } else {
      (doc.body || doc.documentElement).appendChild(card);
    }
    scrollToBottom(card);
    console.log('[CoverageCarousel] coverage carousel injected.');
  }

  // ── Detection ────────────────────────────────────────────────
  function textOf(node) { return node && node.textContent ? node.textContent : ''; }

  function isIncoming(node) {
    var testid = node.getAttribute && node.getAttribute('data-testid');
    if (testid === 'text_message_csr') return true;
    if (testid === 'text_message') return false;
    var wrap = node.parentElement;
    if (wrap) {
      var spans = wrap.querySelectorAll('span');
      for (var i = 0; i < spans.length; i++) {
        if (/^\s*message from you\b/i.test(spans[i].textContent || '')) return false;
      }
    }
    return true;
  }

  function matchesTrigger(text) {
    var t = normalize(text);
    for (var i = 0; i < CONFIG.triggerPhrases.length; i++) {
      if (t.indexOf(normalize(CONFIG.triggerPhrases[i])) !== -1) return true;
    }
    return false;
  }

  // ── Idempotent scan: inject once under the agent coverage message ──
  var injected = false;
  var injectTimer = null;

  function allBubbles(doc) {
    return Array.prototype.slice.call(
      doc.querySelectorAll(CONFIG.messageSelectors.join(','))
    );
  }

  function findAnchor(doc) {
    var bubbles = allBubbles(doc);
    var anchor = null;
    for (var i = 0; i < bubbles.length; i++) {
      if (isIncoming(bubbles[i]) && matchesTrigger(textOf(bubbles[i]))) {
        anchor = bubbles[i]; // last matching agent message wins
      }
    }
    return anchor;
  }

  function evaluate(doc) {
    if (injected) return;
    var anchor = findAnchor(doc);
    if (!anchor) return;
    if (injectTimer) clearTimeout(injectTimer);
    injectTimer = setTimeout(function () {
      if (injected) return;
      var settled = findAnchor(doc);
      if (!settled) return;
      injected = true;
      injectInto(doc, settled);
    }, 700);
  }

  // ── Attach / re-attach to the iframe document ────────────────
  var attached = { doc: null, observer: null };

  function ensureAttached() {
    var doc = getIframeDoc();
    if (!doc || !doc.body) return;
    if (attached.doc === doc) return;

    if (attached.observer) { attached.observer.disconnect(); attached.observer = null; }
    attached.doc = doc;
    injectStyles(doc);

    var obs = new MutationObserver(function () { evaluate(doc); });
    obs.observe(doc.body, { childList: true, subtree: true, characterData: true });
    attached.observer = obs;
    evaluate(doc);
    console.log('[CoverageCarousel] attached to widget iframe.');
  }

  setInterval(ensureAttached, 500);
  ensureAttached();

  // ── Public API ───────────────────────────────────────────────
  window.CoverageCarousel = {
    config: CONFIG,
    enable: function () { CONFIG.enabled = true; },
    disable: function () { CONFIG.enabled = false; },
    /** Force-inject the carousel under the latest agent message. */
    trigger: function () {
      var doc = getIframeDoc();
      if (!doc) { console.warn('[CoverageCarousel] iframe not reachable'); return; }
      var msgs = doc.querySelectorAll(CONFIG.messageSelectors.join(','));
      var anchor = msgs[msgs.length - 1] || doc.body;
      injectInto(doc, anchor);
    },
    /** Remove the injected carousel and re-arm so the flow can run again. */
    reset: function () {
      injected = false;
      if (injectTimer) { clearTimeout(injectTimer); injectTimer = null; }
      var doc = getIframeDoc();
      if (doc) {
        var cards = doc.querySelectorAll('.cc-msg');
        for (var i = 0; i < cards.length; i++) cards[i].remove();
      }
      console.log('[CoverageCarousel] reset \u2014 ready to inject again.');
    }
  };

  console.log('[CoverageCarousel] loaded. Visualizes recommended coverage limits.');
})();
