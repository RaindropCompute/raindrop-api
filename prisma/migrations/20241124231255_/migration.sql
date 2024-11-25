/*
  Warnings:

  - The primary key for the `Video` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- DropForeignKey
ALTER TABLE "MetaData" DROP CONSTRAINT "MetaData_videoId_fkey";

-- AlterTable
ALTER TABLE "MetaData" ALTER COLUMN "videoId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "Video" DROP CONSTRAINT "Video_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "Video_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "video_id_seq";

-- AddForeignKey
ALTER TABLE "MetaData" ADD CONSTRAINT "MetaData_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
