const multer = require("multer");
const multerS3 = require("multer-s3");
const { s3Client, s3BucketName } = require("../config/aws");
const path = require("path");

// Configure multer for video upload
const upload = multer({
  storage: multerS3({
    s3: s3Client,
    bucket: s3BucketName,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: function (req, file, cb) {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, "videos/" + uniqueSuffix + path.extname(file.originalname));
    },
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
  }),
  fileFilter: (req, file, cb) => {
    // Accept video files only
    if (file.mimetype.startsWith("video/")) {
      cb(null, true);
    } else {
      cb(new Error("Only video files are allowed!"), false);
    }
  },
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
});

module.exports = upload;
