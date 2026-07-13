# Frontend Delivery Metadata Handoff

This document covers the off-chain delivery metadata flow for showing submitted work to the client before they approve or hold an invoice.

## Why This Exists

The Soroban escrow contract stores the delivery proof hash on-chain. That is enough for escrow state and dispute evidence, but it is not enough for a client-friendly review screen.

The backend now stores optional off-chain delivery metadata keyed by invoice id. The contract remains the source of truth for invoice state and `deliveryHash`; the backend metadata gives the UI a link, note, and file name to render.

## API Shape

`GET /api/invoices/:id` now includes a `delivery` object.

```ts
type DeliveryMetadata = {
  deliveryHash: string;
  deliveryUrl: string | null;
  deliveryNote: string | null;
  fileName: string | null;
  submittedAt: number | null;
};

type InvoiceDetail = {
  id: number;
  status: "Unfunded" | "Funded" | "Delivered" | "Released" | "Refunded" | "Expired";
  deliveryHash: string | null;
  deliveredAt: number | null;
  reviewDeadline: number | null;
  delivery: DeliveryMetadata | null;
  events: Array<{
    type: string;
    txHash: string;
    payload: Record<string, unknown>;
    ts: number;
  }>;
};
```

If off-chain metadata has not been submitted yet, but the indexer has seen the on-chain `delivery_submitted` event, the backend still returns a proof-only object:

```json
{
  "delivery": {
    "deliveryHash": "5a07cc3c09f55d21da9927bd7bc6ccccde127bc257255c8c42587fcc06685fbc",
    "deliveryUrl": null,
    "deliveryNote": null,
    "fileName": null,
    "submittedAt": 1783872615
  }
}
```

## Store Delivery Metadata

After the seller successfully submits `submit_delivery` on-chain, call:

`POST /api/invoices/:id/delivery-metadata`

Request body:

```ts
type SaveDeliveryMetadataRequest = {
  deliveryHash: string;      // required, 64-char hex SHA-256 hash
  deliveryUrl?: string | null;
  deliveryNote?: string | null;
  fileName?: string | null;
};
```

Example:

```ts
await fetch(`${API_BASE}/api/invoices/${invoiceId}/delivery-metadata`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    deliveryHash,
    deliveryUrl: "https://example.com/final-delivery.zip",
    deliveryNote: "Final website build and deployment notes are included.",
    fileName: "final-delivery.zip"
  })
});
```

Response:

```json
{
  "delivery": {
    "deliveryHash": "5a07cc3c09f55d21da9927bd7bc6ccccde127bc257255c8c42587fcc06685fbc",
    "deliveryUrl": "https://example.com/final-delivery.zip",
    "deliveryNote": "Final website build and deployment notes are included.",
    "fileName": "final-delivery.zip",
    "submittedAt": 1783872615
  }
}
```

## Validation Behavior

The backend validates `deliveryHash` as 64 hex characters.

If the indexer already knows the on-chain delivery hash and the request uses a different hash, the backend returns:

```json
{ "error": "delivery_hash_mismatch" }
```

with HTTP `409`.

If the invoice does not exist, the backend returns:

```json
{ "error": "invoice_not_found" }
```

with HTTP `404`.

## Seller Flow

1. Seller uploads a file or pastes a delivery URL/note.
2. Frontend computes `deliveryHash` client-side.
3. Frontend submits `submit_delivery(invoiceId, deliveryHash, metadataHash)` on-chain.
4. After the transaction succeeds, frontend posts delivery metadata to `/api/invoices/:id/delivery-metadata`.
5. Refresh or update invoice detail state from `GET /api/invoices/:id`.

Important: submit the backend metadata only after the on-chain transaction succeeds. Otherwise the UI may show delivery before escrow state has actually moved to `Delivered`.

## Client Flow

On `/invoices/:id` or `/pay/:invoiceId`, when `invoice.status === "Delivered"` or `invoice.delivery !== null`, render a Delivery section before the approve/hold buttons.

Recommended fields:

```tsx
<section>
  <h2>Delivery</h2>
  {invoice.delivery?.fileName && <p>File: {invoice.delivery.fileName}</p>}
  {invoice.delivery?.deliveryUrl && <a href={invoice.delivery.deliveryUrl}>Open delivery</a>}
  {invoice.delivery?.deliveryNote && <p>{invoice.delivery.deliveryNote}</p>}
  <code>{invoice.delivery?.deliveryHash}</code>
</section>
```

Also show the `delivery_submitted` tx link from `invoice.events` when available:

```ts
const deliveryEvent = invoice.events.find(event => event.type === "delivery_submitted");
```

The client should see the delivery information before clicking **Approve & Release** or **Hold**.

## Current Demo Limitation

The backend stores metadata but does not host uploaded files. For now, use `deliveryUrl` for externally hosted deliverables or paste a note-only delivery.

If local file upload is needed later, add storage such as S3/R2 and store the resulting public or signed URL as `deliveryUrl`.
