# Paylance Frontend

Paylance is a cross-border freelance invoice escrow built on Stellar. This repository contains the public Next.js frontend for creating invoices, funding escrow, submitting delivery proof, releasing payments, viewing reputation, and demonstrating APAC fiat cashout balances.

Built for the **APAC Stellar Hackathon 2026** Payment & Consumer Applications track.

## Submission Links

| Resource | Link |
| --- | --- |
| Live website | https://paylance-stellar.vercel.app |
| Live backend API | https://paylance.fabian.web.id |
| Product docs | https://paylance-1.gitbook.io/paylance-docs |
| Frontend repository | https://github.com/grandiv/paylance-fe |
| Backend / contract repository | https://github.com/fabian4819/paylance |

Both GitHub repositories are public.

## Stellar Testnet Deployment

| Item | Value |
| --- | --- |
| Network | Stellar Testnet |
| Escrow contract address | `CAUV2EQGYBVOWWIAKBPEHWB2RKSPOL2Q6PZZVREQ6DB4NXNDDABIXB4J` |
| Demo PUSDC SAC address | `CAZ4QR7HTWIWYNFCDM2KYIC56HOFWJPKCUUU6AMNHA4TVRG24YZJSVF6` |
| Demo classic asset | `PUSDC:GA3TMBYQQIVD5OWZQPA7AK3VRAXUNYRPF34UHC4MLAO722S3ZMYR3JC6` |
| Treasury account | `GBRLUGSOOSTJ3EU7DF37LTMUDKQ324Z4FXLORAZAHS6OR4UNNZ7CCA6Q` |
| Keeper account | `GBV4ZKNCPHEQDN3AVBN7LUGTMVLTFCY2R2A5MP4B2RGT5IXAA322AOQH` |

The required contract address for judging is:

```text
CAUV2EQGYBVOWWIAKBPEHWB2RKSPOL2Q6PZZVREQ6DB4NXNDDABIXB4J
```

## Key Features

- Landing page explaining the escrow and auto-release flow.
- Wallet connection through Stellar Wallets Kit.
- Freelancer dashboard with invoice overview and demo faucet access.
- Invoice creation with off-chain metadata and on-chain hash anchoring.
- Client payment link for funding escrow in demo PUSDC.
- Delivery submission and role-aware approve/hold/release states.
- Live invoice updates through backend SSE.
- Public reputation page for freelancer payment history.
- Cashout demo with APAC fiat choices including IDR, PHP, SGD, MYR, THB, VND, and USD.
- Wallet balance popover showing token balance plus the latest completed cashout fiat balance.
- Header Docs link to the GitBook documentation.

## How It Works

1. Freelancer connects a Stellar testnet wallet.
2. Freelancer creates an invoice and signs the Soroban `create_invoice` transaction.
3. Client opens the generated pay link and funds escrow with demo PUSDC.
4. Freelancer submits a delivery proof hash.
5. Client can approve release or place the invoice on hold during the review window.
6. If the client does nothing, the backend keeper triggers automatic release after the deadline.
7. Freelancer runs the cashout demo and sees the latest selected fiat balance in the wallet popover.

## Tech Stack

- **Framework**: Next.js 15 App Router.
- **UI**: React 19, TypeScript, Tailwind CSS v4 tokens in `app/globals.css`.
- **Wallets**: `@creit.tech/stellar-wallets-kit` for Freighter-compatible wallet connection and signing.
- **Stellar**: `@stellar/stellar-sdk` for trustline and Soroban transaction helpers.
- **Motion**: `motion` and `lucide-react` for UI animation and icons.
- **Deployment**: Vercel.

## Repository Structure

```text
app/
  page.tsx                  Landing page
  dashboard/page.tsx        Freelancer dashboard and faucet card
  invoices/new/page.tsx     Create invoice form
  invoices/[id]/page.tsx    Invoice detail, delivery, release actions
  pay/[id]/page.tsx         Client payment link
  reputation/[seller]/      Public freelancer reputation
  cashout/[invoiceId]/      APAC fiat cashout demo
components/
  AppNav.tsx                App header, wallet chip, balance popover
  Nav.tsx                   Landing header and footer
  ReleaseRing.tsx           Countdown / auto-release visual
  Toast.tsx                 Toast notifications
lib/
  api.ts                    Backend API client
  config.ts                 Contract addresses and explorer links
  contract.ts               Soroban write helpers and PUSDC balance reads
  fiat.ts                   APAC fiat options and latest cashout balance storage
  format.ts                 Amount, address, and time formatting
  hooks.ts                  Invoice and SSE hooks
  wallet.ts                 Wallet connection and signing
```

## Local Development

### Prerequisites

- Node.js 22 or newer.
- pnpm.
- A Stellar testnet wallet such as Freighter.

### Install Dependencies

```bash
pnpm install
```

### Environment Setup

Create `.env.local`:

```bash
BACKEND_URL=https://paylance.fabian.web.id
NEXT_PUBLIC_READ_SOURCE=api
NEXT_PUBLIC_CONTRACT_ID=CAUV2EQGYBVOWWIAKBPEHWB2RKSPOL2Q6PZZVREQ6DB4NXNDDABIXB4J
NEXT_PUBLIC_USDC_SAC=CAZ4QR7HTWIWYNFCDM2KYIC56HOFWJPKCUUU6AMNHA4TVRG24YZJSVF6
NEXT_PUBLIC_RPC_URL=https://soroban-testnet.stellar.org
NEXT_PUBLIC_NETWORK_PASSPHRASE="Test SDF Network ; September 2015"
```

`next.config.mjs` rewrites `/api/*` requests to `BACKEND_URL`, so frontend code can call same-origin API paths.

### Run Development Server

```bash
pnpm dev
```

Open `http://localhost:3000`.

### Build Production Bundle

```bash
pnpm build
```

### Start Production Server Locally

```bash
pnpm start
```

## Demo Flow

1. Open https://paylance-stellar.vercel.app.
2. Connect a Stellar testnet wallet.
3. Use the dashboard faucet card to add the PUSDC trustline and request demo PUSDC.
4. Create an invoice from `New invoice`.
5. Open the invoice pay link as the client and fund escrow.
6. Submit delivery as the freelancer.
7. Approve as the client or wait for the auto-release keeper.
8. Cash out from the released invoice and choose an APAC fiat destination.
9. Hover or click the wallet chip to view token balance and latest cashout fiat balance.

## Environment Variables

| Variable | Description |
| --- | --- |
| `BACKEND_URL` | Backend API origin used by Next.js rewrites. |
| `NEXT_PUBLIC_READ_SOURCE` | Use `api` for live backend or `mock` for offline demo mode. |
| `NEXT_PUBLIC_CONTRACT_ID` | Paylance escrow contract address. |
| `NEXT_PUBLIC_USDC_SAC` | Demo PUSDC SAC address. |
| `NEXT_PUBLIC_RPC_URL` | Stellar RPC endpoint. |
| `NEXT_PUBLIC_NETWORK_PASSPHRASE` | Stellar network passphrase. |

Do not put issuer, admin, keeper, or faucet secrets in this frontend repository.

## Related Backend API

The frontend depends on the public backend at https://paylance.fabian.web.id.

| Endpoint | Purpose |
| --- | --- |
| `GET /api/config` | Public testnet config. |
| `POST /api/invoices/meta` | Store invoice metadata and return metadata hash. |
| `GET /api/invoices/:id` | Read invoice details. |
| `GET /api/events/stream` | Live SSE updates. |
| `POST /api/faucet/pusdc` | Request capped demo PUSDC. |
| `POST /api/cashout` | Start cashout demo. |
| `GET /api/cashout/:id` | Poll cashout status. |

Full API docs: https://paylance-1.gitbook.io/paylance-docs

## Verification

```bash
pnpm build
```

The backend / contract repository is verified separately with:

```bash
cargo test
pnpm --dir backend test
pnpm backend:build
```

## Design Notes

Paylance uses a light APAC fintech visual language: cream base, terracotta release accent, coral secondary, wide-tracked display labels, and mono numeric balances. The signature interaction is the Release Ring, a countdown visualization that makes the freelancer protection mechanism visible.

## Demo Notes

- The app runs on Stellar testnet.
- PUSDC is a demo testnet asset for hackathon use.
- The cashout flow is a mock/sandbox APAC fiat settlement demo, not a live regulated payout.
- The wallet popover shows the latest completed cashout fiat currency selected by the freelancer.

## License

Hackathon prototype. All code is provided for review and demonstration.
