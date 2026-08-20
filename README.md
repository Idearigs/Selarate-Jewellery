# Handoff: Luxury Minimal Jewelry Storefront + Studio Admin

## Overview

A direct-to-consumer storefront for an independent fine-jewelry designer who makes
one-of-a-kind pieces by hand. The catalogue is deliberately small (roughly 5–10 live
pieces at a time). Prices are shown publicly on every product, and the primary goal is
direct online sale, with studio visits and commissions as a strong secondary path.

Eight desktop storefront pages, a full mobile set, and a nine-view admin application
are included.

## About the Design Files

The files in this bundle are **design references created in HTML** — prototypes that show
the intended look, copy and behavior. They are **not production code to copy directly**.

Each `.dc.html` file is a self-contained page that opens in a browser. They use a small
runtime (`support.js`) that renders a template plus a logic class; that runtime is a
prototyping tool and should **not** ship. Read the files for layout, values and copy, then
**recreate the designs in the target codebase** using its existing framework, component
library and conventions.

If no codebase exists yet, the recommended stack for this project is **Next.js (App Router)
+ TypeScript + Tailwind**, with a headless commerce backend (Shopify Storefront API,
Medusa, or a small custom Stripe integration — the catalogue is tiny, so a CMS-driven
catalogue with Stripe Checkout is entirely sufficient).

## Fidelity

**High fidelity.** Colors, typography, spacing and copy are final-intent. Recreate the UI
closely. The only deliberately unresolved items are:

- **Brand identity** — the wordmark renders as the literal text `BRAND NAME` in Marcellus
  with `0.34em` letter-spacing. Swap for the real logotype when it exists.
- **Photography** — every image is a hatched placeholder box labeled with its role and
  aspect ratio (e.g. `HERO — 4:5`). The client photographs his own pieces. Aspect ratios
  in the placeholders are load-bearing; keep them.
- **Address / phone** — currently the reference site's Laguna Beach details. Replace.

## Screens / Views

All desktop pages are laid out at a **1440px** design width with a **56px** horizontal page
margin. Content is not centered in a max-width container; sections run full width and the
56px margin is applied per-section. Mobile is designed at **390px** with a **20px** margin.

### 1. Homepage — `Homepage Directions.dc.html`

This file contains **three explored directions** side by side on a canvas. **Direction `1a`
("Atelier") is the chosen one** — every other page in this bundle is built in it. Directions
`1b` (Vitrine, near-black) and `1c` (Ledger, hairline grid) are kept for reference only; do
not build them.

Sections of `1a`, top to bottom:

1. **Header** — 26px/56px padding, 1px bottom border `rgba(23,20,15,0.12)`. Three-part flex:
   left nav (One of a Kind / Fine Jewelry / The Atelier), centered wordmark, right nav
   (Visit / Account / Bag (0)). Nav links: 12px, `0.16em` tracking, uppercase.
2. **Hero** — CSS grid `1.15fr 1fr`. Left cell 104px/64px/96px/56px padding, flex column,
   `justify-content: space-between`. Eyebrow (`No. 01 — Spring Editions`, 11px mono,
   `0.22em`), then `h1` at **78px / line-height 1.02 / letter-spacing -0.01em** in Marcellus,
   hard-wrapped with `<br>` into four lines. Below: 16px body copy at `max-width: 430px`,
   then an underlined uppercase link with a `→`. Right cell is the hero image, `min-height:
   660px`.
3. **Available Now** — section head (38px Marcellus) with a right-aligned mono count, then a
   4-column grid, `gap: 32px`, cards at **aspect-ratio 4:5**. Card meta: name 19px Marcellus,
   material 13px at 55% ink, price 14px with `0.06em` tracking.
4. **Maker band** — 1fr/1fr grid on `#EBE6DC`; image left (`min-height: 520px`), text right
   at 96px/72px padding. `h2` 40px Marcellus.
5. **Footer** — grid `1.4fr 1fr 1fr 1fr`, 88px top padding, four columns: brand block, Shop,
   Studio, Care. Column headings 11px uppercase `0.2em` at `rgba(23,20,15,0.64)`.

### 2. Collection listing — `Collection Page.dc.html`

Serves **both** product categories from one page via tabs.

- Breadcrumb bar (11px mono, `Collection / <title>`).
- Title block: `h1` 62px Marcellus + mono availability count on the left, blurb on the right.
- **Category tabs**: `One of a Kind` and `Fine Jewelry`. Underline indicator sits on the
  section's 1px bottom border via `margin-bottom: -1px`. Each category carries its own
  title, blurb, tag word and product list.
- **Filter chips**: All / Rings / Earrings / Necklaces / Cuffs — text-only with an underline
  on the active chip (desktop). **Price sort** toggle at the right (`Price ↓` / `Price ↑`).
- **Product grid**: 3 columns, `gap: 40px 32px`, cards 4:5. A corner tag sits at top-left of
  the image on a solid `#F5F2EC` chip — `One of one` for unique pieces, `Made to order` for
  fine jewelry, `Reserved` for held pieces.
- **Commissions band**: 1fr/1fr on `#EBE6DC`, text left, sketch/wax image right.

**Category semantics (important for the data model):** One of a Kind items are singletons —
inventory of exactly 1, no size variants, and they disappear from the catalogue when sold.
Fine Jewelry items are made to order — no inventory limit, but they carry metal/size options
and a 6–8 week lead time.

### 3. Product detail — `Product Page.dc.html`

Gallery on the left, buy column on the right, spec table and long-form story below,
then related pieces.

- **Buy column**: reference + `One of one` line (11px mono), `h1` ~52px Marcellus, material
  line, price ~24px. Size chips (44px+ hit targets), a solid-black primary button
  (`Add to bag`, `0.24em` tracking, 21px vertical padding), an outlined secondary
  (`Enquire about this piece`).
- **Reserved state**: adding to bag flips the button to `Reserved — 60 min hold`, inverted
  (bone fill, ink text, ink border). See *Interactions* for the hold rule.
- **Spec table**: two-column rows, 11px mono uppercase key at `rgba(23,20,15,0.64)`, 14px
  value, 1px bottom rules. Keys used: Reference, Metal, Stone, Band, Made.
- **Story**: single ~15–16px paragraph at 1.8 line-height, `max-width` ~640px.

### 4. Bag — `Bag Page.dc.html`

Grid `1.6fr 1fr` — line items left, summary right (both columns have their own borders).

- Line item: 150px thumbnail (4:5), details, right-aligned price with a mono
  `Held <n> min` note under it. Row actions: Engraving, Gift wrap, Remove.
- Below the items: a note field and a promo-code field side by side, then a full-width
  `#EBE6DC` sizing-reassurance block (this block belongs to the **left** column — do not put
  it in the summary rail; that produced a whitespace gap and was fixed).
- Summary rail: Subtotal / Insured shipping (Included) / Estimated tax at 7.5%, total in
  32px Marcellus, primary `Proceed to checkout`, outlined `Reserve and pay by wire`
  (real behavior for five-figure pieces), then three assurance blocks.
- **Empty state**: "Your bag is empty." + "Browse the collection" link.

### 5. About the Designer — `About Page.dc.html`

The person. Split hero (72px `h1`, portrait right), a two-column essay
(`1fr 1.35fr`, statement left / three paragraphs right), a three-up square image row,
a `#EBE6DC` "How a piece is made" band (4 columns, each a top-ruled block with number,
title, 14px body), and a credentials table with a `Book a studio visit` link.

### 6. The Atelier — `Atelier Page.dc.html`

The making. Distinct from About: this page is process and materials, About is biography.

- 620px full-bleed bench hero.
- Intro: `1fr 1fr`, 62px `h1` left, two paragraphs right (`align-self: end`).
- **At the bench** — four numbered stages as full-width rows, grid `90px 1.1fr 1fr`:
  number, then title + body + tools line, then a 3:2 image. 44px vertical padding, 1px top rule.
- **Materials** on `#EBE6DC` — three columns, square images, provenance copy.
- **Commissions** — sketchbook image left, terms table right (First meeting / Deposit /
  Timeline / Revisions).

### 7. Contact & Visit — `Contact Page.dc.html`

- Header block: 66px `h1` left, intro right.
- Body grid `1fr 1.1fr`, divided by a 1px rule: **left** = address in 27px Marcellus,
  directions link, a details table (Email / Telephone / Appointments / Instagram), and an
  hours list; **right** = the enquiry form.
- Form: Name + Email side by side (bottom-rule inputs only, no boxes), **reason chips**
  (Studio visit / A piece for sale / Commission / Repair or resize — the only boxed control
  set, filled black when active), a bordered textarea, then the primary button with a
  phone number beside it.
- 520px map/storefront strip with an overlaid "Finding us" card at bottom-left.

### 8. Account — `Account Page.dc.html`

Grid `1.05fr 1fr`. Left: tabs (`Sign in` / `Create account`) that swap the heading, blurb,
field set, checkbox label and secondary link. Guest **order lookup** sits below a rule —
important, since most buyers here will check out once and never return. Right: editorial
image with an overlaid card listing what an account holds (Reservations / Your sizes /
Care record).

### 9. Mobile — `Mobile Pages.dc.html`

All seven screens at 390px on one canvas. Deltas from desktop:

- **Header**: `Menu` (text button) / centered wordmark at 15px / `Bag n`. Drawer opens
  inline below the header on `#EBE6DC` with 24px Marcellus links at 13px vertical padding.
  It ships open on the Home screen only so the state is visible in the mock.
- Home product grid is **2-up**; the collection listing is **1-up** with larger cards.
- Filter chips become **filled** (not underlined) and scroll horizontally.
- Spec/detail tables collapse from two columns to stacked label-above-value.
- Atelier stage images move inline between the stage title and its body.
- Materials become a `110px 1fr` image-beside-text row.
- Contact adds a `Directions` / `Call studio` button pair; the form goes single-column.
- All inputs are **16px** to prevent iOS zoom-on-focus. All tap targets ≥ 44px.

Breakpoints to implement: mobile ≤ 767, tablet 768–1279 (2-up product grids, single-column
hero, form sections stacked), desktop ≥ 1280.

## Interactions & Behavior

Motion direction: **subtle fades and slow reveals** — nothing bouncy, no parallax.

- **Section reveal**: fade + 12px rise, 600ms, `cubic-bezier(0.22, 0.61, 0.36, 1)`, fired by
  IntersectionObserver at ~15% visibility, once per element. Respect
  `prefers-reduced-motion: reduce` by disabling the transform and shortening to a 200ms fade.
- **Product card hover**: crossfade to the second photograph over 500ms ease. No zoom, no
  lift, no shadow.
- **Link hover**: underline already present; shift the rule from 100% to full ink over 200ms.
- **Button hover**: outlined buttons take `border-color: #17140F` and a 4% ink wash; solid
  buttons lighten to ~88% opacity.
- **Tabs / chips / sort**: instant state swap, no transition on the indicator position.
- **Reserve hold**: adding a one-of-a-kind piece to the bag places a **60-minute server-side
  hold**. The UI shows a live countdown (`Held 58 min`). On expiry, the item leaves the bag
  and returns to the catalogue. This must be enforced server-side — the client countdown is
  display only.
- **Sold-out race**: because inventory is 1, the product page must revalidate availability on
  mount and before checkout, and show a "just sold" state rather than a generic error.
- **Forms**: validate on blur, not on keystroke. Errors render as 13px text below the field
  in `#8A3B2E`, with the field rule taking the same color. The enquiry form and the account
  forms in the mock are display-only — wire to a real endpoint.
- **Loading**: no spinners. Use a 300ms opacity fade on the content region.

## State Management

| State | Scope | Notes |
|---|---|---|
| `category` | Collection page | `ooak` \| `fine`; resets `filter` to `All` on change |
| `filter` | Collection page | `All` \| `Rings` \| `Earrings` \| `Necklaces` \| `Cuffs` |
| `sortAsc` | Collection page | Price ascending/descending toggle |
| `selectedSize` | Product page | Rings/bands only; absent for one-of-a-kind unless resizable |
| `galleryIndex` | Product page | Mobile swipes; desktop uses a thumbnail rail |
| `bagItems` | Global, persisted | Line items + hold expiry timestamps |
| `holdExpiry` | Per bag item | Server-authoritative; client renders remaining minutes |
| `menuOpen` | Mobile, global | Drawer |
| `authMode` | Account page | `signin` \| `register` |
| `formState` | Contact / account | `idle` \| `submitting` \| `sent` \| `error` |

Data fetching: the catalogue is small enough to be statically generated with on-demand
revalidation. Availability and hold state must be fetched fresh (no caching) on the product
page and the bag.

## Design Tokens

### Color

| Token | Hex | Use |
|---|---|---|
| Paper | `#F5F2EC` | Page background |
| Paper alt | `#EBE6DC` | Alternating bands, drawer, reassurance blocks |
| Ink | `#17140F` | Text, borders, solid buttons |
| Ink 85% | `rgba(23,20,15,0.85)` | Table values |
| Ink 75% / 72% | `rgba(23,20,15,0.75)` / `0.72` | Body copy |
| Ink 64% | `rgba(23,20,15,0.64)` | Mono labels, eyebrows — **minimum for small text** |
| Ink 30% | `rgba(23,20,15,0.3)` | Input rules |
| Ink 25% | `rgba(23,20,15,0.25)` | Chip borders, strong rules |
| Ink 12% | `rgba(23,20,15,0.12)` | Standard hairline rules |
| Error | `#8A3B2E` | Form errors |

Small mono labels were deliberately raised to 64% ink (~4.6:1). Do not lower them.

There is **no accent color** on the chosen direction — emphasis comes from solid ink fills
and Marcellus scale. (The unused `1b` direction used a gold `oklch(0.82 0.07 82)`; ignore it.)

### Typography

- **Display / headings**: Marcellus 400 — the only weight. Google Fonts.
- **Body / UI**: Karla 300 / 400 / 500. Google Fonts.
- **Labels, specs, eyebrows, prices in tables**: IBM Plex Mono 400.

| Role | Desktop | Mobile |
|---|---|---|
| Hero h1 | 78px / 1.02 / -0.01em | 42px / 1.06 |
| Page h1 | 62–72px / 1.05 | 36–42px / 1.06 |
| Section h2 | 34–40px / 1.2 | 26–30px / 1.2 |
| Product name (card) | 19–21px | 16–19px |
| Body | 16–17px / 1.75 | 15px / 1.7–1.75 |
| Small body | 13–14px / 1.7 | 13–14px / 1.6 |
| Nav | 12px / `0.16em` / uppercase | 11px mono |
| Mono label | 11px / `0.16–0.22em` / uppercase | 10px / `0.14–0.2em` |
| Button | 11px / `0.22–0.24em` / uppercase | same |

Wordmark: Marcellus, uppercase, `0.34em` tracking desktop / `0.28em` mobile. Note the
optical fix — add `padding-left` equal to the tracking value when centering, or the trailing
letter-space pushes it visually left.

### Spacing

Base scale in px: `4 6 8 12 14 16 20 24 26 32 36 40 44 48 56 64 72 88 96 104 112`.
Page margin 56 (desktop) / 20 (mobile). Section vertical rhythm 96–112 desktop, 36–48 mobile.
Grid gaps: 32 (product cards), 40–64 (content columns).

### Other

- **Border radius: 0 everywhere.** No rounded corners anywhere in this design.
- **Shadows: none** in the UI. The drop shadows in the mock files are canvas presentation
  only — do not port them.
- Borders are always 1px, always an ink alpha, never a gray.
- Aspect ratios: product 4:5, editorial portrait 3:4, process shots 3:2, materials 1:1,
  hero 4:5 (mobile) / free-height 660px (desktop).

## Assets

**None supplied.** Every image is a placeholder. The designer/client is photographing his own
inventory. Placeholder boxes are labeled with role and ratio; treat those labels as the shot
list:

- Home: hero (hand on ring), maker portrait
- Product: 4 gallery frames per piece (full, detail, on-body, scale reference)
- About: bench portrait, hands at work, rough stone, finished piece, studio interior
- Atelier: wide bench hero, stone tray, wax model, torch/bench, setting detail,
  gold stock, rough & cut stone, old settings, sketchbook
- Contact: map or storefront

Fonts are Google Fonts (Marcellus, Karla, IBM Plex Mono) — self-host for production.
No icons are used anywhere; every control is text. Keep it that way.

## Files

| File | Contents |
|---|---|
| `Homepage Directions.dc.html` | Three homepage directions; **build `1a` only** |
| `Collection Page.dc.html` | Listing with One of a Kind / Fine Jewelry tabs |
| `Product Page.dc.html` | Product detail |
| `Bag Page.dc.html` | Bag / pre-checkout |
| `About Page.dc.html` | About the designer |
| `Atelier Page.dc.html` | Process, materials, commissions |
| `Contact Page.dc.html` | Contact, hours, visit, enquiry form |
| `Account Page.dc.html` | Sign in / register / guest order lookup |
| `Mobile Pages.dc.html` | All seven screens at 390px |
| `Admin.dc.html` | Studio admin — nine views behind a live sidebar |
| `support.js` | Prototype runtime — **do not ship** |

Open any file directly in a browser. Interactive controls (tabs, filters, sort, size chips,
add to bag, remove, form chips) are live in the prototypes.

## Admin Application — `Admin.dc.html`

A back office for the studio owner (plus one or two staff). Nine views live in a single
file behind a working sidebar; click any nav item, table row or filter to move through it.

### Design language — deliberately different from the storefront

Same palette, opposite intent. The storefront is editorial and slow; the admin is dense and
fast. Do **not** carry storefront type scale into the admin.

- **Frame**: 1600 × 1000 grid, `236px` sidebar + fluid main. Main scrolls; the sidebar and
  the 60px topbar are fixed.
- **Sidebar**: solid ink `#17140F` with `#EDEAE3` text. Inactive items at 68% alpha; the
  active item takes a `rgba(237,234,227,0.12)` fill. Counts sit right-aligned in mono.
- **Type**: Karla 13–14px for all UI text, IBM Plex Mono 10–12px for every ID, figure,
  date and column header. **Marcellus appears only** in the sidebar wordmark, page titles
  (22px), KPI numbers (28–34px) and product names in tables (16–19px).
- **Tables**: 11px mono uppercase headers at 60% ink; rows 14px vertical padding with a
  `rgba(23,20,15,0.09)` hairline. Clickable rows are `<button>` elements with
  `text-align: left` — note that a `border: none` reset must not be declared after
  `borderBottom` or the rule reverts to a 3px default.
- **Radius stays 0**; no shadows; no icons — every control is a word.

### Status color (admin only — never used on the storefront)

| Tone | Fill | Text | Meaning |
|---|---|---|---|
| Good | `rgba(74,103,65,0.13)` | `#3D5A35` | Live, paid, in stock |
| Warn | `rgba(158,116,42,0.15)` | `#7A5716` | Reserved, in studio, low stock |
| Bad | `rgba(138,59,46,0.13)` | `#8A3B2E` | Refunded, overdue, below reorder |
| Mute | `rgba(23,20,15,0.07)` | `rgba(23,20,15,0.7)` | Sold, delivered, archived |

Status pills: 10px mono uppercase, `0.1em` tracking, `5px 9px` padding, square corners.
Alert dots are 7px circles in the solid version of the same four colors.

### Views

**1. Dashboard** — Four KPI cells across the top (revenue 30d, pieces live, awaiting
dispatch, open conversations), each with a mono label, Marcellus figure and a 12px note.
Below, a `1.5fr 1fr` split: recent orders table left; "Needs attention" queue right
(expiring holds, unanswered enquiries, low stock, unfinished drafts — each with a colored
dot, one-line body and an inline action). A **bench queue** pins to the bottom of the right
column on `#EBE6DC` with 3px progress bars — this is workshop status, not order status.

**2. Pieces** — Filter chips (All / One of a Kind / Fine Jewelry / Draft / Sold) and a
CSV export. Columns: thumbnail, piece (name + mono ref · material), category, status pill,
stock, price, views. Stock reads `1` or `0` for unique pieces and `—` for made-to-order.

**3. Piece editor** — `1fr 340px`. Left: five 4:5 photography slots (the fifth is a dashed
"+ ADD"), name/reference/price/material fields, a story textarea, and an inline-editable
spec table. Right rail: **availability mode** as three selectable cards (One of a kind /
Made to order / Draft) — this single control drives inventory behavior across the whole
system; size chips (multi-select); an activity log; then Save / Preview / Archive.

**4. Orders** — Filters: All / Enquiry / Paid / In studio / Dispatched / Refunded.
Columns: order no., customer (name + email), piece, placed, status pill, total. Refunds
show a negative total. **"Enquiry" is a first-class order state** — five-figure pieces are
often negotiated before payment.

**5. Order detail** — `1fr 340px`. Left: customer header with a large status pill, line
item with engraving and size, right-aligned totals, ship-to and payment blocks, and a
timeline. Right rail: Mark dispatched / Print packing note / Email customer / Refund, an
internal studio note (never customer-visible), and a customer summary on `#EBE6DC`.

**6. Inventory** — This is **not** product stock; it is loose stone, metal and heirloom
material. Four KPIs, then columns: material (name + mono ref), origin, acquired, qty, cost,
status. Origin and acquisition date are load-bearing — provenance is a selling point, and
stones are often held for years before being set. Statuses: Loose / Set / Reserved /
In stock / Low / Client owned.

**7. Customers** — Avatar + name/email, location, orders, lifetime value, last seen, and a
free-text note (ring size, metal preference, occasion). The note column is the most useful
field on the page for this business; give it real width.

**8. Live chat** — Three panes: `280px` thread list / fluid conversation / `300px` context
rail. Threads show a status dot, name, timestamp, preview and a mono tag (what they are
browsing, or the linked order). Active thread takes a 2px left ink border and a 4% wash.
Messages: studio replies are solid ink with bone text, right-aligned, max-width 440px;
visitor messages are a 6% ink wash, left-aligned. Canned-reply chips sit above the composer.
The context rail shows visitor location, **local time** (so you know if a reply will wake
them), customer history, device, referrer, the piece they are viewing now with a
"send this piece in chat" action, and past conversations.

**9. Settings** — Two columns: studio identity and commerce toggles left; hold window,
and team roles right. Toggles are 38×20 square switches. The **reservation window**
(default 60 minutes) is the setting that governs the storefront hold behavior.

### Admin state

| State | Notes |
|---|---|
| `view` | Nine values; `productEdit` and `orderDetail` keep their parent nav item lit |
| `productFilter` / `orderFilter` / `customerFilter` / `chatFilter` | Independent |
| `availability` | `unique` \| `order` \| `draft` — drives storefront inventory rules |
| `sizes` | Multi-select array on the piece editor |
| `thread` | Selected chat conversation index |
| `saved` / `fulfilled` / `resolved` | Action confirmation states |
| `settings` | Five booleans |

### Admin implementation notes

- **Roles**: Owner (everything), Admin (no settings/team), Limited (bench queue and orders
  only, no financials). The mock shows all three in Settings.
- **Live chat** needs a websocket (or a hosted widget — Crisp/Intercom) plus a visitor
  presence feed for the context rail. The "viewing now" panel is the reason to build rather
  than buy: it is what turns a chat into a sale on a one-of-a-kind piece.
- **Holds** are server-authoritative and shared with the storefront. The dashboard alert and
  the settings window read the same value.
- **Inventory is separate from catalogue stock.** A stone row and a product row are
  different entities linked by a "set in" relation; a sold piece consumes its stone.
- Every table should be keyboard-navigable and every row action available without hover —
  the owner will use this on a laptop at a workbench, often one-handed.
- Admin is **desktop only**. Do not build a responsive admin; a phone view of orders and
  chat can come later as a separate, much smaller surface.

## Suggested build order

1. Design tokens + typography + the shared header/footer/drawer.
2. Product data model — the One of a Kind vs. Fine Jewelry split drives everything.
3. Collection → Product → Bag (the sale path).
4. About / Atelier / Contact (content pages).
5. Account + guest order lookup.
6. Reveal animations and hover crossfades last.

Then the admin, which can be built in parallel by a second developer once the data model
is agreed:

7. Admin shell (sidebar, topbar, table primitives, status pills).
8. Pieces list + piece editor — nothing else can be managed until pieces exist.
9. Orders list + order detail.
10. Inventory and Customers.
11. Live chat last; it needs realtime infrastructure the rest of the app does not.
