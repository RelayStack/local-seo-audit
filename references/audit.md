# What each check means, and the fix

Ordered by how much it matters. A `fail` in Structure outranks a `fail` in
Discovery: an unreadable page with a perfect sitemap is still unreadable.

## Structure

**HTTPS.** Not a ranking factor in itself, but browsers mark the site "not
secure", and every modern API assumes it. Fix at the host, not in code.

**Viewport.** Without `<meta name="viewport" content="width=device-width,
initial-scale=1">` the page renders at desktop width on a phone and the visitor
has to pinch. Most local searches happen on a phone. This is the single cheapest
fix on the list.

**Title, 20–65 characters.** The line a searcher reads. Too short wastes the
space; too long is truncated. Include the service and the place, not the slogan.

**Meta description, 50–165 characters.** Not a ranking factor, but it is the ad
copy in the result. Write it as an answer to "why this business".

**Exactly one H1.** Two H1s is a warning rather than a failure: it is a signal
that the page's topic is unclear, not that it is broken. Zero is a failure.

**Canonical.** Prevents the same page being indexed at four URLs. Needed most on
sites with tracking parameters or a trailing-slash mismatch.

**lang.** Screen readers use it; so do search engines. `<html lang="de">`.

**og:image.** Not SEO — it is what appears when someone shares the link. A blank
card depresses click-through on every social share.

## Machine-readable

**Structured data present.** Any valid JSON-LD at all. Without it a crawler has
to guess from prose.

**A business type.** `LocalBusiness`, `Organization`, `ProfessionalService`,
`Dentist`, `Plumber`, `Locksmith`… Without a type, an assistant cannot say what
the business *is*, which is precisely the question it is asked.

**Address and telephone in the schema.** These are the facts an assistant repeats
back. If they only exist as pixels in an image, they do not exist.

**Opening hours.** `openingHoursSpecification`. "Are they open now?" is one of the
highest-intent questions in local search and the one assistants most often get
wrong when the hours are unstructured.

**FAQPage.** The most quotable block a page can have. An assistant asked "what
does X cost in Y" will lift a short, self-contained answer verbatim.

> **The JavaScript trap.** This audit reads server-rendered HTML. A schema block
> injected by a script is counted as absent. Before reporting a failure, confirm
> with the page source or a rendered check. Reporting "your schema is missing"
> when it is only invisible to a plain fetch is the fastest way to lose the
> owner's trust.

## Local signals

**Tappable phone number.** `href="tel:…"`. A number that is only text costs a
tap and, on a phone, a call.

**Phone consistency.** The `tel:` link and the visible number must match. When
they do not, one of them is stale, and the stale one is usually what the site
publishes.

**Identifiable address.** An `<address>` element or a `postalCode` in the schema.
Strict on purpose: a postcode-shaped number next to a capitalised word proves
nothing, and treating it as a pass hides a real problem.

**Contact or Impressum link.** For a DACH business this is also a legal
requirement — see your jurisdiction (DE: §5 DDG, AT: §5 ECG, CH: the practical
Impressum duty). A site with no contact path is a trust problem before it is an
SEO problem.

## Discovery

**robots.txt.** Absence is a warning, not a failure: crawlers fall back to
permissive defaults. Present but wrong is worse than absent.

**A `Sitemap:` line.** How a crawler finds the sitemap without guessing.

**AI crawlers allowed.** GPTBot, CCBot, PerplexityBot, ClaudeBot,
Google-Extended. Blocking them removes the site from AI answers. Only opt out if
the owner explicitly wants that, and say what it costs.

**A blanket `Disallow: /`.** Kills indexing entirely. Check this before anything
else when traffic has collapsed.

**sitemap.xml with URLs.** Generated from the same source as the pages, or it
lists pages that no longer exist.

**llms.txt.** Optional. It serves assistants, not Google. Its absence is a
warning, never a failure, and it must never be sold as a ranking lever.
