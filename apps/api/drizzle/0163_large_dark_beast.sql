ALTER TABLE "legal_acceptances" ADD COLUMN "waiverAcceptedAt" timestamp;--> statement-breakpoint
ALTER TABLE "legal_acceptances" ADD COLUMN "waiverVersion" varchar(255);--> statement-breakpoint
ALTER TABLE "legal_acceptances" ADD COLUMN "mediaConsent" boolean;--> statement-breakpoint
ALTER TABLE "legal_acceptances" ADD COLUMN "mediaConsentAt" timestamp;--> statement-breakpoint
ALTER TABLE "legal_acceptances" ADD COLUMN "parentConsentAt" timestamp;--> statement-breakpoint
ALTER TABLE "legal_acceptances" ADD COLUMN "healthFormCompletedAt" timestamp;--> statement-breakpoint
ALTER TABLE "legal_acceptances" ADD COLUMN "consentIp" varchar(100);