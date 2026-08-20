# Development

Implementation of the design handoff in `README.md`. That file is the spec of
record — every colour, size and behaviour here is transcribed from it.

The `*.dc.html` files and `support.js` are **design references, not code**.
Open them in a browser to compare against what you build. `support.js` never ships.

## Running it

```bash
npm install
npm run dev          # http://localhost:3000
```

No database to install. See "The dev database" below.

| Command | Does |
|---|---|
| `npm run dev` | Dev server. Migrates and seeds the catalogue on first boot. |
| `npm run build` | Production build. Prerenders the storefront. |
| `npm test` | Vitest — the hold invariant suite. |
| `npm run typecheck` | `tsc --noEmit`. |
| `npm run db:generate` | Generate a migration after editing `lib/db/schema.ts`. |
| `npm run db:seed` | Seed a **real** Postgres (needs `DATABASE_URL`). |

## The dev database

Production runs Postgres in Docker. Locally, if `DATABASE_URL` is unset, the app
falls back to **PGlite** — real Postgres compiled to WASM, running in-process.
Same dialect, same migrations, same schema, nothing to install.

**One rule: `.pglite` is single-owner.** Whichever process opens it owns it.

- Do **not** run `npm run db:seed` while `npm run dev` is running. The dev server
  seeds itself on first boot, so you never need to.
- Two processes on one directory aborts the WASM runtime with
  `Aborted(). Build with -sASSERTIONS`. If you see that, stop everything, delete
  `.pglite`, and start one process.
- `next build` sidesteps this entirely: builds only read, so each build process
  gets its own in-memory database seeded from the same fixture.
- To reset: stop the server, delete `.pglite`, restart.

On the very first request after a cold boot the seed runs mid-render and can
500 once. Refresh; it will not recur.

To use a real Postgres instead, set `DATABASE_URL` and run
`npm run db:migrate && npm run db:seed`.

## Architecture notes

### Static SEO vs. live inventory

These pull in opposite directions and the resolution is the core of the design.

Product pages are **statically generated** — copy, specs, story, price and three
JSON-LD blocks are all in the prerendered HTML, which is what search engines
index. Availability cannot be cached for even a second: with an inventory of
one, a stale "Add to bag" sells a piece twice.

So availability lives behind `/api/availability/[slug]` (`force-dynamic`,
`no-store`) and is rendered by one client island, `<BuyColumn>`, which fetches it
on mount **and again immediately before checkout**.

**Consequence: never call `cookies()` or `headers()` in the storefront layout or
in any statically rendered page.** Doing so opts the whole tree into dynamic
rendering and silently undoes this. That is why the header's bag count is
fetched client-side from `/api/bag/count` rather than server-rendered.

Verify it survived with:

```bash
npm run build
grep -c 'application/ld+json' .next/server/app/piece/sweet-pea-ring.html   # 3
```

### Holds

`lib/holds.ts` is the only module permitted to write to the `hold` table. Three
layers of defence, deliberately redundant:

1. `SELECT … FOR UPDATE` on the piece row serialises concurrent buyers.
2. A partial unique index (`hold_one_live_per_piece_idx`) makes a second live
   hold physically impossible — Postgres refuses the insert even if application
   code is wrong.
3. Expiry is **lazy**: an unreleased hold past `expires_at` is treated as gone
   everywhere, so correctness never depends on the sweeper running.

The client countdown is display only.

`npm test` covers all of this, including a test that bypasses `acquireHold`
entirely to prove the index rejects a double-booking.

> PGlite is single-connection, so it cannot exhibit true write contention.
> The tests prove the *index* backstop; proving `FOR UPDATE` serialises real
> concurrent clients needs a server Postgres and belongs in the Playwright spec.

### Payments — the gateway is still an open decision

Nothing outside `lib/payments/` may import a gateway SDK. The app talks only to
the `PaymentProvider` interface in `lib/payments/types.ts`.

Two providers exist today:

| Provider | State | Notes |
|---|---|---|
| `wire` | **Works now, no credentials needed** | Bank transfer. Order opens as `enquiry`; the studio confirms funds by hand. |
| `stripe` | Reference implementation | Inert unless `STRIPE_SECRET_KEY` **and** `STRIPE_WEBHOOK_SECRET` are set. |

`availableProviders()` filters to what is configured, and the checkout page
renders whatever comes back. **With no gateway chosen, checkout still works
end to end via wire** — which for five-figure pieces is a legitimate primary
path, not a fallback. Adding a card gateway later means implementing the
interface and setting keys; no page changes.

To add a different gateway (PayHere, Mollie, Adyen…): add a file in
`lib/payments/`, implement `PaymentProvider`, register it in `index.ts`. Its
webhook is served automatically at `/api/payments/webhook/<id>`.

**Rules that must not be relaxed:**

- An order is written **before** the buyer reaches a gateway, and is only moved
  to `paid` by a signature-verified webhook. The browser's return URL is
  attacker-controllable and is never trusted.
- `verifyWebhook` must throw on a bad signature. Verified against the **raw**
  body, never parsed JSON.
- `markOrderPaid` is idempotent — gateways retry, and a retry must not sell a
  piece twice or send a second confirmation.
- Handler failures return 500 so the gateway retries. Dropping a confirmed
  payment is far worse than processing a webhook twice.

Reservation windows differ by provider on purpose: a wire order extends the
hold to 14 days (a transfer takes days to clear), while a card order keeps the
60-minute window so an abandoned checkout releases the piece quickly.

Email goes over SMTP. With `SMTP_URL` unset, mail is **logged, not sent** — so
nothing silently disappears and nobody gets a real email from a dev machine.

### Sold pieces keep their URLs

A sold one-of-a-kind piece leaves the catalogue but its page still returns
**200**, showing a "found its owner" state and marking the offer `SoldOut` in
JSON-LD. Product pages accrue the most inbound links in this niche; 404ing them
throws that away. `piece.soldAt` drives this — never delete a sold piece.

### Content pages and customer accounts

Editorial copy lives in `lib/content.ts`, not inline in the pages — it is the
copy most likely to move to a CMS, and pulling it out keeps the page components
readable as layout. Everything marked `TODO(launch)` is the reference site's
placeholder detail; several of those values also feed the `JewelryStore`
structured data.

Two pages were **not** in the handoff but are linked from the footer of every
page: `/care/[topic]` and `/gift-cards`. An unstyled 404 in the footer of a
five-figure storefront reads as abandonment, so they are built from the same
primitives. Gift cards state honestly that they are arranged with the studio —
replace when real gift cards (balances, codes, redemption) are implemented.

**Customer accounts are optional throughout.** Guest checkout is the primary
path, and a `customer` row exists whether or not it has a password. Registering
with an email that already bought as a guest *attaches* a password rather than
refusing, so buyers can claim their own history.

Customer sessions use a separate table and cookie from studio staff
(`lib/customer-auth.ts`). A single table with a nullable role column is exactly
the shortcut that eventually lets a customer session satisfy an admin check.

**Guest order lookup requires the order number *and* the email.** Order numbers
are sequential (`ORD-1001`, `ORD-1002`…) and trivially enumerable, so the number
alone must never unlock an order — it would hand out names, addresses and
purchase histories to anyone who can count. Failures return one message whether
the order is missing or the email is wrong, so the form is not an oracle for
which order numbers exist.

Public forms (enquiry, sign-in, register, lookup) are rate-limited per IP by
`lib/rate-limit.ts`, an in-process Map. That is genuinely sufficient for one
container on one VPS — **but if this is ever scaled horizontally it must move to
shared storage**, since a per-process limit across N processes is an N-times
weaker limit. The enquiry form also carries a honeypot field; a filled honeypot
gets the *success* state, because telling a bot it was detected only teaches it
to try again differently.

### The admin

Desktop only, deliberately — the handoff is explicit that a responsive admin
should not be built. Same palette as the storefront, opposite intent: dense and
fast, not editorial. Karla 13–14px for UI, mono 10–12px for every id, figure and
date; Marcellus appears only in the sidebar wordmark, page titles, KPI figures
and piece names in tables. Admin status tones (`good`/`warn`/`bad`/`mute`) are a
separate token group and must never appear on the storefront.

**Accounts are provisioned from the command line.** There is no sign-up page —
an open registration form on a back office holding customer addresses and
payment records is a liability.

```bash
npm run user -- owner@studio.com "The Designer" owner    # owner | admin | limited
```

Stop the dev server first — the script opens the embedded database, and only one
process may.

**Auth** is scrypt password hashing plus database-backed sessions
(`lib/auth.ts`). Sessions are stored as a SHA-256 of the cookie value, so a
database leak does not hand over live sessions, and they are revocable — which a
JWT is not. Sign-in compares in constant time and runs the hash even for unknown
addresses so response timing does not reveal which accounts exist.

**Three layers guard the admin**, and the outer two are not the authorisation
boundary:

1. `middleware.ts` — checks only that a session cookie *exists*. It runs on the
   edge and cannot reach the database. A turnstile, nothing more.
2. `app/(admin)/admin/(authed)/layout.tsx` — resolves the real session and
   redirects if it is invalid or expired.
3. `requirePermission()` in every server action and page — the actual check. It
   **throws** rather than returning falsy, so a forgotten guard cannot silently
   allow an operation.

Note the route structure: sign-in lives at `admin/sign-in`, *outside* the
`(authed)` group. Putting the auth redirect in `admin/layout.tsx` instead sends
the sign-in page to itself, forever.

**Roles** live in `lib/permissions.ts`, separate from `lib/auth.ts`, because the
sidebar is a client component and needs `can()` — importing it from `lib/auth`
drags `next/headers` and `node:crypto` into the browser bundle. The matrix is
asserted explicitly in `lib/permissions.test.ts`: widening a role fails a test.

| Role | Gets |
|---|---|
| `owner` | Everything, including settings and team |
| `admin` | Everything except settings and team |
| `limited` | Orders only. Every financial figure renders as `—` |

**Two rules the admin shares with the storefront:**

- **Archive, never delete.** Order history references piece rows, and a sold
  piece's URL must keep resolving.
- **Confirming a wire transfer runs the same `markOrderPaid` as the card
  webhook**, so a sale converts holds and marks pieces sold through exactly one
  code path. It requires `financials` — a bench assistant can move an order
  along but cannot declare money received.

### Security

Threat model: a small storefront holding **customer addresses, order history and
payment references**, with five-figure items whose inventory is exactly one. The
two things worth attacking are the admin (reads everything) and the money path.

**Guarantees that must not regress:**

| Guarantee | Where |
|---|---|
| Money only moves on a signature-verified webhook | `app/api/payments/webhook/[provider]` |
| Prices, tax and totals are computed server-side, never accepted from a client | `lib/orders.ts`, `app/actions/bag.ts` |
| A unique piece can be sold exactly once | `lib/holds.ts` + partial unique index |
| Every admin mutation calls `requirePermission()`, which **throws** | `app/actions/admin-*.ts` |
| Guest order lookup needs number **and** email | `app/actions/account.ts` |
| Customer sessions cannot satisfy an admin check | separate table + cookie |
| Session tokens are stored hashed | `lib/auth.ts`, `lib/customer-auth.ts` |

**Deliberate choices worth understanding before changing them:**

- **Auth errors are uniform.** Sign-in says "check your email and password"
  whatever failed, and the password hash runs even for unknown addresses, so
  neither the message nor the response time reveals which accounts exist. Order
  lookup behaves the same way, so it is not an oracle for valid order numbers.
- **Rate limits are keyed on the *last* `X-Forwarded-For` entry** (`lib/client-ip.ts`).
  Proxies append, so the left-most entry is attacker-controlled — taking `[0]`
  lets anyone bypass a limit with a fresh fake IP per request. If a second proxy
  is ever put in front of Caddy, this must skip that many entries from the right.
- **Admin sign-in is limited per IP *and* per targeted account**, so password
  spraying across many addresses is throttled, not just brute force on one.
- **All customer input reaching an email is escaped** (`escapeHtml`). The
  enquiry form and checkout write into mail the studio owner reads and trusts;
  unescaped, they are a way to plant an arbitrary link there.
- **CSP allows `'unsafe-eval'` in development only** — React Fast Refresh needs
  it. It must never reach production, where `eval` is the most useful primitive
  an injected script can have.

**Two content security policies, on purpose:**

| Surface | Policy | Why |
|---|---|---|
| Storefront (`next.config.ts`) | `script-src 'self' 'unsafe-inline'` | Statically prerendered — a nonce cannot be baked into cached HTML |
| Admin (`middleware.ts`) | `script-src 'self' 'nonce-…' 'strict-dynamic'` | Already 100% dynamic, so nonces are free here |

Nonces must be unique per request, so adopting them sitewide would force every
storefront page to render on demand and destroy the static-SEO architecture the
build rests on. The admin is the surface worth protecting — it reads every
order, address and payment reference — and it pays no cost. `next.config.ts`
deliberately excludes `/admin` from its CSP so the two policies never both apply
to one response.

`'unsafe-eval'` appears in **development only**, in both policies, because React
Fast Refresh evaluates strings.

**Password reset** (`lib/customer-auth.ts`):

- Tokens are 32 random bytes, stored **hashed**, single-use, and expire in an hour.
- Requesting a new link invalidates the previous one, so an old link in an old
  inbox stops working.
- A successful reset **destroys every session for that customer** — if the reset
  was triggered because someone else had access, leaving their session alive
  makes the whole exercise pointless.
- The request form always says "check your email", even when throttled, because
  "no account with that address" would confirm which addresses belong to people
  who own five-figure jewellery.
- The token is **not** validated on page load, only on submit: doing so would let
  a guessed URL confirm a real token, and would burn a legitimate token on the
  link-preview fetches that mail clients make routinely.
- With SMTP unconfigured, mail bodies print to the console in **development
  only** — a reset link in a production server log is an account takeover for
  anyone who can read logs.

**Known gaps, in priority order:**

1. **Storefront CSP still needs `'unsafe-inline'` for scripts.** Removing it
   means giving up static prerendering, which costs more than it buys here. If
   Next gains static-compatible hashes this should be revisited.
2. **No 2FA on studio accounts.** For an owner plus one or two staff, a strong
   password and a 5-attempt lockout is proportionate — but this is the obvious
   next step if the team grows.
3. **The audit log records reads but nothing surfaces it.** Rows accumulate in
   `audit_log`; there is no admin view for them yet.
4. **No account lockout notification.** A customer is not emailed when their
   password changes, so a successful takeover is silent.

### Design tokens

All in `app/globals.css` under `@theme`. Do not hardcode hexes in components.

- Only four storefront colours exist. Every tint is an **alpha of ink**, never a
  grey: `text-ink/64`, `border-ink/12`.
- `--radius-*`, `--shadow-*` etc. are set to `initial`, which **deletes** those
  utilities. `rounded-lg` and `shadow-md` are build errors by design.
- Small mono labels bottom out at `ink/64` (~4.6:1). Do not go lighter.
- Admin status tones are a separate group; never import them into storefront
  components.

### Photography

None supplied — the client is shooting his own inventory. Every image goes
through `<PlaceholderImage>`, which renders the handoff's hatched placeholder
with its role and ratio label until a real image record exists, then swaps to
`next/image` at the identical ratio. Pages upgrade photo by photo with no layout
change. The placeholder labels are the client's shot list.

Cards carry at most two images — position 0 is the primary, position 1 is the
hover crossfade. `cardImagesFor()` in `lib/db/queries/pieces.ts` fetches them in
a second round trip keyed by piece id rather than joining: a join against a
to-many multiplies the piece rows, which would corrupt the `LIMIT` on the
homepage grid.

**Preview stock is currently installed** — `public/photography/`, wired up in
the `IMAGES` map in `lib/db/seed.ts` and the two editorial slots on the home
page. It is free-licence Unsplash standing in for the real shoot, and **all of
it must go before launch**: showing someone else's ring on a one-of-a-kind
listing is a misrepresentation, not a placeholder. Removal instructions and
sources are in `public/photography/CREDITS.md`.

`objectPosition` on `<PlaceholderImage>` biases the crop's focal point. The
editorial slots change aspect ratio between breakpoints — the maker band is 4:5
on mobile and nearly 2:1 on desktop — so a portrait photograph centre-cropped
into the desktop panel loses the subject's head.

### Live chat and phone alerts

View 9, plus an installable admin PWA so the studio can answer from a phone.

**Transport is SSE, not WebSockets.** Chat here is asymmetric — clients only
need to *receive*, because sending is an ordinary POST — so SSE gets it over
plain HTTP with automatic browser reconnection and no Caddy changes. Two things
in `lib/chat/sse.ts` are not optional in production: `X-Accel-Buffering: no`
(a buffering proxy holds an SSE response until its buffer fills, delivering
chat in silent batches) and the 25s heartbeat (idle connections are reaped
around 60s, and a phone that has silently lost its stream looks exactly like a
quiet afternoon).

**The bus is in-process** (`lib/chat/bus.ts`). Correct for the single `web`
container in compose; with two replicas a visitor on replica A would not see a
reply sent from replica B. The fix is entirely inside that file — publish
through Postgres `LISTEN/NOTIFY` — because nothing else imports the emitter.

**Events carry ids, not payloads.** Clients re-fetch on notification rather than
trusting the stream to deliver state, so a dropped or duplicated event costs one
redundant fetch instead of a wrong transcript, and reconnecting needs no
catch-up protocol.

**One live conversation per visitor** is enforced by a partial unique index on
`chat_session (visitor_key) where closed_at is null` — the same
database-level defence the piece hold uses, not a convention. Keyed by an
opaque `visitor_key` cookie rather than the cart token, so emptying a bag
cannot orphan a conversation.

**Slash commands** (`components/admin/chat-composer.tsx`) are a pure function of
the draft text: `/` lists commands, `/product` offers the two categories,
`/fine` or `/one` match a category by prefix, and anything after the command
searches pieces by name or reference. Reference matching strips punctuation, so
`a01` finds `A—01`. Drafts and archived pieces are excluded — the studio must
never be able to send a link that 404s. Piece cards store a reference, not a
price snapshot, so a conversation resumed next week cannot quote stale
availability.

**Push** is Web Push (VAPID), best-effort by design: a failed notification never
fails the message that triggered it, because the message is already durable in
Postgres. Dead endpoints (404/410) are pruned rather than retried. Generate keys
with `npm run push:keys` and **keep the pair stable** — the public key is baked
into every subscription browsers already hold, so rotating it silently kills
every registered device with no error anywhere.

**Visitor arrivals alert on every new visitor**, per the studio's decision. Two
guards keep that usable rather than merely loud: known crawlers never alert
(they still get a row — real traffic, worth seeing), and `alerted_at` is stamped
once per visitor so refreshes, extra tabs and reconnects cannot re-fire. There
is also a site-wide cap of 30 pushes/hour so a traffic spike cannot flood the
owner's phone; arrivals beyond it are still recorded and still visible in the
admin.

**Privacy:** no IP address is stored. User agent is kept because it is what
distinguishes a crawler from a buyer, and country only if the proxy supplies it.
`visitor_session` is a first-party presence record, not an analytics profile,
and nothing is shared onward.

**The admin is now responsive.** The handoff specified desktop-only, which was
right while it was a workbench tool; the rail collapses to a drawer below `lg`
because the owner answers chat from a phone.

## Deployment

`docker/docker-compose.yml` — Caddy (TLS), web, Postgres, MinIO, migrate
one-shot, and a worker for hold sweeping. See the plan for the full runbook.

Required in production: `DATABASE_URL`, `AUTH_SECRET`. `lib/env.ts` validates at
boot and fails loudly.

## Before launch

- **Delete `public/photography/`** and empty the `IMAGES` map in
  `lib/db/seed.ts`. It is stock photography of other makers' work.
- The wordmark is the name set in Marcellus, not a drawn logotype
  (`components/storefront/wordmark.tsx`). If one is commissioned, swap the inner
  span and keep the optical fix: `padding-left` equal to the tracking value.
- The studio name lives in `lib/brand.ts` (`BRAND_NAME`), with
  `settings.studioName` in the database overriding it for the `JewelryStore`
  JSON-LD so the owner can correct it without a deploy.
- Address, phone and hours are still the reference site's Laguna Beach details.
  They feed the `JewelryStore` JSON-LD, so stale values are an SEO defect.
