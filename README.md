# local-seo-audit

**What a crawler can actually read from a local business website — and what it cannot.**

A zero-dependency CLI and an agent skill that audits the things which decide whether a
local business shows up in Google and in AI answers: business schema, NAP consistency,
opening hours, contact paths, sitemap, robots and `llms.txt`.

21 checks, each returning `pass` / `warn` / `fail` with the evidence, in four groups.

```console
$ node scripts/audit.mjs https://example.ch

Local SEO audit — https://example.ch/

Structure
  PASS  Served over HTTPS
  PASS  Mobile viewport declared
  PASS  Exactly one H1
  WARN  Social preview image declared
        Without it every shared link renders blank.

Machine-readable
  FAIL  A business type is declared
        no LocalBusiness/Organization node — an assistant cannot tell what this business is
  FAIL  Telephone is machine-readable
        no telephone in the schema

17 pass · 3 warn · 2 fail
```

## Install

As an agent skill:

```bash
npx skills add RelayStack/local-seo-audit
```

Or copy `SKILL.md`, `scripts/` and `references/` into your harness's skills directory. The
folder is self-contained.

As a plain script — nothing to install, Node 18+:

```bash
git clone https://github.com/RelayStack/local-seo-audit
cd local-seo-audit && node scripts/audit.mjs https://example.ch --json
```

## What it checks

| Group | Checks |
| --- | --- |
| **Structure** | HTTPS, viewport, title, meta description, single H1, canonical, lang, og:image |
| **Machine-readable** | JSON-LD present, business type, address, telephone, opening hours, FAQPage |
| **Local signals** | tappable and consistent phone number, identifiable postal address, contact/Impressum link |
| **Discovery** | robots.txt, sitemap reference, AI crawlers allowed, no blanket disallow, sitemap.xml, llms.txt |

Exit code is non-zero when any check fails, so it drops into CI.

## What it deliberately does not do

- **No score.** A number invites argument about the number instead of the problem.
- **No ranking claims.** Nothing here predicts position.
- **No Google Business Profile.** That needs Places API access, and it is usually the biggest
  local factor — so absence of a finding there is not absence of a problem.
- **It reads server-rendered HTML.** JSON-LD injected by JavaScript is counted as absent. That
  understates and never overstates; the report says so in its own `limits` field.

## Tests

```bash
npm test
```

Seven tests, including two regressions for bugs this tool shipped briefly in development: a
postcode regex that accepted "2026 Deutschland" as an address, and robots logic that treated a
missing `Disallow` line as "unknown" instead of "allowed".

## Licence

MIT. See [LICENSE](LICENSE).
