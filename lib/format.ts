import { CONFIG } from "./config";

const DECIMALS = 7;

/** Raw i128 string → human number. "3000000000" → 300 */
export function toNumber(raw: string): number {
  return Number(BigInt(raw)) / 10 ** DECIMALS;
}

/** "3000000000" → "300 PUSDC" */
export function formatAmount(
  raw: string,
  symbol: string = CONFIG.assetSymbol,
): string {
  return `${toNumber(raw).toLocaleString(undefined, {
    maximumFractionDigits: 2,
  })} ${symbol}`;
}

/** "3000000000" → "300" (no symbol, for split display) */
export function amountValue(raw: string): string {
  return toNumber(raw).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

/** Human number → raw i128 string. 300 → "3000000000" */
export function toRaw(value: number): string {
  return BigInt(Math.round(value * 10 ** DECIMALS)).toString();
}

/** Net after platform fee, raw string. */
export function netAfterFee(raw: string, feeBps: number): string {
  const gross = BigInt(raw);
  const fee = (gross * BigInt(feeBps)) / 10000n;
  return (gross - fee).toString();
}

export function shortAddr(addr: string | null, lead = 4, tail = 4): string {
  if (!addr) return "—";
  return `${addr.slice(0, lead)}…${addr.slice(-tail)}`;
}

export function shortHash(hash: string | null, n = 8): string {
  if (!hash) return "—";
  return `${hash.slice(0, n)}…`;
}

/** Seconds remaining until a Unix-seconds deadline (never negative). */
export function secondsLeft(deadline: number | null): number {
  if (!deadline) return 0;
  return Math.max(0, deadline - Math.floor(Date.now() / 1000));
}

/** 125 → "2:05" ; 3665 → "1:01:05" */
export function formatDuration(totalSecs: number): string {
  const s = Math.max(0, Math.floor(totalSecs));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

/** Human label for a review window length. */
export function reviewWindowLabel(secs: number): string {
  if (secs < 3600) return `${Math.round(secs / 60)} min`;
  if (secs < 86400) return `${Math.round(secs / 3600)} h`;
  return `${Math.round(secs / 86400)} days`;
}

export function relativeTime(ts: number | null): string {
  if (!ts) return "—";
  const diff = Math.floor(Date.now() / 1000) - ts;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
