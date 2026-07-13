// Real integration test — NO mocks. Exercises the live backend + deployed
// Soroban contract on testnet.
//
//   node scripts/integration.mjs
//
// Always runs:
//   1. backend reads (config, seeded invoice 1, reputation)
//   2. a REAL create_invoice write: fresh Friendbot-funded seller → contract →
//      poll the backend until the indexer reflects the new invoice.
//
// Optional (needs a PUSDC-funded payer secret, e.g. from scripts/seed-demo.sh):
//   PAYER_SECRET=S... node scripts/integration.mjs
//   → also funds + delivers + verifies auto-release on the new invoice.

import {
  Keypair,
  TransactionBuilder,
  Contract,
  Asset,
  Operation,
  BASE_FEE,
  Networks,
  nativeToScVal,
  scValToNative,
  xdr,
  rpc,
} from "@stellar/stellar-sdk";
import { Buffer } from "node:buffer";

// PUSDC classic asset (the SAC wraps this) — both parties need a trustline:
// the payer to fund, the seller to receive the payout.
const PUSDC = new Asset(
  "PUSDC",
  "GA3TMBYQQIVD5OWZQPA7AK3VRAXUNYRPF34UHC4MLAO722S3ZMYR3JC6",
);

const BACKEND = process.env.BACKEND_URL ?? "https://paylance.fabian.web.id";
const RPC_URL = "https://soroban-testnet.stellar.org";
const NET = Networks.TESTNET;
const server = new rpc.Server(RPC_URL);

let pass = 0;
let fail = 0;
const ok = (m) => (console.log(`  ✓ ${m}`), pass++);
const bad = (m) => (console.error(`  ✗ ${m}`), fail++);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJson(path) {
  const res = await fetch(`${BACKEND}${path}`);
  if (!res.ok) throw new Error(`${path} → ${res.status}`);
  return res.json();
}

// ── 1. backend reads ──────────────────────────────────────────────────
console.log("\n[1] Live backend reads");
const config = await getJson("/api/config");
config.contractId?.startsWith("C")
  ? ok(`config.contractId ${config.contractId.slice(0, 8)}…`)
  : bad("config.contractId missing");
config.feeBps === 100 ? ok("feeBps = 100") : bad(`feeBps = ${config.feeBps}`);

const inv1 = await getJson("/api/invoices/1");
inv1.status === "Released" && inv1.releasedVia === "auto"
  ? ok("invoice 1 is auto-released (seed intact)")
  : bad(`invoice 1 status=${inv1.status} via=${inv1.releasedVia}`);
Array.isArray(inv1.events) && inv1.events.length > 0
  ? ok(`invoice 1 has ${inv1.events.length} on-chain events`)
  : bad("invoice 1 has no events");

const rep = await getJson(`/api/reputation/${inv1.seller}`);
typeof rep.tier === "string"
  ? ok(`reputation tier = ${rep.tier}, completed = ${rep.completed}`)
  : bad("reputation missing");

// ── 2. on-chain read via RPC (cross-check backend vs contract) ─────────
console.log("\n[2] On-chain read via RPC");
const seller = Keypair.random();
console.log(`  seller ${seller.publicKey()}`);
const fb = await fetch(
  `https://friendbot.stellar.org?addr=${seller.publicKey()}`,
);
fb.ok ? ok("seller funded via Friendbot") : bad("Friendbot funding failed");
await sleep(4000);

// seller must trust PUSDC to receive the payout (else auto_release traps)
await establishTrustline(seller);
ok("seller PUSDC trustline established");

const contract = new Contract(config.contractId);

async function simRead(method, ...args) {
  const acct = await server.getAccount(seller.publicKey());
  const tx = new TransactionBuilder(acct, { fee: BASE_FEE, networkPassphrase: NET })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build();
  const sim = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) throw new Error(sim.error);
  return scValToNative(sim.result.retval);
}

const onchain1 = await simRead("get_invoice", nativeToScVal(1n, { type: "u64" }));
String(onchain1.status) === "Released" && String(onchain1.amount) === inv1.amount
  ? ok("contract get_invoice(1) matches backend (status + amount)")
  : bad(`on-chain mismatch: ${JSON.stringify(onchain1.status)} ${onchain1.amount}`);

// ── 3. REAL create_invoice write → indexer → backend ──────────────────
console.log("\n[3] Real create_invoice write");
const meta = await fetch(`${BACKEND}/api/invoices/meta`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    title: "Integration test invoice",
    description: "created by scripts/integration.mjs",
    currencyDisplay: "PUSDC",
  }),
}).then((r) => r.json());
meta.metadataHash?.length === 64
  ? ok(`meta stored, hash ${meta.metadataHash.slice(0, 12)}…`)
  : bad("meta hash missing");

const amount = "1500000000"; // 150 PUSDC
const bytesArg = xdr.ScVal.scvBytes(Buffer.from(meta.metadataHash, "hex"));
const createArgs = [
  nativeToScVal(seller.publicKey(), { type: "address" }),
  nativeToScVal(null),
  nativeToScVal(config.usdcSac, { type: "address" }),
  nativeToScVal(BigInt(amount), { type: "i128" }),
  nativeToScVal(120n, { type: "u64" }),
  bytesArg,
];

const newId = Number(await invoke(seller, "create_invoice", createArgs)); // u64 → BigInt
Number.isInteger(newId) && newId > 1
  ? ok(`create_invoice returned id ${newId}`)
  : bad(`unexpected invoice id ${newId}`);

// poll backend until indexer reflects it
console.log("  waiting for indexer…");
let indexed = null;
for (let i = 0; i < 30; i++) {
  await sleep(3000);
  try {
    indexed = await getJson(`/api/invoices/${newId}`);
    if (indexed?.id === newId) break;
  } catch {
    /* not indexed yet (404 until the indexer catches up) */
  }
}
indexed?.id === newId && indexed.status === "Unfunded" && indexed.amount === amount
  ? ok(`indexer reflected invoice ${newId} (Unfunded, ${amount})`)
  : bad(`indexer did not reflect invoice ${newId} in time`);

// ── 4. optional fund → deliver → auto-release (needs PUSDC payer) ──────
if (process.env.PAYER_SECRET) {
  console.log("\n[4] Full fund → deliver → auto-release (PAYER_SECRET set)");
  const payer = Keypair.fromSecret(process.env.PAYER_SECRET);
  console.log(`  payer ${payer.publicKey()}`);
  try {
    await invoke(payer, "fund_invoice", [
      nativeToScVal(BigInt(newId), { type: "u64" }),
      nativeToScVal(payer.publicKey(), { type: "address" }),
    ]);
    ok("fund_invoice submitted");

    const dhash = xdr.ScVal.scvBytes(Buffer.from("11".repeat(32), "hex"));
    await invoke(seller, "submit_delivery", [
      nativeToScVal(BigInt(newId), { type: "u64" }),
      dhash,
      bytesArg,
    ]);
    ok("submit_delivery submitted — 120s review window started");

    console.log("  waiting out the 120s window, then poking the keeper via fast-forward…");
    let released = null;
    for (let i = 0; i < 40; i++) {
      await sleep(6000);
      // dev fast-forward triggers an immediate keeper check (no-op before the
      // deadline → {checked:false}; fires auto_release once past it).
      try {
        await fetch(`${BACKEND}/api/dev/fast-forward/${newId}`, { method: "POST" });
      } catch {
        /* dev route may be disabled; keeper still runs on its own poll */
      }
      released = await getJson(`/api/invoices/${newId}`);
      if (released.status === "Released") break;
    }
    released?.status === "Released" && released.releasedVia === "auto"
      ? ok(`invoice ${newId} auto-released on-chain by the keeper`)
      : bad(`invoice ${newId} not auto-released (status=${released?.status})`);
  } catch (e) {
    bad(`full flow failed: ${e.message}`);
  }
} else {
  console.log(
    "\n[4] Skipped full fund→release (set PAYER_SECRET to a PUSDC-funded payer to run it).",
  );
}

console.log(`\n${fail === 0 ? "✓" : "✗"} integration: ${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);

// ── helper: classic changeTrust to PUSDC ──────────────────────────────
async function establishTrustline(kp) {
  const acct = await server.getAccount(kp.publicKey());
  const tx = new TransactionBuilder(acct, { fee: BASE_FEE, networkPassphrase: NET })
    .addOperation(Operation.changeTrust({ asset: PUSDC }))
    .setTimeout(60)
    .build();
  tx.sign(kp);
  const sent = await server.sendTransaction(tx);
  let got = await server.getTransaction(sent.hash);
  const deadline = Date.now() + 30000;
  while (String(got.status) === "NOT_FOUND" && Date.now() < deadline) {
    await sleep(2000);
    got = await server.getTransaction(sent.hash);
  }
  if (String(got.status) !== "SUCCESS")
    throw new Error(`changeTrust did not confirm: ${got.status}`);
}

// ── helper: build → prepare → sign → submit → await ───────────────────
async function invoke(kp, method, args) {
  const acct = await server.getAccount(kp.publicKey());
  const tx = new TransactionBuilder(acct, { fee: BASE_FEE, networkPassphrase: NET })
    .addOperation(contract.call(method, ...args))
    .setTimeout(60)
    .build();
  const prepared = await server.prepareTransaction(tx);
  prepared.sign(kp);
  const sent = await server.sendTransaction(prepared);
  if (String(sent.status) === "ERROR")
    throw new Error(`${method} submit error: ${JSON.stringify(sent.errorResult)}`);
  let got = await server.getTransaction(sent.hash);
  const deadline = Date.now() + 45000;
  while (String(got.status) === "NOT_FOUND" && Date.now() < deadline) {
    await sleep(2000);
    got = await server.getTransaction(sent.hash);
  }
  if (String(got.status) !== "SUCCESS")
    throw new Error(`${method} did not confirm: ${got.status}`);
  return got.returnValue ? scValToNative(got.returnValue) : undefined;
}
