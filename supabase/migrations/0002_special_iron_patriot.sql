ALTER TABLE "photo_tags" ALTER COLUMN "tag_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "tags" ALTER COLUMN "id" SET DATA TYPE serial;--> statement-breakpoint
ALTER TABLE "tags" ALTER COLUMN "id" DROP DEFAULT;