import { PrismaClient, Status, Video, MetaData } from "@prisma/client";

const prisma = new PrismaClient();

type VideoAndMetaData = Video & { metadata: MetaData | null };

export async function createVideo(
  uploadedBy: string,
  title: string,
  orgId: string
): Promise<string> {
  const newVideo = await prisma.video.create({
    data: {
      uploadedBy,
      title,
      orgId,
    },
  });
  return newVideo.id;
}

export async function setVideoStatus(videoId: string, status: Status) {
  await prisma.video.update({
    where: {
      id: videoId,
    },
    data: {
      status,
    },
  });
}

export async function addVideoMetadata(
  videoId: string,
  duration: number,
  bitrate: number,
  width: number,
  height: number,
  framerate: number,
  audioSampleRate: number
) {
  await prisma.metaData.create({
    data: {
      videoId,
      duration,
      bitrate,
      width,
      height,
      framerate,
      audioSampleRate,
    },
  });
}

export async function getVideo(
  videoId: string
): Promise<VideoAndMetaData | null> {
  return await prisma.video.findUnique({
    where: { id: videoId },
    include: { metadata: true },
  });
}

export async function getAllVideos(orgId: string): Promise<VideoAndMetaData[]> {
  return await prisma.video.findMany({
    where: { orgId: orgId },
    include: { metadata: true },
  });
}

export async function setError(videoId: string, msg: string) {
  return await prisma.video.update({
    where: { id: videoId },
    data: { error: msg, status: Status.ERROR },
  });
}

export async function deleteVideo(videoId: string) {
  await prisma.video.delete({ where: { id: videoId } });
}

export { Status as status } from "@prisma/client";
