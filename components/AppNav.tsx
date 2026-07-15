"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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

export function WalletButton() {
  const { address, connect, disconnect } = useWallet();
  const [pusdcBalance, setPusdcBalance] = useState<string | null>(null);
  const [fiatBalance, setFiatBalance] = useState<CashoutFiatBalance | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);

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

  if (!address) {
    return (
      <button onClick={() => connect()} className="btn btn-gold text-sm">
        <Wallet size={16} /> Connect wallet
      </button>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <a
        href={EXPLORER.account(address)}
        target="_blank"
        rel="noreferrer"
        className="chip transition-colors hover:border-gold hover:text-text"
        title={`Open ${address} on Stellar Expert`}
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
      </a>
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
