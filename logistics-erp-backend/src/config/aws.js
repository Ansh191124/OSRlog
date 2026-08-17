const AWS = require("aws-sdk");
require("dotenv").config();

// Only configure real AWS credentials when S3 storage is actually used.
if (process.env.STORAGE_DRIVER === "s3") {
  AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
  });
}

const s3 = new AWS.S3();

module.exports = { s3, AWS };
