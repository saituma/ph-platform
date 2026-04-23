CREATE TABLE "social_post_comments" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "social_post_comments_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"post_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"content" text NOT NULL,
	"parent_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "social_post_likes" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "social_post_likes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"post_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "social_posts" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "social_posts_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer NOT NULL,
	"content" text NOT NULL,
	"media_url" varchar(500),
	"media_type" varchar(20),
	"visibility" varchar(20) DEFAULT 'public' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "social_post_comments" ADD CONSTRAINT "social_post_comments_post_id_social_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."social_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_post_comments" ADD CONSTRAINT "social_post_comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_post_comments" ADD CONSTRAINT "social_post_comments_parent_id_social_post_comments_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."social_post_comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_post_likes" ADD CONSTRAINT "social_post_likes_post_id_social_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."social_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_post_likes" ADD CONSTRAINT "social_post_likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_posts" ADD CONSTRAINT "social_posts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "social_post_comments_post_idx" ON "social_post_comments" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "social_post_comments_parent_idx" ON "social_post_comments" USING btree ("parent_id");--> statement-breakpoint
CREATE UNIQUE INDEX "social_post_likes_post_user_unique" ON "social_post_likes" USING btree ("post_id","user_id");--> statement-breakpoint
CREATE INDEX "social_post_likes_post_idx" ON "social_post_likes" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "social_post_likes_user_idx" ON "social_post_likes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "social_posts_user_idx" ON "social_posts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "social_posts_created_at_idx" ON "social_posts" USING btree ("created_at");
