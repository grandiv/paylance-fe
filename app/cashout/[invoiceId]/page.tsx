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
import { netAfterFee } from "@/lib/format";

const CURRENCIES = ["IDR", "PHP", "USD"];

export default function CashoutPage() {
  const params = useParams<{ invoiceId: string }>();
  const id = Number(params.invoiceId);
  const { address } = useWallet();
  const { invoice, loading } = useLiveInvoice(id);

  const [currency, setCurrency] = useState("IDR");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const net = invoice ? netAfterFee(invoice.amount, invoice.feeBps) : "0";

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
                  Funds are on their way to your {currency} account.
                </p>
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
                    onChange={(e) => setCurrency(e.target.value)}
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>

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
