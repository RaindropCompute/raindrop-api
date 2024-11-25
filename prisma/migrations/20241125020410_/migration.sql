/*
  Warnings:

  - Changed the type of `bitrate` on the `MetaData` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `audioSampleRate` on the `MetaData` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "MetaData" DROP COLUMN "bitrate",
ADD COLUMN     "bitrate" DOUBLE PRECISION NOT NULL,
ALTER COLUMN "framerate" SET DATA TYPE DOUBLE PRECISION,
DROP COLUMN "audioSampleRate",
ADD COLUMN     "audioSampleRate" DOUBLE PRECISION NOT NULL;

-- AlterTable
ALTER TABLE "Video" ALTER COLUMN "uploadedBy" SET DATA TYPE TEXT;
