import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { config } from "@/server/config";

let singleton: S3Client | null = null;

function getS3Client() {
  if (!singleton) {
    singleton = new S3Client({
      region: config.AWS_REGION
    });
  }
  return singleton;
}

function requireBucket() {
  if (!config.S3_BUCKET) {
    throw new Error("S3_BUCKET is not configured");
  }
  return config.S3_BUCKET;
}

export async function createPresignedUploadUrl(key: string, contentType: string) {
  const bucket = requireBucket();
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType
  });
  const url = await getSignedUrl(getS3Client(), command, { expiresIn: 60 * 10 });
  return { bucket, key, url };
}

export async function createPresignedDownloadUrl(key: string) {
  const bucket = requireBucket();
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key
  });
  const url = await getSignedUrl(getS3Client(), command, { expiresIn: 60 * 10 });
  return { bucket, key, url };
}

export async function uploadObject(key: string, body: Uint8Array | Buffer, contentType: string) {
  const bucket = requireBucket();
  await getS3Client().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType
    })
  );
  return { bucket, key };
}
