/**
 * Proactive Chat Panel (PCP)
 * ---------------------------------------------------------------
 * Presenter-only dev overlay for the PegaWorld 2026 demo.
 *
 * Press the backtick (`) key on any page of the U+ Insurance site to
 * toggle a floating control panel that lets you:
 *   - Enter a Trigger code and a Delay (seconds)
 *   - Start an armed proactive chat trigger (with live countdown)
 *   - Fire now (immediate)
 *   - Cancel an armed trigger
 *   - Toggle "Auto-fire at 60% scroll" (rideshare page only)
 *
 * Firing calls window.PegaUnifiedChatWidget.triggerChat(code) — the
 * same call the existing config-settings "Proactive chat on page load"
 * makes from src/global.js. This panel only fires the event; the Web
 * Messaging widget is responsible for the UI.
 *
 * Values persist to localStorage (pcp.code / pcp.delay / pcp.autoScroll).
 */
(function () {
  'use strict';

  if (window.PCPPanel && window.PCPPanel.__initialized) return;

  var LS = {
    code: 'pcp.code',
    delay: 'pcp.delay',
    autoScroll: 'pcp.autoScroll',
  };

  var DEFAULTS = {
    code: '5sonPage',
    delay: 5,
    autoScroll: true,
  };

  var state = {
    armTimer: null,
    countdownTimer: null,
    remaining: 0,
    scrollWired: false,
    scrollFired: false,
  };

  // ---------- storage helpers ----------
  function readStore() {
    var code = localStorage.getItem(LS.code);
    var delay = parseFloat(localStorage.getItem(LS.delay));
    var autoScrollRaw = localStorage.getItem(LS.autoScroll);
    return {
      code: code || DEFAULTS.code,
      delay: isFinite(delay) && delay >= 0 ? delay : DEFAULTS.delay,
      autoScroll: autoScrollRaw === null ? DEFAULTS.autoScroll : autoScrollRaw === 'true',
    };
  }

  function writeStore(partial) {
    if (typeof partial.code === 'string') localStorage.setItem(LS.code, partial.code);
    if (typeof partial.delay === 'number') localStorage.setItem(LS.delay, String(partial.delay));
    if (typeof partial.autoScroll === 'boolean') localStorage.setItem(LS.autoScroll, String(partial.autoScroll));
  }

  // ---------- CSS ----------
  var CSS = [
    '#pcp-panel {',
    '  position: fixed; top: 88px; right: 20px; z-index: 10000;',
    '  width: 340px; background: #fff; color: #050505;',
    "  font: 13px/1.4 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;",
    '  border: 1px solid #e5e5e5; border-left: 4px solid #CA0000;',
    '  border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.15);',
    '  padding: 16px 18px 14px;',
    '}',
    '#pcp-panel[hidden] { display: none !important; }',
    '#pcp-panel .pcp-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }',
    '#pcp-panel .pcp-title { font-size: 13px; font-weight: 700; letter-spacing: 0.3px; text-transform: uppercase; color: #CA0000; }',
    '#pcp-panel .pcp-close { background: none; border: 0; font-size: 20px; line-height: 1; color: #888; cursor: pointer; padding: 0 4px; }',
    '#pcp-panel .pcp-close:hover { color: #050505; }',
    '#pcp-panel .pcp-row { display: flex; flex-direction: column; margin-bottom: 10px; }',
    '#pcp-panel .pcp-row label { font-size: 11px; font-weight: 600; color: #555; text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 4px; }',
    '#pcp-panel .pcp-row input[type="text"], #pcp-panel .pcp-row input[type="number"] {',
    "  font: 14px/1.2 'Inter', sans-serif; padding: 8px 10px; border: 1px solid #d5d5d5;",
    '  border-radius: 4px; background: #fff; color: #050505;',
    '}',
    '#pcp-panel .pcp-row input:focus { outline: none; border-color: #CA0000; box-shadow: 0 0 0 2px rgba(202,0,0,0.12); }',
    '#pcp-panel .pcp-check { display: flex; align-items: center; gap: 8px; margin: 4px 0 12px; font-size: 12px; color: #333; }',
    '#pcp-panel .pcp-check input { accent-color: #CA0000; }',
    '#pcp-panel .pcp-btns { display: flex; gap: 8px; margin-top: 4px; }',
    '#pcp-panel .pcp-btn {',
    "  flex: 1; font: 600 13px/1.2 'Inter', sans-serif; padding: 9px 12px; border-radius: 4px; cursor: pointer;",
    '  border: 1px solid transparent; transition: opacity 0.15s, background 0.15s;',
    '}',
    '#pcp-panel .pcp-btn.pcp-primary { background: #CA0000; color: #fff; }',
    '#pcp-panel .pcp-btn.pcp-primary:hover { opacity: 0.9; }',
    '#pcp-panel .pcp-btn.pcp-secondary { background: #fff; color: #CA0000; border-color: #CA0000; }',
    '#pcp-panel .pcp-btn.pcp-secondary:hover { background: rgba(202,0,0,0.06); }',
    '#pcp-panel .pcp-status { margin-top: 10px; padding: 8px 10px; border-radius: 4px; font-size: 12px; display: none; align-items: center; justify-content: space-between; gap: 8px; }',
    '#pcp-panel .pcp-status.pcp-armed { display: flex; background: #fff4d6; color: #a06a00; }',
    '#pcp-panel .pcp-status.pcp-idle { display: flex; background: #f4f4f4; color: #555; }',
    '#pcp-panel .pcp-cancel { background: none; border: 1px solid currentColor; color: inherit; font: 600 11px/1 sans-serif; padding: 4px 8px; border-radius: 3px; cursor: pointer; text-transform: uppercase; letter-spacing: 0.4px; }',
    '#pcp-panel .pcp-cancel:hover { background: rgba(0,0,0,0.06); }',
    '#pcp-panel .pcp-hint { margin-top: 10px; font-size: 11px; color: #888; }',
    '#pcp-panel .pcp-hint code { background: #f2f2f2; padding: 1px 5px; border-radius: 3px; font-family: ui-monospace, "SF Mono", Menlo, monospace; }',
  ].join('\n');

  function injectCSS() {
    if (document.getElementById('pcp-style')) return;
    var style = document.createElement('style');
    style.id = 'pcp-style';
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  // ---------- Panel markup ----------
  function buildPanel() {
    var stored = readStore();
    var panel = document.createElement('div');
    panel.id = 'pcp-panel';
    panel.hidden = true;
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Proactive chat presenter controls');
    panel.innerHTML = [
      '<div class="pcp-head">',
      '  <span class="pcp-title">Proactive chat · presenter</span>',
      '  <button type="button" class="pcp-close" aria-label="Close">&times;</button>',
      '</div>',
      '<div class="pcp-row">',
      '  <label for="pcp-code">Trigger code</label>',
      '  <input id="pcp-code" type="text" autocomplete="off" spellcheck="false" />',
      '</div>',
      '<div class="pcp-row">',
      '  <label for="pcp-delay">Delay (seconds)</label>',
      '  <input id="pcp-delay" type="number" min="0" step="1" />',
      '</div>',
      '<label class="pcp-check">',
      '  <input id="pcp-autoscroll" type="checkbox" />',
      '  <span>Auto-fire at 60% scroll (rideshare page)</span>',
      '</label>',
      '<div class="pcp-btns">',
      '  <button type="button" class="pcp-btn pcp-primary" id="pcp-start">Start</button>',
      '  <button type="button" class="pcp-btn pcp-secondary" id="pcp-firenow">Fire now</button>',
      '</div>',
      '<div class="pcp-status" id="pcp-status">',
      '  <span id="pcp-status-text">Idle</span>',
      '  <button type="button" class="pcp-cancel" id="pcp-cancel" hidden>Cancel</button>',
      '</div>',
      '<div class="pcp-hint">Press <code>`</code> to toggle · <code>Esc</code> to close</div>',
    ].join('\n');
    document.body.appendChild(panel);

    panel.querySelector('#pcp-code').value = stored.code;
    panel.querySelector('#pcp-delay').value = String(stored.delay);
    panel.querySelector('#pcp-autoscroll').checked = !!stored.autoScroll;

    wirePanel(panel);
    return panel;
  }

  function setStatus(kind, text, showCancel) {
    var el = document.getElementById('pcp-status');
    var txt = document.getElementById('pcp-status-text');
    var cancel = document.getElementById('pcp-cancel');
    if (!el || !txt || !cancel) return;
    el.className = 'pcp-status ' + (kind === 'armed' ? 'pcp-armed' : 'pcp-idle');
    txt.textContent = text;
    cancel.hidden = !showCancel;
  }

  function clearTimers() {
    if (state.armTimer) { clearTimeout(state.armTimer); state.armTimer = null; }
    if (state.countdownTimer) { clearInterval(state.countdownTimer); state.countdownTimer = null; }
  }

  function wirePanel(panel) {
    var codeEl = panel.querySelector('#pcp-code');
    var delayEl = panel.querySelector('#pcp-delay');
    var autoEl = panel.querySelector('#pcp-autoscroll');

    panel.querySelector('.pcp-close').addEventListener('click', function () {
      panel.hidden = true;
    });

    codeEl.addEventListener('change', function () { writeStore({ code: codeEl.value || DEFAULTS.code }); });
    delayEl.addEventListener('change', function () {
      var n = parseFloat(delayEl.value);
      writeStore({ delay: isFinite(n) && n >= 0 ? n : DEFAULTS.delay });
    });
    autoEl.addEventListener('change', function () { writeStore({ autoScroll: !!autoEl.checked }); });

    panel.querySelector('#pcp-start').addEventListener('click', function () {
      var code = (codeEl.value || DEFAULTS.code).trim();
      var delay = parseFloat(delayEl.value);
      if (!isFinite(delay) || delay < 0) delay = DEFAULTS.delay;
      writeStore({ code: code, delay: delay });
      armTrigger(code, delay);
    });

    panel.querySelector('#pcp-firenow').addEventListener('click', function () {
      var code = (codeEl.value || DEFAULTS.code).trim();
      writeStore({ code: code });
      clearTimers();
      fireProactive(code);
      setStatus('idle', 'Fired: ' + code, false);
    });

    panel.querySelector('#pcp-cancel').addEventListener('click', function () {
      clearTimers();
      setStatus('idle', 'Canceled', false);
    });
  }

  function armTrigger(code, delaySec) {
    clearTimers();
    if (delaySec <= 0) {
      fireProactive(code);
      setStatus('idle', 'Fired: ' + code, false);
      return;
    }
    state.remaining = Math.ceil(delaySec);
    setStatus('armed', 'Firing "' + code + '" in ' + state.remaining + 's…', true);
    state.countdownTimer = setInterval(function () {
      state.remaining -= 1;
      if (state.remaining <= 0) {
        clearInterval(state.countdownTimer);
        state.countdownTimer = null;
        return;
      }
      setStatus('armed', 'Firing "' + code + '" in ' + state.remaining + 's…', true);
    }, 1000);
    state.armTimer = setTimeout(function () {
      clearTimers();
      fireProactive(code);
      setStatus('idle', 'Fired: ' + code, false);
    }, delaySec * 1000);
  }

  // ---------- Fire ----------
  // Mirrors the call shape used by src/global.js for the existing
  // "Proactive chat on page load" config:
  //   window.PegaUnifiedChatWidget.triggerChat(code)
  function fireProactive(code) {
    if (window.PegaUnifiedChatWidget && typeof window.PegaUnifiedChatWidget.triggerChat === 'function') {
      console.log('[PCP] PegaUnifiedChatWidget.triggerChat("' + code + '")');
      try {
        window.PegaUnifiedChatWidget.triggerChat(code);
      } catch (err) {
        console.error('[PCP] triggerChat threw:', err);
      }
    } else {
      console.warn('[PCP] PegaUnifiedChatWidget.triggerChat is not available on this page — nothing fired. Code:', code);
    }
  }

  // ---------- Keyboard toggle ----------
  function isTypingInPanel(target) {
    if (!target || !target.closest) return false;
    if (!target.closest('#pcp-panel')) return false;
    var tag = (target.tagName || '').toUpperCase();
    if (tag === 'INPUT' || tag === 'TEXTAREA') return true;
    if (target.isContentEditable) return true;
    return false;
  }

  function wireKeyboard() {
    document.addEventListener('keydown', function (e) {
      if (e.key === '`' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (isTypingInPanel(e.target)) return;
        var panel = document.getElementById('pcp-panel') || buildPanel();
        panel.hidden = !panel.hidden;
        if (!panel.hidden) {
          var s = readStore();
          panel.querySelector('#pcp-code').value = s.code;
          panel.querySelector('#pcp-delay').value = String(s.delay);
          panel.querySelector('#pcp-autoscroll').checked = !!s.autoScroll;
          setTimeout(function () { panel.querySelector('#pcp-code').focus(); }, 0);
        }
        e.preventDefault();
      } else if (e.key === 'Escape') {
        var panel = document.getElementById('pcp-panel');
        if (panel && !panel.hidden) {
          panel.hidden = true;
        }
      }
    });
  }

  // ---------- Scroll trigger (rideshare page opt-in) ----------
  function onRidesharePage() {
    if (state.scrollWired) return;
    state.scrollWired = true;
    var threshold = 0.6;
    function onScroll() {
      if (state.scrollFired) return;
      if (!readStore().autoScroll) return;
      var scrollY = window.scrollY || window.pageYOffset;
      var docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight <= 0) return;
      if (scrollY / docHeight >= threshold) {
        state.scrollFired = true;
        var code = readStore().code;
        console.log('[PCP] scroll threshold (60%) reached — firing "' + code + '"');
        fireProactive(code);
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  // ---------- Init ----------
  function init() {
    if (!document.body) {
      document.addEventListener('DOMContentLoaded', init);
      return;
    }
    injectCSS();
    wireKeyboard();
  }

  window.PCPPanel = {
    __initialized: true,
    init: init,
    fireProactive: fireProactive,
    onRidesharePage: onRidesharePage,
  };

  init();
})();
