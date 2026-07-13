// Static on-chain config. Values come from env (mirrors GET /api/config).
// Kept as constants so client components don't need a round-trip on load.

export const CONFIG = {
  contractId:
    process.env.NEXT_PUBLIC_CONTRACT_ID ??
    "CAUV2EQGYBVOWWIAKBPEHWB2RKSPOL2Q6PZZVREQ6DB4NXNDDABIXB4J",
  usdcSac:
    process.env.NEXT_PUBLIC_USDC_SAC ??
    "CAZ4QR7HTWIWYNFCDM2KYIC56HOFWJPKCUUU6AMNHA4TVRG24YZJSVF6",
  rpcUrl:
    process.env.NEXT_PUBLIC_RPC_URL ?? "https://soroban-testnet.stellar.org",
  networkPassphrase:
    process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE ??
    "Test SDF Network ; September 2015",
  feeBps: 100,
  assetSymbol: "PUSDC",
  // Classic asset behind the SAC — needed for change-trust (both parties must
  // trust PUSDC: the payer to fund, the seller to receive payout).
  assetCode: "PUSDC",
  assetIssuer: "GA3TMBYQQIVD5OWZQPA7AK3VRAXUNYRPF34UHC4MLAO722S3ZMYR3JC6",
  horizonUrl: "https://horizon-testnet.stellar.org",
} as const;

export const IS_MOCK = process.env.NEXT_PUBLIC_READ_SOURCE === "mock";

export const EXPLORER = {
  tx: (hash: string) =>
    `https://stellar.expert/explorer/testnet/tx/${hash}`,
  contract: (id: string) =>
    `https://stellar.expert/explorer/testnet/contract/${id}`,
  account: (addr: string) =>
    `https://stellar.expert/explorer/testnet/account/${addr}`,
};
