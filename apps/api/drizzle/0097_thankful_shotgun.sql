CREATE TABLE "chat_group_message_receipts" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "chat_group_message_receipts_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"messageId" integer NOT NULL,
	"userId" integer NOT NULL,
	"deliveredAt" timestamp DEFAULT now() NOT NULL,
	"readAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "message_receipts" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "message_receipts_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"messageId" integer NOT NULL,
	"userId" integer NOT NULL,
	"deliveredAt" timestamp DEFAULT now() NOT NULL,
	"readAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX "nutrition_logs_user_date_unique";--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "timezoneOffsetMinutes" integer;--> statement-breakpoint
ALTER TABLE "chat_group_messages" ADD COLUMN "clientMessageId" varchar(96);--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "clientMessageId" varchar(96);--> statement-breakpoint
ALTER TABLE "nutrition_logs" ADD COLUMN "mealType" varchar(30) DEFAULT 'daily' NOT NULL;--> statement-breakpoint
ALTER TABLE "nutrition_logs" ADD COLUMN "loggedAt" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "chat_group_message_receipts" ADD CONSTRAINT "chat_group_message_receipts_messageId_chat_group_messages_id_fk" FOREIGN KEY ("messageId") REFERENCES "public"."chat_group_messages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_group_message_receipts" ADD CONSTRAINT "chat_group_message_receipts_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_receipts" ADD CONSTRAINT "message_receipts_messageId_messages_id_fk" FOREIGN KEY ("messageId") REFERENCES "public"."messages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_receipts" ADD CONSTRAINT "message_receipts_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "chat_group_message_receipts_message_user_unique" ON "chat_group_message_receipts" USING btree ("messageId","userId");--> statement-breakpoint
CREATE INDEX "chat_group_message_receipts_message_read_idx" ON "chat_group_message_receipts" USING btree ("messageId","readAt");--> statement-breakpoint
CREATE INDEX "chat_group_message_receipts_user_read_idx" ON "chat_group_message_receipts" USING btree ("userId","readAt");--> statement-breakpoint
CREATE UNIQUE INDEX "message_receipts_message_user_unique" ON "message_receipts" USING btree ("messageId","userId");--> statement-breakpoint
CREATE INDEX "message_receipts_message_read_idx" ON "message_receipts" USING btree ("messageId","readAt");--> statement-breakpoint
CREATE INDEX "message_receipts_user_read_idx" ON "message_receipts" USING btree ("userId","readAt");--> statement-breakpoint
CREATE INDEX "chat_group_messages_group_created_at_idx" ON "chat_group_messages" USING btree ("groupId","createdAt");--> statement-breakpoint
CREATE UNIQUE INDEX "chat_group_messages_group_sender_client_unique" ON "chat_group_messages" USING btree ("groupId","senderId","clientMessageId");--> statement-breakpoint
CREATE INDEX "messages_receiver_created_at_idx" ON "messages" USING btree ("receiverId","createdAt");--> statement-breakpoint
CREATE UNIQUE INDEX "messages_sender_receiver_client_unique" ON "messages" USING btree ("senderId","receiverId","clientMessageId");--> statement-breakpoint
CREATE UNIQUE INDEX "nutrition_logs_user_date_meal_unique" ON "nutrition_logs" USING btree ("userId","dateKey","mealType");--> statement-breakpoint
CREATE INDEX "nutrition_logs_user_date_idx" ON "nutrition_logs" USING btree ("userId","dateKey");