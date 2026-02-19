ALTER TYPE "content_surface" ADD VALUE IF NOT EXISTS 'announcements';
ALTER TYPE "content_surface" ADD VALUE IF NOT EXISTS 'testimonial_submissions';
ALTER TABLE "contents" ALTER COLUMN "body" TYPE text;
