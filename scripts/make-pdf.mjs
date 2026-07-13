import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";

const SHOTS = process.env.SHOTS_DIR;
const OUT = process.env.PDF_OUT;

const img = (name) =>
  `data:image/png;base64,${readFileSync(`${SHOTS}/${name}.png`).toString("base64")}`;

// crop helper via CSS: show only the top of very tall shots (landing)
const shot = (name, opts = {}) => `
  <figure class="shot${opts.tall ? " tall" : ""}">
    <div class="frame"><img src="${img(name)}" alt="${opts.alt ?? name}"/></div>
    ${opts.cap ? `<figcaption>${opts.cap}</figcaption>` : ""}
  </figure>`;

const html = `<!doctype html><html><head><meta charset="utf-8"/>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Jost:wght@400;500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet"/>
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  :root{
    --ink:#33302b; --dim:#615e56; --mute:#6a675e; --cream:#eae7dc; --cream2:#e1ddce;
    --panel:#f4f2ea; --sand:#d8c3a5; --terra:#c9402b; --stone:#7c7b77;
  }
  html,body{margin:0;padding:0;color:var(--ink);
    font-family:'Inter',-apple-system,system-ui,sans-serif;font-size:10.5pt;line-height:1.5;}
  .page{position:relative;width:210mm;min-height:297mm;padding:20mm 18mm;
    page-break-after:always;background:var(--cream);}
  .page:last-child{page-break-after:auto;}
  h1,h2,h3{font-family:'Jost',sans-serif;letter-spacing:-.01em;line-height:1.12;margin:0;}
  .mono{font-family:'JetBrains Mono',monospace;}
  .eyebrow{font-family:'JetBrains Mono',monospace;font-size:8pt;letter-spacing:.22em;
    text-transform:uppercase;color:var(--mute);}
  a{color:var(--terra);text-decoration:none;}

  /* cover */
  .cover{background:linear-gradient(160deg,#eae7dc,#e1ddce);display:flex;flex-direction:column;
    justify-content:space-between;}
  .wordmark{font-family:'Jost',sans-serif;font-weight:700;font-size:26pt;}
  .wordmark .l{color:var(--terra);}
  .cover h1{font-size:34pt;margin:6mm 0 4mm;}
  .cover .tag{font-size:13pt;color:var(--dim);max-width:150mm;}
  .cover .line{height:2px;background:var(--terra);width:40mm;margin:8mm 0;}
  .pill{display:inline-block;border:1px solid var(--sand);border-radius:999px;
    padding:2mm 4mm;font-family:'JetBrains Mono',monospace;font-size:8pt;color:var(--dim);margin:0 2mm 2mm 0;}

  .lead{font-size:12pt;color:var(--ink);}
  h2.sec{font-size:19pt;margin-bottom:4mm;padding-bottom:2mm;border-bottom:1px solid var(--sand);}
  h3{font-size:12pt;margin:6mm 0 2mm;}
  p{margin:0 0 3mm;}
  .grid2{display:grid;grid-template-columns:1fr 1fr;gap:5mm;}
  .card{background:var(--panel);border:1px solid #e3ddcd;border-radius:4mm;padding:5mm;}
  .card h3{margin-top:0;color:var(--terra);}
  ul{margin:0 0 3mm;padding-left:5mm;} li{margin-bottom:1.5mm;}
  .num{font-family:'JetBrains Mono',monospace;color:var(--terra);font-weight:700;}

  .shot{margin:0 0 6mm;}
  .frame{border:1px solid var(--sand);border-radius:3mm;overflow:hidden;
    box-shadow:0 2mm 6mm rgba(51,48,43,.08);}
  .shot img{width:100%;display:block;}
  .shot.tall .frame{max-height:120mm;overflow:hidden;}
  figcaption{font-size:8.5pt;color:var(--mute);margin-top:2mm;font-family:'JetBrains Mono',monospace;}

  .step{display:flex;gap:5mm;margin-bottom:5mm;align-items:flex-start;}
  .step .n{font-family:'Jost',sans-serif;font-weight:700;font-size:16pt;color:var(--terra);
    min-width:12mm;}
  .step h3{margin:0 0 1mm;}
  .foot{position:absolute;bottom:10mm;left:18mm;right:18mm;display:flex;justify-content:space-between;
    font-family:'JetBrains Mono',monospace;font-size:7.5pt;color:var(--mute);
    border-top:1px solid var(--sand);padding-top:2mm;}
  .kv{display:grid;grid-template-columns:auto 1fr;gap:2mm 5mm;font-size:10pt;}
  .kv .k{color:var(--mute);}
</style></head><body>

<!-- COVER -->
<section class="page cover">
  <div>
    <div class="wordmark">Pay<span class="l">lance</span></div>
    <div class="line"></div>
    <div class="eyebrow">Verifiable delivery escrow</div>
    <h1>Deliver the work.<br/>Prove it.<br/><span style="color:var(--terra)">Get paid</span> — automatically.</h1>
    <p class="tag">A neutral escrow for cross-border freelancers. The client funds the work
    up front; when you deliver, a fixed review window starts — and if the client
    ghosts, the smart contract pays you anyway.</p>
  </div>
  <div>
    <span class="pill">Non-custodial escrow</span>
    <span class="pill">Timeout auto-release</span>
    <span class="pill">On-chain proof</span>
    <span class="pill">Local cash-out</span>
    <span class="pill">Portable reputation</span>
    <div class="eyebrow" style="margin-top:6mm">Product overview · 2026 · paylance-stellar.vercel.app</div>
  </div>
</section>

<!-- WHAT IT IS -->
<section class="page">
  <div class="eyebrow">01 — What Paylance is</div>
  <h2 class="sec">Payment protection for off-platform freelance work</h2>
  <p class="lead">Southeast-Asian freelancers do great work for global clients, then
  depend on screenshots, chat reminders, and platform commissions to actually get paid.
  Paylance replaces that with a neutral, programmable payment flow.</p>

  <div class="grid2" style="margin-top:5mm">
    <div class="card"><h3>The freelancer's fear</h3>
      <p>You finish the work, hand it over, and the client goes quiet. There's no
      leverage to get paid — you just wait, and chase.</p></div>
    <div class="card"><h3>The client's fear</h3>
      <p>You don't want to pay before you can review the deliverable. Once the money's
      gone, there's no recourse if the work is wrong.</p></div>
  </div>

  <h3>The core idea</h3>
  <p>Traditional escrow protects the <strong>client</strong> (funds aren't released
  immediately) but can still fail the <strong>freelancer</strong> (the client may never
  approve). Paylance closes that gap with a <strong>deadline</strong>:</p>
  <ul>
    <li>The client funds a smart-contract escrow before work starts.</li>
    <li>The freelancer submits an on-chain proof of delivery.</li>
    <li>The client gets a fixed review window to approve or dispute.</li>
    <li><strong>Silence releases the payment automatically.</strong></li>
  </ul>
  <p style="font-family:'Jost';font-size:13pt;color:var(--terra);margin-top:4mm">
  “Escrow protects the client. The clock protects you.”</p>

  ${shot("landing", { tall: true, cap: "The Paylance landing experience — paylance-stellar.vercel.app" })}
  <div class="foot"><span>Paylance — Product Overview</span><span>01</span></div>
</section>

<!-- WHO / WHY -->
<section class="page">
  <div class="eyebrow">02 — Who it's for & why it's safe</div>
  <h2 class="sec">Built for people who already have clients</h2>
  <div class="grid2">
    <div>
      <h3>Primary users</h3>
      <ul>
        <li>Freelance developers, designers, editors, translators</li>
        <li>Copywriters, VAs, content creators, consultants</li>
        <li>Small digital agencies &amp; micro-SMEs</li>
      </ul>
      <p>Paylance isn't a marketplace — it's for freelancers who <em>already</em> have
      clients (via WhatsApp, Telegram, Discord, LinkedIn) and just need a safer way to
      settle payment.</p>
    </div>
    <div>
      <h3>Why blockchain is necessary</h3>
      <p>A normal app can record that an invoice is "funded", but the platform still
      controls the money. With a smart contract:</p>
      <ul>
        <li>Funds are locked by code — the platform can't seize or secretly release them.</li>
        <li>Auto-release after the deadline is enforced by the contract, not a company.</li>
        <li>Delivery and approval are verifiable and tamper-proof.</li>
      </ul>
    </div>
  </div>

  <h3>Four guarantees</h3>
  <div class="grid2">
    <div class="card"><h3>Non-custodial escrow</h3><p>Money lives in the contract. Nobody
      holds your keys or your funds.</p></div>
    <div class="card"><h3>Timeout auto-release</h3><p>A fixed review window means a client
      can't stall you forever. Silence pays you.</p></div>
    <div class="card"><h3>Tamper-proof delivery</h3><p>Every delivery is timestamped and
      hashed on-chain — an audit trail no one can edit.</p></div>
    <div class="card"><h3>Local cash-out</h3><p>Withdraw to IDR or PHP through a licensed
      anchor, without leaving the app.</p></div>
  </div>
  <div class="foot"><span>Paylance — Product Overview</span><span>02</span></div>
</section>

<!-- USER FLOW 1 -->
<section class="page">
  <div class="eyebrow">03 — How it works</div>
  <h2 class="sec">The freelancer creates an invoice</h2>
  <div class="step"><div class="n">1</div><div>
    <h3>Open the dashboard</h3>
    <p>Connect a wallet and see every invoice tied to your address — active escrows,
    pending reviews, released payments, and your reputation tier. Nothing about you is
    stored on a server.</p></div></div>
  ${shot("dashboard", { cap: "Freelancer dashboard — invoices + reputation, derived from on-chain state" })}

  <div class="step"><div class="n">2</div><div>
    <h3>Create an invoice &amp; share the link</h3>
    <p>Set the scope, amount, and review window. Paylance generates a shareable pay
    link to send your client — no account needed on their side beyond a wallet.</p></div></div>
  ${shot("create", { cap: "Create-invoice form — amount in PUSDC, configurable review window" })}
  <div class="foot"><span>Paylance — Product Overview</span><span>03</span></div>
</section>

<!-- USER FLOW 2 -->
<section class="page">
  <h2 class="sec">The client funds the escrow</h2>
  <div class="step"><div class="n">3</div><div>
    <h3>The client opens the pay link</h3>
    <p>They see the project, the amount, and a clear explanation that the payment is held
    in a smart-contract escrow — not by Paylance — and released only after a review
    window once work is delivered. One click funds it.</p></div></div>
  ${shot("pay", { cap: "Client pay page — shareable link, no login required to view" })}

  <div class="step"><div class="n">4</div><div>
    <h3>Deliver, then the clock runs</h3>
    <p>The freelancer submits the deliverable; only its hash goes on-chain. A countdown
    begins. The client can approve instantly, place a hold, or do nothing — in which case
    the contract auto-releases at zero.</p></div></div>
  <div class="foot"><span>Paylance — Product Overview</span><span>04</span></div>
</section>

<!-- USER FLOW 3 -->
<section class="page">
  <h2 class="sec">Payment releases — automatically</h2>
  <div class="step"><div class="n">5</div><div>
    <h3>Get paid &amp; cash out</h3>
    <p>On approval — or when the client ghosts and the window expires — the contract pays
    the freelancer (minus a 1% fee) and records every step on-chain. The freelancer can
    then cash out to local currency through a licensed anchor.</p></div></div>
  ${shot("detail", { cap: "Invoice detail — the release ring, on-chain activity, and cash-out" })}
  <p>Every event links to a public block explorer — the “why blockchain” proof, visible
  to both sides.</p>
  <div class="foot"><span>Paylance — Product Overview</span><span>05</span></div>
</section>

<!-- REPUTATION + BUSINESS -->
<section class="page">
  <div class="eyebrow">04 — Reputation &amp; business</div>
  <h2 class="sec">Every settled invoice builds portable reputation</h2>
  <p>Completed invoices, paid volume, on-time rate, and dispute rate form a reusable
  work profile that isn't locked inside any single platform. Higher tiers unlock real
  benefits — lower escrow fees and faster release.</p>
  ${shot("reputation", { cap: "Public reputation profile — tiers unlock lower fees & faster release" })}

  <h3>Business model</h3>
  <div class="kv">
    <div class="k">Transaction fee</div><div>0.5%–1.0% per successfully settled invoice</div>
    <div class="k">Example</div><div class="mono">300 PUSDC invoice → 3 PUSDC fee → freelancer receives 297</div>
    <div class="k">Premium (roadmap)</div><div>Branded invoice pages, custom domains, reminders, analytics</div>
    <div class="k">Agency (roadmap)</div><div>Team members, shared client dashboard, reporting</div>
    <div class="k">Anchor share (roadmap)</div><div>Revenue share from compliant local cash-out partners</div>
  </div>
  <div class="foot"><span>Paylance — Product Overview</span><span>06</span></div>
</section>

</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent(html, { waitUntil: "networkidle" });
await page.emulateMedia({ media: "print" });
await page.pdf({
  path: OUT,
  format: "A4",
  printBackground: true,
  preferCSSPageSize: true,
});
await browser.close();
console.log("PDF →", OUT);
