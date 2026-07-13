# Paylance — Design Guideline

> Single source of truth for brand, voice, colour, and type. Same *mindset* as Credora (confident coined brand, dark base, disciplined accent, display+mono, one signature element, hype-free contrast voice) — but its own identity.

## 1. One-liner
**Paylance — Deliver the work. Prove it. Get paid — automatically.**
A neutral escrow for cross-border freelancers where the *timeout*, not a platform, guarantees payment.

## 2. Voice
- Confident, plain, technical. Short sentences. No hype words.
- **Contrast** is the signature move: *escrow protects the client / the clock protects you*; *stop chasing invoices / start shipping*; *the timeout pays you, not the platform.*
- Proof vocabulary: escrow, released, on-chain, auto-release, verifiable, deadline, held.
- Recurring lines: "Deliver the work. Prove it. Get paid — automatically." · "Escrow protects the client. The clock protects you." · "Ghost-proof payments."
- Wordmark: **Pay** (cream) + **lance** (gold). The gold "lance" carries the accent.

## 3. Signature element — the Release Ring
A countdown arc for the review window. It depletes in **iced-blue** while funds are *held in escrow*, then **ignites gold** when payment is *released* (especially on auto-release). It visualises the hero mechanic: timeout → auto-pay. Spend the boldness here; keep everything else quiet. (`components/ReleaseRing.tsx`)

## 4. Colour — "state encodes colour"
Cool ink base. Two accents with a **rule**: cool = money held/waiting; gold = money released + primary CTA. This *is* the state machine, not decoration.

| Role | Name | Hex |
|---|---|---|
| Base background | Ink | `#0A0E17` |
| Deepest | Ink 2 | `#070A11` |
| Panel / card | Panel | `#121826` |
| Hairline | Line | `#263149` |
| Primary text | Text | `#EAEEF7` |
| Secondary text | Dim | `#9AA4BE` |
| Tertiary / mono labels | Mute | `#5E6787` |
| **Held / escrow accent** | **Iced Blue** | **`#5B8CFF`** |
| **Released / paid / CTA** | **Gold** | **`#FFB23E`** |
| Negative | Warm Red | `#F2704E` |
| Text on gold | Near-black | `#12090B` |

Rules: gold appears only for money/CTA/paid moments — never large fills behind text. Cool blue for escrow/held/structure. Keep it dark; no light surfaces.

> To reskin: change the `--color-*` tokens in `app/globals.css` (@theme). Everything derives from there.

## 5. Typography
| Tier | Font | Where |
|---|---|---|
| Display | **Space Grotesk** (600/700) | headlines, wordmark, section titles |
| Body | **Inter** (400/500) | paragraphs, UI copy |
| Data / mono | **JetBrains Mono** (400/500, tabular) | amounts, hashes, addresses, countdown, eyebrows |

- Headlines: tight tracking (`-0.02em`), sentence case, line-height ~1.0.
- Always set amounts, %, tx hashes, addresses, and the countdown in JetBrains Mono with tabular figures (`.tnum`) — it's the "on-chain/verifiable" cue.
- Eyebrows: mono, uppercase, `0.22em` tracking, mute colour.

## 6. Structure
- Numbered markers (01–05) are used **only** on the "How it works" flow — a real sequence — never as decoration elsewhere.
- Panels: `.panel` (subtle top-lit gradient, 1px line, 16px radius).
- Ambient page gradient is fixed, cool, and quiet (a faint blue top-right, faint gold bottom-left) — never competes with content.
