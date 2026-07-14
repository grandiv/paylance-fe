// Mirrors the Paylance backend contract (FRONTEND_HANDOFF.md §3).
// All amounts are raw 7-decimal i128 strings. All timestamps are Unix seconds.

export type InvoiceStatus =
  | "Unfunded"
  | "Funded"
  | "Delivered"
  | "Released"
  | "Refunded"
  | "Expired";

export type ReleasedVia = "approve" | "auto" | null;

export interface PublicConfig {
  contractId: string;
  usdcSac: string;
  network: string;
  feeBps: number; // 100 = 1%
}

export interface InvoiceSummary {
  id: number;
  seller: string;
  payer: string | null; // null until funded (open-link invoices)
  asset: string;
  amount: string; // raw 7-decimal units; "3000000000" = 300 PUSDC
  feeBps: number;
  reviewSecs: number;
  status: InvoiceStatus;
  hold: boolean;
  createdAt: number;
  fundedAt: number | null;
  deliveredAt: number | null;
  reviewDeadline: number | null; // countdown target
  releasedAt: number | null;
  deliveryHash: string | null;
  metadataHash: string;
  releasedVia: ReleasedVia;
}

export interface InvoiceMeta {
  metadataHash: string;
  title: string;
  description: string;
  clientEmail: string | null;
  currencyDisplay: string; // display only
  lineItems: unknown[];
}

export interface InvoiceEvent {
  id: number;
  invoiceId: number | null;
  type: string; // e.g. "invoice_funded", "delivery_submitted"
  ledger: number;
  txHash: string;
  payload: Record<string, unknown>;
  ts: number;
}

export interface DeliveryMetadata {
  deliveryHash: string;
  deliveryUrl: string | null;
  deliveryNote: string | null;
  fileName: string | null;
  submittedAt: number | null;
}

export interface InvoiceDetail extends InvoiceSummary {
  meta: InvoiceMeta | null;
  delivery: DeliveryMetadata | null; // off-chain delivery info for the client
  events: InvoiceEvent[]; // ordered by ledger asc
}

export type ReputationTier = "New" | "Reliable" | "Elite";

export interface ReputationProfile {
  seller: string;
  completed: number;
  paidVolume: string;
  onTime: number;
  disputes: number;
  refunds: number;
  tier: ReputationTier;
  feeDiscountBps: number; // 0 | 10 | 25
}

export interface SseEnvelope {
  type: string;
  invoiceId: number | null;
  invoice: InvoiceSummary | null;
  event: InvoiceEvent | null;
}

export interface CashoutSession {
  interactiveUrl: string;
  cashoutId: string;
}

export interface FaucetResult {
  account: string;
  amount: string;
  asset: string;
  hash: string;
  status: string;
}
