"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Check,
  Hand,
  Upload,
  Link2,
  Copy,
  ExternalLink,
  Banknote,
  Undo2,
  Play,
  FileDown,
  FileText,
} from "lucide-react";
import { AppNav } from "@/components/AppNav";
import { ReleaseRing } from "@/components/ReleaseRing";
import {
  EventTimeline,
  Money,
  Spinner,
  StatusBadge,
  statusMeta,
} from "@/components/ui";
import { useWallet } from "@/lib/wallet";
import { useToast } from "@/components/Toast";
import { saveDeliveryMetadata } from "@/lib/api";
import type { DeliveryMetadata } from "@/lib/types";
import { useLiveInvoice, useCountdown } from "@/lib/hooks";
import {
  approveRelease,
  clientHold,
  fundInvoice,
  getPusdcBalance,
  hashFile,
  hashText,
  refundUnstartedInvoice,
  releaseHold,
  submitDelivery,
} from "@/lib/contract";
import {
  amountValue,
  formatDuration,
  netAfterFee,
  reviewWindowLabel,
  shortAddr,
} from "@/lib/format";
import { CONFIG, EXPLORER } from "@/lib/config";

export default function InvoiceDetail() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const { address } = useWallet();
  const toast = useToast();
  const { invoice, loading, error, refetch } = useLiveInvoice(id);
  const left = useCountdown(invoice?.reviewDeadline ?? null);

  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (loading && !invoice) {
    return (
      <>
        <AppNav />
        <main className="mx-auto max-w-5xl px-5 py-20">
          <Spinner label="Loading invoice…" />
        </main>
      </>
    );
  }
  if (error || !invoice) {
    return (
      <>
        <AppNav />
        <main className="mx-auto max-w-5xl px-5 py-20 text-center">
          <p className="text-dim">Invoice not found.</p>
        </main>
      </>
    );
  }

  const isSeller = address && address === invoice.seller;
  const isPayer = address && address === invoice.payer;
  const released = invoice.status === "Released";
  const inReview = invoice.status === "Delivered" && !invoice.hold;

  // ring state
  const fraction =
    invoice.status === "Delivered"
      ? invoice.reviewSecs > 0
        ? left / invoice.reviewSecs
        : 0
      : 1;
  const ringLabel = released
    ? "PAID"
    : invoice.status === "Delivered"
      ? left > 0
        ? formatDuration(left)
        : "0:00"
      : invoice.status === "Funded"
        ? amountValue(invoice.amount)
        : "—";
  const ringSub = statusMeta(
    invoice.status,
    invoice.hold,
    invoice.releasedVia,
  ).label;

  async function run(
    label: string,
    fn: () => Promise<{ hash: string } | void>,
    success: string,
  ) {
    setActionError(null);
    setBusy(label);
    try {
      const res = await fn();
      refetch();
      toast.success(success, {
        txHash: res && "hash" in res ? res.hash : undefined,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Transaction failed.";
      setActionError(msg);
      toast.error("Transaction failed", { detail: msg });
    } finally {
      setBusy(null);
    }
  }

  const payLink =
    typeof window !== "undefined"
      ? `${window.location.origin}/pay/${id}`
      : `/pay/${id}`;

  return (
    <>
      <AppNav />
      <main className="mx-auto max-w-5xl px-5 py-10">
        <Link href="/dashboard" className="text-sm text-mute hover:text-text">
          ← Dashboard
        </Link>

        <div className="mt-4 grid gap-8 md:grid-cols-[300px_1fr]">
          {/* LEFT — the dial + headline numbers */}
          <div className="flex flex-col items-center text-center">
            <ReleaseRing
              fraction={fraction}
              released={released}
              size={260}
              label={ringLabel}
              sublabel={ringSub}
            />
            <div className="mt-6">
              <div
                className="font-display text-3xl"
                style={{ fontWeight: 500 }}
              >
                <Money raw={invoice.amount} />
              </div>
              <p className="mt-1 font-mono text-xs text-mute">
                net{" "}
                {amountValue(netAfterFee(invoice.amount, invoice.feeBps))}{" "}
                {CONFIG.assetSymbol} after {invoice.feeBps / 100}% fee
              </p>
            </div>
            {invoice.status === "Delivered" && left === 0 && !released && (
              <p
                className="mt-4 text-xs"
                style={{ color: "var(--color-gold)" }}
              >
                Auto-release pending — the contract pays out within seconds.
              </p>
            )}
          </div>

          {/* RIGHT — meta, actions, timeline */}
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-display text-2xl" style={{ fontWeight: 500 }}>
                {invoice.meta?.title ?? `Invoice INV-${id}`}
              </h1>
              <StatusBadge
                status={invoice.status}
                hold={invoice.hold}
                releasedVia={invoice.releasedVia}
              />
            </div>
            {invoice.meta?.description && (
              <p className="mt-2 text-sm text-dim">{invoice.meta.description}</p>
            )}

            <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
              <Meta label="Seller">
                <div className="flex items-center gap-2">
                  <Addr a={invoice.seller} />
                  <Link
                    href={`/reputation/${invoice.seller}`}
                    className="font-mono text-xs hover:underline"
                    style={{ color: "var(--color-gold)" }}
                  >
                    reputation
                  </Link>
                </div>
              </Meta>
              <Meta label="Client">
                {invoice.payer ? <Addr a={invoice.payer} /> : "Open link"}
              </Meta>
              <Meta label="Review window">
                {reviewWindowLabel(invoice.reviewSecs)}
              </Meta>
              <Meta label="Contract">
                <a
                  href={EXPLORER.contract(CONFIG.contractId)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-mono hover:text-text"
                  style={{ color: "var(--color-gold)" }}
                >
                  {shortAddr(CONFIG.contractId)} <ExternalLink size={11} />
                </a>
              </Meta>
            </dl>

            {/* ACTIONS */}
            <div className="mt-7">
              {/* Unfunded → share pay link */}
              {invoice.status === "Unfunded" && (
                <div className="panel p-5">
                  <p className="text-sm text-dim">
                    Share this link with your client to fund the escrow.
                  </p>
                  <div className="mt-3 flex gap-2">
                    <input
                      readOnly
                      value={payLink}
                      className="pl-input font-mono text-xs"
                    />
                    <button
                      className="btn btn-ghost"
                      onClick={() => {
                        navigator.clipboard?.writeText(payLink);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 1500);
                      }}
                    >
                      {copied ? <Check size={16} /> : <Copy size={16} />}
                    </button>
                  </div>
                  {!isSeller && (
                    <Link href={`/pay/${id}`} className="btn btn-gold mt-4">
                      Open pay page
                    </Link>
                  )}
                </div>
              )}

              {/* Seller: submit delivery when funded */}
              {isSeller && invoice.status === "Funded" && (
                <DeliverPanel
                  busy={busy}
                  onSubmit={(d) =>
                    run(
                      "Confirm in your wallet…",
                      async () => {
                        const res = await submitDelivery({
                          seller: invoice.seller,
                          invoiceId: id,
                          deliveryHash: d.deliveryHash,
                          metadataHash: invoice.metadataHash,
                        });
                        // save off-chain details so the client can review
                        try {
                          await saveDeliveryMetadata(id, {
                            deliveryHash: d.deliveryHash,
                            deliveryUrl: d.deliveryUrl,
                            deliveryNote: d.deliveryNote,
                            fileName: d.fileName,
                          });
                        } catch {
                          /* on-chain succeeded; metadata is best-effort */
                        }
                        return res;
                      },
                      "Delivery submitted — client can now review it",
                    )
                  }
                />
              )}

              {/* Delivery review — visible once work is submitted, before actions */}
              {invoice.delivery && (
                <DeliveryReview
                  delivery={invoice.delivery}
                  txHash={
                    invoice.events.find((e) => e.type === "delivery_submitted")
                      ?.txHash
                  }
                />
              )}

              {/* Client: waiting on delivery — can reclaim funds */}
              {isPayer && invoice.status === "Funded" && (
                <div className="panel p-5">
                  <p className="text-sm text-dim">
                    Waiting for the freelancer to deliver. If they never do, you
                    can reclaim your escrowed funds.
                  </p>
                  <button
                    className="btn btn-ghost mt-4 disabled:opacity-50"
                    disabled={!!busy}
                    onClick={() =>
                      run(
                        "Confirm in your wallet…",
                        () =>
                          refundUnstartedInvoice({
                            caller: invoice.payer!,
                            invoiceId: id,
                          }),
                        "Refund issued — funds returned to you",
                      )
                    }
                  >
                    <Undo2 size={16} /> Request refund
                  </button>
                </div>
              )}

              {/* Client: approve or hold during review */}
              {isPayer && inReview && (
                <div className="flex flex-wrap gap-3">
                  <button
                    className="btn btn-gold disabled:opacity-50"
                    disabled={!!busy}
                    onClick={() =>
                      run(
                        "Confirm in your wallet…",
                        () =>
                          approveRelease({ payer: invoice.payer!, invoiceId: id }),
                        "Payment released to the freelancer",
                      )
                    }
                  >
                    <Check size={16} /> Approve &amp; release
                  </button>
                  <button
                    className="btn btn-ghost disabled:opacity-50"
                    disabled={!!busy}
                    onClick={() =>
                      run(
                        "Placing hold…",
                        () => clientHold({ payer: invoice.payer!, invoiceId: id }),
                        "Auto-release paused — funds held",
                      )
                    }
                  >
                    <Hand size={16} /> Hold
                  </button>
                </div>
              )}

              {/* Client on hold — approve now, or resume the clock */}
              {isPayer && invoice.status === "Delivered" && invoice.hold && (
                <div className="flex flex-wrap gap-3">
                  <button
                    className="btn btn-gold disabled:opacity-50"
                    disabled={!!busy}
                    onClick={() =>
                      run(
                        "Confirm in your wallet…",
                        () =>
                          approveRelease({ payer: invoice.payer!, invoiceId: id }),
                        "Payment released to the freelancer",
                      )
                    }
                  >
                    <Check size={16} /> Approve &amp; release
                  </button>
                  <button
                    className="btn btn-ghost disabled:opacity-50"
                    disabled={!!busy}
                    onClick={() =>
                      run(
                        "Lifting hold…",
                        () =>
                          releaseHold({ caller: invoice.payer!, invoiceId: id }),
                        "Hold lifted — review clock resumed",
                      )
                    }
                  >
                    <Play size={16} /> Resume clock
                  </button>
                </div>
              )}

              {/* Payer not yet funded, viewing detail */}
              {!isSeller && invoice.status === "Unfunded" && isPayer === false && (
                <Link href={`/pay/${id}`} className="btn btn-gold">
                  Fund this invoice
                </Link>
              )}

              {/* Seller cash-out after release */}
              {isSeller && released && (
                <Link href={`/cashout/${id}`} className="btn btn-gold">
                  <Banknote size={16} /> Cash out to local currency
                </Link>
              )}

              {busy && (
                <div className="mt-4">
                  <Spinner label={busy} />
                </div>
              )}
              {actionError && (
                <p className="mt-3 text-sm" style={{ color: "var(--color-neg)" }}>
                  {actionError}
                </p>
              )}
            </div>

            {/* TIMELINE */}
            <div className="mt-9">
              <p className="eyebrow mb-4">On-chain activity</p>
              <EventTimeline events={invoice.events} />
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

function Meta({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="eyebrow mb-1">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function Addr({ a }: { a: string }) {
  const [balance, setBalance] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    getPusdcBalance(a).then((value) => {
      if (alive) setBalance(value);
    });
    return () => {
      alive = false;
    };
  }, [a]);

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <a
        href={EXPLORER.account(a)}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1 font-mono hover:text-text"
      >
        {shortAddr(a)} <ExternalLink size={11} />
      </a>
      <span className="chip font-mono text-[0.68rem]">
        {balance === undefined
          ? "PUSDC …"
          : balance === null
            ? "no PUSDC"
            : `${Number(balance).toLocaleString(undefined, {
                maximumFractionDigits: 2,
              })} PUSDC`}
      </span>
    </span>
  );
}

// What the client sees: the submitted deliverable (link / file / note) + proof.
function DeliveryReview({
  delivery,
  txHash,
}: {
  delivery: DeliveryMetadata;
  txHash?: string;
}) {
  return (
    <div className="panel mb-5 p-5">
      <div className="flex items-center justify-between">
        <p className="eyebrow">Submitted delivery</p>
        {txHash && (
          <a
            href={EXPLORER.tx(txHash)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-mono text-xs hover:text-text"
            style={{ color: "var(--color-gold)" }}
          >
            proof tx <ExternalLink size={11} />
          </a>
        )}
      </div>

      {delivery.deliveryNote && (
        <p className="mt-3 text-sm text-dim">{delivery.deliveryNote}</p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {delivery.deliveryUrl && (
          <a
            href={delivery.deliveryUrl}
            target="_blank"
            rel="noreferrer"
            className="btn btn-gold"
          >
            <FileDown size={16} /> Open delivery
          </a>
        )}
        {delivery.fileName && (
          <span className="chip">
            <FileText size={12} /> {delivery.fileName}
          </span>
        )}
      </div>

      <p className="mt-3 font-mono text-[0.7rem] text-mute break-all">
        sha256 {delivery.deliveryHash}
      </p>
    </div>
  );
}

export interface DeliverySubmission {
  deliveryHash: string;
  deliveryUrl: string | null;
  deliveryNote: string | null;
  fileName: string | null;
}

// Delivery submission: hash a file or a URL client-side, capture a note, then
// submit_delivery on-chain + save the metadata so the client can review it.
function DeliverPanel({
  busy,
  onSubmit,
}: {
  busy: string | null;
  onSubmit: (d: DeliverySubmission) => void;
}) {
  const [mode, setMode] = useState<"file" | "url">("url");
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [hash, setHash] = useState<string | null>(null);
  const [hashing, setHashing] = useState(false);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setHashing(true);
    setFileName(f.name);
    setHash(await hashFile(f));
    setHashing(false);
  }
  async function onUrlBlur() {
    if (!url.trim()) return setHash(null);
    setHashing(true);
    setHash(await hashText(url.trim()));
    setHashing(false);
  }

  return (
    <div className="panel p-5">
      <p className="text-sm text-dim">
        Submit your deliverable. Its hash is anchored on-chain as proof; the
        link and note let your client review the work before releasing.
      </p>
      <div className="mt-3 flex gap-2">
        <TabBtn active={mode === "url"} onClick={() => setMode("url")}>
          <Link2 size={14} /> Link
        </TabBtn>
        <TabBtn active={mode === "file"} onClick={() => setMode("file")}>
          <Upload size={14} /> File
        </TabBtn>
      </div>

      <div className="mt-4 space-y-3">
        {mode === "file" ? (
          <label className="btn btn-ghost cursor-pointer">
            <Upload size={16} />
            {fileName ?? "Choose file"}
            <input type="file" className="hidden" onChange={onFile} />
          </label>
        ) : (
          <input
            className="pl-input font-mono text-sm"
            placeholder="https://…/final-delivery.zip or a deploy / repo URL"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onBlur={onUrlBlur}
          />
        )}
        <textarea
          className="pl-input min-h-[64px] resize-y text-sm"
          placeholder="Note for the client (what you delivered, how to review it)…"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      {hash && (
        <p className="mt-3 font-mono text-xs text-mute">
          sha256 {hash.slice(0, 24)}…
        </p>
      )}

      <button
        className="btn btn-gold mt-4 disabled:opacity-50"
        disabled={!hash || hashing || !!busy}
        onClick={() =>
          hash &&
          onSubmit({
            deliveryHash: hash,
            deliveryUrl: mode === "url" && url.trim() ? url.trim() : null,
            deliveryNote: note.trim() || null,
            fileName: mode === "file" ? fileName : null,
          })
        }
      >
        {hashing ? "Hashing…" : "Submit delivery proof"}
      </button>
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition-colors"
      style={{
        borderColor: active ? "var(--color-gold)" : "var(--color-line)",
        color: active ? "var(--color-gold)" : "var(--color-dim)",
      }}
    >
      {children}
    </button>
  );
}
