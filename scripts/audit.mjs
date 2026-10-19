#!/usr/bin/env node
/**
 * Local SEO audit — what a search engine and an AI assistant can actually read
 * from a page, and what they cannot.
 *
 *   node audit.mjs https://example.com [--json]
 *
 * Zero dependencies, Node 18+. Reads only public, server-rendered HTML plus
 * robots.txt, sitemap.xml and llms.txt.
 *
 * WHAT THIS IS NOT
 * - Not a ranking tool. Nothing here predicts position.
 * - Not a Google Business Profile check. That needs Places API access.
 * - It reads server-rendered HTML, so JSON-LD injected by JavaScript is recorded
 *   as absent. That understates; it never overstates.
 */
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

export const UA = "local-seo-audit/1.0 (+https://github.com/RelayStack/local-seo-audit)";
const TIMEOUT = 20_000;

/**
 * Runs every check against already-fetched material. Kept pure so it can be
 * tested without a network: `audit({ url, html, robots, sitemap, llms })`.
 */
export function audit({ url, html, robots = "", sitemap = "", llms = "" }) {
  const checks = [];
  const add = (id, group, label, status, detail) => checks.push({ id, group, label, status, detail });

  const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "").trim();
  const desc = html.match(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)/i)?.[1] ?? "";
  const h1s = html.match(/<h1[\s>]/gi) ?? [];
  const canonical = html.match(/<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']+)/i)?.[1] ?? null;
  const lang = html.match(/<html[^>]+lang=["']([^"']+)/i)?.[1] ?? null;

  /* structure */
  add("https", "Structure", "Served over HTTPS", url.startsWith("https://") ? "pass" : "fail", url);
  add("viewport", "Structure", "Mobile viewport declared",
    /<meta[^>]+name=["']viewport["']/i.test(html) ? "pass" : "fail",
    "Without this the page is unscaled on every phone.");
  add("title", "Structure", "Title present and a usable length",
    title.length === 0 ? "fail" : title.length < 20 || title.length > 65 ? "warn" : "pass",
    title ? `${title.length} characters` : "missing");
  add("description", "Structure", "Meta description present and a usable length",
    desc.length === 0 ? "fail" : desc.length < 50 || desc.length > 165 ? "warn" : "pass",
    desc ? `${desc.length} characters` : "missing");
  add("h1", "Structure", "Exactly one H1",
    h1s.length === 1 ? "pass" : h1s.length === 0 ? "fail" : "warn", `${h1s.length} found`);
  add("canonical", "Structure", "Canonical URL declared", canonical ? "pass" : "warn", canonical ?? "missing");
  add("lang", "Structure", "Page language declared", lang ? "pass" : "warn", lang ?? "missing");
  add("ogimage", "Structure", "Social preview image declared",
    /<meta[^>]+property=["']og:image["']/i.test(html) ? "pass" : "warn",
    "Without it every shared link renders blank.");

  /* machine-readable local facts */
  const blocks = [...html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
  const raw = blocks.join("\n");
  const types = [...new Set([...raw.matchAll(/"@type"\s*:\s*"([^"]+)"/g)].map((m) => m[1]))];
  const localType = types.find((t) =>
    /LocalBusiness|Organization|ProfessionalService|Store|Restaurant|Dentist|AutoRepair|Locksmith|Plumber|HVACBusiness/.test(t));

  add("schema", "Machine-readable", "Structured data present", blocks.length > 0 ? "pass" : "fail",
    blocks.length ? `${blocks.length} block(s): ${types.slice(0, 6).join(", ")}` : "no JSON-LD blocks");
  add("schema-local", "Machine-readable", "A business type is declared", localType ? "pass" : "fail",
    localType ?? "no LocalBusiness/Organization node — an assistant cannot tell what this business is");
  add("schema-address", "Machine-readable", "Address is machine-readable",
    /"address"\s*:/.test(raw) && /"streetAddress"|"addressLocality"/.test(raw) ? "pass" : "fail",
    /"address"\s*:/.test(raw) ? "address node present" : "no PostalAddress in the schema");
  add("schema-phone", "Machine-readable", "Telephone is machine-readable",
    /"telephone"\s*:/.test(raw) ? "pass" : "fail", /"telephone"\s*:/.test(raw) ? "present" : "no telephone in the schema");
  add("schema-hours", "Machine-readable", "Opening hours are machine-readable",
    /"openingHours(Specification)?"\s*:/.test(raw) ? "pass" : "warn",
    /"openingHours/.test(raw) ? "present" : "hours exist only as text, or not at all");
  add("schema-faq", "Machine-readable", "FAQ schema present", types.includes("FAQPage") ? "pass" : "warn",
    types.includes("FAQPage") ? "present" : "no FAQPage — the most quotable block a page can have");

  /* local signals in the visible page */
  const telLink = html.match(/href=["']tel:([^"']+)/i)?.[1] ?? null;
  add("tel-link", "Local signals", "Phone number is tappable", telLink ? "pass" : "warn",
    telLink ?? "no tel: link — a number that is only text costs mobile calls");

  const text = html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<[^>]+>/g, " ");
  const phoneDigits = (telLink ?? "").replace(/\D/g, "");
  const phoneInText = phoneDigits.length >= 7 && text.replace(/\D/g, "").includes(phoneDigits.slice(-7));
  add("phone-consistency", "Local signals", "Phone number matches between link and text",
    !telLink ? "na" : phoneInText ? "pass" : "warn",
    !telLink ? "no tel: link to compare" : phoneInText ? "consistent" : "the tel: link and the visible number differ");

  const hasAddressEl = /<address[\s>]/i.test(html);
  const hasPostalCode = /"postalCode"\s*:/.test(raw);
  add("postal-address", "Local signals", "A postal address is present and identifiable",
    hasAddressEl || hasPostalCode ? "pass" : "warn",
    hasAddressEl ? "an <address> element is present"
      : hasPostalCode ? "postalCode is in the structured data"
      : "neither an <address> element nor a postalCode — a text pattern alone proves nothing");

  const contact = [...html.matchAll(/href=["']([^"']*)["']/gi)].map((m) => m[1])
    .find((h) => /kontakt|contact|impressum|about/i.test(h));
  add("contact-link", "Local signals", "A contact or Impressum page is linked",
    contact ? "pass" : "warn", contact ?? "not found");

  /* discovery */
  const hasRobots = robots.trim().length > 0;
  const robotsSitemap = robots.match(/^sitemap:\s*(\S+)/im)?.[1] ?? null;
  const blocksAi = /user-agent:\s*(gptbot|ccbot|perplexitybot|claudebot|anthropic-ai|google-extended)[\s\S]{0,120}?disallow:\s*\/\s*$/im.test(robots);
  const blocksEveryone = /user-agent:\s*\*[\s\S]{0,60}?disallow:\s*\/\s*$/im.test(robots);

  add("robots", "Discovery", "robots.txt present", hasRobots ? "pass" : "warn",
    hasRobots ? `${robots.length} bytes` : "missing — crawlers fall back to permissive defaults");
  add("robots-sitemap", "Discovery", "robots.txt points at the sitemap",
    robotsSitemap ? "pass" : "warn", robotsSitemap ?? "no Sitemap: line");
  add("robots-ai", "Discovery", "AI crawlers are allowed", blocksAi ? "fail" : "pass",
    blocksAi ? "a major AI crawler is disallowed — that also removes the site from AI answers"
      : "no AI crawler is disallowed");
  add("robots-all", "Discovery", "Crawlers are allowed at all", blocksEveryone ? "fail" : "pass",
    blocksEveryone ? "`Disallow: /` for all agents — nothing will be indexed" : "not blocked");

  const sitemapUrls = (sitemap.match(/<loc>/g) ?? []).length;
  add("sitemap", "Discovery", "sitemap.xml present with URLs", sitemapUrls > 0 ? "pass" : "fail",
    sitemapUrls > 0 ? `${sitemapUrls} ${/<sitemapindex/i.test(sitemap) ? "sitemaps" : "URLs"}` : "missing or empty");
  add("llms", "Discovery", "llms.txt present", llms.trim().length > 0 ? "pass" : "warn",
    llms.trim().length > 0 ? "present" : "absent — optional, and it does nothing for Google; it only serves assistants");

  const summary = { pass: 0, warn: 0, fail: 0, na: 0 };
  for (const c of checks) summary[c.status] += 1;

  return {
    url,
    generated: new Date().toISOString(),
    summary,
    checks,
    limits: [
      "Reads server-rendered HTML only; JSON-LD injected by JavaScript is counted as absent.",
      "No Google Business Profile data: that needs Places API access.",
      "Nothing here predicts ranking position.",
    ],
  };
}

/* ------------------------------------------------------------------ CLI ---- */

async function get(url) {
  try {
    const res = await fetch(url, {
      headers: { "user-agent": UA, accept: "text/html,text/plain,*/*" },
      redirect: "follow",
      signal: AbortSignal.timeout(TIMEOUT),
    });
    return res.ok ? await res.text() : "";
  } catch {
    return "";
  }
}

export async function auditUrl(input) {
  const url = input.startsWith("http") ? input : `https://${input}`;
  const res = await fetch(url, {
    headers: { "user-agent": UA, accept: "text/html,text/plain,*/*" },
    redirect: "follow",
    signal: AbortSignal.timeout(TIMEOUT),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const html = await res.text();
  const origin = new URL(res.url).origin;
  const [robots, sitemap, llms] = await Promise.all([
    get(`${origin}/robots.txt`),
    get(`${origin}/sitemap.xml`),
    get(`${origin}/llms.txt`),
  ]);
  return audit({ url: res.url, html, robots, sitemap, llms });
}

const isCli = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isCli) {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: { json: { type: "boolean", default: false }, help: { type: "boolean", default: false } },
  });

  if (values.help || positionals.length === 0) {
    console.log(`Usage: node audit.mjs <url> [--json]

Audits what a crawler can read from a business website: structure,
machine-readable facts, local signals and discovery files.
Zero dependencies. Node 18+.`);
    process.exit(values.help ? 0 : 1);
  }

  let report;
  try {
    report = await auditUrl(positionals[0]);
  } catch (error) {
    console.error(String(error.message ?? error));
    process.exit(2);
  }

  if (values.json) {
    console.log(JSON.stringify(report, null, 2));
    process.exit(report.summary.fail > 0 ? 1 : 0);
  }

  const mark = { pass: "PASS", warn: "WARN", fail: "FAIL", na: "n/a " };
  let group = "";
  console.log(`\nLocal SEO audit — ${report.url}\n`);
  for (const c of report.checks) {
    if (c.group !== group) { group = c.group; console.log(`\n${group}`); }
    console.log(`  ${mark[c.status]}  ${c.label}`);
    if (c.detail) console.log(`        ${c.detail}`);
  }
  console.log(`\n${report.summary.pass} pass · ${report.summary.warn} warn · ${report.summary.fail} fail\n`);
  process.exit(report.summary.fail > 0 ? 1 : 0);
}
