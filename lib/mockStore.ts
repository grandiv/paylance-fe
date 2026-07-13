"use client";

// In-memory, reactive store that powers the fully-offline demo (READ_SOURCE=mock).
// It simulates the contract + backend: write actions mutate state and a keeper
// timer fires auto-release when a review window expires — the ghost moment,
// with no wallet, no RPC, no network.

import {
  MOCK_DETAILS,
  MOCK_PAYER,
  MOCK_REPUTATION,
  MOCK_SELLER,
} from "./mock";
import { CONFIG } from "./config";
import type {
  InvoiceDetail,
  InvoiceEvent,
  ReputationProfile,
} from "./types";

const ASSET = CONFIG.usdcSac;
const now = () => Math.floor(Date.now() / 1000);
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

let invoices: Record<number, InvoiceDetail> = clone(MOCK_DETAILS);
let reputation: ReputationProfile = clone(MOCK_REPUTATION);
let nextId =
  Math.max(0, ...Object.keys(invoices).map((k) => Number(k))) + 1;
let eventSeq = 1000;
const pendingMeta: Record<string, InvoiceDetail["meta"]> = {};

const listeners = new Set<() => void>();
export function subscribeMock(cb: () => void) {
  listeners.add(cb);
  ensureKeeper();
  return () => listeners.delete(cb);
}
const emit = () => listeners.forEach((l) => l());

function addEvent(id: number, type: string) {
  const inv = invoices[id];
  if (!inv) return;
  const ev: InvoiceEvent = {
    id: eventSeq++,
    invoiceId: id,
    type,
    ledger: eventSeq,
    txHash: `mock${Math.random().toString(16).slice(2, 10)}`,
    payload: {},
    ts: now(),
  };
  inv.events = [...inv.events, ev];
}

// ── reads ─────────────────────────────────────────────────────────────
export const mockRead = {
  list(role: "seller" | "payer", address: string) {
    return Object.values(invoices)
      .filter((i) => (role === "seller" ? i.seller === address : i.payer === address))
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((i) => clone(i));
  },
  get(id: number): InvoiceDetail {
    const inv = invoices[id];
    if (!inv) throw new Error("not found");
    return clone(inv);
  },
  reputation(seller: string): ReputationProfile {
    return { ...clone(reputation), seller };
  },
};

// ── writes (mirror the contract) ──────────────────────────────────────
export function mockSaveMeta(meta: {
  title: string;
  description?: string;
  clientEmail?: string | null;
  currencyDisplay?: string;
}): string {
  const hash = Array.from({ length: 64 }, () =>
    Math.floor(Math.random() * 16).toString(16),
  ).join("");
  pendingMeta[hash] = {
    metadataHash: hash,
    title: meta.title,
    description: meta.description ?? "",
    clientEmail: meta.clientEmail ?? null,
    currencyDisplay: meta.currencyDisplay ?? CONFIG.assetSymbol,
    lineItems: [],
  };
  return hash;
}

export const mockActions = {
  create(input: {
    seller: string;
    amountRaw: string;
    reviewSecs: number;
    metadataHash: string;
  }): number {
    const id = nextId++;
    invoices[id] = {
      id,
      seller: input.seller,
      payer: null,
      asset: ASSET,
      amount: input.amountRaw,
      feeBps: CONFIG.feeBps,
      reviewSecs: input.reviewSecs,
      status: "Unfunded",
      hold: false,
      createdAt: now(),
      fundedAt: null,
      deliveredAt: null,
      reviewDeadline: null,
      releasedAt: null,
      deliveryHash: null,
      metadataHash: input.metadataHash,
      releasedVia: null,
      meta: pendingMeta[input.metadataHash] ?? {
        metadataHash: input.metadataHash,
        title: `Invoice INV-${id}`,
        description: "",
        clientEmail: null,
        currencyDisplay: CONFIG.assetSymbol,
        lineItems: [],
      },
      delivery: null,
      events: [],
    };
    addEvent(id, "invoice_created");
    emit();
    return id;
  },
  fund(id: number, payer: string) {
    const inv = invoices[id];
    if (!inv) return;
    inv.payer = payer;
    inv.status = "Funded";
    inv.fundedAt = now();
    addEvent(id, "invoice_funded");
    emit();
  },
  deliver(id: number, deliveryHash: string) {
    const inv = invoices[id];
    if (!inv) return;
    inv.status = "Delivered";
    inv.deliveredAt = now();
    inv.reviewDeadline = now() + inv.reviewSecs;
    inv.deliveryHash = deliveryHash;
    inv.delivery = {
      deliveryHash,
      deliveryUrl: null,
      deliveryNote: null,
      fileName: null,
      submittedAt: now(),
    };
    addEvent(id, "delivery_submitted");
    emit();
  },
  setDelivery(
    id: number,
    body: {
      deliveryHash: string;
      deliveryUrl?: string | null;
      deliveryNote?: string | null;
      fileName?: string | null;
    },
  ) {
    const inv = invoices[id];
    if (!inv) return;
    inv.delivery = {
      deliveryHash: body.deliveryHash,
      deliveryUrl: body.deliveryUrl ?? null,
      deliveryNote: body.deliveryNote ?? null,
      fileName: body.fileName ?? null,
      submittedAt: now(),
    };
    emit();
  },
  approve(id: number) {
    const inv = invoices[id];
    if (!inv) return;
    inv.status = "Released";
    inv.releasedVia = "approve";
    inv.releasedAt = now();
    inv.hold = false;
    addEvent(id, "release_approved");
    addEvent(id, "invoice_released");
    bumpReputation();
    emit();
  },
  hold(id: number) {
    const inv = invoices[id];
    if (!inv) return;
    inv.hold = true;
    addEvent(id, "invoice_held");
    emit();
  },
  releaseHold(id: number) {
    const inv = invoices[id];
    if (!inv) return;
    inv.hold = false;
    inv.reviewDeadline = now() + 24 * 60 * 60; // contract extends +24h
    addEvent(id, "hold_released");
    emit();
  },
  refund(id: number) {
    const inv = invoices[id];
    if (!inv) return;
    inv.status = "Refunded";
    inv.hold = false;
    addEvent(id, "invoice_refunded");
    emit();
  },
  reset() {
    invoices = clone(MOCK_DETAILS);
    reputation = clone(MOCK_REPUTATION);
    emit();
  },
};

function bumpReputation() {
  reputation = {
    ...reputation,
    completed: reputation.completed + 1,
    onTime: reputation.onTime + 1,
  };
}

// keeper: auto-release any expired, un-held review window
let keeper: ReturnType<typeof setInterval> | null = null;
function ensureKeeper() {
  if (keeper || typeof window === "undefined") return;
  keeper = setInterval(() => {
    let changed = false;
    for (const inv of Object.values(invoices)) {
      if (
        inv.status === "Delivered" &&
        !inv.hold &&
        inv.reviewDeadline &&
        inv.reviewDeadline <= now()
      ) {
        inv.status = "Released";
        inv.releasedVia = "auto";
        inv.releasedAt = now();
        addEvent(inv.id, "invoice_auto_released");
        bumpReputation();
        changed = true;
      }
    }
    if (changed) emit();
  }, 1000);
}

export { MOCK_SELLER, MOCK_PAYER };
