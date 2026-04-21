# PegaWorld 2026 — U+ Insurance Demo Context

## Overview
Reformat of the U+ Insurance portal (uplus-wss/insurance/) for the PegaWorld 2026 demo. Presentation-layer changes only — no Pega platform, backend, or API changes.

Customer persona: **Mary Taylor** (MaryJohnson07@pegatsdemo.com, load_by_default: true)

## Brand
- Brand color: #CA0000 (CSS var --brandColor)
- Interactive color: #CA0000 (CSS var --interactiveColor)
- Deep red for widget/CS Desktop headers: #8B0000
- Font: Inter (woff2 loaded from /fonts/)

---

## Code Changes (Completed)

### Phase 2 — Home page block replacement

| File | Change |
|---|---|
| src/components/accounts/AccountSecondaryArea.vue | Added v-if app.industry === insurance promo section before offer card loop. Car SVG icon, i18n-driven text, links to ./new-quote.html |
| public/insurance/i18n/lang-en.js | Added keys: ai_assistant_title (Need a new vehicle quote?), ai_assistant_msg, ai_assistant_cta (Get my quote) |
| public/insurance/js/config-flow.js | Removed first offer (Safe driver discounts) from app.offers array — 2 offer cards remain |
| public/insurance/css/override.css | Added .ai-assistant-promo card styles: gradient background, centered layout, car SVG, red CTA button |

### Phase 3 — New Vehicle Quote page

File created: public/insurance/new-quote.html

Standalone HTML page (no Vue dependency) with:
- Header/footer matching the SPA (logo, nav, copyright)
- Ribbon1 decorative background
- Breadcrumb: Home > Auto Insurance Quote
- Two-column layout: form (left) + hero image (right)
- Coverage type radio pills: Auto, Auto + Home, Auto + Renters
- Vehicle form: Year, Make, Model, ZIP code, Number of drivers
- Red CTA: Use U+ Agentic Messaging to Start your Quote
- div id=pega-messaging-widget fixed bottom-right for widget injection
- Benefits bar: Trusted by 2M+ / Quote in under 5 minutes / No commitment / Secure and private
- Click handler stubs with TODO comments for Pega widget integration

### Phase 4 — Navigation

- Home page promo CTA links to ./new-quote.html
- Quote page CTA logs form data and has TODO for PegaMessaging.open() integration

---

## Nano Banana Prompts (Completed)

All prompts target Nano Banana Pro (Thinking > Redo with Pro) for text fidelity.

### Slide 02 — New vehicle quote

| Widget | Content | Status |
|---|---|---|
| Beat 1 widget | Vehicle identification — Mary provides VIN, agent retrieves 2025 Toyota RAV4 XLE details, MSRP, safety rating | Generated |
| Beat 2-4 widget | Coverage selection, CDH discounts (3 discounts, 147.50/mo), payment processed, insurance card issued | Prompt created |

### Slide 03 — Governed escalation

| Widget | Content | Status |
|---|---|---|
| Beats 1-2 widget | Mary asks about rideshare/Uber, agent flags E-441 exclusion, explains regulatory boundary | Prompt created |
| Beats 3-4 widget | Licensed agent required, transparent handoff to Sarah Mitchell with full context summary | Prompt created |

### Slide 04 — Agent accepts and reviews

| Asset | Content | Status |
|---|---|---|
| CS Desktop screenshot | Pega CS Desktop modified: Mary Taylor banner, Summary tab with Self-Service Agent Activity, Web Messaging panel with handoff messages, suggested reply | Generated |
| CS Desktop rebranded | Color swap: teal to red (#8B0000 banner, #CA0000 accents), U+ Insurance logo | Prompt created |

---

## Demo Flow Reference

Slide 02: New vehicle quote (~4 min)
  Mary hits Get my quote on portal
  Agentic widget: VIN > vehicle lookup > coverage match > CDH discounts > bind policy
  Full quote-to-bind, no human

Slide 03: Governed escalation (~1 min)
  Same conversation: rideshare question
  Agent flags E-441 exclusion
  Regulatory boundary > transparent handoff to Sarah Mitchell

Slide 04: Agent accepts and reviews (~2 min)
  James McNulty CS Desktop
  Full Self-Service Agent history visible
  Dialog suggested reply + GenAI suggested reply
  Mary doesn't repeat a single thing

---

## Local Development

cd uplus-wss
npm run dev
http://localhost:5174/insurance/           (home — log in as Mary Taylor)
http://localhost:5174/insurance/new-quote.html  (quote page)

## Files NOT to modify
- Anything outside insurance/ directory
- Other vertical sites (commercial_bank, retail_bank, health_care, etc.)
- Pega platform code, backend services, API integrations
- Routing/server config, package.json, build tooling
