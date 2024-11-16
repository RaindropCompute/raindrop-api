import express, { Request, Response } from "express";
import cors from "cors";
import mime from "mime";
import { minioClient } from "./lib/minio.js";
import amqp from "amqplib";
import { Readable } from "node:stream";

const connection = await amqp.connect(process.env.AMQP_URL!);

const app = express();

app.use(cors());
app.use(express.json());

app.post("/upload/:id", async (req: Request, res: Response) => {
  const videoId = req.params.id;

  if (!req.headers["content-type"]) {
    res.status(400).send("content-type is required");
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

  res.end();
});

app.post("/video", async (req: Request, res: Response) => {
  console.log(req.body);
  const videoId = crypto.randomUUID();

  if (req.body.url) {
    const resp = await fetch(req.body.url);

    const originalKey = `${videoId}/original.${mime.getExtension(
      resp.headers.get("content-type")!
    )}`;
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

    res.json({ videoId });
  } else {
    res.json({ videoId, uploadUrl: `/upload/${videoId}` });
  }
});

app.get("/video/:id/:filename", async (req: Request, res: Response) => {
  const { id, filename } = req.params;
  const range = req.headers.range;

  try {
    const objectInfo = await minioClient.statObject(
      "videos",
      `${id}/${filename}`
    );
    const totalLength = objectInfo.size;

    if (range) {
      // Parse the Range header (e.g., "bytes=0-1024")
      const [startStr, endStr] = range.replace(/bytes=/, "").split("-");
      const start = parseInt(startStr, 10);
      const end = endStr ? parseInt(endStr, 10) : totalLength - 1;
      const chunkSize = end - start + 1;

      // Set headers for partial content
      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${totalLength}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunkSize,
        "Content-Type": "video/webm",
      });

      // Stream the specified byte range from MinIO
      const stream = await minioClient.getPartialObject(
        "videos",
        `${id}/${filename}`,
        start,
        chunkSize
      );
      stream.pipe(res);
    } else {
      res.writeHead(200, {
        "Content-Length": totalLength,
        "Content-Type": "video/webm",
      });

      // Stream the specified byte range from MinIO
      const stream = await minioClient.getObject("videos", `${id}/${filename}`);
      stream.pipe(res);
    }
  } catch (error) {
    console.error("Error retrieving chunk:", error);
    res.status(404).json({ error: "Chunk not found" });
  }
});

app.listen(5005, () => {
  console.log(`Server is running on port ${5005}`);
});
