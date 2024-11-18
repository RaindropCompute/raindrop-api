import ffmpeg, { FfmpegCommand, FfprobeData } from "fluent-ffmpeg";
import path from "node:path";
import { minioClient } from "./minio.js";
import { promisify } from "node:util";

const ffprobe = promisify<string, FfprobeData>(ffmpeg.ffprobe);

export async function ffmpegToMinio(
  command: FfmpegCommand,
  tmpdir: string,
  key: string
) {
  const outputFilePath = path.join(tmpdir, key.split("/").pop()!);

  await new Promise<void>((resolve, reject) => {
    command
      .save(outputFilePath)
      .on("progress", (progress) => {
        console.log(
          `Encoding ${outputFilePath}: \t${progress.percent
            ?.toFixed(0)
            .padStart(3)}%`
        );
      })
      .on("end", async () => resolve())
      .on("error", (transcodeError) => reject(transcodeError));
  });

  await minioClient.fPutObject(process.env.MINIO_BUCKET!, key, outputFilePath);
}

export async function hasAudio(input: string) {
  const metadata = await ffprobe(input);

  const audioStreams = metadata.streams.filter(
    (stream) => stream.codec_type === "audio"
  );

  return audioStreams.length > 0;
}
