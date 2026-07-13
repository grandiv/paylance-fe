import { defineConfig, devices } from "@playwright/test";

// e2e runs against a production build in MOCK mode — deterministic, offline,
// no wallet or backend needed. Covers desktop + mobile viewports.
const PORT = 3400;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 1,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
    // run with reduced motion so scroll/reveal animations don't cause
    // mid-fade timing flakiness in assertions or the axe scan.
    reducedMotion: "reduce",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    // Pixel 5 is Chromium-based → no separate webkit download needed
    { name: "mobile", use: { ...devices["Pixel 5"] } },
  ],
  // NEXT_PUBLIC_* is inlined at build, so build in mock mode then serve the
  // production bundle — no on-demand compile latency → deterministic tests.
  webServer: {
    command: `NEXT_PUBLIC_READ_SOURCE=mock npx next build && NEXT_PUBLIC_READ_SOURCE=mock npx next start -p ${PORT}`,
    port: PORT,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
  },
});
