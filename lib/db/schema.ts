import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  integer,
  index,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/* ===========================================================================
   Enums
   =========================================================================== */

/**
 * The master switch from the piece editor's three availability cards.
 * Drives inventory behaviour across the whole system — see lib/types.ts.
 */
export const availabilityEnum = pgEnum("availability", [
  "unique",
  "order",
  "draft",
  "archived",
]);

export const categoryEnum = pgEnum("category", ["ooak", "fine"]);

export const imageRoleEnum = pgEnum("image_role", [
  "primary",
  "detail",
  "onbody",
  "scale",
]);

/**
 * "enquiry" is a first-class order state, not a pre-order limbo: five-figure
 * pieces are routinely negotiated (and paid by wire) before any card is charged.
 */
export const orderStatusEnum = pgEnum("order_status", [
  "enquiry",
  "paid",
  "in_studio",
  "dispatched",
  "delivered",
  "refunded",
  "cancelled",
]);

export const materialKindEnum = pgEnum("material_kind", [
  "stone",
  "metal",
  "heirloom",
]);

export const materialStatusEnum = pgEnum("material_status", [
  "loose",
  "set",
  "reserved",
  "in_stock",
  "low",
  "client_owned",
]);

export const enquiryReasonEnum = pgEnum("enquiry_reason", [
  "visit",
  "piece",
  "commission",
  "repair",
]);

/** Owner: everything. Admin: no settings/team. Limited: bench + orders, no financials. */
export const userRoleEnum = pgEnum("user_role", ["owner", "admin", "limited"]);

/**
 * Who said it. `system` covers joins, closes and the out-of-hours notice —
 * rendered differently and never pushed to a phone.
 */
export const chatSenderEnum = pgEnum("chat_sender", ["visitor", "studio", "system"]);

/**
 * `text` is an ordinary message. `piece` carries a pieceId and renders as a
 * product card the visitor can tap through to the product page — the payload
 * of the studio's `/product` slash command.
 */
export const chatMessageKindEnum = pgEnum("chat_message_kind", ["text", "piece"]);

export const chatStatusEnum = pgEnum("chat_status", ["open", "closed"]);

/** Web Push only for now; the column exists so a native app can be added. */
export const pushPlatformEnum = pgEnum("push_platform", ["web", "ios", "android"]);

/* ===========================================================================
   Catalogue
   =========================================================================== */

export const piece = pgTable(
  "piece",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull(),
    /** Studio reference, e.g. "A—01". Shown in mono throughout. */
    reference: text("reference").notNull(),
    name: text("name").notNull(),
    category: categoryEnum("category").notNull(),
    availability: availabilityEnum("availability").notNull().default("draft"),

    priceCents: integer("price_cents").notNull(),
    currency: text("currency").notNull().default("USD"),

    /** The 13px line under the name on a card, e.g. "18k gold, tourmaline". */
    materialLine: text("material_line").notNull(),
    /** Single long-form paragraph, ~640px max-width on the product page. */
    story: text("story").notNull().default(""),
    season: text("season"),
    /** Filter chip bucket: Rings | Earrings | Necklaces | Cuffs. */
    filterTag: text("filter_tag").notNull().default("Rings"),
    sizeNote: text("size_note"),
    /**
     * A finished one-of-a-kind ring already IS a size — the chip set shows what
     * it can be resized to, not a free choice. Preselects that size.
     */
    defaultSize: text("default_size"),

    /**
     * Set when a unique piece is sold. The piece leaves the catalogue but its
     * URL keeps returning 200 with a "found its owner" state — see the SEO
     * rationale in the plan. Never delete a sold piece.
     */
    soldAt: timestamp("sold_at", { withTimezone: true }),

    sortIndex: integer("sort_index").notNull().default(0),
    views: integer("views").notNull().default(0),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("piece_slug_idx").on(t.slug),
    uniqueIndex("piece_reference_idx").on(t.reference),
    index("piece_listing_idx").on(t.category, t.availability, t.sortIndex),
  ],
);

export const pieceImage = pgTable(
  "piece_image",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    pieceId: uuid("piece_id")
      .notNull()
      .references(() => piece.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    /** Required at upload — missing alt text is an accessibility and SEO defect. */
    alt: text("alt").notNull(),
    role: imageRoleEnum("role").notNull().default("detail"),
    width: integer("width"),
    height: integer("height"),
    position: integer("position").notNull().default(0),
  },
  (t) => [index("piece_image_piece_idx").on(t.pieceId, t.position)],
);

/** Two-column spec rows: Reference, Metal, Stone, Band, Made. */
export const pieceSpec = pgTable(
  "piece_spec",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    pieceId: uuid("piece_id")
      .notNull()
      .references(() => piece.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    value: text("value").notNull(),
    position: integer("position").notNull().default(0),
  },
  (t) => [index("piece_spec_piece_idx").on(t.pieceId, t.position)],
);

export const pieceSize = pgTable(
  "piece_size",
  {
    pieceId: uuid("piece_id")
      .notNull()
      .references(() => piece.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    position: integer("position").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.pieceId, t.label] })],
);

export const pieceRelated = pgTable(
  "piece_related",
  {
    pieceId: uuid("piece_id")
      .notNull()
      .references(() => piece.id, { onDelete: "cascade" }),
    relatedId: uuid("related_id")
      .notNull()
      .references(() => piece.id, { onDelete: "cascade" }),
    position: integer("position").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.pieceId, t.relatedId] })],
);

/* ===========================================================================
   Bag and holds
   =========================================================================== */

export const cart = pgTable(
  "cart",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    /** Opaque cookie value. Survives sign-in so a guest bag is never lost. */
    token: text("token").notNull(),
    customerId: uuid("customer_id").references(() => customer.id, {
      onDelete: "set null",
    }),
    note: text("note"),
    promoCode: text("promo_code"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("cart_token_idx").on(t.token)],
);

export const cartItem = pgTable(
  "cart_item",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    cartId: uuid("cart_id")
      .notNull()
      .references(() => cart.id, { onDelete: "cascade" }),
    pieceId: uuid("piece_id")
      .notNull()
      .references(() => piece.id, { onDelete: "cascade" }),
    size: text("size"),
    engraving: text("engraving"),
    giftWrap: boolean("gift_wrap").notNull().default(false),
    /** Snapshot: the price the visitor was shown, not a live lookup. */
    unitPriceCents: integer("unit_price_cents").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("cart_item_unique_idx").on(t.cartId, t.pieceId)],
);

/**
 * Server-authoritative reservation on a one-of-a-kind piece.
 *
 * The partial unique index is the real guarantee: at most one *unreleased* hold
 * can exist per piece, enforced by Postgres rather than by application code.
 * Expiry is evaluated lazily on read (an unreleased-but-expired hold is treated
 * as gone), so correctness never depends on the sweeper running.
 */
export const hold = pgTable(
  "hold",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    pieceId: uuid("piece_id")
      .notNull()
      .references(() => piece.id, { onDelete: "cascade" }),
    cartId: uuid("cart_id")
      .notNull()
      .references(() => cart.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    releasedAt: timestamp("released_at", { withTimezone: true }),
    orderId: uuid("order_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("hold_one_live_per_piece_idx")
      .on(t.pieceId)
      .where(sql`${t.releasedAt} is null`),
    index("hold_expiry_idx").on(t.expiresAt).where(sql`${t.releasedAt} is null`),
  ],
);

/* ===========================================================================
   Customers and orders
   =========================================================================== */

export const customer = pgTable(
  "customer",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull(),
    name: text("name"),
    location: text("location"),
    /**
     * Free-text studio note: ring size, metal preference, the occasion.
     * The handoff calls this the most useful field on the customers page.
     */
    note: text("note"),
    ringSize: text("ring_size"),
    metalPreference: text("metal_preference"),
    /**
     * Null for the many buyers who check out as guests and never register.
     * A customer row exists either way — the account is optional on top of it.
     */
    passwordHash: text("password_hash"),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("customer_email_idx").on(t.email)],
);

/**
 * Who looked at what, in the admin.
 *
 * Order events already record what staff *changed*. This records what they
 * *read* — customer records, order details, the inventory ledger. For a
 * business holding home addresses of people who own five-figure jewellery,
 * "which member of staff opened this customer record, and when" is a question
 * worth being able to answer.
 */
export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => user.id, { onDelete: "set null" }),
    /** Denormalised so the trail survives the account being deleted. */
    actorEmail: text("actor_email").notNull(),
    action: text("action").notNull(), // e.g. "read"
    resource: text("resource").notNull(), // e.g. "customer", "order"
    resourceId: text("resource_id"),
    ip: text("ip"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("audit_log_time_idx").on(t.createdAt),
    index("audit_log_resource_idx").on(t.resource, t.resourceId),
  ],
);

/**
 * Rate-limit counters.
 *
 * Database-backed rather than in-process so a limit holds across every server
 * process and survives a restart — an in-memory limiter is an N-times weaker
 * limit across N processes, and resets to zero every deploy.
 */
export const rateLimitBucket = pgTable(
  "rate_limit",
  {
    key: text("key").primaryKey(),
    count: integer("count").notNull().default(0),
    resetAt: timestamp("reset_at", { withTimezone: true }).notNull(),
  },
  (t) => [index("rate_limit_reset_idx").on(t.resetAt)],
);

/** Single-use, expiring password reset tokens. Stored hashed. */
export const passwordReset = pgTable(
  "password_reset",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tokenHash: text("token_hash").notNull(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customer.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("password_reset_token_idx").on(t.tokenHash),
    index("password_reset_customer_idx").on(t.customerId),
  ],
);

/** Customer sessions. Separate from studio staff sessions on purpose. */
export const customerSession = pgTable(
  "customer_session",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tokenHash: text("token_hash").notNull(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customer.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("customer_session_token_idx").on(t.tokenHash),
    index("customer_session_customer_idx").on(t.customerId),
  ],
);

export const order = pgTable(
  "order",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    /** Human reference shown everywhere, e.g. "ORD-1042". */
    number: text("number").notNull(),
    customerId: uuid("customer_id").references(() => customer.id, {
      onDelete: "set null",
    }),
    status: orderStatusEnum("status").notNull().default("enquiry"),

    subtotalCents: integer("subtotal_cents").notNull(),
    shippingCents: integer("shipping_cents").notNull().default(0),
    taxCents: integer("tax_cents").notNull().default(0),
    totalCents: integer("total_cents").notNull(),
    currency: text("currency").notNull().default("USD"),

    paymentProvider: text("payment_provider"),
    paymentRef: text("payment_ref"),

    /** Opaque token for guest order lookup — most buyers never make an account. */
    lookupToken: text("lookup_token").notNull(),

    shippingAddress: text("shipping_address"),
    placedAt: timestamp("placed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("order_number_idx").on(t.number),
    uniqueIndex("order_lookup_idx").on(t.lookupToken),
    index("order_status_idx").on(t.status, t.placedAt),
  ],
);

export const orderItem = pgTable("order_item", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => order.id, { onDelete: "cascade" }),
  pieceId: uuid("piece_id").references(() => piece.id, { onDelete: "set null" }),
  /** Snapshotted at purchase so history survives edits and deletions. */
  name: text("name").notNull(),
  reference: text("reference").notNull(),
  materialLine: text("material_line").notNull(),
  size: text("size"),
  engraving: text("engraving"),
  giftWrap: boolean("gift_wrap").notNull().default(false),
  unitPriceCents: integer("unit_price_cents").notNull(),
});

/** Order timeline shown on the order detail view. */
export const orderEvent = pgTable(
  "order_event",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => order.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    body: text("body"),
    actor: text("actor"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("order_event_order_idx").on(t.orderId, t.createdAt)],
);

/** Internal studio note. NEVER rendered on any customer-facing surface. */
export const orderNote = pgTable("order_note", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => order.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  author: text("author"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ===========================================================================
   Studio inventory — loose stone, metal, heirloom material.
   This is NOT catalogue stock. A stone row and a piece row are different
   entities, linked only by materialUse. A sold piece consumes its stone.
   =========================================================================== */

export const material = pgTable(
  "material",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ref: text("ref").notNull(),
    name: text("name").notNull(),
    kind: materialKindEnum("kind").notNull().default("stone"),
    /** Provenance is a selling point — origin and acquisition date are load-bearing. */
    origin: text("origin"),
    acquiredAt: timestamp("acquired_at", { withTimezone: true }),
    qty: integer("qty").notNull().default(1),
    unit: text("unit").notNull().default("ct"),
    costCents: integer("cost_cents"),
    status: materialStatusEnum("status").notNull().default("loose"),
    reorderPoint: integer("reorder_point"),
  },
  (t) => [uniqueIndex("material_ref_idx").on(t.ref)],
);

export const materialUse = pgTable(
  "material_use",
  {
    materialId: uuid("material_id")
      .notNull()
      .references(() => material.id, { onDelete: "cascade" }),
    pieceId: uuid("piece_id")
      .notNull()
      .references(() => piece.id, { onDelete: "cascade" }),
    qty: integer("qty").notNull().default(1),
  },
  (t) => [primaryKey({ columns: [t.materialId, t.pieceId] })],
);

/* ===========================================================================
   Enquiries, settings, staff
   =========================================================================== */

export const enquiry = pgTable("enquiry", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  reason: enquiryReasonEnum("reason").notNull().default("visit"),
  message: text("message").notNull(),
  pieceId: uuid("piece_id").references(() => piece.id, { onDelete: "set null" }),
  answeredAt: timestamp("answered_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Singleton. The check constraint makes a second row impossible, so every read
 * can be `where id = 1` without a "which one wins" question.
 */
export const settings = pgTable(
  "settings",
  {
    id: integer("id").primaryKey().default(1),
    /** Owner-editable. Literal rather than imported from lib/brand.ts so
     *  drizzle-kit never has to resolve a path alias to diff the schema. */
    studioName: text("studio_name").notNull().default("Sélarté"),
    studioEmail: text("studio_email").notNull().default("studio@example.com"),
    studioPhone: text("studio_phone"),
    studioAddress: text("studio_address"),
    /** Governs the storefront hold. Dashboard alerts read the same value. */
    holdWindowMinutes: integer("hold_window_minutes").notNull().default(60),
    /** Estimated tax shown in the bag summary, in basis points (750 = 7.5%). */
    taxRateBps: integer("tax_rate_bps").notNull().default(750),
    insuredShipping: boolean("insured_shipping").notNull().default(true),
    acceptWireTransfer: boolean("accept_wire_transfer").notNull().default(true),
    showPricesPublicly: boolean("show_prices_publicly").notNull().default(true),
    acceptCommissions: boolean("accept_commissions").notNull().default(true),

    /** Master switch for the storefront chat widget. */
    chatEnabled: boolean("chat_enabled").notNull().default(true),
    /**
     * Studio hours, as hours of the day in `chatTimezone`. The widget is "live"
     * when a studio member is actually connected OR the clock is inside these
     * hours — inside hours they will get a push, so promising a reply is
     * honest. Outside both, it takes a message instead.
     */
    chatHoursStart: integer("chat_hours_start").notNull().default(10),
    chatHoursEnd: integer("chat_hours_end").notNull().default(18),
    chatTimezone: text("chat_timezone").notNull().default("America/Los_Angeles"),
    /** Push the studio on every visitor arrival, not just chat starts. */
    notifyOnVisitor: boolean("notify_on_visitor").notNull().default(true),

    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [check("settings_singleton", sql`${t.id} = 1`)],
);

/* ===========================================================================
   Live chat
   =========================================================================== */

/**
 * One conversation with one visitor.
 *
 * Keyed by `visitorKey` — an opaque id in a first-party cookie, not the cart id,
 * so a conversation survives the bag being emptied and never leaks a cart
 * identifier into a channel the visitor can read. `customerId` is filled in
 * only if they are signed in, which is how the studio sees who it is talking to.
 *
 * Sessions are never deleted; a closed conversation is history the studio may
 * need when a five-figure piece is disputed months later.
 */
export const chatSession = pgTable(
  "chat_session",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    visitorKey: text("visitor_key").notNull(),
    customerId: uuid("customer_id").references(() => customer.id, {
      onDelete: "set null",
    }),
    /** Volunteered in the widget, or copied from the account when signed in. */
    visitorName: text("visitor_name"),
    visitorEmail: text("visitor_email"),
    status: chatStatusEnum("status").notNull().default("open"),
    /** Which studio member picked it up. Null while unclaimed. */
    assignedUserId: uuid("assigned_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    /** The page they were on when the conversation opened — the studio's best
     *  single clue about what the question is going to be about. */
    entryPath: text("entry_path"),
    /** Drives the unread badge without counting rows on every poll. */
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
    studioReadAt: timestamp("studio_read_at", { withTimezone: true }),
    visitorReadAt: timestamp("visitor_read_at", { withTimezone: true }),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    /* One live conversation per visitor. The partial index makes a second open
       session impossible at the database level rather than by convention —
       the same defence the piece hold uses. */
    uniqueIndex("chat_session_one_open_per_visitor_idx")
      .on(t.visitorKey)
      .where(sql`${t.closedAt} is null`),
    index("chat_session_inbox_idx").on(t.status, t.lastMessageAt),
  ],
);

export const chatMessage = pgTable(
  "chat_message",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => chatSession.id, { onDelete: "cascade" }),
    sender: chatSenderEnum("sender").notNull(),
    kind: chatMessageKindEnum("kind").notNull().default("text"),
    /** Empty for a piece card; the card carries the content. */
    body: text("body").notNull().default(""),
    /** Set when kind = 'piece'. Kept as a reference, not a snapshot: the
     *  visitor should follow the link to the live price and availability. */
    pieceId: uuid("piece_id").references(() => piece.id, { onDelete: "set null" }),
    /** Which studio member sent it. Null for visitor and system messages. */
    userId: uuid("user_id").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("chat_message_session_idx").on(t.sessionId, t.createdAt)],
);

/**
 * Visitor presence and arrivals.
 *
 * The studio asked to be alerted on every arrival, so this is a row per visitor
 * per visit rather than a sampled analytics table. `lastSeenAt` is heartbeated
 * by the widget, which is also what powers the "who is on the site right now"
 * list in the admin.
 *
 * `isBot` is set when the user agent is a known crawler. Those rows are still
 * written — they are real traffic and useful — but they never raise a push.
 */
export const visitorSession = pgTable(
  "visitor_session",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    visitorKey: text("visitor_key").notNull(),
    entryPath: text("entry_path"),
    currentPath: text("current_path"),
    referrer: text("referrer"),
    userAgent: text("user_agent"),
    /** Coarse only — never a full IP. See the privacy note in DEVELOPMENT.md. */
    country: text("country"),
    isBot: boolean("is_bot").notNull().default(false),
    /** Set once a push has gone out, so a reconnect never re-alerts. */
    alertedAt: timestamp("alerted_at", { withTimezone: true }),
    pageViews: integer("page_views").notNull().default(1),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("visitor_session_key_idx").on(t.visitorKey),
    index("visitor_session_live_idx").on(t.lastSeenAt),
  ],
);

/**
 * A Web Push subscription — one row per installed admin PWA per device.
 *
 * The endpoint is the natural key: browsers reissue it when it rotates, and a
 * unique index means re-subscribing updates rather than duplicating, so the
 * owner never gets the same notification three times on one phone.
 */
export const pushSubscription = pgTable(
  "push_subscription",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    platform: pushPlatformEnum("platform").notNull().default("web"),
    endpoint: text("endpoint").notNull(),
    /** Web Push encryption material, opaque to us. */
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    label: text("label"),
    /** Cleared to null on a successful send; set when the endpoint 410s so a
     *  dead subscription can be pruned instead of retried forever. */
    failedAt: timestamp("failed_at", { withTimezone: true }),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("push_subscription_endpoint_idx").on(t.endpoint),
    index("push_subscription_user_idx").on(t.userId),
  ],
);

export const user = pgTable(
  "user",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull(),
    name: text("name"),
    passwordHash: text("password_hash"),
    role: userRoleEnum("role").notNull().default("limited"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("user_email_idx").on(t.email)],
);

/**
 * Database-backed admin sessions rather than stateless tokens: this is a back
 * office holding customer addresses and payment records, and the studio needs
 * to be able to revoke access immediately when a laptop goes missing. A JWT
 * cannot be un-issued.
 */
export const session = pgTable(
  "session",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    /** SHA-256 of the cookie value — a database leak must not yield live sessions. */
    tokenHash: text("token_hash").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("session_token_idx").on(t.tokenHash),
    index("session_user_idx").on(t.userId),
  ],
);

/* ===========================================================================
   Relations
   =========================================================================== */

export const pieceRelations = relations(piece, ({ many }) => ({
  images: many(pieceImage),
  specs: many(pieceSpec),
  sizes: many(pieceSize),
  holds: many(hold),
}));

export const pieceImageRelations = relations(pieceImage, ({ one }) => ({
  piece: one(piece, { fields: [pieceImage.pieceId], references: [piece.id] }),
}));

export const pieceSpecRelations = relations(pieceSpec, ({ one }) => ({
  piece: one(piece, { fields: [pieceSpec.pieceId], references: [piece.id] }),
}));

export const pieceSizeRelations = relations(pieceSize, ({ one }) => ({
  piece: one(piece, { fields: [pieceSize.pieceId], references: [piece.id] }),
}));

export const cartRelations = relations(cart, ({ many, one }) => ({
  items: many(cartItem),
  customer: one(customer, {
    fields: [cart.customerId],
    references: [customer.id],
  }),
}));

export const cartItemRelations = relations(cartItem, ({ one }) => ({
  cart: one(cart, { fields: [cartItem.cartId], references: [cart.id] }),
  piece: one(piece, { fields: [cartItem.pieceId], references: [piece.id] }),
}));

export const holdRelations = relations(hold, ({ one }) => ({
  piece: one(piece, { fields: [hold.pieceId], references: [piece.id] }),
  cart: one(cart, { fields: [hold.cartId], references: [cart.id] }),
}));

export const orderRelations = relations(order, ({ many, one }) => ({
  items: many(orderItem),
  events: many(orderEvent),
  notes: many(orderNote),
  customer: one(customer, {
    fields: [order.customerId],
    references: [customer.id],
  }),
}));

export const orderItemRelations = relations(orderItem, ({ one }) => ({
  order: one(order, { fields: [orderItem.orderId], references: [order.id] }),
  piece: one(piece, { fields: [orderItem.pieceId], references: [piece.id] }),
}));

export const orderEventRelations = relations(orderEvent, ({ one }) => ({
  order: one(order, { fields: [orderEvent.orderId], references: [order.id] }),
}));

export const orderNoteRelations = relations(orderNote, ({ one }) => ({
  order: one(order, { fields: [orderNote.orderId], references: [order.id] }),
}));

export const customerRelations = relations(customer, ({ many }) => ({
  orders: many(order),
}));

export const chatSessionRelations = relations(chatSession, ({ many, one }) => ({
  messages: many(chatMessage),
  customer: one(customer, {
    fields: [chatSession.customerId],
    references: [customer.id],
  }),
  assignee: one(user, {
    fields: [chatSession.assignedUserId],
    references: [user.id],
  }),
}));

export const chatMessageRelations = relations(chatMessage, ({ one }) => ({
  session: one(chatSession, {
    fields: [chatMessage.sessionId],
    references: [chatSession.id],
  }),
  piece: one(piece, { fields: [chatMessage.pieceId], references: [piece.id] }),
  author: one(user, { fields: [chatMessage.userId], references: [user.id] }),
}));
