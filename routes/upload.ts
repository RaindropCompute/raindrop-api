import express, { Request, Response } from "express";
import * as db from "../lib/database.js";
import mime from "mime";
import { minioClient } from "../lib/minio.js";
import { connection } from "../lib/amqp.js";

export const uploadRouter = express.Router();

uploadRouter.post("/:id", async (req: Request, res: Response) => {
  try {
    const videoId = req.params.id;

    if (!req.headers["content-type"]) {
      res.status(400).send("content-type is required");
      return;
    }

    const item = await db.getVideo(videoId);
    if (!item) {
      res.status(404).send("video not found");
      return;
    }
    if (item.status !== db.status.PENDING) {
      res.status(400).send("video already uploaded");
      return;
    }

    const originalKey = `${videoId}/original.${mime.getExtension(
      req.headers["content-type"]
    )}`;
    await minioClient.putObject(process.env.MINIO_BUCKET!, originalKey, req);

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

    res.status(204).end();
  } catch (e) {
    res.status(500).json({ message: String(e) });
  }
});
