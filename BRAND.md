# Paylance — Brand & Design Guidelines

The single source of truth for Paylance's visual identity: voice, color, type,
and the signature element. Design tokens live in `app/globals.css` (`@theme`);
this document explains the *why* behind them. To reskin the whole app, change the
`--color-*` variables in one place.

---

## 1. The idea in one line

**Paylance — Deliver the work. Prove it. Get paid — automatically.**

A neutral escrow for cross-border freelancers where the **clock**, not a platform,
guarantees the freelancer gets paid. The brand should feel *calm, warm, and
trustworthy* — a financial tool people rely on, not a loud crypto dashboard.

---

## 2. Voice & tone

- **Confident, plain, human.** Short sentences. No hype words ("revolutionary",
  "next-gen", "🚀"). The product's whole point is removing anxiety, so the copy is
  reassuring, not shouty.
- **Contrast is the signature rhetorical move:**
  - "Escrow protects the client. The clock protects you."
  - "Stop chasing invoices."
  - "If the client ghosts, the contract pays you anyway."
- **Chain-neutral in the UI.** We don't say "Stellar / Soroban / SEP-24 / wallet"
  in user-facing copy — we say "smart contract", "on-chain", "licensed anchor",
  "familiar crypto wallets". Blockchain is the plumbing, not the pitch.
- **Recurring lines** (use verbatim): "Deliver the work. Prove it. Get paid —
  automatically." · "Escrow protects the client. The clock protects you." ·
  "Ghost-proof payments."

### Wordmark
**Pay·lance** — "Pay" in ink (near-black), "lance" in terracotta, no space, one
word. The terracotta "lance" carries the accent. Set in the display face (Jost),
weight 700.

---

## 3. The core principle — "state encodes color"

Color is not decoration; it maps to where the money is in the escrow lifecycle:

| Meaning | Token | Use |
|---|---|---|
| **Money HELD** (in escrow / in review / waiting) | **Stone** `--color-cool` | countdown ring while ticking, "held" badges, in-progress states |
| **Money RELEASED** (paid / approved / auto-released) + all primary actions | **Terracotta** `--color-gold` | the ring's "ignite" moment, CTAs, "Paid" badges, key headline words |

So the visual story of every invoice is **stone → terracotta**: value sitting
safely, then firing to the freelancer. Never use terracotta for large fills behind
text — it's punctuation, reserved for money-moments and calls to action.

---

## 4. Color palette

Light, warm, earthy. Cream base with a terracotta accent. All values meet WCAG AA
for their usage (text tones were tuned to ≥4.5:1 on cream; the accent was deepened
from a brighter coral so it passes as both text and button background).

### Foundation
| Role | Name | Hex | Use |
|---|---|---|---|
| Base background | Cream | `#EAE7DC` | page background (top of gradient) |
| Deep base | Deep Cream | `#E1DDCE` | gradient bottom |
| Panel / card | Bone | `#F4F2EA` | cards, raised surfaces |
| Panel raised | Ivory | `#FBFAF4` | inputs, nested surfaces |
| Hairline / border | Sand | `#D8C3A5` | dividers, card borders, ring track |
| Hairline soft | Soft Sand | `#E3DDCD` | faint dividers, timeline rails |

### Text
| Role | Name | Hex | Contrast on cream |
|---|---|---|---|
| Primary text | Ink | `#33302B` | ~11:1 |
| Secondary text | Warm Grey | `#615E56` | ~5:1 (AA) |
| Caption / label | Stone Grey | `#6A675E` | ~4.6:1 (AA, smallest text) |

### Accents & status
| Role | Name | Hex | Use |
|---|---|---|---|
| **Primary accent** | **Terracotta** | **`#C9402B`** | CTAs, "Paid", wordmark "lance", key words, ring ignite |
| Accent tint | Terracotta Tint | `#EEC2B7` | accent borders/soft backgrounds |
| Secondary accent | Coral | `#E98074` | supporting icons (e.g. "why it's safe"), never a CTA |
| Held state | Stone | `#7C7B77` | in-escrow ring/labels |
| Positive | Sage | `#5B9E6F` | funded confirmations, up values |
| Negative | Brick | `#C0463C` | errors, refunds, down values |
| Text on terracotta | Ivory | `#FDFCF7` | button labels on the accent |

> **Accessibility note.** The original brand coral `#E85A4F` failed WCAG AA (as
> text on cream *and* under white button labels). It was deepened to `#C9402B` —
> same terracotta family, more depth — which passes both. Keep this in mind before
> lightening the accent again.

---

## 5. Typography

Three roles. The pairing is deliberate: a thin geometric display for elegance, a
neutral humanist body for readability, and a mono for anything numeric or on-chain
(reinforces the "verifiable" feel).

| Tier | Typeface | Weights | Where |
|---|---|---|---|
| **Display** | **Jost** | 300–600 | hero, section titles, wordmark, tracked labels |
| **Body** | **Inter** | 400–600 | paragraphs, UI copy, buttons |
| **Data / mono** | **JetBrains Mono** | 400–700 | amounts, tx hashes, addresses, the countdown, eyebrows |

All three are free (Google Fonts), loaded via `next/font`.

### Rules
- **Hero / statement type** uses the EXTETA-inspired treatment: Jost, uppercase,
  light weight, wide tracking (`letter-spacing: ~0.04–0.05em`). Reserved for the
  hero headline and short kickers — never body text or forms (thin uppercase kills
  readability at small sizes).
- **Section & card titles:** Jost, sentence case, weight 500–600.
- **Numbers are always mono, tabular** (`font-variant-numeric: tabular-nums`) —
  amounts, %, the countdown, tx hashes, addresses. This is a core part of the
  "on-chain / precise" identity.
- **Eyebrows / labels:** JetBrains Mono, uppercase, `letter-spacing: 0.22em`,
  Stone Grey.
- Headline tracking is tight for the sentence-case titles (`-0.01em`); wide for the
  uppercase hero.

---

## 6. Signature element — the Release Ring

A **tick-mark dial** (an instrument/gauge, echoing precision timepieces) that
counts down the review window. Ticks deplete in **stone** while funds are held,
then the whole dial **ignites terracotta** on release — the single most
recognizable Paylance visual. Spend the design boldness here; keep everything
around it quiet. (`components/ReleaseRing.tsx`, all colors via CSS vars.)

Supporting motion:
- A **stage tracker** (Funded → In review → Released) that advances with the flow —
  a real sequence, so its dots are meaningful.
- A subtle **"✓ tx confirmed"** proof chip on release.
- The background carries a faint technical **dot-grid** (masked, fades at edges) and
  a slow **warm aurora** drift — depth without distraction. All motion respects
  `prefers-reduced-motion`.

---

## 7. Layout & components

- **Panels:** `.panel` — Bone surface, soft-sand 1px border, 16px radius, a barely
  perceptible shadow. The primary content container.
- **Buttons:** `.btn-gold` (terracotta fill, ivory label — the one primary action
  per view) and `.btn-ghost` (transparent, sand border → terracotta on hover).
- **Chips:** mono, pill, sand border — used for status badges and metadata.
- **Inputs:** `.pl-input` — ivory fill, sand border, terracotta focus ring.
- **Spacing / radius:** generous whitespace, 10–16px radii, hairline dividers. The
  feel is calm and editorial, not dense.
- Numbered markers (01–05) appear **only** on the "How it works" sequence, where the
  order actually carries meaning — never as decoration.

---

## 8. Do & don't

**Do**
- Keep terracotta rare and intentional — one focal action/metric per view.
- Set every number and hash in tabular mono.
- Let the Release Ring be the hero moment; keep the rest quiet.
- Stay chain-neutral in UI copy.

**Don't**
- Use terracotta as a large background behind text.
- Introduce a second bright accent (coral is a *supporting* tint only).
- Put thin uppercase Jost on body text, forms, or tables.
- Lighten the accent past AA contrast (see §4 note).
- Add hype words or emoji to product copy.

---

## 9. Token reference (`app/globals.css`)

```css
--color-ink:       #EAE7DC;  --color-ink-2:     #E1DDCE;
--color-panel:     #F4F2EA;  --color-panel-2:   #FBFAF4;
--color-line:      #D8C3A5;  --color-line-soft: #E3DDCD;
--color-text:      #33302B;  --color-dim:       #615E56;  --color-mute: #6A675E;
--color-cool:      #7C7B77;  /* held / stone */
--color-gold:      #C9402B;  --color-gold-soft: #EEC2B7;  /* terracotta accent */
--color-pos:       #5B9E6F;  --color-neg:       #C0463C;

--font-display: Jost;  --font-body: Inter;  --font-mono: JetBrains Mono;
```

*Live reference: https://paylance-stellar.vercel.app*
