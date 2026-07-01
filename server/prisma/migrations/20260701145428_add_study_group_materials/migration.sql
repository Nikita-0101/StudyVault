-- CreateTable
CREATE TABLE "study_group_materials" (
    "id" UUID NOT NULL,
    "topic_id" UUID NOT NULL,
    "created_by_id" UUID,
    "type" "MaterialType" NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT,
    "url" TEXT,
    "file_name" TEXT,
    "storage_path" TEXT,
    "mime_type" TEXT,
    "file_size" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "study_group_materials_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "study_group_materials_topic_id_created_at_idx" ON "study_group_materials"("topic_id", "created_at");

-- CreateIndex
CREATE INDEX "study_group_materials_created_by_id_idx" ON "study_group_materials"("created_by_id");

-- CreateIndex
CREATE INDEX "study_group_materials_type_idx" ON "study_group_materials"("type");

-- AddForeignKey
ALTER TABLE "study_group_materials" ADD CONSTRAINT "study_group_materials_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "study_group_topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_group_materials" ADD CONSTRAINT "study_group_materials_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
