"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Banknote, Check } from "lucide-react";
import { AppNav } from "@/components/AppNav";
import { Money, Spinner } from "@/components/ui";
import { useWallet } from "@/lib/wallet";
import { useLiveInvoice } from "@/lib/hooks";
import { getCashout, startCashout } from "@/lib/api";
import { netAfterFee, toNumber } from "@/lib/format";

const FIAT_OPTIONS = [
  { code: "IDR", label: "Indonesian rupiah", market: "Indonesia", rate: 16250 },
  { code: "PHP", label: "Philippine peso", market: "Philippines", rate: 58 },
  { code: "SGD", label: "Singapore dollar", market: "Singapore", rate: 1.35 },
  { code: "MYR", label: "Malaysian ringgit", market: "Malaysia", rate: 4.72 },
  { code: "THB", label: "Thai baht", market: "Thailand", rate: 36.5 },
  { code: "VND", label: "Vietnamese dong", market: "Vietnam", rate: 25400 },
  { code: "USD", label: "US dollar", market: "USD rails", rate: 1 },
] as const;

type FiatCode = (typeof FIAT_OPTIONS)[number]["code"];

function fiatOption(code: string) {
  return FIAT_OPTIONS.find((option) => option.code === code) ?? FIAT_OPTIONS[0];
}

function formatFiat(raw: string, code: string): string {
  const option = fiatOption(code);
  const value = toNumber(raw) * option.rate;
  return `${value.toLocaleString(undefined, {
    maximumFractionDigits: ["IDR", "VND"].includes(option.code) ? 0 : 2,
  })} ${option.code}`;
}

export default function CashoutPage() {
  const params = useParams<{ invoiceId: string }>();
  const id = Number(params.invoiceId);
  const { address } = useWallet();
  const { invoice, loading } = useLiveInvoice(id);

  const [currency, setCurrency] = useState<FiatCode>("IDR");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const net = invoice ? netAfterFee(invoice.amount, invoice.feeBps) : "0";
  const selectedFiat = fiatOption(currency);
  const fiatBalance = formatFiat(net, currency);

  async function cashout() {
    if (!invoice || !address) return;
    setError(null);
    setBusy(true);
    setStatus("Opening anchor…");
    try {
      const { interactiveUrl, cashoutId } = await startCashout({
        invoiceId: id,
        seller: address,
        amount: net,
        targetCurrency: currency,
      });
      if (interactiveUrl && !interactiveUrl.startsWith("about:")) {
        window.open(interactiveUrl, "_blank", "width=480,height=640");
      }
      // poll status
      const deadline = Date.now() + 60_000;
      while (Date.now() < deadline) {
        const { status: s } = await getCashout(cashoutId);
        setStatus(s);
        if (s === "completed") {
          setDone(true);
          break;
        }
        await new Promise((r) => setTimeout(r, 3000));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cash-out failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <AppNav />
      <main className="mx-auto max-w-md px-5 py-14">
        <Link
          href={`/invoices/${id}`}
          className="text-sm text-mute hover:text-text"
        >
          ← Back to invoice
        </Link>

        {loading && !invoice ? (
          <div className="mt-8">
            <Spinner />
          </div>
        ) : !invoice ? (
          <p className="mt-8 text-dim">Invoice not found.</p>
        ) : (
          <div className="panel mt-4 p-7">
            <p className="eyebrow mb-2">Cash out</p>
            <h1 className="font-display text-2xl" style={{ fontWeight: 500 }}>
              Withdraw to local currency
            </h1>

            <div className="my-6 border-y border-line-soft py-6 text-center">
              <p className="eyebrow mb-2">Available</p>
              <div
                className="font-display text-3xl"
                style={{ fontWeight: 500 }}
              >
                <Money raw={net} />
              </div>
            </div>

            {done ? (
              <div className="text-center">
                <div
                  className="mx-auto grid h-14 w-14 place-items-center rounded-full"
                  style={{ background: "var(--color-panel-2)" }}
                >
                  <Check size={28} style={{ color: "var(--color-pos)" }} />
                </div>
                <p className="mt-4 font-display text-lg" style={{ fontWeight: 500 }}>
                  Settlement complete
                </p>
                <p className="mt-1 text-sm text-dim">
                  Funds are on their way to your {selectedFiat.market} account.
                </p>
                <div className="mt-5 rounded-2xl border border-line-soft p-5 text-left">
                  <p className="eyebrow mb-2">Fiat APAC balance</p>
                  <p className="font-display text-2xl" style={{ fontWeight: 500 }}>
                    {fiatBalance}
                  </p>
                  <p className="mt-2 text-xs text-dim">
                    Demo settlement estimate for {selectedFiat.label}. The
                    testnet anchor marks this as completed; production rates and
                    payout rails would come from the selected anchor.
                  </p>
                </div>
                <Link href="/dashboard" className="btn btn-ghost mt-5">
                  Back to dashboard
                </Link>
              </div>
            ) : (
              <>
                <label className="block">
                  <span className="eyebrow mb-2 block">Receive in</span>
                  <select
                    className="pl-input"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value as FiatCode)}
                  >
                    {FIAT_OPTIONS.map((option) => (
                      <option key={option.code} value={option.code}>
                        {option.code} - {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="mt-4 rounded-xl border border-line-soft p-4">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-dim">Estimated receipt</span>
                    <span className="font-mono text-sm">{fiatBalance}</span>
                  </div>
                  <p className="mt-2 text-xs text-mute">
                    Fiat APAC demo balance for {selectedFiat.market}. Rates are
                    static demo estimates.
                  </p>
                </div>

                <button
                  onClick={cashout}
                  disabled={busy || !address}
                  className="btn btn-gold mt-5 w-full disabled:opacity-50"
                >
                  <Banknote size={16} />
                  {busy ? (status ?? "Processing…") : "Withdraw via anchor"}
                </button>
                <p className="mt-3 text-center text-xs text-mute">
                  Cash-out runs through a licensed anchor (SEP-24). Testnet demo
                  uses a sandbox anchor.
                </p>
                {error && (
                  <p
                    className="mt-3 text-center text-sm"
                    style={{ color: "var(--color-neg)" }}
                  >
                    {error}
                  </p>
                )}
              </>
            )}
          </div>
        )}
      </main>
    </>
  );
}
