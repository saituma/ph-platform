CREATE TABLE "user_device_tokens" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "user_device_tokens_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer NOT NULL,
	"device_id" varchar(255) NOT NULL,
	"expo_push_token" varchar(255),
	"device_push_token" text,
	"device_push_token_type" varchar(20),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_device_tokens_user_id_device_id_unique" UNIQUE("user_id","device_id")
);

ALTER TABLE "user_device_tokens" ADD CONSTRAINT "user_device_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
CREATE INDEX "user_device_tokens_user_id_idx" ON "user_device_tokens" USING btree ("user_id");
