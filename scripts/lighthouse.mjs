// Lighthouse audit of the landing page against a local production server.
// Usage: pnpm build && pnpm lighthouse   (or pass a URL as argv[2])
import { spawn } from "node:child_process";
import lighthouse from "lighthouse";
import * as chromeLauncher from "chrome-launcher";

const PORT = 3410;
const url = process.argv[2] ?? `http://localhost:${PORT}/`;
const startServer = !process.argv[2];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitFor(u, tries = 40) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(u);
      if (r.ok) return true;
    } catch {
      /* not up yet */
    }
    await sleep(1000);
  }
  throw new Error(`server never came up at ${u}`);
}

let server;
if (startServer) {
  server = spawn("npx", ["next", "start", "-p", String(PORT)], {
    stdio: "ignore",
    env: process.env,
  });
  await waitFor(`http://localhost:${PORT}/`);
}

const chrome = await chromeLauncher.launch({
  chromeFlags: ["--headless=new", "--no-sandbox"],
});

try {
  const { lhr } = await lighthouse(
    url,
    { port: chrome.port, output: "json", logLevel: "error" },
    {
      extends: "lighthouse:default",
      settings: { onlyCategories: ["performance", "accessibility", "best-practices", "seo"] },
    },
  );

  const scores = Object.fromEntries(
    Object.entries(lhr.categories).map(([k, v]) => [k, Math.round(v.score * 100)]),
  );

  console.log("\nLighthouse scores for", url);
  console.table(scores);

  const floors = { performance: 70, accessibility: 90, "best-practices": 90, seo: 90 };
  const fails = Object.entries(floors).filter(([k, min]) => scores[k] < min);
  if (fails.length) {
    console.error(
      "\n⚠ Below target:",
      fails.map(([k, min]) => `${k} ${scores[k]}<${min}`).join(", "),
    );
  } else {
    console.log("\n✓ All categories meet their targets.");
  }
} finally {
  await chrome.kill();
  server?.kill();
}
