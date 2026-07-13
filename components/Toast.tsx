"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
} from "react";
import { CheckCircle2, XCircle, Info, ExternalLink, X } from "lucide-react";
import { EXPLORER } from "@/lib/config";

type ToastKind = "success" | "error" | "info";
interface Toast {
  id: number;
  kind: ToastKind;
  title: string;
  detail?: string;
  txHash?: string;
}

interface ToastApi {
  success: (title: string, opts?: { detail?: string; txHash?: string }) => void;
  error: (title: string, opts?: { detail?: string }) => void;
  info: (title: string, opts?: { detail?: string }) => void;
}

const Ctx = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

let seq = 1;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const push = useCallback(
    (t: Omit<Toast, "id">) => {
      const id = seq++;
      setToasts((prev) => [...prev, { ...t, id }]);
      setTimeout(() => remove(id), t.kind === "error" ? 7000 : 5000);
    },
    [remove],
  );

  const api: ToastApi = {
    success: (title, opts) =>
      push({ kind: "success", title, detail: opts?.detail, txHash: opts?.txHash }),
    error: (title, opts) => push({ kind: "error", title, detail: opts?.detail }),
    info: (title, opts) => push({ kind: "info", title, detail: opts?.detail }),
  };

  return (
    <Ctx.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed bottom-4 left-4 right-4 z-[100] flex flex-col gap-2.5 sm:left-auto sm:right-5 sm:w-full sm:max-w-sm">
        {toasts.map((t) => (
          <ToastCard key={t.id} toast={t} onClose={() => remove(t.id)} />
        ))}
      </div>
    </Ctx.Provider>
  );
}

const ICON = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
} as const;
const ACCENT = {
  success: "var(--color-pos)",
  error: "var(--color-neg)",
  info: "var(--color-cool)",
} as const;

function ToastCard({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const Icon = ICON[toast.kind];
  return (
    <div
      className="panel pointer-events-auto flex items-start gap-3 p-4"
      style={{
        animation: "toast-in 0.25s cubic-bezier(0.2,0.8,0.2,1)",
        borderLeft: `3px solid ${ACCENT[toast.kind]}`,
      }}
      role="status"
    >
      <Icon size={18} style={{ color: ACCENT[toast.kind], flexShrink: 0, marginTop: 1 }} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{toast.title}</p>
        {toast.detail && (
          <p className="mt-0.5 text-xs text-dim">{toast.detail}</p>
        )}
        {toast.txHash && toast.txHash !== "mock" && (
          <a
            href={EXPLORER.tx(toast.txHash)}
            target="_blank"
            rel="noreferrer"
            className="mt-1.5 inline-flex items-center gap-1 font-mono text-xs hover:underline"
            style={{ color: "var(--color-gold)" }}
          >
            View transaction <ExternalLink size={11} />
          </a>
        )}
      </div>
      <button
        onClick={onClose}
        className="text-mute transition-colors hover:text-text"
        aria-label="Dismiss"
      >
        <X size={15} />
      </button>
    </div>
  );
}
