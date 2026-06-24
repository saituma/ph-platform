ALTER TYPE "content_surface" ADD VALUE IF NOT EXISTS 'news';
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "news_comments" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "content_id" integer NOT NULL REFERENCES "contents"("id") ON DELETE cascade,
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "content" text NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "news_comments_content_idx" ON "news_comments" ("content_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "news_comments_user_idx" ON "news_comments" ("user_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "news_likes" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "content_id" integer NOT NULL REFERENCES "contents"("id") ON DELETE cascade,
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "created_at" timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "news_likes_content_user_unique" ON "news_likes" ("content_id", "user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "news_likes_content_idx" ON "news_likes" ("content_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "news_likes_user_idx" ON "news_likes" ("user_id");
