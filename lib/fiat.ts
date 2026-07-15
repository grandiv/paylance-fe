import { toNumber } from "./format";

export const FIAT_OPTIONS = [
  { code: "IDR", label: "Indonesian rupiah", market: "Indonesia", rate: 16250 },
  { code: "PHP", label: "Philippine peso", market: "Philippines", rate: 58 },
  { code: "SGD", label: "Singapore dollar", market: "Singapore", rate: 1.35 },
  { code: "MYR", label: "Malaysian ringgit", market: "Malaysia", rate: 4.72 },
  { code: "THB", label: "Thai baht", market: "Thailand", rate: 36.5 },
  { code: "VND", label: "Vietnamese dong", market: "Vietnam", rate: 25400 },
  { code: "USD", label: "US dollar", market: "USD rails", rate: 1 },
] as const;

export type FiatCode = (typeof FIAT_OPTIONS)[number]["code"];

export interface CashoutFiatBalance {
  address: string;
  amountRaw: string;
  currency: FiatCode;
  invoiceId: number;
  completedAt: number;
}

const STORAGE_PREFIX = "paylance.cashoutFiatBalance.";
export const FIAT_BALANCE_EVENT = "paylance:fiat-balance";

export function fiatOption(code: string) {
  return FIAT_OPTIONS.find((option) => option.code === code) ?? FIAT_OPTIONS[0];
}

export function formatFiat(raw: string, code: string): string {
  const option = fiatOption(code);
  const value = toNumber(raw) * option.rate;
  return `${value.toLocaleString(undefined, {
    maximumFractionDigits: ["IDR", "VND"].includes(option.code) ? 0 : 2,
  })} ${option.code}`;
}

export function saveCashoutFiatBalance(balance: CashoutFiatBalance) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    `${STORAGE_PREFIX}${balance.address}`,
    JSON.stringify(balance),
  );
  window.dispatchEvent(new Event(FIAT_BALANCE_EVENT));
}

export function readCashoutFiatBalance(
  address: string,
): CashoutFiatBalance | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(`${STORAGE_PREFIX}${address}`);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as CashoutFiatBalance;
    if (!parsed.amountRaw || !parsed.currency) return null;
    return parsed;
  } catch {
    return null;
  }
}
