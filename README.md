# Paylance — Frontend

Verifiable delivery escrow for cross-border freelancers, on Stellar. Next.js 15 app wired to the live Soroban testnet backend.

Test marker: faucet flow wired and pushed.

**Design mindset:** see `DESIGN_GUIDELINE.md`. **Backend contract:** see `../paylance/FRONTEND_HANDOFF.md`.

## Stack
- Next 15 (App Router) · React 19 · TypeScript
- Tailwind v4 (tokens in `app/globals.css`)
- `@stellar/stellar-sdk` (contract writes) · `@creit.tech/stellar-wallets-kit` (Freighter/Lobstr/xBull/Hana)
- `motion` + `lucide-react`

## Run
```bash
pnpm install
pnpm dev        # http://localhost:3000
```
> pnpm 11 note: this repo sets `verify-deps-before-run=false` (`.npmrc`) so the pre-run check doesn't trip on unbuilt native scripts from transitive deps. If `pnpm dev/build` ever errors with `ERR_PNPM_IGNORED_BUILDS`, run `pnpm exec next dev` / `pnpm exec next build` instead.

## Environments
Components always call `/api/...`; `next.config.mjs` rewrites that to `BACKEND_URL`.
- `.env.local` → `BACKEND_URL=https://paylance.fabian.web.id` (live testnet backend)
- `NEXT_PUBLIC_READ_SOURCE=api` for live; **`mock`** for the offline, demo-proof build (never breaks on a bad network). Keep a mock build ready for demo day.

## Layout
```
app/
  page.tsx            Landing (animated Release Ring hero)
  layout.tsx          Fonts + shell
  globals.css         Design tokens (@theme) — reskin here
  dashboard/          Freelancer dashboard            [next]
  invoices/new/       Create invoice                  [next]
  invoices/[id]/      Invoice detail (ring + SSE)     [next]
  pay/[id]/           Client pay link                 [next]
  reputation/[seller] Public reputation               [next]
  cashout/[id]/       SEP-24 cash-out                 [next]
components/
  ReleaseRing.tsx     Signature countdown → auto-pay ring
  Nav.tsx             Header / footer / wordmark
lib/
  types.ts            Backend contract types (handoff §3)
  config.ts           On-chain config + explorer links
  api.ts              Read client (mock/api switch)
  mock.ts             Offline demo data
  format.ts           Amount/time/address formatting (7-decimal i128-safe)
  wallet.ts           stellar-wallets-kit connect + sign   [next]
  contract.ts         Soroban write helpers                [next]
```

## Status
✅ Landing + full app flow: dashboard, create invoice, invoice detail (live tick-dial + SSE + role-aware actions), client pay page, reputation, SEP-24 cash-out.
✅ Wallet (stellar-wallets-kit/Freighter) + Soroban write layer (`lib/contract.ts`): create / fund / submit-delivery / approve / hold. Reads via live backend proxy; SSE for the auto-release ghost moment.
✅ Demo PUSDC faucet on the pay page: connected wallets can add the trustline, request capped backend-minted test funds, then fund escrow.
✅ Green build; all 6 routes 200.

**Design:** light theme — cream base, terracotta release accent, coral secondary, Jost display (EXTETA-style wide-tracked caps hero), JetBrains Mono numbers. Signature = tick-mark **Release Ring** (`components/ReleaseRing.tsx`), all colours are CSS vars → palette-swap in `app/globals.css` only.

⚠️ Dev note: never run `next build` while `pnpm dev` is live — it corrupts `.next` (500s). Stop dev, `rm -rf .next`, rebuild.
⏳ Next polish: verify write flows end-to-end with a funded Freighter testnet wallet; optional 3D landing upgrade; mock-mode seed for offline demo.
