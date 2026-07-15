"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ExternalLink, Wallet, LogOut } from "lucide-react";
import { Wordmark } from "./Nav";
import { DemoBar } from "./DemoBar";
import { useWallet } from "@/lib/wallet";
import { shortAddr } from "@/lib/format";
import { EXPLORER } from "@/lib/config";
import { getPusdcBalance } from "@/lib/contract";
import {
  FIAT_BALANCE_EVENT,
  type CashoutFiatBalance,
  formatFiat,
  readCashoutFiatBalance,
} from "@/lib/fiat";

function formatPusdc(balance: string | null) {
  if (balance === null) return "no PUSDC";
  return `${Number(balance).toLocaleString(undefined, {
    maximumFractionDigits: 2,
  })} PUSDC`;
}

function formatCashoutFiat(balance: CashoutFiatBalance | null) {
  if (!balance) return "no cashout fiat";
  return formatFiat(balance.amountRaw, balance.currency);
}

function fiatDetail(balance: CashoutFiatBalance | null) {
  if (!balance) return "Complete a cashout to set a fiat balance.";
  return `Latest cashout invoice #${balance.invoiceId} to ${balance.currency}`;
}

export function WalletButton() {
  const { address, connect, disconnect } = useWallet();
  const [pusdcBalance, setPusdcBalance] = useState<string | null>(null);
  const [fiatBalance, setFiatBalance] = useState<CashoutFiatBalance | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const detailsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!address) return;
    const refreshFiatBalance = () => {
      setFiatBalance(readCashoutFiatBalance(address));
    };

    refreshFiatBalance();
    window.addEventListener(FIAT_BALANCE_EVENT, refreshFiatBalance);
    window.addEventListener("storage", refreshFiatBalance);

    let cancelled = false;
    setBalanceLoading(true);
    getPusdcBalance(address)
      .then((balance) => {
        if (!cancelled) setPusdcBalance(balance);
      })
      .finally(() => {
        if (!cancelled) setBalanceLoading(false);
      });
    return () => {
      cancelled = true;
      window.removeEventListener(FIAT_BALANCE_EVENT, refreshFiatBalance);
      window.removeEventListener("storage", refreshFiatBalance);
    };
  }, [address]);

  useEffect(() => {
    if (!detailsOpen) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!detailsRef.current?.contains(event.target as Node)) {
        setDetailsOpen(false);
      }
    };

    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [detailsOpen]);

  if (!address) {
    return (
      <button onClick={() => connect()} className="btn btn-gold text-sm">
        <Wallet size={16} /> Connect wallet
      </button>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <div
        ref={detailsRef}
        className="relative"
        onMouseEnter={() => setDetailsOpen(true)}
        onMouseLeave={() => setDetailsOpen(false)}
      >
        <button
          type="button"
          onClick={() => setDetailsOpen((open) => !open)}
          className="chip text-left transition-colors hover:border-gold hover:text-text"
          title="Show wallet balances"
        >
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ background: "var(--color-pos)" }}
          />
          <span className="flex flex-col leading-tight">
            <span>{shortAddr(address)}</span>
            <span className="text-[0.62rem] tracking-normal text-mute">
              {balanceLoading ? "PUSDC ..." : formatPusdc(pusdcBalance)} /{" "}
              {formatCashoutFiat(fiatBalance)}
            </span>
          </span>
        </button>

        {detailsOpen && (
          <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-2xl border border-line bg-panel p-4 text-left shadow-xl">
            <p className="eyebrow mb-3">Wallet balance</p>
            <div className="space-y-3">
              <div className="rounded-xl border border-line-soft p-3">
                <p className="text-xs text-mute">Token balance</p>
                <p className="mt-1 font-mono text-sm text-text">
                  {balanceLoading ? "Loading PUSDC..." : formatPusdc(pusdcBalance)}
                </p>
              </div>
              <div className="rounded-xl border border-line-soft p-3">
                <p className="text-xs text-mute">Fiat cashout balance</p>
                <p className="mt-1 font-mono text-sm text-text">
                  {formatCashoutFiat(fiatBalance)}
                </p>
                <p className="mt-1 text-xs text-mute">{fiatDetail(fiatBalance)}</p>
              </div>
            </div>
            <a
              href={EXPLORER.account(address)}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-1 text-xs text-dim transition-colors hover:text-text"
            >
              View account on Stellar Expert <ExternalLink size={12} />
            </a>
          </div>
        )}
      </div>
      <button
        onClick={() => disconnect()}
        title="Disconnect"
        className="grid h-8 w-8 place-items-center rounded-lg border border-line text-mute transition-colors hover:text-text"
      >
        <LogOut size={15} />
      </button>
    </div>
  );
}

export function AppNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-ink/80 backdrop-blur-md">
      <DemoBar />
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <div className="flex items-center gap-7">
          <Wordmark />
          <div className="hidden items-center gap-6 md:flex">
            <Link
              href="/dashboard"
              className="text-sm text-dim transition-colors hover:text-text"
            >
              Dashboard
            </Link>
            <Link
              href="/invoices/new"
              className="text-sm text-dim transition-colors hover:text-text"
            >
              New invoice
            </Link>
            <a
              href="https://paylance-1.gitbook.io/paylance-docs"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-sm text-dim transition-colors hover:text-text"
            >
              Docs <ExternalLink size={12} />
            </a>
          </div>
        </div>
        <WalletButton />
      </nav>
    </header>
  );
}
