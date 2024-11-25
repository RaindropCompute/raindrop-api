-- AlterTable
CREATE SEQUENCE video_id_seq;
ALTER TABLE "Video" ALTER COLUMN "id" SET DEFAULT nextval('video_id_seq');
ALTER SEQUENCE video_id_seq OWNED BY "Video"."id";
