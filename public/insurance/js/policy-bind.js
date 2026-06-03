/**
 * Agentic Policy Bind card for Pega Web Messaging
 * ---------------------------------------------------------------
 * Adds the final "review & bind" step to the demo. After the agent says
 * it's ready to bind, this drops an interactive policy-summary card into
 * the conversation (matching the production widget's look). When the
 * customer clicks "Accept & Bind Policy", it sends a REAL chat message
 * ("Accept and bind policy") into the widget input, which the Pega agent
 * recognizes and answers with the binding confirmation.
 *
 * Trigger: an agent (CSR) message containing the bind-review prompt
 *          ("…review your new policy before I move forward with binding…").
 *
 * Presentation-layer only — it injects into the SAME-ORIGIN widget iframe
 * (#pegaChatWidget) and uses the widget's own input to send the message,
 * so the conversation continues through the real Pega agent.
 *
 * Tweak live from the console via:  window.PolicyBind.config
 */
(function () {
  'use strict';

  if (window.__policyBind) return;
  window.__policyBind = true;

  // ── Configuration ────────────────────────────────────────────
  var CONFIG = {
    iframeId: 'pegaChatWidget',

    // Agent (CSR) message that arms this step. Matched loosely (lowercased,
    // whitespace/punctuation-normalized, substring) so wording can vary.
    triggerPhrases: [
      'review your new policy before i move forward with binding',
      'feel free to review your new policy'
    ],

    // The message the button sends into the chat on the customer's behalf.
    // The Pega agent rule keys off this to send the binding confirmation.
    bindMessage: 'Accept and bind policy',

    // Fallback brand color if it can't be detected from the live widget.
    brandColor: '#CA0000',

    // Card copy.
    introText: 'Review your new coverage:',
    vehicle: '2025 Toyota RAV4 LE',
    policyId: 'Policy SA-Agnt-260423054845000',
    premiumLabel: 'Monthly premium',
    premiumValue: '$147.50',
    discountsLabel: 'Discounts applied',
    discountsValue: '3 active',
    ctaText: 'Accept & Bind Policy',
    detailsText: 'View full policy details',
    detailsHref: 'https://raw.githubusercontent.com/frankmark94/PW2026_UplusInsurance/main/insurancepolicy.png',

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

  // Detect brand color from the widget header; fall back to CONFIG.
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

  // ── Styles ───────────────────────────────────────────────────
  function injectStyles(doc) {
    if (doc.getElementById('pb-bind-styles')) return;
    var brand = detectBrandColor(doc);
    var style = doc.createElement('style');
    style.id = 'pb-bind-styles';
    style.textContent = [
      '@keyframes pbRise{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}',
      // Agent message row + outer bubble (matches the CSR bubble look).
      '.pb-msg{margin:0 0 6px;padding:0 8px;font-family:inherit;animation:pbRise .3s ease both;}',
      '.pb-bubble{background:#e9ebef;color:#1d1d1f;border-radius:4px 16px 16px 16px;',
      'padding:10px 14px;max-width:calc(100% - 32px);overflow-wrap:break-word;}',
      '.pb-bubble-text{font-size:13px;font-weight:500;line-height:1.45;margin:0 0 10px;}',
      // Inner white policy card.
      '.pb-card{background:#fff;border-radius:12px;padding:14px;box-shadow:0 1px 4px rgba(5,5,5,.12);}',
      '.pb-head{display:flex;align-items:center;gap:12px;}',
      '.pb-car{flex-shrink:0;width:40px;height:40px;color:' + brand + ';}',
      '.pb-head-info{min-width:0;}',
      '.pb-vehicle{font-size:15px;font-weight:700;line-height:1.2;color:#1d1d1f;}',
      '.pb-policy{font-size:12px;font-weight:500;color:#8a8a93;line-height:1.3;margin-top:2px;}',
      '.pb-rule{border:none;border-top:1px solid #e4e4ea;margin:12px 0;}',
      '.pb-stats{display:flex;gap:16px;}',
      '.pb-stat{flex:1;min-width:0;}',
      '.pb-stat-label{font-size:12px;font-weight:500;color:#8a8a93;line-height:1.3;}',
      '.pb-stat-value{font-size:17px;font-weight:700;color:#1d1d1f;line-height:1.2;margin-top:3px;}',
      '.pb-stat-value.pb-green{color:#1ea873;}',
      // CTA button.
      '.pb-cta{display:block;width:100%;border:none;cursor:pointer;background:' + brand + ';color:#fff;',
      'font-family:inherit;font-size:14px;font-weight:700;letter-spacing:.2px;border-radius:8px;',
      'padding:12px 14px;transition:filter .15s,opacity .15s;}',
      '.pb-cta:hover{filter:brightness(1.08);}',
      '.pb-cta:disabled{cursor:default;opacity:.6;filter:none;}',
      '.pb-details{display:block;text-align:center;font-size:12.5px;font-weight:600;color:#3a3a44;',
      'text-decoration:underline;margin-top:10px;cursor:pointer;}',
      '.pb-details:hover{color:' + brand + ';}',
      '.pb-sent{margin-top:10px;font-size:11.5px;color:#1ea873;font-weight:600;text-align:center;display:none;}',
      '.pb-sent.show{display:block;animation:pbRise .3s ease both;}'
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

  // ── Send a real message through the widget's own input ───────
  // The input is React-controlled, so we set the value via the native
  // setter and dispatch a real 'input' event so React's state updates,
  // then submit (send button if present, else Enter key).
  function sendWidgetMessage(doc, text) {
    var win = doc.defaultView;
    var input = doc.querySelector('textarea, input[type="text"], [contenteditable="true"]');
    if (!input) {
      console.warn('[PolicyBind] could not find the message input to send:', text);
      return false;
    }

    try { input.focus(); } catch (e) { /* ignore */ }

    if (input.isContentEditable) {
      input.textContent = text;
      input.dispatchEvent(new win.Event('input', { bubbles: true }));
    } else {
      var proto = input.tagName === 'TEXTAREA'
        ? win.HTMLTextAreaElement.prototype
        : win.HTMLInputElement.prototype;
      var setter = Object.getOwnPropertyDescriptor(proto, 'value');
      if (setter && setter.set) {
        setter.set.call(input, text);
      } else {
        input.value = text;
      }
      input.dispatchEvent(new win.Event('input', { bubbles: true }));
      input.dispatchEvent(new win.Event('change', { bubbles: true }));
    }

    // Prefer an explicit send button.
    var sendBtn = doc.querySelector(
      '[data-testid*="send" i], button[aria-label*="send" i], [aria-label*="send message" i]'
    );
    if (sendBtn) {
      sendBtn.click();
      return true;
    }

    // Fallback: simulate pressing Enter in the input.
    ['keydown', 'keypress', 'keyup'].forEach(function (type) {
      input.dispatchEvent(new win.KeyboardEvent(type, {
        key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true
      }));
    });
    return true;
  }

  // ── Build the policy card ────────────────────────────────────
  var CAR_SVG =
    '<svg class="pb-car" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
    '<path d="M5 11l1.5-4.5A2 2 0 0 1 8.4 5h7.2a2 2 0 0 1 1.9 1.5L19 11" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path d="M3 16v-1.5a2 2 0 0 1 1.2-1.83L5 12.3a2 2 0 0 1 .8-.17h12.4a2 2 0 0 1 .8.17l.8.37A2 2 0 0 1 21 14.5V16a1 1 0 0 1-1 1h-1v1.5a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1V17H9v1.5a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V17H5a1 1 0 0 1-1-1z" fill="currentColor"/>' +
    '<circle cx="7.5" cy="14.5" r="1" fill="#fff"/><circle cx="16.5" cy="14.5" r="1" fill="#fff"/></svg>';

  function buildCard(doc) {
    var msg = doc.createElement('div');
    msg.className = 'pb-msg';
    msg.setAttribute('data-pb-card', '1');

    var bubble = doc.createElement('div');
    bubble.className = 'pb-bubble';

    var intro = doc.createElement('p');
    intro.className = 'pb-bubble-text';
    intro.textContent = CONFIG.introText;
    bubble.appendChild(intro);

    var card = doc.createElement('div');
    card.className = 'pb-card';

    // Header: car icon + vehicle + policy id
    var head = doc.createElement('div');
    head.className = 'pb-head';
    head.innerHTML = CAR_SVG;
    var headInfo = doc.createElement('div');
    headInfo.className = 'pb-head-info';
    var veh = doc.createElement('div');
    veh.className = 'pb-vehicle';
    veh.textContent = CONFIG.vehicle;
    var pol = doc.createElement('div');
    pol.className = 'pb-policy';
    pol.textContent = CONFIG.policyId;
    headInfo.appendChild(veh);
    headInfo.appendChild(pol);
    head.appendChild(headInfo);
    card.appendChild(head);

    card.appendChild(rule(doc));

    // Stats row
    var stats = doc.createElement('div');
    stats.className = 'pb-stats';
    stats.appendChild(stat(doc, CONFIG.premiumLabel, CONFIG.premiumValue, false));
    stats.appendChild(stat(doc, CONFIG.discountsLabel, CONFIG.discountsValue, true));
    card.appendChild(stats);

    card.appendChild(rule(doc));

    // CTA button
    var cta = doc.createElement('button');
    cta.type = 'button';
    cta.className = 'pb-cta';
    cta.textContent = CONFIG.ctaText;

    var sent = doc.createElement('div');
    sent.className = 'pb-sent';
    sent.textContent = '\u2713 Sent \u2014 binding your policy\u2026';

    cta.addEventListener('click', function () {
      if (cta.disabled) return;
      var ok = sendWidgetMessage(doc, CONFIG.bindMessage);
      if (ok) {
        cta.disabled = true;
        cta.textContent = 'Binding\u2026';
        sent.classList.add('show');
        scrollToBottom(msg);
        console.log('[PolicyBind] bind message sent:', CONFIG.bindMessage);
      }
    });
    card.appendChild(cta);

    // Details link
    var details = doc.createElement('a');
    details.className = 'pb-details';
    details.textContent = CONFIG.detailsText;
    details.href = CONFIG.detailsHref;
    details.target = '_blank';
    details.rel = 'noopener noreferrer';
    card.appendChild(details);

    card.appendChild(sent);
    bubble.appendChild(card);
    msg.appendChild(bubble);
    return msg;
  }

  function rule(doc) {
    var hr = doc.createElement('hr');
    hr.className = 'pb-rule';
    return hr;
  }

  function stat(doc, label, value, green) {
    var s = doc.createElement('div');
    s.className = 'pb-stat';
    var l = doc.createElement('div');
    l.className = 'pb-stat-label';
    l.textContent = label;
    var v = doc.createElement('div');
    v.className = 'pb-stat-value' + (green ? ' pb-green' : '');
    v.textContent = value;
    s.appendChild(l);
    s.appendChild(v);
    return s;
  }

  // ── Inject under the agent's review message ──────────────────
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
    console.log('[PolicyBind] policy review card injected.');
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

  // ── Idempotent scan: inject once under the agent review message ──
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
    console.log('[PolicyBind] attached to widget iframe.');
  }

  setInterval(ensureAttached, 500);
  ensureAttached();

  // ── Public API ───────────────────────────────────────────────
  window.PolicyBind = {
    config: CONFIG,
    enable: function () { CONFIG.enabled = true; },
    disable: function () { CONFIG.enabled = false; },
    /** Force-inject the policy card under the latest agent message. */
    trigger: function () {
      var doc = getIframeDoc();
      if (!doc) { console.warn('[PolicyBind] iframe not reachable'); return; }
      var msgs = doc.querySelectorAll(CONFIG.messageSelectors.join(','));
      var anchor = msgs[msgs.length - 1] || doc.body;
      injectInto(doc, anchor);
    },
    /** Remove the injected card and re-arm so the flow can run again. */
    reset: function () {
      injected = false;
      if (injectTimer) { clearTimeout(injectTimer); injectTimer = null; }
      var doc = getIframeDoc();
      if (doc) {
        var cards = doc.querySelectorAll('.pb-msg');
        for (var i = 0; i < cards.length; i++) cards[i].remove();
      }
      console.log('[PolicyBind] reset \u2014 ready to inject again.');
    }
  };

  console.log('[PolicyBind] loaded. Sends "' + CONFIG.bindMessage + '" on accept.');
})();
