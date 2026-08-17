const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
require("dotenv").config();

const STORAGE_DRIVER = process.env.STORAGE_DRIVER || "local";

const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|pdf|webp/;
  const ext = allowed.test(path.extname(file.originalname).toLowerCase());
  const mime = allowed.test(file.mimetype);
  if (ext && mime) return cb(null, true);
  cb(new Error("Only images (jpg, png, webp) and PDF files are allowed"));
};

let storage;

if (STORAGE_DRIVER === "s3") {
  // ---------- AWS S3 storage ----------
  const multerS3 = require("multer-s3");
  const { s3 } = require("../config/aws");

  storage = multerS3({
    s3,
    bucket: process.env.AWS_S3_BUCKET,
    acl: "private",
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: (req, file, cb) => {
      const folder = req.uploadFolder || "misc";
      const filename = `${folder}/${uuidv4()}${path.extname(file.originalname)}`;
      cb(null, filename);
    },
  });
} else {
  // ---------- Local disk storage (default, zero AWS setup needed) ----------
  const uploadDir = path.join(__dirname, "..", "..", "uploads");
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

  storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const folder = req.uploadFolder || "misc";
      const dest = path.join(uploadDir, folder);
      if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
      cb(null, dest);
    },
    filename: (req, file, cb) => {
      cb(null, `${uuidv4()}${path.extname(file.originalname)}`);
    },
  });
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

// Helper to tag which subfolder ("drivers", "vehicles", "maintenance", "payments") a file belongs to
const setUploadFolder = (folderName) => (req, res, next) => {
  req.uploadFolder = folderName;
  next();
};

// Builds a publicly usable URL/path to store in the DB record
const getFileUrl = (req, file) => {
  if (STORAGE_DRIVER === "s3") {
    return file.location; // multer-s3 provides the full S3 URL
  }
  const folder = req.uploadFolder || "misc";
  return `/uploads/${folder}/${file.filename}`;
};

module.exports = { upload, setUploadFolder, getFileUrl };
