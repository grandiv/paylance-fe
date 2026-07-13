import type {
  InvoiceSummary,
  ReputationProfile,
  ReputationTier,
} from "./types";
import { CONFIG } from "./config";

// Derive reputation from a seller's on-chain invoices. The backend also exposes
// /api/reputation, but deriving from settled invoices is robust and always
// reflects real chain state. Tier rules match the backend's (see handoff).
export function deriveReputation(
  seller: string,
  invoices: InvoiceSummary[],
): ReputationProfile {
  const released = invoices.filter((i) => i.status === "Released");
  const refunds = invoices.filter((i) => i.status === "Refunded").length;
  const completed = released.length;
  const paidVolume = released
    .reduce((sum, i) => sum + BigInt(i.amount || "0"), 0n)
    .toString();
  // "on time" = released without being auto-released past a hold; approximate as
  // all approved/auto releases counting as on-time (Core has no dispute state).
  const onTime = completed;
  const disputes = 0;

  let tier: ReputationTier = "New";
  let feeDiscountBps = 0;
  if (completed >= 10 && disputes === 0) {
    tier = "Elite";
    feeDiscountBps = 25;
  } else if (completed >= 3) {
    tier = "Reliable";
    feeDiscountBps = 10;
  }

  return {
    seller,
    completed,
    paidVolume,
    onTime,
    disputes,
    refunds,
    tier,
    feeDiscountBps,
  };
}

// Progress toward the next tier, for a progress bar.
export function tierProgress(rep: ReputationProfile): {
  next: ReputationTier | null;
  have: number;
  need: number;
  pct: number;
} {
  if (rep.tier === "Elite") return { next: null, have: rep.completed, need: rep.completed, pct: 100 };
  if (rep.tier === "Reliable") {
    const need = 10;
    return { next: "Elite", have: rep.completed, need, pct: Math.min(100, (rep.completed / need) * 100) };
  }
  const need = 3;
  return { next: "Reliable", have: rep.completed, need, pct: Math.min(100, (rep.completed / need) * 100) };
}

/** Effective fee after the tier discount, e.g. "1.00% → 0.75%". */
export function feeAfterDiscount(feeDiscountBps: number): {
  base: number;
  effective: number;
} {
  const base = CONFIG.feeBps / 100;
  const effective = Math.max(0, (CONFIG.feeBps - feeDiscountBps) / 100);
  return { base, effective };
}
