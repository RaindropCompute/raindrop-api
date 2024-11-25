import express, { Request, Response } from "express";
import cors from "cors";
import { minioClient } from "./lib/minio.js";
import helmet from "helmet";
import morgan from "morgan";
import { clerkMiddleware } from "@clerk/express";
import { videoRouter } from "./routes/video.js";
import { uploadRouter } from "./routes/upload.js";

const app = express();

app.use(helmet());
app.use(morgan("dev"));
app.use(cors());
app.use(express.json());
app.use(clerkMiddleware());

app.use("/upload", uploadRouter);
app.use("/video", videoRouter);

app.get("/video/:id/:filename", async (req: Request, res: Response) => {
  const { id, filename } = req.params;
  const range = req.headers.range;

  const objectInfo = await minioClient.statObject(
    process.env.MINIO_BUCKET!,
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
      "Content-Type": objectInfo.metaData["content-type"],
    });

    // Stream the specified byte range from MinIO
    const stream = await minioClient.getPartialObject(
      process.env.MINIO_BUCKET!,
      `${id}/${filename}`,
      start,
      chunkSize
    );
    stream.pipe(res);
  } else {
    res.writeHead(200, {
      "Content-Length": totalLength,
      "Content-Type": objectInfo.metaData["content-type"],
    });

    // Stream the specified byte range from MinIO
    const stream = await minioClient.getObject(
      process.env.MINIO_BUCKET!,
      `${id}/${filename}`
    );
    stream.pipe(res);
  }
});

app.listen(5005, () => {
  console.log(`Server is running on port ${5005}`);
});
