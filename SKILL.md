---
name: local-seo-audit
description: "Audit a local business website for what search engines and AI assistants can actually read: LocalBusiness schema, NAP consistency, opening hours, contact paths, sitemap, robots.txt and llms.txt. Reports failures with evidence and a fix order. Triggers on: local seo audit, local seo, local visibility, nap consistency, localbusiness schema, google business profile, opening hours schema, local seo check, ki sichtbarkeit, sichtbarkeit prüfen."
license: MIT
metadata:
  version: "0.1.0"
  category: seo
---

# Local SEO audit

Zero-dependency Node 18+ script in `scripts/`. Reads a URL and reports what a
crawler can actually read from it. No installs, no API keys.

## Run it

```bash
node scripts/audit.mjs https://example.ch          # human summary, exit 1 on any failure
node scripts/audit.mjs https://example.ch --json   # machine-readable, for triage
```

From this skill's directory. `--json` also exits non-zero on failures, so it
drops into CI.

## What it checks

| Group | Checks |
| --- | --- |
| **Structure** | HTTPS, viewport, title, meta description, single H1, canonical, lang, og:image |
| **Machine-readable** | JSON-LD present, business type declared, address, telephone, opening hours, FAQPage |
| **Local signals** | tappable phone number, phone consistent between link and text, identifiable postal address, contact/Impressum link |
| **Discovery** | robots.txt, sitemap reference, AI crawlers allowed, sitemap.xml, llms.txt |

21 checks. Each returns `pass`, `warn`, `fail` or `n/a` with a one-line detail
that says what was found.

## How to use the result

1. **Run it on the real URL first**, not a staging one. Redirects and the final
   hostname are part of what you are auditing.
2. **Read the four groups in order.** Structure before machine-readable before
   local before discovery — a page with no viewport will not be rescued by good
   schema.
3. **Report the failures with their evidence**, never as a score. There is no
   score here on purpose: a number invites false precision and invites the client
   to argue about the number instead of fixing the problem.
4. **Say what the check cannot see.** See Ground rules below — a `fail` on
   schema may mean "injected by JavaScript", not "missing".
5. For each failure, the fix and the reason are in `references/audit.md`. Load it
   when you need to explain *why* a check matters, not for every run.

## Ground rules

- **This reads server-rendered HTML.** A site that injects JSON-LD with
  JavaScript is reported as having none. That is a false negative, and you must
  say so rather than telling the owner their schema is missing.
- **No ranking claims.** Nothing here predicts position. Say "this is unreadable
  to a crawler", never "this will improve your ranking".
- **No Google Business Profile.** That needs the Places API. If the profile is the
  real problem, this audit will not see it — say that plainly.
- **`llms.txt` does nothing for Google.** It serves assistants. Do not present it
  as a ranking lever when reporting.
- **The address check is deliberately strict.** A postcode-shaped number next to a
  capitalised word is not proof of an address; only an `<address>` element or a
  `postalCode` passes. Do not loosen it to make a report look better.
- **Never invent a figure.** If the owner asks how much this is worth, the honest
  answer is that a static audit cannot tell them, and that the measured version
  needs Search Console and time.

## Output shape

```json
{
  "url": "https://example.ch/",
  "generated": "2026-10-19T…",
  "summary": { "pass": 17, "warn": 3, "fail": 1, "na": 0 },
  "checks": [{ "id": "schema-local", "group": "Machine-readable", "label": "…", "status": "fail", "detail": "…" }],
  "limits": ["Reads server-rendered HTML only; …", "…", "…"]
}
```

`limits` travels with every report so the caveats cannot be dropped when the
report is forwarded.
