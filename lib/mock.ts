import type {
  InvoiceDetail,
  InvoiceSummary,
  ReputationProfile,
} from "./types";

// Offline demo data — used when NEXT_PUBLIC_READ_SOURCE=mock so the pitch
// never depends on the network. Shapes match the live API exactly.

export const MOCK_SELLER =
  "GDKCE7DZGA7SELEI6UMDGG2N3O2JM3LLPQDHGB3JWULD42QWVHNAQYOI";
export const MOCK_PAYER =
  "GCZKI3KJH6PPQKKJP4PPZ265JD6I5AOMMJMHDQ2YHXJ6N6HO5LKBR7A6";
const SELLER = MOCK_SELLER;
const PAYER = MOCK_PAYER;
const ASSET = "CAZ4QR7HTWIWYNFCDM2KYIC56HOFWJPKCUUU6AMNHA4TVRG24YZJSVF6";

const now = Math.floor(Date.now() / 1000);

export const MOCK_SUMMARIES: InvoiceSummary[] = [
  {
    id: 1,
    seller: SELLER,
    payer: PAYER,
    asset: ASSET,
    amount: "3000000000", // 300 PUSDC
    feeBps: 100,
    reviewSecs: 120,
    status: "Released",
    hold: false,
    createdAt: now - 600,
    fundedAt: now - 560,
    deliveredAt: now - 520,
    reviewDeadline: now - 400,
    releasedAt: now - 380,
    deliveryHash: "1111111111111111111111111111111111111111111111111111111111111111",
    metadataHash: "0000000000000000000000000000000000000000000000000000000000000000",
    releasedVia: "auto",
  },
  {
    id: 2,
    seller: SELLER,
    payer: PAYER,
    asset: ASSET,
    amount: "1500000000", // 150 PUSDC
    feeBps: 100,
    reviewSecs: 120,
    status: "Delivered",
    hold: false,
    createdAt: now - 200,
    fundedAt: now - 160,
    deliveredAt: now - 90,
    reviewDeadline: now + 60, // live countdown
    releasedAt: null,
    deliveryHash: "2222222222222222222222222222222222222222222222222222222222222222",
    metadataHash: "0000000000000000000000000000000000000000000000000000000000000000",
    releasedVia: null,
  },
  {
    id: 3,
    seller: SELLER,
    payer: null,
    asset: ASSET,
    amount: "5000000000", // 500 PUSDC
    feeBps: 100,
    reviewSecs: 259200,
    status: "Unfunded",
    hold: false,
    createdAt: now - 40,
    fundedAt: null,
    deliveredAt: null,
    reviewDeadline: null,
    releasedAt: null,
    deliveryHash: null,
    metadataHash: "0000000000000000000000000000000000000000000000000000000000000000",
    releasedVia: null,
  },
  {
    id: 4,
    seller: SELLER,
    payer: PAYER,
    asset: ASSET,
    amount: "2000000000", // 200 PUSDC
    feeBps: 100,
    reviewSecs: 259200,
    status: "Funded", // client funded, awaiting delivery → refundable
    hold: false,
    createdAt: now - 300,
    fundedAt: now - 280,
    deliveredAt: null,
    reviewDeadline: null,
    releasedAt: null,
    deliveryHash: null,
    metadataHash: "0000000000000000000000000000000000000000000000000000000000000000",
    releasedVia: null,
  },
];

const META: Record<number, InvoiceDetail["meta"]> = {
  1: {
    metadataHash: "0000000000000000000000000000000000000000000000000000000000000000",
    title: "Branding Design Package",
    description: "Logo, visual guideline, and social media mockups.",
    clientEmail: "daniel@example.com",
    currencyDisplay: "PUSDC",
    lineItems: [],
  },
  2: {
    metadataHash: "0000000000000000000000000000000000000000000000000000000000000000",
    title: "Landing Page in Next.js",
    description: "Responsive marketing landing with animation.",
    clientEmail: "daniel@example.com",
    currencyDisplay: "PUSDC",
    lineItems: [],
  },
  3: {
    metadataHash: "0000000000000000000000000000000000000000000000000000000000000000",
    title: "Explainer Video Edit",
    description: "90-second product explainer, 2 revisions.",
    clientEmail: null,
    currencyDisplay: "PUSDC",
    lineItems: [],
  },
  4: {
    metadataHash: "0000000000000000000000000000000000000000000000000000000000000000",
    title: "API Integration Work",
    description: "REST integration + docs. Funded, awaiting delivery.",
    clientEmail: "daniel@example.com",
    currencyDisplay: "PUSDC",
    lineItems: [],
  },
};

export const MOCK_DETAILS: Record<number, InvoiceDetail> = Object.fromEntries(
  MOCK_SUMMARIES.map((s) => [
    s.id,
    {
      ...s,
      meta: META[s.id] ?? null,
      delivery: s.deliveryHash
        ? {
            deliveryHash: s.deliveryHash,
            deliveryUrl: "https://example.com/final-delivery.zip",
            deliveryNote:
              "Final files and a short walkthrough are included in the archive.",
            fileName: "final-delivery.zip",
            submittedAt: s.deliveredAt,
          }
        : null,
      events: [
        { id: 1, invoiceId: s.id, type: "invoice_created", ledger: 100, txHash: "abc123", payload: {}, ts: s.createdAt },
        ...(s.fundedAt ? [{ id: 2, invoiceId: s.id, type: "invoice_funded", ledger: 101, txHash: "def456", payload: {}, ts: s.fundedAt }] : []),
        ...(s.deliveredAt ? [{ id: 3, invoiceId: s.id, type: "delivery_submitted", ledger: 102, txHash: "ghi789", payload: {}, ts: s.deliveredAt }] : []),
        ...(s.releasedAt ? [{ id: 4, invoiceId: s.id, type: s.releasedVia === "auto" ? "invoice_auto_released" : "invoice_released", ledger: 103, txHash: "jkl012", payload: {}, ts: s.releasedAt }] : []),
      ],
    },
  ]),
);

export const MOCK_REPUTATION: ReputationProfile = {
  seller: SELLER,
  completed: 12,
  paidVolume: "124500000000",
  onTime: 11,
  disputes: 0,
  refunds: 1,
  tier: "Elite",
  feeDiscountBps: 25,
};
