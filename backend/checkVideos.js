require("dotenv").config();
const sequelize = require("./config/database");
const Video = require("./models/Video");
const { s3Client, s3BucketName } = require("./config/aws");
const { ListObjectsV2Command } = require("@aws-sdk/client-s3");

async function checkVideos() {
  try {
    // Wait for database connection
    await sequelize.authenticate();
    console.log("Database connection established");

    console.log("Checking S3 bucket:", s3BucketName);

    // List S3 objects
    const command = new ListObjectsV2Command({
      Bucket: s3BucketName,
      Prefix: "videos/",
    });

    const s3Response = await s3Client.send(command);
    const s3Objects = s3Response.Contents || [];

    console.log("\nS3 Objects:");
    s3Objects.forEach((obj) => {
      console.log(`- ${obj.Key} (${obj.Size} bytes)`);
    });

    // Check database
    const dbVideos = await Video.findAll();

    console.log("\nDatabase Records:");
    if (dbVideos.length === 0) {
      console.log("No videos found in database");
    } else {
      dbVideos.forEach((video) => {
        console.log(`- ${video.title} (${video.s3Key})`);
        console.log(`  URL: ${video.cloudFrontUrl}`);
      });
    }

    console.log("\nSummary:");
    console.log(`S3 Objects: ${s3Objects.length}`);
    console.log(`Database Records: ${dbVideos.length}`);

    // Check for videos in S3 but not in DB
    const dbKeys = new Set(dbVideos.map((v) => v.s3Key));
    const missingVideos = s3Objects.filter(
      (obj) =>
        obj.Size > 0 &&
        obj.Key.toLowerCase().match(/\.(mp4|mov|avi|wmv|flv|mkv)$/) &&
        !dbKeys.has(obj.Key)
    );

    if (missingVideos.length > 0) {
      console.log("\nVideos in S3 but not in database:");
      missingVideos.forEach((obj) => {
        console.log(`- ${obj.Key} (${obj.Size} bytes)`);
      });
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await sequelize.close();
  }
}

checkVideos();
