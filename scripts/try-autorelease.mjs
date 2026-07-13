// One-off: call the permissionless auto_release on an invoice from a fresh
// Friendbot account. Isolates "contract works" vs "keeper submission broken".
//   node scripts/try-autorelease.mjs <invoiceId>
import {
  Keypair, TransactionBuilder, Contract, BASE_FEE, Networks,
  nativeToScVal, scValToNative, rpc,
} from "@stellar/stellar-sdk";

const id = BigInt(process.argv[2] ?? "6");
const RPC = "https://soroban-testnet.stellar.org";
const server = new rpc.Server(RPC);
const NET = Networks.TESTNET;
const config = await (await fetch("https://paylance.fabian.web.id/api/config")).json();
const contract = new Contract(config.contractId);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const kp = Keypair.random();
console.log("caller", kp.publicKey());
await fetch(`https://friendbot.stellar.org?addr=${kp.publicKey()}`);
await sleep(4000);

const acct = await server.getAccount(kp.publicKey());
const tx = new TransactionBuilder(acct, { fee: BASE_FEE, networkPassphrase: NET })
  .addOperation(contract.call("auto_release", nativeToScVal(id, { type: "u64" })))
  .setTimeout(60)
  .build();
try {
  const prepared = await server.prepareTransaction(tx);
  prepared.sign(kp);
  const sent = await server.sendTransaction(prepared);
  console.log("submit status:", sent.status);
  let got = await server.getTransaction(sent.hash);
  const deadline = Date.now() + 45000;
  while (String(got.status) === "NOT_FOUND" && Date.now() < deadline) {
    await sleep(2000);
    got = await server.getTransaction(sent.hash);
  }
  console.log("result:", got.status, "tx:", sent.hash);
  if (String(got.status) === "SUCCESS") console.log("✓ auto_release succeeded — CONTRACT is fine, keeper submission is the issue");
} catch (e) {
  console.log("✗ auto_release failed:", e.message);
}
