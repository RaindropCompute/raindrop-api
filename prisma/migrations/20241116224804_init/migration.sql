-- CreateEnum
CREATE TYPE "Status" AS ENUM ('UPLOADED', 'IN_PROGRESS', 'FINISHED', 'ERROR');

-- CreateTable
CREATE TABLE "Video" (
    "id" SERIAL NOT NULL,
    "uploadTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "Status" NOT NULL DEFAULT 'UPLOADED',
    "error" TEXT NOT NULL,
    "uploadedBy" INTEGER NOT NULL,

    CONSTRAINT "Video_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetaData" (
    "name" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "bitrate" INTEGER NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "framerate" INTEGER NOT NULL,
    "audioSampleRate" INTEGER NOT NULL,
    "videoId" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "MetaData_videoId_key" ON "MetaData"("videoId");

-- AddForeignKey
ALTER TABLE "MetaData" ADD CONSTRAINT "MetaData_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
