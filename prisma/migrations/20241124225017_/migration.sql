/*
  Warnings:

  - You are about to drop the column `name` on the `MetaData` table. All the data in the column will be lost.
  - Added the required column `name` to the `Video` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "Status" ADD VALUE 'PENDING';

-- AlterTable
ALTER TABLE "MetaData" DROP COLUMN "name";

-- AlterTable
ALTER TABLE "Video" ADD COLUMN     "name" TEXT NOT NULL,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "error" DROP NOT NULL;
DROP SEQUENCE "Video_id_seq";
