ALTER TABLE "admin_settings" DROP CONSTRAINT "admin_settings_userId_users_id_fk";
--> statement-breakpoint
ALTER TABLE "athletes" DROP CONSTRAINT "athletes_userId_users_id_fk";
--> statement-breakpoint
ALTER TABLE "athletes" DROP CONSTRAINT "athletes_guardianId_guardians_id_fk";
--> statement-breakpoint
ALTER TABLE "chat_group_messages" DROP CONSTRAINT "chat_group_messages_senderId_users_id_fk";
--> statement-breakpoint
ALTER TABLE "chat_groups" DROP CONSTRAINT "chat_groups_createdBy_users_id_fk";
--> statement-breakpoint
ALTER TABLE "message_reactions" DROP CONSTRAINT "message_reactions_userId_users_id_fk";
--> statement-breakpoint
ALTER TABLE "message_receipts" DROP CONSTRAINT "message_receipts_userId_users_id_fk";
--> statement-breakpoint
ALTER TABLE "messages" DROP CONSTRAINT "messages_senderId_users_id_fk";
--> statement-breakpoint
ALTER TABLE "messages" DROP CONSTRAINT "messages_receiverId_users_id_fk";
--> statement-breakpoint
ALTER TABLE "run_logs" DROP CONSTRAINT "run_logs_userId_users_id_fk";
--> statement-breakpoint
ALTER TABLE "user_locations" DROP CONSTRAINT "user_locations_userId_users_id_fk";
--> statement-breakpoint
ALTER TABLE "chat_groups" ALTER COLUMN "createdBy" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "admin_settings" ADD CONSTRAINT "admin_settings_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "athletes" ADD CONSTRAINT "athletes_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "athletes" ADD CONSTRAINT "athletes_guardianId_guardians_id_fk" FOREIGN KEY ("guardianId") REFERENCES "public"."guardians"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_group_messages" ADD CONSTRAINT "chat_group_messages_senderId_users_id_fk" FOREIGN KEY ("senderId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_groups" ADD CONSTRAINT "chat_groups_createdBy_users_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guardians" ADD CONSTRAINT "guardians_activeAthleteId_athletes_id_fk" FOREIGN KEY ("activeAthleteId") REFERENCES "public"."athletes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_reactions" ADD CONSTRAINT "message_reactions_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_receipts" ADD CONSTRAINT "message_receipts_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_senderId_users_id_fk" FOREIGN KEY ("senderId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_receiverId_users_id_fk" FOREIGN KEY ("receiverId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "run_logs" ADD CONSTRAINT "run_logs_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_locations" ADD CONSTRAINT "user_locations_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;