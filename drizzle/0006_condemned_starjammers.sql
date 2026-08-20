CREATE TYPE "public"."chat_message_kind" AS ENUM('text', 'piece');--> statement-breakpoint
CREATE TYPE "public"."chat_sender" AS ENUM('visitor', 'studio', 'system');--> statement-breakpoint
CREATE TYPE "public"."chat_status" AS ENUM('open', 'closed');--> statement-breakpoint
CREATE TYPE "public"."push_platform" AS ENUM('web', 'ios', 'android');--> statement-breakpoint
CREATE TABLE "chat_message" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"sender" "chat_sender" NOT NULL,
	"kind" "chat_message_kind" DEFAULT 'text' NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"piece_id" uuid,
	"user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_session" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"visitor_key" text NOT NULL,
	"customer_id" uuid,
	"visitor_name" text,
	"visitor_email" text,
	"status" "chat_status" DEFAULT 'open' NOT NULL,
	"assigned_user_id" uuid,
	"entry_path" text,
	"last_message_at" timestamp with time zone,
	"studio_read_at" timestamp with time zone,
	"visitor_read_at" timestamp with time zone,
	"closed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "push_subscription" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"platform" "push_platform" DEFAULT 'web' NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"label" text,
	"failed_at" timestamp with time zone,
	"last_used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "visitor_session" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"visitor_key" text NOT NULL,
	"entry_path" text,
	"current_path" text,
	"referrer" text,
	"user_agent" text,
	"country" text,
	"is_bot" boolean DEFAULT false NOT NULL,
	"alerted_at" timestamp with time zone,
	"page_views" integer DEFAULT 1 NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "chat_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "chat_hours_start" integer DEFAULT 10 NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "chat_hours_end" integer DEFAULT 18 NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "chat_timezone" text DEFAULT 'America/Los_Angeles' NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "notify_on_visitor" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "chat_message" ADD CONSTRAINT "chat_message_session_id_chat_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."chat_session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_message" ADD CONSTRAINT "chat_message_piece_id_piece_id_fk" FOREIGN KEY ("piece_id") REFERENCES "public"."piece"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_message" ADD CONSTRAINT "chat_message_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_session" ADD CONSTRAINT "chat_session_customer_id_customer_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customer"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_session" ADD CONSTRAINT "chat_session_assigned_user_id_user_id_fk" FOREIGN KEY ("assigned_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscription" ADD CONSTRAINT "push_subscription_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chat_message_session_idx" ON "chat_message" USING btree ("session_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "chat_session_one_open_per_visitor_idx" ON "chat_session" USING btree ("visitor_key") WHERE "chat_session"."closed_at" is null;--> statement-breakpoint
CREATE INDEX "chat_session_inbox_idx" ON "chat_session" USING btree ("status","last_message_at");--> statement-breakpoint
CREATE UNIQUE INDEX "push_subscription_endpoint_idx" ON "push_subscription" USING btree ("endpoint");--> statement-breakpoint
CREATE INDEX "push_subscription_user_idx" ON "push_subscription" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "visitor_session_key_idx" ON "visitor_session" USING btree ("visitor_key");--> statement-breakpoint
CREATE INDEX "visitor_session_live_idx" ON "visitor_session" USING btree ("last_seen_at");