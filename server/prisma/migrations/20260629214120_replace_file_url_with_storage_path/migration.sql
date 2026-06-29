/*
  Warnings:

  - You are about to drop the column `file_url` on the `personal_materials` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "personal_materials" DROP COLUMN "file_url",
ADD COLUMN     "storage_path" TEXT;
