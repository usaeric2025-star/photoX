ALTER TABLE "furniture_items" DROP CONSTRAINT "furniture_items_category_id_categories_id_fk";
--> statement-breakpoint
ALTER TABLE "furniture_items" DROP CONSTRAINT "furniture_items_manufacturer_id_manufacturers_id_fk";
--> statement-breakpoint
ALTER TABLE "furniture_items" DROP CONSTRAINT "furniture_items_group_id_groups_id_fk";
--> statement-breakpoint
ALTER TABLE "furniture_items" ADD CONSTRAINT "furniture_items_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "furniture_items" ADD CONSTRAINT "furniture_items_manufacturer_id_manufacturers_id_fk" FOREIGN KEY ("manufacturer_id") REFERENCES "public"."manufacturers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "furniture_items" ADD CONSTRAINT "furniture_items_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE set null ON UPDATE no action;