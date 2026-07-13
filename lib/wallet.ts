"use client";

import {
  StellarWalletsKit,
  WalletNetwork,
  allowAllModules,
  FREIGHTER_ID,
} from "@creit.tech/stellar-wallets-kit";
import { useEffect } from "react";
import { useSyncExternalStore } from "react";
import { CONFIG, IS_MOCK } from "./config";
import { MOCK_PAYER, MOCK_SELLER } from "./mock";

// Thin wrapper around stellar-wallets-kit (Freighter / Lobstr / xBull / Hana).
// The backend never touches keys — the FE builds a tx, the wallet signs it.

let kit: StellarWalletsKit | null = null;
function getKit(): StellarWalletsKit {
  if (typeof window === "undefined") throw new Error("wallet is client-only");
  if (!kit) {
    kit = new StellarWalletsKit({
      network: WalletNetwork.TESTNET,
      selectedWalletId: FREIGHTER_ID,
      modules: allowAllModules(),
    });
  }
  return kit;
}

const ADDR_KEY = "paylance:addr";
const WALLET_KEY = "paylance:wallet";

let currentAddress: string | null = null;
let restored = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** Demo-only: set the connected persona without a real wallet. */
export function setMockPersona(role: "seller" | "client"): void {
  currentAddress = role === "seller" ? MOCK_SELLER : MOCK_PAYER;
  emit();
}

export async function connectWallet(): Promise<void> {
  if (IS_MOCK) {
    if (!currentAddress) currentAddress = MOCK_SELLER;
    emit();
    return;
  }
  const k = getKit();
  await k.openModal({
    onWalletSelected: async (option) => {
      k.setWallet(option.id);
      const { address } = await k.getAddress();
      currentAddress = address;
      localStorage.setItem(ADDR_KEY, address);
      localStorage.setItem(WALLET_KEY, option.id);
      emit();
    },
  });
}

export function disconnectWallet(): void {
  currentAddress = null;
  localStorage.removeItem(ADDR_KEY);
  localStorage.removeItem(WALLET_KEY);
  emit();
}

function restore(): void {
  if (restored || typeof window === "undefined") return;
  restored = true;
  if (IS_MOCK) {
    // auto-connect as the seller persona so the demo lands populated
    currentAddress = MOCK_SELLER;
    emit();
    return;
  }
  const addr = localStorage.getItem(ADDR_KEY);
  const wid = localStorage.getItem(WALLET_KEY);
  if (addr && wid) {
    try {
      getKit().setWallet(wid);
      currentAddress = addr;
      emit();
    } catch {
      /* wallet not available; ignore */
    }
  }
}

export async function signXdr(xdr: string): Promise<string> {
  if (!currentAddress) throw new Error("Connect a wallet first.");
  const { signedTxXdr } = await getKit().signTransaction(xdr, {
    address: currentAddress,
    networkPassphrase: CONFIG.networkPassphrase,
  });
  return signedTxXdr;
}

export function getWalletAddress(): string | null {
  return currentAddress;
}

/** React hook: current connected address + connect/disconnect actions. */
export function useWallet() {
  const address = useSyncExternalStore(
    subscribe,
    () => currentAddress,
    () => null,
  );
  useEffect(() => {
    restore();
  }, []);
  return { address, connect: connectWallet, disconnect: disconnectWallet };
}
