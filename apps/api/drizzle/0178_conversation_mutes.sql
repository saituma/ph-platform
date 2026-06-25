CREATE TABLE "conversation_mutes" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "conversation_mutes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer NOT NULL,
	"thread_id" varchar(255) NOT NULL,
	"muted_until" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "conversation_mutes_user_id_thread_id_unique" UNIQUE("user_id","thread_id")
);

ALTER TABLE "conversation_mutes" ADD CONSTRAINT "conversation_mutes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
CREATE INDEX "conversation_mutes_user_id_idx" ON "conversation_mutes" USING btree ("user_id");
