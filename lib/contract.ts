"use client";

import { CONFIG, IS_MOCK } from "./config";
import { mockActions } from "./mockStore";
import { signXdr } from "./wallet";

// Soroban write helpers. @stellar/stellar-sdk is heavy (~380 kB) and only
// needed for real on-chain writes, so it is DYNAMICALLY imported inside invoke()
// — code-split out of the page bundle, and never loaded at all in mock mode.

const mockDelay = () => new Promise((r) => setTimeout(r, 500));
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.substr(i * 2, 2), 16);
  }
  return out;
}

async function computeSha256Hex(data: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** SHA-256 (hex) of a File — used for on-chain delivery proof. */
export async function hashFile(file: File): Promise<string> {
  return computeSha256Hex(await file.arrayBuffer());
}

/** SHA-256 (hex) of a string (e.g. a delivery URL). */
export async function hashText(text: string): Promise<string> {
  return computeSha256Hex(new TextEncoder().encode(text).buffer as ArrayBuffer);
}

/** True if the account already trusts PUSDC (via Horizon balances). */
export async function hasTrustline(address: string): Promise<boolean> {
  if (IS_MOCK) return true;
  try {
    const res = await fetch(`${CONFIG.horizonUrl}/accounts/${address}`);
    if (!res.ok) return false; // unfunded/new account → no trustline
    const acct = (await res.json()) as {
      balances?: { asset_code?: string; asset_issuer?: string }[];
    };
    return (acct.balances ?? []).some(
      (b) =>
        b.asset_code === CONFIG.assetCode &&
        b.asset_issuer === CONFIG.assetIssuer,
    );
  } catch {
    return false;
  }
}

/**
 * Ensure the connected account trusts PUSDC, adding the trustline (one wallet
 * signature) if missing. The payer needs it to fund; the seller needs it to
 * receive payout — without it approve_release / auto_release traps on-chain.
 * Returns true if a trustline was added.
 */
export async function ensureTrustline(address: string): Promise<boolean> {
  if (IS_MOCK) return false;
  if (await hasTrustline(address)) return false;

  const { TransactionBuilder, BASE_FEE, Asset, Operation, rpc } = await import(
    "@stellar/stellar-sdk"
  );
  const server = new rpc.Server(CONFIG.rpcUrl);
  const asset = new Asset(CONFIG.assetCode, CONFIG.assetIssuer);
  const account = await server.getAccount(address);
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: CONFIG.networkPassphrase,
  })
    .addOperation(Operation.changeTrust({ asset }))
    .setTimeout(120)
    .build();

  const signed = await signXdr(tx.toXDR());
  const signedTx = TransactionBuilder.fromXDR(signed, CONFIG.networkPassphrase);
  const sent = await server.sendTransaction(signedTx);
  if (String(sent.status) === "ERROR") {
    throw new Error("Could not add the PUSDC trustline.");
  }
  let got = await server.getTransaction(sent.hash);
  const deadline = Date.now() + 30_000;
  while (String(got.status) === "NOT_FOUND" && Date.now() < deadline) {
    await sleep(2000);
    got = await server.getTransaction(sent.hash);
  }
  if (String(got.status) !== "SUCCESS") {
    throw new Error("PUSDC trustline did not confirm.");
  }
  return true;
}

export interface TxResult {
  hash: string;
  returnValue: unknown;
}

// arg descriptors → resolved to ScVal inside invoke (after SDK loads)
type Arg =
  | { t: "u64"; v: number | bigint }
  | { t: "i128"; v: string }
  | { t: "address"; v: string }
  | { t: "bytes"; hex: string }
  | { t: "void" };

const au64 = (v: number | bigint): Arg => ({ t: "u64", v });
const ai128 = (v: string): Arg => ({ t: "i128", v });
const aaddr = (v: string): Arg => ({ t: "address", v });
const abytes = (hex: string): Arg => ({ t: "bytes", hex });
const avoid = (): Arg => ({ t: "void" });

/** Build → simulate → sign (wallet) → submit → await result. */
async function invoke(
  caller: string,
  method: string,
  args: Arg[],
): Promise<TxResult> {
  const {
    Contract,
    TransactionBuilder,
    BASE_FEE,
    nativeToScVal,
    scValToNative,
    xdr,
    rpc,
  } = await import("@stellar/stellar-sdk");
  const { Buffer } = await import("buffer");

  const server = new rpc.Server(CONFIG.rpcUrl);
  const contract = new Contract(CONFIG.contractId);
  const NET = CONFIG.networkPassphrase;

  const toScVal = (a: Arg) => {
    switch (a.t) {
      case "u64":
        return nativeToScVal(BigInt(a.v), { type: "u64" });
      case "i128":
        return nativeToScVal(BigInt(a.v), { type: "i128" });
      case "address":
        return nativeToScVal(a.v, { type: "address" });
      case "bytes":
        return xdr.ScVal.scvBytes(Buffer.from(hexToBytes(a.hex)));
      case "void":
        return nativeToScVal(null);
    }
  };

  const account = await server.getAccount(caller);
  const built = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NET,
  })
    .addOperation(contract.call(method, ...args.map(toScVal)))
    .setTimeout(120)
    .build();

  const prepared = await server.prepareTransaction(built);
  const signedXdr = await signXdr(prepared.toXDR());
  const signedTx = TransactionBuilder.fromXDR(signedXdr, NET);

  const sent = await server.sendTransaction(signedTx);
  if (String(sent.status) === "ERROR") {
    throw new Error(`Transaction submission failed (${method}).`);
  }

  let got = await server.getTransaction(sent.hash);
  const deadline = Date.now() + 40_000;
  while (String(got.status) === "NOT_FOUND" && Date.now() < deadline) {
    await sleep(1500);
    got = await server.getTransaction(sent.hash);
  }
  if (String(got.status) !== "SUCCESS") {
    throw new Error(`Transaction did not confirm (${method}: ${got.status}).`);
  }
  const success = got as unknown as { returnValue?: unknown };
  const returnValue = success.returnValue
    ? scValToNative(success.returnValue as never)
    : undefined;
  return { hash: sent.hash, returnValue };
}

// ── Seller actions ────────────────────────────────────────────────────
/** Returns the new invoice id (from the contract return value). */
export async function createInvoice(input: {
  seller: string;
  amountRaw: string;
  reviewSecs: number;
  metadataHash: string;
}): Promise<number> {
  if (IS_MOCK) {
    await mockDelay();
    return mockActions.create(input);
  }
  const res = await invoke(input.seller, "create_invoice", [
    aaddr(input.seller),
    avoid(), // open link — no fixed payer
    aaddr(CONFIG.usdcSac),
    ai128(input.amountRaw),
    au64(input.reviewSecs),
    abytes(input.metadataHash),
  ]);
  return Number(res.returnValue);
}

export async function submitDelivery(input: {
  seller: string;
  invoiceId: number;
  deliveryHash: string;
  metadataHash: string;
}): Promise<TxResult> {
  if (IS_MOCK) {
    await mockDelay();
    mockActions.deliver(input.invoiceId, input.deliveryHash);
    return { hash: "mock", returnValue: undefined };
  }
  return invoke(input.seller, "submit_delivery", [
    au64(input.invoiceId),
    abytes(input.deliveryHash),
    abytes(input.metadataHash),
  ]);
}

// ── Client (payer) actions ────────────────────────────────────────────
export async function fundInvoice(input: {
  payer: string;
  invoiceId: number;
}): Promise<TxResult> {
  if (IS_MOCK) {
    await mockDelay();
    mockActions.fund(input.invoiceId, input.payer);
    return { hash: "mock", returnValue: undefined };
  }
  return invoke(input.payer, "fund_invoice", [
    au64(input.invoiceId),
    aaddr(input.payer),
  ]);
}

export async function approveRelease(input: {
  payer: string;
  invoiceId: number;
}): Promise<TxResult> {
  if (IS_MOCK) {
    await mockDelay();
    mockActions.approve(input.invoiceId);
    return { hash: "mock", returnValue: undefined };
  }
  return invoke(input.payer, "approve_release", [au64(input.invoiceId)]);
}

export async function clientHold(input: {
  payer: string;
  invoiceId: number;
}): Promise<TxResult> {
  if (IS_MOCK) {
    await mockDelay();
    mockActions.hold(input.invoiceId);
    return { hash: "mock", returnValue: undefined };
  }
  return invoke(input.payer, "client_hold", [au64(input.invoiceId)]);
}

/** Lift a hold and resume the review clock (+24h). Caller = payer or admin. */
export async function releaseHold(input: {
  caller: string;
  invoiceId: number;
}): Promise<TxResult> {
  if (IS_MOCK) {
    await mockDelay();
    mockActions.releaseHold(input.invoiceId);
    return { hash: "mock", returnValue: undefined };
  }
  return invoke(input.caller, "release_hold", [
    au64(input.invoiceId),
    aaddr(input.caller),
  ]);
}

/** Payer reclaims funds on a Funded invoice the seller never delivered. */
export async function refundUnstartedInvoice(input: {
  caller: string;
  invoiceId: number;
}): Promise<TxResult> {
  if (IS_MOCK) {
    await mockDelay();
    mockActions.refund(input.invoiceId);
    return { hash: "mock", returnValue: undefined };
  }
  return invoke(input.caller, "refund_unstarted_invoice", [
    au64(input.invoiceId),
    aaddr(input.caller),
  ]);
}
