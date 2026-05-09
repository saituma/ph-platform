CREATE TABLE "story_views" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "story_views_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"storyId" integer NOT NULL,
	"userId" integer NOT NULL,
	"viewedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "story_views_unique" UNIQUE("storyId","userId")
);
--> statement-breakpoint
ALTER TABLE "story_views" ADD CONSTRAINT "story_views_storyId_stories_id_fk" FOREIGN KEY ("storyId") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_views" ADD CONSTRAINT "story_views_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "story_views_story_idx" ON "story_views" USING btree ("storyId");--> statement-breakpoint
CREATE INDEX "story_views_user_idx" ON "story_views" USING btree ("userId");
