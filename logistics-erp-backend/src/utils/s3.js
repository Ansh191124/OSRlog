import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const isConfigured = () =>
  process.env.AWS_ACCESS_KEY_ID &&
  process.env.AWS_ACCESS_KEY_ID !== "your_access_key_id" &&
  process.env.AWS_SECRET_ACCESS_KEY &&
  process.env.AWS_S3_BUCKET;

let client = null;
function getClient() {
  if (!client) {
    client = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
  }
  return client;
}

// Uploads a buffer to S3 and returns its object key. Until real AWS credentials
// are set in backend/.env, falls back to embedding the file as a data URI —
// still a genuinely retrievable "key" (unlike silently discarding the upload),
// so things like payment-proof screenshots remain viewable in dev.
export async function uploadBuffer(key, buffer, contentType) {
  if (!isConfigured()) {
    const dataUri = `data:${contentType};base64,${buffer.toString("base64")}`;
    return { key: dataUri, stored: true };
  }

  await getClient().send(
    new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );
  return { key, stored: true };
}

export async function getFileUrl(key) {
  if (!key) return null;
  // A data-URI fallback key (see uploadBuffer above) is already a complete,
  // directly usable URL — no signing needed.
  if (key.startsWith("data:")) return key;
  if (!isConfigured()) return null;
  const command = new GetObjectCommand({ Bucket: process.env.AWS_S3_BUCKET, Key: key });
  return getSignedUrl(getClient(), command, { expiresIn: 3600 });
}

export const s3Configured = isConfigured;
