/**
 * Web Messaging widget hotkey toggle
 * ---------------------------------------------------------------
 * Press the backtick (`) key on any U+ Insurance page to toggle the
 * Pega Web Messaging widget open/closed via the official callback:
 *
 *     PegaUnifiedChatWidget.toggleWidget()
 *
 * Ignored when focus is in an input, textarea, select, or contenteditable
 * element so the demo presenter can still type normally.
 *
 * Replaces the older proactive-chat-panel.js (deleted). This module only
 * fires the toggle event; the Web Messaging widget owns its own UI.
 */
(function () {
  'use strict';

  if (window.__widgetToggleHotkey) return;
  window.__widgetToggleHotkey = true;

  var HOTKEY_CODE = 'Backquote'; // KeyboardEvent.code for the backtick key

  function isTypingTarget(el) {
    if (!el) return false;
    var tag = (el.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
    if (el.isContentEditable) return true;
    return false;
  }

  document.addEventListener('keydown', function (e) {
    if (e.code !== HOTKEY_CODE) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return; // bare backtick only
    if (isTypingTarget(e.target)) return;

    e.preventDefault();

    var widget = window.PegaUnifiedChatWidget;
    if (widget && typeof widget.toggleWidget === 'function') {
      try {
        widget.toggleWidget();
      } catch (err) {
        console.error('[widget-toggle] toggleWidget threw:', err);
      }
    } else {
      console.warn('[widget-toggle] PegaUnifiedChatWidget.toggleWidget is not available yet.');
    }
  });
})();
