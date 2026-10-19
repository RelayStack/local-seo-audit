import { test } from "node:test";
import assert from "node:assert/strict";
import { audit } from "./audit.mjs";

const good = {
  url: "https://example.ch/",
  html: `<!doctype html><html lang="de"><head>
    <title>Sanitär Muster AG — Notdienst und Badsanierung in Musterstadt</title>
    <meta name="description" content="Sanitär- und Heizungsinstallation in Musterstadt. Notdienst an sieben Tagen, Festpreise vor Beginn der Arbeit, keine Zuschläge.">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="canonical" href="https://example.ch/">
    <meta property="og:image" content="https://example.ch/og.png">
    <script type="application/ld+json">{"@context":"https://schema.org","@type":"LocalBusiness",
      "address":{"@type":"PostalAddress","streetAddress":"Musterstrasse 1","postalCode":"4000","addressLocality":"Musterstadt"},
      "telephone":"+41610000000","openingHoursSpecification":[]}</script>
  </head><body>
    <h1>Sanitär in Musterstadt</h1>
    <address>Musterstrasse 1, 4000 Musterstadt</address>
    <a href="tel:+41610000000">+41 61 000 00 00</a>
    <a href="/kontakt/">Kontakt</a>
  </body></html>`,
  robots: "User-agent: *\nAllow: /\n\nSitemap: https://example.ch/sitemap.xml\n",
  sitemap: "<urlset><url><loc>https://example.ch/</loc></url></urlset>",
  llms: "# Muster\n",
};

const bad = {
  url: "http://example.ch/",
  html: "<html><body><h1>A</h1><h1>B</h1><div>2026 Deutschland</div></body></html>",
  robots: "User-agent: *\nDisallow: /\n",
  sitemap: "",
  llms: "",
};

const byId = (r) => Object.fromEntries(r.checks.map((c) => [c.id, c]));

test("a properly built local page has no failures", () => {
  const r = audit(good);
  assert.equal(r.summary.fail, 0, JSON.stringify(r.checks.filter((c) => c.status === "fail"), null, 2));
});

test("a bare page fails the checks that matter", () => {
  const c = byId(audit(bad));
  assert.equal(c.viewport.status, "fail");
  assert.equal(c.schema.status, "fail");
  assert.equal(c.h1.status, "warn", "two H1s is a warning, not a failure");
  assert.equal(c.https.status, "fail");
});

test("a number plus a capitalised word is not an address", () => {
  // Regression: the first version passed "2026 Deutschland" as a postcode.
  const c = byId(audit({ ...good, html: good.html.replace(/<address>.*?<\/address>/s, "").replace(/"address":\{.*?\}/s, "") }));
  assert.equal(c["postal-address"].status, "warn", "text alone must never count as a pass");
});

test("absent robots Disallow means allowed, not unknown", () => {
  const c = byId(audit({ ...good, robots: "User-agent: *\nAllow: /\n" }));
  assert.equal(c["robots-ai"].status, "pass");
  assert.equal(c["robots-all"].status, "pass");
});

test("a blanket Disallow and an AI-crawler Disallow are both failures", () => {
  const blanket = byId(audit({ ...good, robots: "User-agent: *\nDisallow: /\n" }));
  assert.equal(blanket["robots-all"].status, "fail");

  const ai = byId(audit({ ...good, robots: "User-agent: GPTBot\nDisallow: /\n\nUser-agent: *\nAllow: /\n" }));
  assert.equal(ai["robots-ai"].status, "fail");
  assert.equal(ai["robots-all"].status, "pass");
});

test("phone mismatch between the tel: link and the visible text is caught", () => {
  const c = byId(audit({ ...good, html: good.html.replace(">+41 61 000 00 00<", ">+41 44 999 99 99<") }));
  assert.equal(c["phone-consistency"].status, "warn");
});

test("the report always carries its own limits", () => {
  const r = audit(good);
  assert.equal(r.limits.length, 3);
  assert.ok(r.limits.some((l) => l.includes("JavaScript")));
});
