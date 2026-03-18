ALTER TABLE "program_section_contents" ADD COLUMN "allowVideoUpload" boolean DEFAULT false;
ALTER TABLE "video_uploads" ADD COLUMN "programSectionContentId" integer;
ALTER TABLE "video_uploads" ADD CONSTRAINT "video_uploads_programSectionContentId_program_section_contents_id_fk" FOREIGN KEY ("programSectionContentId") REFERENCES "public"."program_section_contents"("id") ON DELETE set null;
