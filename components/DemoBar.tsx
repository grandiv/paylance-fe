"use client";

import { RotateCcw } from "lucide-react";
import { IS_MOCK } from "@/lib/config";
import { setMockPersona, useWallet } from "@/lib/wallet";
import { mockActions } from "@/lib/mockStore";
import { MOCK_SELLER } from "@/lib/mock";

// Only rendered in offline demo mode (NEXT_PUBLIC_READ_SOURCE=mock).
// Lets a presenter switch between the two personas and reset the seeded state
// — the whole flow runs with no wallet and no network.
export function DemoBar() {
  const { address } = useWallet();
  if (!IS_MOCK) return null;
  const isSeller = address === MOCK_SELLER;

  return (
    <div
      id="demo-bar"
      className="w-full border-b text-xs"
      style={{
        borderColor: "var(--color-gold-soft)",
        background: "color-mix(in srgb, var(--color-gold) 12%, var(--color-ink))",
      }}
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-5 py-2">
        <span
          className="font-mono uppercase tracking-widest"
          style={{ color: "var(--color-gold)" }}
        >
          Demo mode · offline
        </span>
        <span className="text-mute">View as</span>
        <div className="flex gap-1.5">
          <PersonaBtn active={isSeller} onClick={() => setMockPersona("seller")}>
            Ayu (freelancer)
          </PersonaBtn>
          <PersonaBtn active={!isSeller} onClick={() => setMockPersona("client")}>
            Daniel (client)
          </PersonaBtn>
        </div>
        <button
          onClick={() => mockActions.reset()}
          className="ml-auto inline-flex items-center gap-1.5 text-mute transition-colors hover:text-text"
        >
          <RotateCcw size={12} /> Reset demo
        </button>
      </div>
    </div>
  );
}

function PersonaBtn({
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
      className="rounded-md border px-2.5 py-1 transition-colors"
      style={{
        borderColor: active ? "var(--color-gold)" : "var(--color-line)",
        color: active ? "var(--color-gold)" : "var(--color-dim)",
      }}
    >
      {children}
    </button>
  );
}
