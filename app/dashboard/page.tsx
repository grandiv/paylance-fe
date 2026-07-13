"use client";

import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import { AppNav } from "@/components/AppNav";
import { InvoiceCard, Spinner } from "@/components/ui";
import { useWallet } from "@/lib/wallet";
import { useInvoices } from "@/lib/hooks";
import { deriveReputation } from "@/lib/reputation";
import { formatAmount } from "@/lib/format";

export default function Dashboard() {
  const { address, connect } = useWallet();
  const { data: invoices, loading } = useInvoices("seller", address);
  // derive reputation from the seller's actual invoices (robust to backend gaps)
  const rep = address ? deriveReputation(address, invoices) : null;

  return (
    <>
      <AppNav />
      <main className="mx-auto max-w-6xl px-5 py-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow mb-2">Freelancer dashboard</p>
            <h1 className="font-display text-3xl" style={{ fontWeight: 500 }}>
              Your invoices
            </h1>
          </div>
          <Link href="/invoices/new" className="btn btn-gold">
            <Plus size={16} /> New invoice
          </Link>
        </div>

        {!address ? (
          <div className="panel mt-10 p-10 text-center">
            <h2 className="font-display text-xl" style={{ fontWeight: 500 }}>
              Connect a wallet to see your invoices
            </h2>
            <p className="mx-auto mt-2 max-w-sm text-sm text-dim">
              Your dashboard is derived from on-chain escrows tied to your
              address. Nothing is stored server-side about you.
            </p>
            <button onClick={() => connect()} className="btn btn-gold mt-6">
              Connect wallet
            </button>
            <div className="mt-6 text-sm">
              <Link
                href="/invoices/1"
                className="inline-flex items-center gap-1 text-dim hover:text-text"
              >
                Or view a live demo invoice <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        ) : (
          <>
            {rep && (
              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                <Stat label="Reputation tier" value={rep.tier} accent />
                <Stat
                  label="Completed"
                  value={String(rep.completed)}
                />
                <Stat
                  label="Paid volume"
                  value={formatAmount(rep.paidVolume)}
                />
              </div>
            )}

            <div className="mt-10">
              {loading ? (
                <Spinner label="Loading your invoices…" />
              ) : invoices.length === 0 ? (
                <div className="panel p-10 text-center">
                  <p className="text-dim">
                    No invoices yet. Create one and share the pay link with
                    your client.
                  </p>
                  <Link href="/invoices/new" className="btn btn-gold mt-5">
                    <Plus size={16} /> Create your first invoice
                  </Link>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {invoices.map((inv) => (
                    <InvoiceCard key={inv.id} inv={inv} />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="panel p-5">
      <p className="eyebrow mb-2">{label}</p>
      <p
        className="font-display text-2xl"
        style={{ fontWeight: 500, color: accent ? "var(--color-gold)" : undefined }}
      >
        {value}
      </p>
    </div>
  );
}
