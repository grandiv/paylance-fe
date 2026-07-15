"use client";

import Link from "next/link";
import { ExternalLink, Wallet, LogOut } from "lucide-react";
import { Wordmark } from "./Nav";
import { DemoBar } from "./DemoBar";
import { useWallet } from "@/lib/wallet";
import { shortAddr } from "@/lib/format";

export function WalletButton() {
  const { address, connect, disconnect } = useWallet();
  if (!address) {
    return (
      <button onClick={() => connect()} className="btn btn-gold text-sm">
        <Wallet size={16} /> Connect wallet
      </button>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <span className="chip" title={address}>
        <span
          className="inline-block h-2 w-2 rounded-full"
          style={{ background: "var(--color-pos)" }}
        />
        {shortAddr(address)}
      </span>
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
