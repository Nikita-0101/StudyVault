-- CreateTable
CREATE TABLE "study_group_topics" (
    "id" UUID NOT NULL,
    "group_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "study_group_topics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "study_group_topics_group_id_position_idx" ON "study_group_topics"("group_id", "position");

-- AddForeignKey
ALTER TABLE "study_group_topics" ADD CONSTRAINT "study_group_topics_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "study_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
