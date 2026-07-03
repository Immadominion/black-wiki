# Design System — Black Bull Ledger ("Night Bull" theme)

Source of truth for all visual decisions. Structural DNA adapted from the
Touchline direction (dense dashboard, floating shell, mono numbers, proof
marks) — deliberately re-skinned so the lineage isn't obvious. Do not deviate
without explicit approval.

## Product Context
- **What this is:** public ledger of Ansem's $ANSEM airdrop campaign — every
  recipient, every transfer, the full story, receipts onchain.
- **Who it's for:** CT onlookers (5-second "how big is this"), recipients
  ("did I get one / who got more"), skeptics (line-by-line verification).
- **Project type:** data-dense dashboard. Density is information; scroll is friction.
- **Memorable thing:** "every drop is onchain" — 979 transfers, receipts attached.

## Aesthetic Direction
- **Direction:** trading-floor nocturne — warm charcoal, bull-gold accent,
  blood-red only for exits. A late-night terminal that smells of leather.
- **Decoration:** intentional only (gold radial glow on the hero, pill chips);
  no gradients-as-decoration on cards.

## Typography
- **Display / big numbers:** Cabinet Grotesk 700/800 (Fontshare).
- **Body / UI:** General Sans 400/500/600 (Fontshare).
- **Data / every figure:** JetBrains Mono 500-700, `tabular-nums`. No exceptions.
- **Scale:** 11 chips · 12.5 meta · 13.5 body · 15 row title · 20 section · 28-44 display.

## Color
- **Page:** `#050505` true black, full-bleed — NO floating shell/frame (rejected 2026-07-03: "that's just the design file's frame").
- **Surfaces:** `#0D0D0C` / `#121210`, separated by hairlines `#1E1D1A` / `#171613` — sections divide by line, not by card.
- **Ink:** `#F2EFE8` · secondary `#B8B2A4` · muted `#9A9484` · faint `#87816F` (AA-checked on black).
- **Hero:** radial gold glow `rgba(232,163,61,.10)` behind the bull mascot (public/bull-hero.png) — the artwork IS the hero decoration.
- **Accent (bull gold):** `#E8A33D`; bright `#F0B04A`; CTA `linear-gradient(135deg,#F0B04A,#B87A1C)`; glow `rgba(232,163,61,.28)`.
- **Semantic:** holding/verified `#4CAF6E` · partial `#E8A33D` · sold/exit `#E05252` (chip on `rgba(224,82,82,.12)`) · info `#6B96EF` (chip on `rgba(107,150,239,.13)`).
- **Rule:** green = still holding / onchain-verified ONLY. Red = exits only. Gold is the brand.

## Iconography
Inline SVG marks (no icon font): arrow-out = transfer, seal = onchain-verified,
bird = tweet, bull glyph in the wordmark. Meaning without words.

## Spacing & Layout
- **Base unit:** 4px. Density compact: rows 44-47px, cards 16-18px padding.
- **Structure (2026-07-03):** MULTI-PAGE — `/` story overview · `/ledger/` table +
  analysis strip · `/receipts/` key tweets + day-grouped feed. Sticky top nav with
  active state; mobile gets a fixed bottom tab bar (sibling of the header — never
  nest position:fixed inside the backdrop-filtered header).
- **Stats:** editorial stat band — hairline-separated columns, NEVER capsule/tile
  KPIs (rejected as AI-design tell).
- **Content width:** 1320px wrap, 28px gutters. Mobile <900px: single column.
- **Radius:** pills 999 · buttons 10-12 · tweet cards 16 · everything else square-ish.

## Motion
- Ease `cubic-bezier(0.32,0.72,0,1)`; entrances 500-700ms rise, staggered by
  section; hovers 150ms; `prefers-reduced-motion` respected. Transform/opacity only.

## Anti-patterns (never)
Purple gradients · icon-in-circle 3-col grids · centered-everything · uniform
bubble radius · pure #000 text-on-white inversions · `transition: all` ·
green/sage tints (that's the treasury's palette).
