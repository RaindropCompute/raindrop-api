import express from "express";
import mime from "mime";
import { minioClient } from "../lib/minio.js";
import { Readable } from "node:stream";
import * as db from "../lib/database.js";
import { ApiError, withValidation } from "../lib/validation.js";
import { z } from "zod";
import { connection } from "../lib/amqp.js";
import { clerkClient } from "@clerk/express";

export const videoRouter = express.Router();

videoRouter.post(
  "/",
  withValidation(
    z.object({
      title: z.string(),
      url: z.string().optional(),
    }),
    async (
      { title, url },
      req
    ): Promise<{
      id: string;
      uploadUrl?: string;
    }> => {
      if (url) {
        const resp = await fetch(url);

        const contentType = resp.headers.get("content-type");
        const extention = contentType && mime.getExtension(contentType);
        if (!extention) {
          throw new ApiError(400, {
            message: "Could not determine file type",
          });
        }
        if (!resp.ok) {
          throw new ApiError(400, {
            message: `Got status code ${resp.status} downloading video`,
            response: await resp.text(),
          });
        }

        const videoId = await db.createVideo(
          req.auth.userId,
          title,
          req.auth.orgId ?? req.auth.userId
        );

        const originalKey = `${videoId}/original.${extention}`;
        await minioClient.putObject(
          process.env.MINIO_BUCKET!,
          originalKey,
          Readable.fromWeb(resp.body as any)
        );

        const channel = await connection.createConfirmChannel();
        await channel.assertQueue(process.env.AMQP_QUEUE!, { durable: true });
        await channel.prefetch(1);
        channel.sendToQueue(
          process.env.AMQP_QUEUE!,
          Buffer.from(
            JSON.stringify({
              videoId,
              originalKey,
            })
          ),
          { persistent: true }
        );
        await channel.waitForConfirms();
        console.log(`Sent ${originalKey} to transcoding queue`);

        db.setVideoStatus(videoId, db.status.UPLOADED);

        return { id: videoId };
      } else {
        const videoId = await db.createVideo(
          req.auth.userId,
          title,
          req.auth.orgId ?? req.auth.userId
        );

        return { id: videoId, uploadUrl: `/upload/${videoId}` };
      }
    }
  )
);

videoRouter.get(
  "/",
  withValidation(
    async (
      req
    ): Promise<
      {
        id: string;
        uploadTime: string;
        status: "PENDING" | "UPLOADED" | "IN_PROGRESS" | "FINISHED" | "ERROR";
        metadata: {
          duration: number;
        } | null;
        title: string;
      }[]
    > => {
      const videos = await db.getAllVideos(req.auth.orgId ?? req.auth.userId);

      return videos.map((v) => ({
        id: v.id,
        uploadTime: v.uploadTime.toISOString(),
        status: v.status,
        metadata: v.metadata
          ? {
              duration: v.metadata.duration,
            }
          : null,
        title: v.title,
      }));
    }
  )
);

videoRouter.get(
  "/:id",
  withValidation(
    async (
      req
    ): Promise<{
      id: string;
      uploadTime: string;
      status: "PENDING" | "UPLOADED" | "IN_PROGRESS" | "FINISHED" | "ERROR";
      error: string | null;
      uploadedBy: {
        id: string;
        fullName: string | null;
        email: string | null;
      };
      title: string;
      metadata: {
        duration: number;
        bitrate: number;
        width: number;
        height: number;
        framerate: number;
        audioSampleRate: number;
      } | null;
    }> => {
      const video = await db.getVideo(req.params.id);
      if (video && video.orgId === (req.auth.orgId ?? req.auth.userId)) {
        const user = await clerkClient.users.getUser(video.uploadedBy);
        return {
          id: video.id,
          uploadTime: video.uploadTime.toISOString(),
          status: video.status,
          error: video.error,
          uploadedBy: {
            id: user.id,
            fullName: user.fullName,
            email: user.primaryEmailAddress?.emailAddress ?? null,
          },
          title: video.title,
          metadata: video.metadata
            ? {
                duration: video.metadata.duration,
                bitrate: video.metadata.bitrate,
                width: video.metadata.width,
                height: video.metadata.height,
                framerate: video.metadata.framerate,
                audioSampleRate: video.metadata.audioSampleRate,
              }
            : null,
        };
      } else {
        throw new ApiError(404, { message: "Video does not exist" });
      }
    }
  )
);
