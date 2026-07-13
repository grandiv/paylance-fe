import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Runs in mock mode (offline). The wallet auto-connects the seller persona,
// so seller flows work without a real wallet.

test("landing renders the hero and CTAs", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    /Deliver the work/i,
  );
  await expect(
    page.getByRole("link", { name: /Create an invoice/i }).first(),
  ).toBeVisible();
});

test("no horizontal scroll (landing)", async ({ page }) => {
  await page.goto("/");
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});

test("dashboard lists seeded invoices", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(
    page.getByRole("heading", { name: "Your invoices", exact: true }),
  ).toBeVisible();
  // wallet auto-connects in mock mode → seeded invoices (INV- ids) appear
  await expect(page.getByText(/INV-00/).first()).toBeVisible({ timeout: 15_000 });
});

test("invoice detail shows status and timeline", async ({ page }) => {
  await page.goto("/invoices/1");
  await expect(page.getByText(/On-chain activity/i)).toBeVisible();
  // invoice 1 is auto-released in the seed
  await expect(page.getByText(/Auto-released/i).first()).toBeVisible();
});

test("create invoice flow lands on the new invoice", async ({ page }) => {
  await page.goto("/invoices/new");
  await page.getByPlaceholder("Branding design package").fill("Test project");
  await page.getByPlaceholder("300").fill("250");
  await page.getByRole("button", { name: /Create invoice/i }).click();
  // routed to /invoices/<id> (allow for dev on-demand compile under load)
  await page.waitForURL(/\/invoices\/\d+$/, { timeout: 30_000 });
  await expect(page.getByText(/Test project/i)).toBeVisible();
});

test("client pay page shows amount and fund CTA", async ({ page }) => {
  await page.goto("/pay/3"); // seeded Unfunded invoice
  await expect(page.getByText(/Amount/i).first()).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Fund .* escrow|Connect wallet/i }),
  ).toBeVisible();
});

test("payer sees refund option on a funded invoice", async ({ page }) => {
  // invoice 4 is seeded Funded (awaiting delivery). As the client persona,
  // the payer can reclaim funds → "Request refund" is offered.
  await page.goto("/invoices/4");
  await page.getByRole("button", { name: /Daniel \(client\)/i }).click();
  await expect(
    page.getByRole("button", { name: /Request refund/i }),
  ).toBeVisible({ timeout: 15_000 });
});

test("unknown route renders branded 404", async ({ page }) => {
  const res = await page.goto("/does-not-exist");
  expect(res?.status()).toBe(404);
  await expect(page.getByText("404")).toBeVisible();
});

test("landing has no serious accessibility violations", async ({ page }) => {
  // config runs with reducedMotion → reveal-on-scroll renders static/settled.
  await page.goto("/");
  await page.waitForTimeout(400);
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  const serious = results.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  expect(serious).toEqual([]);
});
