CREATE TYPE "public"."availability" AS ENUM('unique', 'order', 'draft', 'archived');--> statement-breakpoint
CREATE TYPE "public"."category" AS ENUM('ooak', 'fine');--> statement-breakpoint
CREATE TYPE "public"."enquiry_reason" AS ENUM('visit', 'piece', 'commission', 'repair');--> statement-breakpoint
CREATE TYPE "public"."image_role" AS ENUM('primary', 'detail', 'onbody', 'scale');--> statement-breakpoint
CREATE TYPE "public"."material_kind" AS ENUM('stone', 'metal', 'heirloom');--> statement-breakpoint
CREATE TYPE "public"."material_status" AS ENUM('loose', 'set', 'reserved', 'in_stock', 'low', 'client_owned');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('enquiry', 'paid', 'in_studio', 'dispatched', 'delivered', 'refunded', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('owner', 'admin', 'limited');--> statement-breakpoint
CREATE TABLE "cart" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token" text NOT NULL,
	"customer_id" uuid,
	"note" text,
	"promo_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cart_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cart_id" uuid NOT NULL,
	"piece_id" uuid NOT NULL,
	"size" text,
	"engraving" text,
	"gift_wrap" boolean DEFAULT false NOT NULL,
	"unit_price_cents" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"location" text,
	"note" text,
	"ring_size" text,
	"metal_preference" text,
	"last_seen_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "enquiry" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"reason" "enquiry_reason" DEFAULT 'visit' NOT NULL,
	"message" text NOT NULL,
	"piece_id" uuid,
	"answered_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hold" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"piece_id" uuid NOT NULL,
	"cart_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"released_at" timestamp with time zone,
	"order_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "material" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ref" text NOT NULL,
	"name" text NOT NULL,
	"kind" "material_kind" DEFAULT 'stone' NOT NULL,
	"origin" text,
	"acquired_at" timestamp with time zone,
	"qty" integer DEFAULT 1 NOT NULL,
	"unit" text DEFAULT 'ct' NOT NULL,
	"cost_cents" integer,
	"status" "material_status" DEFAULT 'loose' NOT NULL,
	"reorder_point" integer
);
--> statement-breakpoint
CREATE TABLE "material_use" (
	"material_id" uuid NOT NULL,
	"piece_id" uuid NOT NULL,
	"qty" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "material_use_material_id_piece_id_pk" PRIMARY KEY("material_id","piece_id")
);
--> statement-breakpoint
CREATE TABLE "order" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"number" text NOT NULL,
	"customer_id" uuid,
	"status" "order_status" DEFAULT 'enquiry' NOT NULL,
	"subtotal_cents" integer NOT NULL,
	"shipping_cents" integer DEFAULT 0 NOT NULL,
	"tax_cents" integer DEFAULT 0 NOT NULL,
	"total_cents" integer NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"payment_provider" text,
	"payment_ref" text,
	"lookup_token" text NOT NULL,
	"shipping_address" text,
	"placed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"type" text NOT NULL,
	"body" text,
	"actor" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"piece_id" uuid,
	"name" text NOT NULL,
	"reference" text NOT NULL,
	"material_line" text NOT NULL,
	"size" text,
	"engraving" text,
	"gift_wrap" boolean DEFAULT false NOT NULL,
	"unit_price_cents" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_note" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"body" text NOT NULL,
	"author" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "piece" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"reference" text NOT NULL,
	"name" text NOT NULL,
	"category" "category" NOT NULL,
	"availability" "availability" DEFAULT 'draft' NOT NULL,
	"price_cents" integer NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"material_line" text NOT NULL,
	"story" text DEFAULT '' NOT NULL,
	"season" text,
	"filter_tag" text DEFAULT 'Rings' NOT NULL,
	"size_note" text,
	"sold_at" timestamp with time zone,
	"sort_index" integer DEFAULT 0 NOT NULL,
	"views" integer DEFAULT 0 NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "piece_image" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"piece_id" uuid NOT NULL,
	"url" text NOT NULL,
	"alt" text NOT NULL,
	"role" "image_role" DEFAULT 'detail' NOT NULL,
	"width" integer,
	"height" integer,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "piece_related" (
	"piece_id" uuid NOT NULL,
	"related_id" uuid NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "piece_related_piece_id_related_id_pk" PRIMARY KEY("piece_id","related_id")
);
--> statement-breakpoint
CREATE TABLE "piece_size" (
	"piece_id" uuid NOT NULL,
	"label" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "piece_size_piece_id_label_pk" PRIMARY KEY("piece_id","label")
);
--> statement-breakpoint
CREATE TABLE "piece_spec" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"piece_id" uuid NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"studio_name" text DEFAULT 'Brand Name' NOT NULL,
	"studio_email" text DEFAULT 'studio@example.com' NOT NULL,
	"studio_phone" text,
	"studio_address" text,
	"hold_window_minutes" integer DEFAULT 60 NOT NULL,
	"tax_rate_bps" integer DEFAULT 750 NOT NULL,
	"insured_shipping" boolean DEFAULT true NOT NULL,
	"accept_wire_transfer" boolean DEFAULT true NOT NULL,
	"show_prices_publicly" boolean DEFAULT true NOT NULL,
	"accept_commissions" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "settings_singleton" CHECK ("settings"."id" = 1)
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"password_hash" text,
	"role" "user_role" DEFAULT 'limited' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cart" ADD CONSTRAINT "cart_customer_id_customer_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customer"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_item" ADD CONSTRAINT "cart_item_cart_id_cart_id_fk" FOREIGN KEY ("cart_id") REFERENCES "public"."cart"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_item" ADD CONSTRAINT "cart_item_piece_id_piece_id_fk" FOREIGN KEY ("piece_id") REFERENCES "public"."piece"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enquiry" ADD CONSTRAINT "enquiry_piece_id_piece_id_fk" FOREIGN KEY ("piece_id") REFERENCES "public"."piece"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hold" ADD CONSTRAINT "hold_piece_id_piece_id_fk" FOREIGN KEY ("piece_id") REFERENCES "public"."piece"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hold" ADD CONSTRAINT "hold_cart_id_cart_id_fk" FOREIGN KEY ("cart_id") REFERENCES "public"."cart"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_use" ADD CONSTRAINT "material_use_material_id_material_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."material"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_use" ADD CONSTRAINT "material_use_piece_id_piece_id_fk" FOREIGN KEY ("piece_id") REFERENCES "public"."piece"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order" ADD CONSTRAINT "order_customer_id_customer_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customer"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_event" ADD CONSTRAINT "order_event_order_id_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."order"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_item" ADD CONSTRAINT "order_item_order_id_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."order"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_item" ADD CONSTRAINT "order_item_piece_id_piece_id_fk" FOREIGN KEY ("piece_id") REFERENCES "public"."piece"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_note" ADD CONSTRAINT "order_note_order_id_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."order"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "piece_image" ADD CONSTRAINT "piece_image_piece_id_piece_id_fk" FOREIGN KEY ("piece_id") REFERENCES "public"."piece"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "piece_related" ADD CONSTRAINT "piece_related_piece_id_piece_id_fk" FOREIGN KEY ("piece_id") REFERENCES "public"."piece"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "piece_related" ADD CONSTRAINT "piece_related_related_id_piece_id_fk" FOREIGN KEY ("related_id") REFERENCES "public"."piece"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "piece_size" ADD CONSTRAINT "piece_size_piece_id_piece_id_fk" FOREIGN KEY ("piece_id") REFERENCES "public"."piece"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "piece_spec" ADD CONSTRAINT "piece_spec_piece_id_piece_id_fk" FOREIGN KEY ("piece_id") REFERENCES "public"."piece"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "cart_token_idx" ON "cart" USING btree ("token");--> statement-breakpoint
CREATE UNIQUE INDEX "cart_item_unique_idx" ON "cart_item" USING btree ("cart_id","piece_id");--> statement-breakpoint
CREATE UNIQUE INDEX "customer_email_idx" ON "customer" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "hold_one_live_per_piece_idx" ON "hold" USING btree ("piece_id") WHERE "hold"."released_at" is null;--> statement-breakpoint
CREATE INDEX "hold_expiry_idx" ON "hold" USING btree ("expires_at") WHERE "hold"."released_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "material_ref_idx" ON "material" USING btree ("ref");--> statement-breakpoint
CREATE UNIQUE INDEX "order_number_idx" ON "order" USING btree ("number");--> statement-breakpoint
CREATE UNIQUE INDEX "order_lookup_idx" ON "order" USING btree ("lookup_token");--> statement-breakpoint
CREATE INDEX "order_status_idx" ON "order" USING btree ("status","placed_at");--> statement-breakpoint
CREATE INDEX "order_event_order_idx" ON "order_event" USING btree ("order_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "piece_slug_idx" ON "piece" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "piece_reference_idx" ON "piece" USING btree ("reference");--> statement-breakpoint
CREATE INDEX "piece_listing_idx" ON "piece" USING btree ("category","availability","sort_index");--> statement-breakpoint
CREATE INDEX "piece_image_piece_idx" ON "piece_image" USING btree ("piece_id","position");--> statement-breakpoint
CREATE INDEX "piece_spec_piece_idx" ON "piece_spec" USING btree ("piece_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "user_email_idx" ON "user" USING btree ("email");