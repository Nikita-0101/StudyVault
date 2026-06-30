-- CreateEnum
CREATE TYPE "StudyGroupRole" AS ENUM ('OWNER', 'MEMBER');

-- CreateTable
CREATE TABLE "study_groups" (
    "id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "invite_code" VARCHAR(12) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "study_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "study_group_members" (
    "id" UUID NOT NULL,
    "group_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "StudyGroupRole" NOT NULL DEFAULT 'MEMBER',
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "study_group_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "study_groups_invite_code_key" ON "study_groups"("invite_code");

-- CreateIndex
CREATE INDEX "study_groups_owner_id_idx" ON "study_groups"("owner_id");

-- CreateIndex
CREATE INDEX "study_group_members_user_id_idx" ON "study_group_members"("user_id");

-- CreateIndex
CREATE INDEX "study_group_members_group_id_role_idx" ON "study_group_members"("group_id", "role");

-- CreateIndex
CREATE UNIQUE INDEX "study_group_members_group_id_user_id_key" ON "study_group_members"("group_id", "user_id");

-- AddForeignKey
ALTER TABLE "study_groups" ADD CONSTRAINT "study_groups_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_group_members" ADD CONSTRAINT "study_group_members_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "study_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_group_members" ADD CONSTRAINT "study_group_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
