/*
  Warnings:

  - You are about to drop the column `orgId` on the `Video` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "MetaData" ADD CONSTRAINT "MetaData_pkey" PRIMARY KEY ("videoId");

-- AlterTable
ALTER TABLE "Video" DROP COLUMN "orgId",
ALTER COLUMN "status" SET DEFAULT 'PENDING';
