import { chromium } from "@playwright/test";

const BASE = "http://localhost:3300";
const OUT = process.env.SHOTS_DIR;
const SELLER = "GDKCE7DZGA7SELEI6UMDGG2N3O2JM3LLPQDHGB3JWULD42QWVHNAQYOI";

const shots = [
  { name: "landing", path: "/", wait: 2500 },
  { name: "dashboard", path: "/dashboard", wait: 1500 },
  { name: "create", path: "/invoices/new", wait: 1200 },
  { name: "pay", path: "/pay/3", wait: 1500 },
  { name: "detail", path: "/invoices/1", wait: 1800 },
  { name: "reputation", path: `/reputation/${SELLER}`, wait: 1500 },
];

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  deviceScaleFactor: 2,
  reducedMotion: "reduce",
});
const page = await ctx.newPage();

const hideDevOverlay =
  "nextjs-portal,[data-nextjs-toast],#__next-build-watcher,#demo-bar{display:none!important}";

for (const s of shots) {
  await page.goto(BASE + s.path, { waitUntil: "networkidle" });
  await page.addStyleTag({ content: hideDevOverlay });
  await page.waitForTimeout(s.wait);
  await page.screenshot({ path: `${OUT}/${s.name}.png`, fullPage: true });
  console.log("shot", s.name);
}

await browser.close();
console.log("done");
