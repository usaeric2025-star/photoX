CREATE TABLE IF NOT EXISTS "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"label" text NOT NULL,
	"type" text NOT NULL,
	"status" text NOT NULL,
	"meta" jsonb,
	"data" jsonb,
	"user_id" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "categories" ALTER COLUMN "id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "categories" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "furniture_items" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "furniture_items" ALTER COLUMN "user_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "furniture_items" ALTER COLUMN "category_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "furniture_items" ALTER COLUMN "price" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "groups" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "groups" ALTER COLUMN "status" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "groups" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "manufacturers" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "furniture_items" ADD COLUMN IF NOT EXISTS "metadata" jsonb;--> statement-breakpoint
ALTER TABLE "furniture_items" ADD COLUMN IF NOT EXISTS "name_searchable" text;--> statement-breakpoint
ALTER TABLE "groups" ADD COLUMN IF NOT EXISTS "is_hidden" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "manufacturers" ADD COLUMN IF NOT EXISTS "aliases" text[];--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "whatsapp_1" text;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "whatsapp_2" text;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "whatsapp_1_name" text;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "whatsapp_2_name" text;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "categories_json" jsonb;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "tags_json" jsonb;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "manufacturers_json" jsonb;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "primary_color" text;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "background_color" text;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "accent_color" text;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "contact_email" text;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "instagram" text;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "facebook" text;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "access_passcode" text;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "passcode_enabled" boolean;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "hot_tag_threshold" integer;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "hot_tags_count" integer;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "openrouter_model" text;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "agnes_model" text;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "tags" ADD COLUMN IF NOT EXISTS "is_pinned" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "tags" ADD COLUMN IF NOT EXISTS "usage_count" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "tags" ADD COLUMN IF NOT EXISTS "is_hot" boolean DEFAULT false;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_audit_logs_photo_id_idx" ON "ai_audit_logs" USING btree ("photo_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_audit_logs_created_at_idx" ON "ai_audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "furniture_items_user_id_created_at_idx" ON "furniture_items" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "furniture_items_group_id_idx" ON "furniture_items" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "furniture_items_category_id_idx" ON "furniture_items" USING btree ("category_id");--> statement-breakpoint
ALTER TABLE "furniture_items" DROP COLUMN IF EXISTS "thumb_hash";--> statement-breakpoint
ALTER TABLE "manufacturers" DROP COLUMN IF EXISTS "updated_at";--> statement-breakpoint
ALTER TABLE "tags" DROP COLUMN IF EXISTS "aliases";--> statement-breakpoint
ALTER TABLE "tags" DROP COLUMN IF EXISTS "is_global";--> statement-breakpoint
ALTER TABLE "tags" DROP COLUMN IF EXISTS "hot_score";--> statement-breakpoint
ALTER TABLE "tags" DROP COLUMN IF EXISTS "sort_order";--> statement-breakpoint
ALTER TABLE "tags" DROP COLUMN IF EXISTS "is_active";--> statement-breakpoint
ALTER TABLE "tags" DROP COLUMN IF EXISTS "updated_at";