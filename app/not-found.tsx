import Link from "next/link";
import { Nav, Footer } from "@/components/Nav";

export default function NotFound() {
  return (
    <>
      <Nav />
      <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-5 text-center">
        <p
          className="font-mono text-6xl"
          style={{ color: "var(--color-gold)" }}
        >
          404
        </p>
        <h1
          className="mt-4 font-display text-2xl"
          style={{ fontWeight: 500 }}
        >
          This page slipped the escrow
        </h1>
        <p className="mt-2 text-dim">
          The link may be wrong or the invoice no longer exists.
        </p>
        <div className="mt-7 flex gap-3">
          <Link href="/" className="btn btn-ghost">
            Home
          </Link>
          <Link href="/dashboard" className="btn btn-gold">
            Open app
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
