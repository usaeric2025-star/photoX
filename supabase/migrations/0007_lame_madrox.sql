CREATE INDEX IF NOT EXISTS "idx_tasks_status" ON "tasks" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_tasks_created_at" ON "tasks" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_tasks_user_id" ON "tasks" USING btree ("user_id");