/**
 * Fake GenAI Streaming for Pega Web Messaging
 * ---------------------------------------------------------------
 * Makes INCOMING agent / GenAI text messages appear to "stream" in
 * token-by-token (like a live LLM) instead of popping in fully formed.
 *
 * How it works:
 *   1. The Web Messaging widget renders into a SAME-ORIGIN iframe
 *      (#pegaChatWidget). We reach into its contentDocument.
 *   2. A MutationObserver watches the message list for newly-added
 *      agent text bubbles ([data-testid="text_message_csr"]).
 *   3. When a new bubble appears, we capture its final text, blank it,
 *      then re-reveal it word-by-word with a blinking caret.
 *
 * Messages already present when the widget opens (conversation history)
 * are NOT animated — only messages that arrive afterward.
 *
 * Tweak live from the console via:  window.FakeStreaming.config
 */
(function () {
  'use strict';

  if (window.__fakeStreaming) return;
  window.__fakeStreaming = true;

  // ── Configuration ────────────────────────────────────────────
  var CONFIG = {
    iframeId: 'pegaChatWidget',

    // The widget renders bubble text in a span whose data-testid tells us
    // who is speaking:  agent / GenAI bubbles use "text_message_csr",
    // the customer's own bubbles use "text_message". We only stream the
    // agent (CSR) bubbles. The "Message from you …" a11y label is kept as
    // a secondary signal in case the testid ever changes.
    messageSelector: '[data-testid="text_message_csr"], [data-testid="text_message"]',
    incomingTestId: 'text_message_csr',
    outgoingLabelRe: /^\s*message from you\b/i,

    revealMode: 'word', // 'word' or 'char'
    minDelay: 22,        // min ms between tokens
    maxDelay: 60,        // max ms between tokens
    startDelay: 250,     // small "thinking" pause before streaming starts
    showCaret: true,
    caretChar: '\u258C', // ▌
    enabled: true
  };

  function rint(min, max) { return Math.floor(Math.random() * (max - min) + min); }

  // ── Iframe access (same-origin only) ─────────────────────────
  function getIframeDoc() {
    var f = document.getElementById(CONFIG.iframeId);
    if (!f) return null;
    try {
      return f.contentDocument || (f.contentWindow && f.contentWindow.document) || null;
    } catch (e) {
      // Cross-origin — cannot stream. Fail quietly.
      return null;
    }
  }

  function injectStyles(doc) {
    if (doc.getElementById('ft-stream-styles')) return;
    var style = doc.createElement('style');
    style.id = 'ft-stream-styles';
    style.textContent =
      '@keyframes ftBlink { 0%,49%{opacity:1} 50%,100%{opacity:0} }' +
      '.ft-caret{display:inline-block;opacity:.85;animation:ftBlink 1s steps(1) infinite;margin-left:1px;font-weight:400;}';
    (doc.head || doc.documentElement).appendChild(style);
  }

  // ── Detection helpers ────────────────────────────────────────
  // Agent / GenAI (CSR) bubbles use data-testid="text_message_csr"; the
  // customer's own bubbles use data-testid="text_message". We treat the
  // testid as the source of truth, falling back to the hidden
  // "Message from you" a11y label only when the testid is ambiguous.
  function isIncoming(node) {
    var testid = node.getAttribute && node.getAttribute('data-testid');
    if (testid === CONFIG.incomingTestId) return true; // agent / CSR
    if (testid === 'text_message') return false;       // customer
    // Unknown testid — fall back to the a11y label heuristic.
    var wrap = node.parentElement;
    if (wrap) {
      var spans = wrap.querySelectorAll('span');
      for (var i = 0; i < spans.length; i++) {
        if (CONFIG.outgoingLabelRe.test(spans[i].textContent || '')) return false;
      }
    }
    return true;
  }

  function matchesIncoming(node) {
    if (!node.matches) return false;
    return node.matches(CONFIG.messageSelector) && isIncoming(node);
  }

  function collectIncoming(node, out) {
    if (!node || node.nodeType !== 1) return;
    if (matchesIncoming(node)) out.push(node);
    if (node.querySelectorAll) {
      var found = node.querySelectorAll(CONFIG.messageSelector);
      for (var j = 0; j < found.length; j++) {
        if (isIncoming(found[j])) out.push(found[j]);
      }
    }
  }

  // ── Scroll keeping ───────────────────────────────────────────
  function scrollToBottom(node) {
    // Walk up to the nearest scrollable ancestor and pin it to bottom.
    var el = node.parentElement;
    while (el) {
      if (el.scrollHeight > el.clientHeight + 4) {
        el.scrollTop = el.scrollHeight;
        return;
      }
      el = el.parentElement;
    }
  }

  // ── Tokenizer (HTML-aware) ───────────────────────────────────
  // Walks the original DOM of the bubble and produces a flat token
  // stream that preserves structure (e.g. <br> line breaks, links).
  //   { type: 'text', value }   — a word / char chunk to type out
  //   { type: 'void', node }    — a self-closing element clone (<br>)
  //   { type: 'enter', node }   — open a wrapper element clone
  //   { type: 'exit' }          — close the current wrapper
  // Only 'text' and 'void' tokens consume a typing delay; 'enter'/'exit'
  // are applied instantly so markup snaps into place around the text.
  function tokenize(parent, tokens) {
    var kids = parent.childNodes;
    for (var i = 0; i < kids.length; i++) {
      var child = kids[i];
      if (child.nodeType === 3) { // text node
        var raw = child.nodeValue || '';
        if (!raw) continue;
        var chunks = CONFIG.revealMode === 'char'
          ? raw.split('')
          : (raw.match(/\s*\S+|\s+/g) || [raw]);
        for (var c = 0; c < chunks.length; c++) {
          tokens.push({ type: 'text', value: chunks[c] });
        }
      } else if (child.nodeType === 1) { // element
        if (!child.firstChild) {
          // Empty / void element such as <br> — preserve it verbatim.
          tokens.push({ type: 'void', node: child.cloneNode(false) });
        } else {
          tokens.push({ type: 'enter', node: child.cloneNode(false) });
          tokenize(child, tokens);
          tokens.push({ type: 'exit' });
        }
      }
    }
  }

  // ── The streaming effect ─────────────────────────────────────
  function streamNode(node) {
    if (node.__ftStreamed) return;
    var fullText = node.textContent;
    if (!fullText || !fullText.trim()) return;
    node.__ftStreamed = true;

    if (!CONFIG.enabled) return; // streaming disabled — leave message intact

    var doc = node.ownerDocument;
    var originalHTML = node.innerHTML; // preserve <br> and any inline markup

    // Build the structure-preserving token stream from the live DOM,
    // then blank the bubble before replaying it.
    var tokens = [];
    tokenize(node, tokens);
    node.textContent = '';

    var caret = null;
    if (CONFIG.showCaret) {
      caret = doc.createElement('span');
      caret.className = 'ft-caret';
      caret.textContent = CONFIG.caretChar;
      node.appendChild(caret);
    }

    // Stack of "current containers" — starts at the bubble itself and
    // grows/shrinks as we enter/exit wrapper elements.
    var stack = [node];

    function placeInCurrent(child) {
      var cur = stack[stack.length - 1];
      // Keep the caret pinned to the end of the bubble.
      if (caret && cur === node) node.insertBefore(child, caret);
      else cur.appendChild(child);
    }

    var i = 0;
    function step() {
      // If the widget removed the node mid-stream, bail out.
      if (!node.isConnected) return;

      // Apply tokens until we render a visible one (text/void), so that
      // enter/exit markup is positioned instantly around the next word.
      while (i < tokens.length) {
        var t = tokens[i++];
        if (t.type === 'enter') {
          placeInCurrent(t.node);
          stack.push(t.node);
        } else if (t.type === 'exit') {
          if (stack.length > 1) stack.pop();
        } else if (t.type === 'void') {
          placeInCurrent(t.node);
          scrollToBottom(node);
          setTimeout(step, rint(CONFIG.minDelay, CONFIG.maxDelay));
          return;
        } else if (t.type === 'text') {
          placeInCurrent(doc.createTextNode(t.value));
          scrollToBottom(node);
          setTimeout(step, rint(CONFIG.minDelay, CONFIG.maxDelay));
          return;
        }
      }

      // Done — restore exact original markup so the widget's own
      // logic / copy actions see clean, untouched HTML.
      if (caret && caret.parentNode) caret.parentNode.removeChild(caret);
      node.innerHTML = originalHTML;
      scrollToBottom(node);
    }
    setTimeout(step, CONFIG.startDelay);
  }

  function scheduleStream(node) {
    if (node.__ftStreamed || node.__ftScheduled) return;
    node.__ftScheduled = true;
    var tries = 0;
    (function waitForText() {
      if (node.__ftStreamed) return;
      var txt = node.textContent;
      if (txt && txt.trim()) {
        streamNode(node);
      } else if (tries++ < 60) {
        setTimeout(waitForText, 25);
      }
    })();
  }

  // ── Attach / re-attach to the iframe document ────────────────
  var attached = { doc: null, observer: null };

  function ensureAttached() {
    var doc = getIframeDoc();
    if (!doc || !doc.body) return;
    if (attached.doc === doc) return; // already wired to this document

    if (attached.observer) {
      attached.observer.disconnect();
      attached.observer = null;
    }
    attached.doc = doc;
    injectStyles(doc);

    // Mark ALL existing incoming bubbles as already-streamed so we
    // never animate conversation history — only new arrivals.
    var existing = [];
    collectIncoming(doc.body, existing);
    existing.forEach(function (n) { n.__ftStreamed = true; });

    var obs = new MutationObserver(function (mutations) {
      for (var m = 0; m < mutations.length; m++) {
        var added = mutations[m].addedNodes;
        if (!added) continue;
        for (var a = 0; a < added.length; a++) {
          var hits = [];
          collectIncoming(added[a], hits);
          hits.forEach(scheduleStream);
        }
      }
    });
    obs.observe(doc.body, { childList: true, subtree: true });
    attached.observer = obs;

    console.log('[FakeStreaming] attached to widget iframe (' +
      existing.length + ' history messages skipped).');
  }

  // Poll so we re-attach if the widget is toggled / re-rendered.
  setInterval(ensureAttached, 500);
  ensureAttached();

  // ── Public API for live tweaking from the console ────────────
  window.FakeStreaming = {
    config: CONFIG,
    enable: function () { CONFIG.enabled = true; },
    disable: function () { CONFIG.enabled = false; },
    /** Manually re-stream the last incoming message (handy for testing). */
    replayLast: function () {
      var doc = getIframeDoc();
      if (!doc) { console.warn('[FakeStreaming] iframe not reachable'); return; }
      var all = [];
      collectIncoming(doc.body, all);
      var last = all[all.length - 1];
      if (!last) { console.warn('[FakeStreaming] no incoming messages found'); return; }
      last.__ftStreamed = false;
      last.__ftScheduled = false;
      scheduleStream(last);
    }
  };

  console.log('[FakeStreaming] loaded. Tweak via window.FakeStreaming.config');
})();
