-- CreateEnum
CREATE TYPE "MaterialType" AS ENUM ('NOTE', 'LINK', 'FILE');

-- CreateTable
CREATE TABLE "personal_materials" (
    "id" UUID NOT NULL,
    "subject_id" UUID NOT NULL,
    "type" "MaterialType" NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT,
    "url" TEXT,
    "file_name" TEXT,
    "file_url" TEXT,
    "mime_type" TEXT,
    "file_size" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "personal_materials_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "personal_materials_subject_id_idx" ON "personal_materials"("subject_id");

-- CreateIndex
CREATE INDEX "personal_materials_type_idx" ON "personal_materials"("type");

-- AddForeignKey
ALTER TABLE "personal_materials" ADD CONSTRAINT "personal_materials_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "personal_subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
