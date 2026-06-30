-- AlterEnum
ALTER TYPE "StudyGroupRole" ADD VALUE 'EDITOR';

-- AlterTable
ALTER TABLE "study_group_topics" ADD COLUMN     "created_by_id" UUID;

-- CreateIndex
CREATE INDEX "study_group_topics_created_by_id_idx" ON "study_group_topics"("created_by_id");

-- AddForeignKey
ALTER TABLE "study_group_topics" ADD CONSTRAINT "study_group_topics_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
