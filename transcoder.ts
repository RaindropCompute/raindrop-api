import amqp from "amqplib";
import { ffmpegToMinio, ffprobe } from "./lib/utils.js";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import ffmpeg from "fluent-ffmpeg";
import { minioClient } from "./lib/minio.js";
import * as db from "./lib/database.js";

const connection = await amqp.connect(process.env.AMQP_URL!);
const channel = await connection.createChannel();

channel.assertQueue(process.env.AMQP_QUEUE!, { durable: true });
channel.prefetch(1);

console.log("Waiting for messages");
channel.consume(
  process.env.AMQP_QUEUE!,
  async (msg) => {
    let tmpdir: string | null = null;
    if (!msg) return;
    console.log("Received message");

    const { videoId, originalKey } = JSON.parse(msg.content.toString());

    db.setVideoStatus(videoId, db.status.IN_PROGRESS);

    try {
      tmpdir = await mkdtemp(os.tmpdir() + path.sep);
      const originalPath = path.join(tmpdir, originalKey.split("/").pop()!);
      await minioClient.fGetObject(
        process.env.MINIO_BUCKET!,
        originalKey,
        originalPath
      );

      const metadata = await ffprobe(originalPath);

      const audioStreams = metadata.streams.filter(
        (stream) => stream.codec_type === "audio"
      );
      const videoStreams = metadata.streams.filter(
        (stream) => stream.codec_type === "video"
      );
      const audio = audioStreams.length > 0;
      const length = videoStreams[0].duration as any as number;

      await Promise.all([
        audio &&
          ffmpegToMinio(
            ffmpeg(originalPath)
              .noVideo()
              .audioCodec("libvorbis")
              .audioBitrate("128k")
              .audioFrequency(48000)
              .outputOptions(["-dash", "1"]),
            tmpdir,
            `${videoId}/audio.webm`
          ),
        ffmpegToMinio(
          ffmpeg(originalPath)
            .videoCodec("libvpx-vp9")
            .outputOptions([
              "-tile-columns",
              "4",
              "-frame-parallel",
              "1",
              "-dash",
              "1",
              "-row-mt",
              "1",
              "-keyint_min",
              "150",
              "-g",
              "150",
            ])
            .noAudio()
            .videoBitrate("1800k")
            .videoFilter("scale=1920:1080"),
          tmpdir,
          `${videoId}/1920x1080.webm`
        ),
        ffmpegToMinio(
          ffmpeg(originalPath)
            .videoCodec("libvpx-vp9")
            .outputOptions([
              "-tile-columns",
              "4",
              "-frame-parallel",
              "1",
              "-dash",
              "1",
              "-row-mt",
              "1",
              "-keyint_min",
              "150",
              "-g",
              "150",
            ])
            .noAudio()
            .videoBitrate("1024k")
            .videoFilter("scale=1280:720"),
          tmpdir,
          `${videoId}/1280x720.webm`
        ),
        ffmpegToMinio(
          ffmpeg(originalPath)
            .videoCodec("libvpx-vp9")
            .outputOptions([
              "-tile-columns",
              "4",
              "-frame-parallel",
              "1",
              "-dash",
              "1",
              "-row-mt",
              "1",
              "-keyint_min",
              "150",
              "-g",
              "150",
            ])
            .noAudio()
            .videoBitrate("276k")
            .videoFilter("scale=640:360"),
          tmpdir,
          `${videoId}/640x360.webm`
        ),
        ffmpegToMinio(
          ffmpeg(originalPath).seekInput("00:00:01.000").frames(1),
          tmpdir,
          `${videoId}/thumbnail.webp`
        ),
      ]);

      if (audio) {
        await ffmpegToMinio(
          ffmpeg()
            .input(path.join(tmpdir, "640x360.webm"))
            .inputFormat("webm_dash_manifest")
            .input(path.join(tmpdir, "1280x720.webm"))
            .inputFormat("webm_dash_manifest")
            .input(path.join(tmpdir, "1920x1080.webm"))
            .inputFormat("webm_dash_manifest")
            .input(path.join(tmpdir, "audio.webm"))
            .inputFormat("webm_dash_manifest")
            .outputOptions([
              "-c",
              "copy",
              "-map",
              "0",
              "-map",
              "1",
              "-map",
              "2",
              "-map",
              "3",
              "-f",
              "webm_dash_manifest",
              "-adaptation_sets",
              "id=0,streams=0,1,2 id=1,streams=3 ",
            ]),
          tmpdir,
          `${videoId}/manifest.mpd`
        );
      } else {
        await ffmpegToMinio(
          ffmpeg()
            .input(path.join(tmpdir, "640x360.webm"))
            .inputFormat("webm_dash_manifest")
            .input(path.join(tmpdir, "1280x720.webm"))
            .inputFormat("webm_dash_manifest")
            .input(path.join(tmpdir, "1920x1080.webm"))
            .inputFormat("webm_dash_manifest")
            .outputOptions([
              "-c",
              "copy",
              "-map",
              "0",
              "-map",
              "1",
              "-map",
              "2",
              "-f",
              "webm_dash_manifest",
              "-adaptation_sets",
              "id=0,streams=0,1,2",
            ]),
          tmpdir,
          `${videoId}/manifest.mpd`
        );
      }

      db.addVideoMetadata(videoId, length, 1800000, 1920, 1080, 30, 48000);
      db.setVideoStatus(videoId, db.status.FINISHED);
    } catch (e) {
      console.error(e);
      db.setError(videoId, "Error while transcoding");
    } finally {
      channel.ack(msg);
      if (tmpdir) await rm(tmpdir, { recursive: true });
    }
  },
  { noAck: false }
);
