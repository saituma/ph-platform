CREATE TABLE "guardian_feedback" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "guardian_feedback_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"guardian_user_id" integer NOT NULL,
	"subject" varchar(255) NOT NULL,
	"status" varchar(20) NOT NULL DEFAULT 'open',
	"created_at" timestamp NOT NULL DEFAULT now(),
	"updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE "guardian_feedback_reply" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "guardian_feedback_reply_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"feedback_id" integer NOT NULL,
	"sender_id" integer NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp NOT NULL DEFAULT now()
);

ALTER TABLE "guardian_feedback" ADD CONSTRAINT "guardian_feedback_guardian_user_id_users_id_fk" FOREIGN KEY ("guardian_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "guardian_feedback_reply" ADD CONSTRAINT "guardian_feedback_reply_feedback_id_guardian_feedback_id_fk" FOREIGN KEY ("feedback_id") REFERENCES "public"."guardian_feedback"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "guardian_feedback_reply" ADD CONSTRAINT "guardian_feedback_reply_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;

CREATE INDEX "guardian_feedback_user_idx" ON "guardian_feedback" ("guardian_user_id");
CREATE INDEX "guardian_feedback_reply_feedback_idx" ON "guardian_feedback_reply" ("feedback_id");
