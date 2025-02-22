const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const sequelize = require("./config/database");
const Employee = require("./models/Employee");
const Video = require("./models/Video");
const upload = require("./middleware/upload");
const { cloudFrontDomain, s3Client, s3BucketName } = require("./config/aws");
const { ListObjectsV2Command } = require("@aws-sdk/client-s3");

dotenv.config();

const app = express();

// Update CORS configuration
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Range", "Accept"],
    exposedHeaders: ["Content-Range", "Content-Length", "Accept-Ranges"],
    credentials: true,
  })
);

app.use(express.json());

// Helper function to format CloudFront URL
const getCloudFrontUrl = (key) => {
  // Remove any leading slashes and clean the key
  const cleanKey = key.replace(/^\/+/, "");
  // Remove any existing https:// from the domain
  const cleanDomain = cloudFrontDomain.replace(/^https?:\/\//, "");
  return `https://${cleanDomain}/${cleanKey}`;
};

// Employee routes
app.get("/api/employees", async (req, res) => {
  try {
    const employees = await Employee.findAll();
    res.json(employees);
  } catch (error) {
    console.error("Error fetching employees:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/employees", async (req, res) => {
  try {
    const employee = await Employee.create(req.body);
    res.status(201).json(employee);
  } catch (error) {
    console.error("Error creating employee:", error);
    res.status(400).json({ error: error.message });
  }
});

// Video routes
app.post("/api/videos/upload", upload.single("video"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No video file uploaded" });
    }

    const video = await Video.create({
      title: req.body.title || "Untitled",
      description: req.body.description,
      s3Key: req.file.key,
      cloudFrontUrl: getCloudFrontUrl(req.file.key),
      mimeType: req.file.mimetype,
      size: req.file.size,
    });

    res.status(201).json(video);
  } catch (error) {
    console.error("Error uploading video:", error);
    res.status(500).json({ error: error.message });
  }
});

// List all videos from S3 and sync with database
app.get("/api/videos/sync", async (req, res) => {
  try {
    console.log("Starting video sync...");
    console.log("S3 Bucket:", s3BucketName);
    console.log("CloudFront Domain:", cloudFrontDomain);

    const command = new ListObjectsV2Command({
      Bucket: s3BucketName,
      Prefix: "videos/",
    });

    console.log("Fetching objects from S3...");
    const s3Response = await s3Client.send(command);
    const s3Objects = s3Response.Contents || [];

    console.log(
      "All S3 objects:",
      s3Objects.map((obj) => ({
        key: obj.Key,
        size: obj.Size,
        lastModified: obj.LastModified,
      }))
    );

    console.log(`Found ${s3Objects.length} total objects in S3`);
    const syncedVideos = [];
    const skippedObjects = [];

    for (const object of s3Objects) {
      console.log(`Processing object: ${object.Key}`);

      if (object.Size === 0) {
        console.log(`Skipping object ${object.Key} (size is 0)`);
        skippedObjects.push({ key: object.Key, reason: "size is 0" });
        continue;
      }

      if (!object.Key.toLowerCase().match(/\.(mp4|mov|avi|wmv|flv|mkv)$/)) {
        console.log(`Skipping object ${object.Key} (not a video file)`);
        skippedObjects.push({ key: object.Key, reason: "not a video file" });
        continue;
      }

      try {
        const existingVideo = await Video.findOne({
          where: { s3Key: object.Key },
        });

        if (existingVideo) {
          console.log(`Skipping object ${object.Key} (already in database)`);
          skippedObjects.push({
            key: object.Key,
            reason: "already in database",
          });
          continue;
        }

        const fileName = object.Key.split("/").pop() || "Untitled";
        const cloudFrontUrl = getCloudFrontUrl(object.Key);
        console.log(`Creating video record for ${fileName}`);
        console.log(`CloudFront URL will be: ${cloudFrontUrl}`);

        const video = await Video.create({
          title: fileName.replace(/\.[^/.]+$/, ""),
          description: "Imported from S3",
          s3Key: object.Key,
          cloudFrontUrl: cloudFrontUrl,
          mimeType: "video/mp4",
          size: object.Size,
        });

        syncedVideos.push(video);
        console.log(`Successfully synced video: ${fileName}`);
      } catch (error) {
        console.error(`Error processing object ${object.Key}:`, error);
        skippedObjects.push({
          key: object.Key,
          reason: "processing error: " + error.message,
        });
      }
    }

    res.json({
      message: "Videos synced successfully",
      syncedCount: syncedVideos.length,
      totalObjects: s3Objects.length,
      syncedVideos: syncedVideos.map((v) => ({
        title: v.title,
        s3Key: v.s3Key,
        cloudFrontUrl: v.cloudFrontUrl,
      })),
      skippedObjects: skippedObjects,
      bucketName: s3BucketName,
      cloudFrontDomain: cloudFrontDomain,
    });
  } catch (error) {
    console.error("Error syncing videos:", error);
    res.status(500).json({
      error: error.message,
      stack: error.stack,
      bucketName: s3BucketName,
      cloudFrontDomain: cloudFrontDomain,
    });
  }
});

app.get("/api/videos", async (req, res) => {
  try {
    const videos = await Video.findAll({
      order: [["createdAt", "DESC"]],
    });

    // Ensure all CloudFront URLs are properly formatted
    const formattedVideos = videos.map((video) => {
      const videoData = video.toJSON();
      videoData.cloudFrontUrl = getCloudFrontUrl(videoData.s3Key);
      return videoData;
    });

    res.json(formattedVideos);
  } catch (error) {
    console.error("Error fetching videos:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/videos/:id", async (req, res) => {
  try {
    const video = await Video.findByPk(req.params.id);
    if (!video) {
      return res.status(404).json({ error: "Video not found" });
    }

    const videoData = video.toJSON();
    videoData.cloudFrontUrl = getCloudFrontUrl(videoData.s3Key);

    res.json(videoData);
  } catch (error) {
    console.error("Error fetching video:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

const PORT = process.env.PORT || 3001;

// Sync database and start server
sequelize
  .sync()
  .then(() => {
    console.log("Database synced successfully");
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Error syncing database:", error);
  });
