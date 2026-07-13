"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import type {
  InvoiceEvent,
  InvoiceStatus,
  InvoiceSummary,
  ReleasedVia,
} from "@/lib/types";
import { EXPLORER } from "@/lib/config";
import { formatAmount, relativeTime, shortAddr } from "@/lib/format";

// ── status → label + tone ─────────────────────────────────────────────
type Tone = "held" | "released" | "neutral";

export function statusMeta(
  status: InvoiceStatus,
  hold: boolean,
  releasedVia: ReleasedVia,
): { label: string; tone: Tone } {
  switch (status) {
    case "Unfunded":
      return { label: "Awaiting payment", tone: "neutral" };
    case "Funded":
      return { label: "Funded — awaiting delivery", tone: "held" };
    case "Delivered":
      return hold
        ? { label: "On hold", tone: "neutral" }
        : { label: "In review", tone: "held" };
    case "Released":
      return {
        label: releasedVia === "auto" ? "Auto-released" : "Paid",
        tone: "released",
      };
    case "Refunded":
      return { label: "Refunded", tone: "neutral" };
    default:
      return { label: status, tone: "neutral" };
  }
}

const TONE_STYLE: Record<Tone, { color: string; border: string }> = {
  held: { color: "var(--color-cool)", border: "var(--color-cool-soft)" },
  released: { color: "var(--color-gold)", border: "var(--color-gold-soft)" },
  neutral: { color: "var(--color-mute)", border: "var(--color-line)" },
};

export function StatusBadge({
  status,
  hold,
  releasedVia,
}: {
  status: InvoiceStatus;
  hold: boolean;
  releasedVia: ReleasedVia;
}) {
  const { label, tone } = statusMeta(status, hold, releasedVia);
  const s = TONE_STYLE[tone];
  return (
    <span className="chip" style={{ color: s.color, borderColor: s.border }}>
      <span
        className="inline-block h-1.5 w-1.5 rounded-full"
        style={{ background: s.color }}
      />
      {label}
    </span>
  );
}

export function Money({
  raw,
  symbol,
  className = "",
}: {
  raw: string;
  symbol?: string;
  className?: string;
}) {
  return (
    <span className={`font-mono tnum ${className}`}>
      {formatAmount(raw, symbol)}
    </span>
  );
}

export function InvoiceCard({ inv }: { inv: InvoiceSummary }) {
  const { label, tone } = statusMeta(inv.status, inv.hold, inv.releasedVia);
  return (
    <Link
      href={`/invoices/${inv.id}`}
      className="panel block p-5 transition-transform hover:-translate-y-0.5"
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs text-mute">
          INV-{String(inv.id).padStart(3, "0")}
        </span>
        <span
          className="font-mono text-xs"
          style={{ color: TONE_STYLE[tone].color }}
        >
          {label}
        </span>
      </div>
      <div className="mt-4 font-display text-2xl" style={{ fontWeight: 500 }}>
        <Money raw={inv.amount} />
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-dim">
        <span>{inv.payer ? `Client ${shortAddr(inv.payer)}` : "Open link"}</span>
        <span>{relativeTime(inv.createdAt)}</span>
      </div>
    </Link>
  );
}

// ── event timeline with explorer links ────────────────────────────────
const EVENT_LABEL: Record<string, string> = {
  invoice_created: "Invoice created",
  invoice_funded: "Escrow funded",
  delivery_submitted: "Delivery submitted",
  release_approved: "Client approved",
  invoice_released: "Payment released",
  invoice_auto_released: "Auto-released (client didn't respond)",
  invoice_held: "Client placed a hold",
  hold_released: "Hold lifted — review clock resumed",
  invoice_refunded: "Refunded to client",
  reputation_updated: "Reputation updated",
};

export function EventTimeline({ events }: { events: InvoiceEvent[] }) {
  if (!events?.length) {
    return <p className="text-sm text-mute">No on-chain activity yet.</p>;
  }
  return (
    <ol className="relative ml-1 border-l border-line-soft">
      {events.map((e) => (
        <li key={e.id} className="mb-4 ml-4 last:mb-0">
          <span
            className="absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full"
            style={{ background: "var(--color-cool)" }}
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm">
              {EVENT_LABEL[e.type] ?? e.type}
            </span>
            <span className="flex items-center gap-2 font-mono text-xs text-mute">
              {relativeTime(e.ts)}
              {e.txHash && (
                <a
                  href={EXPLORER.tx(e.txHash)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 transition-colors hover:text-text"
                  style={{ color: "var(--color-gold)" }}
                >
                  tx <ExternalLink size={11} />
                </a>
              )}
            </span>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 text-sm text-dim">
      <span
        className="h-4 w-4 animate-spin rounded-full border-2 border-line"
        style={{ borderTopColor: "var(--color-gold)" }}
      />
      {label ?? "Loading…"}
    </div>
  );
}

export function ConnectPrompt({ children }: { children: React.ReactNode }) {
  return (
    <div className="panel mx-auto max-w-md p-8 text-center">
      <p className="text-dim">{children}</p>
    </div>
  );
}
