"use client";

import { useParams } from "next/navigation";
import { BadgeCheck, ExternalLink, TrendingUp, Percent } from "lucide-react";
import { AppNav } from "@/components/AppNav";
import { Money, Spinner } from "@/components/ui";
import { useInvoices } from "@/lib/hooks";
import {
  deriveReputation,
  feeAfterDiscount,
  tierProgress,
} from "@/lib/reputation";
import { shortAddr } from "@/lib/format";
import { EXPLORER } from "@/lib/config";

export default function ReputationPage() {
  const params = useParams<{ seller: string }>();
  const seller = params.seller;
  const { data: invoices, loading } = useInvoices("seller", seller);
  const rep = deriveReputation(seller, invoices);

  const onTimeRate =
    rep.completed > 0 ? Math.round((rep.onTime / rep.completed) * 100) : 0;
  const progress = tierProgress(rep);
  const fee = feeAfterDiscount(rep.feeDiscountBps);

  return (
    <>
      <AppNav />
      <main className="mx-auto max-w-2xl px-5 py-12">
        <p className="eyebrow mb-2">Work reputation</p>
        <div className="flex items-center gap-2">
          <h1 className="font-display text-2xl" style={{ fontWeight: 500 }}>
            {shortAddr(seller, 6, 6)}
          </h1>
          <a
            href={EXPLORER.account(seller)}
            target="_blank"
            rel="noreferrer"
            className="text-mute hover:text-text"
          >
            <ExternalLink size={15} />
          </a>
        </div>

        {loading && invoices.length === 0 ? (
          <div className="mt-8">
            <Spinner label="Loading reputation…" />
          </div>
        ) : (
          <>
            {/* tier hero + progress */}
            <div
              className="mt-6 rounded-2xl p-6"
              style={{ background: "var(--color-panel)" }}
            >
              <div className="flex items-center gap-4">
                <BadgeCheck size={40} style={{ color: "var(--color-gold)" }} />
                <div className="flex-1">
                  <div
                    className="font-display text-3xl"
                    style={{ fontWeight: 500, color: "var(--color-gold)" }}
                  >
                    {rep.tier}
                  </div>
                  <p className="text-sm text-dim">
                    {rep.feeDiscountBps > 0
                      ? `Escrow fee ${fee.base.toFixed(2)}% → ${fee.effective.toFixed(2)}%${
                          rep.tier === "Elite" ? " · faster release" : ""
                        }`
                      : "Complete invoices to unlock lower fees."}
                  </p>
                </div>
              </div>

              {progress.next && (
                <div className="mt-5">
                  <div className="mb-2 flex items-center justify-between font-mono text-xs text-mute">
                    <span>
                      {progress.have} / {progress.need} to {progress.next}
                    </span>
                    <span>{Math.round(progress.pct)}%</span>
                  </div>
                  <div
                    className="h-1.5 w-full overflow-hidden rounded-full"
                    style={{ background: "var(--color-line)" }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${progress.pct}%`,
                        background: "var(--color-gold)",
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* headline numbers */}
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <BigStat
                icon={<Money raw={rep.paidVolume} />}
                label="Total paid volume"
                accent
              />
              <BigStat
                icon={`${rep.completed}`}
                label="Invoices completed"
              />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Stat label="On-time" value={`${onTimeRate}%`} icon={<TrendingUp size={14} />} />
              <Stat
                label="Fee now"
                value={`${fee.effective.toFixed(2)}%`}
                icon={<Percent size={14} />}
              />
              <Stat label="Disputes" value={String(rep.disputes)} />
              <Stat label="Refunds" value={String(rep.refunds)} />
            </div>

            <p className="mt-6 text-xs text-mute">
              Reputation is derived from settled on-chain invoices. Higher tiers
              reduce escrow fees and can shorten the release window — turning a
              track record into real leverage.
            </p>
          </>
        )}
      </main>
    </>
  );
}

function BigStat({
  icon,
  label,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  accent?: boolean;
}) {
  return (
    <div className="panel p-6">
      <p className="eyebrow mb-2">{label}</p>
      <p
        className="font-display text-3xl"
        style={{
          fontWeight: 500,
          color: accent ? "var(--color-gold)" : undefined,
        }}
      >
        {icon}
      </p>
    </div>
  );
}

function Stat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="panel p-4">
      <p className="eyebrow mb-1 flex items-center gap-1.5">
        {icon}
        {label}
      </p>
      <p className="font-display text-xl" style={{ fontWeight: 500 }}>
        {value}
      </p>
    </div>
  );
}
