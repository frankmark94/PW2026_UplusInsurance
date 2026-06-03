/**
 * Coverage Advisor escalation card for Pega Web Messaging
 * ---------------------------------------------------------------
 * After the agentic assistant offers to connect the customer with a live
 * coverage advisor ("…best handled by one of our coverage advisors…"),
 * this drops a branded "Escalating to a Coverage Advisor" card into the
 * conversation showing a few advisors currently online (avatars pulled
 * from /img). A "Connect with Care Advisor" button sends a REAL chat
 * message ("Yes, please connect me") into the widget input so the Pega
 * agent continues the flow.
 *
 * Trigger: an agent (CSR) message containing the advisor hand-off prompt.
 *
 * Presentation-layer only — injects into the SAME-ORIGIN widget iframe
 * (#pegaChatWidget) and uses the widget's own input to send the message.
 *
 * Tweak live from the console via:  window.EscalationAdvisor.config
 */
(function () {
  'use strict';

  if (window.__escalationAdvisor) return;
  window.__escalationAdvisor = true;

  // ── Configuration ────────────────────────────────────────────
  var CONFIG = {
    iframeId: 'pegaChatWidget',

    // Agent (CSR) message that arms this step. Matched loosely (lowercased,
    // whitespace/punctuation-normalized, substring) so wording can vary.
    triggerPhrases: [
      'best handled by one of our coverage advisors',
      'connect you with one right now',
      'want me to connect you'
    ],

    // The message the button sends into the chat on the customer's behalf.
    connectMessage: 'Yes, please connect me',

    // Fallback brand color if it can't be detected from the live widget.
    brandColor: '#CA0000',

    // Card copy.
    title: 'Connecting you to a Coverage Advisor',
    subtitle: 'A few specialists are online now and ready to pick up right where we left off:',
    onlineNote: 'advisors online',
    ctaText: 'Connect with Care Advisor',

    // Advisors shown as "online". Images resolve from /img.
    advisors: [
      { name: 'Carmen Alvarez', role: 'Auto Coverage Specialist', img: '/img/Avatar-Carmen-Alvarez.jpg' },
      { name: 'James McNaulty', role: 'Rideshare & Commercial Use', img: '/img/Avatar-David-Achebe.jpg' },
      { name: 'Maggie Thompson', role: 'Policy Advisor', img: '/img/Avatar-Maggie-Thompson.jpg' }
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
    if (doc.getElementById('ea-advisor-styles')) return;
    var brand = detectBrandColor(doc);
    var brandDeep = '#7a0b0b';
    var style = doc.createElement('style');
    style.id = 'ea-advisor-styles';
    style.textContent = [
      '@keyframes eaRise{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}',
      '@keyframes eaPulse{0%{box-shadow:0 0 0 0 rgba(30,168,115,.55)}70%{box-shadow:0 0 0 6px rgba(30,168,115,0)}100%{box-shadow:0 0 0 0 rgba(30,168,115,0)}}',
      '@keyframes eaAvatarIn{from{opacity:0;transform:scale(.6)}to{opacity:1;transform:scale(1)}}',
      // Agent message row + frosted outer bubble (matches the modern CSR bubble).
      '.ea-msg{margin:0 0 6px;padding:0 8px;font-family:inherit;animation:eaRise .3s ease both;}',
      '.ea-bubble{background:rgba(255,255,255,.86);color:#241016;border-radius:4px 18px 18px 18px;',
      'backdrop-filter:blur(8px) saturate(1.1);-webkit-backdrop-filter:blur(8px) saturate(1.1);',
      'border:1px solid rgba(255,255,255,.65);box-shadow:0 6px 18px rgba(42,8,8,.10);',
      'padding:12px 14px;max-width:calc(100% - 24px);overflow-wrap:break-word;}',
      // Inner white card.
      '.ea-card{background:#fff;border-radius:18px;padding:15px;',
      'border:1px solid rgba(42,8,8,.06);box-shadow:0 8px 24px rgba(42,8,8,.12);}',
      // Header with routing icon.
      '.ea-head{display:flex;align-items:center;gap:10px;}',
      '.ea-badge{flex-shrink:0;width:36px;height:36px;border-radius:50%;display:flex;align-items:center;',
      'justify-content:center;background:linear-gradient(135deg,' + brand + ' 0%,' + brandDeep + ' 100%);',
      'color:#fff;box-shadow:0 4px 12px rgba(202,0,0,.28);}',
      '.ea-badge svg{width:20px;height:20px;}',
      '.ea-title{font-size:14px;font-weight:700;line-height:1.25;color:#241016;letter-spacing:-.01em;}',
      '.ea-subtitle{font-size:12.5px;font-weight:500;line-height:1.45;color:#8a7a7d;margin:10px 0 12px;}',
      // Advisor list.
      '.ea-advisors{display:flex;flex-direction:column;gap:10px;margin-bottom:14px;}',
      '.ea-advisor{display:flex;align-items:center;gap:11px;}',
      '.ea-avatar-wrap{position:relative;flex-shrink:0;animation:eaAvatarIn .35s ease both;}',
      '.ea-avatar{width:42px;height:42px;border-radius:50%;object-fit:cover;display:block;',
      'background:#e4e4ea;border:2px solid #fff;box-shadow:0 1px 3px rgba(5,5,5,.18);}',
      '.ea-dot{position:absolute;right:0;bottom:0;width:11px;height:11px;border-radius:50%;',
      'background:#1ea873;border:2px solid #fff;animation:eaPulse 2s infinite;}',
      '.ea-adv-info{min-width:0;}',
      '.ea-adv-name{font-size:13px;font-weight:700;color:#241016;line-height:1.2;}',
      '.ea-adv-role{font-size:11.5px;font-weight:500;color:#8a7a7d;line-height:1.3;margin-top:1px;}',
      '.ea-online{display:flex;align-items:center;gap:6px;font-size:11.5px;font-weight:600;',
      'color:#1ea873;margin-bottom:12px;}',
      '.ea-online-dot{width:8px;height:8px;border-radius:50%;background:#1ea873;animation:eaPulse 2s infinite;}',
      // CTA button.
      '.ea-cta{display:block;width:100%;border:none;cursor:pointer;color:#fff;',
      'background:linear-gradient(120deg,' + brand + ' 0%,' + brandDeep + ' 100%);',
      'font-family:inherit;font-size:14px;font-weight:700;letter-spacing:.2px;border-radius:12px;',
      'padding:13px 14px;box-shadow:0 6px 16px rgba(202,0,0,.24);',
      'transition:transform .15s,box-shadow .15s,filter .15s,opacity .15s;}',
      '.ea-cta:hover{filter:brightness(1.06);transform:translateY(-1px);box-shadow:0 10px 22px rgba(202,0,0,.30);}',
      '.ea-cta:disabled{cursor:default;opacity:.6;filter:none;}',
      '.ea-sent{margin-top:10px;font-size:11.5px;color:#1ea873;font-weight:600;text-align:center;display:none;}',
      '.ea-sent.show{display:block;animation:eaRise .3s ease both;}'
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
  function sendWidgetMessage(doc, text) {
    var win = doc.defaultView;
    var input = doc.querySelector('textarea, input[type="text"], [contenteditable="true"]');
    if (!input) {
      console.warn('[EscalationAdvisor] could not find the message input to send:', text);
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

    var sendBtn = doc.querySelector(
      '[data-testid*="send" i], button[aria-label*="send" i], [aria-label*="send message" i]'
    );
    if (sendBtn) {
      sendBtn.click();
      return true;
    }

    ['keydown', 'keypress', 'keyup'].forEach(function (type) {
      input.dispatchEvent(new win.KeyboardEvent(type, {
        key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true
      }));
    });
    return true;
  }

  // ── Build the escalation card ────────────────────────────────
  var ROUTE_SVG =
    '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
    '<path d="M16 11a4 4 0 1 0-8 0M4 20a8 8 0 0 1 16 0" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>' +
    '<path d="M18 4l2 2-2 2M20 6h-5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function buildCard(doc) {
    var msg = doc.createElement('div');
    msg.className = 'ea-msg';
    msg.setAttribute('data-ea-card', '1');

    var bubble = doc.createElement('div');
    bubble.className = 'ea-bubble';

    var card = doc.createElement('div');
    card.className = 'ea-card';

    // Header
    var head = doc.createElement('div');
    head.className = 'ea-head';
    var badge = doc.createElement('div');
    badge.className = 'ea-badge';
    badge.innerHTML = ROUTE_SVG;
    var title = doc.createElement('div');
    title.className = 'ea-title';
    title.textContent = CONFIG.title;
    head.appendChild(badge);
    head.appendChild(title);
    card.appendChild(head);

    // Subtitle
    var sub = doc.createElement('div');
    sub.className = 'ea-subtitle';
    sub.textContent = CONFIG.subtitle;
    card.appendChild(sub);

    // Advisor list
    var list = doc.createElement('div');
    list.className = 'ea-advisors';
    CONFIG.advisors.forEach(function (a, i) {
      list.appendChild(advisorRow(doc, a, i));
    });
    card.appendChild(list);

    // Online count line
    var online = doc.createElement('div');
    online.className = 'ea-online';
    var odot = doc.createElement('span');
    odot.className = 'ea-online-dot';
    var otext = doc.createElement('span');
    otext.textContent = CONFIG.advisors.length + ' ' + CONFIG.onlineNote;
    online.appendChild(odot);
    online.appendChild(otext);
    card.appendChild(online);

    // CTA
    var cta = doc.createElement('button');
    cta.type = 'button';
    cta.className = 'ea-cta';
    cta.textContent = CONFIG.ctaText;

    var sent = doc.createElement('div');
    sent.className = 'ea-sent';
    sent.textContent = '\u2713 Connecting you with an advisor\u2026';

    cta.addEventListener('click', function () {
      if (cta.disabled) return;
      var ok = sendWidgetMessage(doc, CONFIG.connectMessage);
      if (ok) {
        cta.disabled = true;
        cta.textContent = 'Connecting\u2026';
        sent.classList.add('show');
        scrollToBottom(msg);
        console.log('[EscalationAdvisor] connect message sent:', CONFIG.connectMessage);
      }
    });
    card.appendChild(cta);
    card.appendChild(sent);

    bubble.appendChild(card);
    msg.appendChild(bubble);
    return msg;
  }

  function advisorRow(doc, advisor, index) {
    var row = doc.createElement('div');
    row.className = 'ea-advisor';

    var wrap = doc.createElement('div');
    wrap.className = 'ea-avatar-wrap';
    wrap.style.animationDelay = (0.08 * index) + 's';
    var img = doc.createElement('img');
    img.className = 'ea-avatar';
    img.src = advisor.img;
    img.alt = advisor.name;
    img.loading = 'lazy';
    var dot = doc.createElement('span');
    dot.className = 'ea-dot';
    wrap.appendChild(img);
    wrap.appendChild(dot);

    var info = doc.createElement('div');
    info.className = 'ea-adv-info';
    var name = doc.createElement('div');
    name.className = 'ea-adv-name';
    name.textContent = advisor.name;
    var role = doc.createElement('div');
    role.className = 'ea-adv-role';
    role.textContent = advisor.role;
    info.appendChild(name);
    info.appendChild(role);

    row.appendChild(wrap);
    row.appendChild(info);
    return row;
  }

  // ── Inject under the agent's hand-off message ────────────────
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
    console.log('[EscalationAdvisor] advisor escalation card injected.');
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

  // ── Idempotent scan: inject once under the agent hand-off message ──
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
    // Self-healing: if our card is already in the DOM, nothing to do. If it
    // was wiped by a React re-render of the message list, fall through and
    // re-inject so the hand-off card survives subsequent messages.
    if (doc.querySelector('.ea-msg')) return;
    var anchor = findAnchor(doc);
    if (!anchor) return;
    if (injectTimer) clearTimeout(injectTimer);
    injectTimer = setTimeout(function () {
      if (doc.querySelector('.ea-msg')) return;
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
    console.log('[EscalationAdvisor] attached to widget iframe.');
  }

  setInterval(ensureAttached, 500);
  ensureAttached();

  // ── Public API ───────────────────────────────────────────────
  window.EscalationAdvisor = {
    config: CONFIG,
    enable: function () { CONFIG.enabled = true; },
    disable: function () { CONFIG.enabled = false; },
    /** Force-inject the escalation card under the latest agent message. */
    trigger: function () {
      var doc = getIframeDoc();
      if (!doc) { console.warn('[EscalationAdvisor] iframe not reachable'); return; }
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
        var cards = doc.querySelectorAll('.ea-msg');
        for (var i = 0; i < cards.length; i++) cards[i].remove();
      }
      console.log('[EscalationAdvisor] reset \u2014 ready to inject again.');
    }
  };

  console.log('[EscalationAdvisor] loaded. Sends "' + CONFIG.connectMessage + '" on connect.');
})();
