"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, Check } from "lucide-react";
import { AppNav } from "@/components/AppNav";
import { Money, Spinner, StatusBadge } from "@/components/ui";
import { useWallet } from "@/lib/wallet";
import { useToast } from "@/components/Toast";
import { useLiveInvoice } from "@/lib/hooks";
import { ensureTrustline, fundInvoice } from "@/lib/contract";
import { reviewWindowLabel, shortAddr } from "@/lib/format";
import { CONFIG } from "@/lib/config";

export default function PayPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const { address, connect } = useWallet();
  const toast = useToast();
  const { invoice, loading, refetch } = useLiveInvoice(id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fund() {
    if (!address) return connect();
    setError(null);
    setBusy(true);
    try {
      // Payer must trust PUSDC before the escrow can pull the funds.
      if (await ensureTrustline(address)) {
        toast.success("PUSDC added to your wallet");
      }
      const res = await fundInvoice({ payer: address, invoiceId: id });
      refetch();
      toast.success("Escrow funded", {
        detail: "The freelancer can now deliver.",
        txHash: res.hash,
      });
    } catch (e) {
      const raw = e instanceof Error ? e.message : "Funding failed.";
      // A common failure: the payer hasn't added a PUSDC trustline / has no balance.
      const hint = /trustline|balance|insufficient/i.test(raw)
        ? "Make sure your wallet holds PUSDC on testnet (add the asset / fund it first)."
        : raw;
      setError(hint);
      toast.error("Funding failed", { detail: hint });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <AppNav />
      <main className="mx-auto max-w-md px-5 py-14">
        {loading && !invoice ? (
          <Spinner label="Loading invoice…" />
        ) : !invoice ? (
          <p className="text-center text-dim">Invoice not found.</p>
        ) : (
          <div className="panel p-7">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-mute">
                INV-{String(id).padStart(3, "0")}
              </span>
              <StatusBadge
                status={invoice.status}
                hold={invoice.hold}
                releasedVia={invoice.releasedVia}
              />
            </div>

            <h1
              className="mt-4 font-display text-xl"
              style={{ fontWeight: 500 }}
            >
              {invoice.meta?.title ?? `Invoice INV-${id}`}
            </h1>
            <p className="mt-1 text-sm text-dim">
              from {shortAddr(invoice.seller)}
            </p>

            <div className="my-6 border-y border-line-soft py-6 text-center">
              <p className="eyebrow mb-2">Amount</p>
              <div
                className="font-display text-4xl"
                style={{ fontWeight: 500 }}
              >
                <Money raw={invoice.amount} />
              </div>
            </div>

            <div
              className="flex items-start gap-3 rounded-xl p-4"
              style={{ background: "var(--color-panel-2)" }}
            >
              <ShieldCheck
                size={20}
                style={{ color: "var(--color-gold)", flexShrink: 0 }}
              />
              <p className="text-sm text-dim">
                Your payment is held in a smart-contract escrow — not by the
                platform. After delivery you get a{" "}
                <span className="text-text">
                  {reviewWindowLabel(invoice.reviewSecs)}
                </span>{" "}
                window to approve or hold before it releases.
              </p>
            </div>

            {invoice.status === "Unfunded" ? (
              <>
                <button
                  onClick={fund}
                  disabled={busy}
                  className="btn btn-gold mt-6 w-full disabled:opacity-50"
                >
                  {busy
                    ? "Confirm in your wallet…"
                    : address
                      ? `Fund ${CONFIG.assetSymbol} escrow`
                      : "Connect wallet to pay"}
                </button>
                {error && (
                  <p
                    className="mt-3 text-center text-sm"
                    style={{ color: "var(--color-neg)" }}
                  >
                    {error}
                  </p>
                )}
              </>
            ) : (
              <div className="mt-6 text-center">
                <p
                  className="flex items-center justify-center gap-2 text-sm"
                  style={{ color: "var(--color-pos)" }}
                >
                  <Check size={16} /> Escrow funded
                </p>
                <Link
                  href={`/invoices/${id}`}
                  className="btn btn-ghost mt-4"
                >
                  Track this invoice
                </Link>
              </div>
            )}
          </div>
        )}
      </main>
    </>
  );
}
