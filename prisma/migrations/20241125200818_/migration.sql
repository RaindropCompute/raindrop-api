-- CreateEnum
CREATE TYPE "Status" AS ENUM ('PENDING', 'UPLOADED', 'IN_PROGRESS', 'FINISHED', 'ERROR');

-- CreateTable
CREATE TABLE "Video" (
    "id" TEXT NOT NULL,
    "uploadTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "Status" NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "uploadedBy" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,

    CONSTRAINT "Video_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetaData" (
    "duration" DOUBLE PRECISION NOT NULL,
    "bitrate" DOUBLE PRECISION NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "framerate" DOUBLE PRECISION NOT NULL,
    "audioSampleRate" DOUBLE PRECISION NOT NULL,
    "videoId" TEXT NOT NULL,

    CONSTRAINT "MetaData_pkey" PRIMARY KEY ("videoId")
);

-- CreateIndex
CREATE UNIQUE INDEX "MetaData_videoId_key" ON "MetaData"("videoId");

-- AddForeignKey
ALTER TABLE "MetaData" ADD CONSTRAINT "MetaData_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
