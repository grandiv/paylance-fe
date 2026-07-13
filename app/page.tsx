"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  FileCheck2,
  Wallet,
  Timer,
  BadgeCheck,
  ShieldCheck,
  Landmark,
} from "lucide-react";
import { motion, useScroll, useTransform, useReducedMotion } from "motion/react";
import { Nav, Footer } from "@/components/Nav";
import { ReleaseRing } from "@/components/ReleaseRing";
import { ScrollProgress } from "@/components/ScrollProgress";
import { Reveal, stagger, item } from "@/components/Reveal";

/* ── Hero: a self-running demo of the mechanic ─────────────────────────
   funded → delivered → countdown depletes → auto-release fires gold → loop.
   This is the thesis as hero: the timeout pays the freelancer. */
type Phase = "funded" | "counting" | "released";

function HeroDemo() {
  const [phase, setPhase] = useState<Phase>("funded");
  const [left, setLeft] = useState(6);
  const [ringSize, setRingSize] = useState(300);
  const raf = useRef<number | null>(null);

  // keep the dial inside narrow viewports
  useEffect(() => {
    const fit = () =>
      setRingSize(Math.max(220, Math.min(300, window.innerWidth - 72)));
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      while (!cancelled) {
        setPhase("funded");
        await wait(1400);
        if (cancelled) return;
        setPhase("counting");
        for (let t = 6; t >= 0; t--) {
          if (cancelled) return;
          setLeft(t);
          await wait(650);
        }
        if (cancelled) return;
        setPhase("released");
        await wait(2600);
      }
    };
    run();
    return () => {
      cancelled = true;
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, []);

  const fraction = phase === "counting" ? left / 6 : phase === "funded" ? 1 : 0;
  const released = phase === "released";
  const stageIndex = phase === "funded" ? 0 : phase === "counting" ? 1 : 2;

  return (
    <div className="relative grid place-items-center">
      {/* soft state-tinted glow */}
      <div
        className="pointer-events-none absolute h-72 w-72 rounded-full blur-3xl transition-colors duration-700"
        style={{
          background: released
            ? "rgba(232,90,79,0.16)"
            : "rgba(142,141,138,0.10)",
        }}
      />

      {/* crisp 2D clock (the centerpiece) */}
      <ReleaseRing
        fraction={fraction}
        released={released}
        size={ringSize}
        label={
          released ? "PAID" : phase === "counting" ? `0:0${left}` : "300"
        }
        sublabel={
          released
            ? "auto-released"
            : phase === "counting"
              ? "review window"
              : "held in escrow"
        }
      />

      {/* proof tag that appears on release */}
      <ProofTag show={released} />

      {/* stage tracker */}
      <div className="mt-8 w-full max-w-xs">
        <StageTracker index={stageIndex} released={released} />
        <p
          className="mt-4 text-center font-mono text-xs transition-colors"
          style={{ color: released ? "var(--color-gold)" : "var(--color-mute)" }}
        >
          {released
            ? "Client ghosted — freelancer paid anyway"
            : phase === "counting"
              ? "Client can approve or hold…"
              : "Delivery submitted · proof on-chain"}
        </p>
      </div>
    </div>
  );
}

/* Stage tracker — three nodes wired by a fill line, advancing with the flow.
   A real sequence (Funded → In review → Released), so it earns its dots. */
const STAGES = ["Funded", "In review", "Released"];
function StageTracker({ index, released }: { index: number; released: boolean }) {
  return (
    <div className="relative flex items-center justify-between">
      {/* base rail */}
      <div
        className="absolute left-0 right-0 top-[7px] h-px"
        style={{ background: "var(--color-line)" }}
      />
      {/* progress fill */}
      <div
        className="absolute left-0 top-[7px] h-px transition-all duration-500"
        style={{
          width: `${(index / (STAGES.length - 1)) * 100}%`,
          background: released ? "var(--color-gold)" : "var(--color-cool)",
        }}
      />
      {STAGES.map((label, i) => {
        const done = i <= index;
        const isReleaseNode = i === 2 && released;
        const color = isReleaseNode
          ? "var(--color-gold)"
          : done
            ? "var(--color-cool)"
            : "var(--color-line)";
        return (
          <div key={label} className="relative z-10 flex flex-col items-center">
            <span
              className="h-3.5 w-3.5 rounded-full border-2 transition-colors duration-300"
              style={{
                borderColor: color,
                background: done ? color : "var(--color-ink)",
              }}
            />
            <span
              className="mt-2 font-mono text-[0.62rem] uppercase tracking-wider transition-colors"
              style={{ color: done ? "var(--color-text)" : "var(--color-mute)" }}
            >
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ProofTag — a small "on-chain receipt" chip that pops in on release,
   reinforcing that the payout is real and verifiable. */
function ProofTag({ show }: { show: boolean }) {
  return (
    <div
      className="pointer-events-none absolute -right-2 top-6 transition-all duration-500"
      style={{
        opacity: show ? 1 : 0,
        transform: show ? "translateY(0) scale(1)" : "translateY(8px) scale(0.9)",
      }}
      aria-hidden
    >
      <span
        className="chip font-mono"
        style={{
          borderColor: "var(--color-gold-soft)",
          color: "var(--color-gold)",
          background: "color-mix(in srgb, var(--color-gold) 10%, var(--color-ink))",
        }}
      >
        ✓ tx confirmed
      </span>
    </div>
  );
}

function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/* Hero visual with a gentle parallax: the dial drifts up and fades as the page
   scrolls away — an elegant hero exit. Disabled under reduced motion. */
function HeroVisual() {
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 500], [0, reduce ? 0 : -60]);
  const opacity = useTransform(scrollY, [0, 400], [1, reduce ? 1 : 0.55]);
  return (
    <motion.div
      className="grid place-items-center"
      style={{ y, opacity }}
    >
      <HeroDemo />
    </motion.div>
  );
}

export default function Landing() {
  return (
    <>
      <Nav />
      <ScrollProgress />

      {/* HERO */}
      <section
        id="top"
        className="mx-auto max-w-6xl px-5 pt-16 pb-24 md:pt-24"
      >
        <div className="grid items-center gap-14 md:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="eyebrow mb-5">Verifiable delivery escrow</p>
            <h1
              className="display-caps text-3xl leading-[1.12] sm:text-4xl md:text-5xl"
              style={{ letterSpacing: "0.04em" }}
            >
              Deliver the work.
              <br />
              Prove it.
              <br />
              <span style={{ color: "#c9402b", fontWeight: 500 }}>Get paid</span>{" "}
              — automatically.
            </h1>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-dim">
              Paylance is a neutral escrow for cross-border freelancers. The
              client funds the work up front. When you deliver, a fixed review
              window starts — and if the client ghosts, the contract{" "}
              <span className="text-text">pays you anyway.</span>
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/invoices/new" className="btn btn-gold">
                Create an invoice <ArrowRight size={17} />
              </Link>
              <Link href="/invoices/1" className="btn btn-ghost">
                See a live invoice
              </Link>
            </div>
            <p className="mt-6 font-mono text-xs text-mute">
              Escrow protects the client. The clock protects you.
            </p>
          </motion.div>

          <HeroVisual />
        </div>
      </section>

      <div className="hairline mx-auto max-w-6xl" />

      {/* HOW — a real sequence, so numbering is meaningful */}
      <section id="how" className="mx-auto max-w-6xl px-5 py-20">
        <Reveal>
          <h2
            className="font-display text-3xl md:text-4xl"
            style={{ fontWeight: 600 }}
          >
            One link. Five steps. No chasing.
          </h2>
        </Reveal>
        <motion.div
          className="mt-12 grid gap-5 md:grid-cols-5"
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
        >
          {STEPS.map((s, i) => (
            <motion.div key={s.title} className="panel p-5" variants={item}>
              <div className="mb-4 flex items-center justify-between">
                <s.icon size={20} style={{ color: "#8e8d8a" }} />
                <span className="font-mono text-xs text-mute">
                  0{i + 1}
                </span>
              </div>
              <h3
                className="font-display text-base"
                style={{ fontWeight: 600 }}
              >
                {s.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-dim">{s.body}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* PROOF / why it's safe */}
      <section id="proof" className="mx-auto max-w-6xl px-5 py-20">
        <div className="grid gap-12 md:grid-cols-2">
          <Reveal>
            <p className="eyebrow mb-4">Why it's safe</p>
            <h2
              className="font-display text-3xl leading-tight md:text-4xl"
              style={{ fontWeight: 600 }}
            >
              The platform can't touch the money. The contract can't play
              favorites.
            </h2>
            <p className="mt-5 max-w-md text-dim">
              Funds sit in a smart contract, not a company account.
              Release rules are enforced by code and visible on-chain. Neither
              side has to trust us — or each other.
            </p>
          </Reveal>
          <motion.div
            className="grid gap-4"
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-60px" }}
          >
            {PROOFS.map((p) => (
              <motion.div
                key={p.title}
                className="panel flex gap-4 p-5"
                variants={item}
              >
                <p.icon
                  size={22}
                  style={{ color: "#e98074", flexShrink: 0, marginTop: 2 }}
                />
                <div>
                  <h3
                    className="font-display text-base"
                    style={{ fontWeight: 600 }}
                  >
                    {p.title}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-dim">
                    {p.body}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Under the hood strip */}
      <section id="stack" className="mx-auto max-w-6xl px-5 py-20">
        <Reveal className="panel p-8 md:p-12">
          <p className="eyebrow mb-4">Under the hood</p>
          <p
            className="font-display text-2xl leading-snug md:text-3xl"
            style={{ fontWeight: 500 }}
          >
            We didn't reinvent the rails. The escrow logic is ours; everything
            around it composes proven infrastructure —{" "}
            <span style={{ color: "#c9402b" }}>familiar crypto wallets</span>,{" "}
            <span style={{ color: "#c9402b" }}>regulated anchors</span> for local
            cash-out, and low-cost{" "}
            <span style={{ color: "#c9402b" }}>on-chain settlement</span>.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <span className="chip">USDC settlement</span>
            <span className="chip">Auto-release keeper</span>
            <span className="chip">On-chain delivery proof</span>
            <span className="chip">Local cash-out (IDR / PHP)</span>
            <span className="chip">Portable reputation</span>
          </div>
        </Reveal>
      </section>

      {/* CTA */}
      <section id="cta" className="mx-auto max-w-6xl px-5 pb-24 pt-8 text-center">
        <Reveal>
          <h2
            className="font-display text-4xl md:text-5xl"
            style={{ fontWeight: 700 }}
          >
            Stop chasing invoices.
          </h2>
          <p className="mx-auto mt-4 max-w-md text-dim">
            Send a Paylance link to your next client and let the contract handle
            the rest.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link href="/invoices/new" className="btn btn-gold">
              Create an invoice <ArrowRight size={17} />
            </Link>
            <Link href="/dashboard" className="btn btn-ghost">
              Open dashboard
            </Link>
          </div>
        </Reveal>
      </section>

      <Footer />
    </>
  );
}

const STEPS = [
  { icon: FileCheck2, title: "Create invoice", body: "Set the scope and amount. Get a shareable pay link." },
  { icon: Wallet, title: "Client funds escrow", body: "They connect a wallet and lock the payment on-chain." },
  { icon: FileCheck2, title: "Submit delivery", body: "Your file's hash is anchored on-chain as proof." },
  { icon: Timer, title: "Review window", body: "The client approves — or the clock runs down." },
  { icon: BadgeCheck, title: "Auto-release", body: "Silence releases payment to you. Then cash out locally." },
];

const PROOFS = [
  { icon: ShieldCheck, title: "Non-custodial escrow", body: "Money lives in the contract. We never hold your keys or your funds." },
  { icon: Timer, title: "Timeout auto-release", body: "A fixed review window means a client can't stall you forever. Silence pays you." },
  { icon: FileCheck2, title: "Tamper-proof delivery trail", body: "Every delivery is timestamped and hashed on-chain — a record no one can edit." },
  { icon: Landmark, title: "Local cash-out", body: "Withdraw to IDR or PHP through a licensed anchor, without leaving the app." },
];
