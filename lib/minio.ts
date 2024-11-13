import * as minio from "minio";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"; // fix this :(
export const minioClient = new minio.Client({
  endPoint: process.env.MINIO_ENDPOINT!,
  port: parseInt(process.env.MINIO_PORT!),
  useSSL: !!process.env.MINIO_USE_SSL,
  accessKey: process.env.MINIO_ACCESS_KEY!,
  secretKey: process.env.MINIO_SECRET_KEY!,
});
