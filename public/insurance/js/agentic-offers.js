/**
 * Agentic Offer Experience for Pega Web Messaging
 * ---------------------------------------------------------------
 * Drops an interactive "agentic" UI card into the Web Messaging
 * conversation when the customer confirms they want the recommended
 * discounts.
 *
 * Trigger: the customer sends "That sounds right. Let's go with those."
 * Result:  an in-conversation offer card appears showing the same two
 *          offers from the "Recommended for You" tray (reusing the same
 *          artwork), each with an Accept button the end user can click.
 *
 * Presentation-layer only — no Pega platform / backend calls. The card
 * is injected into the SAME-ORIGIN widget iframe (#pegaChatWidget),
 * matching the approach used by fake-streaming.js.
 *
 * Tweak live from the console via:  window.AgenticOffers.config
 */
(function () {
  'use strict';

  if (window.__agenticOffers) return;
  window.__agenticOffers = true;

  // ── Configuration ────────────────────────────────────────────
  var CONFIG = {
    iframeId: 'pegaChatWidget',

    // Phrase that arms the experience. Matched case-insensitively with
    // punctuation/whitespace normalized, so minor variations still fire.
    triggerPhrase: "That sounds right. Let's go with those.",

    // How the injected agent message presents itself.
    agentName: 'Virtual Assistant',
    introText: 'Tap to apply each discount to your policy:',

    // Fallback brand color if it can't be detected from the live widget.
    brandColor: '#8B0000',


    // Chat bubble text spans, by data-testid. Agent / GenAI (CSR) bubbles
    // use "text_message_csr"; the customer's own bubbles use
    // "text_message". We arm on the customer's trigger phrase, then inject
    // under the next agent (CSR) message.
    messageSelectors: [
      '[data-testid="text_message_csr"]',
      '[data-testid="text_message"]'
    ],

    // Offer tiles to present. Image paths are resolved against this page.
    offers: [
      {
        id: 'save_driver',
        title: 'Safe Driver Rewards',
        detail: '5% off today — up to 25% for safe driving habits.',
        img: './img/offer_save_driver.png'
      },
      {
        id: 'bundle',
        title: 'Bundle & Save',
        detail: 'Save up to 15% combining Home + Auto + Rideshare.',
        img: './img/offer_bundle.png'
      }
    ],

    enabled: true
  };

  // Resolve offer image paths to absolute URLs against this page so they
  // load correctly even from inside the widget iframe document.
  CONFIG.offers.forEach(function (o) {
    try { o.img = new URL(o.img, document.baseURI).href; } catch (e) { /* leave as-is */ }
  });

  function normalize(s) {
    return (s || '')
      .replace(/\s+/g, ' ')
      .replace(/[.!?,;:]+$/g, '')
      .trim()
      .toLowerCase();
  }
  var TRIGGER = normalize(CONFIG.triggerPhrase);

  // Detect the widget's brand color so injected buttons match exactly.
  // Samples the chat header (or any branded element) inside the iframe;
  // falls back to CONFIG.brandColor.
  function detectBrandColor(doc) {
    try {
      // The widget header carries the configured brand color as its bg.
      var candidates = doc.querySelectorAll('header, [class*="header" i], [data-testid*="header" i]');
      for (var i = 0; i < candidates.length; i++) {
        var bg = doc.defaultView.getComputedStyle(candidates[i]).backgroundColor;
        if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
          var m = bg.match(/rgba?\(([^)]+)\)/);
          if (m) {
            var p = m[1].split(',').map(function (n) { return parseFloat(n); });
            // Skip near-white / near-black neutrals — we want the brand hue.
            var max = Math.max(p[0], p[1], p[2]), min = Math.min(p[0], p[1], p[2]);
            if (max - min > 25 && max > 40) return bg;
          }
        }
      }
    } catch (e) { /* ignore */ }
    return CONFIG.brandColor;
  }

  // ── Iframe access (same-origin only) ─────────────────────────
  function getIframeDoc() {
    var f = document.getElementById(CONFIG.iframeId);
    if (!f) return null;
    try {
      return f.contentDocument || (f.contentWindow && f.contentWindow.document) || null;
    } catch (e) {
      return null; // cross-origin — cannot inject
    }
  }

  function injectStyles(doc) {
    if (doc.getElementById('ao-offer-styles')) return;
    var brand = detectBrandColor(doc);
    var style = doc.createElement('style');
    style.id = 'ao-offer-styles';
    style.textContent = [
      '@keyframes aoRise{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}',
      // Agent message row — left aligned, mirrors the widget's CSR bubble.
      '.ao-msg{margin:0 0 6px;padding:0 8px;font-family:inherit;animation:aoRise .3s ease both;}',
      '.ao-msg-name{font-size:.60rem;font-weight:600;color:#71728A;padding-left:.5rem;margin-bottom:2px;}',
      // Bubble: frosted glass to match the modern theme's CSR bubble.
      '.ao-bubble{background:rgba(255,255,255,.86);color:#241016;border-radius:4px 18px 18px 18px;',
      'backdrop-filter:blur(8px) saturate(1.1);-webkit-backdrop-filter:blur(8px) saturate(1.1);',
      'border:1px solid rgba(255,255,255,.65);box-shadow:0 6px 18px rgba(42,8,8,.10);',
      'padding:12px 15px;max-width:calc(100% - 40px);overflow-wrap:break-word;}',
      '.ao-bubble-text{font-size:13px;font-weight:500;line-height:1.5;margin:0 0 10px;color:#3a2a2e;}',
      // Offer options — clean white cards with a hairline border + soft lift.
      '.ao-opts{display:flex;flex-direction:column;gap:8px;}',
      '.ao-opt{display:flex;align-items:center;gap:11px;width:100%;text-align:left;cursor:pointer;',
      'background:#fff;border:1px solid rgba(42,8,8,.08);border-radius:14px;min-height:52px;padding:8px 12px 8px 8px;',
      'font-family:inherit;color:#3a2a2e;box-shadow:0 1px 3px rgba(42,8,8,.06);',
      'transition:transform .18s cubic-bezier(.2,.7,.3,1),box-shadow .18s,border-color .18s,background .18s;}',
      '.ao-opt:hover{transform:translateY(-2px);border-color:rgba(202,0,0,.35);',
      'box-shadow:0 8px 22px rgba(202,0,0,.16);background:linear-gradient(180deg,#fff 0%,#fff7f7 100%);}',
      '.ao-opt:hover .ao-opt-cta{color:' + brand + ';transform:translateX(2px);}',
      // Contained thumbnail in a soft rounded tile.
      '.ao-opt-thumb{width:56px;height:42px;border-radius:10px;object-fit:contain;flex-shrink:0;',
      'background:linear-gradient(180deg,#fff 0%,#faf3f3 100%);padding:3px;box-sizing:border-box;',
      'border:1px solid rgba(42,8,8,.05);transition:background .15s;}',
      '.ao-opt-info{flex:1;min-width:0;}',
      '.ao-opt-name{font-size:13px;font-weight:700;line-height:1.2;letter-spacing:-.01em;color:#241016;}',
      '.ao-opt-sub{font-size:11px;font-weight:500;color:#9a8a8d;line-height:1.35;margin-top:2px;',
      'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
      '.ao-opt-cta{font-size:11.5px;font-weight:700;color:' + brand + ';flex-shrink:0;letter-spacing:.3px;',
      'text-transform:uppercase;transition:color .15s,transform .15s;}',
      // Accepted state — calm green confirmation.
      '.ao-opt.is-accepted{background:linear-gradient(180deg,#fff 0%,#f3fbf7 100%);',
      'border-color:rgba(30,168,115,.45);cursor:default;box-shadow:0 1px 3px rgba(30,168,115,.10);}',
      '.ao-opt.is-accepted:hover{transform:none;box-shadow:0 1px 3px rgba(30,168,115,.10);}',
      '.ao-opt.is-accepted .ao-opt-cta{color:#1ea873;}',
      '.ao-opt.is-accepted .ao-opt-sub{color:#9a8a8d;}',
      '.ao-done{margin-top:10px;font-size:12px;color:#1ea873;font-weight:600;display:none;}',
      '.ao-done.show{display:block;animation:aoRise .3s ease both;}'
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

  // ── Build & inject the agent offer message ───────────────────
  function buildCard(doc) {
    // Outer message row — presents as an incoming agent message.
    var msg = doc.createElement('div');
    msg.className = 'ao-msg';
    msg.setAttribute('data-ao-card', '1');

    var bubble = doc.createElement('div');
    bubble.className = 'ao-bubble';

    var intro = doc.createElement('p');
    intro.className = 'ao-bubble-text';
    intro.textContent = CONFIG.introText;
    bubble.appendChild(intro);

    var opts = doc.createElement('div');
    opts.className = 'ao-opts';

    var total = CONFIG.offers.length;
    var acceptedCount = 0;

    var done = doc.createElement('div');
    done.className = 'ao-done';
    done.textContent = 'All set \u2014 your discounts have been applied to your policy.';

    CONFIG.offers.forEach(function (offer) {
      var opt = doc.createElement('button');
      opt.type = 'button';
      opt.className = 'ao-opt';

      var thumb = doc.createElement('img');
      thumb.className = 'ao-opt-thumb';
      thumb.src = offer.img;
      thumb.alt = '';
      opt.appendChild(thumb);

      var info = doc.createElement('span');
      info.className = 'ao-opt-info';
      var nm = doc.createElement('span');
      nm.className = 'ao-opt-name';
      nm.textContent = offer.title;
      info.appendChild(nm);
      var sub = doc.createElement('span');
      sub.className = 'ao-opt-sub';
      sub.textContent = offer.detail;
      info.appendChild(sub);
      opt.appendChild(info);

      var cta = doc.createElement('span');
      cta.className = 'ao-opt-cta';
      cta.textContent = 'Accept';
      opt.appendChild(cta);

      opt.addEventListener('click', function () {
        if (opt.classList.contains('is-accepted')) return;
        opt.classList.add('is-accepted');
        cta.textContent = '\u2713 Accepted';
        acceptedCount++;
        if (acceptedCount === total) {
          done.classList.add('show');
          scrollToBottom(msg);
        }
        console.log('[AgenticOffers] accepted:', offer.id);
      });

      opts.appendChild(opt);
    });

    bubble.appendChild(opts);
    bubble.appendChild(done);
    msg.appendChild(bubble);
    return msg;
  }

  function injectInto(doc, afterNode) {
    if (!CONFIG.enabled) return;
    injectStyles(doc);
    var card = buildCard(doc);

    // Find the scrollable message list, then the DIRECT CHILD of it that
    // contains the agent's message. Inserting the card right after that
    // row drops it immediately beneath the "Great news!…" message, on the
    // agent (left) side over the list's white background.
    var scroller = afterNode.parentElement;
    while (scroller && scroller !== doc.body) {
      if (scroller.scrollHeight > scroller.clientHeight + 8) break;
      scroller = scroller.parentElement;
    }
    if (!scroller) scroller = doc.body;

    // Climb from the message node up to the element that is a direct child
    // of the scroll container — that's the message row to insert after.
    var row = afterNode;
    while (row && row.parentElement && row.parentElement !== scroller) {
      row = row.parentElement;
    }

    if (row && row.parentElement === scroller) {
      scroller.insertBefore(card, row.nextSibling);
    } else if (afterNode && afterNode.parentElement) {
      // Fallback: drop it right after the bubble's wrapper.
      var wrap = afterNode.parentElement;
      wrap.parentElement
        ? wrap.parentElement.insertBefore(card, wrap.nextSibling)
        : wrap.appendChild(card);
    } else {
      (doc.body || doc.documentElement).appendChild(card);
    }
    scrollToBottom(card);
    console.log('[AgenticOffers] offer experience injected.');
  }

  // ── Trigger detection ────────────────────────────────────────
  function textOf(node) {
    return node && node.textContent ? node.textContent : '';
  }

  // A bubble is "incoming" (agent / GenAI) when its text span uses the CSR
  // testid. The customer's own bubbles use "text_message". The hidden
  // "Message from you" a11y label is kept as a fallback only.
  function isIncoming(node) {
    var testid = node.getAttribute && node.getAttribute('data-testid');
    if (testid === 'text_message_csr') return true;  // agent / CSR
    if (testid === 'text_message') return false;     // customer
    var wrap = node.parentElement;
    if (wrap) {
      var spans = wrap.querySelectorAll('span');
      for (var i = 0; i < spans.length; i++) {
        if (/^\s*message from you\b/i.test(spans[i].textContent || '')) return false;
      }
    }
    return true;
  }

  // State: we inject exactly once. Rather than trying to catch the precise
  // mutation that adds the agent reply (fragile — the widget re-renders and
  // re-orders bubbles while messages stream), we re-evaluate the WHOLE
  // conversation on every change and decide idempotently whether to inject.
  var injected = false;
  var injectTimer = null;

  // Ordered list of every chat bubble currently in the conversation.
  function allBubbles(doc) {
    return Array.prototype.slice.call(
      doc.querySelectorAll(CONFIG.messageSelectors.join(','))
    );
  }

  // Should the offers be showing? True once the customer has sent the
  // trigger phrase AND an agent message exists after it. Returns the agent
  // bubble to anchor under, or null.
  function findAnchor(doc) {
    var bubbles = allBubbles(doc);
    var triggerIdx = -1;
    for (var i = 0; i < bubbles.length; i++) {
      if (!isIncoming(bubbles[i]) && normalize(textOf(bubbles[i])) === TRIGGER) {
        triggerIdx = i; // last matching customer confirmation wins
      }
    }
    if (triggerIdx === -1) return null;
    // Anchor = last agent (CSR) bubble that appears after the trigger.
    var anchor = null;
    for (var j = triggerIdx + 1; j < bubbles.length; j++) {
      if (isIncoming(bubbles[j])) anchor = bubbles[j];
    }
    return anchor;
  }

  // Debounced so streaming / re-renders settle before we anchor + inject.
  function evaluate(doc) {
    if (injected) return;
    var anchor = findAnchor(doc);
    if (!anchor) return;
    if (injectTimer) clearTimeout(injectTimer);
    injectTimer = setTimeout(function () {
      if (injected) return;
      var settled = findAnchor(doc); // re-resolve after settle
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

    var obs = new MutationObserver(function () {
      evaluate(doc);
    });
    obs.observe(doc.body, { childList: true, subtree: true, characterData: true });
    attached.observer = obs;
    evaluate(doc);
    console.log('[AgenticOffers] attached to widget iframe.');
  }

  setInterval(ensureAttached, 500);
  ensureAttached();

  // ── Public API for live demoing from the console ─────────────
  window.AgenticOffers = {
    config: CONFIG,
    enable: function () { CONFIG.enabled = true; },
    disable: function () { CONFIG.enabled = false; },
    /** Manually drop the offer card in (handy for testing without typing). */
    trigger: function () {
      var doc = getIframeDoc();
      if (!doc) { console.warn('[AgenticOffers] iframe not reachable'); return; }
      var msgs = doc.querySelectorAll(CONFIG.messageSelectors.join(','));
      var anchor = msgs[msgs.length - 1] || doc.body;
      injectInto(doc, anchor);
    },
    /** Remove any injected card and re-arm so the flow can run again. */
    reset: function () {
      injected = false;
      if (injectTimer) { clearTimeout(injectTimer); injectTimer = null; }
      var doc = getIframeDoc();
      if (doc) {
        var cards = doc.querySelectorAll('.ao-msg');
        for (var i = 0; i < cards.length; i++) cards[i].remove();
      }
      console.log('[AgenticOffers] reset \u2014 ready to inject again.');
    }
  };

  console.log('[AgenticOffers] loaded. Trigger phrase: "' + CONFIG.triggerPhrase + '"');
})();
