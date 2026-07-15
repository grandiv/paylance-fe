import Link from "next/link";
import { ExternalLink } from "lucide-react";

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/"
      className={`font-display text-[1.35rem] font-700 tracking-tight ${className}`}
      style={{ fontWeight: 700 }}
    >
      <span style={{ color: "#33302b" }}>Pay</span>
      <span style={{ color: "#c9402b" }}>lance</span>
    </Link>
  );
}

export function Nav() {
  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-ink/70 backdrop-blur-md">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Wordmark />
        <div className="hidden items-center gap-7 md:flex">
          <a href="#how" className="text-sm text-dim transition-colors hover:text-text">
            How it works
          </a>
          <a href="#proof" className="text-sm text-dim transition-colors hover:text-text">
            Why it's safe
          </a>
          <a href="#stack" className="text-sm text-dim transition-colors hover:text-text">
            Under the hood
          </a>
          <a
            href="https://paylance-1.gitbook.io/paylance-docs"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-sm text-dim transition-colors hover:text-text"
          >
            Docs <ExternalLink size={12} />
          </a>
        </div>
        <Link href="/dashboard" className="btn btn-gold text-sm">
          Open app
        </Link>
      </nav>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-line/60 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 md:flex-row">
        <Wordmark />
        <p className="text-xs text-mute">
          Non-custodial escrow · on-chain settlement · testnet demo · 2026
        </p>
      </div>
    </footer>
  );
}
