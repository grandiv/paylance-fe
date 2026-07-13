"use client";

import { useEffect, useRef, useState } from "react";
import { getInvoice, getReputation, listInvoices } from "./api";
import { IS_MOCK } from "./config";
import { subscribeMock } from "./mockStore";
import { secondsLeft } from "./format";
import type {
  InvoiceDetail,
  InvoiceSummary,
  ReputationProfile,
} from "./types";

/** Seller/payer invoice list (re-reads on mock-store changes in demo mode). */
export function useInvoices(
  role: "seller" | "payer",
  address: string | null,
) {
  const [data, setData] = useState<InvoiceSummary[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!address) {
      setData([]);
      return;
    }
    let alive = true;
    const load = () => {
      setLoading(true);
      listInvoices(role, address)
        .then((v) => alive && setData(v))
        .catch(() => alive && setData([]))
        .finally(() => alive && setLoading(false));
    };
    load();
    const unsub = IS_MOCK ? subscribeMock(load) : undefined;
    return () => {
      alive = false;
      unsub?.();
    };
  }, [role, address]);

  return { data, loading };
}

/** Single invoice + live updates: SSE in api mode, mock-store in demo mode. */
export function useLiveInvoice(id: number) {
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const refetch = useRef(() => {});
  refetch.current = () => {
    getInvoice(id)
      .then((v) => setInvoice(v))
      .catch(() => {
        /* keep last good state; a stray fetch error shouldn't blank the page */
      });
  };

  useEffect(() => {
    setLoading(true);
    setError(false);
    let alive = true;

    // Initial load tolerates indexer lag: a just-created invoice 404s until the
    // indexer catches up (~10-15s), so retry before showing "not found".
    (async () => {
      for (let i = 0; i < 12 && alive; i++) {
        try {
          const v = await getInvoice(id);
          if (!alive) return;
          setInvoice(v);
          setLoading(false);
          return;
        } catch {
          await new Promise((r) => setTimeout(r, 2500));
        }
      }
      if (alive) {
        setError(true);
        setLoading(false);
      }
    })();

    if (IS_MOCK) {
      const unsub = subscribeMock(() => refetch.current());
      return () => {
        alive = false;
        unsub();
      };
    }

    const es = new EventSource(`/api/events/stream?invoice=${id}`);
    const onEvent = (e: MessageEvent) => {
      try {
        const env = JSON.parse(e.data);
        if (env.invoice) {
          setInvoice((prev) => (prev ? { ...prev, ...env.invoice } : prev));
        }
        refetch.current();
      } catch {
        /* ignore malformed frame */
      }
    };
    // exact contract event topic names (see paylance_escrow/src/lib.rs)
    for (const type of [
      "invoice_created",
      "invoice_funded",
      "delivery_submitted",
      "release_approved",
      "invoice_released",
      "invoice_auto_released",
      "invoice_held",
      "hold_released",
      "invoice_refunded",
      "reputation_updated",
    ]) {
      es.addEventListener(type, onEvent);
    }
    es.onerror = () => {
      /* keep last good state; SSE retries */
    };
    return () => {
      alive = false;
      es.close();
    };
  }, [id]);

  return { invoice, loading, error, refetch: () => refetch.current() };
}

export function useReputation(seller: string | null) {
  const [data, setData] = useState<ReputationProfile | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!seller) return;
    let alive = true;
    const load = () => {
      setLoading(true);
      getReputation(seller)
        .then((v) => alive && setData(v))
        .catch(() => alive && setData(null))
        .finally(() => alive && setLoading(false));
    };
    load();
    const unsub = IS_MOCK ? subscribeMock(load) : undefined;
    return () => {
      alive = false;
      unsub?.();
    };
  }, [seller]);

  return { data, loading };
}

/** Live seconds-remaining to a Unix-seconds deadline, ticking each second. */
export function useCountdown(deadline: number | null): number {
  const [left, setLeft] = useState(() => secondsLeft(deadline));
  useEffect(() => {
    setLeft(secondsLeft(deadline));
    if (!deadline) return;
    const t = setInterval(() => setLeft(secondsLeft(deadline)), 1000);
    return () => clearInterval(t);
  }, [deadline]);
  return left;
}
