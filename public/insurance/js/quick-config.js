/**
 * Quick Config menu for the demo presenter
 * ---------------------------------------------------------------
 * Press the "+" key on any page that loads this script to pop up a
 * small panel on the LEFT side. From there the presenter can toggle the
 * demo enhancements we've layered onto the Web Messaging widget:
 *
 *   • Fake GenAI streaming   (window.FakeStreaming)
 *   • Agentic offer experience (window.AgenticOffers)
 *
 * Press "+" again (or Esc, or click the ✕ / backdrop) to close it.
 *
 * Presentation-layer only — it just calls the enable()/disable() methods
 * the feature modules already expose. Ignored while typing in a field.
 */
(function () {
  'use strict';

  if (window.__quickConfig) return;
  window.__quickConfig = true;

  // ── Features it can toggle ───────────────────────────────────
  // Each entry reads/writes one of the global feature modules. `get`
  // returns the current enabled state; `set` applies a new state.
  var FEATURES = [
    {
      id: 'theme',
      label: 'Modern U+ widget theme',
      hint: 'Gradient skin: branded header, frosted bubbles, elevated input.',
      present: function () { return !!window.WidgetTheme; },
      get: function () { return !!(window.WidgetTheme && window.WidgetTheme.config && window.WidgetTheme.config.enabled); },
      set: function (on) {
        if (!window.WidgetTheme) return false;
        on ? window.WidgetTheme.enable() : window.WidgetTheme.disable();
        return true;
      }
    },
    {
      id: 'streaming',
      label: 'Fake GenAI streaming',
      hint: 'Agent replies type out token-by-token.',
      present: function () { return !!window.FakeStreaming; },
      get: function () { return !!(window.FakeStreaming && window.FakeStreaming.config && window.FakeStreaming.config.enabled); },
      set: function (on) {
        if (!window.FakeStreaming) return false;
        on ? window.FakeStreaming.enable() : window.FakeStreaming.disable();
        return true;
      }
    },
    {
      id: 'carousel',
      label: 'Coverage carousel',
      hint: 'Branded carousel visualizing the recommended coverage limits.',
      present: function () { return !!window.CoverageCarousel; },
      get: function () { return !!(window.CoverageCarousel && window.CoverageCarousel.config && window.CoverageCarousel.config.enabled); },
      set: function (on) {
        if (!window.CoverageCarousel) return false;
        on ? window.CoverageCarousel.enable() : window.CoverageCarousel.disable();
        return true;
      }
    },
    {
      id: 'offers',
      label: 'Agentic offer experience',
      hint: 'Clickable discount cards appear after the customer confirms.',
      present: function () { return !!window.AgenticOffers; },
      get: function () { return !!(window.AgenticOffers && window.AgenticOffers.config && window.AgenticOffers.config.enabled); },
      set: function (on) {
        if (!window.AgenticOffers) return false;
        on ? window.AgenticOffers.enable() : window.AgenticOffers.disable();
        return true;
      }
    },
    {
      id: 'bind',
      label: 'Policy bind card',
      hint: 'Policy review card with "Accept & Bind Policy" appears before binding.',
      present: function () { return !!window.PolicyBind; },
      get: function () { return !!(window.PolicyBind && window.PolicyBind.config && window.PolicyBind.config.enabled); },
      set: function (on) {
        if (!window.PolicyBind) return false;
        on ? window.PolicyBind.enable() : window.PolicyBind.disable();
        return true;
      }
    },
    {
      id: 'advisor',
      label: 'Coverage advisor escalation',
      hint: 'Shows online advisors with a "Connect with Care Advisor" button before hand-off.',
      present: function () { return !!window.EscalationAdvisor; },
      get: function () { return !!(window.EscalationAdvisor && window.EscalationAdvisor.config && window.EscalationAdvisor.config.enabled); },
      set: function (on) {
        if (!window.EscalationAdvisor) return false;
        on ? window.EscalationAdvisor.enable() : window.EscalationAdvisor.disable();
        return true;
      }
    }
  ];

  // ── Styles ───────────────────────────────────────────────────
  function injectStyles() {
    if (document.getElementById('qc-styles')) return;
    var brand = getComputedStyle(document.documentElement)
      .getPropertyValue('--brandColor').trim() || '#CA0000';
    var css = [
      '.qc-backdrop{position:fixed;inset:0;z-index:2147483646;background:rgba(5,5,5,.18);',
      'opacity:0;pointer-events:none;transition:opacity .18s ease;}',
      '.qc-backdrop.qc-open{opacity:1;pointer-events:auto;}',

      '.qc-panel{position:fixed;top:50%;left:24px;transform:translateY(-50%) translateX(-120%);',
      'z-index:2147483647;width:300px;max-width:calc(100vw - 48px);background:#fff;border-radius:14px;',
      "font-family:'Inter',sans-serif;color:#050505;box-shadow:0 18px 48px rgba(5,5,5,.28);",
      'opacity:0;transition:transform .22s cubic-bezier(.2,.8,.2,1),opacity .22s ease;overflow:hidden;}',
      '.qc-panel.qc-open{transform:translateY(-50%) translateX(0);opacity:1;}',

      '.qc-head{display:flex;align-items:center;gap:8px;background:' + brand + ';color:#fff;',
      'padding:14px 16px;}',
      '.qc-head h2{font-size:15px;font-weight:700;flex:1;margin:0;letter-spacing:.2px;}',
      '.qc-kbd{font-size:11px;font-weight:600;background:rgba(255,255,255,.22);border-radius:5px;',
      'padding:2px 7px;line-height:1.4;}',
      '.qc-close{background:none;border:none;color:#fff;font-size:18px;line-height:1;cursor:pointer;',
      'padding:2px 4px;border-radius:6px;opacity:.85;}',
      '.qc-close:hover{opacity:1;background:rgba(255,255,255,.15);}',

      '.qc-body{padding:8px 12px 14px;}',
      '.qc-row{display:flex;align-items:flex-start;gap:12px;padding:11px 8px;border-radius:10px;}',
      '.qc-row + .qc-row{border-top:1px solid #eee;}',
      '.qc-row-info{flex:1;min-width:0;}',
      '.qc-row-label{font-size:13.5px;font-weight:600;line-height:1.3;}',
      '.qc-row-hint{font-size:11px;font-weight:500;color:#777;line-height:1.35;margin-top:2px;}',
      '.qc-row.qc-missing{opacity:.45;}',
      '.qc-row.qc-missing .qc-row-hint{color:#b00;}',

      // iOS-style toggle switch
      '.qc-switch{position:relative;flex-shrink:0;width:42px;height:24px;margin-top:2px;cursor:pointer;}',
      '.qc-switch input{position:absolute;opacity:0;width:100%;height:100%;margin:0;cursor:pointer;}',
      '.qc-track{position:absolute;inset:0;background:#cfcfd6;border-radius:999px;transition:background .18s;}',
      '.qc-thumb{position:absolute;top:2px;left:2px;width:20px;height:20px;background:#fff;border-radius:50%;',
      'box-shadow:0 1px 3px rgba(0,0,0,.3);transition:transform .18s;}',
      '.qc-switch input:checked + .qc-track{background:' + brand + ';}',
      '.qc-switch input:checked + .qc-track .qc-thumb{transform:translateX(18px);}',
      '.qc-switch input:disabled{cursor:not-allowed;}',

      // Font picker section
      '.qc-fonts{padding:4px 12px 12px;border-top:1px solid #eee;}',
      '.qc-fonts-label{font-size:13.5px;font-weight:600;line-height:1.3;padding:8px 8px 2px;}',
      '.qc-fonts-hint{font-size:11px;font-weight:500;color:#777;line-height:1.35;padding:0 8px 8px;}',
      '.qc-chips{display:flex;flex-wrap:wrap;gap:6px;padding:0 8px;}',
      '.qc-chip{font-family:\'Inter\',sans-serif;font-size:11.5px;font-weight:600;cursor:pointer;',
      'border:1px solid #d9d9e0;background:#fff;color:#3a3a44;border-radius:999px;padding:6px 12px;',
      'transition:background .15s,color .15s,border-color .15s;}',
      '.qc-chip:hover{border-color:' + brand + ';color:' + brand + ';}',
      '.qc-chip.qc-active{background:' + brand + ';border-color:' + brand + ';color:#fff;}',
      '.qc-fonts.qc-missing{opacity:.45;pointer-events:none;}',

      '.qc-foot{padding:0 16px 14px;font-size:10.5px;color:#999;}'
    ].join('');
    var style = document.createElement('style');
    style.id = 'qc-styles';
    style.textContent = css;
    document.head.appendChild(style);
  }

  // ── Build the panel ──────────────────────────────────────────
  var backdrop, panel, isOpen = false;

  function build() {
    injectStyles();

    backdrop = document.createElement('div');
    backdrop.className = 'qc-backdrop';
    backdrop.addEventListener('click', close);

    panel = document.createElement('aside');
    panel.className = 'qc-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Quick config');
    panel.addEventListener('click', function (e) { e.stopPropagation(); });

    var head = document.createElement('div');
    head.className = 'qc-head';
    var h2 = document.createElement('h2');
    h2.textContent = 'Quick Config';
    var kbd = document.createElement('span');
    kbd.className = 'qc-kbd';
    kbd.textContent = '+';
    var closeBtn = document.createElement('button');
    closeBtn.className = 'qc-close';
    closeBtn.type = 'button';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.innerHTML = '&#10005;';
    closeBtn.addEventListener('click', close);
    head.appendChild(h2);
    head.appendChild(kbd);
    head.appendChild(closeBtn);

    var body = document.createElement('div');
    body.className = 'qc-body';

    FEATURES.forEach(function (feat) {
      var row = document.createElement('label');
      row.className = 'qc-row';
      row.dataset.feat = feat.id;

      var info = document.createElement('div');
      info.className = 'qc-row-info';
      var label = document.createElement('div');
      label.className = 'qc-row-label';
      label.textContent = feat.label;
      var hint = document.createElement('div');
      hint.className = 'qc-row-hint';
      hint.textContent = feat.hint;
      info.appendChild(label);
      info.appendChild(hint);

      var sw = document.createElement('span');
      sw.className = 'qc-switch';
      var input = document.createElement('input');
      input.type = 'checkbox';
      var track = document.createElement('span');
      track.className = 'qc-track';
      var thumb = document.createElement('span');
      thumb.className = 'qc-thumb';
      track.appendChild(thumb);
      sw.appendChild(input);
      sw.appendChild(track);

      input.addEventListener('change', function () {
        var ok = feat.set(input.checked);
        if (!ok) {
          // Module not present — revert and flag it.
          input.checked = false;
          row.classList.add('qc-missing');
          hint.textContent = 'Module not loaded on this page.';
        } else {
          console.log('[QuickConfig] ' + feat.id + ' -> ' + (input.checked ? 'on' : 'off'));
        }
      });

      feat._input = input;
      feat._row = row;
      feat._hint = hint;

      row.appendChild(info);
      row.appendChild(sw);
      body.appendChild(row);
    });

    // ── Font preset picker ──
    buildFontPicker(body);

    var foot = document.createElement('div');
    foot.className = 'qc-foot';
    foot.textContent = 'Press + to toggle this menu • Esc to close';

    panel.appendChild(head);
    panel.appendChild(body);
    panel.appendChild(foot);

    document.body.appendChild(backdrop);
    document.body.appendChild(panel);
  }

  // ── Font preset picker ───────────────────────────────────────
  // Renders a row of chips bound to window.WidgetTheme.setFont().
  var fontSection = null;
  var fontChips = [];

  function buildFontPicker(body) {
    fontSection = document.createElement('div');
    fontSection.className = 'qc-fonts';

    var label = document.createElement('div');
    label.className = 'qc-fonts-label';
    label.textContent = 'Message font';
    var hint = document.createElement('div');
    hint.className = 'qc-fonts-hint';
    hint.textContent = 'Typeface for the conversation bubbles.';
    fontSection.appendChild(label);
    fontSection.appendChild(hint);

    var chips = document.createElement('div');
    chips.className = 'qc-chips';

    // Order + short display labels for the presets defined in WidgetTheme.
    var ORDER = [
      { id: 'modern', label: 'Inter' },
      { id: 'pega', label: 'Open Sans' },
      { id: 'brand', label: 'Lato' },
      { id: 'editorial', label: 'Fraunces' },
      { id: 'classic', label: 'Lora' }
    ];

    fontChips = ORDER.map(function (preset) {
      var chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'qc-chip';
      chip.dataset.font = preset.id;
      chip.textContent = preset.label;
      chip.addEventListener('click', function () {
        if (!window.WidgetTheme || !window.WidgetTheme.setFont) return;
        window.WidgetTheme.setFont(preset.id);
        syncFonts();
        console.log('[QuickConfig] font -> ' + preset.id);
      });
      chips.appendChild(chip);
      return chip;
    });

    fontSection.appendChild(chips);
    body.appendChild(fontSection);
  }

  function syncFonts() {
    if (!fontSection) return;
    var present = !!(window.WidgetTheme && window.WidgetTheme.setFont);
    fontSection.classList.toggle('qc-missing', !present);
    var active = present && window.WidgetTheme.config ? window.WidgetTheme.config.font : null;
    fontChips.forEach(function (chip) {
      chip.classList.toggle('qc-active', chip.dataset.font === active);
    });
  }

  // Refresh switch positions / availability from the live modules.
  function sync() {
    FEATURES.forEach(function (feat) {
      var present = feat.present ? feat.present() : true;
      feat._input.disabled = !present;
      feat._row.classList.toggle('qc-missing', !present);
      if (!present) {
        feat._input.checked = false;
        feat._hint.textContent = 'Module not loaded on this page.';
      } else {
        feat._input.checked = feat.get();
      }
    });
    syncFonts();
  }

  function open() {
    if (!panel) build();
    sync();
    backdrop.classList.add('qc-open');
    panel.classList.add('qc-open');
    isOpen = true;
  }

  function close() {
    if (!panel) return;
    backdrop.classList.remove('qc-open');
    panel.classList.remove('qc-open');
    isOpen = false;
  }

  function toggle() { isOpen ? close() : open(); }

  // ── Hotkey ───────────────────────────────────────────────────
  function isTypingTarget(el) {
    if (!el) return false;
    var tag = (el.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
    return !!el.isContentEditable;
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && isOpen) { e.preventDefault(); close(); return; }
    // "+" — works as Shift+= on most layouts and on the numpad.
    if (e.key !== '+') return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (isTypingTarget(e.target)) return;
    e.preventDefault();
    toggle();
  });

  // ── Public API ───────────────────────────────────────────────
  window.QuickConfig = {
    open: open,
    close: close,
    toggle: toggle
  };

  console.log('[QuickConfig] loaded. Press "+" to open the quick config menu.');
})();
