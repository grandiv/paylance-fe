import { IS_MOCK } from "./config";
import { mockActions, mockRead, mockSaveMeta } from "./mockStore";
import type {
  CashoutSession,
  FaucetResult,
  InvoiceDetail,
  InvoiceSummary,
  ReputationProfile,
} from "./types";

// Read/data client. In mock mode returns local data; otherwise hits the
// same-origin proxy (/api/... → backend, configured in next.config.mjs).

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error(`${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

export async function listInvoices(
  role: "seller" | "payer",
  address: string,
): Promise<InvoiceSummary[]> {
  if (IS_MOCK) return mockRead.list(role, address);
  return getJson(`/api/invoices?${role}=${address}`);
}

export async function getInvoice(id: number): Promise<InvoiceDetail> {
  if (IS_MOCK) return mockRead.get(id);
  return getJson(`/api/invoices/${id}`);
}

export async function getReputation(
  seller: string,
): Promise<ReputationProfile> {
  if (IS_MOCK) return mockRead.reputation(seller);
  return getJson(`/api/reputation/${seller}`);
}

/** Store off-chain delivery details so the client can review the work. */
export async function saveDeliveryMetadata(
  invoiceId: number,
  body: {
    deliveryHash: string;
    deliveryUrl?: string | null;
    deliveryNote?: string | null;
    fileName?: string | null;
  },
): Promise<void> {
  if (IS_MOCK) {
    mockActions.setDelivery(invoiceId, body);
    return;
  }
  const res = await fetch(`/api/invoices/${invoiceId}/delivery-metadata`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`delivery-metadata → ${res.status}`);
}

export async function saveInvoiceMeta(body: {
  title: string;
  description?: string;
  clientEmail?: string | null;
  currencyDisplay?: string;
  lineItems?: unknown[];
}): Promise<{ metadataHash: string }> {
  if (IS_MOCK) return { metadataHash: mockSaveMeta(body) };
  const res = await fetch("/api/invoices/meta", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`meta → ${res.status}`);
  return res.json();
}

export async function requestDemoPusdc(body: {
  account: string;
  amount?: string;
}): Promise<FaucetResult> {
  if (IS_MOCK) {
    return {
      account: body.account,
      amount: body.amount ?? "10000000000",
      asset: "mock-pusdc-sac",
      hash: "mock",
      status: "PENDING",
    };
  }
  const res = await fetch("/api/faucet/pusdc", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = (await res.json().catch(() => null)) as {
      message?: string;
      error?: string;
    } | null;
    throw new Error(detail?.message ?? detail?.error ?? `faucet → ${res.status}`);
  }
  return res.json();
}

export async function startCashout(body: {
  invoiceId: number;
  seller: string;
  amount: string;
  targetCurrency: string;
}): Promise<CashoutSession> {
  if (IS_MOCK) {
    return { interactiveUrl: "about:blank", cashoutId: "mock-cashout" };
  }
  const res = await fetch("/api/cashout", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`cashout → ${res.status}`);
  return res.json();
}

export async function getCashout(
  cashoutId: string,
): Promise<{ status: string }> {
  if (IS_MOCK) return { status: "completed" };
  return getJson(`/api/cashout/${cashoutId}`);
}
