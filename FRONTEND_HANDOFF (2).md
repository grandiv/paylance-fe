# Paylance — Frontend Handoff

Everything the frontend team needs to build the UI. Backend is live on testnet. This document is the contract between FE and BE — if something here is wrong or missing, raise it before building against it.

---

## 1. Quick Orientation

**Stack recommendation:** Next 15 (App Router), TypeScript, `@stellar/stellar-sdk`, `@creit-tech/stellar-wallets-kit`.

**Core UX loop:**
1. Freelancer creates an invoice → gets a shareable pay link.
2. Client opens the link, connects wallet, funds escrow.
3. Freelancer submits a delivery proof hash.
4. Review countdown runs. Client approves, **or the contract auto-releases after deadline** (the hero).
5. Freelancer cashes out to local currency via anchor.

**Demo scenario (build around this):** Ayu (seller, Indonesia) ↔ Daniel (client, Singapore). 300 PUSDC, 120-second review window for demo.

---

## 2. Live Testnet Deployment

**Backend (live):** `https://paylance.fabian.web.id`

```json
{
  "contractId": "CAUV2EQGYBVOWWIAKBPEHWB2RKSPOL2Q6PZZVREQ6DB4NXNDDABIXB4J",
  "usdcSac":    "CAZ4QR7HTWIWYNFCDM2KYIC56HOFWJPKCUUU6AMNHA4TVRG24YZJSVF6",
  "network":    "testnet",
  "rpcUrl":     "https://soroban-testnet.stellar.org",
  "networkPassphrase": "Test SDF Network ; September 2015",
  "feeBps":     100
}
```

Also available at runtime from `GET https://paylance.fabian.web.id/api/config`.

**Explorer:** `https://stellar.expert/explorer/testnet/contract/CAUV2EQGYBVOWWIAKBPEHWB2RKSPOL2Q6PZZVREQ6DB4NXNDDABIXB4J`

**Invoice 1** (demo, auto-released): `https://stellar.expert/explorer/testnet/contract/CAUV2EQGYBVOWWIAKBPEHWB2RKSPOL2Q6PZZVREQ6DB4NXNDDABIXB4J` — verify live at `GET /api/invoices/1`.

---

## 3. Backend API

| Environment | Base URL |
|---|---|
| **Production (live)** | `https://paylance.fabian.web.id` |
| Local dev | `http://localhost:8787` |

In Next.js, proxy via `rewrites` in `next.config` so components always call `/api/...` and you only change one env var between environments:

```js
// next.config.mjs
async rewrites() {
  return [{ source: "/api/:path*", destination: `${process.env.BACKEND_URL}/api/:path*` }];
}
// .env.local  →  BACKEND_URL=http://localhost:8787
// .env.production → BACKEND_URL=https://paylance.fabian.web.id
```

All amounts are **strings** (i128-safe). All timestamps are **Unix seconds** (number).

All amounts are **strings** (i128-safe). All timestamps are **Unix seconds** (number).

### 3.1 Endpoints

#### `GET /api/config`
Returns public deployment config. Fetch once on app load and cache.

```ts
interface PublicConfig {
  contractId: string;
  usdcSac:    string;
  network:    string;
  feeBps:     number;  // 100 = 1%
}
```

---

#### `GET /api/invoices?seller=G...` or `?payer=G...`
Returns `InvoiceSummary[]` for a wallet address. No auth — public read.

```ts
type InvoiceStatus = "Unfunded" | "Funded" | "Delivered" | "Released" | "Refunded" | "Expired";
type ReleasedVia   = "approve" | "auto" | null;

interface InvoiceSummary {
  id:             number;
  seller:         string;        // G... Stellar address
  payer:          string | null; // null until funded (open-link invoices)
  asset:          string;        // SAC contract address (usdcSac)
  amount:         string;        // raw 7-decimal units; 3000000000 = 300 PUSDC
  feeBps:         number;
  reviewSecs:     number;        // 120 for demo; 259200 (72h) for real
  status:         InvoiceStatus;
  hold:           boolean;
  createdAt:      number;
  fundedAt:       number | null;
  deliveredAt:    number | null;
  reviewDeadline: number | null; // Unix seconds; countdown target
  releasedAt:     number | null;
  deliveryHash:   string | null; // hex SHA-256 of delivered file
  metadataHash:   string;        // hex SHA-256 of invoice meta JSON
  releasedVia:    ReleasedVia;
}
```

---

#### `GET /api/invoices/:id`
Returns `InvoiceDetail` (summary + off-chain meta + event log).

```ts
interface InvoiceMeta {
  metadataHash:    string;
  title:           string;
  description:     string;
  clientEmail:     string | null;
  currencyDisplay: string;   // "PUSDC", "IDR", etc. — display only
  lineItems:       unknown[];
}

interface InvoiceEvent {
  id:        number;
  invoiceId: number | null;
  type:      string;        // e.g. "invoice_funded", "delivery_submitted"
  ledger:    number;
  txHash:    string;        // use for explorer link
  payload:   Record<string, unknown>;
  ts:        number;
}

interface DeliveryMetadata {
  deliveryHash: string;
  deliveryUrl:  string | null;
  deliveryNote: string | null;
  fileName:     string | null;
  submittedAt:  number | null;
}

interface InvoiceDetail extends InvoiceSummary {
  meta:     InvoiceMeta | null;
  delivery: DeliveryMetadata | null;  // off-chain delivery metadata
  events:   InvoiceEvent[];           // ordered by ledger asc
}
```

---

#### `POST /api/invoices/meta`
**Call this before `create_invoice`** — stores off-chain details, returns the hash to pass to the contract.

Request:
```ts
{
  title:           string;        // required
  description?:    string;
  clientEmail?:    string | null; // valid email or null
  currencyDisplay?: string;       // default "USDC"
  lineItems?:      unknown[];
}
```

Response: `{ metadataHash: string }` — pass this as `metadata_hash` to `create_invoice`.

---

#### `GET /api/reputation/:seller`
```ts
interface ReputationProfile {
  seller:         string;
  completed:      number;
  paidVolume:     string;    // raw units
  onTime:         number;
  disputes:       number;
  refunds:        number;
  tier:           "New" | "Reliable" | "Elite";
  feeDiscountBps: number;    // 0 | 10 | 25
}
```

Tier rules (for display):
- **Elite**: completed ≥ 10, disputes = 0 → fee discount 25 bps, faster release badge.
- **Reliable**: completed ≥ 3 → discount 10 bps.
- **New**: everything else.

---

#### `GET /api/events/stream?invoice=:id`
SSE stream. Subscribe per invoice page for live state updates. Also supports no `invoice` param (firehose — use for dashboards).

Event format:
```ts
interface SseEnvelope {
  type:      string;           // mirrors contract event name
  invoiceId: number | null;
  invoice:   InvoiceSummary | null;  // full updated invoice, ready to render
  event:     InvoiceEvent | null;
}
```

Each SSE message is:
```
event: <type>
data: <JSON SseEnvelope>
```

The stream sends `event: ready\ndata: {}` on connect. On `invoice_auto_released`, update the UI to "Released (auto)" — this is the ghost demo moment.

---

#### `POST /api/invoices/:id/delivery-metadata`
Store off-chain delivery metadata after `submit_delivery` on-chain succeeds.

Request:
```ts
{
  deliveryHash: string;          // 64-char hex SHA-256, must match on-chain hash
  deliveryUrl?:  string | null;  // link to hosted deliverable
  deliveryNote?: string | null;  // text note for client
  fileName?:     string | null;
}
```

Returns `409 delivery_hash_mismatch` if hash disagrees with on-chain delivery hash.

Response:
```ts
{ delivery: DeliveryMetadata }
```

---

#### `POST /api/sep10/challenge`
Request a SEP-10 challenge transaction for the seller wallet.

```ts
// Request
{ account: "G..." }

// Response
{
  transaction:        string;  // unsigned XDR challenge
  networkPassphrase:  string;
  webAuthEndpoint:    string;
  homeDomain:         string;
}
```

The wallet must sign `transaction` and return the signed XDR.

---

#### `POST /api/sep10/token`
Exchange a signed SEP-10 challenge for a JWT auth token.

```ts
// Request
{ transaction: "<signed-xdr>" }

// Response
{ token: "eyJ..." }
```

---

#### `POST /api/cashout`
Initiates SEP-24 withdrawal. **Requires SEP-10 token** when real anchor is configured.

```ts
// Request
{
  invoiceId:      number;
  seller:         string;    // G... address
  amount:         string;    // raw units to cash out
  targetCurrency: string;    // "IDR" | "PHP" | "USD"
  sep10Token?:    string;    // JWT from SEP-10 flow (required for real anchor)
}
```

Response: `{ interactiveUrl: string; cashoutId: string }`

If `sep10Token` is missing and real anchor is configured, returns `400 sep10_token_required`.

---

#### `GET /api/cashout/:cashoutId`
Poll for cashout status. Returns a cashout row with `status` field mirroring SEP-24 statuses (`pending_user_transfer_start`, `pending_external`, `completed`, etc.).

---

#### `POST /api/dev/fast-forward/:id` *(dev only)*
Triggers immediate keeper check on an invoice. Only works when backend runs with `ENABLE_DEV_ROUTES=true`.

---

#### `POST /api/dev/fast-forward/:id` *(dev only)*
Triggers immediate keeper check on an invoice. Only works when backend runs with `ENABLE_DEV_ROUTES=true`. Use this during demo to manually trigger the keeper check after the 120s window (though the keeper already polls every 15s, this gives instant feedback).

---

### 3.2 Amount Formatting

```ts
const DECIMALS = 7;

function formatAmount(raw: string, symbol = "PUSDC"): string {
  const n = Number(BigInt(raw)) / 10 ** DECIMALS;
  return `${n.toLocaleString()} ${symbol}`;
}

// 3000000000 → "300 PUSDC"
// 2970000000 → "297 PUSDC"
// 30000000   → "3 PUSDC"
```

---

## 4. Wallet Integration

Use **`@creit-tech/stellar-wallets-kit`** — supports Freighter, Lobstr, xBull, Hana in one API.

```ts
import { StellarWalletsKit, WalletNetwork, FREIGHTER_ID } from "@creit-tech/stellar-wallets-kit";

const kit = new StellarWalletsKit({
  network: WalletNetwork.TESTNET,
  selectedWalletId: FREIGHTER_ID,
});

// Open wallet picker modal
await kit.openModal({ onWalletSelected: (option) => kit.setWallet(option.id) });

// Get connected address
const { address } = await kit.getAddress();

// Sign a transaction (XDR) built by the FE or returned by backend
const { signedTxXdr } = await kit.signTransaction(unsignedXdr, {
  address,
  networkPassphrase: "Test SDF Network ; September 2015",
});
```

Freighter extension is the most reliable for testnet demos. Make sure demo machines have it installed.

---

## 5. Contract Interactions (Writes)

All writes go through the user's wallet. The FE builds the transaction, the wallet signs it, the FE submits it to the RPC. The backend never touches user keys.

Use `@stellar/stellar-sdk` to build ops:

```ts
import { Contract, TransactionBuilder, BASE_FEE, Networks, rpc, nativeToScVal, xdr } from "@stellar/stellar-sdk";

const server = new rpc.Server("https://soroban-testnet.stellar.org");
const contract = new Contract("CAUV2EQGYBVOWWIAKBPEHWB2RKSPOL2Q6PZZVREQ6DB4NXNDDABIXB4J");
```

### 5.1 Flow: Create Invoice

**Step 1** — store meta, get hash:
```ts
const { metadataHash } = await fetch("/api/invoices/meta", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ title, description, clientEmail, currencyDisplay, lineItems }),
}).then(r => r.json());
```

**Step 2** — build + sign + submit `create_invoice`:
```ts
const account = await server.getAccount(sellerAddress);
const tx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: Networks.TESTNET })
  .addOperation(contract.call(
    "create_invoice",
    nativeToScVal(sellerAddress, { type: "address" }),
    nativeToScVal(null),                                      // open link (no fixed payer)
    nativeToScVal(usdcSacAddress, { type: "address" }),
    nativeToScVal(BigInt(amountRaw), { type: "i128" }),
    nativeToScVal(BigInt(reviewSecs), { type: "u64" }),
    xdr.ScVal.scvBytes(Buffer.from(metadataHash, "hex")),
  ))
  .setTimeout(30)
  .build();

const prepared = await server.prepareTransaction(tx);
const { signedTxXdr } = await kit.signTransaction(prepared.toXDR(), { address: sellerAddress, networkPassphrase: Networks.TESTNET });
const result = await server.sendTransaction(TransactionBuilder.fromXDR(signedTxXdr, Networks.TESTNET));
```

After submission, subscribe to SSE `invoice_created` to get the invoice ID and navigate to the invoice page.

---

### 5.2 Flow: Fund Invoice (Client)

The client opens `/pay/:invoiceId`. They see the invoice title, amount, seller, and deadline. They click "Fund Escrow".

The client needs a trustline to the PUSDC SAC before they can transfer. Check balance first; if zero trustline, prompt them to add one (or handle in the tx).

```ts
contract.call(
  "fund_invoice",
  nativeToScVal(BigInt(invoiceId), { type: "u64" }),
  nativeToScVal(payerAddress, { type: "address" }),
)
```

---

### 5.3 Flow: Submit Delivery (Freelancer)

The freelancer uploads a file or pastes a URL. The FE hashes it client-side:

```ts
// Hash a file
const buffer = await file.arrayBuffer();
const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
const deliveryHash = Array.from(new Uint8Array(hashBuffer))
  .map(b => b.toString(16).padStart(2, "0")).join("");
```

Then calls `submit_delivery`:
```ts
contract.call(
  "submit_delivery",
  nativeToScVal(BigInt(invoiceId), { type: "u64" }),
  xdr.ScVal.scvBytes(Buffer.from(deliveryHash, "hex")),
  xdr.ScVal.scvBytes(Buffer.from(metadataHash, "hex")),  // same hash as invoice meta
)
```

After this, the invoice moves to `Delivered` and `reviewDeadline` is set.

**Then post delivery metadata off-chain** (required for client to see the delivery content):

```ts
await fetch(`/api/invoices/${invoiceId}/delivery-metadata`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    deliveryHash,
    deliveryUrl: "https://example.com/final-delivery.zip",  // optional
    deliveryNote: "Final website build.",                     // optional
    fileName: "final-delivery.zip"                            // optional
  })
});
```

The `delivery` object is then available in `GET /api/invoices/:id` response for the client to view.

---

### 5.4 Flow: Approve Release (Client)

Client sees the delivery (from `invoice.delivery`), clicks "Approve & Release". Simple call:
```ts
contract.call(
  "approve_release",
  nativeToScVal(BigInt(invoiceId), { type: "u64" }),
)
```

---

### 5.5 Flow: Client Hold

Client can freeze auto-release during the review window:
```ts
contract.call(
  "client_hold",
  nativeToScVal(BigInt(invoiceId), { type: "u64" }),
)
```

UI should show a "Hold" button during the `Delivered` state, before `reviewDeadline`. Only show to the payer address.

---

### 5.6 Auto-Release (no FE action needed)

The backend keeper fires `auto_release` automatically every 15 seconds when `reviewDeadline` has passed and `hold === false`. The FE just listens on SSE for `invoice_auto_released` and updates the UI. No wallet interaction required.

This is the **hero moment**: show "Auto-released" badge, confirm the seller got paid.

---

## 6. Page Map

```
/                        Landing page
/dashboard               Freelancer dashboard (connected wallet → seller invoices)
/invoices/new            Create invoice form
/invoices/:id            Invoice detail (works for both seller and client views)
/pay/:id                 Client pay page (shareable link — no login required)
/reputation/:seller      Public reputation profile
/cashout/:invoiceId      Cash-out flow (SEP-24)
```

### Routing logic on `/invoices/:id`
- If `walletAddress === invoice.seller` → show seller view (submit delivery, cash-out button).
- If `walletAddress === invoice.payer` → show client view (approve, hold).
- If no wallet connected or third party → read-only view (useful for sharing progress).

---

## 7. State Machine → UI States

| Status | hold | What to show |
|---|---|---|
| `Unfunded` | — | "Awaiting payment" + copy pay link |
| `Funded` | — | "Funded — deliver your work" (seller); "Funded — awaiting delivery" (client) |
| `Delivered` | false | Countdown to auto-release. Client: Approve or Hold buttons. Seller: "Delivered, waiting" |
| `Delivered` | true | "On hold — funds frozen". Client: Release Hold. Seller: "Under review" |
| `Released` | — | "Paid" badge. Show `releasedVia`: "Approved" or "Auto-released (client didn't respond)" |
| `Refunded` | — | "Refunded to client" |
| `Expired` | — | "Expired" (reserved; not emitted in Core) |

---

## 8. Countdown Timer

`reviewDeadline` is a Unix timestamp (seconds). Count down to it client-side.

```ts
const secondsLeft = Math.max(0, invoice.reviewDeadline - Math.floor(Date.now() / 1000));
```

When it hits zero and the invoice is still `Delivered`:
- Show "Auto-release pending..." (keeper fires within 15s).
- On SSE `invoice_auto_released`, flip to "Paid — auto-released".

The 120s demo window means this happens live during the pitch.

---

## 9. SSE Integration Pattern

```ts
useEffect(() => {
  const es = new EventSource(`/api/events/stream?invoice=${invoiceId}`);
  es.addEventListener("invoice_auto_released", (e) => {
    const envelope = JSON.parse(e.data);
    setInvoice(envelope.invoice); // pre-fetched, ready to render
  });
  es.addEventListener("invoice_released", (e) => { /* same */ });
  es.addEventListener("delivery_submitted", (e) => { /* update countdown */ });
  return () => es.close();
}, [invoiceId]);
```

All envelope payloads include a full `InvoiceSummary` — no need to re-fetch on each event.

Tracked event types: `invoice_created`, `invoice_funded`, `delivery_submitted`, `invoice_released`, `invoice_auto_released`, `release_approved`, `invoice_held`, `hold_released`, `invoice_refunded`, `reputation_updated`.

---

## 10. Mock Mode (build first, wire later)

Keep a `READ_SOURCE` env flag so the demo can never break on a bad network:

```ts
// lib/api.ts
const MOCK = process.env.NEXT_PUBLIC_READ_SOURCE === "mock";

export async function getInvoice(id: number): Promise<InvoiceDetail> {
  if (MOCK) return MOCK_INVOICES[id] ?? notFound();
  return fetch(`/api/invoices/${id}`).then(r => r.json());
}
```

Seed mock data matching the exact types above. The ghost demo should be triggerable in mock mode (fake countdown + fake SSE event) so the pitch never depends on live network.

---

## 11. Explorer Links

Every `txHash` in an `InvoiceEvent` links to:
```
https://stellar.expert/explorer/testnet/tx/<txHash>
```

Show these on the invoice event timeline — it's the "why blockchain" proof point for judges.

---

## 12. Cash-Out Flow (SEP-10 + SEP-24 Sandbox)

The backend is configured with SDF test anchor (`testanchor.stellar.org`). This is a **real SEP-10 and SEP-24 protocol flow on testnet** — fiat settlement is simulated by the sandbox anchor.

### Flow: Full SEP-10 + SEP-24

```
1. Seller clicks "Cash Out" on Released invoice
2. FE → POST /api/sep10/challenge       → get unsigned XDR challenge
3. Wallet signs the challenge XDR
4. FE → POST /api/sep10/token           → exchange for JWT
5. FE → POST /api/cashout { sep10Token } → get interactiveUrl from anchor
6. Open interactiveUrl in popup
7. Fill sandbox KYC form in popup
8. Anchor marks transaction completed
9. FE polls GET /api/cashout/:id        → status "completed"
10. Show settlement receipt
```

### Implementation: Step 2-3 (SEP-10 Wallet Signing)

```ts
// 1. Get challenge
const { transaction } = await fetch(`${API}/api/sep10/challenge`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ account: sellerAddress })
}).then(r => r.json());

// 2. Sign with wallet kit
const { signedTxXdr } = await kit.signTransaction(transaction, {
  networkPassphrase: "Test SDF Network ; September 2015"
});

// 3. Exchange for JWT
const { token } = await fetch(`${API}/api/sep10/token`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ transaction: signedTxXdr })
}).then(r => r.json());
```

### Implementation: Step 4 (Cashout with Token)

```ts
const { interactiveUrl, cashoutId } = await fetch(`${API}/api/cashout`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    invoiceId,
    seller: sellerAddress,
    amount: releasedAmount,   // raw 7-decimal units
    targetCurrency: "IDR",
    sep10Token: token
  })
}).then(r => r.json());

window.open(interactiveUrl, "paylance-cashout", "popup,width=480,height=720");
```

### Polling

```ts
const poll = setInterval(async () => {
  const cashout = await fetch(`${API}/api/cashout/${cashoutId}`).then(r => r.json());
  if (cashout.status === "completed") {
    clearInterval(poll);
    // show success
  }
}, 3000);
```

### Important Asset Limitation

Paylance escrow uses `PUSDC` (custom issuer). SDF test anchor advertises `USDC` (different issuer). The SEP-10/SEP-24 flow verifies the real auth and interactive withdraw protocol on testnet, but sandbox anchor cannot process the escrowed PUSDC.

UX copy:
```
Cash-out uses the Stellar SEP-24 sandbox anchor. 
This verifies the real auth and interactive withdraw protocol 
on testnet; fiat payout is simulated.
```

### Mock Fallback

If the anchor environment variables are removed from the backend, cashout falls back to a Paylance-hosted mock page at `/api/mock/sep24/withdraw/:cashoutId`. No SEP-10 token is required in mock mode.

---

## 13. Demo Day Checklist

- [ ] Demo wallet (Freighter) pre-loaded with testnet PUSDC on the demo machine.
- [ ] Invoice ID 1 seeded (120s review window, 300 PUSDC) — re-run `seed-demo.sh` the morning of the demo.
- [ ] `READ_SOURCE=mock` build available as hot-swap if RPC is flaky.
- [ ] Backup video recorded of the full ghost flow.
- [ ] Explorer link for invoice 1's `invoice_auto_released` event bookmarked.
- [ ] Fast-forward route available (`ENABLE_DEV_ROUTES=true` on BE) if the 120s wait feels long in the demo.

---

## 14. Running Backend Locally

The live backend at `https://paylance.fabian.web.id` is always available — for most FE work you can point `BACKEND_URL` there and skip running the backend locally. Run locally only if you need to test write flows end-to-end without hitting the shared server.

```bash
# from repo root
cd backend
STELLAR_RPC_URL=https://soroban-testnet.stellar.org \
CONTRACT_ID=CAUV2EQGYBVOWWIAKBPEHWB2RKSPOL2Q6PZZVREQ6DB4NXNDDABIXB4J \
INDEXER_START_LEDGER=3516119 \
KEEPER_SUBMIT=false \
ENABLE_DEV_ROUTES=true \
PORT=8787 \
pnpm dev
```

`INDEXER_START_LEDGER=3516119` is the ledger at which the contract was deployed — the indexer starts replaying from there. `KEEPER_SUBMIT=false` disables real on-chain submission (safe for local dev). Set `true` with a `KEEPER_SECRET` only on the demo/production server.

**Live server details (for DevOps reference):**
- VPS: `ssh fabian-vps`
- App dir: `~/Paylance-Backend`
- Process manager: PM2 (`pm2 status`, `pm2 logs paylance-backend`)
- Port: 8788 (nginx proxies 443 → 8788)
- DB: `~/Paylance-Backend/paylance.sqlite`
- Redeploy: `rsync` code → `./node_modules/.bin/tsc -p tsconfig.json` → `pm2 restart paylance-backend`

---

## 15. Key Constraints

- **Amounts are 7-decimal raw i128 strings** throughout. Never use floats. 300 PUSDC = `"3000000000"`.
- **`payer` is null until funded** on open-link invoices. Don't assume it's set on `Unfunded` invoices.
- **Seller signs `create_invoice` and `submit_delivery`.** Payer signs `fund_invoice`, `approve_release`, `client_hold`.
- **Auto-release requires no wallet action** — it's a backend keeper tx. The FE just reacts to the SSE event.
- **`reviewDeadline` is set at delivery time**, not at funding time. Don't show a countdown before `status === "Delivered"`.
- **`metadataHash` is hex-encoded SHA-256** (64 chars), passed to the contract as a 32-byte array.
