"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { AppNav } from "@/components/AppNav";
import { useWallet } from "@/lib/wallet";
import { useToast } from "@/components/Toast";
import { saveInvoiceMeta } from "@/lib/api";
import { createInvoice, ensureTrustline } from "@/lib/contract";
import { toRaw } from "@/lib/format";
import { CONFIG } from "@/lib/config";

const WINDOWS = [
  { label: "2 minutes (demo)", secs: 120 },
  { label: "24 hours", secs: 86400 },
  { label: "72 hours", secs: 259200 },
];

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default function NewInvoice() {
  const router = useRouter();
  const { address, connect } = useWallet();
  const toast = useToast();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [amount, setAmount] = useState("");
  const [reviewSecs, setReviewSecs] = useState(120);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const amountNum = Number(amount);
  const email = clientEmail.trim();
  const emailError = email && !isValidEmail(email) ? "Enter a valid client email or leave it blank." : null;
  const valid = title.trim() && amountNum > 0 && !emailError;

  async function submit() {
    if (!address) return connect();
    if (emailError) {
      setError(emailError);
      return;
    }
    setError(null);
    try {
      setBusy("Checking your wallet…");
      // The seller receives payout in PUSDC — ensure they trust it, or the
      // eventual release would fail on-chain.
      if (await ensureTrustline(address)) {
        toast.success("PUSDC added to your wallet", {
          detail: "You can now receive payouts.",
        });
      }
      setBusy("Saving invoice details…");
      const { metadataHash } = await saveInvoiceMeta({
        title: title.trim(),
        description: description.trim() || undefined,
        clientEmail: email || null,
        currencyDisplay: CONFIG.assetSymbol,
      });
      setBusy("Confirm in your wallet…");
      const id = await createInvoice({
        seller: address,
        amountRaw: toRaw(amountNum),
        reviewSecs,
        metadataHash,
      });
      toast.success("Invoice created", {
        detail: "Share the pay link with your client.",
      });
      router.push(`/invoices/${id}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong.";
      setError(msg);
      toast.error("Couldn't create invoice", { detail: msg });
      setBusy(null);
    }
  }

  return (
    <>
      <AppNav />
      <main className="mx-auto max-w-xl px-5 py-12">
        <p className="eyebrow mb-2">New invoice</p>
        <h1 className="font-display text-3xl" style={{ fontWeight: 500 }}>
          Create an invoice
        </h1>
        <p className="mt-2 text-sm text-dim">
          Details are stored off-chain; only a hash goes on-chain. You'll get a
          shareable pay link once it's created.
        </p>

        <div className="panel mt-8 space-y-5 p-6">
          <Field label="Project title">
            <input
              className="pl-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Branding design package"
            />
          </Field>
          <Field label="Description (optional)">
            <textarea
              className="pl-input min-h-[80px] resize-y"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Logo, visual guideline, mockups"
            />
          </Field>
          <Field label="Client email (optional)">
            <input
              className="pl-input"
              type="email"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              placeholder="client@example.com"
            />
            {emailError && (
              <p className="mt-2 text-xs" style={{ color: "var(--color-neg)" }}>
                {emailError}
              </p>
            )}
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label={`Amount (${CONFIG.assetSymbol})`}>
              <input
                className="pl-input font-mono"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="300"
              />
            </Field>
            <Field label="Review window">
              <select
                className="pl-input"
                value={reviewSecs}
                onChange={(e) => setReviewSecs(Number(e.target.value))}
              >
                {WINDOWS.map((w) => (
                  <option key={w.secs} value={w.secs}>
                    {w.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {error && (
            <p className="text-sm" style={{ color: "var(--color-neg)" }}>
              {error}
            </p>
          )}

          <button
            onClick={submit}
            disabled={!valid || !!busy}
            className="btn btn-gold w-full disabled:opacity-50"
          >
            {busy ?? (address ? "Create invoice" : "Connect wallet to continue")}
            {!busy && <ArrowRight size={16} />}
          </button>
          <p className="text-center text-xs text-mute">
            Escrow protects the client. The clock protects you.
          </p>
        </div>
      </main>
    </>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="eyebrow mb-2 block">{label}</span>
      {children}
    </label>
  );
}
